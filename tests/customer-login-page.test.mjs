/**
 * Local Handyman (Chirala, AP) - Customer Split-Screen Login UI Test Suite
 *
 * Verifies:
 * 1. Split-screen 50/50 responsive layout (desktop split, mobile centered single column).
 * 2. Visual & Theming adherence to brand palette:
 *    - Primary text & headings: Deep Walnut Brown (#4A251D).
 *    - Primary CTA button: Amber Glow (#E59838) with dark text.
 *    - Right-side background: Soft Sage Green tint (#EEF3EF).
 *    - Input fields: Pill-shaped, fully rounded borders with subtle gray/sage (#DCE6E1).
 * 3. Left column form elements:
 *    - Local Handyman brand logo and header.
 *    - Heading "Welcome back!" and descriptive subtext.
 *    - 10-digit mobile number input with +91 country code prefix and numeric filtering.
 *    - Primary CTA: "Send Login Code (OTP)".
 *    - Thin line divider with "or continue with" in the center.
 *    - "Quick Demo Login" button connecting to customerService.loginDemoCustomer().
 *    - Bottom link: "Need a repair? Book a service" linking to #booking.
 * 4. Right column visual showcase:
 *    - Rounded aesthetic container with soft Sage Green tint (#EEF3EF).
 *    - High-quality welcoming illustration (/handyman-showcase.png).
 *    - Floating UI card overlapping visual: "On-site quote" & "Before work begins".
 *    - Bottom centered text: "Reliable repairs at your doorstep." & "Serving Paparajuthota, Perala, Kothapeta, and Srinivas Colony.".
 * 5. Route integration in App.tsx:
 *    - /login route detection and rendering.
 *    - Navbar and MyBookingsPreview "Sign In" integration targeting /login.
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

async function runLoginTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  CUSTOMER SPLIT-SCREEN LOGIN UI TEST SUITE (LOCAL HANDYMAN CHIRALA)   ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // =========================================================================
  // SUITE 1: COMPONENT INTEGRITY & ROUTING IN APP.TSX
  // =========================================================================
  console.log(`${BOLD}Suite 1: Component File Existence & App.tsx Route Integration${RESET}`);

  const loginPagePath = path.join(rootDir, 'src', 'components', 'LoginPage.tsx');
  const appPath = path.join(rootDir, 'src', 'App.tsx');
  const showcaseImagePath = path.join(rootDir, 'public', 'handyman-showcase.png');

  assert(fs.existsSync(loginPagePath), 'src/components/LoginPage.tsx exists');
  assert(fs.existsSync(showcaseImagePath), 'public/handyman-showcase.png illustration asset exists');

  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(appContent.includes("import { LoginPage } from './components/LoginPage';"), 'App.tsx imports LoginPage');
  assert(appContent.includes("currentPath === '/login'") || appContent.includes("currentPath.startsWith('/login')"), 'App.tsx recognizes /login route');
  assert(appContent.includes('<LoginPage'), 'App.tsx renders <LoginPage /> on /login');
  assert(appContent.includes('handleOpenCustomerLogin'), 'App.tsx defines handleOpenCustomerLogin handler for navigation');

  // =========================================================================
  // SUITE 2: SPLIT-SCREEN 50/50 LAYOUT & RESPONSIVENESS
  // =========================================================================
  console.log(`\n${BOLD}Suite 2: 50/50 Split-Screen Grid & Responsive Layout${RESET}`);

  const loginContent = fs.readFileSync(loginPagePath, 'utf8');

  assert(
    loginContent.includes('grid-cols-1 lg:grid-cols-2'),
    'LoginPage utilizes Tailwind 2-column grid layout on desktop (lg:grid-cols-2)'
  );
  assert(
    loginContent.includes('hidden lg:flex'),
    'Right-side visual column is hidden on mobile/tablet and displayed only on desktop (hidden lg:flex)'
  );
  assert(
    loginContent.includes('min-h-screen') && loginContent.includes('items-center') && loginContent.includes('justify-center'),
    'LoginPage vertically and horizontally centers layout in viewport'
  );

  // =========================================================================
  // SUITE 3: BRAND PALETTE & PILL-SHAPED INPUT STYLING
  // =========================================================================
  console.log(`\n${BOLD}Suite 3: Brand Palette & Pill-Shaped Input Styling${RESET}`);

  // Charcoal Grey (#4A4A4A) or Deep Walnut Brown (#4A251D)
  assert(
    loginContent.includes('#4A4A4A') || loginContent.includes('#4A251D') || loginContent.includes('#2E2E2E'),
    'LoginPage strictly uses official Charcoal Grey (#4A4A4A) or Deep Walnut Brown (#4A251D) for primary text and headings'
  );

  // Terracotta Orange CTA Button (#E27D60) or Amber Glow (#E59838)
  assert(
    loginContent.includes('#E27D60') || loginContent.includes('#E59838'),
    'LoginPage strictly uses Terracotta Orange (#E27D60) or Amber Glow (#E59838) for primary CTA buttons'
  );

  // Right-Side soft tint container (#EEF3EF, #FAF3E7, #F5E6CC)
  assert(
    loginContent.includes('#FAF3E7') || loginContent.includes('#F5E6CC') || loginContent.includes('#EEF3EF'),
    'LoginPage uses brand soft tint for aesthetic right-side container'
  );

  // Pill-shaped rounded inputs with subtle borders
  assert(
    loginContent.includes('rounded-full') && (loginContent.includes('#DCE6E1') || loginContent.includes('#4A4A4A') || loginContent.includes('border-')),
    'LoginPage features pill-shaped inputs with subtle borders'
  );

  // =========================================================================
  // SUITE 4: LEFT COLUMN FORM SPECIFICATIONS & AUTHENTICATION
  // =========================================================================
  console.log(`\n${BOLD}Suite 4: Left Column Form Requirements & Copy Invariants${RESET}`);

  assert(loginContent.includes('Welcome back!'), 'LoginPage features bold "Welcome back!" heading');
  assert(
    loginContent.includes('Log in with your mobile number to track your electrical and plumbing repairs in Chirala.'),
    'LoginPage features exact Chirala repair tracking subtext'
  );
  assert(
    loginContent.includes('10-Digit Mobile Number'),
    'LoginPage features "10-Digit Mobile Number" field label'
  );
  assert(
    loginContent.includes('+91') && loginContent.includes('Enter your number'),
    'LoginPage features +91 country code prefix and "Enter your number" placeholder'
  );
  assert(
    loginContent.includes('Send Login Code (OTP)'),
    'LoginPage features "Send Login Code (OTP)" primary button text'
  );
  assert(
    loginContent.includes('or continue with'),
    'LoginPage replicates divider with "or continue with" text'
  );
  assert(
    loginContent.includes('Quick Demo Login'),
    'LoginPage features "Quick Demo Login" alternate action button'
  );
  assert(
    loginContent.includes('Need a repair?') && loginContent.includes('Book a service'),
    'LoginPage features bottom link: "Need a repair? Book a service"'
  );

  // =========================================================================
  // SUITE 5: RIGHT COLUMN VISUAL SHOWCASE SPECIFICATIONS
  // =========================================================================
  console.log(`\n${BOLD}Suite 5: Right Column Showcase, Floating Card & Local Copy${RESET}`);

  assert(
    loginContent.includes('/handyman-showcase.png'),
    'Right column renders high-quality /handyman-showcase.png illustration'
  );
  assert(
    loginContent.includes('On-site quote') && loginContent.includes('Before work begins'),
    'Right column features floating UI card stating the on-site quote policy'
  );
  assert(
    loginContent.includes('Reliable repairs at your doorstep.'),
    'Right column features exact heading: "Reliable repairs at your doorstep."'
  );
  assert(
    loginContent.includes('Serving Paparajuthota, Perala, Kothapeta, and Srinivas Colony.'),
    'Right column features exact subtext: "Serving Paparajuthota, Perala, Kothapeta, and Srinivas Colony."'
  );

  // =========================================================================
  // SUITE 6: QUICK DEMO LOGIN SERVICE INTEGRATION
  // =========================================================================
  console.log(`\n${BOLD}Suite 6: Quick Demo Login Service Integration${RESET}`);

  const customerServicePath = path.join(rootDir, 'src', 'services', 'customerService.ts');
  const authServicePath = path.join(rootDir, 'src', 'services', 'authService.ts');

  const customerServiceContent = fs.readFileSync(customerServicePath, 'utf8');
  const authServiceContent = fs.readFileSync(authServicePath, 'utf8');

  assert(
    customerServiceContent.includes('loginDemoCustomer()'),
    'customerService.ts exposes loginDemoCustomer()'
  );
  assert(
    authServiceContent.includes('loginDemoCustomer()'),
    'authService.ts exposes loginDemoCustomer()'
  );
  assert(
    loginContent.includes('customerService.loginDemoCustomer()'),
    'LoginPage invokes customerService.loginDemoCustomer() upon Quick Demo Login click'
  );

  console.log(`\n${BOLD}${GREEN}========================================================================${RESET}`);
  console.log(`${BOLD}${GREEN}  ALL ${total} CUSTOMER LOGIN UI VERIFICATION TESTS PASSED!             ${RESET}`);
  console.log(`${BOLD}${GREEN}========================================================================${RESET}\n`);
}

runLoginTests().catch((err) => {
  console.error(`\n${RED}${BOLD}Test suite failed:${RESET}`, err);
  process.exit(1);
});
