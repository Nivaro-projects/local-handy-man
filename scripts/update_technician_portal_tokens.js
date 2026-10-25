import fs from 'fs';

const path = 'src/components/TechnicianPortal.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Insert palette comment at the top if not present
if (!content.includes('Nivaro Brand System: Warm Cream #F5E6CC')) {
  content = content.replace(
    "export const TechnicianPortal",
    "/* Nivaro Brand System: Warm Cream #F5E6CC, Charcoal Grey #4A4A4A, Terracotta Orange #E27D60, Forest Green #2D4F1E (Legacy: #4A251D #E59838 #5F7D6B #FDF6E4 #EEF3EF #DCE6E1) */\nexport const TechnicianPortal"
  );
}

// Background replacements
content = content.replaceAll("bg-[#EEF3EF]", "bg-[#F5E6CC]");
content = content.replaceAll("bg-[#FDF6E4]", "bg-[#FAF3E7]");
content = content.replaceAll("border-[#DCE6E1]", "border-[#4A4A4A]/20");
content = content.replaceAll("text-[#4A251D]", "text-[#2E2E2E]");
content = content.replaceAll("text-[#71675D]", "text-[#4A4A4A]");
content = content.replaceAll("hover:text-[#4A251D]", "hover:text-[#2E2E2E]");

// Button replacements: Change old chocolate #4A251D and old amber #E59838 to official Nivaro tokens
content = content.replaceAll("bg-[#4A251D] hover:bg-[#381a14]", "bg-[#4A4A4A] hover:bg-[#3D3D3D]");
content = content.replaceAll("bg-[#4A251D]", "bg-[#4A4A4A]");
content = content.replaceAll("bg-[#E59838] hover:bg-[#d68a2d]", "bg-[#E27D60] hover:bg-[#D26B4E] text-white");
content = content.replaceAll("bg-[#E59838]", "bg-[#E27D60]");
content = content.replaceAll("text-[#E59838]", "text-[#E27D60]");
content = content.replaceAll("focus:border-[#E59838]", "focus:border-[#E27D60]");
content = content.replaceAll("ring-[#E59838]", "ring-[#E27D60]");

// Forest green for success / On duty / badges
content = content.replaceAll("bg-[#5F7D6B] hover:bg-[#4e6858]", "bg-[#2D4F1E] hover:bg-[#244018]");
content = content.replaceAll("bg-[#5F7D6B]", "bg-[#2D4F1E]");
content = content.replaceAll("text-[#5F7D6B]", "text-[#2D4F1E]");
content = content.replaceAll("border-[#5F7D6B]", "border-[#2D4F1E]");

fs.writeFileSync(path, content, 'utf-8');
console.log('TechnicianPortal tokens successfully updated!');
