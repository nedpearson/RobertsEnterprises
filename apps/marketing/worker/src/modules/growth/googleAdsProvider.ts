const GOOGLE_ADS_API_VERSION = 'v25';
const GOOGLE_ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export interface GoogleAdsConfig {
  developerToken: string;
  loginCustomerId?: string;
}

export interface GoogleAdsDailyCampaignRow {
  externalCampaignId: string;
  name: string;
  status: string | null;
  objective: string | null;
  dailyBudgetCents: number | null;
  startedAt: string | null;
  endedAt: string | null;
  metricDate: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  platformConversions: number;
  platformConversionValueCents: number;
}

export function readGoogleAdsConfig(): GoogleAdsConfig | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (!developerToken) return null;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/\D/g, '') || undefined;
  return { developerToken, loginCustomerId };
}

const customerIdOfResource = (resourceName: string) => resourceName.split('/').at(-1)?.replace(/\D/g, '') || '';

function headers(accessToken: string, config: GoogleAdsConfig, loginCustomerId?: string): Record<string, string> {
  const loginId = (loginCustomerId || config.loginCustomerId || '').replace(/\D/g, '');
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'developer-token': config.developerToken,
    ...(loginId ? { 'login-customer-id': loginId } : {}),
  };
}

async function googleAdsError(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const error = body.error as Record<string, unknown> | undefined;
  const message = String(error?.message ?? `Google Ads API returned ${res.status}`);
  const details = Array.isArray(error?.details) ? JSON.stringify(error?.details).slice(0, 1200) : '';
  return new Error(details ? `${message} — ${details}` : message);
}

/** Directly accessible accounts for the authenticated Google user. */
export async function listAccessibleGoogleAdsCustomers(
  accessToken: string,
  config: GoogleAdsConfig,
): Promise<string[]> {
  const res = await fetch(`${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`, {
    method: 'GET',
    headers: headers(accessToken, config),
  });
  if (!res.ok) throw await googleAdsError(res);
  const json = (await res.json()) as { resourceNames?: string[] };
  return (json.resourceNames ?? []).map(customerIdOfResource).filter(Boolean);
}

interface SearchStreamChunk {
  results?: Array<{
    campaign?: {
      id?: string;
      name?: string;
      status?: string;
      advertisingChannelType?: string;
      startDate?: string;
      endDate?: string;
    };
    campaignBudget?: { amountMicros?: string | number };
    segments?: { date?: string };
    metrics?: {
      impressions?: string | number;
      clicks?: string | number;
      costMicros?: string | number;
      conversions?: string | number;
      conversionsValue?: string | number;
    };
  }>;
}

export async function googleAdsSearchStream(
  accessToken: string,
  config: GoogleAdsConfig,
  customerId: string,
  query: string,
  loginCustomerId?: string,
): Promise<SearchStreamChunk[]> {
  const cleanCustomerId = customerId.replace(/\D/g, '');
  if (!cleanCustomerId) throw new Error('A Google Ads customer ID is required.');
  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${cleanCustomerId}/googleAds:searchStream`, {
    method: 'POST',
    headers: headers(accessToken, config, loginCustomerId),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw await googleAdsError(res);
  const json = (await res.json()) as SearchStreamChunk[];
  return Array.isArray(json) ? json : [];
}

const centsFromMicros = (value: string | number | undefined): number => {
  const micros = Number(value ?? 0);
  return Number.isFinite(micros) ? Math.round(micros / 10_000) : 0;
};
const centsFromCurrency = (value: string | number | undefined): number => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

export async function fetchGoogleAdsCampaignDaily(
  accessToken: string,
  config: GoogleAdsConfig,
  customerId: string,
  days = 30,
  loginCustomerId?: string,
): Promise<GoogleAdsDailyCampaignRow[]> {
  const boundedDays = Math.max(1, Math.min(90, Math.floor(days)));
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (boundedDays - 1));
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.start_date,
      campaign.end_date,
      campaign_budget.amount_micros,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date, campaign.id
  `.replace(/\s+/g, ' ').trim();

  const chunks = await googleAdsSearchStream(accessToken, config, customerId, query, loginCustomerId);
  const rows: GoogleAdsDailyCampaignRow[] = [];
  for (const chunk of chunks) {
    for (const result of chunk.results ?? []) {
      const campaign = result.campaign;
      const date = result.segments?.date;
      if (!campaign?.id || !date) continue;
      rows.push({
        externalCampaignId: String(campaign.id),
        name: campaign.name || `Campaign ${campaign.id}`,
        status: campaign.status ?? null,
        objective: campaign.advertisingChannelType ?? null,
        dailyBudgetCents: result.campaignBudget?.amountMicros == null ? null : centsFromMicros(result.campaignBudget.amountMicros),
        startedAt: campaign.startDate ? `${campaign.startDate}T00:00:00.000Z` : null,
        endedAt: campaign.endDate ? `${campaign.endDate}T23:59:59.999Z` : null,
        metricDate: date,
        spendCents: centsFromMicros(result.metrics?.costMicros),
        impressions: Number(result.metrics?.impressions ?? 0),
        clicks: Number(result.metrics?.clicks ?? 0),
        platformConversions: Number(result.metrics?.conversions ?? 0),
        platformConversionValueCents: centsFromCurrency(result.metrics?.conversionsValue),
      });
    }
  }
  return rows;
}

export const GOOGLE_ADS_PROVIDER_VERSION = GOOGLE_ADS_API_VERSION;
