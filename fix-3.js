const fs = require('fs');
const path = 'apps/marketing/src/components/vowos/payroll/PayrollScopeBar.tsx';
let code = fs.readFileSync(path, 'utf8');

const lines = code.split('\n');
lines[204] = "            {businessIds.length === businessOptions.length ? 'All Brands' : ${businessIds.length} Brand}";
// Wait, I need to check the location one too.
fs.writeFileSync(path, lines.join('\n'));
