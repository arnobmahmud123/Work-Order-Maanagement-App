const fs = require('fs');
const path = 'src/app/dashboard/work-orders/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  { from: /\btext-cyan-400\b/g, to: "text-cyan-700 dark:text-cyan-400" },
  { from: /\btext-emerald-400\b/g, to: "text-emerald-700 dark:text-emerald-400" },
  { from: /\btext-amber-400\b/g, to: "text-amber-700 dark:text-amber-400" },
  { from: /\btext-violet-400\b/g, to: "text-violet-700 dark:text-violet-400" },
  { from: /\btext-rose-400\b/g, to: "text-rose-700 dark:text-rose-400" },
  { from: /\btext-sky-400\b/g, to: "text-sky-700 dark:text-sky-400" },
  { from: /\btext-cyan-300\b/g, to: "text-cyan-700 dark:text-cyan-300" },
  { from: /\btext-emerald-300\b/g, to: "text-emerald-700 dark:text-emerald-300" },
  
  // Also check if there are white text that are not on buttons
  // But regex for text-white is risky. Let's do the colors first.
];

replacements.forEach(({from, to}) => {
  content = content.replace(from, to);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Theme classes updated successfully.');
