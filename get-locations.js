const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const content = fs.readFileSync('apps/marketing/.env', 'utf8');
const url = content.match(/VITE_SUPABASE_URL=["']?(.*?)["']?(\r?\n|$)/)[1];
const key = content.match(/VITE_SUPABASE_ANON_KEY=["']?(.*?)["']?(\r?\n|$)/)[1];
const supabase = createClient(url, key);
supabase.from('locations').select('*').then(({ data }) => console.log(JSON.stringify(data, null, 2)));
