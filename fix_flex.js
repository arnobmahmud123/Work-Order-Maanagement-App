const fs = require('fs');
const path = 'src/app/dashboard/work-orders/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /className="flex items-center gap-2 self-start"/g,
  'className="flex flex-wrap items-center gap-2 self-start w-full md:w-auto mt-4 md:mt-0"'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Flex classes updated successfully.');
