const fs = require('fs');
const file = 'apps/marketing/src/lib/services/businessStore.ts';
let content = fs.readFileSync(file, 'utf8');
console.log(content);
