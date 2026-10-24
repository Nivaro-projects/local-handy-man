-- ==============================================================================
-- LOCAL HANDYMAN (CLR SERVICES) - DATABASE SECURITY MIGRATION
-- Migration: Fix Administrator Privilege Escalation (Remove user_metadata.role)
-- Timestamp: 2026-10-21
-- 
-- Vulnerability closed:
-- Previously, public.is_admin() evaluated (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'.
-- Because user_metadata is client-writable via supabase.auth.signUp() and
-- supabase.auth.updateUser(), ordinary users could elevate themselves to full admin.
-- 
-- Remediation:
-- 1. Restrict public.is_admin() strictly to approved administrator emails and
--    server-controlled app_metadata.role = 'admin'.
-- 2. Fully remove user_metadata.role evaluation.
-- 3. Require secure email verification without unsafe fallback (no COALESCE(..., TRUE)).
--    Verifies via auth.users.email_confirmed_at IS NOT NULL or explicit JWT email_verified IS TRUE.
-- 4. Set safe search_path to prevent CWE-426 search-path hijacking on SECURITY DEFINER.
-- 5. Enforce least privilege execution grants.
-- ==============================================================================

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
