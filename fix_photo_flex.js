const fs = require('fs');
const path = 'src/app/dashboard/work-orders/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /className="flex items-center justify-between mb-4"/g,
  'className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4"'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Photo flex classes updated successfully.');
