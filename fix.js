const fs = require('fs');
const path = 'apps/marketing/src/components/vowos/payroll/PayrollScopeBar.tsx';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(/return dateRange\.to \? .* \: format.*/, 'return `${format(dateRange.from, \'MMM d, yyyy\')} – ${format(dateRange.to, \'MMM d, yyyy\')}`;');
fs.writeFileSync(path, code);
