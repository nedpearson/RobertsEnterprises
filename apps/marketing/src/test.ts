import { supabase } from './lib/supabase'; supabase.from('locations').select('*').then(console.log);
