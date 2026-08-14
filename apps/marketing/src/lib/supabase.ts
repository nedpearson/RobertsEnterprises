import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { demoDb } from './demo/demoDatabase';

let activeClient: SupabaseClient | null = null;
let tenantConfigPromise: Promise<any> | null = null;

const PUBLIC_VOWOS_HOST = 'vowos.bridgebox.ai';
const LOCAL_DEMO_HOSTS = new Set(['localhost', '127.0.0.1', 'vowos.localhost']);
const PUBLIC_DEMO_ROOTS = ['/demo', '/demoapp'] as const;

export function isCanonicalDemoEntry(hostname: string, pathname: string): boolean {
  const normalizedHost = hostname.toLowerCase().split(':')[0];
  const isAllowedHost = normalizedHost === PUBLIC_VOWOS_HOST || LOCAL_DEMO_HOSTS.has(normalizedHost);
  const isDemoPath = PUBLIC_DEMO_ROOTS.some(
    (root) => pathname === root || pathname === `${root}/` || pathname.startsWith(`${root}/`),
  );
  return isAllowedHost && isDemoPath;
}

function currentLocationIsCanonicalDemoEntry(): boolean {
  if (typeof window === 'undefined') return false;
  return isCanonicalDemoEntry(window.location.hostname, window.location.pathname);
}

// Demo state is deliberately tab/runtime scoped, never persisted in localStorage.
// Both /demo (sales/guided entry) and /demoapp (full live sandbox) use the same
// isolated synthetic data plane. Visiting either must never contaminate /platform
// or a real tenant on a later page load.
let demoSessionAuthorized = currentLocationIsCanonicalDemoEntry();
let activeDataPlane: 'production' | 'demo' = demoSessionAuthorized ? 'demo' : 'production';

export function setActiveDataPlane(plane: 'production' | 'demo') {
  if (plane === 'demo') {
    if (!demoSessionAuthorized && !currentLocationIsCanonicalDemoEntry()) {
      throw new Error('Demo data plane can only be entered from the canonical VowOS /demo or /demoapp routes.');
    }
    demoSessionAuthorized = true;
    activeDataPlane = 'demo';
    return;
  }

  activeDataPlane = 'production';
  demoSessionAuthorized = false;
}

export function getActiveDataPlane() {
  return activeDataPlane;
}

export async function initTenantConfig() {
  if (tenantConfigPromise) return tenantConfigPromise;

  const isDemo = getActiveDataPlane() === 'demo';
  tenantConfigPromise = fetch(`/api/tenant-config${isDemo ? '?mode=demo' : ''}`, {
    headers: { 'x-forwarded-host': window.location.hostname },
  })
    .then(async (res) => {
      if (!res.ok) {
        let detail = '';
        try {
          const body = await res.json();
          detail = typeof body?.error === 'string' ? `: ${body.error}` : '';
        } catch {
          // Keep the customer-facing bootstrap error generic when the response is not JSON.
        }
        throw new Error(`Failed to load tenant configuration${detail}`);
      }
      return res.json();
    })
    .then((config) => {
      if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
        throw new Error('Tenant configuration is incomplete.');
      }

      activeClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
      (window as any).__VOWOS_TENANT_CONFIG = config;
      (window as any).__VOWOS_TENANT_CONFIG_ERROR = null;

      if (config.brand?.primary_color) {
        document.documentElement.style.setProperty('--primary', config.brand.primary_color);
      }

      return config;
    })
    .catch((error) => {
      activeClient = null;
      (window as any).__VOWOS_TENANT_CONFIG = null;
      (window as any).__VOWOS_TENANT_CONFIG_ERROR =
        error instanceof Error ? error.message : 'Tenant configuration is unavailable.';
      tenantConfigPromise = null;
      throw error;
    });

  return tenantConfigPromise;
}

export function resetTenantConfigForRetry() {
  tenantConfigPromise = null;
  activeClient = null;
}

function requireActiveClient(): SupabaseClient {
  if (!activeClient) {
    throw new Error('VowOS data plane is unavailable because tenant configuration did not load.');
  }
  return activeClient;
}

function demoFunctionsAdapter() {
  return {
    invoke: async (functionName: string, options?: any) => {
      // No public demo action is allowed to invoke a real external provider or
      // production edge-function mutation. Return realistic, explicit simulated
      // results for common demo actions instead.
      if (functionName === 'generate-note') {
        return {
          data: {
            ok: true,
            demo: true,
            simulated: true,
            text: 'Hi! We would love to help. I reviewed your appointment and preferences, and we have a few great options ready for you. Reply here anytime if you would like us to adjust your visit.',
          },
          error: null,
        };
      }

      if (functionName === 'auto-comms') {
        const digestOnly = options?.body?.task === 'digest';
        return {
          data: {
            ok: true,
            demo: true,
            simulated: true,
            reminders: digestOnly ? 0 : 2,
            chases: digestOnly ? 0 : 1,
            photos: 0,
            digest: digestOnly ? 'sent (simulated)' : 'up to date (simulated)',
          },
          error: null,
        };
      }

      return {
        data: { ok: true, demo: true, simulated: true },
        error: null,
      };
    },
  };
}

function demoStorageAdapter() {
  return {
    from: (_bucket: string) => ({
      upload: async (path: string) => ({ data: { path }, error: null }),
      update: async (path: string) => ({ data: { path }, error: null }),
      remove: async () => ({ data: [], error: null }),
      createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  };
}

function demoChannelAdapter() {
  const channel: any = {
    on: () => channel,
    subscribe: (callback?: (status: string) => void) => {
      callback?.('SUBSCRIBED');
      return channel;
    },
    unsubscribe: async () => 'ok',
  };
  return channel;
}

// Create a Proxy so existing imports of `supabase` automatically route to the
// correct client while preserving the isolated in-memory demo interceptor.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (activeDataPlane === 'demo') {
      if (prop === 'from') {
        return (table: string) => demoDb.from(table);
      }
      if (prop === 'functions') {
        return demoFunctionsAdapter();
      }
      if (prop === 'storage') {
        return demoStorageAdapter();
      }
      if (prop === 'rpc') {
        return async () => ({ data: null, error: null });
      }
      if (prop === 'channel') {
        return () => demoChannelAdapter();
      }
      if (prop === 'removeChannel') {
        return async () => 'ok';
      }
      if (prop === 'removeAllChannels') {
        return async () => [];
      }
    }

    const client = requireActiveClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
