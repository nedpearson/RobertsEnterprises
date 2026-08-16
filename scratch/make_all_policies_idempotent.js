const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'apps', 'marketing', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql') && f >= '20260810000000_');

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  let modified = false;
  
  // 1. Regex to make CREATE TABLE idempotent
  const createTableRegex = /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\s+)([a-zA-Z0-9_\.]+)/gi;
  content = content.replace(createTableRegex, (match, tableName) => {
    modified = true;
    return `CREATE TABLE IF NOT EXISTS ${tableName}`;
  });
  
  // 2. Regex to match: CREATE POLICY "policy_name" ON table_name
  const regex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z0-9_\.]+)/gi;
  
  content = content.replace(regex, (match, policyName, tableName) => {
    const dropStatement = `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};`;
    
    if (content.includes(`DROP POLICY IF EXISTS "${policyName}" ON ${tableName}`)) {
      return match;
    }
    
    modified = true;
    return `${dropStatement}\n${match}`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated tables and policies in: ${file}`);
  }
}
