import re

path = 'src/components/CustomerDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace old tokens with official Nivaro brand system tokens
replacements = [
    ('#5C4033', '#2E2E2E'),
    ('#A3B18A', '#E27D60'),
    ('#93A27A', '#D26B4E'),
    ('#EEF1E8', '#FAF3E7'),
    ('#E5E0D6', '#E0CEAF'),
    ('#F7F5EF', '#FAF3E7'),
    ('#342A24', '#2E2E2E'),
    ('#71675D', '#4A4A4A'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated CustomerDashboard.tsx tokens successfully!")
