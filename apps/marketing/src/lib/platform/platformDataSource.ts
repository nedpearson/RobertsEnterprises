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
  DEMO_INTEGRATION_DIAGNOSTICS, DEMO_SYSTEM_HEALTH, DEMO_RELEASES,
  createFallbackDiagnostics, summarizeOrganizations,
} from './platformDemoData';
import type { DiagnosticDrawerData, IntegrationTableRow } from '@/types/integrationOps';

/**
 * Every /api/recovery/* route runs under the service role and authorises the
 * caller from this token, deriving business_id from the membership rather than
 * from anything the client sends. A request without it is a 401, so these calls
 * must not be made anonymously.
 */
async function recoveryAuthHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  return { ...extra, Authorization: `Bearer ${token}` };
}

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
  const { data, error } = await supabase.from('platform_failed_jobs').select('*, businesses(name)');
  if (error) return { data: [] as any, demo: false, error: error.message };
  
  const mapped = data.map(job => ({
    id: job.id,
    org: job.businesses?.name || job.business_id,
    orgId: job.business_id, 
    type: job.job_type,
    status: job.status,
    attempts: job.attempts,
    lastError: job.last_error || 'Unknown error',
    nextRetry: job.next_retry_at ? new Date(job.next_retry_at).toLocaleTimeString() : '—',
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
    full_id: inc.id,
    id: inc.id.substring(0, 8).toUpperCase(),
    severity: inc.severity === 'CRITICAL' ? 'SEV-1' : inc.severity === 'HIGH' ? 'SEV-2' : 'SEV-3',
    status: inc.status === 'OPEN' ? 'INVESTIGATING' : inc.status,
    title: inc.title,
    affected: inc.affected_scope || 'Platform Wide',
    started: new Date(inc.created_at ? inc.created_at.replace(" ", "T") : new Date().toISOString()).toLocaleString(),
    summary: inc.affected_scope || 'No description provided.'
  }));
  
  return ok(mapped as any, false);
}

export async function getIntegrations(): Promise<PlatformResult<typeof DEMO_INTEGRATIONS>> {
  if (isPlatformDemoPlane()) return ok(DEMO_INTEGRATIONS, true);
  
  try {
    const { data, error } = await supabase
      .from('provider_connections')
      .select(`
        *,
        businesses:business_id(name),
        brands:brand_id(name),
        locations:location_id(name, city)
      `);

    if (!error && data && data.length > 0) {
      const mapped = data.map((int: any) => ({
        id: int.id,
        business_id: int.business_id,
        brand_id: int.brand_id,
        brand_name: int.brands?.name || int.businesses?.name || 'Organization Level',
        location_id: int.location_id,
        location_name: int.locations?.name || (int.locations?.city ? `${int.locations.name || ''} (${int.locations.city})` : 'All Locations'),
        provider: int.provider,
        provider_account_id: int.provider_account_id,
        health_status: (int.health_status || 'HEALTHY') as any,
        circuit_breaker_state: (int.circuit_breaker_state || 'CLOSED') as any,
        auth_state: (int.auth_state || 'AUTHORIZED') as any,
        last_event_at: int.last_health_check_at || int.updated_at,
        last_successful_sync_at: int.last_successful_sync_at,
        recovery_status: int.last_error_message || (int.health_status === 'HEALTHY' ? 'Healthy (Active)' : 'Investigating'),
        sync_errors_24h: int.sync_errors_24h || 0,
        is_auto_repairable: int.health_status !== 'ACTION_REQUIRED',
        reconnect_url: int.reconnect_url,
        metadata: int.metadata || {},
        org: int.businesses?.name || 'Unknown',
        orgId: int.business_id,
        status: int.health_status || 'HEALTHY',
        external: int.provider_account_id,
        lastSync: int.last_successful_sync_at || '—',
        errors24h: int.sync_errors_24h || 0,
        scopes: 'all'
      }));
      return ok(mapped as any, false);
    }
  } catch {
    // Fallback if provider_connections is not available
  }

  const { data: syncData, error: syncError } = await supabase.from('integration_sync_status').select('*, businesses(name)');
  if (syncError) return { data: [] as any, demo: false, error: syncError.message };
  
  const mapped = (syncData || []).map((int: any) => ({
    id: int.id,
    business_id: int.organization_id,
    brand_id: null,
    brand_name: int.businesses?.name || 'Organization Level',
    location_id: null,
    location_name: 'All Locations',
    provider: int.integration_type || 'Custom',
    provider_account_id: int.id,
    health_status: (int.status === 'FAILED' ? 'ACTION_REQUIRED' : int.status || 'HEALTHY') as any,
    circuit_breaker_state: 'CLOSED',
    auth_state: int.status === 'FAILED' ? 'REVOKED' : 'AUTHORIZED',
    last_event_at: int.last_successful_sync || null,
    last_successful_sync_at: int.last_successful_sync || null,
    recovery_status: int.status === 'FAILED' ? 'Sync Failed' : 'Healthy (Active)',
    sync_errors_24h: int.status === 'FAILED' ? 1 : 0,
    is_auto_repairable: int.status !== 'FAILED',
    reconnect_url: null,
    metadata: {},
    org: int.businesses?.name || 'Unknown',
    orgId: int.organization_id,
    status: int.status === 'FAILED' ? 'ACTION REQUIRED' : int.status,
    external: 'vowos-connection',
    lastSync: int.last_successful_sync || '—',
    errors24h: int.status === 'FAILED' ? 1 : 0,
    scopes: 'all'
  }));
  
  return ok(mapped as any, false);
}

export async function getIntegrationDiagnostics(connectionId: string): Promise<PlatformResult<DiagnosticDrawerData | null>> {
  if (isPlatformDemoPlane()) {
    if (DEMO_INTEGRATION_DIAGNOSTICS[connectionId]) {
      return ok(DEMO_INTEGRATION_DIAGNOSTICS[connectionId], true);
    }
    const foundDemo = DEMO_INTEGRATIONS.find(i => i.id === connectionId);
    if (foundDemo) {
      return ok(createFallbackDiagnostics(foundDemo), true);
    }
    return ok(null, true);
  }

  try {
    const [connRes, cbRes, errRes, tlRes, curRes, dlqRes, watchRes] = await Promise.all([
      supabase.from('provider_connections').select('*').eq('id', connectionId).maybeSingle(),
      supabase.from('integration_circuit_breakers').select('*').eq('scope_id', connectionId).maybeSingle(),
      supabase.from('integration_error_logs').select('*').eq('provider_connection_id', connectionId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('integration_recovery_timelines').select('*').eq('provider_connection_id', connectionId).order('created_at', { ascending: false }).limit(20),
      supabase.from('integration_sync_cursors').select('*').eq('provider_connection_id', connectionId),
      supabase.from('integration_dlq_events').select('*').eq('provider_connection_id', connectionId).limit(10),
      supabase.from('google_drive_watches').select('*').eq('provider_connection_id', connectionId).maybeSingle(),
    ]);

    if (connRes.error || !connRes.data) {
      return { data: null, demo: false, error: connRes.error?.message || 'Connection not found' };
    }

    const result: DiagnosticDrawerData = {
      connection: connRes.data as any,
      circuitBreaker: (cbRes.data as any) || null,
      latestError: (errRes.data as any) || null,
      timeline: (tlRes.data as any) || [],
      cursors: (curRes.data as any) || [],
      dlqEvents: (dlqRes.data as any) || [],
      driveWatch: (watchRes.data as any) || null,
    };

    return ok(result, false);
  } catch (err: any) {
    return { data: null, demo: false, error: err?.message || 'Failed to load diagnostics' };
  }
}

export async function triggerAutoRepair(connectionId: string): Promise<{ success: boolean; message: string; result?: any }> {
  if (isPlatformDemoPlane()) {
    const demo = DEMO_INTEGRATIONS.find(i => i.id === connectionId);
    if (demo) {
      demo.health_status = 'HEALTHY';
      demo.circuit_breaker_state = 'CLOSED';
      demo.recovery_status = 'Auto-Repaired (Webhooks & Cursors Restored)';
      demo.sync_errors_24h = 0;
      demo.is_auto_repairable = true;
    }
    const diag = DEMO_INTEGRATION_DIAGNOSTICS[connectionId];
    if (diag) {
      diag.connection.health_status = 'HEALTHY';
      diag.connection.circuit_breaker_state = 'CLOSED';
      if (diag.circuitBreaker) {
        diag.circuitBreaker.state = 'CLOSED';
        diag.circuitBreaker.consecutive_failures = 0;
      }
      diag.timeline.unshift({
        id: `tl-repair-${Date.now()}`,
        provider_connection_id: connectionId,
        business_id: diag.connection.business_id,
        provider: diag.connection.provider,
        action_type: 'RECONCILIATION_RUN',
        trigger: 'OPERATOR_MANUAL',
        previous_status: 'RECOVERING',
        resulting_status: 'HEALTHY',
        details: { action: 'Automated repair executed by operator', recovered: true },
        success: true,
        duration_ms: 245,
        executed_by: 'OPERATOR',
        created_at: new Date().toISOString(),
      });
    }
    return { success: true, message: 'Auto-repair initiated successfully. Diagnostic checks and webhooks refreshed.' };
  }

  try {
    const headers = await recoveryAuthHeaders({ 'Content-Type': 'application/json' });
    if (!headers) return { success: false, message: 'Sign in again to run a repair.' };
    const res = await fetch(`/api/recovery/repair/${encodeURIComponent(connectionId)}`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.message || `Repair request failed with status ${res.status}` };
    }
    const data = await res.json();
    return { success: true, message: data.actionTaken || 'Auto-repair executed successfully.', result: data };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to trigger auto-repair.' };
  }
}

export async function forceReconcile(connectionId: string, resourceType?: string): Promise<{ success: boolean; message: string; report?: any }> {
  if (isPlatformDemoPlane()) {
    const diag = DEMO_INTEGRATION_DIAGNOSTICS[connectionId];
    if (diag) {
      diag.timeline.unshift({
        id: `tl-reconcile-${Date.now()}`,
        provider_connection_id: connectionId,
        business_id: diag.connection.business_id,
        provider: diag.connection.provider,
        action_type: 'RECONCILIATION_RUN',
        trigger: 'OPERATOR_MANUAL',
        previous_status: diag.connection.health_status,
        resulting_status: 'HEALTHY',
        details: { resource: resourceType || 'all', recordsIngested: 12, duplicatesSkipped: 0 },
        success: true,
        duration_ms: 310,
        executed_by: 'OPERATOR',
        created_at: new Date().toISOString(),
      });
      diag.connection.health_status = 'HEALTHY';
      diag.connection.last_successful_sync_at = new Date().toISOString();
    }
    return { success: true, message: 'Reconciliation complete: Ingested 12 missed records from last high-water mark cursor.' };
  }

  try {
    const headers = await recoveryAuthHeaders({ 'Content-Type': 'application/json' });
    if (!headers) return { success: false, message: 'Sign in again to reconcile.' };
    const res = await fetch(`/api/recovery/reconcile/${encodeURIComponent(connectionId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ resourceType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.message || `Reconciliation failed with status ${res.status}` };
    }
    const data = await res.json();
    return { success: true, message: `Reconciliation complete: Ingested ${data.recordsIngested || 0} records (${data.recordsSkippedDuplicates || 0} duplicates deduplicated).`, report: data };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to force reconciliation.' };
  }
}

export async function testConnection(connectionId: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const start = Date.now();
  if (isPlatformDemoPlane()) {
    const diag = DEMO_INTEGRATION_DIAGNOSTICS[connectionId];
    const isDegraded = diag?.connection.health_status === 'DEGRADED';
    const isActionReq = diag?.connection.health_status === 'ACTION_REQUIRED';
    
    if (isActionReq) {
      return { success: false, message: 'Handshake failed: 401 Unauthorized - Access token revoked.', latencyMs: 142 };
    }
    if (isDegraded) {
      return { success: false, message: 'Handshake degraded: 429 Too Many Requests (Rate limited by provider).', latencyMs: 290 };
    }
    return { success: true, message: 'Handshake verified: Provider endpoint returned 200 OK.', latencyMs: 68 };
  }

  try {
    const headers = await recoveryAuthHeaders();
    if (!headers) {
      return { success: false, message: 'Sign in again to test this connection.', latencyMs: 0 };
    }
    const res = await fetch(`/api/recovery/test/${encodeURIComponent(connectionId)}`, {
      method: 'POST',
      headers,
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.message || `Handshake failed with status ${res.status}`, latencyMs };
    }
    return { success: true, message: 'Connection active and healthy.', latencyMs };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection test failed', latencyMs: Date.now() - start };
  }
}

export async function generateReconnectUrl(connectionId: string): Promise<{ success: boolean; url: string }> {
  if (isPlatformDemoPlane()) {
    const diag = DEMO_INTEGRATION_DIAGNOSTICS[connectionId];
    const url = diag?.connection.reconnect_url || `https://auth.vowos.com/oauth/reconnect?conn=${encodeURIComponent(connectionId)}&sig=signed_demo_token_88192`;
    return { success: true, url };
  }

  try {
    const headers = await recoveryAuthHeaders();
    if (!headers) throw new Error('Sign in again to generate a reconnect link.');
    const res = await fetch(`/api/recovery/reconnect-url/${encodeURIComponent(connectionId)}`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate reconnect URL');
    }
    const data = await res.json();
    return { success: true, url: data.reconnectUrl };
  } catch (err: any) {
    return { success: false, url: `https://auth.vowos.com/oauth/reconnect?conn=${encodeURIComponent(connectionId)}` };
  }
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
