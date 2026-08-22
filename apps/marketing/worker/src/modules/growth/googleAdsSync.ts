import { db, getAccessToken, startSyncRun, upsertRows } from './store';
import {
  fetchGoogleAdsCampaignDaily,
  readGoogleAdsConfig,
  GOOGLE_ADS_PROVIDER_VERSION,
} from './googleAdsProvider';

interface ConnectionRow {
  id: string;
  external_account_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface GoogleAdsAccountMapping {
  id: string | null;
  external_account_id: string;
  location_id: string | null;
  is_primary: boolean;
  metadata: Record<string, unknown> | null;
}

export interface GoogleAdsSyncResult {
  customerId: string;
  locationId: string | null;
  campaigns: number;
  metricRows: number;
  recordsWritten: number;
}

async function googleAdsConnection(businessId: string): Promise<ConnectionRow | null> {
  const { data, error } = await db()
    .from('growth_provider_connections')
    .select('id,external_account_id,metadata')
    .eq('business_id', businessId)
    .eq('provider', 'google_ads')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ConnectionRow | null;
}

async function activeMappings(
  businessId: string,
  connectionId: string,
  customerId?: string,
): Promise<GoogleAdsAccountMapping[]> {
  let query = db()
    .from('growth_provider_account_mappings')
    .select('id,external_account_id,location_id,is_primary,metadata')
    .eq('business_id', businessId)
    .eq('connection_id', connectionId)
    .eq('provider', 'google_ads')
    .eq('status', 'active');
  if (customerId) query = query.eq('external_account_id', customerId.replace(/\D/g, ''));
  const { data, error } = await query.order('is_primary', { ascending: false }).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as GoogleAdsAccountMapping[];
}

async function syncOneAccount(
  businessId: string,
  connection: ConnectionRow,
  mapping: GoogleAdsAccountMapping,
  days: number,
  overrideLoginCustomerId?: string,
): Promise<GoogleAdsSyncResult> {
  const config = readGoogleAdsConfig();
  if (!config) throw new Error('Google Ads sync requires GOOGLE_ADS_DEVELOPER_TOKEN.');

  const customerId = mapping.external_account_id.replace(/\D/g, '');
  if (!customerId) throw new Error('Mapped Google Ads customer ID is empty.');
  const mappingMetadata = mapping.metadata ?? {};
  const connectionMetadata = connection.metadata ?? {};
  const loginCustomerId = String(
    overrideLoginCustomerId ?? mappingMetadata.loginCustomerId ?? connectionMetadata.loginCustomerId ?? '',
  ).replace(/\D/g, '') || undefined;

  const run = await startSyncRun(businessId, connection.id, 'google_ads', `campaigns_and_insights:${customerId}`);
  try {
    const token = await getAccessToken(connection.id);
    const rows = await fetchGoogleAdsCampaignDaily(token, config, customerId, days, loginCustomerId);
    const campaignUuidByExternal = new Map<string, string>();
    let written = 0;

    const uniqueCampaigns = new Map(rows.map((row) => [row.externalCampaignId, row]));
    for (const row of uniqueCampaigns.values()) {
      const { data, error } = await db()
        .from('growth_ad_campaigns')
        .upsert(
          {
            business_id: businessId,
            location_id: mapping.location_id,
            connection_id: connection.id,
            network: 'google_ads',
            external_id: row.externalCampaignId,
            ad_account_id: customerId,
            name: row.name,
            objective: row.objective,
            status: row.status,
            daily_budget_cents: row.dailyBudgetCents,
            started_at: row.startedAt,
            ended_at: row.endedAt,
            synced_at: new Date().toISOString(),
            metadata: {
              customerId,
              loginCustomerId: loginCustomerId ?? null,
              accountMappingId: mapping.id,
              apiVersion: GOOGLE_ADS_PROVIDER_VERSION,
            },
          },
          { onConflict: 'business_id,network,external_id' },
        )
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      campaignUuidByExternal.set(row.externalCampaignId, (data as { id: string }).id);
      written += 1;
    }

    // IMPORTANT: provider sync owns provider-reported columns only. Do not send
    // VowOS-verified lead/appointment/sale/revenue columns here, because doing
    // so on an upsert would erase reconciliation results on every ad sync.
    const metricRows = rows
      .map((row) => {
        const campaignId = campaignUuidByExternal.get(row.externalCampaignId);
        if (!campaignId) return null;
        return {
          business_id: businessId,
          campaign_id: campaignId,
          metric_date: row.metricDate,
          spend_cents: row.spendCents,
          impressions: row.impressions,
          clicks: row.clicks,
          conversions: Math.round(row.platformConversions),
          conversion_value_cents: row.platformConversionValueCents,
          platform_reported_conversions: row.platformConversions,
          synced_at: new Date().toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    if (metricRows.length) written += await upsertRows('growth_ad_metrics', metricRows, 'campaign_id,metric_date');

    // Channel spend remains the backward-compatible Growth Overview source.
    // Campaign-level UI reads growth_ad_metrics directly.
    const channelByDay = new Map<string, { spend: number; impressions: number; clicks: number }>();
    for (const row of rows) {
      const bucket = channelByDay.get(row.metricDate) ?? { spend: 0, impressions: 0, clicks: 0 };
      bucket.spend += row.spendCents;
      bucket.impressions += row.impressions;
      bucket.clicks += row.clicks;
      channelByDay.set(row.metricDate, bucket);
    }
    const channelName = mapping.location_id ? `Google Ads:${mapping.location_id}` : 'Google Ads';
    const spendRows = [...channelByDay.entries()].map(([date, value]) => ({
      business_id: businessId,
      connection_id: connection.id,
      channel: channelName,
      campaign: customerId,
      spend_date: date,
      spend_cents: value.spend,
      impressions: value.impressions,
      clicks: value.clicks,
      entry_source: 'synced',
    }));
    if (spendRows.length) written += await upsertRows('growth_channel_spend', spendRows, 'business_id,channel,campaign,spend_date');

    const now = new Date().toISOString();
    if (mapping.id) {
      await db()
        .from('growth_provider_account_mappings')
        .update({ last_sync_at: now, last_sync_status: 'success', last_error: null })
        .eq('business_id', businessId)
        .eq('id', mapping.id);
    }
    await run.finish('success', written);

    return {
      customerId,
      locationId: mapping.location_id,
      campaigns: uniqueCampaigns.size,
      metricRows: metricRows.length,
      recordsWritten: written,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const now = new Date().toISOString();
    if (mapping.id) {
      await db()
        .from('growth_provider_account_mappings')
        .update({ last_sync_at: now, last_sync_status: 'failed', last_error: message })
        .eq('business_id', businessId)
        .eq('id', mapping.id);
    }
    await run.finish('failed', 0, message);
    throw error;
  }
}

/**
 * Sync one mapped customer or every active Google Ads mapping for the business.
 * Sequential on purpose: manager accounts can expose many clients and Google's
 * API is rate limited. The scheduler therefore cannot stampede the API.
 */
export async function syncGoogleAdsForBusiness(
  businessId: string,
  options: { customerId?: string; days?: number; loginCustomerId?: string } = {},
): Promise<{ results: GoogleAdsSyncResult[]; recordsWritten: number }> {
  const config = readGoogleAdsConfig();
  if (!config) throw new Error('Google Ads sync requires GOOGLE_ADS_DEVELOPER_TOKEN.');
  const connection = await googleAdsConnection(businessId);
  if (!connection) throw new Error('Google Ads is not connected for this business.');

  const days = Math.max(1, Math.min(90, Math.floor(Number(options.days ?? 30))));
  let mappings = await activeMappings(businessId, connection.id, options.customerId);

  // Backward-compatible fallback for a previously selected account. New users
  // should always persist growth_provider_account_mappings.
  if (!mappings.length) {
    const fallbackCustomer = String(options.customerId ?? connection.external_account_id ?? '').replace(/\D/g, '');
    if (fallbackCustomer) {
      mappings = [{
        id: null,
        external_account_id: fallbackCustomer,
        location_id: null,
        is_primary: true,
        metadata: connection.metadata ?? {},
      }];
    }
  }
  if (!mappings.length) throw new Error('Google Ads is authorized but no customer account is mapped.');

  const results: GoogleAdsSyncResult[] = [];
  for (const mapping of mappings) {
    results.push(await syncOneAccount(businessId, connection, mapping, days, options.loginCustomerId));
  }

  const now = new Date().toISOString();
  const recordsWritten = results.reduce((sum, result) => sum + result.recordsWritten, 0);
  await db()
    .from('growth_provider_connections')
    .update({ status: 'connected', last_sync_at: now, last_sync_status: 'success', last_error: null })
    .eq('business_id', businessId)
    .eq('id', connection.id);

  return { results, recordsWritten };
}
