/**
 * Service-role Supabase client for the growth module.
 *
 * WHY THIS EXISTS: store.ts and auth.ts used to import `productionSupabase` from
 * src/index.ts, while index.ts imports the routers back — a require cycle. It
 * happened to work in production because index.ts is the entry point and
 * resolves first, but any other entry point (a test, a script, a future worker
 * command) got a partially-initialised module and crashed with
 * "Router.use() requires a middleware function but got a undefined".
 *
 * Owning the client here makes the growth module a leaf: it depends on env, not
 * on the app that mounts it.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function growthDb(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.VITE_SUPABASE_URL || 'https://missing-config.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-service-key';
  // Created lazily so importing this module never requires configuration —
  // tests and the setup self-checks must load without a live project.
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
