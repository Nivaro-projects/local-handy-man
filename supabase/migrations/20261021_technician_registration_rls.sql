-- ==============================================================================
-- NIVARO (LOCAL HANDYMAN / CLR SERVICES) - DATABASE SECURITY MIGRATION
-- Migration: Technician Registration RLS Hardening & Active Session Binding
-- Timestamp: 2026-10-21
--
-- Objective:
-- Resolve: "new row violates row-level security policy for table technicians"
--
-- Root Cause:
-- When a technician registered via the frontend, the client executed an INSERT
-- into public.technicians before an active authenticated session was established,
-- or with auth.uid() = NULL (e.g. unconfirmed email in Supabase GoTrue), or with
-- a mismatched or null auth_user_id. The RLS policy evaluated
-- (auth_user_id = auth.uid()), which failed because auth.uid() was NULL.
--
-- Security Principles:
-- 1. Do NOT disable RLS or allow public/anonymous inserts.
-- 2. Require an authentic, verified auth.uid() matching auth_user_id.
-- 3. Enforce that all self-registered technician applications default strictly
--    to status = 'Pending Approval' to prevent authorization bypass.
-- 4. Allow approved administrators (public.is_admin()) to register technicians.
-- ==============================================================================

-- 1. Ensure RLS is active on public.technicians
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- 2. Replace the INSERT policy with strict session binding & status check
DROP POLICY IF EXISTS "Technicians can register their own profile" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can register their own profile as pending" ON public.technicians;

CREATE POLICY "Technicians can register their own profile as pending"
  ON public.technicians FOR INSERT
  WITH CHECK (
    (
      auth.uid() IS NOT NULL 
      AND auth_user_id = auth.uid() 
      AND status = 'Pending Approval'
    )
    OR public.is_admin()
  );

-- 3. Ensure UPDATE policy allows technicians to update only their own profile
DROP POLICY IF EXISTS "Technicians can update their availability" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can update their own availability" ON public.technicians;

CREATE POLICY "Technicians can update their own availability"
  ON public.technicians FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    OR public.is_admin()
  );

-- 4. Review Note for Supabase Dashboard Operators:
-- If your Supabase Project has "Confirm email" enabled under Authentication -> Providers -> Email,
-- users will not receive an active JWT session until their email is confirmed.
-- For phone-based technician accounts using synthetic domains (e.g. @clrservices.in), either:
--   a) Disable "Confirm email" in Supabase Auth settings if technicians are approved manually anyway, OR
--   b) Keep "Confirm email" enabled for real email addresses, and have technicians confirm their email
--      before their initial login.
