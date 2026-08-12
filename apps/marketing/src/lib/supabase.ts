import { createClient, SupabaseClient } from '@supabase/supabase-js';

let activeClient: SupabaseClient | null = null;
let tenantConfigPromise: Promise<any> | null = null;

export async function initTenantConfig() {
  if (tenantConfigPromise) return tenantConfigPromise;
  
  // Fetch config from our Control Plane Proxy
  const isDemoUrl = window.location.pathname.startsWith('/demo') || window.location.hostname.startsWith('demo.');
  tenantConfigPromise = fetch(`/api/tenant-config${isDemoUrl ? '?mode=demo' : ''}`, {
     headers: { 'x-forwarded-host': window.location.hostname }
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to load tenant configuration');
      return res.json();
    })
    .then(config => {
      activeClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
      (window as any).__VOWOS_TENANT_CONFIG = config;
      
      // Apply brand dynamically
      if (config.brand) {
        if (config.brand.primary_color) {
           document.documentElement.style.setProperty('--primary', config.brand.primary_color);
        }
      }
      
      return config;
    })
    .catch(err => {
      console.warn("Notice: Operating with default VowOS Tenant Data Plane configuration:", err);
      const fallbackUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://vowos.supabase.co';
      const fallbackKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'dummy-key';
      
      try {
        activeClient = createClient(fallbackUrl, fallbackKey);
      } catch {
        // Fallback stub if URL is invalid
        activeClient = {} as any;
      }
      
      const fallbackConfig = {
        tenantId: 'demo-tenant',
        tenantName: 'VowOS Boutique',
        supabaseUrl: fallbackUrl,
        supabaseAnonKey: fallbackKey,
        brand: { primary_color: '#D55162' }
      };
      (window as any).__VOWOS_TENANT_CONFIG = fallbackConfig;
      return fallbackConfig;
    });
    
  return tenantConfigPromise;
}

// Demo data plane override
let activeDataPlane: 'production' | 'demo' = (localStorage.getItem('vowos_data_plane') as 'production' | 'demo') || 'production';

export function setActiveDataPlane(plane: 'production' | 'demo') {
  activeDataPlane = plane;
  localStorage.setItem('vowos_data_plane', plane);
}

export function getActiveDataPlane() {
  return activeDataPlane;
}

// Create a Proxy so existing imports of `supabase` automatically route to the correct client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    if (!activeClient) {
      console.warn("Supabase client accessed before initTenantConfig resolved. This may cause a crash.");
      return () => {}; // return dummy function to prevent instant crash on module level destructuring
    }
    const value = Reflect.get(activeClient, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  }
});