const fs = require('fs');
const path = 'apps/marketing/src/components/vowos/payroll/PayrollScopeBar.tsx';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(/\{businessIds\.length === businessOptions\.length \? 'All Brands' : (.*?)\}/g, "{businessIds.length === businessOptions.length ? 'All Brands' : ${businessIds.length} Brand}");
code = code.replace(/\{locations\.length === locationOptions\.length \? 'All Locations' : (.*?)\}/g, "{locations.length === locationOptions.length ? 'All Locations' : ${locations.length} Location}");
fs.writeFileSync(path, code);
