const fs = require('fs');
const file = 'apps/marketing/src/lib/services/businessStore.ts';
let content = fs.readFileSync(file, 'utf8');

// Filter out 'Roberts Enterprises' from getBusinesses
content = content.replace(
  'return data || [];',
  'return (data || []).filter((b: any) => b.name !== "Roberts Enterprises");'
);

fs.writeFileSync(file, content);
