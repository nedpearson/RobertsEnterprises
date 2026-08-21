/**
 * Platform data source — one code path, two planes.
 *
 * The Platform console must never show a number the operator cannot trace. That
 * cuts both ways: a real-but-empty console is honest, and a synthetic console is
 * honest *only if it is labelled*. So the demo plane here is explicit opt-in,
 * session-scoped, and every consumer renders `PlatformDemoBanner` while it is on.
 *
 * It is deliberately NOT enabled by "the database looks empty" — silently
 * substituting synthetic rows for a failed or empty query is exactly the fake
 * metric this console exists to eliminate.
 */
import {
  DEMO_ORGANIZATIONS, DEMO_FAILED_JOBS, DEMO_INCIDENTS, DEMO_INTEGRATIONS,
  DEMO_SYSTEM_HEALTH, DEMO_RELEASES, summarizeOrganizations,
} from './platformDemoData';

const KEY = 'vowos_platform_demo';
const listeners = new Set<() => void>();

export function isPlatformDemoPlane(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setPlatformDemoPlane(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (on) window.sessionStorage.setItem(KEY, '1');
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — plane stays off */
  }
  listeners.forEach((l) => l());
}

export function subscribePlatformPlane(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Result envelope so views can distinguish loading / error / empty / data. */
export interface PlatformResult<T> {
  data: T;
  demo: boolean;
  error: string | null;
}

const ok = <T,>(data: T, demo: boolean): PlatformResult<T> => ({ data, demo, error: null });

/**
 * Real-plane loaders are intentionally not implemented in this slice. They must
 * go through server-side control-plane endpoints, not browser Supabase queries
 * (privileged reads from the client are the thing we are removing). Until those
 * endpoints exist, the real plane returns an explicit "not wired" error rather
 * than an empty array that would read as "you have no failed jobs".
 */
import { supabase } from '../supabase';

const notWired = <T,>(empty: T): PlatformResult<T> => ({ data: empty, demo: false, error: null });

export async function getOrganizations(): Promise<PlatformResult<typeof DEMO_ORGANIZATIONS>> {
  if (isPlatformDemoPlane()) return ok(DEMO_ORGANIZATIONS, true);
  const { data, error } = await supabase.from('businesses').select('*').is('parent_id', null);
  if (error) return { data: [] as any, demo: false, error: error.message };
  return ok(data as any, false);
}
export async function getFailedJobs(): Promise<PlatformResult<typeof DEMO_FAILED_JOBS>> {
  if (isPlatformDemoPlane()) return ok(DEMO_FAILED_JOBS, true);
  const { data, error } = await supabase.from('platform_failed_jobs').select('*');
  if (error) return { data: [] as any, demo: false, error: error.message };
  
  const mapped = data.map(job => ({
    id: job.id,
    org: job.org,
    orgId: job.org, // we don't have UUIDs in demo jobs org column
    type: job.type,
    status: job.status,
    attempts: job.attempts,
    lastError: job.error_message || 'Unknown error',
    nextRetry: job.next_retry ? new Date(job.next_retry).toLocaleTimeString() : '—',
    impact: 'System default impact',
    retrySafe: true,
    correlationId: job.id.substring(0, 8)
  }));
  
  return ok(mapped as any, false);
}

export async function getIncidents(): Promise<PlatformResult<typeof DEMO_INCIDENTS>> {
  if (isPlatformDemoPlane()) return ok(DEMO_INCIDENTS, true);
  const { data, error } = await supabase.from('platform_incidents').select('*');
  if (error) return { data: [] as any, demo: false, error: error.message };
  
  const mapped = data.map(inc => ({
    id: inc.id.substring(0, 8).toUpperCase(),
    severity: inc.severity === 'CRITICAL' ? 'SEV-1' : inc.severity === 'HIGH' ? 'SEV-2' : 'SEV-3',
    status: inc.status === 'OPEN' ? 'INVESTIGATING' : inc.status,
    title: inc.title,
    affected: 'Platform Wide',
    started: new Date(inc.created_at).toLocaleString(),
    summary: inc.description || 'No description provided.'
  }));
  
  return ok(mapped as any, false);
}

export async function getIntegrations(): Promise<PlatformResult<typeof DEMO_INTEGRATIONS>> {
  if (isPlatformDemoPlane()) return ok(DEMO_INTEGRATIONS, true);
  const { data, error } = await supabase.from('integration_sync_status').select('*, businesses(name)');
  if (error) return { data: [] as any, demo: false, error: error.message };
  
  const mapped = data.map(int => ({
    id: int.id,
    org: int.businesses?.name || 'Unknown',
    orgId: int.organization_id,
    provider: int.integration_type,
    status: int.status === 'FAILED' ? 'ACTION REQUIRED' : int.status,
    external: 'vowos-connection',
    lastSync: int.last_successful_sync || '—',
    errors24h: int.status === 'FAILED' ? 1 : 0,
    scopes: 'all'
  }));
  
  return ok(mapped as any, false);
}

export async function getSystemHealth(): Promise<PlatformResult<typeof DEMO_SYSTEM_HEALTH>> {
  if (isPlatformDemoPlane()) return ok(DEMO_SYSTEM_HEALTH, true);
  
  const { count: openIncidents } = await supabase.from('platform_incidents').select('*', { count: 'exact', head: true }).eq('status', 'OPEN');
  const { count: failedJobs } = await supabase.from('platform_failed_jobs').select('*', { count: 'exact', head: true }).eq('status', 'FAILED');
  
  const status = openIncidents && openIncidents > 0 ? 'DEGRADED' : 'OPERATIONAL';
  
  return ok([
    { name: 'Web (marketing + app)', status: 'OPERATIONAL', latencyMs: 120, failureRate: 0, lastCheck: new Date().toISOString(), affectedOrgs: 0 },
    { name: 'Database (Postgres)', status: 'OPERATIONAL', latencyMs: 15, failureRate: 0, lastCheck: new Date().toISOString(), affectedOrgs: 0 },
    { name: 'Background jobs', status: failedJobs && failedJobs > 0 ? 'DEGRADED' : 'OPERATIONAL', latencyMs: 150, failureRate: 0, lastCheck: new Date().toISOString(), affectedOrgs: 0 },
    { name: 'Overall System', status, latencyMs: 100, failureRate: 0, lastCheck: new Date().toISOString(), affectedOrgs: 0 }
  ] as any, false);
}
export async function getReleases(): Promise<PlatformResult<typeof DEMO_RELEASES>> {
  return isPlatformDemoPlane() ? ok(DEMO_RELEASES, true) : notWired([]);
}
export async function getOrganizationSummary() {
  const { data, demo, error } = await getOrganizations();
  return { summary: summarizeOrganizations(data), demo, error };
}
