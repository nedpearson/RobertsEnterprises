/**
 * Growth provider routes: connect, callback, sync, status.
 *
 * Mounted at /api/growth. The frontend never talks to Google directly — it asks
 * this router for a consent URL and later reads rows out of the growth_* tables
 * through the normal RLS-protected client.
 */
import { Router } from 'express';
import { requireGrowthAccess, growthContextOf } from './auth';
import {
  buildConsentUrl,
  exchangeCode,
  PROVIDER_SCOPES,
  readOAuthConfig,
  signState,
  verifyState,
} from './googleAuth';
import { getAccessToken, saveTokens, startSyncRun, upsertConnection, db, upsertRows } from './store';
import { GRAPH_VERSION, META_SCOPES, buildMetaConsentUrl, exchangeForLongLived, exchangeMetaCode, readMetaConfig } from './metaAuth';
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
import {
  auditPage,
  fetchSearchAnalytics,
  listGbpAccounts,
  listGbpLocations,
  listGbpReviews,
  listSearchConsoleSites,
  mapGbpReview,
  replyToGbpReview,
  scoreListing,
  type PageAuditResult,
} from './providers';

export const growthRouter = Router();

const asString = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * Setup self-check. Hitting this after configuring Railway env vars tells you
 * exactly what is missing, without needing to read logs.
 */
growthRouter.get('/setup/status', (_req, res) => {
  const oauth = readOAuthConfig();
  const checks = [
    { key: 'GOOGLE_OAUTH_CLIENT_ID', ok: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID) },
    { key: 'GOOGLE_OAUTH_CLIENT_SECRET', ok: Boolean(process.env.GOOGLE_OAUTH_CLIENT_SECRET) },
    { key: 'GOOGLE_OAUTH_REDIRECT_URI', ok: Boolean(process.env.GOOGLE_OAUTH_REDIRECT_URI) },
    { key: 'PAGESPEED_API_KEY', ok: Boolean(process.env.PAGESPEED_API_KEY) },
    { key: 'META_APP_ID', ok: Boolean(process.env.META_APP_ID), optional: true },
    { key: 'META_APP_SECRET', ok: Boolean(process.env.META_APP_SECRET), optional: true },
    { key: 'META_OAUTH_REDIRECT_URI', ok: Boolean(process.env.META_OAUTH_REDIRECT_URI), optional: true },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { key: 'VITE_SUPABASE_URL', ok: Boolean(process.env.VITE_SUPABASE_URL) },
  ];
  // Optional keys gate a capability but must not make the whole setup "not ready".
  const missing = checks.filter((c) => !c.ok && !(c as { optional?: boolean }).optional).map((c) => c.key);
  const optionalMissing = checks.filter((c) => !c.ok && (c as { optional?: boolean }).optional).map((c) => c.key);

  // A redirect URI that does not point at THIS router silently breaks OAuth:
  // Google sends the code somewhere that cannot exchange it, and the user just
  // bounces back unconnected with no error anywhere. Check it explicitly.
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? null;
  const redirectOk = Boolean(redirectUri && /\/api\/growth\/callback\/?$/.test(redirectUri));
  const metaRedirectUri = process.env.META_OAUTH_REDIRECT_URI ?? null;
  const metaRedirectOk = !metaRedirectUri || /\/api\/growth\/callback-meta\/?$/.test(metaRedirectUri);
  const warnings: string[] = [];
  if (metaRedirectUri && !metaRedirectOk) {
    warnings.push(
      `META_OAUTH_REDIRECT_URI is "${metaRedirectUri}" but the Meta callback is served at /api/growth/callback-meta.`,
    );
  }
  if (optionalMissing.length) {
    warnings.push(`Meta advertising and social sync are disabled until these are set: ${optionalMissing.join(', ')}.`);
  }
  if (redirectUri && !redirectOk) {
    warnings.push(
      `GOOGLE_OAUTH_REDIRECT_URI is "${redirectUri}" but the callback is served at /api/growth/callback. ` +
        'OAuth will fail. Set it to <origin>/api/growth/callback in BOTH Railway and the Google Cloud OAuth client.',
    );
  }

  res.status(missing.length === 0 && redirectOk ? 200 : 503).json({
    ready: missing.length === 0 && redirectOk,
    oauthConfigured: Boolean(oauth),
    redirectUri,
    redirectUriValid: redirectOk,
    expectedRedirectPath: '/api/growth/callback',
    warnings,
    missing,
    optionalMissing,
    metaConfigured: Boolean(readMetaConfig()),
    metaGraphVersion: GRAPH_VERSION,
    checks,
    providers: {
      google_search_console: { requiresGoogleApproval: false },
      google_analytics: { requiresGoogleApproval: false },
      pagespeed: { requiresGoogleApproval: false, requiresOAuth: false },
      google_business_profile: {
        requiresGoogleApproval: true,
        note: 'Business Profile APIs need an approved access request. Until approved the quota is 0 QPM and every call returns 403.',
      },
      meta_ads: {
        requiresAppReview: true,
        note: 'Under Standard Access, Meta exposes only ad accounts belonging to users with a role on your app — enough for your own account. App Review + Business Verification is required to onboard other tenants.',
      },
      meta_social: {
        requiresAppReview: true,
        note: 'Same Standard Access rule as meta_ads: your own Pages and linked Instagram accounts work immediately.',
      },
    },
  });
});

/** Verifies the schema migration actually landed before anyone debugs the UI. */
growthRouter.get('/setup/schema', async (_req, res) => {
  const tables = [
    'growth_provider_connections',
    'growth_sync_runs',
    'growth_local_listings',
    'growth_local_metrics',
    'growth_reviews',
    'growth_search_metrics',
    'growth_seo_audits',
    'growth_seo_page_results',
    'growth_attribution_touchpoints',
    'growth_channel_spend',
    'growth_social_accounts',
    'growth_social_posts',
    'growth_social_metrics',
    'growth_ad_campaigns',
    'growth_ad_metrics',
  ];
  const results: Record<string, string> = {};
  for (const t of tables) {
    const { error } = await db().from(t).select('*', { count: 'exact', head: true }).limit(1);
    results[t] = error ? `MISSING (${error.message})` : 'ok';
  }
  const missing = Object.entries(results).filter(([, v]) => v !== 'ok').map(([k]) => k);
  res.status(missing.length ? 503 : 200).json({
    migrationApplied: missing.length === 0,
    missing,
    tables: results,
    hint: missing.length
      ? 'Apply the growth migrations (20260829000000_growth_foundation.sql and 20260830000000_growth_social_and_meta.sql) to this project.'
      : undefined,
  });
});

/** Step 1: hand the browser a Google consent URL. */
growthRouter.get('/connect/:provider', requireGrowthAccess, async (req, res) => {
  // Express 5 types route params as string | string[]; this route has one value.
  const provider = String(req.params.provider);
  const { businessId } = growthContextOf(req);

  const scopes = PROVIDER_SCOPES[provider];
  if (!scopes) return res.status(400).json({ error: `Unsupported provider: ${provider}` });

  const config = readOAuthConfig();
  if (!config) return res.status(503).json({ error: 'Google OAuth is not configured on this worker.' });

  try {
    // Marking the connection 'pending' is bookkeeping only — the callback does
    // the authoritative upsert. A transient database problem must not stop a
    // user from starting OAuth, so this failure is logged, not fatal.
    await upsertConnection(businessId, provider, { status: 'pending', scopes }).catch((err) => {
      console.warn('[growth] could not mark connection pending (continuing):', err instanceof Error ? err.message : err);
    });

    const state = await signState({ businessId, provider, nonce: String(Date.now()) });
    return res.json({ url: buildConsentUrl(config, scopes, state, asString(req.query.loginHint) ?? undefined) });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** Step 2: Google redirects here with ?code&state. */
growthRouter.get('/callback', async (req, res) => {
  const code = asString(req.query.code);
  const state = asString(req.query.state);
  const oauthError = asString(req.query.error);
  const appUrl = process.env.PUBLIC_APP_URL || 'https://vowos.bridgebox.ai';

  if (oauthError) return res.redirect(`${appUrl}/growth?connected=0&error=${encodeURIComponent(oauthError)}`);
  if (!code || !state) return res.status(400).send('Missing code or state.');

  const payload = await verifyState(state);
  if (!payload?.businessId || !payload.provider) {
    // A forged or tampered state must never attach an account to a tenant.
    return res.status(400).send('Invalid state.');
  }

  const config = readOAuthConfig();
  if (!config) return res.status(503).send('Google OAuth is not configured.');

  try {
    const tokens = await exchangeCode(config, code);
    const connection = await upsertConnection(payload.businessId, payload.provider, {
      status: 'connected',
      connected_at: new Date().toISOString(),
      last_error: null,
      scopes: tokens.scope ? tokens.scope.split(' ') : PROVIDER_SCOPES[payload.provider] ?? [],
    } as never);
    await saveTokens(connection.id, tokens);
    return res.redirect(`${appUrl}/growth?connected=1&provider=${encodeURIComponent(payload.provider)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await upsertConnection(payload.businessId, payload.provider, { status: 'error', last_error: message });
    return res.redirect(`${appUrl}/growth?connected=0&error=${encodeURIComponent(message)}`);
  }
});

async function connectionFor(businessId: string, provider: string) {
  const { data } = await db()
    .from('growth_provider_connections')
    .select('*')
    .eq('business_id', businessId)
    .eq('provider', provider)
    .maybeSingle();
  return data as { id: string; metadata: Record<string, unknown> } | null;
}

/** Search Console sync. Available immediately — no Google approval needed. */
growthRouter.post('/sync/search-console', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);

  const connection = await connectionFor(businessId, 'google_search_console');
  if (!connection) return res.status(400).json({ error: 'Search Console is not connected for this business.' });

  const run = await startSyncRun(businessId, connection.id, 'google_search_console', 'search_analytics');
  try {
    const token = await getAccessToken(connection.id);
    const requested = asString(req.body?.siteUrl);
    const sites = await listSearchConsoleSites(token);
    const siteUrl = requested ?? sites[0]?.siteUrl;
    if (!siteUrl) throw new Error('No Search Console properties are available to this Google account.');

    const rows = await fetchSearchAnalytics(token, siteUrl, businessId, connection.id, Number(req.body?.days ?? 28));
    const written = await upsertRows(
      'growth_search_metrics',
      rows,
      'business_id,site_url,metric_date,query,page,device,country',
    );
    await run.finish('success', written);
    return res.json({ ok: true, siteUrl, rowsWritten: written, availableSites: sites.map((s) => s.siteUrl) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await run.finish('failed', 0, message);
    return res.status(502).json({ ok: false, error: message });
  }
});

/** PageSpeed audit. No OAuth at all — API key only. */
growthRouter.post('/sync/seo-audit', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const siteUrl = asString(req.body?.siteUrl);
  if (!siteUrl) return res.status(400).json({ error: 'siteUrl is required' });

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'PAGESPEED_API_KEY is not configured on this worker.' });

  const paths: string[] = Array.isArray(req.body?.paths) && req.body.paths.length ? req.body.paths : ['/'];
  const run = await startSyncRun(businessId, null, 'pagespeed', 'seo_audit');

  const { data: auditRow, error: auditErr } = await db()
    .from('growth_seo_audits')
    .insert({ business_id: businessId, site_url: siteUrl, source: 'pagespeed', status: 'running' })
    .select('id')
    .single();
  if (auditErr) {
    await run.finish('failed', 0, auditErr.message);
    return res.status(500).json({ error: auditErr.message });
  }
  const auditId = (auditRow as { id: string }).id;

  try {
    const results: PageAuditResult[] = [];
    // Metadata is fetched alongside each PageSpeed run. A metadata failure must
    // not fail the audit — a page can be slow AND unshareable, and losing the
    // performance numbers because a HEAD request 403'd helps nobody.
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
    const overall = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
    const issues = results.reduce((n, r) => n + r.issues.length, 0);

    await db()
      .from('growth_seo_audits')
      .update({
        status: 'complete',
        overall_score: overall,
        pages_crawled: results.length,
        issues_count: issues,
        finished_at: new Date().toISOString(),
      })
      .eq('id', auditId);

    await run.finish('success', pageRows.length);
    return res.json({ ok: true, auditId, pagesCrawled: results.length, overallScore: overall, issues });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db().from('growth_seo_audits').update({ status: 'failed', error: message, finished_at: new Date().toISOString() }).eq('id', auditId);
    await run.finish('failed', 0, message);
    return res.status(502).json({ ok: false, error: message });
  }
});

/** Business Profile sync: listings + reviews. Blocked until Google approves access. */
growthRouter.post('/sync/business-profile', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);

  const connection = await connectionFor(businessId, 'google_business_profile');
  if (!connection) return res.status(400).json({ error: 'Google Business Profile is not connected for this business.' });

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
    return res.json({ ok: true, recordsWritten: written });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const approvalHint = /403|quota|permission/i.test(message)
      ? ' This usually means the Business Profile API access request has not been approved yet (quota shows 0 QPM until it is).'
      : '';
    await run.finish('failed', 0, message);
    return res.status(502).json({ ok: false, error: message + approvalHint });
  }
});

/** Publish a saved review reply back to Google. */
growthRouter.post('/reviews/:id/publish', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);

  const { data: review } = await db()
    .from('growth_reviews')
    .select('*')
    .eq('id', req.params.id)
    .eq('business_id', businessId)
    .maybeSingle();
  if (!review) return res.status(404).json({ error: 'Review not found.' });

  const row = review as { external_id: string; response_body: string | null; listing_id: string | null };
  if (!row.response_body) return res.status(400).json({ error: 'Save a reply before publishing.' });

  const connection = await connectionFor(businessId, 'google_business_profile');
  if (!connection) return res.status(400).json({ error: 'Google Business Profile is not connected.' });

  try {
    const token = await getAccessToken(connection.id);
    const { data: listing } = await db()
      .from('growth_local_listings')
      .select('external_id')
      .eq('id', row.listing_id)
      .maybeSingle();
    const locationName = (listing as { external_id: string } | null)?.external_id;
    if (!locationName) throw new Error('Listing is missing its Google location name.');

    const accounts = await listGbpAccounts(token);
    await replyToGbpReview(token, accounts[0].name, locationName, row.external_id, row.response_body);

    await db()
      .from('growth_reviews')
      .update({ response_sync_status: 'published', status: 'replied', responded_at: new Date().toISOString() })
      .eq('id', req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db().from('growth_reviews').update({ response_sync_status: `error: ${message.slice(0, 200)}` }).eq('id', req.params.id);
    return res.status(502).json({ ok: false, error: message });
  }
});

/* ==================================================================== */
/* Meta: advertising + organic social                                    */
/* ==================================================================== */

/** Meta consent URL. Separate route because Meta's dialog and scopes differ. */
growthRouter.get('/connect-meta/:provider', requireGrowthAccess, async (req, res) => {
  const provider = String(req.params.provider);
  const { businessId } = growthContextOf(req);

  const scopes = META_SCOPES[provider];
  if (!scopes) return res.status(400).json({ error: `Unsupported Meta provider: ${provider}` });

  const config = readMetaConfig();
  if (!config) return res.status(503).json({ error: 'META_APP_ID / META_APP_SECRET / META_OAUTH_REDIRECT_URI are not configured.' });

  await upsertConnection(businessId, provider, { status: 'pending', scopes }).catch((err) => {
    console.warn('[growth] could not mark Meta connection pending (continuing):', err instanceof Error ? err.message : err);
  });

  const state = await signState({ businessId, provider, nonce: String(Date.now()) });
  return res.json({ url: buildMetaConsentUrl(config, scopes, state) });
});

/** Meta redirects here. Protected by the same signed state as the Google flow. */
growthRouter.get('/callback-meta', async (req, res) => {
  const code = asString(req.query.code);
  const state = asString(req.query.state);
  const appUrl = process.env.PUBLIC_APP_URL || 'https://vowos.bridgebox.ai';

  if (asString(req.query.error)) {
    return res.redirect(`${appUrl}/growth?connected=0&error=${encodeURIComponent(String(req.query.error_description ?? req.query.error))}`);
  }
  if (!code || !state) return res.status(400).send('Missing code or state.');

  const payload = await verifyState(state);
  if (!payload?.businessId || !payload.provider) return res.status(400).send('Invalid state.');

  const config = readMetaConfig();
  if (!config) return res.status(503).send('Meta OAuth is not configured.');

  try {
    // Always upgrade to the long-lived token immediately. The short-lived one
    // expires in about an hour, so storing it would mean sync worked once.
    const short = await exchangeMetaCode(config, code);
    const long = await exchangeForLongLived(config, short.accessToken);

    const connection = await upsertConnection(payload.businessId, payload.provider, {
      status: 'connected',
      connected_at: new Date().toISOString(),
      last_error: null,
      scopes: META_SCOPES[payload.provider] ?? [],
    } as never);
    await saveTokens(connection.id, {
      accessToken: long.accessToken,
      refreshToken: null,
      tokenType: long.tokenType,
      expiresAt: long.expiresAt,
      scope: (META_SCOPES[payload.provider] ?? []).join(' '),
    });
    return res.redirect(`${appUrl}/growth?connected=1&provider=${encodeURIComponent(payload.provider)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await upsertConnection(payload.businessId, payload.provider, { status: 'error', last_error: message });
    return res.redirect(`${appUrl}/growth?connected=0&error=${encodeURIComponent(message)}`);
  }
});

/** Meta Ads sync: campaigns + daily insights, and channel spend for attribution. */
growthRouter.post('/sync/meta-ads', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const days = Math.min(90, Number(req.body?.days ?? 30));

  const connection = await connectionFor(businessId, 'meta_ads');
  if (!connection) return res.status(400).json({ error: 'Meta Ads is not connected for this business.' });

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

        // Roll every campaign's daily spend into one "Meta" channel row so
        // ROAS and attribution keep reading a single table per channel.
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
      // Matches uq_growth_spend_grain, which uses COALESCE(campaign,'').
      written += await upsertRows('growth_channel_spend', spendRows, 'business_id,channel,campaign,spend_date');
    }

    await run.finish('success', written);
    return res.json({ ok: true, adAccounts: accounts.length, recordsWritten: written, spendDays: spendRows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await run.finish('failed', 0, message);
    return res.status(502).json({ ok: false, error: metaHint(message) });
  }
});

/** Organic social sync: Facebook pages and their linked Instagram accounts. */
growthRouter.post('/sync/social', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);

  const connection = await connectionFor(businessId, 'meta_social');
  if (!connection) return res.status(400).json({ error: 'Meta social is not connected for this business.' });

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
        [{
          business_id: businessId,
          account_id: (fbAccount as { id: string }).id,
          metric_date: today,
          followers: Number(page.followers_count ?? 0),
        }],
        'account_id,metric_date',
      );

      const igId = page.instagram_business_account?.id;
      if (!igId) continue;

      // Page tokens are what Instagram Graph calls expect; fall back to the
      // user token when Meta did not return one for this page.
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
        [{
          business_id: businessId,
          account_id: igAccountId,
          metric_date: today,
          followers: Number(ig.followers_count ?? 0),
        }],
        'account_id,metric_date',
      );

      const media = await fetchInstagramMedia(pageToken, igId, Number(req.body?.postLimit ?? 50));
      if (media.length) {
        written += await upsertRows(
          'growth_social_posts',
          media.map((m) => mapInstagramPost(m, businessId, igAccountId)),
          'business_id,platform,external_id',
        );
      }
    }

    await run.finish('success', written);
    return res.json({ ok: true, pages: pages.length, recordsWritten: written });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await run.finish('failed', 0, message);
    return res.status(502).json({ ok: false, error: metaHint(message) });
  }
});

/**
 * Meta's permission errors are famously opaque. Under Standard Access the app
 * can only read assets owned by users with a role on it, so "(#200)" or
 * "(#10)" almost always means App Review, not a code bug.
 */
function metaHint(message: string): string {
  if (/#200|#10|#294|permission|OAuthException/i.test(message)) {
    return (
      message +
      ' — under Standard Access, Meta only exposes ad accounts and Pages belonging to users who hold a role on the app. ' +
      'Add the user as an app Admin/Developer/Tester, or complete App Review + Business Verification to read other tenants.'
    );
  }
  return message;
}
