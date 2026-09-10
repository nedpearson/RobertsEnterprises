const fs = require('fs');
const file = 'apps/marketing/src/components/vowos/settings/tabs/AIModelSettingsTab.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('btnSecondary, inputCls, labelCls', 'btnSecondary, inputCls');
content = content.replace(/className=\{labelCls\}/g, 'className="block text-xs font-semibold text-stone-700 mb-1"');
fs.writeFileSync(file, content);
