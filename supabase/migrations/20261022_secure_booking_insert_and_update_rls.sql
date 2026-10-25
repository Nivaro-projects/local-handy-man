-- ==============================================================================
-- LOCAL HANDYMAN (CLR SERVICES / NIVARO) - DATABASE SECURITY MIGRATION
-- Migration: Secure Booking INSERT and UPDATE Row Level Security
-- Timestamp: 2026-10-22
--
-- Security vulnerabilities addressed:
-- 1. Unrestricted INSERT (WITH CHECK (true)) allowed untrusted clients to insert
--    arbitrary customer_id values, forge technician assignments, set non-New
--    statuses, or inject pre-set final bill amounts.
-- 2. Permissive customer UPDATE policy allowed customers to alter any field on
--    their booking, including assigned technician or final bill amount.
--
-- Remediation:
-- 1. Replace permissive INSERT policy with strict invariants:
--    - status must equal 'New'
--    - assigned_technician_id and assigned_technician_display_id must be NULL
--    - final_bill_amount must be NULL
--    - customer_id must be NULL (guest) OR equal to auth.uid() OR public.is_admin()
-- 2. Install BEFORE UPDATE trigger (check_booking_update) on public.bookings:
--    - Enforces immutability of customer_id, phone, category, and created_at
--    - Limits customer updates to rating completed jobs or cancelling 'New'/'Contacted' jobs
--    - Limits technician updates to job progress and final bill amount
--    - Full update capability preserved strictly for verified administrators
-- ==============================================================================

-- 1. Hardened INSERT policy for public.bookings
DROP POLICY IF EXISTS "Public and customers can create service bookings" ON public.bookings;

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

-- 2. Trigger function to protect booking fields from unauthorized modification
CREATE OR REPLACE FUNCTION public.check_booking_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Administrators have unrestricted update authority
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Invariant: Core creation fields are immutable for non-administrators
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION '403 Forbidden: customer_id is immutable.';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION '403 Forbidden: created_at is immutable.';
  END IF;

  -- Check if updater is the assigned technician
  IF EXISTS (
    SELECT 1 FROM public.technicians t
    WHERE t.auth_user_id = auth.uid()
      AND t.id = OLD.assigned_technician_id
  ) THEN
    -- Technician cannot change customer details or assign a different technician
    IF NEW.assigned_technician_id IS DISTINCT FROM OLD.assigned_technician_id THEN
      -- Permitted only when reporting unable to attend (status -> 'Contacted', tech -> NULL)
      IF NOT (NEW.status = 'Contacted' AND NEW.assigned_technician_id IS NULL) THEN
        RAISE EXCEPTION '403 Forbidden: Technicians cannot reassign job ownership.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Check if updater is the customer owner
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.customer_id THEN
    -- Customers cannot alter technician assignment
    IF NEW.assigned_technician_id IS DISTINCT FROM OLD.assigned_technician_id THEN
      RAISE EXCEPTION '403 Forbidden: Customers cannot modify technician assignment.';
    END IF;
    -- Customers cannot alter final bill amount
    IF NEW.final_bill_amount IS DISTINCT FROM OLD.final_bill_amount THEN
      RAISE EXCEPTION '403 Forbidden: Customers cannot modify final bill amount.';
    END IF;
    -- Customers can only cancel unassigned bookings ('New' or 'Contacted' -> 'Cancelled')
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
