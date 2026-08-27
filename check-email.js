const { createClient } = require('@supabase/supabase-js');
const db = createClient(
  'https://yyexmcaumkzxvhplipkl.supabase.co', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || (require('fs').readFileSync('.env.railway', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY.*?│\s*([^\s║]+)/)?.[1] || '')
);
async function get() {
  console.log(await db.from('appointment_intake_notification_outbox').select('*').limit(1));
}
get();
