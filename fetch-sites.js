const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const db = createClient(
  'https://yyexmcaumkzxvhplipkl.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZXhtY2F1bWt6eHZocGxpcGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTIyMDc3MiwiZXhwIjoxODgzOTk2NzcyfQ.8o3s8s2F9Q7XvB2T_zB5W1K_8aR8Hj8c3p2M1q0X2xY'
);

async function run() {
  const { data: sites } = await db.from('business_sites').select('domain, business_id, name');
  console.log(sites);
}
run();
