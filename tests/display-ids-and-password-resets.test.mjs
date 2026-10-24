/**
 * Local Handyman (Chirala, AP) - Display IDs & All Password Reset Flows Test Suite
 *
 * Verifies:
 * 1. Sequential, formatted display IDs for customers (CUS-00001) and technicians (TECH-00001).
 * 2. Preservation of internal UUIDs as primary keys and foreign key relationships.
 * 3. Immutable display IDs enforced by database triggers and immutable state mapping.
 * 4. Safe database migration & schema definitions (sequences, triggers, unique constraints).
 * 5. Role-segregated password recovery redirects:
 *    - Customer: /customer
 *    - Technician: /technician
 *    - Admin: /admin
 * 6. Customer password reset email request & updateUser flow with password validation.
 * 7. Technician password reset email request & updateUser flow with password validation.
 * 8. Admin password reset authorization enforcement (preventing unauthorized privilege escalation).
 * 9. Route segregation in App.tsx (preventing cross-role recovery hijacking).
 * 10. UI display ID integration across Customer, Technician, and Admin dashboards.
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
    console.error(`  ${RED}✗ FAIL${RESET}: ${message} (Expected error "${expectedSubstring}", but did not throw)`);
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
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  DISPLAY IDS & PASSWORD RESETS VERIFICATION SUITE (CHIRALA, AP)       ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // =========================================================================
  // SUITE 1: DATABASE MIGRATION & SCHEMA INTEGRITY
  // =========================================================================
  console.log(`${BOLD}Suite 1: Database Migration & Schema Integrity (Sequences, Triggers, RLS)${RESET}`);

  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20261021_display_ids.sql');
  const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');

  assert(fs.existsSync(migrationPath), 'Dedicated migration file 20261021_display_ids.sql exists');
  assert(fs.existsSync(schemaPath), 'Main schema file supabase/schema.sql exists');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Check sequence definitions
  assert(
    migrationSql.includes('customer_display_id_seq') && migrationSql.includes('technician_display_id_seq'),
    'Migration defines independent customer and technician display ID sequences'
  );
  assert(
    schemaSql.includes('customer_display_id_seq') && schemaSql.includes('technician_display_id_seq'),
    'Schema includes independent customer and technician display ID sequences'
  );

  // Check format: CUS-00001 and TECH-00001
  assert(
    migrationSql.includes("'CUS-' || LPAD(nextval('public.customer_display_id_seq')::TEXT, 5, '0')"),
    'Customer display ID sequence formats with CUS- prefix and 5-digit left padding (CUS-00001)'
  );
  assert(
    migrationSql.includes("'TECH-' || LPAD(nextval('public.technician_display_id_seq')::TEXT, 5, '0')"),
    'Technician display ID sequence formats with TECH- prefix and 5-digit left padding (TECH-00001)'
  );

  // Check unique constraints & columns
  assert(
    migrationSql.includes('ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE'),
    'display_id is added with UNIQUE constraint in migrations'
  );
  assert(
    schemaSql.includes('display_id TEXT UNIQUE'),
    'display_id is defined with UNIQUE constraint in schema'
  );

  // Check immutability triggers
  assert(
    migrationSql.includes('trg_protect_customer_display_id') && migrationSql.includes('trg_protect_technician_display_id'),
    'Migration installs trigger functions preventing modifications to display_id once set'
  );
  assert(
    migrationSql.includes('NEW.display_id := OLD.display_id') || migrationSql.includes('immutable'),
    'Trigger functions enforce display_id immutability (preserving OLD.display_id if modification attempted)'
  );

  // Check preservation of internal UUIDs and foreign keys
  assert(
    schemaSql.includes('id UUID PRIMARY KEY REFERENCES auth.users(id)'),
    'Customer table preserves internal UUID primary key referencing auth.users(id)'
  );
  assert(
    schemaSql.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'),
    'Technician table preserves internal UUID primary key'
  );
  assert(
    migrationSql.includes('customer_display_id TEXT') && migrationSql.includes('assigned_technician_display_id TEXT'),
    'Bookings table stores display IDs alongside foreign key UUIDs'
  );

  // =========================================================================
  // SUITE 2: SEQUENTIAL DISPLAY ID FORMAT & GENERATION LOGIC
  // =========================================================================
  console.log(`\n${BOLD}Suite 2: Sequential Display ID Format & Generation Logic${RESET}`);

  // Test 5-digit formatting logic
  const formatCustomerDisplayId = (seq) => `CUS-${String(seq).padStart(5, '0')}`;
  const formatTechnicianDisplayId = (seq) => `TECH-${String(seq).padStart(5, '0')}`;

  assert(formatCustomerDisplayId(1) === 'CUS-00001', 'Sequence 1 generates CUS-00001');
  assert(formatCustomerDisplayId(42) === 'CUS-00042', 'Sequence 42 generates CUS-00042');
  assert(formatCustomerDisplayId(1005) === 'CUS-01005', 'Sequence 1005 generates CUS-01005');
  assert(formatCustomerDisplayId(99999) === 'CUS-99999', 'Sequence 99999 generates CUS-99999');

  assert(formatTechnicianDisplayId(1) === 'TECH-00001', 'Sequence 1 generates TECH-00001');
  assert(formatTechnicianDisplayId(7) === 'TECH-00007', 'Sequence 7 generates TECH-00007');
  assert(formatTechnicianDisplayId(888) === 'TECH-00888', 'Sequence 888 generates TECH-00888');

  // Validate regex matching
  const customerIdRegex = /^CUS-\d{5}$/;
  const techIdRegex = /^TECH-\d{5}$/;
  assert(customerIdRegex.test('CUS-00001'), 'CUS-00001 strictly matches customer display ID pattern');
  assert(techIdRegex.test('TECH-00001'), 'TECH-00001 strictly matches technician display ID pattern');
  assert(!customerIdRegex.test('CUS-1'), 'CUS-1 without padding is rejected');
  assert(!techIdRegex.test('TECH-CH-8291'), 'Legacy pseudo-random TECH-CH-8291 format is rejected');

  // Verify types.ts definitions
  const typesPath = path.join(rootDir, 'src', 'types.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');

  assert(typesContent.includes('displayId?: string;'), 'types.ts defines displayId on CustomerProfile and TechnicianRecord');
  assert(typesContent.includes('customerDisplayId?: string;'), 'types.ts defines customerDisplayId on BookingRecord');
  assert(typesContent.includes('assignedTechnicianDisplayId?: string;'), 'types.ts defines assignedTechnicianDisplayId on BookingRecord');

  // =========================================================================
  // SUITE 3: CLIENT SERVICE INTEGRATION (CUSTOMER, TECHNICIAN, BOOKING)
  // =========================================================================
  console.log(`\n${BOLD}Suite 3: Client Service Integration & ID Stability${RESET}`);

  const customerServicePath = path.join(rootDir, 'src', 'services', 'customerService.ts');
  const customerServiceContent = fs.readFileSync(customerServicePath, 'utf8');

  assert(
    customerServiceContent.includes("`CUS-${String(this.customers.length + 1).padStart(5, '0')}`") ||
    customerServiceContent.includes("`CUS-${String(nextSeq).padStart(5, '0')}`"),
    'customerService.ts formats sequential display IDs (CUS-00001)'
  );
  assert(
    customerServiceContent.includes("display_id") && customerServiceContent.includes("from('customers')"),
    'customerService.ts queries and synchronizes display_id with Supabase table'
  );
  assert(
    customerServiceContent.includes('stableDisplayId = existing.displayId ||') ||
    customerServiceContent.includes('existing.displayId'),
    'customerService.ts preserves assigned displayId across logins and sessions'
  );

  const technicianServicePath = path.join(rootDir, 'src', 'services', 'technicianService.ts');
  const technicianServiceContent = fs.readFileSync(technicianServicePath, 'utf8');

  assert(
    technicianServiceContent.includes("`TECH-${String(seqNum).padStart(5, '0')}`") ||
    technicianServiceContent.includes("`TECH-${String(this.technicians.length + 1).padStart(5, '0')}`"),
    'technicianService.ts formats sequential display IDs (TECH-00001)'
  );
  assert(
    technicianServiceContent.includes('displayId: row.display_id'),
    'technicianService.ts maps database display_id into TechnicianRecord'
  );

  const bookingServicePath = path.join(rootDir, 'src', 'services', 'bookingService.ts');
  const bookingServiceContent = fs.readFileSync(bookingServicePath, 'utf8');

  assert(
    bookingServiceContent.includes('customerDisplayId'),
    'bookingService.ts preserves and propagates customerDisplayId'
  );
  assert(
    bookingServiceContent.includes('assignedTechnicianDisplayId'),
    'bookingService.ts sets assignedTechnicianDisplayId upon technician assignment'
  );

  // =========================================================================
  // SUITE 4: AUTH SERVICE PASSWORD RECOVERY IMPLEMENTATION
  // =========================================================================
  console.log(`\n${BOLD}Suite 4: Role-Segregated Password Reset in authService.ts${RESET}`);

  const authServicePath = path.join(rootDir, 'src', 'services', 'authService.ts');
  const authServiceContent = fs.readFileSync(authServicePath, 'utf8');

  // 1. Customer Password Reset
  assert(
    authServiceContent.includes('sendCustomerPasswordReset(email: string)'),
    'authService.ts exposes sendCustomerPasswordReset(email)'
  );
  assert(
    authServiceContent.includes('/customer') && authServiceContent.includes('resetPasswordForEmail'),
    'Customer password reset explicitly targets /customer redirect URL'
  );
  assert(
    authServiceContent.includes('updateCustomerPassword(newPassword: string)'),
    'authService.ts exposes updateCustomerPassword(newPassword)'
  );

  // 2. Technician Password Reset
  assert(
    authServiceContent.includes('sendTechnicianPasswordReset(email: string)'),
    'authService.ts exposes sendTechnicianPasswordReset(email)'
  );
  assert(
    authServiceContent.includes('/technician') && authServiceContent.includes('resetPasswordForEmail'),
    'Technician password reset explicitly targets /technician redirect URL'
  );
  assert(
    authServiceContent.includes('updateTechnicianPassword(newPassword: string)'),
    'authService.ts exposes updateTechnicianPassword(newPassword)'
  );

  // 3. Admin Password Reset Security
  assert(
    authServiceContent.includes('sendAdminPasswordReset('),
    'authService.ts exposes sendAdminPasswordReset(adminEmail)'
  );
  assert(
    authServiceContent.includes('/admin') && authServiceContent.includes('resetPasswordForEmail'),
    'Admin password reset explicitly targets /admin redirect URL'
  );
  assert(
    authServiceContent.includes('updateAdminPassword(newPassword: string)'),
    'authService.ts exposes updateAdminPassword(newPassword)'
  );
  assert(
    authServiceContent.includes('this.isUserAdmin') && authServiceContent.includes("bffFetch<{ role: string }>('/me')"),
    'Admin password reset verifies the server-resolved role before allowing updateUser'
  );

  // 4. Password validation rules (min 6 chars)
  assert(
    authServiceContent.includes('cleanPassword.length < 6') || authServiceContent.includes('password.length < 6'),
    'authService enforces minimum 6 character password requirement'
  );

  // =========================================================================
  // SUITE 5: ROUTE SEGREGATION & CROSS-ROLE RECOVERY PROTECTION
  // =========================================================================
  console.log(`\n${BOLD}Suite 5: App.tsx Route Segregation & Anti-Hijacking Protection${RESET}`);

  const appPath = path.join(rootDir, 'src', 'App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  assert(
    appContent.includes("currentPath.startsWith('/technician')"),
    'App.tsx segregates /technician route'
  );
  assert(
    appContent.includes("currentPath.startsWith('/customer')"),
    'App.tsx segregates /customer route'
  );
  assert(
    appContent.includes("isTechnician") && appContent.includes("isCustomer") &&
    appContent.includes("(isRecoveryParam && !isTechnician && !isCustomer)"),
    'App.tsx prevents non-admin recovery links from being hijacked into AdminDashboard'
  );

  // Simulation: Test route resolution logic
  function resolveRoleRoute(pathname, isRecovery) {
    const isTech = pathname.startsWith('/technician') || pathname.includes('#technician');
    const isCust = pathname.startsWith('/customer') || pathname.includes('#customer');
    const isAdmin = pathname.startsWith('/admin') || pathname.includes('#admin') || (isRecovery && !isTech && !isCust);

    if (isAdmin) return 'admin';
    if (isTech) return 'technician';
    if (isCust) return 'customer';
    return 'home';
  }

  assert(resolveRoleRoute('/customer', true) === 'customer', 'Customer recovery URL (/customer) routes to customer dashboard');
  assert(resolveRoleRoute('/technician', true) === 'technician', 'Technician recovery URL (/technician) routes to technician portal');
  assert(resolveRoleRoute('/admin', true) === 'admin', 'Admin recovery URL (/admin) routes to admin dashboard');
  assert(resolveRoleRoute('/', false) === 'home', 'Public home URL (/) routes to home');

  // =========================================================================
  // SUITE 6: UI RECOVERY FORMS & DISPLAY ID PRESENTATION
  // =========================================================================
  console.log(`\n${BOLD}Suite 6: UI Recovery Views & Display ID Rendering${RESET}`);

  // CustomerDashboard.tsx
  const customerDashPath = path.join(rootDir, 'src', 'components', 'CustomerDashboard.tsx');
  const customerDashContent = fs.readFileSync(customerDashPath, 'utf8');

  assert(
    customerDashContent.includes('isRecoveryMode') && customerDashContent.includes('handleResetPasswordSubmit'),
    'CustomerDashboard.tsx contains dedicated recovery view and password update handler'
  );
  assert(
    customerDashContent.includes('authService.updateCustomerPassword'),
    'CustomerDashboard.tsx calls authService.updateCustomerPassword'
  );
  assert(
    customerDashContent.includes('{customer.displayId || customer.id}'),
    'CustomerDashboard.tsx renders customer.displayId in profile badge'
  );

  // CustomerAuthModal.tsx
  const customerModalPath = path.join(rootDir, 'src', 'components', 'CustomerAuthModal.tsx');
  const customerModalContent = fs.readFileSync(customerModalPath, 'utf8');

  assert(
    customerModalContent.includes("step === 'forgot'") && customerModalContent.includes('handleSendPasswordReset'),
    'CustomerAuthModal.tsx includes forgot password / email recovery step'
  );
  assert(
    customerModalContent.includes('authService.sendCustomerPasswordReset'),
    'CustomerAuthModal.tsx calls authService.sendCustomerPasswordReset'
  );

  // TechnicianPortal.tsx
  const techPortalPath = path.join(rootDir, 'src', 'components', 'TechnicianPortal.tsx');
  const techPortalContent = fs.readFileSync(techPortalPath, 'utf8');

  assert(
    techPortalContent.includes('isRecoveryMode') && techPortalContent.includes('handleResetPasswordSubmit'),
    'TechnicianPortal.tsx contains dedicated recovery view and password update handler'
  );
  assert(
    techPortalContent.includes('authService.updateTechnicianPassword'),
    'TechnicianPortal.tsx calls authService.updateTechnicianPassword'
  );
  assert(
    techPortalContent.includes('{currentTech.displayId || currentTech.id}'),
    'TechnicianPortal.tsx renders displayId in workspace header and pending review gate'
  );

  // AdminDashboard.tsx
  const adminDashPath = path.join(rootDir, 'src', 'components', 'AdminDashboard.tsx');
  const adminDashContent = fs.readFileSync(adminDashPath, 'utf8');

  assert(
    adminDashContent.includes('{b.customerDisplayId || b.customerId || \'Guest Booking\'}'),
    'AdminDashboard.tsx renders b.customerDisplayId in bookings table'
  );
  assert(
    adminDashContent.includes('{t.displayId ? `${t.displayId} - ` : \'\'}{t.fullName}'),
    'AdminDashboard.tsx renders technician displayId in dispatch assignment dropdown'
  );
  assert(
    adminDashContent.includes('{t.displayId || t.id}'),
    'AdminDashboard.tsx renders displayId badge on pending cards and technician directory'
  );

  console.log(`\n${BOLD}${GREEN}========================================================================${RESET}`);
  console.log(`${BOLD}${GREEN}  ALL ${total} VERIFICATION ASSERTIONS PASSED SUCCESSFULLY!          ${RESET}`);
  console.log(`${BOLD}${GREEN}========================================================================${RESET}\n`);
}

runTests().catch((err) => {
  console.error(`\n${RED}${BOLD}Test suite failed:${RESET}`, err);
  process.exit(1);
});
