const fs = require('fs');
const path = 'apps/marketing/src/components/vowos/payroll/PayrollScopeBar.tsx';
let code = fs.readFileSync(path, 'utf8');

const lines = code.split('\n');
lines[225] = "            {locations.includes('all') ? 'All Locations' : ${locations.length} Location}";
fs.writeFileSync(path, lines.join('\n'));
