import { createClient } from '@supabase/supabase-js';

const prodUrl = 'https://yyexmcaumkzxvhplipkl.supabase.co';
const prodKey = 'sb_publishable_lASIBvmSjXthkgf4D__cLw_OpMrfeyb';
const supabase = createClient(prodUrl, prodKey);

async function test() {
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'demo123@gmail.com',
    password: 'password123'
  });
  
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('*');
    
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  console.log("Data:", data);
}

test();
