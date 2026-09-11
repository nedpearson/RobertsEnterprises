import { createClient } from '@supabase/supabase-js'; import { readFileSync } from 'fs'; const cfg = JSON.parse(readFileSync('../../supabase/config.toml', 'utf-8')); console.log(cfg);
