const fs = require('fs');
const path = 'apps/marketing/worker/package.json';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(',
', ',\n');
fs.writeFileSync(path, code);
