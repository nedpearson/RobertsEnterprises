/**
 * Sync jobs, extracted from the route handlers.
 *
 * WHY: the scheduler and the "Sync now" button must run byte-identical logic.
 * When these lived inside route handlers the only way to run them on a timer was
 * to duplicate them, and duplicated sync logic drifts — the manual button and
 * the nightly job would slowly start producing different rows.
 *
 * Each job owns its own growth_sync_runs record, so a failure is always recorded
 * even when the caller is a cron tick with nobody watching. They throw on
 * failure; callers decide whether that is a 502 or a logged alert.
 */
import {
  db,
  getAccessToken,
  startSyncRun,
  upsertRows,
} from './store';
import {
  auditPage,
  fetchSearchAnalytics,
  listGbpAccounts,
  listGbpLocations,
  listGbpReviews,
  listSearchConsoleSites,
  mapGbpReview,
  scoreListing,
  type PageAuditResult,
} from './providers';
import {
  fetchCampaignInsights,
  fetchInstagramAccount,
  fetchInstagramMedia,
  listAdAccounts,
  listCampaigns,
  listPages,
  mapInsightToMetrics,
  mapInstagramPost,
} from './metaProviders';
import { fetchPageMetadata } from './metadata';

export interface ConnectionRef {
  id: string;
  metadata: Record<string, unknown>;
}

export async function connectionFor(businessId: string, provider: string): Promise<ConnectionRef | null> {
  const { data } = await db()
    .from('growth_provider_connections')
    .select('*')
    .eq('business_id', businessId)
    .eq('provider', provider)
    .maybeSingle();
  return (data as ConnectionRef | null) ?? null;
}

/**
 * Meta's permission errors are famously opaque. Under Standard Access the app
 * can only read assets owned by users with a role on it, so "(#200)" or "(#10)"
 * almost always means App Review, not a code bug.
 */
export function metaHint(message: string): string {
  if (/#200|#10|#294|permission|OAuthException/i.test(message)) {
    return (
      message +
      ' — under Standard Access, Meta only exposes ad accounts and Pages belonging to users who hold a role on the app. ' +
      'Add the user as an app Admin/Developer/Tester, or complete App Review + Business Verification to read other tenants.'
    );
  }
  return message;
}

export class NotConnectedError extends Error {
  constructor(provider: string) {
    super(`${provider} is not connected for this business.`);
    this.name = 'NotConnectedError';
  }
}

/* ------------------------------------------------------------------ */
/* Search Console                                                      */
/* ------------------------------------------------------------------ */

export async function syncSearchConsole(
  businessId: string,
  opts: { siteUrl?: string | null; days?: number } = {},
): Promise<{ siteUrl: string; rowsWritten: number; availableSites: string[] }> {
  const connection = await connectionFor(businessId, 'google_search_console');
  if (!connection) throw new NotConnectedError('Search Console');

  const run = await startSyncRun(businessId, connection.id, 'google_search_console', 'search_analytics');
  try {
    const token = await getAccessToken(connection.id);
    const sites = await listSearchConsoleSites(token);
    const siteUrl = opts.siteUrl ?? sites[0]?.siteUrl;
    if (!siteUrl) throw new Error('No Search Console properties are available to this Google account.');

    const rows = await fetchSearchAnalytics(token, siteUrl, businessId, connection.id, opts.days ?? 28);
    const rowsWritten = await upsertRows(
      'growth_search_metrics',
      rows,
      'business_id,site_url,metric_date,query,page,device,country',
    );
    await run.finish('success', rowsWritten);
    return { siteUrl, rowsWritten, availableSites: sites.map((s) => s.siteUrl) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await run.finish('failed', 0, message);
    throw new Error(message);
  }
}

/* ------------------------------------------------------------------ */
/* PageSpeed + metadata audit                                          */
/* ------------------------------------------------------------------ */

export async function syncSeoAudit(
  businessId: string,
  siteUrl: string,
  paths: string[] = ['/'],
): Promise<{ auditId: string; pagesCrawled: number; overallScore: number | null; issues: number }> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) throw new Error('PAGESPEED_API_KEY is not configured on this worker.');

  const run = await startSyncRun(businessId, null, 'pagespeed', 'seo_audit');

  const { data: auditRow, error: auditErr } = await db()
    .from('growth_seo_audits')
    .insert({ business_id: businessId, site_url: siteUrl, source: 'pagespeed', status: 'running' })
    .select('id')
    .single();
  if (auditErr) {
    await run.finish('failed', 0, auditErr.message);
    throw new Error(auditErr.message);
  }
  const auditId = (auditRow as { id: string }).id;

  try {
    const results: PageAuditResult[] = [];
    // Metadata is fetched alongside each PageSpeed run. A metadata failure must
    // not fail the audit — a page can be slow AND unshareable, and losing the
    // performance numbers because one request 403'd helps nobody.
    const metaByUrl = new Map<string, Awaited<ReturnType<typeof fetchPageMetadata>>>();
    for (const path of paths.slice(0, 20)) {
      const target = new URL(path, siteUrl).toString();
      results.push(await auditPage(target, apiKey));
      try {
        metaByUrl.set(target, await fetchPageMetadata(target));
      } catch (metaErr) {
        console.warn('[growth] metadata fetch failed for', target, metaErr instanceof Error ? metaErr.message : metaErr);
      }
    }

    const pageRows = results.map((r) => ({
      business_id: businessId,
      audit_id: auditId,
      url: r.url,
      http_status: 200,
      indexable: true,
      performance_score: r.performance_score,
      seo_score: r.seo_score,
      accessibility_score: r.accessibility_score,
      best_practices_score: r.best_practices_score,
      lcp_ms: r.lcp_ms,
      inp_ms: r.inp_ms,
      cls: r.cls,
      ttfb_ms: r.ttfb_ms,
      title: r.title,
      issues: [...r.issues, ...(metaByUrl.get(r.url)?.issues ?? [])],
      og_title: metaByUrl.get(r.url)?.og_title ?? null,
      og_description: metaByUrl.get(r.url)?.og_description ?? null,
      og_image: metaByUrl.get(r.url)?.og_image ?? null,
      og_type: metaByUrl.get(r.url)?.og_type ?? null,
      twitter_card: metaByUrl.get(r.url)?.twitter_card ?? null,
      twitter_title: metaByUrl.get(r.url)?.twitter_title ?? null,
      twitter_image: metaByUrl.get(r.url)?.twitter_image ?? null,
      canonical_url: metaByUrl.get(r.url)?.canonical_url ?? null,
      robots_directives: metaByUrl.get(r.url)?.robots_directives ?? null,
      schema_types: metaByUrl.get(r.url)?.schema_types ?? [],
      social_score: metaByUrl.get(r.url)?.social_score ?? null,
    }));

    const { error: pagesErr } = await db().from('growth_seo_page_results').insert(pageRows);
    if (pagesErr) throw new Error(pagesErr.message);

    const scored = results.map((r) => r.performance_score ?? 0).filter(Boolean);
    const overallScore = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
    const issues = pageRows.reduce((n, r) => n + r.issues.length, 0);

    await db()
      .from('growth_seo_audits')
      .update({
        status: 'complete',
        overall_score: overallScore,
        pages_crawled: results.length,
        issues_count: issues,
        finished_at: new Date().toISOString(),
      })
      .eq('id', auditId);

    await run.finish('success', pageRows.length);
    return { auditId, pagesCrawled: results.length, overallScore, issues };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db()
      .from('growth_seo_audits')
      .update({ status: 'failed', error: message, finished_at: new Date().toISOString() })
      .eq('id', auditId);
    await run.finish('failed', 0, message);
    throw new Error(message);
  }
}

/* ------------------------------------------------------------------ */
/* Google Business Profile                                             */
/* ------------------------------------------------------------------ */

export async function syncBusinessProfile(businessId: string): Promise<{ recordsWritten: number }> {
  const connection = await connectionFor(businessId, 'google_business_profile');
  if (!connection) throw new NotConnectedError('Google Business Profile');

  const run = await startSyncRun(businessId, connection.id, 'google_business_profile', 'listings_and_reviews');
  try {
    const token = await getAccessToken(connection.id);
    const accounts = await listGbpAccounts(token);
    if (!accounts.length) throw new Error('No Business Profile accounts are visible to this Google account.');

    let written = 0;
    for (const account of accounts) {
      const locations = await listGbpLocations(token, account.name);
      for (const loc of locations) {
        const { score, issues } = scoreListing(loc);
        const { data: listing, error } = await db()
          .from('growth_local_listings')
          .upsert(
            {
              business_id: businessId,
              connection_id: connection.id,
              provider: 'google_business_profile',
              external_id: loc.name,
              title: loc.title,
              storefront_address: loc.storefrontAddress ?? {},
              phone: loc.phoneNumbers?.primaryPhone ?? null,
              website_url: loc.websiteUri ?? null,
              primary_category: loc.categories?.primaryCategory?.displayName ?? null,
              additional_categories: (loc.categories?.additionalCategories ?? [])
                .map((c) => c.displayName)
                .filter(Boolean),
              regular_hours: loc.regularHours ?? {},
              verification_state: loc.metadata?.hasVoiceOfMerchant ? 'VERIFIED' : 'UNVERIFIED',
              is_published: Boolean(loc.metadata?.hasVoiceOfMerchant),
              completeness_score: score,
              issues,
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'business_id,provider,external_id' },
          )
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        written += 1;

        const listingId = (listing as { id: string }).id;
        const reviews = await listGbpReviews(token, account.name, loc.name);
        if (reviews.length) {
          written += await upsertRows(
            'growth_reviews',
            reviews.map((r) => mapGbpReview(r, businessId, listingId)),
            'business_id,source,external_id',
          );
        }
      }
    }

    await run.finish('success', written);
    return { recordsWritten: written };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await run.finish('failed', 0, message);
    throw new Error(metaHint(message));
  }
}

/* ------------------------------------------------------------------ */
/* Meta Ads                                                            */
/* ------------------------------------------------------------------ */

export async function syncMetaAds(
  businessId: string,
  days = 30,
): Promise<{ adAccounts: number; recordsWritten: number; spendDays: number }> {
  const connection = await connectionFor(businessId, 'meta_ads');
  if (!connection) throw new NotConnectedError('Meta Ads');

  const run = await startSyncRun(businessId, connection.id, 'meta_ads', 'campaigns_and_insights');
  try {
    const token = await getAccessToken(connection.id);
    const accounts = await listAdAccounts(token);
    if (!accounts.length) throw new Error('No ad accounts are visible to this Meta user.');

    let written = 0;
    const spendByDay = new Map<string, { spend: number; impressions: number; clicks: number }>();

    for (const account of accounts) {
      const campaigns = await listCampaigns(token, account.id);
      const idMap = new Map<string, string>();

      for (const c of campaigns) {
        const { data, error } = await db()
          .from('growth_ad_campaigns')
          .upsert(
            {
              business_id: businessId,
              connection_id: connection.id,
              network: 'meta',
              external_id: c.id,
              ad_account_id: account.id,
              name: c.name,
              objective: c.objective ?? null,
              status: c.status ?? null,
              daily_budget_cents: c.daily_budget ? Number(c.daily_budget) : null,
              lifetime_budget_cents: c.lifetime_budget ? Number(c.lifetime_budget) : null,
              started_at: c.start_time ?? null,
              ended_at: c.stop_time ?? null,
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'business_id,network,external_id' },
          )
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        idMap.set(c.id, (data as { id: string }).id);
        written += 1;
      }

      const insights = await fetchCampaignInsights(token, account.id, days);
      const metricRows: Array<Record<string, unknown>> = [];
      for (const row of insights) {
        const campaignUuid = row.campaign_id ? idMap.get(row.campaign_id) : undefined;
        if (!campaignUuid) continue;
        const mapped = mapInsightToMetrics(row, businessId, campaignUuid);
        metricRows.push(mapped);

        // Roll every campaign's daily spend into one "Meta" channel row so ROAS
        // and attribution keep reading a single table per channel.
        const bucket = spendByDay.get(mapped.metric_date) ?? { spend: 0, impressions: 0, clicks: 0 };
        bucket.spend += mapped.spend_cents;
        bucket.impressions += mapped.impressions;
        bucket.clicks += mapped.clicks;
        spendByDay.set(mapped.metric_date, bucket);
      }
      if (metricRows.length) {
        written += await upsertRows('growth_ad_metrics', metricRows, 'campaign_id,metric_date');
      }
    }

    const spendRows = [...spendByDay.entries()].map(([date, v]) => ({
      business_id: businessId,
      connection_id: connection.id,
      channel: 'Meta',
      campaign: null,
      spend_date: date,
      spend_cents: v.spend,
      impressions: v.impressions,
      clicks: v.clicks,
      entry_source: 'synced',
    }));
    if (spendRows.length) {
      written += await upsertRows('growth_channel_spend', spendRows, 'business_id,channel,campaign,spend_date');
    }

    await run.finish('success', written);
    return { adAccounts: accounts.length, recordsWritten: written, spendDays: spendRows.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await run.finish('failed', 0, message);
    throw new Error(metaHint(message));
  }
}

/* ------------------------------------------------------------------ */
/* Organic social                                                      */
/* ------------------------------------------------------------------ */

export async function syncSocial(
  businessId: string,
  postLimit = 50,
): Promise<{ pages: number; recordsWritten: number }> {
  const connection = await connectionFor(businessId, 'meta_social');
  if (!connection) throw new NotConnectedError('Meta social');

  const run = await startSyncRun(businessId, connection.id, 'meta_social', 'accounts_and_posts');
  try {
    const token = await getAccessToken(connection.id);
    const pages = await listPages(token);
    if (!pages.length) throw new Error('No Facebook Pages are visible to this Meta user.');

    let written = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const page of pages) {
      const { data: fbAccount, error: fbErr } = await db()
        .from('growth_social_accounts')
        .upsert(
          {
            business_id: businessId,
            connection_id: connection.id,
            platform: 'facebook',
            external_id: page.id,
            display_name: page.name,
            profile_url: page.link ?? null,
            followers: Number(page.followers_count ?? 0),
            is_business_account: true,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'business_id,platform,external_id' },
        )
        .select('id')
        .single();
      if (fbErr) throw new Error(fbErr.message);
      written += 1;

      await upsertRows(
        'growth_social_metrics',
        [
          {
            business_id: businessId,
            account_id: (fbAccount as { id: string }).id,
            metric_date: today,
            followers: Number(page.followers_count ?? 0),
          },
        ],
        'account_id,metric_date',
      );

      const igId = page.instagram_business_account?.id;
      if (!igId) continue;

      // Page tokens are what Instagram Graph calls expect; fall back to the user
      // token when Meta did not return one for this page.
      const pageToken = page.access_token ?? token;
      const ig = await fetchInstagramAccount(pageToken, igId);

      const { data: igAccount, error: igErr } = await db()
        .from('growth_social_accounts')
        .upsert(
          {
            business_id: businessId,
            connection_id: connection.id,
            platform: 'instagram',
            external_id: ig.id,
            username: ig.username ?? null,
            display_name: ig.name ?? null,
            profile_url: ig.username ? `https://instagram.com/${ig.username}` : null,
            avatar_url: ig.profile_picture_url ?? null,
            followers: Number(ig.followers_count ?? 0),
            follows: Number(ig.follows_count ?? 0),
            media_count: Number(ig.media_count ?? 0),
            is_business_account: true,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'business_id,platform,external_id' },
        )
        .select('id')
        .single();
      if (igErr) throw new Error(igErr.message);
      written += 1;

      const igAccountId = (igAccount as { id: string }).id;
      await upsertRows(
        'growth_social_metrics',
        [
          {
            business_id: businessId,
            account_id: igAccountId,
            metric_date: today,
            followers: Number(ig.followers_count ?? 0),
          },
        ],
        'account_id,metric_date',
      );

      const media = await fetchInstagramMedia(pageToken, igId, postLimit);
      if (media.length) {
        written += await upsertRows(
          'growth_social_posts',
          media.map((m) => mapInstagramPost(m, businessId, igAccountId)),
          'business_id,platform,external_id',
        );
      }
    }

    await run.finish('success', written);
    return { pages: pages.length, recordsWritten: written };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await run.finish('failed', 0, message);
    throw new Error(metaHint(message));
  }
}
