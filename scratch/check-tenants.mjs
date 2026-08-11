import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient(
  'https://yyexmcaumkzxvhplipkl.supabase.co',
  'sb_publishable_lASIBvmSjXthkgf4D__cLw_OpMrfeyb'
);

async function run() {
  const { data, error } = await db.from('vowos_tenants').select('id, name, primary_domain');
  console.log('Tenants:', data);
  if (error) console.error('Error:', error);
}
run();
