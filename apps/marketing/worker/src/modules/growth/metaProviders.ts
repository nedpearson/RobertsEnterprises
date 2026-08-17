/**
 * Meta provider adapters: ad accounts + campaign insights, and Instagram /
 * Facebook organic presence.
 *
 * Pure with respect to persistence — these return rows shaped for the growth_*
 * tables and the route owns writing them.
 */
import { GRAPH_BASE } from './metaAuth';

/**
 * Meta rate-limits aggressively and returns transient 500s during insight
 * generation. A single failed request must not fail a whole sync, so retry with
 * backoff on 429/5xx only — never on 4xx, which means the request is wrong and
 * retrying just burns quota.
 */
async function graphGet<T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ ...params, access_token: accessToken });
  const url = `${GRAPH_BASE}/${path.replace(/^\//, '')}?${qs}`;

  let lastError = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    const text = await res.text();

    if (res.ok) return JSON.parse(text) as T;

    const retryable = res.status === 429 || res.status >= 500;
    lastError = `${res.status}: ${text.slice(0, 300)}`;
    if (!retryable) break;

    // 1s, 2s, 4s — enough to clear Meta's short rate windows.
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  throw new Error(`Meta Graph ${path} failed — ${lastError}`);
}

const centsFrom = (amount: unknown): number => Math.round(Number(amount ?? 0) * 100);
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Advertising                                                         */
/* ------------------------------------------------------------------ */

export interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
}

export async function listAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const data = await graphGet<{ data?: MetaAdAccount[] }>('me/adaccounts', accessToken, {
    fields: 'id,account_id,name,currency',
    limit: '50',
  });
  return data.data ?? [];
}

export interface MetaCampaign {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

export async function listCampaigns(accessToken: string, adAccountId: string): Promise<MetaCampaign[]> {
  const data = await graphGet<{ data?: MetaCampaign[] }>(`${adAccountId}/campaigns`, accessToken, {
    fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time',
    limit: '200',
  });
  return data.data ?? [];
}

export interface MetaInsightRow {
  campaign_id?: string;
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  frequency?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

/**
 * Daily campaign insights. time_increment=1 gives one row per campaign per day,
 * which is the grain growth_ad_metrics stores and the grain spend must be at for
 * attribution windows to be honest.
 */
export async function fetchCampaignInsights(
  accessToken: string,
  adAccountId: string,
  days: number,
): Promise<MetaInsightRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const data = await graphGet<{ data?: MetaInsightRow[] }>(`${adAccountId}/insights`, accessToken, {
    level: 'campaign',
    time_increment: '1',
    time_range: JSON.stringify({ since: dateOnly(since), until: dateOnly(new Date()) }),
    fields: 'campaign_id,date_start,spend,impressions,clicks,reach,frequency,ctr,cpc,cpm,actions,action_values',
    limit: '500',
  });
  return data.data ?? [];
}

/** Lead/purchase style conversions, summed across the action types that matter. */
const CONVERSION_ACTIONS = new Set([
  'lead',
  'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead',
  'schedule_total',
  'offsite_conversion.fb_pixel_complete_registration',
]);

export function summariseConversions(row: MetaInsightRow): { conversions: number; valueCents: number } {
  const conversions = (row.actions ?? [])
    .filter((a) => CONVERSION_ACTIONS.has(a.action_type))
    .reduce((s, a) => s + Number(a.value ?? 0), 0);
  const valueCents = (row.action_values ?? [])
    .filter((a) => CONVERSION_ACTIONS.has(a.action_type))
    .reduce((s, a) => s + centsFrom(a.value), 0);
  return { conversions, valueCents };
}

export function mapInsightToMetrics(row: MetaInsightRow, businessId: string, campaignId: string) {
  const { conversions, valueCents } = summariseConversions(row);
  return {
    business_id: businessId,
    campaign_id: campaignId,
    metric_date: row.date_start,
    spend_cents: centsFrom(row.spend),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    reach: Number(row.reach ?? 0),
    frequency: row.frequency ? Number(Number(row.frequency).toFixed(2)) : null,
    ctr: row.ctr ? Number((Number(row.ctr) / 100).toFixed(4)) : null,
    cpc_cents: centsFrom(row.cpc),
    cpm_cents: centsFrom(row.cpm),
    conversions,
    conversion_value_cents: valueCents,
  };
}

/* ------------------------------------------------------------------ */
/* Organic social                                                      */
/* ------------------------------------------------------------------ */

export interface FacebookPage {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: { id: string };
  followers_count?: number;
  link?: string;
}

export async function listPages(accessToken: string): Promise<FacebookPage[]> {
  const data = await graphGet<{ data?: FacebookPage[] }>('me/accounts', accessToken, {
    fields: 'id,name,access_token,followers_count,link,instagram_business_account',
    limit: '50',
  });
  return data.data ?? [];
}

export interface InstagramAccount {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

export async function fetchInstagramAccount(accessToken: string, igId: string): Promise<InstagramAccount> {
  return graphGet<InstagramAccount>(igId, accessToken, {
    fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count',
  });
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  insights?: { data?: Array<{ name: string; values?: Array<{ value: number }> }> };
}

export async function fetchInstagramMedia(accessToken: string, igId: string, limit = 50): Promise<InstagramMedia[]> {
  const data = await graphGet<{ data?: InstagramMedia[] }>(`${igId}/media`, accessToken, {
    fields:
      'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,' +
      'insights.metric(impressions,reach,saved,shares,video_views)',
    limit: String(limit),
  });
  return data.data ?? [];
}

const insightValue = (media: InstagramMedia, metric: string): number => {
  const entry = media.insights?.data?.find((d) => d.name === metric);
  return Number(entry?.values?.[0]?.value ?? 0);
};

export function mapInstagramPost(media: InstagramMedia, businessId: string, accountId: string) {
  const reach = insightValue(media, 'reach');
  const likes = Number(media.like_count ?? 0);
  const comments = Number(media.comments_count ?? 0);
  const saves = insightValue(media, 'saved');
  const shares = insightValue(media, 'shares');
  const engagements = likes + comments + saves + shares;

  return {
    business_id: businessId,
    account_id: accountId,
    platform: 'instagram',
    external_id: media.id,
    post_type: media.media_type ?? null,
    permalink: media.permalink ?? null,
    caption: media.caption ?? null,
    media_url: media.media_url ?? null,
    thumbnail_url: media.thumbnail_url ?? null,
    posted_at: media.timestamp ?? new Date().toISOString(),
    impressions: insightValue(media, 'impressions'),
    reach,
    likes,
    comments,
    shares,
    saves,
    video_views: insightValue(media, 'video_views'),
    // Rate against reach, not followers: reach is who actually saw it, and
    // follower-based rates flatter accounts with poor distribution.
    engagement_rate: reach > 0 ? Number((engagements / reach).toFixed(4)) : null,
    synced_at: new Date().toISOString(),
  };
}
