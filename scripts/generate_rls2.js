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

// Map of child tables to parent tables & relations
const childRelations = {
  'employee_schedule_breaks': 'employee_schedules.id = employee_schedule_breaks.schedule_id',
  'appointment_request_location_preferences': 'appointment_requests.id = appointment_request_location_preferences.request_id',
  'appointment_assignment_recommendations': 'appointment_requests.id = appointment_assignment_recommendations.request_id',
  'file_versions': 'files.id = file_versions.file_id',
  'file_links': 'files.id = file_links.file_id',
  'file_permissions': 'files.id = file_permissions.file_id',
  'communication_attachments': 'communications.id = communication_attachments.communication_id',
  'communication_delivery_events': 'communications.id = communication_delivery_events.communication_id',
  'communication_recipients': 'communications.id = communication_recipients.communication_id',
  'task_assignments': 'tasks.id = task_assignments.task_id',
  'task_events': 'tasks.id = task_events.task_id',
  'reminder_events': 'reminders.id = reminder_events.reminder_id',
  'settings_versions': 'settings_values.id = settings_versions.setting_value_id',
  'location_permissions': 'business_memberships.id = location_permissions.membership_id'
};

const processed = new Set();

files.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const lines = content.split('\n');
  
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    const match = line.match(/CREATE POLICY "([^"]+)" ON ([a_zA-Z0-9_]+) FOR ALL USING/i);
    if (match) {
      const policyName = match[1];
      const tableName = match[2];
      
      if (processed.has(tableName)) continue;
      processed.add(tableName);
      
      if (line.includes('business_id IN (SELECT business_id')) {
        // Simple
        out += `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\n`;
        out += `CREATE POLICY "Members can view ${tableName}" ON ${tableName} FOR SELECT USING (auth.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));\n`;
        out += `CREATE POLICY "Managers can modify ${tableName}" ON ${tableName} FOR INSERT WITH CHECK (auth.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));\n`;
        out += `CREATE POLICY "Managers can update ${tableName}" ON ${tableName} FOR UPDATE USING (auth.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));\n`;
        out += `CREATE POLICY "Managers can delete ${tableName}" ON ${tableName} FOR DELETE USING (auth.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));\n\n`;
      } else if (childRelations[tableName]) {
        // Complex via parent
        const parentTable = childRelations[tableName].split('.')[0];
        
        out += `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\n`;
        out += `CREATE POLICY "Members can view ${tableName}" ON ${tableName} FOR SELECT USING (\n  EXISTS (\n    SELECT 1 FROM ${parentTable}\n    WHERE ${childRelations[tableName]}\n    AND auth.user_has_role(${parentTable === 'business_memberships' ? 'business_memberships.business_id' : parentTable + '.business_id'}, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])\n  )\n);\n`;
        
        out += `CREATE POLICY "Managers can modify ${tableName}" ON ${tableName} FOR INSERT WITH CHECK (\n  EXISTS (\n    SELECT 1 FROM ${parentTable}\n    WHERE ${childRelations[tableName]}\n    AND auth.user_has_role(${parentTable === 'business_memberships' ? 'business_memberships.business_id' : parentTable + '.business_id'}, ARRAY['OWNER', 'ADMIN', 'MANAGER'])\n  )\n);\n`;
        
        out += `CREATE POLICY "Managers can update ${tableName}" ON ${tableName} FOR UPDATE USING (\n  EXISTS (\n    SELECT 1 FROM ${parentTable}\n    WHERE ${childRelations[tableName]}\n    AND auth.user_has_role(${parentTable === 'business_memberships' ? 'business_memberships.business_id' : parentTable + '.business_id'}, ARRAY['OWNER', 'ADMIN', 'MANAGER'])\n  )\n);\n`;
        
        out += `CREATE POLICY "Managers can delete ${tableName}" ON ${tableName} FOR DELETE USING (\n  EXISTS (\n    SELECT 1 FROM ${parentTable}\n    WHERE ${childRelations[tableName]}\n    AND auth.user_has_role(${parentTable === 'business_memberships' ? 'business_memberships.business_id' : parentTable + '.business_id'}, ARRAY['OWNER', 'ADMIN', 'MANAGER'])\n  )\n);\n\n`;
      } else if (tableName === 'employee_calendar_connections' || tableName === 'calendar_sync_events') {
        // User-specific
        out += `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\n`;
        out += `CREATE POLICY "Users can access own ${tableName}" ON ${tableName} FOR ALL USING (employee_id = auth.uid());\n\n`;
      }
    }
  }
});

fs.writeFileSync(path.join(migrationsDir, '20260821000000_strict_rbac_rls_enforcement.sql'), out);
console.log('Done generating migration');
