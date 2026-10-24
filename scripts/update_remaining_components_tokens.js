import fs from 'fs';

const files = [
  'src/components/CookieBanner.tsx',
  'src/components/LegalPolicyModal.tsx',
  'src/components/NotFound.tsx',
  'src/components/TrustSupport.tsx',
];

const replacements = [
  ['#5C4033', '#2E2E2E'],
  ['#A3B18A', '#E27D60'],
  ['#93A27A', '#D26B4E'],
  ['#EEF1E8', '#FAF3E7'],
  ['#E5E0D6', '#E0CEAF'],
  ['#F7F5EF', '#FAF3E7'],
  ['#FAF8F5', '#FAF3E7'],
  ['#342A24', '#2E2E2E'],
  ['#71675D', '#4A4A4A'],
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  for (const [oldVal, newVal] of replacements) {
    content = content.replaceAll(oldVal, newVal);
  }
  // Ensure buttons have white text on terracotta
  content = content.replaceAll(
    'bg-[#E27D60] text-[#2E2E2E]',
    'bg-[#E27D60] text-white shadow-sm'
  );
  content = content.replaceAll(
    'hover:bg-[#D26B4E] text-[#2E2E2E]',
    'hover:bg-[#D26B4E] text-white'
  );
  fs.writeFileSync(file, content, 'utf-8');
  console.log(`Updated ${file}`);
}
console.log('All remaining components updated successfully!');
