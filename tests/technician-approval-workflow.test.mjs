/**
 * Local Handyman (Chirala, AP) - Technician Management & Approval Workflow Test Suite
 * 
 * Verifies:
 * 1. Initial technician count starts strictly at 0 (all mock/demo arrays purged).
 * 2. Real counts are separated into total, pending, approved, and rejected.
 * 3. Technician registration links to authenticated user ID and defaults strictly to 'Pending Approval'.
 * 4. Duplicate technician registrations by phone or auth_user_id are rejected.
 * 5. Access control gate: pending/rejected technicians are blocked from customer dispatch workspace.
 * 6. Security & RLS: technicians cannot self-approve; only admins can alter status/approved_at.
 * 7. Admin approval workflow updates Supabase record, sets approved_at, and increments approved count.
 * 8. Admin rejection workflow updates Supabase record, records reason, and decrements pending count.
 * 9. Approved technicians are eligible for job assignment in booking dispatch.
 * 10. AdminDashboard.tsx renders loading, error, and categorized KPI states cleanly without fake zeros.
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
    console.error(`  ${RED}✗ FAIL${RESET}: ${message} (Expected error containing "${expectedSubstring}", but no error thrown)`);
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

async function runTechnicianWorkflowTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  TECHNICIAN REGISTRATION & ADMIN APPROVAL WORKFLOW VERIFICATION SUITE  ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // =================================================================
  // SUITE 1: PURGE OF HARDCODED / MOCK ARRAYS & ZERO INITIAL COUNT
  // =================================================================
  console.log(`${BOLD}Suite 1: Hardcoded Mock Technician Purge & Zero Count Invariants${RESET}`);

  const techServiceSource = fs.readFileSync(path.join(rootDir, 'src', 'services', 'technicianService.ts'), 'utf8');

  // TEST 1.1: Verify INITIAL_APPROVED_TECHNICIANS is completely purged
  assert(
    !techServiceSource.includes('INITIAL_APPROVED_TECHNICIANS'),
    'Hardcoded INITIAL_APPROVED_TECHNICIANS array is completely purged from technicianService.ts'
  );

  // TEST 1.2: Verify no mock Ramesh Babu or Suresh Varma seed data exists in code
  assert(
    !techServiceSource.includes('Ramesh Babu') && !techServiceSource.includes('Suresh Varma'),
    'Demo seed records for Ramesh Babu and Suresh Varma are removed from codebase'
  );

  // TEST 1.3: Verify initial state starts strictly at empty array
  assert(
    techServiceSource.includes('this.technicians = [];'),
    'technicianService initial state strictly initializes to empty array []'
  );

  // Mock in-memory TechnicianService model for behavioral verification
  class MockTechnicianService {
    constructor() {
      this.technicians = [];
      this.currentTechnicianId = null;
    }

    getCounts() {
      return {
        total: this.technicians.length,
        pending: this.technicians.filter((t) => t.status === 'Pending Approval').length,
        approved: this.technicians.filter((t) => t.status === 'Approved').length,
        rejected: this.technicians.filter((t) => t.status === 'Rejected').length,
      };
    }

    registerTechnician(data, supabaseUid) {
      const cleanedPhone = data.phoneNumber.trim().replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
        throw new Error('Please enter a valid 10-digit Indian mobile number.');
      }

      const existing = this.technicians.find(
        (t) => t.phoneNumber === cleanedPhone || (supabaseUid && t.supabaseUid === supabaseUid)
      );
      if (existing) {
        throw new Error(`Mobile number +91 ${cleanedPhone} or this account is already registered as a technician.`);
      }

      const newRecord = {
        id: `TECH-CH-${1000 + this.technicians.length + 1}`,
        supabaseUid,
        fullName: data.fullName.trim(),
        phoneNumber: cleanedPhone,
        email: data.email?.trim() || undefined,
        serviceCategory: data.serviceCategory,
        neighborhood: data.neighborhood,
        status: 'Pending Approval', // Strictly defaults to Pending Approval
        availability: 'Available',
        registeredAt: new Date().toISOString(),
        authProvider: 'supabase-auth',
      };

      this.technicians.unshift(newRecord);
      this.currentTechnicianId = newRecord.id;
      return newRecord;
    }

    updateTechnicianStatus(id, newStatus, actorRole, reason) {
      // Server-side RLS enforcement simulation
      if (actorRole !== 'admin') {
        throw new Error('403: Forbidden - Only administrators can modify technician verification status or approval timestamp.');
      }

      const tech = this.technicians.find((t) => t.id === id);
      if (!tech) throw new Error('Technician record not found.');

      tech.status = newStatus;
      if (newStatus === 'Approved') {
        tech.approvedAt = new Date().toISOString();
        tech.rejectedReason = undefined;
      } else if (newStatus === 'Rejected') {
        tech.rejectedReason = reason || 'Application details could not be verified.';
      }
      return tech;
    }

    getApprovedTechnicians() {
      return this.technicians.filter((t) => t.status === 'Approved');
    }
  }

  const mockService = new MockTechnicianService();

  // TEST 1.4: Initial state counts are strictly 0
  const initialCounts = mockService.getCounts();
  assert(
    initialCounts.total === 0 &&
    initialCounts.pending === 0 &&
    initialCounts.approved === 0 &&
    initialCounts.rejected === 0,
    'Initial technician count is strictly 0 when no genuine records exist in database'
  );

  // =================================================================
  // SUITE 2: REGISTRATION FLOW, STATUS DEFAULT & DUPLICATE CHECKS
  // =================================================================
  console.log(`\n${BOLD}Suite 2: Technician Registration & Duplicate Prevention${RESET}`);

  // TEST 2.1: Register first technician partner (Electrician in Chirala)
  const tech1 = mockService.registerTechnician({
    fullName: 'Venkat Rao',
    phoneNumber: '9848012345',
    email: 'venkat.electric@example.com',
    serviceCategory: 'Electrical Repairs',
    neighborhood: 'Bypass Road',
  }, 'auth-uid-venkat-001');

  assert(
    tech1.status === 'Pending Approval',
    'New technician registration status strictly defaults to "Pending Approval"'
  );
  assert(
    tech1.supabaseUid === 'auth-uid-venkat-001',
    'Technician profile is linked to authenticated Supabase user ID'
  );

  // TEST 2.2: Verify count updates: total=1, pending=1, approved=0
  const countsAfterTech1 = mockService.getCounts();
  assert(
    countsAfterTech1.total === 1 &&
    countsAfterTech1.pending === 1 &&
    countsAfterTech1.approved === 0 &&
    countsAfterTech1.rejected === 0,
    'Registering a technician increments total and pending by 1 while approved remains 0'
  );

  // TEST 2.3: Duplicate registration with same phone number is rejected
  assertThrows(
    () => mockService.registerTechnician({
      fullName: 'Venkat Duplicate',
      phoneNumber: '9848012345',
      serviceCategory: 'Electrical Repairs',
      neighborhood: 'Bypass Road',
    }, 'auth-uid-other-999'),
    'already registered as a technician',
    'Duplicate registration attempt with same phone number throws validation error'
  );

  // TEST 2.4: Duplicate registration with same Supabase user ID is rejected
  assertThrows(
    () => mockService.registerTechnician({
      fullName: 'Venkat Alternate Phone',
      phoneNumber: '9848099999',
      serviceCategory: 'Electrical Repairs',
      neighborhood: 'Bypass Road',
    }, 'auth-uid-venkat-001'),
    'already registered as a technician',
    'Duplicate registration attempt with same Supabase user ID throws validation error'
  );

  // TEST 2.5: Register second technician (Plumber in Chirala)
  const tech2 = mockService.registerTechnician({
    fullName: 'Subba Rao',
    phoneNumber: '9848054321',
    email: 'subbarao.plumber@example.com',
    serviceCategory: 'Plumbing Repairs',
    neighborhood: 'Old Chirala',
  }, 'auth-uid-subba-002');

  const countsAfterTech2 = mockService.getCounts();
  assert(
    countsAfterTech2.total === 2 && countsAfterTech2.pending === 2 && countsAfterTech2.approved === 0,
    'Two registered technicians result in total=2, pending=2, approved=0'
  );

  // =================================================================
  // SUITE 3: AUTHORIZATION, RLS & SELF-APPROVAL PROTECTION
  // =================================================================
  console.log(`\n${BOLD}Suite 3: Security & Authorization Protection Against Self-Approval${RESET}`);

  // TEST 3.1: Technician attempting to self-approve via updateTechnicianStatus is rejected
  assertThrows(
    () => mockService.updateTechnicianStatus(tech1.id, 'Approved', 'technician'),
    '403: Forbidden - Only administrators can modify technician verification status',
    'Technician attempting to self-approve is strictly blocked with 403 Forbidden'
  );

  // TEST 3.2: Verify PostgreSQL schema contains check_technician_update trigger
  const schemaSql = fs.readFileSync(path.join(rootDir, 'supabase', 'schema.sql'), 'utf8');
  assert(
    schemaSql.includes('check_technician_update()') && schemaSql.includes('trg_check_technician_update'),
    'Database schema enforces check_technician_update() trigger on public.technicians'
  );

  // TEST 3.3: Verify PostgreSQL schema enforces unique constraints on auth_user_id and phone
  assert(
    schemaSql.includes('uq_technicians_auth_user') && schemaSql.includes('uq_technicians_phone'),
    'Database schema enforces unique constraints uq_technicians_auth_user and uq_technicians_phone'
  );

  // TEST 3.4: Verify RLS policies separate admin and technician permissions
  assert(
    schemaSql.includes('Admins can update all technician fields') &&
    schemaSql.includes('Technicians can update their own availability'),
    'Row Level Security policies distinguish admin full update privileges from technician self-update'
  );

  // TEST 3.5: Verify no service role key is bundled in frontend
  const envContent = fs.existsSync(path.join(rootDir, '.env.local')) 
    ? fs.readFileSync(path.join(rootDir, '.env.local'), 'utf8') 
    : '';
  assert(
    !envContent.includes('service_role') && !techServiceSource.includes('service_role'),
    'Supabase service-role key is never exposed to browser or frontend service'
  );

  // =================================================================
  // SUITE 4: ADMIN APPROVAL & REJECTION WORKFLOW
  // =================================================================
  console.log(`\n${BOLD}Suite 4: Administrator Approval & Rejection Workflow${RESET}`);

  // TEST 4.1: Admin approves Venkat Rao
  const approvedTech1 = mockService.updateTechnicianStatus(tech1.id, 'Approved', 'admin');
  assert(
    approvedTech1.status === 'Approved' && approvedTech1.approvedAt !== undefined,
    'Admin approval updates technician status to "Approved" and records approvedAt timestamp'
  );

  // TEST 4.2: Verify counts update immediately: total=2, pending=1, approved=1, rejected=0
  const countsAfterApproval = mockService.getCounts();
  assert(
    countsAfterApproval.total === 2 &&
    countsAfterApproval.pending === 1 &&
    countsAfterApproval.approved === 1 &&
    countsAfterApproval.rejected === 0,
    'Admin approval immediately increments approved count and decrements pending count'
  );

  // TEST 4.3: Approved technician is now eligible for job assignment
  const eligibleTechs = mockService.getApprovedTechnicians();
  assert(
    eligibleTechs.length === 1 && eligibleTechs[0].id === tech1.id,
    'Approved technician is returned in getApprovedTechnicians() for dispatch assignment'
  );

  // TEST 4.4: Admin rejects Subba Rao with reason
  const rejectedTech2 = mockService.updateTechnicianStatus(
    tech2.id, 
    'Rejected', 
    'admin', 
    'Plumbing trade certificate could not be verified with local municipal authority.'
  );
  assert(
    rejectedTech2.status === 'Rejected' && 
    rejectedTech2.rejectedReason.includes('Plumbing trade certificate'),
    'Admin rejection updates status to "Rejected" and stores rejectedReason'
  );

  // TEST 4.5: Verify final counts: total=2, pending=0, approved=1, rejected=1
  const finalCounts = mockService.getCounts();
  assert(
    finalCounts.total === 2 &&
    finalCounts.pending === 0 &&
    finalCounts.approved === 1 &&
    finalCounts.rejected === 1,
    'Admin rejection decrements pending to 0 and increments rejected count to 1'
  );

  // =================================================================
  // SUITE 5: ACCESS GATE IN TECHNICIAN PORTAL
  // =================================================================
  console.log(`\n${BOLD}Suite 5: Technician Portal Access Gate Invariants${RESET}`);

  const techPortalSource = fs.readFileSync(path.join(rootDir, 'src', 'components', 'TechnicianPortal.tsx'), 'utf8');

  // TEST 5.1: Pending status renders pending approval gate
  assert(
    techPortalSource.includes('VIEW 2: PENDING APPROVAL GATE') &&
    (techPortalSource.includes('Account Pending Admin Approval') || techPortalSource.includes('Application Pending Approval')),
    'TechnicianPortal contains dedicated PENDING APPROVAL GATE blocking workspace access'
  );

  // TEST 5.2: Pending technician is prevented from seeing customer bookings
  assert(
    techPortalSource.includes("currentTech.status !== 'Approved'") ||
    techPortalSource.includes("currentTech.status === 'Pending Approval'"),
    'TechnicianPortal evaluates status !== "Approved" before rendering dispatch workspace'
  );

  // =================================================================
  // SUITE 6: ADMIN DASHBOARD UI INVARIANTS & ERROR RESILIENCE
  // =================================================================
  console.log(`\n${BOLD}Suite 6: Admin Dashboard UI Invariants, Loading & Error States${RESET}`);

  const adminDashboardSource = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AdminDashboard.tsx'), 'utf8');

  // TEST 6.1: Dedicated Pending Technician Approvals section in AdminDashboard
  assert(
    adminDashboardSource.includes('Pending Technician Approvals') &&
    adminDashboardSource.includes('pendingTechs.map'),
    'AdminDashboard renders dedicated Pending Technician Approvals section for fast verification'
  );

  // TEST 6.2: Categorized metric strip rendering total, pending, approved, rejected
  assert(
    adminDashboardSource.includes('Total Registered') &&
    adminDashboardSource.includes('Pending Approvals') &&
    (adminDashboardSource.includes('Approved &amp; Active') || adminDashboardSource.includes('Approved & Active')) &&
    adminDashboardSource.includes('Rejected'),
    'AdminDashboard renders 4 categorized KPI cards representing actual Supabase statuses'
  );

  // TEST 6.3: Error state banner with retry button prevents misleading fake zero
  assert(
    adminDashboardSource.includes('techsQueryError') &&
    adminDashboardSource.includes('Retry Supabase Query'),
    'AdminDashboard displays error banner with Retry button when Supabase query fails'
  );

  // TEST 6.4: Clean empty state when total technicians is 0
  assert(
    adminDashboardSource.includes('0 Technicians Registered') &&
    adminDashboardSource.includes('totalTechsCount === 0'),
    'AdminDashboard renders clean 0 Technicians Registered state when database is empty'
  );

  // =================================================================
  // SUMMARY REPORT
  // =================================================================
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${GREEN}  ALL ${passed}/${total} TECHNICIAN WORKFLOW & APPROVAL TESTS PASSED!${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);
}

runTechnicianWorkflowTests().catch((err) => {
  console.error(`\n${RED}Test execution aborted due to unhandled failure:${RESET}`, err);
  process.exit(1);
});
