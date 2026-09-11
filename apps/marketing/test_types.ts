import { supabase } from './src/lib/supabase'; supabase.from('location_permissions').select('*').then(console.log);
