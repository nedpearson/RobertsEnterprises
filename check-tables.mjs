import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient('https://yyexmcaumkzxvhplipkl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function check() {
  const { data, error } = await supabase.from('settings_values').select('id').limit(1);
  if (error) {
    console.error("Error querying settings_values:", error.message);
  } else {
    console.log("settings_values table EXISTS! Data:", data);
  }
}
check();
