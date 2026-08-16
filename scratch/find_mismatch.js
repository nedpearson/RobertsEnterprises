const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'apps', 'marketing', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

// Simple parser to extract table names and columns from migrations
const tableColumns = {};

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_\.]+)\s*\(([^;]+)\);/gi;
  let match;
  
  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1].replace(/public\./g, '').trim();
    const columnsContent = match[2];
    
    if (!tableColumns[tableName]) {
      tableColumns[tableName] = new Set();
    }
    
    // Simple column parsing: look for lines inside parentheses
    const lines = columnsContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('PRIMARY KEY') || trimmed.startsWith('UNIQUE') || trimmed.startsWith('FOREIGN KEY')) {
        continue;
      }
      
      const colMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s+[a-zA-Z]+/i);
      if (colMatch) {
        const colName = colMatch[1].trim();
        tableColumns[tableName].add(colName);
      }
    }
  }
  
  // Also parse ALTER TABLE ADD COLUMN statements
  const alterTableRegex = /ALTER\s+TABLE\s+([a-zA-Z0-9_\.]+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/gi;
  while ((match = alterTableRegex.exec(content)) !== null) {
    const tableName = match[1].replace(/public\./g, '').trim();
    const colName = match[2].trim();
    if (!tableColumns[tableName]) {
      tableColumns[tableName] = new Set();
    }
    tableColumns[tableName].add(colName);
  }
}

// Print some parsed tables for debugging
console.log("Parsed tables count:", Object.keys(tableColumns).length);

// Now read the enforcement migration and scan for policies using business_id
const enforcementFile = '20260821000000_strict_rbac_rls_enforcement.sql';
const enforcementPath = path.join(migrationsDir, enforcementFile);
const enforcementContent = fs.readFileSync(enforcementPath, 'utf8');

const policyRegex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z0-9_\.]+)(?:\s+FOR\s+\w+)?\s+(?:USING|WITH CHECK)\s*\(([^)]+)\)/gi;
let policyMatch;
let foundMismatch = false;

// Scan lines manually to find table context easily
const lines = enforcementContent.split('\n');
let currentTable = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if we are altering or dropping policy on a table to track current table context
  const tableContextMatch = line.match(/(?:POLICY.*ON|ALTER TABLE|TABLE)\s+([a-zA-Z0-9_\.]+)/i);
  if (tableContextMatch) {
    currentTable = tableContextMatch[1].replace(/public\./g, '').trim();
  }
  
  if (line.includes('user_has_role(business_id')) {
    if (currentTable) {
      const cols = tableColumns[currentTable];
      if (cols && !cols.has('business_id')) {
        console.log(`Mismatch found on line ${i + 1} for table "${currentTable}":`);
        console.log(`Line: ${line.trim()}`);
        console.log(`Columns in schema:`, Array.from(cols));
        console.log('---');
        foundMismatch = true;
      } else if (!cols) {
        console.log(`Warning: Table "${currentTable}" not found in parsed schemas (line ${i + 1}).`);
      }
    }
  }
}

if (!foundMismatch) {
  console.log("No obvious mismatch found using simple parser.");
}
