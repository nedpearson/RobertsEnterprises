import { supabase } from '@/lib/supabase';
import type { GrowthDataHealth } from './types';

interface PersistedHealthRow {
  overall_score: number;
  attribution_coverage_pct: number | null;
  freshness_score: number | null;
  connection_score: number | null;
  issues: Array<{ code?: string; severity?: string; message?: string; action?: string }> | null;
  calculated_at: string;
}

export async function fetchLatestGrowthDataHealth(businessId: string): Promise<GrowthDataHealth | null> {
  const { data, error } = await supabase
    .from('growth_data_health')
    .select('overall_score,attribution_coverage_pct,freshness_score,connection_score,issues,calculated_at')
    .eq('business_id', businessId)
    .is('location_id', null)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as PersistedHealthRow;
  const ageMinutes = Math.max(0, (Date.now() - new Date(row.calculated_at).getTime()) / 60_000);
  const state: GrowthDataHealth['state'] = ageMinutes <= 60
    ? 'fresh'
    : ageMinutes <= 360
      ? 'delayed'
      : ageMinutes <= 1440
        ? 'stale'
        : 'stale';

  return {
    score: Number(row.overall_score ?? 0),
    freshnessScore: Number(row.freshness_score ?? 0),
    connectionScore: Number(row.connection_score ?? 0),
    attributionCoveragePct: row.attribution_coverage_pct == null ? null : Number(row.attribution_coverage_pct),
    state,
    lastUpdatedAt: row.calculated_at,
    issues: (row.issues ?? []).map((issue, index) => ({
      code: issue.code || `health_issue_${index}`,
      severity: issue.severity === 'high' || issue.severity === 'low' ? issue.severity : 'medium',
      message: issue.message || 'Marketing data-health issue detected.',
      action: issue.action,
    })),
  };
}
