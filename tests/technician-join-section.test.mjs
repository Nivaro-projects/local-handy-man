import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- RUNNING TECHNICIAN JOIN SECTION SUITE ---');

const projectRoot = process.cwd();
const technicianJoinPath = path.join(projectRoot, 'src', 'components', 'TechnicianJoinSection.tsx');
const appPath = path.join(projectRoot, 'src', 'App.tsx');
const technicianPortalPath = path.join(projectRoot, 'src', 'components', 'TechnicianPortal.tsx');

// Test 1: File existence
console.log('Test 1: Verify TechnicianJoinSection component file exists...');
assert.ok(fs.existsSync(technicianJoinPath), 'TechnicianJoinSection.tsx must exist');
console.log('✔ Test 1 Passed: TechnicianJoinSection.tsx exists');

const joinCode = fs.readFileSync(technicianJoinPath, 'utf8');

// Test 2: Required Title & Placement Copy
console.log('Test 2: Verify Exact Heading and Chirala Neighborhood Copy...');
assert.ok(
  joinCode.includes('For Electricians &amp; Plumbers in Chirala') ||
  joinCode.includes('For Electricians & Plumbers in Chirala'),
  'Must include exact heading "For Electricians & Plumbers in Chirala"'
);

const expectedCopy = 'Are you a skilled electrician or plumber in Chirala? Join our local network to receive service requests in Paparajuthota, Perala, Kothapeta, and Srinivas Colony.';
assert.ok(
  joinCode.includes(expectedCopy),
  `Must include exact copy: "${expectedCopy}"`
);
console.log('✔ Test 2 Passed: Exact title and local neighborhood copy verified');

// Test 3: Theming & Visual Rules (White surface, navy text, gold CTA)
console.log('Test 3: Verify White Theme Tokens (bg-white, text-navy, bg-gold, border-slate-200)...');
assert.ok(
  joinCode.includes('bg-white'),
  'Must utilize a white section background'
);
assert.ok(
  joinCode.includes('text-navy'),
  'Must utilize navy for primary text'
);
assert.ok(
  joinCode.includes('bg-gold'),
  'Must utilize gold for the CTA button'
);
assert.ok(
  joinCode.includes('border-slate-200'),
  'Must utilize light slate borders on white'
);
console.log('✔ Test 3 Passed: White theme tokens verified');

// Test 4: Button 1 & Button 2 CTAs and routing
console.log('Test 4: Verify Both CTAs (Technician Login & Join as Partner)...');
assert.ok(joinCode.includes('Technician Login'), 'Button 1 must read "Technician Login"');
assert.ok(
  joinCode.includes('Join as a Partner / Sign Up') || joinCode.includes('Join as a Partner'),
  'Button 2 must read "Join as a Partner / Sign Up"'
);
assert.ok(joinCode.includes('/technician'), 'Button 1 must link to /technician');
assert.ok(
  joinCode.includes('/technician?tab=register'),
  'Button 2 must link to /technician?tab=register'
);
console.log('✔ Test 4 Passed: Both CTAs with correct destinations verified');

// Test 5: Responsive layout (stacked on mobile, side-by-side on desktop)
console.log('Test 5: Verify Responsive Flex Layout (flex-col sm:flex-row)...');
assert.ok(
  joinCode.includes('flex flex-col sm:flex-row'),
  'Buttons container must use flex-col on mobile and sm:flex-row on desktop'
);
console.log('✔ Test 5 Passed: Responsive layout verified');

// Test 6: App.tsx integration before Footer
console.log('Test 6: Verify App.tsx renders TechnicianJoinSection before Footer...');
const appCode = fs.readFileSync(appPath, 'utf8');
assert.ok(appCode.includes('TechnicianJoinSection'), 'App.tsx must import and use TechnicianJoinSection');

const joinIndex = appCode.indexOf('<TechnicianJoinSection');
const footerIndex = appCode.indexOf('<Footer');
assert.ok(joinIndex !== -1, 'TechnicianJoinSection must be rendered in App.tsx');
assert.ok(footerIndex !== -1, 'Footer must be rendered in App.tsx');
assert.ok(joinIndex < footerIndex, 'TechnicianJoinSection must be placed right before Footer');
console.log('✔ Test 6 Passed: App.tsx placement before Footer verified');

// Test 7: App.tsx navigation handlers and tab synchronization
console.log('Test 7: Verify App.tsx handleOpenTechnician and tab state sync...');
assert.ok(
  appCode.includes('handleOpenTechnician'),
  'App.tsx must define handleOpenTechnician callback'
);
assert.ok(
  appCode.includes('tab === \'register\' ? \'/technician?tab=register\' : \'/technician\''),
  'handleOpenTechnician must push register or login url'
);
assert.ok(
  appCode.includes('initialTab={technicianInitialTab}'),
  'TechnicianPortal must receive initialTab prop in App.tsx'
);
console.log('✔ Test 7 Passed: App.tsx navigation and tab synchronization verified');

// Test 8: TechnicianPortal.tsx accepts initialTab and syncs with query params
console.log('Test 8: Verify TechnicianPortal initialTab support and deep-linking...');
const portalCode = fs.readFileSync(technicianPortalPath, 'utf8');
assert.ok(
  portalCode.includes('initialTab?: \'login\' | \'register\''),
  'TechnicianPortalProps must accept initialTab'
);
assert.ok(
  portalCode.includes('search.includes(\'tab=register\')'),
  'TechnicianPortal must check for tab=register query parameter'
);
console.log('✔ Test 8 Passed: TechnicianPortal deep linking and initialTab support verified');

console.log('\n--- ALL TECHNICIAN JOIN SECTION TESTS PASSED! ---');
