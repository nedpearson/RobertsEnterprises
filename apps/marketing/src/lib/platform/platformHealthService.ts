import { supabase } from '@/lib/supabase';

export type HealthStatus = 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'UNKNOWN';

export interface PlatformHealthCheck {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  failureRate: number;
  lastCheck: string;
  affectedOrgs: number;
  detail?: string;
}

const timed = async <T>(operation: () => Promise<T>): Promise<{ value?: T; error?: Error; latencyMs: number }> => {
  const start = performance.now();
  try {
    return { value: await operation(), latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)), latencyMs: Math.round(performance.now() - start) };
  }
};

export async function measurePlatformHealth(): Promise<PlatformHealthCheck[]> {
  const checkedAt = new Date().toISOString();
  const apiUrl = import.meta.env.VITE_API_URL || '';

  const [worker, database, jobs, integrations] = await Promise.all([
    timed(async () => {
      const response = await fetch(`${apiUrl}/api/health`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (body?.status !== 'ok') throw new Error('Worker returned unhealthy status');
      return body;
    }),
    timed(async () => {
      const { error } = await supabase.from('businesses').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return true;
    }),
    timed(async () => {
      const { count, error } = await supabase.from('platform_failed_jobs').select('*', { count: 'exact', head: true }).in('status', ['FAILED', 'MANUAL_REVIEW']);
      if (error) throw error;
      return count || 0;
    }),
    timed(async () => {
      const { data, error } = await supabase.from('integration_sync_status').select('organization_id,status').eq('status', 'FAILED');
      if (error) throw error;
      const organizations = new Set((data || []).map((row: any) => row.organization_id).filter(Boolean));
      return { failures: (data || []).length, affectedOrgs: organizations.size };
    }),
  ]);

  return [
    {
      name: 'VowOS API / Worker',
      status: worker.error ? 'PARTIAL_OUTAGE' : 'OPERATIONAL',
      latencyMs: worker.latencyMs,
      failureRate: worker.error ? 1 : 0,
      lastCheck: checkedAt,
      affectedOrgs: 0,
      detail: worker.error?.message || 'Health endpoint responded successfully.',
    },
    {
      name: 'Database (Postgres)',
      status: database.error ? 'PARTIAL_OUTAGE' : 'OPERATIONAL',
      latencyMs: database.latencyMs,
      failureRate: database.error ? 1 : 0,
      lastCheck: checkedAt,
      affectedOrgs: 0,
      detail: database.error?.message || 'Authoritative database query succeeded.',
    },
    {
      name: 'Background Jobs',
      status: jobs.error ? 'UNKNOWN' : Number(jobs.value || 0) > 0 ? 'DEGRADED' : 'OPERATIONAL',
      latencyMs: jobs.latencyMs,
      failureRate: jobs.error ? 1 : Number(jobs.value || 0) > 0 ? 1 : 0,
      lastCheck: checkedAt,
      affectedOrgs: 0,
      detail: jobs.error?.message || `${Number(jobs.value || 0)} failed/manual-review jobs currently recorded.`,
    },
    {
      name: 'Provider Integrations',
      status: integrations.error ? 'UNKNOWN' : (integrations.value?.failures || 0) > 0 ? 'DEGRADED' : 'OPERATIONAL',
      latencyMs: integrations.latencyMs,
      failureRate: integrations.error ? 1 : (integrations.value?.failures || 0) > 0 ? 1 : 0,
      lastCheck: checkedAt,
      affectedOrgs: integrations.value?.affectedOrgs || 0,
      detail: integrations.error?.message || `${integrations.value?.failures || 0} failed integration sync states.`,
    },
  ];
}
