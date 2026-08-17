/**
 * Growth data access.
 *
 * Every query goes through the shared `supabase` client. In the demo data plane
 * that client is proxied to the in-memory demo database, so these functions
 * return synthetic rows in /demoapp and real tenant rows for a signed-in
 * business — same code path, no `if (isDemo)` anywhere in the UI.
 *
 * RLS does the tenant filtering server-side; the explicit business_id filters
 * here are belt-and-braces so a misconfigured policy cannot leak across tenants
 * through this layer, and so the demo database (which has no RLS) scopes too.
 */
import { supabase, getActiveDataPlane } from '@/lib/supabase';
import type {
  AttributionTouchpoint,
  ChannelPerformance,
  ChannelSpend,
  GrowthReview,
  GrowthSummary,
  LocalListing,
  LocalMetric,
  ProviderConnection,
  SearchMetric,
  SeoAudit,
  SeoPageResult,
} from './types';

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const dateDaysAgo = (days: number) => isoDaysAgo(days).slice(0, 10);

/** Supabase returns `{ data, error }`; treat an error as an empty result but surface it. */
function unwrap<T>(result: { data: T[] | null; error: unknown }, context: string): T[] {
  if (result.error) {
    console.error(`[growth] ${context} failed`, result.error);
    return [];
  }
  return (result.data as T[]) ?? [];
}

export async function fetchConnections(businessId: string): Promise<ProviderConnection[]> {
  return unwrap<ProviderConnection>(
    await supabase.from('growth_provider_connections').select('*').eq('business_id', businessId),
    'fetchConnections',
  );
}

export async function fetchReviews(
  businessId: string,
  opts: { status?: string; limit?: number } = {},
): Promise<GrowthReview[]> {
  let q = supabase
    .from('growth_reviews')
    .select('*')
    .eq('business_id', businessId)
    .order('posted_at', { ascending: false });
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.limit) q = q.limit(opts.limit);
  return unwrap<GrowthReview>(await q, 'fetchReviews');
}

export async function saveReviewResponse(
  reviewId: string,
  responseBody: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('growth_reviews')
    .update({
      response_body: responseBody,
      status: 'replied',
      responded_at: new Date().toISOString(),
      response_sync_status: 'pending',
    })
    .eq('id', reviewId);
  return { error: error ? String((error as { message?: string }).message ?? error) : null };
}

/**
 * Publish a saved reply back to Google. The browser never holds a Google token —
 * the worker owns the credential and does the write-back.
 */
export async function publishReviewReply(
  businessId: string,
  reviewId: string,
): Promise<{ ok: boolean; error: string | null }> {
  // The demo sandbox has no session and must never reach a real provider. The
  // reply is already persisted in the demo database by saveReviewResponse, so
  // report success rather than showing an auth error in a sales demo.
  if (getActiveDataPlane() === 'demo') {
    return { ok: true, error: null };
  }

  // Growth routes run under the service role, so they authorise the caller from
  // this token and derive business_id from the membership - never from the body.
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { ok: false, error: 'Sign in again to publish this reply.' };

  try {
    const res = await fetch(`/api/growth/reviews/${encodeURIComponent(reviewId)}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ businessId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? `Publish failed (${res.status})` };
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchLocalListings(businessId: string): Promise<LocalListing[]> {
  return unwrap<LocalListing>(
    await supabase.from('growth_local_listings').select('*').eq('business_id', businessId),
    'fetchLocalListings',
  );
}

export async function fetchLocalMetrics(businessId: string, days = 30): Promise<LocalMetric[]> {
  return unwrap<LocalMetric>(
    await supabase
      .from('growth_local_metrics')
      .select('*')
      .eq('business_id', businessId)
      .gte('metric_date', dateDaysAgo(days))
      .order('metric_date', { ascending: true }),
    'fetchLocalMetrics',
  );
}

export async function fetchSearchMetrics(businessId: string, days = 28): Promise<SearchMetric[]> {
  return unwrap<SearchMetric>(
    await supabase
      .from('growth_search_metrics')
      .select('*')
      .eq('business_id', businessId)
      .gte('metric_date', dateDaysAgo(days))
      .order('metric_date', { ascending: true }),
    'fetchSearchMetrics',
  );
}

export async function fetchLatestAudit(businessId: string): Promise<SeoAudit | null> {
  const rows = unwrap<SeoAudit>(
    await supabase
      .from('growth_seo_audits')
      .select('*')
      .eq('business_id', businessId)
      .order('started_at', { ascending: false })
      .limit(1),
    'fetchLatestAudit',
  );
  return rows[0] ?? null;
}

export async function fetchAuditPages(businessId: string, auditId: string): Promise<SeoPageResult[]> {
  return unwrap<SeoPageResult>(
    await supabase
      .from('growth_seo_page_results')
      .select('*')
      .eq('business_id', businessId)
      .eq('audit_id', auditId),
    'fetchAuditPages',
  );
}

export async function fetchTouchpoints(businessId: string, days = 30): Promise<AttributionTouchpoint[]> {
  return unwrap<AttributionTouchpoint>(
    await supabase
      .from('growth_attribution_touchpoints')
      .select('*')
      .eq('business_id', businessId)
      .gte('occurred_at', isoDaysAgo(days))
      .order('occurred_at', { ascending: false }),
    'fetchTouchpoints',
  );
}

export async function fetchChannelSpend(businessId: string, days = 30): Promise<ChannelSpend[]> {
  return unwrap<ChannelSpend>(
    await supabase
      .from('growth_channel_spend')
      .select('*')
      .eq('business_id', businessId)
      .gte('spend_date', dateDaysAgo(days))
      .order('spend_date', { ascending: true }),
    'fetchChannelSpend',
  );
}

/**
 * Inputs the caller already has in VowosDataContext. Passing them in keeps this
 * function pure and testable rather than re-querying the same rows.
 */
export interface GrowthRollupInput {
  businessId: string;
  rangeDays: number;
  spend: ChannelSpend[];
  touchpoints: AttributionTouchpoint[];
  /** Revenue actually collected, keyed by lead or customer id. */
  revenueByCustomerCents: Record<string, number>;
  /** Ids of leads that converted into a booked appointment in range. */
  bookedLeadIds: Set<string>;
  /** Ids of customers created in range. */
  newCustomerIds: Set<string>;
}

/**
 * Last-touch attribution.
 *
 * Chosen deliberately: it is the only model that is honest with the data VowOS
 * owns today. Multi-touch requires reliable identity stitching across sessions,
 * which needs the analytics/ads connections to be live. When those land, add a
 * model selector here rather than changing call sites.
 */
export function rollUpChannels(input: GrowthRollupInput): GrowthSummary {
  const { spend, touchpoints, revenueByCustomerCents, bookedLeadIds, newCustomerIds } = input;

  const byChannel = new Map<string, ChannelPerformance>();
  const ensure = (channel: string): ChannelPerformance => {
    let row = byChannel.get(channel);
    if (!row) {
      row = {
        channel,
        spendCents: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        appointments: 0,
        customers: 0,
        revenueCents: 0,
        roas: null,
        cacCents: null,
      };
      byChannel.set(channel, row);
    }
    return row;
  };

  for (const s of spend) {
    const row = ensure(s.channel);
    row.spendCents += s.spend_cents ?? 0;
    row.impressions += s.impressions ?? 0;
    row.clicks += s.clicks ?? 0;
  }

  // Last touch per lead/customer wins.
  const lastTouchByEntity = new Map<string, AttributionTouchpoint>();
  for (const t of touchpoints) {
    const key = t.lead_id ?? t.customer_id;
    if (!key) continue;
    const existing = lastTouchByEntity.get(key);
    if (!existing || new Date(t.occurred_at) > new Date(existing.occurred_at)) {
      lastTouchByEntity.set(key, t);
    }
  }

  for (const [entityId, touch] of lastTouchByEntity) {
    const row = ensure(touch.channel);
    row.leads += 1;
    if (bookedLeadIds.has(entityId)) row.appointments += 1;
    if (newCustomerIds.has(entityId)) row.customers += 1;
    row.revenueCents += revenueByCustomerCents[entityId] ?? 0;
  }

  const channels = [...byChannel.values()]
    .map((row) => ({
      ...row,
      roas: row.spendCents > 0 ? row.revenueCents / row.spendCents : null,
      cacCents: row.spendCents > 0 && row.leads > 0 ? Math.round(row.spendCents / row.leads) : null,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents || b.spendCents - a.spendCents);

  const totalSpendCents = channels.reduce((s, c) => s + c.spendCents, 0);
  const attributedRevenueCents = channels.reduce((s, c) => s + c.revenueCents, 0);
  const leads = channels.reduce((s, c) => s + c.leads, 0);

  return {
    rangeDays: input.rangeDays,
    totalSpendCents,
    attributedRevenueCents,
    leads,
    bookedAppointments: channels.reduce((s, c) => s + c.appointments, 0),
    newCustomers: channels.reduce((s, c) => s + c.customers, 0),
    blendedRoas: totalSpendCents > 0 ? attributedRevenueCents / totalSpendCents : null,
    blendedCacCents: totalSpendCents > 0 && leads > 0 ? Math.round(totalSpendCents / leads) : null,
    channels,
    isEmpty: totalSpendCents === 0 && touchpoints.length === 0,
  };
}
