import { Router } from 'express';
import { requireGrowthAccess, growthContextOf } from './auth';
import { db, getAccessToken, startSyncRun, upsertRows } from './store';
import {
  fetchGoogleAdsCampaignDaily,
  listAccessibleGoogleAdsCustomers,
  readGoogleAdsConfig,
  GOOGLE_ADS_PROVIDER_VERSION,
} from './googleAdsProvider';

export const googleAdsRouter = Router();

googleAdsRouter.use(requireGrowthAccess);

async function connectionFor(businessId: string) {
  const { data, error } = await db()
    .from('growth_provider_connections')
    .select('*')
    .eq('business_id', businessId)
    .eq('provider', 'google_ads')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as null | {
    id: string;
    external_account_id: string | null;
    metadata: Record<string, unknown> | null;
  };
}

/**
 * Lists Google Ads customers visible to the authorized Google user. This route
 * never persists a guessed account: the caller must select/map the customer.
 */
googleAdsRouter.get('/google-ads/accounts', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const config = readGoogleAdsConfig();
    if (!config) {
      return res.status(503).json({
        error: 'GOOGLE_ADS_DEVELOPER_TOKEN is not configured.',
        required: ['GOOGLE_ADS_DEVELOPER_TOKEN'],
      });
    }
    const connection = await connectionFor(businessId);
    if (!connection) return res.status(400).json({ error: 'Google Ads is not connected for this business.' });
    const token = await getAccessToken(connection.id);
    const customerIds = await listAccessibleGoogleAdsCustomers(token, config);
    return res.json({ apiVersion: GOOGLE_ADS_PROVIDER_VERSION, customerIds });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/** Select the exact customer account that belongs to this tenant/location. */
googleAdsRouter.post('/google-ads/select-account', async (req, res) => {
  try {
    const { businessId } = growthContextOf(req);
    const customerId = String(req.body?.customerId ?? '').replace(/\D/g, '');
    const loginCustomerId = String(req.body?.loginCustomerId ?? '').replace(/\D/g, '') || null;
    if (!customerId) return res.status(400).json({ error: 'customerId is required.' });

    const config = readGoogleAdsConfig();
    if (!config) return res.status(503).json({ error: 'GOOGLE_ADS_DEVELOPER_TOKEN is not configured.' });
    const connection = await connectionFor(businessId);
    if (!connection) return res.status(400).json({ error: 'Google Ads is not connected for this business.' });
    const token = await getAccessToken(connection.id);
    const accessible = await listAccessibleGoogleAdsCustomers(token, config);
    // Direct access list can contain manager accounts only. When a login manager
    // is supplied, validate that manager itself is accessible and let the first
    // sync verify access to the chosen client account.
    if (!accessible.includes(customerId) && (!loginCustomerId || !accessible.includes(loginCustomerId))) {
      return res.status(403).json({ error: 'The selected customer or manager account is not accessible to this Google user.' });
    }

    const metadata = {
      ...(connection.metadata ?? {}),
      selectedCustomerId: customerId,
      ...(loginCustomerId ? { loginCustomerId } : {}),
      adsApiVersion: GOOGLE_ADS_PROVIDER_VERSION,
    };
    const { error } = await db()
      .from('growth_provider_connections')
      .update({
        external_account_id: customerId,
        display_name: `Google Ads ${customerId}`,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)
      .eq('id', connection.id);
    if (error) throw new Error(error.message);
    return res.json({ ok: true, customerId, loginCustomerId });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

googleAdsRouter.post('/sync/google-ads', async (req, res) => {
  const { businessId } = growthContextOf(req);
  const config = readGoogleAdsConfig();
  if (!config) {
    return res.status(503).json({
      error: 'Google Ads sync requires a developer token.',
      required: ['GOOGLE_ADS_DEVELOPER_TOKEN'],
    });
  }

  let connection: Awaited<ReturnType<typeof connectionFor>>;
  try {
    connection = await connectionFor(businessId);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
  if (!connection) return res.status(400).json({ error: 'Google Ads is not connected for this business.' });

  const metadata = connection.metadata ?? {};
  const customerId = String(
    req.body?.customerId ?? metadata.selectedCustomerId ?? connection.external_account_id ?? '',
  ).replace(/\D/g, '');
  const loginCustomerId = String(req.body?.loginCustomerId ?? metadata.loginCustomerId ?? '').replace(/\D/g, '') || undefined;
  if (!customerId) {
    return res.status(409).json({
      error: 'Google Ads is authorized but no customer account has been selected.',
      action: 'GET /api/growth/google-ads/accounts then POST /api/growth/google-ads/select-account.',
    });
  }

  const days = Math.max(1, Math.min(90, Number(req.body?.days ?? 30)));
  const run = await startSyncRun(businessId, connection.id, 'google_ads', 'campaigns_and_insights');
  try {
    const token = await getAccessToken(connection.id);
    const rows = await fetchGoogleAdsCampaignDaily(token, config, customerId, days, loginCustomerId);
    const campaignUuidByExternal = new Map<string, string>();
    let written = 0;

    // Upsert unique campaigns first; daily rows repeat campaign metadata.
    const uniqueCampaigns = new Map(rows.map((row) => [row.externalCampaignId, row]));
    for (const row of uniqueCampaigns.values()) {
      const { data, error } = await db()
        .from('growth_ad_campaigns')
        .upsert(
          {
            business_id: businessId,
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
            metadata: { customerId, loginCustomerId: loginCustomerId ?? null, apiVersion: GOOGLE_ADS_PROVIDER_VERSION },
          },
          { onConflict: 'business_id,network,external_id' },
        )
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      campaignUuidByExternal.set(row.externalCampaignId, (data as { id: string }).id);
      written += 1;
    }

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
          // VowOS-verified funnel values are intentionally NOT copied from
          // Google's reported conversions. Reconciliation populates them later.
          leads: 0,
          qualified_leads: 0,
          appointments_booked: 0,
          appointments_attended: 0,
          sales: 0,
          revenue_cents: 0,
          gross_profit_cents: 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (metricRows.length) {
      written += await upsertRows('growth_ad_metrics', metricRows, 'campaign_id,metric_date');
    }

    const channelByDay = new Map<string, { spend: number; impressions: number; clicks: number }>();
    for (const row of rows) {
      const bucket = channelByDay.get(row.metricDate) ?? { spend: 0, impressions: 0, clicks: 0 };
      bucket.spend += row.spendCents;
      bucket.impressions += row.impressions;
      bucket.clicks += row.clicks;
      channelByDay.set(row.metricDate, bucket);
    }
    const spendRows = [...channelByDay.entries()].map(([date, value]) => ({
      business_id: businessId,
      connection_id: connection!.id,
      channel: 'Google Ads',
      campaign: null,
      spend_date: date,
      spend_cents: value.spend,
      impressions: value.impressions,
      clicks: value.clicks,
      entry_source: 'synced',
    }));
    if (spendRows.length) {
      written += await upsertRows('growth_channel_spend', spendRows, 'business_id,channel,campaign,spend_date');
    }

    await db()
      .from('growth_provider_connections')
      .update({
        status: 'connected',
        external_account_id: customerId,
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_error: null,
        metadata: {
          ...metadata,
          selectedCustomerId: customerId,
          loginCustomerId: loginCustomerId ?? null,
          adsApiVersion: GOOGLE_ADS_PROVIDER_VERSION,
        },
      })
      .eq('business_id', businessId)
      .eq('id', connection.id);

    await run.finish('success', written);
    return res.json({
      ok: true,
      apiVersion: GOOGLE_ADS_PROVIDER_VERSION,
      customerId,
      campaigns: uniqueCampaigns.size,
      metricRows: metricRows.length,
      recordsWritten: written,
      note: 'Platform conversions are stored separately. VowOS-verified sales/revenue require attribution reconciliation.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db()
      .from('growth_provider_connections')
      .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'failed', last_error: message })
      .eq('business_id', businessId)
      .eq('id', connection.id);
    await run.finish('failed', 0, message);
    return res.status(502).json({ ok: false, error: message });
  }
});
