-- ==============================================================================
-- NIVARO / CLR SERVICES - PHASE 1 STATIC SECURITY CHECKS
-- Run after 20261024_phase1_security_reconciliation.sql, as the database owner
-- (Supabase SQL editor / postgres). This script is read-only.
--
-- It fails fast with the first missing control. It does not prove row-level
-- behavior; use project-audit/PHASE1_APPLY_AND_VERIFY.md for role simulations.
-- ==============================================================================

DO $$
DECLARE
  v_missing TEXT;
BEGIN
  -- ---------------------------------------------------------------------------
  -- Required objects and columns
  -- ---------------------------------------------------------------------------
  IF to_regclass('public.admin_users') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.admin_users';
  END IF;
  IF to_regclass('public.booking_events') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.booking_events';
  END IF;
  IF to_regclass('public.support_messages') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.support_messages';
  END IF;
  IF to_regclass('public.commission_ledger') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.commission_ledger';
  END IF;
  IF to_regclass('public.technician_public_profiles') IS NULL THEN
    RAISE EXCEPTION 'Missing view public.technician_public_profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'technicians'
      AND column_name = 'rejected_reason'
  ) THEN
    RAISE EXCEPTION 'Missing public.technicians.rejected_reason';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings'
      AND column_name = 'version'
  ) THEN
    RAISE EXCEPTION 'Missing public.bookings.version';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments'
      AND column_name = 'idempotency_key'
  ) THEN
    RAISE EXCEPTION 'Missing public.payments.idempotency_key';
  END IF;

  -- ---------------------------------------------------------------------------
  -- View must not expose direct identifiers
  -- ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'technician_public_profiles'
      AND column_name IN ('phone', 'email', 'auth_user_id', 'rejected_reason')
  ) THEN
    RAISE EXCEPTION 'technician_public_profiles still exposes a PII column';
  END IF;

  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'technician_public_profiles'
      AND column_name IN (
        'id', 'display_id', 'full_name', 'service_category', 'neighborhood',
        'status', 'availability', 'registered_at', 'approved_at'
      )
  ) <> 9 THEN
    RAISE EXCEPTION 'technician_public_profiles does not have the expected 9 columns';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Admin identity
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE is_active AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'No active admin_users row';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin' AND p.pronargs = 0
      AND p.prosrc ILIKE '%user_metadata%'
  ) THEN
    RAISE EXCEPTION 'public.is_admin() still reads user_metadata';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin' AND p.pronargs = 0
      AND p.prosrc ILIKE '%admin_users%'
  ) THEN
    RAISE EXCEPTION 'public.is_admin() does not use public.admin_users';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin' AND p.pronargs = 0
      AND p.prosrc ILIKE '%@%'
  ) THEN
    RAISE EXCEPTION 'public.is_admin() still contains a hardcoded email';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'current_technician_id' AND p.pronargs = 0
      AND p.prosrc ILIKE '%Approved%'
  ) THEN
    RAISE EXCEPTION 'public.current_technician_id() does not require an approved technician';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'technician_public_profiles'
      AND definition ILIKE '%Approved%'
  ) THEN
    RAISE EXCEPTION 'technician_public_profiles does not filter approved rows';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Privilege surface: no anonymous PII, no client TRUNCATE/DELETE
  -- ---------------------------------------------------------------------------
  IF has_table_privilege('anon', 'public.technicians', 'SELECT')
     OR has_column_privilege('anon', 'public.technicians', 'phone', 'SELECT')
     OR has_column_privilege('anon', 'public.technicians', 'email', 'SELECT') THEN
    RAISE EXCEPTION 'anon still has direct technician PII access';
  END IF;

  IF NOT has_table_privilege('anon', 'public.technician_public_profiles', 'SELECT') THEN
    RAISE EXCEPTION 'anon cannot read technician_public_profiles';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.technician_public_profiles', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated cannot read technician_public_profiles';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('customers'), ('technicians'), ('bookings'), ('payments'),
      ('commissions'), ('support_tickets'), ('admin_users'),
      ('booking_events'), ('support_messages'), ('commission_ledger')
    ) AS t(name)
    CROSS JOIN (VALUES
      ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')
    ) AS p(privilege)
    WHERE has_table_privilege('anon', format('public.%I', t.name), p.privilege)
      AND NOT (t.name = 'bookings' AND p.privilege = 'INSERT')
  ) THEN
    RAISE EXCEPTION 'anon has an unexpected table privilege';
  END IF;

  IF NOT has_table_privilege('anon', 'public.bookings', 'INSERT') THEN
    RAISE EXCEPTION 'anon cannot create bookings';
  END IF;

  IF has_sequence_privilege('anon', 'public.customer_display_id_seq', 'USAGE')
     OR has_sequence_privilege('anon', 'public.technician_display_id_seq', 'USAGE')
     OR has_sequence_privilege('anon', 'public.customer_display_id_seq', 'UPDATE')
     OR has_sequence_privilege('anon', 'public.technician_display_id_seq', 'UPDATE') THEN
    RAISE EXCEPTION 'anon still has display-ID sequence access';
  END IF;

  IF NOT has_sequence_privilege('authenticated', 'public.customer_display_id_seq', 'USAGE')
     OR NOT has_sequence_privilege('authenticated', 'public.technician_display_id_seq', 'USAGE') THEN
    RAISE EXCEPTION 'authenticated cannot use the display-ID sequences';
  END IF;

  IF has_table_privilege('anon', 'public.bookings', 'SELECT')
     OR has_table_privilege('anon', 'public.bookings', 'UPDATE')
     OR has_table_privilege('anon', 'public.bookings', 'DELETE')
     OR has_table_privilege('anon', 'public.bookings', 'TRUNCATE') THEN
    RAISE EXCEPTION 'anon has more than INSERT on bookings';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('customers'), ('technicians'), ('bookings'), ('payments'),
      ('commissions'), ('support_tickets'), ('admin_users'),
      ('booking_events'), ('support_messages'), ('commission_ledger')
    ) AS t(name)
    WHERE has_table_privilege('authenticated', format('public.%I', t.name), 'DELETE')
       OR has_table_privilege('authenticated', format('public.%I', t.name), 'TRUNCATE')
  ) THEN
    RAISE EXCEPTION 'authenticated still has DELETE or TRUNCATE on an app table';
  END IF;

  IF has_table_privilege('authenticated', 'public.admin_users', 'INSERT')
     OR has_table_privilege('authenticated', 'public.admin_users', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.admin_users', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated can write admin_users directly';
  END IF;

  IF has_table_privilege('authenticated', 'public.booking_events', 'INSERT')
     OR has_table_privilege('authenticated', 'public.booking_events', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.booking_events', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated can write booking_events directly';
  END IF;

  IF has_table_privilege('authenticated', 'public.support_messages', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.support_messages', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated can mutate support_messages';
  END IF;

  IF has_table_privilege('authenticated', 'public.commission_ledger', 'INSERT')
     OR has_table_privilege('authenticated', 'public.commission_ledger', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.commission_ledger', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated can write commission_ledger directly';
  END IF;

  -- ---------------------------------------------------------------------------
  -- RLS and policies
  -- ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'admin_users', 'booking_events', 'support_messages',
        'commission_ledger', 'technicians', 'bookings',
        'customers', 'payments', 'commissions', 'support_tickets'
      )
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is disabled on an app table';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('bookings', 'technicians', 'support_tickets')
      AND btrim(with_check) IN ('true', '(true)')
  ) THEN
    RAISE EXCEPTION 'A permissive WITH CHECK (true) policy still exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
      AND policyname = 'Public and customers can create service bookings'
      AND with_check ILIKE '%status%New%'
      AND with_check ILIKE '%version%'
      AND with_check ILIKE '%service_rating%'
      AND with_check ILIKE '%assigned_technician_id%'
      AND with_check ILIKE '%final_bill_amount%'
  ) THEN
    RAISE EXCEPTION 'Bookings INSERT policy is missing its invariants';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'technicians'
      AND policyname = 'Technicians can register their own pending profile'
      AND with_check ILIKE '%Pending Approval%'
  ) THEN
    RAISE EXCEPTION 'Technician INSERT policy does not force Pending Approval';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'technicians'
      AND cmd = 'SELECT'
      AND qual ILIKE '%Approved%'
  ) THEN
    RAISE EXCEPTION 'A technician SELECT policy still exposes approved rows';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_tickets'
      AND policyname = 'Customers can create tickets for their own bookings'
      AND with_check ILIKE '%bookings%'
  ) THEN
    RAISE EXCEPTION 'Support ticket INSERT does not verify booking ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'booking_events'
      AND policyname = 'Booking participants can view events'
  ) THEN
    RAISE EXCEPTION 'Missing booking_events SELECT policy';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_messages'
      AND policyname = 'Customers and admins can view ticket messages'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_messages'
      AND policyname = 'Customers can add messages to own tickets'
  ) THEN
    RAISE EXCEPTION 'Missing support_messages policy';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'commission_ledger'
      AND policyname = 'Admins and technicians can view commission ledger'
  ) THEN
    RAISE EXCEPTION 'Missing commission_ledger SELECT policy';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Triggers
  -- ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('trg_check_technician_update'),
      ('trg_check_booking_update'),
      ('trg_increment_booking_version'),
      ('trg_log_booking_status_change'),
      ('trg_booking_events_append_only'),
      ('trg_support_messages_append_only'),
      ('trg_commission_ledger_append_only')
    ) AS t(name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_trigger g
      WHERE g.tgname = t.name AND NOT g.tgisinternal
    )
  ) THEN
    RAISE EXCEPTION 'A required trigger is missing';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Indexes
  -- ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('uq_technicians_auth_user'),
      ('uq_technicians_phone'),
      ('uq_payments_idempotency_key'),
      ('uq_payments_booking_paid')
    ) AS t(name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_index i ON i.indexrelid = c.oid
      WHERE n.nspname = 'public' AND c.relname = t.name
        AND c.relkind = 'i' AND i.indisunique
    )
  ) THEN
    RAISE EXCEPTION 'A required unique index is missing';
  END IF;

  RAISE NOTICE 'Phase 1 static security checks passed.';
END;
$$;
