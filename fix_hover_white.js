const fs = require('fs');
const path = 'src/app/dashboard/work-orders/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/hover:text-white/g, "hover:text-foreground dark:hover:text-white");

fs.writeFileSync(path, content, 'utf8');
console.log('Hover white classes updated successfully.');
