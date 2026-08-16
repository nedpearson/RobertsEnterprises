const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../apps/marketing/supabase/migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

let out = `-- 20260821000000_strict_rbac_rls_enforcement.sql
-- Final Audit: Convert all overly permissive "FOR ALL" policies to strict RBAC

CREATE OR REPLACE FUNCTION auth.user_has_role(check_business_id uuid, allowed_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.business_memberships
    WHERE business_id = check_business_id
    AND user_id = auth.uid()
    AND role = ANY(allowed_roles)
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

`;

// 1. Find all "Enable all access for business members" policies
const tablesToFix = [];
const complexTables = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const lines = content.split('\n');
  
  lines.forEach(line => {
    const match = line.match(/CREATE POLICY "([^"]+)" ON ([a_zA-Z0-9_]+) FOR ALL USING/i);
    if (match) {
      const policyName = match[1];
      const tableName = match[2];
      
      // Some are simple business_id checks, some are complex nested
      if (line.includes('business_id IN (SELECT business_id')) {
        tablesToFix.push({ policyName, tableName });
      } else {
        complexTables.push({ policyName, tableName, line: line.trim() });
      }
    }
  });
});

out += `-- Simple Tables (business_id column exists)\n`;
tablesToFix.forEach(({policyName, tableName}) => {
  out += `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\n`;
  out += `CREATE POLICY "Members can view ${tableName}" ON ${tableName} FOR SELECT USING (auth.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));\n`;
  out += `CREATE POLICY "Managers can modify ${tableName}" ON ${tableName} FOR INSERT WITH CHECK (auth.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));\n`;
  out += `CREATE POLICY "Managers can update ${tableName}" ON ${tableName} FOR UPDATE USING (auth.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));\n`;
  out += `CREATE POLICY "Managers can delete ${tableName}" ON ${tableName} FOR DELETE USING (auth.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));\n\n`;
});

// For complex tables (where the policy uses EXISTS (SELECT ...))
// We'll just generate the DROP for now and a basic view policy if we can parse it, or manual.
out += `-- Complex Tables (joined to parent for business_id)\n`;
complexTables.forEach(({policyName, tableName, line}) => {
  out += `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\n`;
  // We need to parse the parent table to rebuild the policy correctly.
  // Instead of auto-generating complex ones, we'll leave placeholders for manual review in the generated file.
  out += `-- TODO: Write strict policies for ${tableName}\n`;
  out += `-- Original: ${line}\n\n`;
});

fs.writeFileSync(path.join(__dirname, 'rls_out.sql'), out);
console.log('Done generating rls_out.sql');
