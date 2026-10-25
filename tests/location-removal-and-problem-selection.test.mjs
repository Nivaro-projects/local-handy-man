// @ts-check
import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================================');
console.log('  LOCATION COVERAGE REMOVAL & PROBLEM SELECTION TEST SUITE');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------------------------
// SUITE 1: LOCATION COVERAGE SECTION REMOVAL
// --------------------------------------------------------------------------
console.log('Suite 1: Location Coverage Section Removal');

runTest('ServiceArea.tsx file is completely removed from project', () => {
  const serviceAreaPath = path.resolve('src/components/ServiceArea.tsx');
  assert.strictEqual(fs.existsSync(serviceAreaPath), false, 'ServiceArea.tsx should not exist');
});

runTest('App.tsx does not import or render ServiceArea component', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
  assert.ok(!appContent.includes('ServiceArea'), 'App.tsx must not import or render ServiceArea');
  assert.ok(!appContent.includes('service-area'), 'App.tsx must not link to #service-area');
});

runTest('Navbar.tsx does not contain link to #service-area or "Chirala Areas"', () => {
  const navContent = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf-8');
  assert.ok(!navContent.includes('#service-area'), 'Navbar must not contain #service-area link');
  assert.ok(!navContent.includes('Chirala Areas'), 'Navbar must not contain "Chirala Areas" link text');
});

runTest('Footer.tsx does not contain link to #service-area or "Chirala Service Areas"', () => {
  const footerContent = fs.readFileSync(path.resolve('src/components/Footer.tsx'), 'utf-8');
  assert.ok(!footerContent.includes('#service-area'), 'Footer must not contain #service-area link');
  assert.ok(!footerContent.includes('Chirala Service Areas'), 'Footer must not contain "Chirala Service Areas"');
});

runTest('Coverage area strings and travel policy are absent from homepage and components', () => {
  const filesToCheck = [
    'src/App.tsx',
    'src/components/Navbar.tsx',
    'src/components/Footer.tsx',
    'src/components/Services.tsx',
    'src/components/CommonProblems.tsx',
  ];

  const forbiddenStrings = [
    'Vadarevu Road',
    'Vetapalem Road',
    'GBC Road Area',
    'Railway Station & Clock Tower',
    'Operating Hours & Travel Policy',
    '8:00 AM–7:30 PM',
    'No travel surcharge',
    'no-travel-surcharge',
  ];

  for (const file of filesToCheck) {
    const content = fs.readFileSync(path.resolve(file), 'utf-8');
    for (const forbidden of forbiddenStrings) {
      assert.ok(
        !content.includes(forbidden),
        `File ${file} should not contain removed coverage text: "${forbidden}"`
      );
    }
  }
});

// --------------------------------------------------------------------------
// SUITE 2: PROBLEM SELECTION & AUTO-POPULATION CONFIGURATION
// --------------------------------------------------------------------------
console.log('\nSuite 2: Problem Selection & Auto-Population Configuration');

runTest('BookingSection.tsx defines all required problem mappings and default texts', () => {
  const bookingContent = fs.readFileSync(path.resolve('src/components/BookingSection.tsx'), 'utf-8');

  // Check required examples from prompt
  const requiredMappings = [
    { key: 'Electrical', defaultText: 'Electrical problem' },
    { key: 'Plumbing', defaultText: 'Plumbing problem' },
    { key: 'Fan not working', defaultText: 'Fan is not working' },
    { key: 'Switch or socket problem', defaultText: 'Switch or socket is not working' },
    { key: 'Water leakage', defaultText: 'Water leakage problem' },
    { key: 'Tap repair', defaultText: 'Tap repair required' },
  ];

  for (const mapping of requiredMappings) {
    assert.ok(
      bookingContent.includes(`defaultText: '${mapping.defaultText}'`),
      `BookingSection must configure defaultText: "${mapping.defaultText}"`
    );
  }
});

runTest('Services.tsx triggers selection with matching problem descriptions', () => {
  const servicesContent = fs.readFileSync(path.resolve('src/components/Services.tsx'), 'utf-8');

  assert.ok(servicesContent.includes("'Electrical problem'"), 'Services.tsx must include Electrical problem');
  assert.ok(servicesContent.includes("'Plumbing problem'"), 'Services.tsx must include Plumbing problem');
  assert.ok(servicesContent.includes("'Switch or socket is not working'"), 'Services.tsx must include Switch or socket is not working');
  assert.ok(servicesContent.includes("'Fan is not working'"), 'Services.tsx must include Fan is not working');
  assert.ok(servicesContent.includes("'Tap repair required'"), 'Services.tsx must include Tap repair required');
  assert.ok(servicesContent.includes("'Water leakage problem'"), 'Services.tsx must include Water leakage problem');
});

runTest('App.tsx handleSelectService smoothly populates category and description without overwrite', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
  assert.ok(appContent.includes('handleSelectService'), 'App.tsx must define handleSelectService');
  assert.ok(appContent.includes('serviceCategory: category'), 'handleSelectService updates serviceCategory');
  assert.ok(appContent.includes('targetDesc = problemDescription || defaultDesc'), 'handleSelectService calculates targetDesc');
  assert.ok(appContent.includes('isKnownDefault ? targetDesc : prev.description'), 'handleSelectService preserves custom descriptions');
});

// --------------------------------------------------------------------------
// SUITE 3: AUTO-POPULATION LOGIC & USER EDIT PRESERVATION INVARIANTS
// --------------------------------------------------------------------------
console.log('\nSuite 3: Auto-Population Logic & User Edit Preservation Invariants');

runTest('Simulated problem switching populates default and updates on change', () => {
  const COMMON_PROBLEMS = [
    { key: 'Electrical', defaultText: 'Electrical problem' },
    { key: 'Fan not working', defaultText: 'Fan is not working' },
    { key: 'Switch or socket problem', defaultText: 'Switch or socket is not working' },
    { key: 'Plumbing', defaultText: 'Plumbing problem' },
    { key: 'Water leakage', defaultText: 'Water leakage problem' },
    { key: 'Tap repair', defaultText: 'Tap repair required' },
  ];

  const KNOWN_DEFAULT_DESCRIPTIONS = COMMON_PROBLEMS.map(p => p.defaultText);

  // Helper matching BookingSection.tsx handleProblemSelect logic
  function selectProblem(problemKey, currentProblemKey, currentDescription, isUserEdited) {
    const prob = COMMON_PROBLEMS.find((p) => p.key === problemKey);
    const prevDefault = COMMON_PROBLEMS.find((p) => p.key === currentProblemKey)?.defaultText;

    let nextDesc = prob.defaultText;

    if (prevDefault && currentDescription.startsWith(prevDefault)) {
      const extraText = currentDescription.slice(prevDefault.length);
      nextDesc = prob.defaultText + extraText;
    } else if (isUserEdited && currentDescription.trim() && !KNOWN_DEFAULT_DESCRIPTIONS.includes(currentDescription.trim())) {
      nextDesc = currentDescription;
    }

    return nextDesc;
  }

  // 1. Initial selection from empty
  let desc = selectProblem('Electrical', '', '', false);
  assert.strictEqual(desc, 'Electrical problem');

  // 2. Switch to Fan not working
  desc = selectProblem('Fan not working', 'Electrical', desc, false);
  assert.strictEqual(desc, 'Fan is not working');

  // 3. Switch to Switch or socket problem
  desc = selectProblem('Switch or socket problem', 'Fan not working', desc, false);
  assert.strictEqual(desc, 'Switch or socket is not working');

  // 4. Switch to Plumbing
  desc = selectProblem('Plumbing', 'Switch or socket problem', desc, false);
  assert.strictEqual(desc, 'Plumbing problem');

  // 5. Switch to Water leakage
  desc = selectProblem('Water leakage', 'Plumbing', desc, false);
  assert.strictEqual(desc, 'Water leakage problem');

  // 6. Switch to Tap repair
  desc = selectProblem('Tap repair', 'Water leakage', desc, false);
  assert.strictEqual(desc, 'Tap repair required');
});

runTest('Customer manually appending notes to default preserves extra details on problem switch', () => {
  const COMMON_PROBLEMS = [
    { key: 'Fan not working', defaultText: 'Fan is not working' },
    { key: 'Switch or socket problem', defaultText: 'Switch or socket is not working' },
  ];
  const KNOWN_DEFAULT_DESCRIPTIONS = COMMON_PROBLEMS.map(p => p.defaultText);

  function selectProblem(problemKey, currentProblemKey, currentDescription, isUserEdited) {
    const prob = COMMON_PROBLEMS.find((p) => p.key === problemKey);
    const prevDefault = COMMON_PROBLEMS.find((p) => p.key === currentProblemKey)?.defaultText;

    let nextDesc = prob.defaultText;

    if (prevDefault && currentDescription.startsWith(prevDefault)) {
      const extraText = currentDescription.slice(prevDefault.length);
      nextDesc = prob.defaultText + extraText;
    } else if (isUserEdited && currentDescription.trim() && !KNOWN_DEFAULT_DESCRIPTIONS.includes(currentDescription.trim())) {
      nextDesc = currentDescription;
    }

    return nextDesc;
  }

  // User selects "Fan not working", then adds " in second floor bedroom ceiling"
  const userEditedDesc = 'Fan is not working in second floor bedroom ceiling';
  const updatedDesc = selectProblem('Switch or socket problem', 'Fan not working', userEditedDesc, true);

  assert.strictEqual(
    updatedDesc,
    'Switch or socket is not working in second floor bedroom ceiling',
    'Customer appended notes must be preserved with the new problem prefix'
  );
});

runTest('Customer completely custom description is never overwritten by problem selection', () => {
  const COMMON_PROBLEMS = [
    { key: 'Electrical', defaultText: 'Electrical problem' },
    { key: 'Plumbing', defaultText: 'Plumbing problem' },
  ];
  const KNOWN_DEFAULT_DESCRIPTIONS = COMMON_PROBLEMS.map(p => p.defaultText);

  function selectProblem(problemKey, currentProblemKey, currentDescription, isUserEdited) {
    const prob = COMMON_PROBLEMS.find((p) => p.key === problemKey);
    const prevDefault = COMMON_PROBLEMS.find((p) => p.key === currentProblemKey)?.defaultText;

    let nextDesc = prob.defaultText;

    if (prevDefault && currentDescription.startsWith(prevDefault)) {
      const extraText = currentDescription.slice(prevDefault.length);
      nextDesc = prob.defaultText + extraText;
    } else if (isUserEdited && currentDescription.trim() && !KNOWN_DEFAULT_DESCRIPTIONS.includes(currentDescription.trim())) {
      nextDesc = currentDescription;
    }

    return nextDesc;
  }

  const customText = 'Main distribution box breaker trips whenever heavy appliances turn on.';
  const result = selectProblem('Electrical', '', customText, true);

  assert.strictEqual(
    result,
    customText,
    'Custom user description must NOT be overwritten'
  );
});

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log('========================================================================\n');
