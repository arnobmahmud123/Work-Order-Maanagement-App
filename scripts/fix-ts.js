const fs = require('fs');
const file = 'src/app/dashboard/work-orders/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace (i) with (i: any)
content = content.replace(
  /workOrder\?\.invoices\?\.find\(\(i\) =>/g,
  'workOrder?.invoices?.find((i: any) =>'
);

fs.writeFileSync(file, content);
