const fs = require('fs');
const path = 'src/app/dashboard/work-orders/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace .meta-grid static 4-column with responsive
content = content.replace(
  /grid-template-columns:repeat\(4,1fr\)/g,
  "grid-template-columns:repeat(1,1fr); } @media (min-width: 768px) { .meta-grid { grid-template-columns:repeat(2,1fr); } } @media (min-width: 1024px) { .meta-grid { grid-template-columns:repeat(4,1fr);"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Grid updated successfully.');
