-- ==============================================================================
-- LOCAL HANDYMAN (CLR SERVICES) - POSTGRES SCHEMA & ROW LEVEL SECURITY (RLS)
-- Location: Chirala, Andhra Pradesh
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Helper Security Functions (Server-Side Authorization)
-- ------------------------------------------------------------------------------

-- Checks if authenticated user has administrator privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN (
    -- 1. Server-controlled role claim (set only via service_role or Supabase dashboard)
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      -- 2. Approved administrator email identities with verified email
      (auth.jwt() ->> 'email') IN (
        'sarmakoniki2010@gmail.com',
        'admin@clrservices.in',
        'clrsarma.chirala@gmail.com',
        'admin@chiralahandyman.com'
      )
      -- Identity must be securely verified. Missing or unverified claims evaluate to FALSE.
      AND (
        (auth.jwt() ->> 'email_verified')::BOOLEAN IS TRUE
        OR (auth.jwt() -> 'app_metadata' ->> 'email_verified')::BOOLEAN IS TRUE
        OR EXISTS (
          SELECT 1 FROM auth.users u
          WHERE u.id = auth.uid()
            AND LOWER(u.email) = LOWER(auth.jwt() ->> 'email')
            AND u.email_confirmed_at IS NOT NULL
        )
      )
    )
  );
END;
$$;

-- Restrict execution permissions according to least privilege
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;

-- ------------------------------------------------------------------------------
-- 2. Customer Profiles
-- ------------------------------------------------------------------------------
-- Dedicated sequence for customer display IDs (e.g. CUS-00001, CUS-00002)
CREATE SEQUENCE IF NOT EXISTS public.customer_display_id_seq START 1;

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_id TEXT UNIQUE DEFAULT ('CUS-' || LPAD(nextval('public.customer_display_id_seq')::TEXT, 5, '0')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to protect customer display_id from tampering or re-assignment
CREATE OR REPLACE FUNCTION public.protect_customer_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.display_id IS NOT NULL AND NEW.display_id IS DISTINCT FROM OLD.display_id THEN
      NEW.display_id := OLD.display_id;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.display_id IS NULL THEN
      NEW.display_id := 'CUS-' || LPAD(nextval('public.customer_display_id_seq')::TEXT, 5, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_customer_display_id ON public.customers;
CREATE TRIGGER trg_protect_customer_display_id
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_customer_display_id();

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own profile"
  ON public.customers FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Customers can insert their own profile"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Customers can update their own profile"
  ON public.customers FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Technicians & Craftspersons
-- ------------------------------------------------------------------------------
-- Dedicated sequence for technician display IDs (e.g. TECH-00001, TECH-00002)
CREATE SEQUENCE IF NOT EXISTS public.technician_display_id_seq START 1;

CREATE TABLE IF NOT EXISTS public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT UNIQUE DEFAULT ('TECH-' || LPAD(nextval('public.technician_display_id_seq')::TEXT, 5, '0')),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service_category TEXT NOT NULL CHECK (service_category IN ('Electrical Repairs', 'Plumbing Repairs')),
  neighborhood TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending Approval', 'Approved', 'Rejected')) DEFAULT 'Pending Approval',
  availability TEXT NOT NULL CHECK (availability IN ('Available', 'Offline')) DEFAULT 'Available',
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT
);

-- Trigger to protect technician display_id from tampering
CREATE OR REPLACE FUNCTION public.protect_technician_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.display_id IS NOT NULL AND NEW.display_id IS DISTINCT FROM OLD.display_id THEN
      NEW.display_id := OLD.display_id;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.display_id IS NULL THEN
      NEW.display_id := 'TECH-' || LPAD(nextval('public.technician_display_id_seq')::TEXT, 5, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_technician_display_id ON public.technicians;
CREATE TRIGGER trg_protect_technician_display_id
  BEFORE INSERT OR UPDATE ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_technician_display_id();

-- Unique constraints to prevent duplicate applications
CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_auth_user 
  ON public.technicians(auth_user_id) 
  WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_phone 
  ON public.technicians(phone);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view approved technicians or own profile"
  ON public.technicians FOR SELECT
  USING (status = 'Approved' OR auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Technicians can register their own profile as pending"
  ON public.technicians FOR INSERT
  WITH CHECK (
    (auth_user_id = auth.uid() AND status = 'Pending Approval') 
    OR public.is_admin()
  );

CREATE POLICY "Admins can update all technician fields"
  ON public.technicians FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Technicians can update their own availability"
  ON public.technicians FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Trigger to prevent technicians from modifying approval status or approval timestamp
CREATE OR REPLACE FUNCTION public.check_technician_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION '403 Forbidden: Only administrators can update technician approval status.';
    END IF;
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION '403 Forbidden: Only administrators can modify technician approval timestamps.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_technician_update ON public.technicians;
CREATE TRIGGER trg_check_technician_update
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.check_technician_update();

-- ------------------------------------------------------------------------------
-- 4. Bookings & Service Requests
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY, -- e.g. LH-2026-XXXX
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_display_id TEXT, -- e.g. CUS-00001
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service_category TEXT NOT NULL CHECK (service_category IN ('Electrical Repairs', 'Plumbing Repairs')),
  neighborhood TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  service_rating INTEGER DEFAULT 0 CHECK (service_rating >= 0 AND service_rating <= 5),
  status TEXT NOT NULL CHECK (status IN ('New', 'Contacted', 'Assigned', 'Accepted', 'In Progress', 'Completed', 'Cancelled')) DEFAULT 'New',
  assigned_technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  assigned_technician_display_id TEXT, -- e.g. TECH-00001
  final_bill_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Hardened INSERT policy: Validates default 'New' status, null assignments/bills, and ownership
CREATE POLICY "Public and customers can create service bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (
    status = 'New'
    AND assigned_technician_id IS NULL
    AND assigned_technician_display_id IS NULL
    AND final_bill_amount IS NULL
    AND (
      customer_id IS NULL
      OR (auth.uid() IS NOT NULL AND auth.uid() = customer_id)
      OR public.is_admin()
    )
  );

-- Restrict SELECT to verified customer owner, assigned technician, or administrator
CREATE POLICY "Strict read isolation on bookings"
  ON public.bookings FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = customer_id)
    OR (auth.uid() IS NOT NULL AND assigned_technician_id IN (
      SELECT t.id FROM public.technicians t WHERE t.auth_user_id = auth.uid()
    ))
    OR public.is_admin()
  );

-- Update permissions: Customer (rating/cancellation), Technician (status/bill), Admin (any)
CREATE POLICY "Customer can rate completed bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = customer_id OR public.is_admin())
  WITH CHECK (auth.uid() = customer_id OR public.is_admin());

CREATE POLICY "Technician can update assigned job progress"
  ON public.bookings FOR UPDATE
  USING (
    assigned_technician_id IN (
      SELECT t.id FROM public.technicians t WHERE t.auth_user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Trigger to prevent unauthorized field tampering on bookings
CREATE OR REPLACE FUNCTION public.check_booking_update()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION '403 Forbidden: customer_id is immutable.';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION '403 Forbidden: created_at is immutable.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.technicians t
    WHERE t.auth_user_id = auth.uid() AND t.id = OLD.assigned_technician_id
  ) THEN
    IF NEW.assigned_technician_id IS DISTINCT FROM OLD.assigned_technician_id THEN
      IF NOT (NEW.status = 'Contacted' AND NEW.assigned_technician_id IS NULL) THEN
        RAISE EXCEPTION '403 Forbidden: Technicians cannot reassign job ownership.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.customer_id THEN
    IF NEW.assigned_technician_id IS DISTINCT FROM OLD.assigned_technician_id THEN
      RAISE EXCEPTION '403 Forbidden: Customers cannot modify technician assignment.';
    END IF;
    IF NEW.final_bill_amount IS DISTINCT FROM OLD.final_bill_amount THEN
      RAISE EXCEPTION '403 Forbidden: Customers cannot modify final bill amount.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status IN ('New', 'Contacted') AND NEW.status = 'Cancelled') THEN
        RAISE EXCEPTION '403 Forbidden: Customers can only cancel unassigned bookings.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION '403 Forbidden: Unauthorized update on booking.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_check_booking_update ON public.bookings;
CREATE TRIGGER trg_check_booking_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_update();

-- ------------------------------------------------------------------------------
-- 5. Payments & Receipts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY, -- e.g. PAY-2026-XXXX
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash on Completion', 'UPI', 'Card')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('Paid', 'Pending', 'Failed', 'Refunded')),
  refund_status TEXT NOT NULL CHECK (refund_status IN ('None', 'Requested', 'Refunded')) DEFAULT 'None',
  refund_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ
);

-- Idempotency constraint: Prevent duplicate completed payments for the same booking
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_booking_paid 
  ON public.payments(booking_id) 
  WHERE payment_status = 'Paid';

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can only read their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = customer_id OR public.is_admin());

CREATE POLICY "Admins can manage payments and process refunds"
  ON public.payments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. Commissions & Financial Settlements
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commissions (
  id TEXT PRIMARY KEY, -- e.g. COMM-2026-XXXX
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  customer_bill_amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  technician_payout_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Due', 'Collected')) DEFAULT 'Due',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  collected_at TIMESTAMPTZ
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins or assigned technicians can view commissions"
  ON public.commissions FOR SELECT
  USING (
    public.is_admin() 
    OR technician_id IN (
      SELECT t.id FROM public.technicians t WHERE t.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Only administrators can update commission settlements"
  ON public.commissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. Customer Support Tickets
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY, -- e.g. TKT-2026-XXXX
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Open', 'In Review', 'Resolved')) DEFAULT 'Open',
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view only their own support tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = customer_id OR public.is_admin());

CREATE POLICY "Customers can create tickets for their own bookings"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = customer_id OR public.is_admin());

CREATE POLICY "Only administrators can resolve and update support tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
