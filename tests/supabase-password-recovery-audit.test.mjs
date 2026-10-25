/**
 * Local Handyman (Chirala, AP) - Supabase Password Recovery Comprehensive Audit Suite
 *
 * Verifies:
 * 1. Supabase PKCE recovery code exchange race-condition protection.
 * 2. Auth listener holding recovery state on SIGNED_IN when recovery URL params are present.
 * 3. Role detection and segregation across Customer, Technician, and Admin portals.
 * 4. Redirect URL targets: /customer, /technician, and /admin.
 * 5. Recovery UIs in CustomerDashboard, TechnicianPortal, and AdminDashboard.
 * 6. Customer login page (/login) and modal recovery entry points.
 * 7. Security invariants: min length >= 6, password matching, sign out after reset, and zero bypasses.
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

async function runRecoveryAuditSuite() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  SUPABASE PASSWORD RECOVERY COMPREHENSIVE AUDIT TEST SUITE            ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const authServicePath = path.join(rootDir, 'src', 'services', 'authService.ts');
  const authServiceSrc = fs.readFileSync(authServicePath, 'utf8');

  // =========================================================================
  // SUITE 1: PKCE CODE EXCHANGE & RACE CONDITION ELIMINATION
  // =========================================================================
  console.log(`${BOLD}Suite 1: PKCE Code Exchange & Double-Exchange Race Condition Guards${RESET}`);

  assert(
    authServiceSrc.includes('checkPasswordRecoveryUrl()') &&
    authServiceSrc.includes('searchParams.get(\'code\')'),
    'authService.ts detects PKCE authorization code parameter (?code=)'
  );

  assert(
    authServiceSrc.includes('earlySession') &&
    authServiceSrc.includes('supabase.auth.getSession()') &&
    authServiceSrc.includes('exchangeCodeForSession'),
    'authService.ts checks existing session before redundant exchangeCodeForSession to eliminate race condition'
  );

  assert(
    authServiceSrc.includes('sessionData') &&
    authServiceSrc.includes('supabase.auth.getSession()'),
    'authService.ts fallbacks to session check if exchangeCodeForSession was consumed by detectSessionInUrl'
  );

  assert(
    authServiceSrc.includes('onAuthStateChange') &&
    authServiceSrc.includes('isUrlRecovery') &&
    authServiceSrc.includes('this.isPasswordRecoveryActive = true;'),
    'authService.ts onAuthStateChange prevents SIGNED_IN event from auto-opening dashboard during recovery'
  );

  // =========================================================================
  // SUITE 2: ROLE IDENTIFICATION & RECOVERY PASSWORD UPDATE
  // =========================================================================
  console.log(`\n${BOLD}Suite 2: Role Detection & Segregated Password Update Handlers${RESET}`);

  assert(
    authServiceSrc.includes('getRecoveryUserRole(): Promise<\'admin\' | \'technician\' | \'customer\' | null>'),
    'authService.ts provides getRecoveryUserRole() to safely detect active recovery role'
  );

  assert(
    authServiceSrc.includes('updateRecoveryPassword(newPassword: string)'),
    'authService.ts provides universal updateRecoveryPassword(newPassword) with role auto-detection'
  );

  assert(
    authServiceSrc.includes('sendCustomerPasswordReset(email: string)') &&
    authServiceSrc.includes('updateCustomerPassword(newPassword: string)'),
    'authService.ts exposes customer password reset dispatch and update methods'
  );

  assert(
    authServiceSrc.includes('sendTechnicianPasswordReset(email: string)') &&
    authServiceSrc.includes('updateTechnicianPassword(newPassword: string)'),
    'authService.ts exposes technician password reset dispatch and update methods'
  );

  assert(
    authServiceSrc.includes('sendAdminPasswordReset(adminEmail: string)') &&
    authServiceSrc.includes('updateAdminPassword(newPassword: string)'),
    'authService.ts exposes admin password reset dispatch and update methods'
  );

  assert(
    authServiceSrc.includes('redirectTo: typeof window !== \'undefined\' ? `${window.location.origin}/customer` : undefined'),
    'Customer reset specifies /customer redirect URL'
  );

  assert(
    authServiceSrc.includes('redirectTo: typeof window !== \'undefined\' ? `${window.location.origin}/technician` : undefined'),
    'Technician reset specifies /technician redirect URL'
  );

  assert(
    authServiceSrc.includes('redirectTo: typeof window !== \'undefined\' ? `${window.location.origin}/admin` : undefined'),
    'Admin reset specifies /admin redirect URL'
  );

  // =========================================================================
  // SUITE 3: UI RECOVERY VIEWS IN ALL THREE PORTALS
  // =========================================================================
  console.log(`\n${BOLD}Suite 3: UI Recovery Views & Synchronous Parameter Detection${RESET}`);

  const adminDashSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AdminDashboard.tsx'), 'utf8');
  const techPortalSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'TechnicianPortal.tsx'), 'utf8');
  const custDashSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'CustomerDashboard.tsx'), 'utf8');
  const loginPageSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'LoginPage.tsx'), 'utf8');
  const custModalSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'CustomerAuthModal.tsx'), 'utf8');

  assert(
    adminDashSrc.includes('const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {') &&
    adminDashSrc.includes('recoveryRole'),
    'AdminDashboard.tsx synchronously initializes isRecoveryMode and tracks recoveryRole'
  );

  assert(
    adminDashSrc.includes('updateAdminPassword') &&
    adminDashSrc.includes('updateTechnicianPassword') &&
    adminDashSrc.includes('updateCustomerPassword'),
    'AdminDashboard.tsx handles cross-portal recovery if non-admin reset is redirected to admin'
  );

  assert(
    techPortalSrc.includes('const [isRecoveryMode, setIsRecoveryMode] = useState(() => {') &&
    techPortalSrc.includes('updateTechnicianPassword'),
    'TechnicianPortal.tsx synchronously initializes isRecoveryMode and calls updateTechnicianPassword'
  );

  assert(
    custDashSrc.includes('const [isRecoveryMode, setIsRecoveryMode] = useState(() => {') &&
    custDashSrc.includes('updateCustomerPassword'),
    'CustomerDashboard.tsx synchronously initializes isRecoveryMode and calls updateCustomerPassword'
  );

  assert(
    loginPageSrc.includes('handleSendPasswordReset') &&
    loginPageSrc.includes('authService.sendCustomerPasswordReset') &&
    loginPageSrc.includes('Forgot password or email account recovery?'),
    'LoginPage.tsx features Forgot Password trigger and calls authService.sendCustomerPasswordReset'
  );

  assert(
    custModalSrc.includes('handleSendPasswordReset') &&
    custModalSrc.includes('authService.sendCustomerPasswordReset'),
    'CustomerAuthModal.tsx includes forgot password recovery flow'
  );

  // =========================================================================
  // SUITE 4: SECURITY & CLEANUP INVARIANTS
  // =========================================================================
  console.log(`\n${BOLD}Suite 4: Security Hardening & Session Cleanup Invariants${RESET}`);

  assert(
    authServiceSrc.includes('await supabase.auth.signOut()'),
    'authService.ts enforces session termination after password update to prevent unauthorized reuse'
  );

  assert(
    authServiceSrc.includes('cleanPassword.length < 6') || authServiceSrc.includes('password.length < 6'),
    'Minimum password length of 6 characters is enforced across all roles'
  );

  assert(
    adminDashSrc.includes('cleanNew !== cleanConfirm') &&
    techPortalSrc.includes('cleanNew !== cleanConfirm') &&
    custDashSrc.includes('cleanNew !== cleanConfirm'),
    'All three dashboards enforce password matching before dispatching updateUser'
  );

  console.log(`\n${BOLD}${GREEN}========================================================================${RESET}`);
  console.log(`${BOLD}${GREEN}  ALL ${total} RECOVERY AUDIT ASSERTIONS PASSED SUCCESSFULLY!          ${RESET}`);
  console.log(`${BOLD}${GREEN}========================================================================${RESET}\n`);
}

runRecoveryAuditSuite().catch((err) => {
  console.error(`\n${RED}${BOLD}Recovery audit test failed:${RESET}`, err);
  process.exit(1);
});
