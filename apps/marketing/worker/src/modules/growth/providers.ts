/**
 * Provider adapters. Each one fetches from a Google API and returns rows shaped
 * for a growth_* table. They are pure with respect to persistence — the sync
 * runner owns writing — so they can be tested against recorded fixtures.
 *
 * Availability, verified 2026-08-17:
 *   - Search Console API : enable in Cloud Console, no approval needed.
 *   - PageSpeed Insights : enable in Cloud Console, API key, no approval, no OAuth.
 *   - Business Profile   : REQUIRES an approved access request (verified profile
 *                          owned 60+ days). Until approved, quota is 0 QPM and
 *                          every call 403s. Code below is complete and correct;
 *                          it simply cannot run before Google approves.
 */

const SC_API = 'https://searchconsole.googleapis.com/webmasters/v3';
const GBP_ACCOUNTS_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const GBP_INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GBP_LEGACY_API = 'https://mybusiness.googleapis.com/v4';
const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const text = await res.text();
  if (!res.ok) {
    // Surface Google's own message; "insufficient quota" here almost always
    // means the Business Profile access request has not been approved yet.
    throw new Error(`${res.status} ${res.statusText} from ${new URL(url).pathname}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text) as T;
}

const yyyymmdd = (d: Date) => d.toISOString().slice(0, 10);
export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

/* ------------------------------------------------------------------ */
/* Search Console                                                      */
/* ------------------------------------------------------------------ */

export async function listSearchConsoleSites(accessToken: string): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const data = await googleGet<{ siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }>(
    `${SC_API}/sites`,
    accessToken,
  );
  return data.siteEntry ?? [];
}

export interface SearchMetricRow {
  business_id: string;
  connection_id: string;
  site_url: string;
  metric_date: string;
  query: string | null;
  page: string | null;
  device: string | null;
  country: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
}

/**
 * Search Console data lags ~2 days; requesting up to today returns partial rows
 * that later change, so the window ends at T-2 to keep upserts stable.
 */
export async function fetchSearchAnalytics(
  accessToken: string,
  siteUrl: string,
  businessId: string,
  connectionId: string,
  days = 28,
): Promise<SearchMetricRow[]> {
  const rows: SearchMetricRow[] = [];
  const startDate = yyyymmdd(daysAgo(days + 2));
  const endDate = yyyymmdd(daysAgo(2));
  const ROW_LIMIT = 5000;

  let startRow = 0;
  for (;;) {
    const res = await fetch(`${SC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['date', 'query', 'page', 'device', 'country'],
        rowLimit: ROW_LIMIT,
        startRow,
      }),
    });
    if (!res.ok) {
      throw new Error(`Search Console query failed (${res.status}): ${(await res.text()).slice(0, 400)}`);
    }
    const json = (await res.json()) as {
      rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
    };
    const batch = json.rows ?? [];
    for (const r of batch) {
      const [date, query, page, device, country] = r.keys;
      rows.push({
        business_id: businessId,
        connection_id: connectionId,
        site_url: siteUrl,
        metric_date: date,
        query: query ?? null,
        page: page ?? null,
        device: device ?? null,
        country: country ?? null,
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: Number((r.ctr ?? 0).toFixed(4)),
        position: r.position ?? null,
      });
    }
    if (batch.length < ROW_LIMIT) break;
    startRow += ROW_LIMIT;
    if (startRow >= 50_000) break; // hard stop; a boutique site never exceeds this
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* PageSpeed Insights (no OAuth — API key only)                        */
/* ------------------------------------------------------------------ */

export interface PageAuditResult {
  url: string;
  performance_score: number | null;
  seo_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  lcp_ms: number | null;
  inp_ms: number | null;
  cls: number | null;
  ttfb_ms: number | null;
  title: string | null;
  issues: Array<{ code: string; severity: 'high' | 'medium' | 'low'; message: string }>;
}

const scoreOf = (categories: Record<string, { score?: number }>, key: string): number | null => {
  const raw = categories?.[key]?.score;
  return typeof raw === 'number' ? Math.round(raw * 100) : null;
};

export async function auditPage(url: string, apiKey: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PageAuditResult> {
  const params = new URLSearchParams({ url, key: apiKey, strategy });
  for (const c of ['performance', 'seo', 'accessibility', 'best-practices']) params.append('category', c);

  const res = await fetch(`${PSI_API}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`PageSpeed Insights failed for ${url} (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    lighthouseResult?: {
      categories?: Record<string, { score?: number }>;
      audits?: Record<string, { numericValue?: number; score?: number; title?: string }>;
    };
  };

  const lh = json.lighthouseResult ?? {};
  const audits = lh.audits ?? {};
  const categories = lh.categories ?? {};
  const num = (k: string) => (typeof audits[k]?.numericValue === 'number' ? Math.round(audits[k]!.numericValue!) : null);

  const lcp = num('largest-contentful-paint');
  const cls = typeof audits['cumulative-layout-shift']?.numericValue === 'number'
    ? Number(audits['cumulative-layout-shift']!.numericValue!.toFixed(3))
    : null;

  const issues: PageAuditResult['issues'] = [];
  if (lcp !== null && lcp > 2500) {
    issues.push({
      code: 'lcp_slow',
      severity: lcp > 4000 ? 'high' : 'medium',
      message: `Largest Contentful Paint is ${(lcp / 1000).toFixed(1)}s — target is under 2.5s.`,
    });
  }
  if (cls !== null && cls > 0.1) {
    issues.push({
      code: 'cls_high',
      severity: cls > 0.25 ? 'high' : 'medium',
      message: `Cumulative Layout Shift is ${cls} — target is under 0.1.`,
    });
  }
  const seoScore = scoreOf(categories, 'seo');
  if (seoScore !== null && seoScore < 90) {
    issues.push({ code: 'seo_score_low', severity: seoScore < 70 ? 'high' : 'medium', message: `SEO score is ${seoScore}/100.` });
  }

  return {
    url,
    performance_score: scoreOf(categories, 'performance'),
    seo_score: seoScore,
    accessibility_score: scoreOf(categories, 'accessibility'),
    best_practices_score: scoreOf(categories, 'best-practices'),
    lcp_ms: lcp,
    inp_ms: num('interaction-to-next-paint') ?? num('max-potential-fid'),
    cls,
    ttfb_ms: num('server-response-time'),
    title: audits['document-title']?.title ?? null,
    issues,
  };
}

/* ------------------------------------------------------------------ */
/* Google Business Profile (approval-gated)                            */
/* ------------------------------------------------------------------ */

export async function listGbpAccounts(accessToken: string): Promise<Array<{ name: string; accountName: string }>> {
  const data = await googleGet<{ accounts?: Array<{ name: string; accountName: string }> }>(
    `${GBP_ACCOUNTS_API}/accounts`,
    accessToken,
  );
  return data.accounts ?? [];
}

export interface GbpLocation {
  name: string;
  title: string;
  storefrontAddress?: Record<string, unknown>;
  phoneNumbers?: { primaryPhone?: string };
  websiteUri?: string;
  categories?: { primaryCategory?: { displayName?: string }; additionalCategories?: Array<{ displayName?: string }> };
  regularHours?: Record<string, unknown>;
  metadata?: { hasVoiceOfMerchant?: boolean };
}

export async function listGbpLocations(accessToken: string, accountName: string): Promise<GbpLocation[]> {
  const readMask = [
    'name',
    'title',
    'storefrontAddress',
    'phoneNumbers',
    'websiteUri',
    'categories',
    'regularHours',
    'metadata',
  ].join(',');
  const data = await googleGet<{ locations?: GbpLocation[] }>(
    `${GBP_INFO_API}/${accountName}/locations?readMask=${encodeURIComponent(readMask)}&pageSize=100`,
    accessToken,
  );
  return data.locations ?? [];
}

/** Completeness drives the Local SEO tab's score and its issue list. */
export function scoreListing(loc: GbpLocation): { score: number; issues: PageAuditResult['issues'] } {
  const issues: PageAuditResult['issues'] = [];
  let score = 100;
  const penalise = (points: number, code: string, severity: 'high' | 'medium' | 'low', message: string) => {
    score -= points;
    issues.push({ code, severity, message });
  };

  if (!loc.websiteUri) penalise(15, 'missing_website', 'high', 'No website URL on the profile.');
  if (!loc.phoneNumbers?.primaryPhone) penalise(15, 'missing_phone', 'high', 'No primary phone number on the profile.');
  if (!loc.categories?.primaryCategory?.displayName) penalise(20, 'missing_category', 'high', 'No primary category set.');
  if (!loc.regularHours || Object.keys(loc.regularHours).length === 0) {
    penalise(15, 'missing_hours', 'high', 'Regular opening hours are not set.');
  }
  if (!loc.categories?.additionalCategories?.length) {
    penalise(10, 'no_secondary_categories', 'medium', 'No secondary categories — these widen discovery queries.');
  }
  if (!loc.storefrontAddress) penalise(10, 'missing_address', 'high', 'No storefront address on the profile.');

  return { score: Math.max(0, score), issues };
}

export interface GbpReview {
  reviewId: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string };
  starRating?: string;
  comment?: string;
  createTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
}

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export async function listGbpReviews(accessToken: string, accountName: string, locationName: string): Promise<GbpReview[]> {
  // Reviews still live on the legacy v4 surface; there is no v1 equivalent.
  const locationId = locationName.split('/').pop();
  const data = await googleGet<{ reviews?: GbpReview[] }>(
    `${GBP_LEGACY_API}/${accountName}/locations/${locationId}/reviews`,
    accessToken,
  );
  return data.reviews ?? [];
}

export function mapGbpReview(
  review: GbpReview,
  businessId: string,
  listingId: string,
): Record<string, unknown> {
  const rating = STAR_MAP[String(review.starRating)] ?? 3;
  const hasReply = Boolean(review.reviewReply?.comment);
  return {
    business_id: businessId,
    listing_id: listingId,
    source: 'google',
    external_id: review.reviewId,
    author_name: review.reviewer?.displayName ?? null,
    author_photo_url: review.reviewer?.profilePhotoUrl ?? null,
    rating,
    body: review.comment ?? null,
    posted_at: review.createTime ?? new Date().toISOString(),
    status: hasReply ? 'replied' : rating <= 2 ? 'flagged' : 'needs_reply',
    sentiment: rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative',
    response_body: review.reviewReply?.comment ?? null,
    responded_at: review.reviewReply?.updateTime ?? null,
  };
}

/** Write a reply back to Google. Used by the Reputation tab's publish action. */
export async function replyToGbpReview(
  accessToken: string,
  accountName: string,
  locationName: string,
  reviewId: string,
  comment: string,
): Promise<void> {
  const locationId = locationName.split('/').pop();
  const res = await fetch(`${GBP_LEGACY_API}/${accountName}/locations/${locationId}/reviews/${reviewId}/reply`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) {
    throw new Error(`Publishing review reply failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
}
