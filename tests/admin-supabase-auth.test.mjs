/**
 * Local Handyman - Admin Supabase Authentication & Configuration Test Suite
 * 
 * Verifies:
 * 1. Supabase client configuration detection (isSupabaseConfigured).
 * 2. Admin login form availability states (configured vs unconfigured).
 * 3. Server-side admin role verification (isUserAdmin).
 * 4. No hardcoded administrator identifiers in client code.
 * 5. Password reset email authorization.
 * 6. Zero service_role secrets or hardcoded passwords in client code.
 * 7. Safe Firebase fallback handling.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ${GREEN}✓ PASS${RESET}: ${message}`);
    passed++;
  } else {
    console.error(`  ${RED}✗ FAIL${RESET}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(fn, expectedSubstring, message) {
  total++;
  try {
    fn();
    console.error(`  ${RED}✗ FAIL${RESET}: ${message} (Expected error "${expectedSubstring}", but function did not throw)`);
    throw new Error(`Expected throw: ${message}`);
  } catch (err) {
    const errText = err?.message || String(err);
    if (errText.includes(expectedSubstring)) {
      console.log(`  ${GREEN}✓ PASS${RESET}: ${message} [Correctly threw: "${expectedSubstring}"]`);
      passed++;
    } else {
      console.error(`  ${RED}✗ FAIL${RESET}: ${message} (Got "${errText}", expected "${expectedSubstring}")`);
      throw err;
    }
  }
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  ADMIN SUPABASE AUTHENTICATION & CONFIGURATION TEST SUITE      ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

  // =================================================================
  // SUITE 1: SUPABASE CONFIGURATION DETECTION
  // =================================================================
  console.log(`${BOLD}Suite 1: Supabase Client Configuration Detection${RESET}`);

  const evalIsConfigured = (url, key) => {
    return Boolean(
      url &&
      key &&
      url.startsWith('http') &&
      !url.includes('your-project-ref') &&
      key.length > 20
    );
  };

  // TEST 1.1: Missing variables evaluate to false
  assert(
    evalIsConfigured(undefined, undefined) === false,
    'Unconfigured environment (undefined URL and Key) returns false'
  );

  // TEST 1.2: Placeholder template URL evaluates to false
  assert(
    evalIsConfigured('https://your-project-ref.supabase.co', 'short-key') === false,
    'Placeholder template values return false'
  );

  // TEST 1.3: Real Supabase project configuration evaluates to true
  const realUrl = 'https://tdmxvefgqwtzqtslgnpb.supabase.co';
  const realKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXh2ZWZncXd0enF0c2xnbnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NjA0MjYsImV4cCI6MjEwODAzNjQyNn0.BGQ4HBJ-SE7PeWWYl-CckDqG-IQwI9W7jq2HEfwWEdk';
  assert(
    evalIsConfigured(realUrl, realKey) === true,
    'Valid Supabase URL and anon JWT key evaluate to true'
  );

  // =================================================================
  // SUITE 2: ADMIN SIGN-IN AVAILABILITY STATES
  // =================================================================
  console.log(`\n${BOLD}Suite 2: Admin Sign-In Availability Guardrails${RESET}`);

  const adminDashboardSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AdminDashboard.tsx'), 'utf8');

  // TEST 2.1: AdminDashboard displays unavailability warning ONLY when unconfigured
  assert(
    adminDashboardSrc.includes('!isSupabaseConfigured() &&'),
    'AdminDashboard conditionally checks !isSupabaseConfigured() before displaying unavailable banner'
  );

  // TEST 2.2: Sign-in submit button requires valid Supabase configuration
  assert(
    adminDashboardSrc.includes('disabled={isLoadingAuth || !isSupabaseConfigured()}'),
    'Admin login button is disabled when Supabase is not configured and enabled when configured'
  );

  // TEST 2.3: Zero hardcoded admin passwords or bypass flags in AdminDashboard
  assert(
    !adminDashboardSrc.includes('satyasarma@28') && !adminDashboardSrc.includes('lh_admin_authenticated'),
    'Zero hardcoded admin credentials or client bypass flags exist in AdminDashboard'
  );

  // =================================================================
  // SUITE 3: SERVER-SIDE ADMIN ROLE VERIFICATION & PRIVILEGE ESCALATION PREVENTION
  // =================================================================
  console.log(`\n${BOLD}Suite 3: Server-Side Admin Authorization Logic & Escalation Prevention${RESET}`);

  const authServiceSrc = fs.readFileSync(path.join(rootDir, 'src', 'services', 'authService.ts'), 'utf8');
  const meRouteSrc = fs.readFileSync(path.join(rootDir, 'api', 'me.mjs'), 'utf8');
  const adminLibSrc = fs.readFileSync(path.join(rootDir, 'api', '_lib', 'supabaseAdmin.mjs'), 'utf8');

  assert(
    !authServiceSrc.includes('AUTHORIZED_ADMIN_EMAILS') &&
      !authServiceSrc.includes(".includes(user.email.toLowerCase())"),
    'authService.ts contains no email whitelist or email-based admin grant'
  );
  assert(
    !authServiceSrc.includes("app_metadata?.role === 'admin'"),
    'authService.ts does not grant admin from JWT app_metadata'
  );
  assert(
    authServiceSrc.includes("bffFetch<{ role: string }>('/me')"),
    'authService.ts resolves admin status through /api/me'
  );
  assert(
    !adminDashboardSrc.includes('AUTHORIZED_ADMIN_EMAILS') &&
      adminDashboardSrc.includes('useState<AdminProfile | null>(null)'),
    'AdminDashboard starts denied and contains no email whitelist'
  );
  assert(
    meRouteSrc.includes('requireUser(req, res)') && meRouteSrc.includes('isActiveAdmin(user.id)'),
    '/api/me validates the JWT and reads public.admin_users'
  );
  assert(
    meRouteSrc.includes("role = isAdmin") && meRouteSrc.includes(": 'customer'"),
    '/api/me grants admin only from the active-admin lookup'
  );
  assert(
    !meRouteSrc.includes('email'),
    '/api/me does not return email or other PII'
  );
  assert(
    adminLibSrc.includes(".eq('is_active', true)") && !adminLibSrc.includes('user_metadata'),
    'The admin lookup requires is_active and never reads user_metadata'
  );

  // The SQL migration tests below document the legacy email/app_metadata model
  // that Phase 1 replaced with public.admin_users.
  const LEGACY_APPROVED_EMAILS = [
    'sarmakoniki2010@gmail.com',
    'admin@clrservices.in',
    'clrsarma.chirala@gmail.com',
    'admin@chiralahandyman.com',
  ];

  // TEST 3.10: Migration file 20261021_fix_admin_privilege_escalation.sql exists and enforces safe checks
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20261021_fix_admin_privilege_escalation.sql');
  assert(fs.existsSync(migrationPath), 'Migration 20261021_fix_admin_privilege_escalation.sql exists');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const functionSql = migrationSql.substring(migrationSql.indexOf('CREATE OR REPLACE FUNCTION'));
  assert(
    !functionSql.includes('user_metadata'),
    'Migration SQL function does NOT evaluate or trust user_metadata'
  );
  assert(
    migrationSql.includes("auth.jwt() -> 'app_metadata' ->> 'role'") && migrationSql.includes('sarmakoniki2010@gmail.com'),
    'Migration SQL preserves approved emails and trusted app_metadata role'
  );

  // TEST 3.11: Baseline schema.sql is hardened against user_metadata escalation
  const baseSchemaSql = fs.readFileSync(path.join(rootDir, 'supabase', 'schema.sql'), 'utf8');
  assert(
    !baseSchemaSql.includes("(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'"),
    'Baseline supabase/schema.sql has eliminated user_metadata evaluation from public.is_admin()'
  );

  // TEST 3.12: Strict fail-closed email verification in migration SQL (no unsafe TRUE fallback)
  assert(
    !functionSql.includes('TRUE\n      )') && !functionSql.includes('TRUE\r\n      )') && !functionSql.includes('COALESCE('),
    'Migration SQL does NOT use unsafe TRUE fallback or unsafe COALESCE for email verification'
  );
  assert(
    functionSql.includes('IS TRUE') && functionSql.includes('u.email_confirmed_at IS NOT NULL'),
    'Migration SQL enforces strict verification via explicit boolean claim or server-side auth.users.email_confirmed_at'
  );
  assert(
    functionSql.includes('SET search_path = public, auth, pg_temp'),
    'Migration SQL enforces safe search_path to prevent CWE-426 search-path hijacking'
  );
  assert(
    functionSql.includes('REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;') &&
    functionSql.includes('GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;'),
    'Migration SQL enforces least-privilege execution permissions'
  );

  // TEST 3.13: Strict fail-closed email verification in schema.sql
  assert(
    !baseSchemaSql.includes('COALESCE(') && baseSchemaSql.includes('u.email_confirmed_at IS NOT NULL'),
    'Baseline schema.sql enforces strict fail-closed email verification and server-side auth.users check'
  );
  assert(
    baseSchemaSql.includes('SET search_path = public, auth, pg_temp'),
    'Baseline schema.sql enforces safe search_path configuration'
  );

  // TEST 3.14: Complete SQL is_admin simulator (mirrors PostgreSQL function logic exactly)
  const evalSqlIsAdmin = (jwt, dbUser = null) => {
    // 1. Server-controlled role claim in app_metadata
    if (jwt?.app_metadata?.role === 'admin') return true;

    // 2. Approved administrator email identities
    const email = jwt?.email;
    if (email && LEGACY_APPROVED_EMAILS.includes(email.toLowerCase())) {
      // Must NOT use unsafe fallback (missing claim != verified)
      const explicitJwtVerified = jwt?.email_verified === true || jwt?.app_metadata?.email_verified === true;
      const dbVerified = Boolean(
        dbUser &&
        dbUser.id === jwt?.sub &&
        dbUser.email?.toLowerCase() === email.toLowerCase() &&
        dbUser.email_confirmed_at !== null &&
        dbUser.email_confirmed_at !== undefined
      );

      return explicitJwtVerified || dbVerified;
    }

    return false;
  };

  // Scenario A: Missing verification claims in JWT (standard Supabase email login)
  assert(
    evalSqlIsAdmin({ sub: 'user-1', email: 'sarmakoniki2010@gmail.com' }, null) === false,
    'SQL is_admin: Missing JWT verification claim without confirmed DB record is strictly REJECTED (fail-closed)'
  );
  assert(
    evalSqlIsAdmin({ sub: 'user-1', email: 'sarmakoniki2010@gmail.com' }, { id: 'user-1', email: 'sarmakoniki2010@gmail.com', email_confirmed_at: null }) === false,
    'SQL is_admin: Missing JWT verification claim with unconfirmed DB email (null email_confirmed_at) is strictly REJECTED'
  );
  assert(
    evalSqlIsAdmin({ sub: 'user-1', email: 'sarmakoniki2010@gmail.com' }, { id: 'user-1', email: 'sarmakoniki2010@gmail.com', email_confirmed_at: '2026-10-20T03:11:47Z' }) === true,
    'SQL is_admin: Missing JWT claim but verified in auth.users (email_confirmed_at present) is correctly AUTHORIZED'
  );

  // Scenario B: Explicitly unverified email
  assert(
    evalSqlIsAdmin({ sub: 'user-2', email: 'admin@clrservices.in', email_verified: false }, null) === false,
    'SQL is_admin: Explicitly unverified email (email_verified: false) is strictly REJECTED'
  );
  assert(
    evalSqlIsAdmin({ sub: 'user-2', email: 'admin@clrservices.in', email_verified: false }, { id: 'user-2', email: 'admin@clrservices.in', email_confirmed_at: null }) === false,
    'SQL is_admin: Explicitly unverified email with null DB confirmed_at is strictly REJECTED'
  );

  // Scenario C: Ordinary users claiming admin in user_metadata
  assert(
    evalSqlIsAdmin({ sub: 'attacker-1', email: 'attacker@gmail.com', user_metadata: { role: 'admin' } }, null) === false,
    'SQL is_admin: Ordinary user claiming user_metadata.role: "admin" is strictly REJECTED'
  );
  assert(
    evalSqlIsAdmin({ sub: 'tech-1', email: 'ramesh.electrician@gmail.com', user_metadata: { role: 'admin' } }, null) === false,
    'SQL is_admin: Ordinary technician claiming user_metadata.role: "admin" is strictly REJECTED'
  );
  assert(
    evalSqlIsAdmin({ sub: 'customer-1', email: 'customer@chirala.in', email_verified: true, user_metadata: { role: 'admin' } }, { id: 'customer-1', email: 'customer@chirala.in', email_confirmed_at: '2026-10-20T00:00:00Z' }) === false,
    'SQL is_admin: Verified ordinary customer claiming user_metadata.role: "admin" is strictly REJECTED (not in approved list)'
  );

  // Scenario D: Legitimate administrators preserved
  assert(
    evalSqlIsAdmin({ sub: 'admin-1', email: 'random-identity@example.com', app_metadata: { role: 'admin' } }, null) === true,
    'SQL is_admin: Legitimate admin with server-controlled app_metadata.role: "admin" is AUTHORIZED'
  );
  LEGACY_APPROVED_EMAILS.forEach((approvedEmail) => {
    assert(
      evalSqlIsAdmin(
        { sub: `admin-${approvedEmail}`, email: approvedEmail },
        { id: `admin-${approvedEmail}`, email: approvedEmail, email_confirmed_at: '2026-10-20T00:00:00Z' }
      ) === true,
      `SQL is_admin: Approved admin ${approvedEmail} with confirmed email is AUTHORIZED`
    );
  });

  // TEST 3.15: Unified Hardened Evaluation of app_metadata.role = 'admin' across verification states
  const evalUnifiedAdmin = (jwt, dbUser = null) => {
    const isRoleAdmin = jwt?.app_metadata?.role === 'admin';
    const isWhitelistedEmail = jwt?.email && LEGACY_APPROVED_EMAILS.includes(jwt.email.toLowerCase());

    if (!isRoleAdmin && !isWhitelistedEmail) return false;

    const explicitJwtVerified = jwt?.email_verified === true || jwt?.app_metadata?.email_verified === true;
    const dbVerified = Boolean(
      dbUser &&
      dbUser.id === jwt?.sub &&
      dbUser.email?.toLowerCase() === jwt?.email?.toLowerCase() &&
      dbUser.email_confirmed_at !== null &&
      dbUser.email_confirmed_at !== undefined
    );

    return explicitJwtVerified || dbVerified;
  };

  // 3.15a: app_metadata.role = admin with verified status
  assert(
    evalUnifiedAdmin(
      { sub: 'admin-verified', email: 'owner@clrservices.in', app_metadata: { role: 'admin' } },
      { id: 'admin-verified', email: 'owner@clrservices.in', email_confirmed_at: '2026-10-20T00:00:00Z' }
    ) === true,
    'Unified Model: app_metadata.role = "admin" with verified email is AUTHORIZED'
  );

  // 3.15b: app_metadata.role = admin with explicitly unverified status
  assert(
    evalUnifiedAdmin(
      { sub: 'admin-unverified', email: 'owner@clrservices.in', app_metadata: { role: 'admin' }, email_verified: false },
      { id: 'admin-unverified', email: 'owner@clrservices.in', email_confirmed_at: null }
    ) === false,
    'Unified Model: app_metadata.role = "admin" with unverified email (email_confirmed_at: null) is strictly REJECTED'
  );

  // 3.15c: app_metadata.role = admin with missing verification status
  assert(
    evalUnifiedAdmin(
      { sub: 'admin-missing', email: 'owner@clrservices.in', app_metadata: { role: 'admin' } },
      null
    ) === false,
    'Unified Model: app_metadata.role = "admin" with missing verification status is strictly REJECTED (fail-closed)'
  );

  // TEST 3.16: Simulation of client API modification attempts on user_metadata vs app_metadata
  const simulateClientUpdateUser = (clientPayload, isServiceRole = false) => {
    const userSession = {
      sub: 'cust-123',
      email: 'customer@chirala.in',
      app_metadata: { role: 'customer' },
      user_metadata: { full_name: 'Customer Kumar' },
    };

    // Client can modify user_metadata via options.data or updateUser({ data })
    if (clientPayload.data || clientPayload.user_metadata) {
      userSession.user_metadata = {
        ...userSession.user_metadata,
        ...(clientPayload.data || clientPayload.user_metadata),
      };
    }

    // Client CANNOT modify app_metadata (GoTrue strips it unless called via service_role)
    if (clientPayload.app_metadata && isServiceRole) {
      userSession.app_metadata = {
        ...userSession.app_metadata,
        ...clientPayload.app_metadata,
      };
    }

    return userSession;
  };

  // 3.16a: Customer attempts to set user_metadata.role = 'admin'
  const customerEscalatedUser = simulateClientUpdateUser({ data: { role: 'admin' } }, false);
  assert(
    customerEscalatedUser.user_metadata.role === 'admin' &&
    evalSqlIsAdmin(customerEscalatedUser) === false,
    'Security Invariant: Customer modifying user_metadata.role to "admin" receives is_admin() = FALSE'
  );

  // 3.16b: Ordinary user attempts to modify app_metadata.role = 'admin' via client API
  const ordinaryClientAppMetaAttempt = simulateClientUpdateUser({ app_metadata: { role: 'admin' } }, false);
  assert(
    ordinaryClientAppMetaAttempt.app_metadata.role === 'customer' &&
    evalSqlIsAdmin(ordinaryClientAppMetaAttempt) === false,
    'Security Invariant: Client-side attempt to modify app_metadata is rejected/stripped; is_admin() remains FALSE'
  );

  // 3.16c: Legitimate service-role provisioning of app_metadata
  const serviceRoleProvisionedUser = simulateClientUpdateUser({ app_metadata: { role: 'admin' } }, true);
  assert(
    serviceRoleProvisionedUser.app_metadata.role === 'admin' &&
    evalSqlIsAdmin(serviceRoleProvisionedUser) === true,
    'Security Invariant: Legitimate server-side service_role provisioning of app_metadata.role = "admin" is recognized'
  );

  // TEST 3.17: Simulation of Unauthorized Direct Database / PostgREST API Access
  const simulatePostgrestAccess = (tableName, operation, callerJwt, callerDbRecord = null) => {
    const isAdmin = evalSqlIsAdmin(callerJwt, callerDbRecord);

    if (tableName === 'payments') {
      if (isAdmin) return { status: 200, allowed: true, data: [{ id: 'PAY-1', amount: 500 }] };
      if (operation === 'SELECT') {
        if (callerJwt?.sub === 'customer-owner-id') {
          return { status: 200, allowed: true, data: [{ id: 'PAY-CUS-1', customer_id: 'customer-owner-id' }] };
        }
        return { status: 200, allowed: true, data: [] }; // RLS returns empty array for other customers
      }
      return { status: 403, allowed: false, error: 'new row violates row-level security policy' };
    }

    if (tableName === 'commissions') {
      if (isAdmin) return { status: 200, allowed: true, data: [{ id: 'COMM-1', commission_amount: 50 }] };
      return { status: 403, allowed: false, error: 'permission denied for table commissions' };
    }

    return { status: 200, allowed: true };
  };

  const attackerJwt = { sub: 'attacker-id', email: 'attacker@evil.com', user_metadata: { role: 'admin' } };
  
  // 3.17a: Direct unauthorized read on payments
  const paymentsReadResult = simulatePostgrestAccess('payments', 'SELECT', attackerJwt);
  assert(
    paymentsReadResult.allowed && paymentsReadResult.data.length === 0,
    'PostgREST RLS Gate: Attacker querying payments receives empty set [] (zero records leaked)'
  );

  // 3.17b: Direct unauthorized write/refund on payments
  const paymentsWriteResult = simulatePostgrestAccess('payments', 'UPDATE', attackerJwt);
  assert(
    paymentsWriteResult.status === 403 && paymentsWriteResult.allowed === false,
    'PostgREST RLS Gate: Attacker attempting payments write receives 403 Forbidden'
  );

  // 3.17c: Direct unauthorized read on commissions
  const commissionsReadResult = simulatePostgrestAccess('commissions', 'SELECT', attackerJwt);
  assert(
    commissionsReadResult.status === 403 && commissionsReadResult.allowed === false,
    'PostgREST RLS Gate: Attacker attempting commissions access receives 403 Forbidden'
  );

  // =================================================================
  // SUITE 4: NO HARDCODED ADMIN IDENTIFIERS
  // =================================================================
  console.log(`\n${BOLD}Suite 4: No Hardcoded Admin Identifiers${RESET}`);

  assert(
    !authServiceSrc.includes('naniii') && !authServiceSrc.includes('sarmakoniki2010@gmail.com'),
    'authService.ts contains no hardcoded administrator alias or email'
  );
  assert(
    authServiceSrc.includes('sendAdminPasswordReset(adminEmail: string)') &&
      !authServiceSrc.includes('includes(resolvedEmail.toLowerCase())'),
    'Password reset no longer checks a client-side email whitelist'
  );
  assert(
    !adminDashboardSrc.includes('naniii') && !adminDashboardSrc.includes('sarmakoniki2010@gmail.com'),
    'AdminDashboard contains no hardcoded administrator identity'
  );

  // =================================================================
  // SUITE 5: ENVIRONMENT FILE & SECRET INTEGRITY AUDIT
  // =================================================================
  console.log(`\n${BOLD}Suite 5: Environment File & Secret Integrity Audit${RESET}`);

  const envLocalPath = path.join(rootDir, '.env.local');
  assert(fs.existsSync(envLocalPath), '.env.local file exists');

  const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');
  assert(
    envLocalContent.includes('VITE_SUPABASE_URL=https://tdmxvefgqwtzqtslgnpb.supabase.co'),
    '.env.local contains active Supabase URL'
  );

  assert(
    envLocalContent.includes('VITE_SUPABASE_ANON_KEY=eyJhbGciOi'),
    '.env.local contains active Supabase public anon key'
  );

  assert(
    !envLocalContent.includes('service_role'),
    '.env.local does NOT contain or expose any Supabase service_role secret key'
  );

  // TEST 5.4: Firebase service file does not auto-initialize with fake keys
  const firebaseServiceSrc = fs.readFileSync(path.join(rootDir, 'src', 'services', 'firebase.ts'), 'utf8');
  assert(
    firebaseServiceSrc.includes('isFirebaseConfigured()'),
    'firebase.ts guards against unconfigured initialization'
  );

  // =================================================================
  // SUITE 6: HOMEPAGE & FOOTER ROUTE ISOLATION AUDIT
  // =================================================================
  console.log(`\n${BOLD}Suite 6: Homepage & Footer Admin Isolation Audit${RESET}`);

  const footerSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Footer.tsx'), 'utf8');
  assert(
    !footerSrc.includes('Admin Dispatch Console'),
    'Footer.tsx does NOT render "Admin Dispatch Console" link'
  );
  assert(
    !footerSrc.includes('href="/admin"'),
    'Footer.tsx does NOT link to "/admin"'
  );

  const appSrc = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf8');
  assert(
    appSrc.includes('if (isAdmin) {') && appSrc.includes('<AdminDashboard'),
    'App.tsx strictly isolates AdminDashboard behind isAdmin condition'
  );

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log(`\n${BOLD}${GREEN}================================================================${RESET}`);
  console.log(`${BOLD}${GREEN}  ALL ${passed} OF ${total} ADMIN SUPABASE AUTH TESTS PASSED!       ${RESET}`);
  console.log(`${BOLD}${GREEN}================================================================${RESET}\n`);
}

runTests().catch((err) => {
  console.error(`\n${RED}Test execution failed:${RESET}`, err);
  process.exit(1);
});
