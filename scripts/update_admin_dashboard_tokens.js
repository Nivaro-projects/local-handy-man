import fs from 'fs';

const path = 'src/components/AdminDashboard.tsx';
let content = fs.readFileSync(path, 'utf-8');

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

for (const [oldVal, newVal] of replacements) {
  content = content.replaceAll(oldVal, newVal);
}

// Ensure the admin login and recovery screens have the official 60% Warm Cream background:
content = content.replaceAll('min-h-screen bg-[#FAF3E7]', 'min-h-screen bg-[#F5E6CC]');

// Ensure primary buttons have text-white
content = content.replaceAll(
  'bg-[#E27D60] hover:bg-[#D26B4E] text-[#2E2E2E]',
  'bg-[#E27D60] hover:bg-[#D26B4E] text-white shadow-sm'
);

fs.writeFileSync(path, content, 'utf-8');
console.log('AdminDashboard tokens successfully updated via node!');
