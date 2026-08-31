/**
 * Platform data source — one code path, two planes.
 *
 * Production state is evidence-based. Demo data is available only when the
 * explicit session-scoped demo plane is enabled; an empty/erroring production
 * query never falls back to synthetic metrics or invented provider health.
 */
import {
  DEMO_ORGANIZATIONS,
  DEMO_FAILED_JOBS,
  DEMO_INCIDENTS,
  DEMO_INTEGRATIONS,
  DEMO_INTEGRATION_DIAGNOSTICS,
  DEMO_SYSTEM_HEALTH,
  DEMO_RELEASES,
  createFallbackDiagnostics,
  summarizeOrganizations,
} from './platformDemoData';
import type { DiagnosticDrawerData } from '@/types/integrationOps';
import { supabase } from '../supabase';

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
    // Storage unavailable: leave the production plane active.
  }
  listeners.forEach((listener) => listener());
}

export function subscribePlatformPlane(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface PlatformResult<T> {
  data: T;
  demo: boolean;
  error: string | null;
}

const ok = <T,>(data: T, demo: boolean): PlatformResult<T> => ({ data, demo, error: null });
const notWired = <T,>(empty: T): PlatformResult<T> => ({ data: empty, demo: false, error: null });

async function authenticatedHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  return { ...extra, Authorization: `Bearer ${token}` };
}

async function authenticatedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const extraHeaders: Record<string, string> = {};
  if (init.body !== undefined) extraHeaders['Content-Type'] = 'application/json';
  const headers = await authenticatedHeaders(extraHeaders);
  if (!headers) throw new Error('Sign in again to use Platform Admin.');

  const response = await fetch(path, {
    ...init,
    headers: {
      ...headers,
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.message === 'string'
      ? payload.message
      : typeof payload?.error === 'string'
        ? payload.error
        : `Platform request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return payload as T;
}

function mapDurableStatusToUI(status: string): string {
  switch (status) {
    case 'dead-letter':
    case 'failed':
      return 'FAILED';
    case 'running':
      return 'PROCESSING';
    case 'pending':
      return 'RETRYING';
    case 'completed':
      return 'COMPLETED';
    default:
      return (status || '').toUpperCase();
  }
}

function safeProviderHealth(value: unknown): 'HEALTHY' | 'RECOVERING' | 'ACTION_REQUIRED' | 'DEGRADED' {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'HEALTHY' || normalized === 'RECOVERING' || normalized === 'ACTION_REQUIRED' || normalized === 'DEGRADED') {
    return normalized;
  }
  return 'RECOVERING';
}

function safeAuthState(value: unknown): 'AUTHORIZED' | 'EXPIRED' | 'REVOKED' | 'PENDING' | 'REAUTH_REQUIRED' {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (
    normalized === 'AUTHORIZED' ||
    normalized === 'EXPIRED' ||
    normalized === 'REVOKED' ||
    normalized === 'PENDING' ||
    normalized === 'REAUTH_REQUIRED'
  ) {
    return normalized;
  }
  return 'PENDING';
}

export async function getOrganizations(): Promise<PlatformResult<typeof DEMO_ORGANIZATIONS>> {
  if (isPlatformDemoPlane()) return ok(DEMO_ORGANIZATIONS, true);
  const { data, error } = await supabase.from('businesses').select('*').is('parent_id', null);
  if (error) return { data: [] as any, demo: false, error: error.message };
  return ok((data || []) as any, false);
}

export async function getFailedJobs(): Promise<PlatformResult<typeof DEMO_FAILED_JOBS>> {
  if (isPlatformDemoPlane()) return ok(DEMO_FAILED_JOBS, true);
  try {
    const { jobs } = await authenticatedJson<{ jobs?: any[] }>('/api/platform/jobs?status=dead-letter,failed,running,pending');
    const mapped = (jobs || []).map((job: any) => ({
      id: job.id,
      org: job.org || job.businesses?.name || job.business_id || 'Platform Wide',
      orgId: job.orgId || job.business_id,
      type: job.type || job.queue_name,
      status: mapDurableStatusToUI(job.raw_status || job.status),
      attempts: job.attempts,
      lastError: job.lastError || job.last_error || job.error_message || 'No error detail recorded',
      nextRetry: job.nextRetry || (job.next_retry_at ? new Date(job.next_retry_at).toLocaleTimeString() : '—'),
      impact: job.impact || 'Background task stalled',
      retrySafe: true,
      correlationId: job.correlationId || (job.id ? job.id.substring(0, 8) : ''),
    }));
    return ok(mapped as any, false);
  } catch (error) {
    return { data: [] as any, demo: false, error: error instanceof Error ? error.message : 'Failed to load durable jobs.' };
  }
}

export async function retryJob(id: string): Promise<{ success: boolean; message: string; data?: any }> {
  if (isPlatformDemoPlane()) {
    const job = DEMO_FAILED_JOBS.find((candidate) => candidate.id === id);
    if (job) {
      job.status = 'PROCESSING';
      job.attempts += 1;
    }
    return { success: true, message: 'Demo job re-enqueued for processing.' };
  }
  try {
    const data = await authenticatedJson<any>(`/api/platform/jobs/${encodeURIComponent(id)}/retry`, { method: 'POST' });
    return { success: true, message: data.message || 'Job re-enqueued successfully.', data };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to retry job.' };
  }
}

export async function getIncidents(): Promise<PlatformResult<typeof DEMO_INCIDENTS>> {
  if (isPlatformDemoPlane()) return ok(DEMO_INCIDENTS, true);
  try {
    const { incidents } = await authenticatedJson<{ incidents?: any[] }>('/api/platform/incidents');
    return ok((incidents || []) as any, false);
  } catch (error) {
    return { data: [] as any, demo: false, error: error instanceof Error ? error.message : 'Failed to load incidents.' };
  }
}

export async function declareIncident(payload: {
  title: string;
  severity?: string;
  status?: string;
  affected_scope?: string;
  description?: string;
}): Promise<{ success: boolean; message: string; incident?: any }> {
  if (isPlatformDemoPlane()) {
    const incident: any = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      severity: payload.severity || 'SEV-2',
      status: payload.status || 'INVESTIGATING',
      title: payload.title,
      affected: payload.affected_scope || 'Platform Wide',
      started: new Date().toLocaleString(),
      summary: payload.description || payload.affected_scope || 'Demo incident declared.',
    };
    DEMO_INCIDENTS.unshift(incident);
    return { success: true, message: 'Demo incident declared.', incident };
  }
  try {
    const data = await authenticatedJson<any>('/api/platform/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { success: true, message: data.message || 'Incident declared successfully.', incident: data.incident };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to declare incident.' };
  }
}

export async function resolveIncident(id: string): Promise<{ success: boolean; message: string }> {
  if (isPlatformDemoPlane()) {
    const incident = DEMO_INCIDENTS.find((candidate: any) => candidate.id === id || candidate.full_id === id);
    if (incident) incident.status = 'RESOLVED';
    return { success: true, message: 'Demo incident marked as resolved.' };
  }
  try {
    const data = await authenticatedJson<any>(`/api/platform/incidents/${encodeURIComponent(id)}/resolve`, { method: 'POST' });
    return { success: true, message: data.message || 'Incident resolved.' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to resolve incident.' };
  }
}

export async function updateIncident(
  id: string,
  updates: Partial<{ status: string; severity: string; title: string; affected_scope: string }>,
): Promise<{ success: boolean; message: string; incident?: any }> {
  if (isPlatformDemoPlane()) {
    const incident = DEMO_INCIDENTS.find((candidate: any) => candidate.id === id || candidate.full_id === id);
    if (incident) Object.assign(incident, updates);
    return { success: true, message: 'Demo incident updated.', incident };
  }
  try {
    const data = await authenticatedJson<any>(`/api/platform/incidents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return { success: true, message: data.message || 'Incident updated.', incident: data.incident };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to update incident.' };
  }
}

export async function getSupportTickets(filter?: {
  status?: string;
  category?: string;
  severity?: string;
  priority?: string;
}): Promise<{ data: any[]; error: string | null }> {
  try {
    const params = new URLSearchParams();
    if (filter?.status) params.set('status', filter.status);
    if (filter?.category) params.set('category', filter.category);
    if (filter?.severity) params.set('severity', filter.severity);
    if (filter?.priority) params.set('priority', filter.priority);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const result = await authenticatedJson<{ tickets?: any[] }>(`/api/platform/support/tickets${suffix}`);
    return { data: result.tickets || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to load support tickets.' };
  }
}

export async function getSupportTicketDetails(id: string): Promise<{ ticket: any; messages: any[]; error: string | null }> {
  try {
    const result = await authenticatedJson<{ ticket?: any; messages?: any[] }>(`/api/platform/support/tickets/${encodeURIComponent(id)}`);
    return { ticket: result.ticket || null, messages: result.messages || [], error: null };
  } catch (error) {
    return { ticket: null, messages: [], error: error instanceof Error ? error.message : 'Failed to load ticket.' };
  }
}

export async function updateSupportTicket(
  id: string,
  updates: Partial<{ status: string; priority: string; severity: string; category: string }>,
): Promise<{ success: boolean; message: string; ticket?: any }> {
  try {
    const data = await authenticatedJson<any>(`/api/platform/support/tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return { success: true, message: data.message || 'Ticket updated successfully.', ticket: data.ticket };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to update ticket.' };
  }
}

export async function postSupportMessage(
  ticketId: string,
  message: string,
  isInternalNote = false,
  userId?: string,
): Promise<{ success: boolean; message: string; supportMessage?: any }> {
  try {
    const data = await authenticatedJson<any>(`/api/platform/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, is_internal_note: isInternalNote, user_id: userId }),
    });
    return {
      success: true,
      message: data.message || (isInternalNote ? 'Internal note added.' : 'Reply sent.'),
      supportMessage: data.supportMessage,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to post support message.' };
  }
}

export async function getIntegrations(): Promise<PlatformResult<typeof DEMO_INTEGRATIONS>> {
  if (isPlatformDemoPlane()) return ok(DEMO_INTEGRATIONS, true);

  const { data, error } = await supabase
    .from('provider_connections')
    .select(`
      *,
      businesses:business_id(name),
      brands:brand_id(name),
      locations:location_id(name, city)
    `);

  if (!error) {
    const mapped = (data || []).map((integration: any) => {
      const healthStatus = safeProviderHealth(integration.health_status);
      const authState = safeAuthState(integration.auth_state);
      return {
        id: integration.id,
        business_id: integration.business_id,
        brand_id: integration.brand_id,
        brand_name: integration.brands?.name || integration.businesses?.name || 'Organization Level',
        location_id: integration.location_id,
        location_name: integration.locations?.name || (integration.locations?.city ? `${integration.locations.name || ''} (${integration.locations.city})` : 'All Locations'),
        provider: integration.provider,
        provider_account_id: integration.provider_account_id,
        health_status: healthStatus,
        circuit_breaker_state: integration.circuit_breaker_state || null,
        auth_state: authState,
        last_event_at: integration.last_health_check_at || integration.updated_at || null,
        last_successful_sync_at: integration.last_successful_sync_at || null,
        recovery_status: integration.last_error_message || (healthStatus === 'HEALTHY' ? 'Verified healthy' : 'Health verification pending'),
        sync_errors_24h: Number(integration.sync_errors_24h || 0),
        is_auto_repairable: healthStatus !== 'ACTION_REQUIRED',
        reconnect_url: integration.reconnect_url || null,
        metadata: integration.metadata || {},
        org: integration.businesses?.name || 'Unknown',
        orgId: integration.business_id,
        status: healthStatus,
        external: integration.provider_account_id || '',
        lastSync: integration.last_successful_sync_at || '—',
        errors24h: Number(integration.sync_errors_24h || 0),
        scopes: 'configured',
      };
    });
    return ok(mapped as any, false);
  }

  const { data: syncData, error: syncError } = await supabase.from('integration_sync_status').select('*, businesses(name)');
  if (syncError) return { data: [] as any, demo: false, error: error.message || syncError.message };

  const mapped = (syncData || []).map((integration: any) => {
    const rawStatus = String(integration.status || '').trim().toUpperCase();
    const failed = rawStatus === 'FAILED' || rawStatus === 'ERROR';
    const verifiedHealthy = Boolean(integration.last_successful_sync) && ['HEALTHY', 'SUCCESS', 'SYNCED', 'CONNECTED'].includes(rawStatus);
    const healthStatus = failed ? 'ACTION_REQUIRED' : verifiedHealthy ? 'HEALTHY' : 'RECOVERING';
    return {
      id: integration.id,
      business_id: integration.organization_id,
      brand_id: null,
      brand_name: integration.businesses?.name || 'Organization Level',
      location_id: null,
      location_name: 'All Locations',
      provider: integration.integration_type || 'Custom',
      provider_account_id: integration.external_account_id || integration.id,
      health_status: healthStatus,
      circuit_breaker_state: null,
      auth_state: failed ? 'REVOKED' : verifiedHealthy ? 'AUTHORIZED' : 'PENDING',
      last_event_at: integration.last_successful_sync || null,
      last_successful_sync_at: integration.last_successful_sync || null,
      recovery_status: failed ? 'Sync failed' : verifiedHealthy ? 'Verified healthy' : 'Health verification pending',
      sync_errors_24h: failed ? 1 : 0,
      is_auto_repairable: !failed,
      reconnect_url: null,
      metadata: { legacySource: true },
      org: integration.businesses?.name || 'Unknown',
      orgId: integration.organization_id,
      status: healthStatus,
      external: integration.external_account_id || integration.id || '',
      lastSync: integration.last_successful_sync || '—',
      errors24h: failed ? 1 : 0,
      scopes: 'legacy',
    };
  });
  return ok(mapped as any, false);
}

export async function getIntegrationDiagnostics(connectionId: string): Promise<PlatformResult<DiagnosticDrawerData | null>> {
  if (isPlatformDemoPlane()) {
    if (DEMO_INTEGRATION_DIAGNOSTICS[connectionId]) return ok(DEMO_INTEGRATION_DIAGNOSTICS[connectionId], true);
    const foundDemo = DEMO_INTEGRATIONS.find((integration) => integration.id === connectionId);
    return foundDemo ? ok(createFallbackDiagnostics(foundDemo), true) : ok(null, true);
  }
  try {
    const [connection, circuitBreaker, latestError, timeline, cursors, dlqEvents, driveWatch] = await Promise.all([
      supabase.from('provider_connections').select('*').eq('id', connectionId).maybeSingle(),
      supabase.from('integration_circuit_breakers').select('*').eq('scope_id', connectionId).maybeSingle(),
      supabase.from('integration_error_logs').select('*').eq('provider_connection_id', connectionId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('integration_recovery_timelines').select('*').eq('provider_connection_id', connectionId).order('created_at', { ascending: false }).limit(20),
      supabase.from('integration_sync_cursors').select('*').eq('provider_connection_id', connectionId),
      supabase.from('integration_dlq_events').select('*').eq('provider_connection_id', connectionId).limit(10),
      supabase.from('google_drive_watches').select('*').eq('provider_connection_id', connectionId).maybeSingle(),
    ]);
    if (connection.error || !connection.data) {
      return { data: null, demo: false, error: connection.error?.message || 'Connection not found.' };
    }
    return ok({
      connection: connection.data as any,
      circuitBreaker: (circuitBreaker.data as any) || null,
      latestError: (latestError.data as any) || null,
      timeline: (timeline.data as any) || [],
      cursors: (cursors.data as any) || [],
      dlqEvents: (dlqEvents.data as any) || [],
      driveWatch: (driveWatch.data as any) || null,
    }, false);
  } catch (error) {
    return { data: null, demo: false, error: error instanceof Error ? error.message : 'Failed to load diagnostics.' };
  }
}

export async function triggerAutoRepair(connectionId: string): Promise<{ success: boolean; message: string; result?: any }> {
  if (isPlatformDemoPlane()) {
    const demo = DEMO_INTEGRATIONS.find((integration) => integration.id === connectionId);
    if (demo) {
      demo.health_status = 'HEALTHY';
      demo.circuit_breaker_state = 'CLOSED';
      demo.recovery_status = 'Auto-Repaired (Webhooks & Cursors Restored)';
      demo.sync_errors_24h = 0;
      demo.is_auto_repairable = true;
    }
    return { success: true, message: 'Demo auto-repair completed.' };
  }
  try {
    const result = await authenticatedJson<any>(`/api/recovery/repair/${encodeURIComponent(connectionId)}`, { method: 'POST' });
    return { success: true, message: result.message || result.actionTaken || 'Recovery action accepted.', result };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to trigger recovery.' };
  }
}

export async function forceReconcile(connectionId: string, resourceType?: string): Promise<{ success: boolean; message: string; report?: any }> {
  if (isPlatformDemoPlane()) return { success: true, message: 'Demo reconciliation complete: 12 synthetic records ingested.' };
  try {
    const report = await authenticatedJson<any>(`/api/recovery/reconcile/${encodeURIComponent(connectionId)}`, {
      method: 'POST',
      body: JSON.stringify({ resourceType }),
    });
    return { success: true, message: report.message || `Reconciliation completed with ${report.recordsIngested || 0} ingested records.`, report };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to reconcile provider data.' };
  }
}

export async function testConnection(connectionId: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const startedAt = Date.now();
  if (isPlatformDemoPlane()) {
    const diagnostic = DEMO_INTEGRATION_DIAGNOSTICS[connectionId];
    if (diagnostic?.connection.health_status === 'ACTION_REQUIRED') {
      return { success: false, message: 'Demo handshake failed: provider authorization revoked.', latencyMs: 142 };
    }
    if (diagnostic?.connection.health_status === 'DEGRADED') {
      return { success: false, message: 'Demo handshake degraded: provider rate limited.', latencyMs: 290 };
    }
    return { success: true, message: 'Demo handshake verified.', latencyMs: 68 };
  }
  try {
    const result = await authenticatedJson<any>(`/api/recovery/test/${encodeURIComponent(connectionId)}`, { method: 'POST' });
    return {
      success: result.providerVerified === true,
      message: result.message || (result.providerVerified ? 'Provider verified.' : 'Live provider verification was not performed.'),
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection verification unavailable.', latencyMs: Date.now() - startedAt };
  }
}

export async function generateReconnectUrl(connectionId: string): Promise<{ success: boolean; url: string }> {
  if (isPlatformDemoPlane()) {
    const diagnostic = DEMO_INTEGRATION_DIAGNOSTICS[connectionId];
    return { success: true, url: diagnostic?.connection.reconnect_url || `/settings?tab=integrations&demoReconnect=${encodeURIComponent(connectionId)}` };
  }
  try {
    const result = await authenticatedJson<any>(`/api/recovery/reconnect-url/${encodeURIComponent(connectionId)}`, { method: 'POST' });
    const url = typeof result.reconnectUrl === 'string' ? result.reconnectUrl.trim() : '';
    return url ? { success: true, url } : { success: false, url: '' };
  } catch {
    return { success: false, url: '' };
  }
}

export async function getSystemHealth(): Promise<PlatformResult<typeof DEMO_SYSTEM_HEALTH>> {
  if (isPlatformDemoPlane()) return ok(DEMO_SYSTEM_HEALTH, true);
  try {
    const health = await authenticatedJson<{ checks?: any[] }>('/api/platform/health');
    if (!Array.isArray(health.checks)) {
      return { data: [] as any, demo: false, error: 'Platform health endpoint returned no telemetry.' };
    }
    return ok(health.checks as any, false);
  } catch (error) {
    return { data: [] as any, demo: false, error: error instanceof Error ? error.message : 'Health telemetry unavailable.' };
  }
}

export async function getReleases(): Promise<PlatformResult<typeof DEMO_RELEASES>> {
  return isPlatformDemoPlane() ? ok(DEMO_RELEASES, true) : notWired([]);
}

export async function getOrganizationSummary() {
  const { data, demo, error } = await getOrganizations();
  return { summary: summarizeOrganizations(data), demo, error };
}
