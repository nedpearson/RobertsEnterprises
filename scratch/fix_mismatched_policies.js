const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'apps', 'marketing', 'supabase', 'migrations', '20260821000000_strict_rbac_rls_enforcement.sql');
let content = fs.readFileSync(filePath, 'utf8');

// We want to replace lines for specific tables where business_id is used.
// Since a CREATE POLICY block is on a single line (or close to it) and has the table name,
// we can split by line, check if a line is a CREATE POLICY for one of the mismatched tables,
// and do the string replacement.

const lines = content.split('\n');
let currentTable = null;

const mapping = {
  'file_versions': { fk: 'file_id', parent: 'files' },
  'file_permissions': { fk: 'file_id', parent: 'files' },
  'file_links': { fk: 'file_id', parent: 'files' },
  'communication_attachments': { fk: 'communication_id', parent: 'communications' },
  'communication_delivery_events': { fk: 'communication_id', parent: 'communications' },
  'task_assignments': { fk: 'task_id', parent: 'tasks' },
  'task_events': { fk: 'task_id', parent: 'tasks' },
  'reminder_events': { fk: 'reminder_id', parent: 'reminders' },
  'communication_recipients': { fk: 'communication_id', parent: 'communications' }
};

let updatedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track current table context
  const tableContextMatch = line.match(/(?:POLICY.*ON|ALTER TABLE|TABLE)\s+([a-zA-Z0-9_\.]+)/i);
  if (tableContextMatch) {
    currentTable = tableContextMatch[1].replace(/public\./g, '').trim();
  }
  
  if (currentTable && mapping[currentTable]) {
    const config = mapping[currentTable];
    if (line.includes('public.user_has_role(business_id,')) {
      const replacement = `public.user_has_role((SELECT business_id FROM public.${config.parent} WHERE id = ${config.fk}),`;
      lines[i] = line.replace('public.user_has_role(business_id,', replacement);
      updatedCount++;
    }
  }
}

if (updatedCount > 0) {
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`Successfully fixed ${updatedCount} mismatched policies in strict_rbac_rls_enforcement.sql!`);
} else {
  console.log("No policies needed updating.");
}
