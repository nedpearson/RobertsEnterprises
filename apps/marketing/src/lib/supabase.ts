import { createClient } from '@supabase/supabase-js';

// Initialize database clients
const prodUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yyexmcaumkzxvhplipkl.supabase.co';
const prodKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lASIBvmSjXthkgf4D__cLw_OpMrfeyb';

const demoUrl = import.meta.env.VITE_DEMO_SUPABASE_URL || prodUrl;
const demoKey = import.meta.env.VITE_DEMO_SUPABASE_ANON_KEY || prodKey;

export const productionSupabase = createClient(prodUrl, prodKey);
export const demoSupabase = createClient(demoUrl, demoKey);

let activeDataPlane: 'production' | 'demo' = (localStorage.getItem('vowos_data_plane') as 'production' | 'demo') || 'production';

export function setActiveDataPlane(plane: 'production' | 'demo') {
  activeDataPlane = plane;
  localStorage.setItem('vowos_data_plane', plane);
}

export function getActiveDataPlane() {
  return activeDataPlane;
}

// Create a Proxy so existing imports of `supabase` automatically route to the correct client
const supabase = new Proxy(productionSupabase, {
  get(target, prop, receiver) {
    const activeClient = activeDataPlane === 'demo' ? demoSupabase : productionSupabase;
    const value = Reflect.get(activeClient, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  }
});

export { supabase };