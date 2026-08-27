const { createClient } = require('@supabase/supabase-js');
const db = createClient(
  'https://yyexmcaumkzxvhplipkl.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZXhtY2F1bWt6eHZocGxpcGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg4ODgwNSwiZXhwIjoyMTAxNDY0ODA1fQ.dtdvjxpAyb2CbIs3tNbjEIqGHyX5uEKaCOLJm_TC4iw'
);
async function check() {
  const { data: reqs } = await db.from('appointment_requests').select('id, submitted_at, notes').order('submitted_at', { ascending: false }).limit(3);
  console.log("Recent requests:", reqs);
}
check();
