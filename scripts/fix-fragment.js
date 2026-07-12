const fs = require('fs');
const file = 'src/app/dashboard/work-orders/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<React\.Fragment/g,
  '<Fragment'
);
content = content.replace(
  /<\/React\.Fragment>/g,
  '</Fragment>'
);

fs.writeFileSync(file, content);
