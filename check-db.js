const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const content = fs.readFileSync('.env.railway', 'utf8');
const keyMatch = content.match(/SUPABASE_SERVICE_ROLE_KEY\s*.\s*(ey[a-zA-Z0-9_\-\.]+)/);
const key = keyMatch ? keyMatch[1] : null;
const supabase = createClient('https://yyexmcaumkzxvhplipkl.supabase.co', key);
supabase.from('ai_benchmarks').select('*').limit(1).then(({ data, error }) => console.log(JSON.stringify({data, error})));
