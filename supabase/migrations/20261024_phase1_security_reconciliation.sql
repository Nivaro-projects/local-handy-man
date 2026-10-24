-- ==============================================================================
-- NIVARO / CLR SERVICES - PHASE 1 SECURITY RECONCILIATION
-- Migration: 20261024_phase1_security_reconciliation.sql
--
-- This replaces 20261023_phase1_security_hardening.sql for the live schema.
-- It is idempotent and is intended to be pasted into the Supabase SQL Editor
-- as the database owner (postgres).
--
-- Live-schema differences this reconciles:
--   * technicians uses service_category (not category/specialization/skills)
--   * technicians and customers have no display_id
--   * technicians has no rejected_reason
--   * bookings has no version
--   * payments has no idempotency_key
--   * admin_users uses auth_user_id (not user_id) and has no is_active
--   * support_messages uses message_text (not body)
--   * commission_ledger already has gross_amount/commission_amount/technician_net
--     and intentionally has no payment_id/idempotency_key
--
-- The one-time admin bootstrap uses server-controlled raw_app_meta_data.role.
-- No email allowlist is embedded in this file.
--
-- It also establishes the exact objects and privileges required by:
--   supabase/verification/phase1_security_checks.sql
-- and ends with FK type assertions for support_tickets, support_messages,
-- booking_events and commission_ledger.
--
-- Local validation: applied twice in PGlite against a mock of the live schema;
-- phase1_security_checks.sql and the behavioral role simulations passed. Live
-- application still needs a backup and the project owner's approval.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. Missing columns, display IDs and indexes
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.customer_display_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.technician_display_id_seq START 1;

ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS display_id TEXT,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

UPDATE public.technicians
SET display_id = 'TECH-' || LPAD(nextval('public.technician_display_id_seq')::TEXT, 5, '0')
WHERE display_id IS NULL;

ALTER TABLE public.technicians
  ALTER COLUMN display_id SET DEFAULT (
    'TECH-' || LPAD(nextval('public.technician_display_id_seq')::TEXT, 5, '0')
  );

ALTER TABLE public.technicians
  ALTER COLUMN display_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_display_id
  ON public.technicians(display_id);

-- The customer sequence exists in the live DB, but the column did not.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS display_id TEXT;

UPDATE public.customers
SET display_id = 'CUS-' || LPAD(nextval('public.customer_display_id_seq')::TEXT, 5, '0')
WHERE display_id IS NULL;

ALTER TABLE public.customers
  ALTER COLUMN display_id SET DEFAULT (
    'CUS-' || LPAD(nextval('public.customer_display_id_seq')::TEXT, 5, '0')
  );

ALTER TABLE public.customers
  ALTER COLUMN display_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_display_id
  ON public.customers(display_id);

CREATE OR REPLACE FUNCTION public.protect_customer_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.display_id IS NOT NULL AND NEW.display_id IS DISTINCT FROM OLD.display_id THEN
      NEW.display_id := OLD.display_id;
    END IF;
  END IF;

  IF NEW.display_id IS NULL THEN
    NEW.display_id := 'CUS-' || LPAD(nextval('public.customer_display_id_seq')::TEXT, 5, '0');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_technician_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.display_id IS NOT NULL AND NEW.display_id IS DISTINCT FROM OLD.display_id THEN
      NEW.display_id := OLD.display_id;
    END IF;
  END IF;

  IF NEW.display_id IS NULL THEN
    NEW.display_id := 'TECH-' || LPAD(nextval('public.technician_display_id_seq')::TEXT, 5, '0');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_customer_display_id ON public.customers;
CREATE TRIGGER trg_protect_customer_display_id
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_customer_display_id();

DROP TRIGGER IF EXISTS trg_protect_technician_display_id ON public.technicians;
CREATE TRIGGER trg_protect_technician_display_id
  BEFORE INSERT OR UPDATE ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_technician_display_id();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;

UPDATE public.bookings SET version = 0 WHERE version IS NULL;
ALTER TABLE public.bookings ALTER COLUMN version SET DEFAULT 0;
ALTER TABLE public.bookings ALTER COLUMN version SET NOT NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE public.admin_users SET is_active = TRUE WHERE is_active IS NULL;
ALTER TABLE public.admin_users ALTER COLUMN is_active SET DEFAULT TRUE;
ALTER TABLE public.admin_users ALTER COLUMN is_active SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_auth_user
  ON public.technicians(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_phone
  ON public.technicians(phone);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency_key
  ON public.payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_booking_paid
  ON public.payments(booking_id)
  WHERE payment_status = 'Paid';

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON public.bookings(customer_id);

CREATE INDEX IF NOT EXISTS idx_bookings_assigned_technician_id
  ON public.bookings(assigned_technician_id);

CREATE INDEX IF NOT EXISTS idx_bookings_status_created_at
  ON public.bookings(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_booking_id
  ON public.support_tickets(booking_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id
  ON public.support_tickets(customer_id);

CREATE INDEX IF NOT EXISTS idx_commissions_technician_id
  ON public.commissions(technician_id);

-- ------------------------------------------------------------------------------
-- 1. Admin identity
-- ------------------------------------------------------------------------------
-- Bootstrap only from confirmed users whose server-controlled app_metadata says
-- role=admin. ON CONFLICT DO NOTHING keeps this re-runnable and never silently
-- re-activates a disabled admin. The live auth.users row has this metadata.
INSERT INTO public.admin_users (auth_user_id, role, is_active)
SELECT u.id, 'admin', TRUE
FROM auth.users u
WHERE u.email_confirmed_at IS NOT NULL
  AND u.deleted_at IS NULL
  AND (u.banned_until IS NULL OR u.banned_until < now())
  AND coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin'
ON CONFLICT (auth_user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.auth_user_id = auth.uid()
      AND au.is_active
      AND au.role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin()
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.is_admin() IS
  'True only for an active role=admin row in public.admin_users. Never reads user_metadata or hardcoded email claims.';

-- Avoid recursive RLS subqueries on technicians in booking/commission policies.
CREATE OR REPLACE FUNCTION public.current_technician_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT t.id
  FROM public.technicians t
  WHERE t.auth_user_id = auth.uid()
    AND t.status = 'Approved'
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.current_technician_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_technician_id()
  TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. Operational table that was missing
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  from_status TEXT CHECK (
    from_status IN ('New', 'Contacted', 'Assigned', 'Accepted', 'In Progress', 'Completed', 'Cancelled')
  ),
  to_status TEXT NOT NULL CHECK (
    to_status IN ('New', 'Contacted', 'Assigned', 'Accepted', 'In Progress', 'Completed', 'Cancelled')
  ),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (
    actor_role IN ('customer', 'technician', 'admin', 'system')
  ),
  booking_version INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_events_idempotency
  ON public.booking_events(booking_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_created
  ON public.booking_events(booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created
  ON public.support_messages(ticket_id, created_at);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_booking_created
  ON public.commission_ledger(booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_technician_created
  ON public.commission_ledger(technician_id, created_at DESC);

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. Public-safe technician view
-- ------------------------------------------------------------------------------
-- Uses the live trade field, service_category. Never exposes phone, email,
-- auth_user_id or rejected_reason.
DROP VIEW IF EXISTS public.technician_public_profiles;

CREATE VIEW public.technician_public_profiles
WITH (security_barrier = true)
AS
SELECT
  t.id,
  t.display_id,
  t.full_name,
  t.service_category,
  t.neighborhood,
  t.status,
  t.availability,
  t.registered_at,
  t.approved_at
FROM public.technicians t
WHERE t.status = 'Approved';

COMMENT ON VIEW public.technician_public_profiles IS
  'Public technician directory. Excludes phone, email, auth_user_id and rejected_reason.';

REVOKE ALL ON public.technician_public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.technician_public_profiles TO anon, authenticated;
GRANT SELECT ON public.technician_public_profiles TO service_role;

-- ------------------------------------------------------------------------------
-- 4. Append-only and state-guard functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_append_only_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION
    'Append-only table %.% cannot be updated or deleted.',
    TG_TABLE_SCHEMA, TG_TABLE_NAME;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_append_only_mutation() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.check_technician_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF public.is_admin()
     OR auth.role() = 'service_role'
     OR (auth.role() IS NULL AND session_user IN ('postgres', 'supabase_admin')) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION '403 Forbidden: technician id is immutable.';
  END IF;
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION '403 Forbidden: auth_user_id is immutable.';
  END IF;
  IF NEW.display_id IS DISTINCT FROM OLD.display_id THEN
    RAISE EXCEPTION '403 Forbidden: display_id is immutable.';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION '403 Forbidden: technicians cannot change their approval status.';
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION '403 Forbidden: approved_at is administrator-controlled.';
  END IF;
  IF NEW.rejected_reason IS DISTINCT FROM OLD.rejected_reason THEN
    RAISE EXCEPTION '403 Forbidden: rejected_reason is administrator-controlled.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_technician_update() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.check_booking_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_tech_id UUID := public.current_technician_id();
BEGIN
  IF public.is_admin()
     OR auth.role() = 'service_role'
     OR (auth.role() IS NULL AND session_user IN ('postgres', 'supabase_admin')) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION '403 Forbidden: booking id is immutable.';
  END IF;
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION '403 Forbidden: customer_id is immutable.';
  END IF;
  IF NEW.customer_display_id IS DISTINCT FROM OLD.customer_display_id THEN
    RAISE EXCEPTION '403 Forbidden: customer_display_id is immutable.';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION '403 Forbidden: created_at is immutable.';
  END IF;

  IF v_tech_id IS NOT NULL AND OLD.assigned_technician_id = v_tech_id THEN
    IF NEW.assigned_technician_id IS DISTINCT FROM OLD.assigned_technician_id
       OR NEW.assigned_technician_display_id IS DISTINCT FROM OLD.assigned_technician_display_id THEN
      IF NOT (
        NEW.status = 'Contacted'
        AND NEW.assigned_technician_id IS NULL
        AND NEW.assigned_technician_display_id IS NULL
      ) THEN
        RAISE EXCEPTION '403 Forbidden: technicians cannot reassign job ownership.';
      END IF;
    END IF;

    IF NEW.service_rating IS DISTINCT FROM OLD.service_rating THEN
      RAISE EXCEPTION '403 Forbidden: technicians cannot modify service ratings.';
    END IF;

    IF NEW.final_bill_amount IS DISTINCT FROM OLD.final_bill_amount
       AND NOT (OLD.status = 'In Progress' AND NEW.status = 'Completed') THEN
      RAISE EXCEPTION
        '403 Forbidden: final bill can only be set when completing the job.';
    END IF;

    IF NEW.full_name IS DISTINCT FROM OLD.full_name
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.service_category IS DISTINCT FROM OLD.service_category
       OR NEW.neighborhood IS DISTINCT FROM OLD.neighborhood
       OR NEW.address IS DISTINCT FROM OLD.address
       OR NEW.description IS DISTINCT FROM OLD.description THEN
      RAISE EXCEPTION
        '403 Forbidden: technicians cannot edit customer-facing booking details.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (OLD.status = 'Assigned' AND NEW.status IN ('Accepted', 'Contacted'))
        OR (OLD.status = 'Accepted' AND NEW.status IN ('In Progress', 'Contacted'))
        OR (OLD.status = 'In Progress' AND NEW.status = 'Completed')
      ) THEN
        RAISE EXCEPTION
          '403 Forbidden: invalid technician status transition from % to %.',
          OLD.status, NEW.status;
      END IF;
      IF NEW.status = 'Contacted' AND NEW.assigned_technician_id IS NOT NULL THEN
        RAISE EXCEPTION
          '403 Forbidden: unassign the technician when reporting unable to attend.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.customer_id THEN
    IF NEW.assigned_technician_id IS DISTINCT FROM OLD.assigned_technician_id
       OR NEW.assigned_technician_display_id IS DISTINCT FROM OLD.assigned_technician_display_id THEN
      RAISE EXCEPTION '403 Forbidden: customers cannot modify technician assignment.';
    END IF;
    IF NEW.final_bill_amount IS DISTINCT FROM OLD.final_bill_amount THEN
      RAISE EXCEPTION '403 Forbidden: customers cannot modify final bill amount.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status IN ('New', 'Contacted') AND NEW.status = 'Cancelled') THEN
        RAISE EXCEPTION '403 Forbidden: customers can only cancel unassigned bookings.';
      END IF;
      IF NEW.status = 'Cancelled' AND OLD.assigned_technician_id IS NOT NULL THEN
        RAISE EXCEPTION '403 Forbidden: customers cannot cancel an assigned booking.';
      END IF;
    END IF;
    IF NEW.service_rating IS DISTINCT FROM OLD.service_rating
       AND OLD.status <> 'Completed' THEN
      RAISE EXCEPTION '403 Forbidden: ratings are only allowed on completed bookings.';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION '403 Forbidden: unauthorized update on booking.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_booking_update() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.increment_booking_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_booking_version() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor_role TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_actor_role := CASE
      WHEN auth.role() = 'service_role' THEN 'system'
      WHEN auth.uid() IS NULL THEN 'system'
      WHEN public.is_admin() THEN 'admin'
      ELSE 'customer'
    END;

    INSERT INTO public.booking_events (
      booking_id, from_status, to_status, actor_id, actor_role, booking_version
    ) VALUES (
      NEW.id, NULL, NEW.status, auth.uid(), v_actor_role, NEW.version
    );

    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_actor_role := CASE
      WHEN auth.role() = 'service_role' THEN 'system'
      WHEN auth.uid() IS NULL THEN 'system'
      WHEN public.is_admin() THEN 'admin'
      WHEN NEW.customer_id = auth.uid() THEN 'customer'
      WHEN OLD.assigned_technician_id = public.current_technician_id() THEN 'technician'
      ELSE 'system'
    END;

    INSERT INTO public.booking_events (
      booking_id, from_status, to_status, actor_id, actor_role, booking_version
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(), v_actor_role, NEW.version
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_booking_status_change() FROM PUBLIC;

-- ------------------------------------------------------------------------------
-- 5. RLS policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin users can read own record" ON public.admin_users;
CREATE POLICY "Admin users can read own record"
  ON public.admin_users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone authenticated can view approved technicians" ON public.technicians;
DROP POLICY IF EXISTS "Anyone authenticated can view approved technicians or own profile" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can register their own profile" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can register their own profile as pending" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can update their availability" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can update their own availability" ON public.technicians;
DROP POLICY IF EXISTS "Admins can update all technician fields" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can view own profile" ON public.technicians;
DROP POLICY IF EXISTS "Admins can view all technician profiles" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can update their own profile" ON public.technicians;
DROP POLICY IF EXISTS "Admins can update all technician profiles" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can register their own pending profile" ON public.technicians;

CREATE POLICY "Technicians can view own profile"
  ON public.technicians FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all technician profiles"
  ON public.technicians FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Technicians can register their own pending profile"
  ON public.technicians FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid() IS NOT NULL
      AND auth_user_id = auth.uid()
      AND status = 'Pending Approval'
      AND approved_at IS NULL
      AND rejected_reason IS NULL
    )
    OR public.is_admin()
  );

CREATE POLICY "Technicians can update their own profile"
  ON public.technicians FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admins can update all technician profiles"
  ON public.technicians FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public and customers can create service bookings" ON public.bookings;
DROP POLICY IF EXISTS "Strict read isolation on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customer can rate completed bookings" ON public.bookings;
DROP POLICY IF EXISTS "Technician can update assigned job progress" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;

CREATE POLICY "Public and customers can create service bookings"
  ON public.bookings FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'New'
    AND version = 0
    AND service_rating = 0
    AND assigned_technician_id IS NULL
    AND assigned_technician_display_id IS NULL
    AND final_bill_amount IS NULL
    AND (
      customer_id IS NULL
      OR (auth.uid() IS NOT NULL AND auth.uid() = customer_id)
      OR public.is_admin()
    )
  );

CREATE POLICY "Strict read isolation on bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id
    OR assigned_technician_id = public.current_technician_id()
    OR public.is_admin()
  );

CREATE POLICY "Customer can rate completed bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Technician can update assigned job progress"
  ON public.bookings FOR UPDATE TO authenticated
  USING (assigned_technician_id = public.current_technician_id())
  WITH CHECK (
    assigned_technician_id = public.current_technician_id()
    OR (assigned_technician_id IS NULL AND status = 'Contacted')
  );

CREATE POLICY "Admins can update all bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins or assigned technicians can view commissions" ON public.commissions;
CREATE POLICY "Only admins or assigned technicians can view commissions"
  ON public.commissions FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR technician_id = public.current_technician_id()
  );

-- The live "Customers can view only their own support tickets" SELECT policy
-- stays in place; the support_messages policies below depend on it. Only the
-- duplicate authenticated-only policy is removed here.
DROP POLICY IF EXISTS "Customers can create tickets for their own bookings" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers view own tickets" ON public.support_tickets;
CREATE POLICY "Customers can create tickets for their own bookings"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND customer_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.id = support_tickets.booking_id
          AND b.customer_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Booking participants can view events" ON public.booking_events;
CREATE POLICY "Booking participants can view events"
  ON public.booking_events FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.customer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.assigned_technician_id = public.current_technician_id()
    )
  );

DROP POLICY IF EXISTS "Customers view messages for own tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Customers and admins can view ticket messages" ON public.support_messages;
CREATE POLICY "Customers and admins can view ticket messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can add messages to own tickets" ON public.support_messages;
CREATE POLICY "Customers can add messages to own tickets"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      sender_id = auth.uid()
      AND sender_role = 'customer'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.customer_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Technicians can read own ledger entries" ON public.commission_ledger;
DROP POLICY IF EXISTS "Admins and technicians can view commission ledger" ON public.commission_ledger;
CREATE POLICY "Admins and technicians can view commission ledger"
  ON public.commission_ledger FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR technician_id = public.current_technician_id()
  );

-- ------------------------------------------------------------------------------
-- 6. RLS and triggers
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_check_technician_update ON public.technicians;
CREATE TRIGGER trg_check_technician_update
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.check_technician_update();

DROP TRIGGER IF EXISTS trg_check_booking_update ON public.bookings;
CREATE TRIGGER trg_check_booking_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_update();

DROP TRIGGER IF EXISTS trg_increment_booking_version ON public.bookings;
CREATE TRIGGER trg_increment_booking_version
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_booking_version();

DROP TRIGGER IF EXISTS trg_log_booking_status_change ON public.bookings;
CREATE TRIGGER trg_log_booking_status_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_status_change();

DROP TRIGGER IF EXISTS trg_booking_events_append_only ON public.booking_events;
CREATE TRIGGER trg_booking_events_append_only
  BEFORE UPDATE OR DELETE ON public.booking_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_append_only_mutation();

DROP TRIGGER IF EXISTS trg_support_messages_append_only ON public.support_messages;
CREATE TRIGGER trg_support_messages_append_only
  BEFORE UPDATE OR DELETE ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_append_only_mutation();

DROP TRIGGER IF EXISTS trg_commission_ledger_append_only ON public.commission_ledger;
CREATE TRIGGER trg_commission_ledger_append_only
  BEFORE UPDATE OR DELETE ON public.commission_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_append_only_mutation();

-- ------------------------------------------------------------------------------
-- 7. Grants
-- ------------------------------------------------------------------------------
REVOKE ALL ON public.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

REVOKE ALL ON public.booking_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;

REVOKE ALL ON public.support_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

REVOKE ALL ON public.commission_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.commission_ledger TO authenticated;
GRANT ALL ON public.commission_ledger TO service_role;

-- Direct technician access is self/admin only. Everyone else reads the view.
REVOKE ALL ON public.technicians FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON TABLE public.technicians FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.technicians TO authenticated;
GRANT ALL ON public.technicians TO service_role;

-- Anonymous booking creation still needs INSERT; it does not need SELECT.
REVOKE ALL ON public.bookings FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

-- Remove default TRUNCATE/DELETE/REFERENCES/TRIGGER privileges. RLS does not
-- protect against TRUNCATE, so table privileges must be explicit.
REVOKE ALL ON public.customers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;

REVOKE ALL ON public.payments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;

REVOKE ALL ON public.commissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.commissions TO authenticated;

REVOKE ALL ON public.support_tickets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;

GRANT ALL ON public.customers, public.payments, public.commissions,
  public.support_tickets TO service_role;

-- audit_log already has RLS and an admin-only SELECT policy. Remove the live
-- anon SELECT grant; only service_role writes audit records.
REVOKE ALL ON public.audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

REVOKE ALL ON SEQUENCE public.customer_display_id_seq
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.technician_display_id_seq
  FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.customer_display_id_seq
  TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.technician_display_id_seq
  TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. Foreign-key type assertions
-- ------------------------------------------------------------------------------
-- Fail the whole transaction rather than leave a text/uuid mismatch behind.
DO $$
DECLARE
  v_missing TEXT;
  v_bad RECORD;
BEGIN
  SELECT string_agg(expected.name, ', ' ORDER BY expected.name)
  INTO v_missing
  FROM (VALUES
    ('support_tickets_booking_id_fkey'),
    ('support_tickets_customer_id_fkey'),
    ('support_messages_ticket_id_fkey'),
    ('support_messages_sender_id_fkey'),
    ('booking_events_booking_id_fkey'),
    ('booking_events_actor_id_fkey'),
    ('commission_ledger_booking_id_fkey'),
    ('commission_ledger_technician_id_fkey')
  ) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = expected.name
      AND c.connamespace = 'public'::regnamespace
      AND c.contype = 'f'
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required foreign keys: %', v_missing;
  END IF;

  FOR v_bad IN
    SELECT c.conrelid::regclass::text AS child_table,
           la.attname AS child_column,
           format_type(la.atttypid, la.atttypmod) AS child_type,
           format_type(fa.atttypid, fa.atttypmod) AS parent_type
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS lk(attnum, ord) ON TRUE
    JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS fk(attnum, ord)
      ON fk.ord = lk.ord
    JOIN pg_attribute la
      ON la.attrelid = c.conrelid AND la.attnum = lk.attnum
    JOIN pg_attribute fa
      ON fa.attrelid = c.confrelid AND fa.attnum = fk.attnum
    WHERE c.contype = 'f'
      AND c.conrelid IN (
        'public.support_tickets'::regclass,
        'public.support_messages'::regclass,
        'public.booking_events'::regclass,
        'public.commission_ledger'::regclass
      )
      AND la.atttypid <> fa.atttypid
  LOOP
    RAISE EXCEPTION 'FK type mismatch on %.%: % vs %',
      v_bad.child_table, v_bad.child_column,
      v_bad.child_type, v_bad.parent_type;
  END LOOP;
END $$;

COMMIT;
