const fs = require('fs');
const path = 'apps/marketing/src/lib/services/workforceStore.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(/console\.error\(Error fetching from :, error\);/g, "console.error(`Error fetching from ${table}:`, error);");
code = code.replace(/console\.error\(Error saving to :, error\);/g, "console.error(`Error saving to ${table}:`, error);");
fs.writeFileSync(path, code);
