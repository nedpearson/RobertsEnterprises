const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yyexmcaumkzxvhplipkl.supabase.co',
  'sb_publishable_lASIBvmSjXthkgf4D__cLw_OpMrfeyb'
);

async function check() {
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name, slug');
  
  if (error) {
    console.error('Error fetching businesses:', error);
    return;
  }
  
  console.log('Businesses:');
  console.log(JSON.stringify(businesses, null, 2));
}

check();
