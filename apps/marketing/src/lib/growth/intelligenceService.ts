import { supabase } from '@/lib/supabase';
import type {
  CampaignDailyMetric,
  CampaignPerformance,
  GrowthAIRecommendation,
  GrowthCampaign,
  GrowthCompetitor,
  GrowthCompetitorSignal,
  GrowthDataHealth,
  MoneyMapChannel,
  ProviderConnection,
} from './types';

const isoDateDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

function unwrap<T>(result: { data: T[] | null; error: unknown }, context: string): T[] {
  if (result.error) {
    const message = (result.error as { message?: string })?.message ?? String(result.error);
    throw new Error(`${context}: ${message}`);
  }
  return (result.data as T[]) ?? [];
}

export async function fetchCampaigns(businessId: string): Promise<GrowthCampaign[]> {
  return unwrap<GrowthCampaign>(
    await supabase
      .from('growth_ad_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true }),
    'fetchCampaigns',
  );
}

export async function fetchCampaignMetrics(businessId: string, days = 30): Promise<CampaignDailyMetric[]> {
  return unwrap<CampaignDailyMetric>(
    await supabase
      .from('growth_ad_metrics')
      .select('*')
      .eq('business_id', businessId)
      .gte('metric_date', isoDateDaysAgo(days))
      .order('metric_date', { ascending: true }),
    'fetchCampaignMetrics',
  );
}

export function rollUpCampaignPerformance(
  campaigns: GrowthCampaign[],
  metrics: CampaignDailyMetric[],
): CampaignPerformance[] {
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const byId = new Map<string, CampaignPerformance>();

  for (const metric of metrics) {
    const campaign = campaignById.get(metric.campaign_id);
    if (!campaign) continue;

    let row = byId.get(campaign.id);
    if (!row) {
      row = {
        campaignId: campaign.id,
        name: campaign.name,
        provider: campaign.network,
        locationId: campaign.location_id,
        status: campaign.status,
        spendCents: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        qualifiedLeads: 0,
        appointmentsBooked: 0,
        appointmentsAttended: 0,
        sales: 0,
        revenueCents: 0,
        grossProfitCents: 0,
        platformReportedConversions: 0,
        ctr: null,
        cpcCents: null,
        cplCents: null,
        costPerAppointmentCents: null,
        cacCents: null,
        roas: null,
        grossProfitRoas: null,
        freshnessAt: null,
      };
      byId.set(campaign.id, row);
    }

    row.spendCents += Number(metric.spend_cents ?? 0);
    row.impressions += Number(metric.impressions ?? 0);
    row.clicks += Number(metric.clicks ?? 0);
    row.leads += Number(metric.leads ?? 0);
    row.qualifiedLeads += Number(metric.qualified_leads ?? 0);
    row.appointmentsBooked += Number(metric.appointments_booked ?? 0);
    row.appointmentsAttended += Number(metric.appointments_attended ?? 0);
    row.sales += Number(metric.sales ?? 0);
    row.revenueCents += Number(metric.revenue_cents ?? 0);
    row.grossProfitCents += Number(metric.gross_profit_cents ?? 0);
    row.platformReportedConversions += Number(
      metric.platform_reported_conversions ?? metric.conversions ?? 0,
    );
    const fresh = metric.synced_at ?? campaign.synced_at;
    if (fresh && (!row.freshnessAt || fresh > row.freshnessAt)) row.freshnessAt = fresh;
  }

  return [...byId.values()]
    .map((row) => ({
      ...row,
      ctr: row.impressions > 0 ? row.clicks / row.impressions : null,
      cpcCents: row.clicks > 0 ? Math.round(row.spendCents / row.clicks) : null,
      cplCents: row.leads > 0 ? Math.round(row.spendCents / row.leads) : null,
      costPerAppointmentCents:
        row.appointmentsBooked > 0 ? Math.round(row.spendCents / row.appointmentsBooked) : null,
      cacCents: row.sales > 0 ? Math.round(row.spendCents / row.sales) : null,
      roas: row.spendCents > 0 ? row.revenueCents / row.spendCents : null,
      grossProfitRoas: row.spendCents > 0 ? row.grossProfitCents / row.spendCents : null,
    }))
    .sort((a, b) => b.spendCents - a.spendCents || b.revenueCents - a.revenueCents);
}

export async function fetchCampaignPerformance(businessId: string, days = 30): Promise<CampaignPerformance[]> {
  const [campaigns, metrics] = await Promise.all([
    fetchCampaigns(businessId),
    fetchCampaignMetrics(businessId, days),
  ]);
  return rollUpCampaignPerformance(campaigns, metrics);
}

export function buildMoneyMap(campaigns: CampaignPerformance[]): MoneyMapChannel[] {
  const byProvider = new Map<string, MoneyMapChannel>();
  for (const campaign of campaigns) {
    const key = campaign.provider || 'unknown';
    let row = byProvider.get(key);
    if (!row) {
      row = {
        channel: key,
        spendCents: 0,
        revenueCents: 0,
        grossProfitCents: 0,
        leads: 0,
        appointments: 0,
        sales: 0,
        roas: null,
        grossProfitRoas: null,
      };
      byProvider.set(key, row);
    }
    row.spendCents += campaign.spendCents;
    row.revenueCents += campaign.revenueCents;
    row.grossProfitCents += campaign.grossProfitCents;
    row.leads += campaign.leads;
    row.appointments += campaign.appointmentsBooked;
    row.sales += campaign.sales;
  }

  return [...byProvider.values()]
    .map((row) => ({
      ...row,
      roas: row.spendCents > 0 ? row.revenueCents / row.spendCents : null,
      grossProfitRoas: row.spendCents > 0 ? row.grossProfitCents / row.spendCents : null,
    }))
    .sort((a, b) => b.spendCents - a.spendCents);
}

export async function fetchGrowthRecommendations(businessId: string): Promise<GrowthAIRecommendation[]> {
  return unwrap<GrowthAIRecommendation>(
    await supabase
      .from('growth_ai_recommendations')
      .select('*')
      .eq('business_id', businessId)
      .in('status', ['pending', 'approved', 'snoozed'])
      .order('created_at', { ascending: false })
      .limit(50),
    'fetchGrowthRecommendations',
  );
}

export async function setGrowthRecommendationStatus(
  businessId: string,
  recommendationId: string,
  status: GrowthAIRecommendation['status'],
): Promise<void> {
  const { error } = await supabase
    .from('growth_ai_recommendations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .eq('id', recommendationId);
  if (error) throw new Error((error as { message?: string }).message ?? String(error));
}

export async function fetchGrowthCompetitors(businessId: string): Promise<GrowthCompetitor[]> {
  return unwrap<GrowthCompetitor>(
    await supabase
      .from('growth_competitors')
      .select('*')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('name', { ascending: true }),
    'fetchGrowthCompetitors',
  );
}

export async function fetchGrowthCompetitorSignals(businessId: string): Promise<GrowthCompetitorSignal[]> {
  return unwrap<GrowthCompetitorSignal>(
    await supabase
      .from('growth_competitor_signals')
      .select('*')
      .eq('business_id', businessId)
      .order('detected_at', { ascending: false })
      .limit(100),
    'fetchGrowthCompetitorSignals',
  );
}

export async function addGrowthCompetitor(
  businessId: string,
  input: { name: string; websiteUrl?: string | null; locationId?: string | null },
): Promise<void> {
  const trimmedName = input.name.trim();
  const locationId = input.locationId ?? null;
  let existingQuery = supabase
    .from('growth_competitors')
    .select('id')
    .eq('business_id', businessId)
    .ilike('name', trimmedName);
  existingQuery = locationId ? existingQuery.eq('location_id', locationId) : existingQuery.is('location_id', null);
  const { data: existing, error: lookupError } = await existingQuery.maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  if (existing?.id) {
    const { error } = await supabase
      .from('growth_competitors')
      .update({
        website_url: input.websiteUrl?.trim() || null,
        verified_by_user: true,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from('growth_competitors').insert({
    business_id: businessId,
    location_id: locationId,
    name: trimmedName,
    website_url: input.websiteUrl?.trim() || null,
    competitor_type: 'direct',
    verified_by_user: true,
    active: true,
  });
  if (error) throw new Error((error as { message?: string }).message ?? String(error));
}

export async function removeGrowthCompetitor(businessId: string, competitorId: string): Promise<void> {
  const { error } = await supabase
    .from('growth_competitors')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .eq('id', competitorId);
  if (error) throw new Error((error as { message?: string }).message ?? String(error));
}

const minutesSince = (timestamp: string | null | undefined): number | null => {
  if (!timestamp) return null;
  const ms = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 60000));
};

export function calculateGrowthDataHealth(
  connections: ProviderConnection[],
  attributionCoveragePct: number | null = null,
): GrowthDataHealth {
  const expectedCore = ['google_ads', 'google_analytics', 'google_search_console', 'meta_ads'];
  const connected = connections.filter((connection) => connection.status === 'connected');
  const connectedProviders = new Set(connected.map((connection) => connection.provider));
  const coreConnected = expectedCore.filter((provider) => connectedProviders.has(provider as ProviderConnection['provider']));

  const issues: GrowthDataHealth['issues'] = [];
  for (const provider of expectedCore) {
    if (!connectedProviders.has(provider as ProviderConnection['provider'])) {
      issues.push({
        code: `missing_${provider}`,
        severity: provider === 'google_ads' || provider === 'google_analytics' ? 'high' : 'medium',
        message: `${provider.replace(/_/g, ' ')} is not connected.`,
        action: 'Open Connections',
      });
    }
  }

  let freshestMinutes: number | null = null;
  let freshnessPoints = 0;
  let freshnessDenominator = 0;
  for (const connection of connected) {
    const age = minutesSince(connection.last_sync_at);
    if (age !== null) {
      freshestMinutes = freshestMinutes === null ? age : Math.min(freshestMinutes, age);
      freshnessDenominator += 1;
      if (age <= 60) freshnessPoints += 100;
      else if (age <= 360) freshnessPoints += 80;
      else if (age <= 1440) freshnessPoints += 55;
      else freshnessPoints += 20;
      if (age > 1440) {
        issues.push({
          code: `stale_${connection.provider}`,
          severity: 'high',
          message: `${connection.provider.replace(/_/g, ' ')} has not synced in more than 24 hours.`,
          action: 'Sync Now',
        });
      }
    } else {
      issues.push({
        code: `never_synced_${connection.provider}`,
        severity: 'medium',
        message: `${connection.provider.replace(/_/g, ' ')} is connected but has not completed a sync.`,
        action: 'Sync Now',
      });
    }

    if (connection.status === 'error' || connection.last_sync_status === 'failed') {
      issues.push({
        code: `sync_error_${connection.provider}`,
        severity: 'high',
        message: connection.last_error || `${connection.provider.replace(/_/g, ' ')} sync is failing.`,
        action: 'Reconnect',
      });
    }
  }

  const connectionScore = Math.round((coreConnected.length / expectedCore.length) * 100);
  const freshnessScore = freshnessDenominator > 0 ? Math.round(freshnessPoints / freshnessDenominator) : 0;
  const attributionScore = attributionCoveragePct === null ? 0 : Math.max(0, Math.min(100, attributionCoveragePct));
  const score = Math.round(connectionScore * 0.4 + freshnessScore * 0.3 + attributionScore * 0.3);

  let state: GrowthDataHealth['state'] = 'unavailable';
  if (connected.length > 0) {
    if (issues.some((issue) => issue.code.startsWith('sync_error_'))) state = 'failed';
    else if (freshestMinutes !== null && freshestMinutes <= 60) state = 'fresh';
    else if (freshestMinutes !== null && freshestMinutes <= 360) state = 'delayed';
    else state = 'stale';
  }

  return {
    score,
    freshnessScore,
    connectionScore,
    attributionCoveragePct,
    state,
    lastUpdatedAt:
      connected
        .map((connection) => connection.last_sync_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null,
    issues,
  };
}
