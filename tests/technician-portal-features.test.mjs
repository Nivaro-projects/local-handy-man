import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================================');
console.log('  TECHNICIAN PORTAL UI & FUNCTIONALITY TEST SUITE (CHIRALA, AP)         ');
console.log('========================================================================\n');

const projectRoot = process.cwd();
const techPortalPath = path.join(projectRoot, 'src', 'components', 'TechnicianPortal.tsx');
const techServicePath = path.join(projectRoot, 'src', 'services', 'technicianService.ts');

assert.ok(fs.existsSync(techPortalPath), 'TechnicianPortal.tsx must exist');
const portalCode = fs.readFileSync(techPortalPath, 'utf8');
const serviceCode = fs.readFileSync(techServicePath, 'utf8');

// =========================================================================
// SUITE 1: BRAND PALETTE & COLOR TOKENS
// =========================================================================
console.log('Suite 1: Brand & Design Palette Verification');
assert.ok(
  portalCode.includes('#4A4A4A') || portalCode.includes('#4A251D') || portalCode.includes('#2E2E2E'),
  'Must use Charcoal Grey (#4A4A4A or #4A251D) for typography, header, and primary styling'
);
assert.ok(
  portalCode.includes('#E27D60') || portalCode.includes('#E59838'),
  'Must use Terracotta Orange (#E27D60 or #E59838) for CTAs, highlights, and accent states'
);
assert.ok(
  portalCode.includes('#2D4F1E') || portalCode.includes('#5F7D6B'),
  'Must use Forest Green (#2D4F1E or #5F7D6B) for success badges, border highlights, and secondary actions'
);
assert.ok(
  portalCode.includes('#F5E6CC') || portalCode.includes('#FDF6E4') || portalCode.includes('#FAF3E7'),
  'Must use Warm Cream (#F5E6CC or #FDF6E4) for card containers and badges'
);
assert.ok(
  portalCode.includes('#F5E6CC') || portalCode.includes('#EEF3EF') || portalCode.includes('#FAF3E7'),
  'Must use Warm Cream / Soft tint for dashboard background'
);
assert.ok(portalCode.includes('overflow-x-hidden'), 'Must include overflow-x-hidden to prevent mobile horizontal scroll');
console.log('  ✔ PASS: All 5 brand palette tokens and mobile overflow guards verified');

// =========================================================================
// SUITE 2: LOGGED-OUT EXPERIENCE & REGISTRATION VALIDATION
// =========================================================================
console.log('\nSuite 2: Logged-Out Authentication & Registration Invariants');
assert.ok(portalCode.includes('Technician Sign In'), 'Renders Technician Sign In header/tab');
assert.ok(portalCode.includes('Join as Partner') || portalCode.includes('Join as a Partner'), 'Renders registration tab');
assert.ok(portalCode.includes('fullName'), 'Registration includes full name input');
assert.ok(portalCode.includes('phoneNumber'), 'Registration includes mobile input');
assert.ok(portalCode.includes('serviceCategory'), 'Registration includes service specialization');
assert.ok(portalCode.includes('Electrical Repairs') && portalCode.includes('Plumbing Repairs'), 'Specialization dropdown contains Electrical and Plumbing');
assert.ok(
  portalCode.includes('Paparajuthota') &&
  portalCode.includes('Perala') &&
  portalCode.includes('Kothapeta') &&
  portalCode.includes('Srinivas Colony'),
  'Registration includes all 4 Chirala localities'
);
assert.ok(portalCode.includes('/^[6-9]\\d{9}$/'), 'Validates 10-digit Indian mobile number format starting with 6-9');
assert.ok(portalCode.includes('Quick Demo Technician Login'), 'Includes Quick Demo Technician Login button for dev sandbox');
assert.ok(portalCode.includes('isDemoModeAllowed()'), 'Quick Demo Technician Login is gated by isDemoModeAllowed()');
console.log('  ✔ PASS: Registration fields, Chirala localities, 10-digit validation, and demo mode gate verified');

// =========================================================================
// SUITE 3: LOGGED-IN HEADER & DUTY CONTROL
// =========================================================================
console.log('\nSuite 3: Logged-in Header & Duty Persistence Control');
assert.ok(portalCode.includes('Hello, {currentTech.fullName}'), 'Header displays "Hello, [Technician Name]" greeting');
assert.ok(portalCode.includes('{currentTech.serviceCategory}'), 'Header displays technician specialization');
assert.ok(portalCode.includes('{currentTech.neighborhood}'), 'Header displays technician locality');
assert.ok(portalCode.includes('On Duty') && portalCode.includes('Checked Out'), 'Header duty control features On Duty / Checked Out states');
assert.ok(portalCode.includes('technicianService.setAvailabilityAsync'), 'Duty control calls setAvailabilityAsync to persist to backend');
assert.ok(serviceCode.includes('setAvailabilityAsync'), 'technicianService provides setAvailabilityAsync for backend persistence');
assert.ok(serviceCode.includes('.update({ availability })'), 'Persists availability field to Supabase technicians table');
console.log('  ✔ PASS: Header greeting, specialization/locality, and persistent duty control verified');

// =========================================================================
// SUITE 4: FOUR STATISTIC CARDS & DATABASE ERROR RESILIENCE
// =========================================================================
console.log('\nSuite 4: Four Top Statistic Cards & Error Handling');
assert.ok(portalCode.includes('In Progress'), 'Card 1: In Progress statistic card');
assert.ok(portalCode.includes('Upcoming Jobs'), 'Card 2: Upcoming Jobs statistic card');
assert.ok(portalCode.includes('Completed Today'), 'Card 3: Completed Today statistic card');
assert.ok(portalCode.includes('Awaiting Parts / Review'), 'Card 4: Awaiting Parts / Review statistic card');
assert.ok(portalCode.includes('inProgressJobs.length'), 'In Progress count dynamically calculated from real records');
assert.ok(portalCode.includes('upcomingJobs.length'), 'Upcoming count dynamically calculated from real records');
assert.ok(portalCode.includes('completedTodayJobs.length'), 'Completed Today count dynamically calculated from real records');
assert.ok(portalCode.includes('awaitingPartsJobs.length'), 'Awaiting Parts / Review count dynamically calculated from real records');
assert.ok(portalCode.includes('bookingsQueryError'), 'Tracks database query failure');
assert.ok(portalCode.includes('Retry Query'), 'Displays clear error banner with Retry Query button on database failure');
console.log('  ✔ PASS: All 4 statistic cards and database query error banner verified');

// =========================================================================
// SUITE 5: JOB LIST, VIEW DETAILS & STATUS WORKFLOW
// =========================================================================
console.log('\nSuite 5: Job List, View Details & Status Update Workflow');
assert.ok(portalCode.includes('View Details'), 'Each job card includes View Details action');
assert.ok(portalCode.includes('selectedJobDetails'), 'View Details opens comprehensive modal');
assert.ok(portalCode.includes('handleUpdateJobStatus'), 'Defines authorized status update handler');
assert.ok(portalCode.includes('assignedTechnicianId !== currentTech.id'), 'Enforces authorization check preventing modifying other technicians jobs');
assert.ok(portalCode.includes('updatingJobId'), 'Tracks updating job id to prevent duplicate submissions');
assert.ok(portalCode.includes('.from(\'bookings\')'), 'Queries and updates Supabase bookings table');
assert.ok(portalCode.includes('Mark Completed'), 'Supports In Progress -> Completed workflow with bill amount');
assert.ok(portalCode.includes('Unable to Attend'), 'Supports Unable to Attend action releasing job to dispatch queue');
assert.ok(portalCode.includes('getJobServiceTitle'), 'Provides getJobServiceTitle helper for human-readable service titles');
assert.ok(portalCode.includes('job.status === \'New\''), 'Supports New status badge and actions');
assert.ok(portalCode.includes('Start Work (Arrived)'), 'Supports New/Assigned/Accepted -> In Progress workflow transition');
console.log('  ✔ PASS: Job details, status workflows, Supabase updates, and authorization guards verified');

// =========================================================================
// SUITE 6: SECURITY & PRESERVATION OF INVARIANTS
// =========================================================================
console.log('\nSuite 6: Security Guardrails & Existing Invariants');
assert.ok(!portalCode.includes('loginDemoTechnician()'), 'Strictly preserves exclusion of raw loginDemoTechnician() in portal file');
assert.ok(portalCode.includes('VIEW 2: PENDING APPROVAL GATE'), 'Preserves VIEW 2: PENDING APPROVAL GATE');
assert.ok(portalCode.includes('Account Pending Admin Approval'), 'Preserves Account Pending Admin Approval gate heading');
assert.ok(portalCode.includes('isRecoveryMode'), 'Preserves isRecoveryMode password reset flow');
assert.ok(portalCode.includes('handleResetPasswordSubmit'), 'Preserves handleResetPasswordSubmit');
assert.ok(portalCode.includes('authService.updateTechnicianPassword'), 'Preserves Supabase Auth updateTechnicianPassword');
console.log('  ✔ PASS: All security guardrails, regression rules, and recovery flows preserved');

console.log('\n========================================================================');
console.log('  ALL TECHNICIAN PORTAL VERIFICATION TESTS PASSED SUCCESSFULLY!          ');
console.log('========================================================================');
