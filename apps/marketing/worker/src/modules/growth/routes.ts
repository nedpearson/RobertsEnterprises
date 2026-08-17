/**
 * Growth provider routes: connect, callback, sync, status.
 *
 * Mounted at /api/growth. The frontend never talks to Google directly — it asks
 * this router for a consent URL and later reads rows out of the growth_* tables
 * through the normal RLS-protected client.
 */
import { Router } from 'express';
import {
  buildConsentUrl,
  exchangeCode,
  PROVIDER_SCOPES,
  readOAuthConfig,
  signState,
  verifyState,
} from './googleAuth';
import { getAccessToken, saveTokens, startSyncRun, upsertConnection, db, upsertRows } from './store';
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
    { key: 'SUPABASE_SERVICE_ROLE_KEY', ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { key: 'VITE_SUPABASE_URL', ok: Boolean(process.env.VITE_SUPABASE_URL) },
  ];
  const missing = checks.filter((c) => !c.ok).map((c) => c.key);
  res.json({
    ready: missing.length === 0,
    oauthConfigured: Boolean(oauth),
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? null,
    missing,
    checks,
    providers: {
      google_search_console: { requiresGoogleApproval: false },
      google_analytics: { requiresGoogleApproval: false },
      pagespeed: { requiresGoogleApproval: false, requiresOAuth: false },
      google_business_profile: {
        requiresGoogleApproval: true,
        note: 'Business Profile APIs need an approved access request. Until approved the quota is 0 QPM and every call returns 403.',
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
      ? 'Apply supabase/migrations/20260829000000_growth_foundation.sql to this project.'
      : undefined,
  });
});

/** Step 1: hand the browser a Google consent URL. */
growthRouter.get('/connect/:provider', async (req, res) => {
  const provider = req.params.provider;
  const businessId = asString(req.query.businessId);
  if (!businessId) return res.status(400).json({ error: 'businessId is required' });

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
growthRouter.post('/sync/search-console', async (req, res) => {
  const businessId = asString(req.body?.businessId);
  if (!businessId) return res.status(400).json({ error: 'businessId is required' });

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
growthRouter.post('/sync/seo-audit', async (req, res) => {
  const businessId = asString(req.body?.businessId);
  const siteUrl = asString(req.body?.siteUrl);
  if (!businessId || !siteUrl) return res.status(400).json({ error: 'businessId and siteUrl are required' });

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
    for (const path of paths.slice(0, 20)) {
      const target = new URL(path, siteUrl).toString();
      results.push(await auditPage(target, apiKey));
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
      issues: r.issues,
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
growthRouter.post('/sync/business-profile', async (req, res) => {
  const businessId = asString(req.body?.businessId);
  if (!businessId) return res.status(400).json({ error: 'businessId is required' });

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
growthRouter.post('/reviews/:id/publish', async (req, res) => {
  const businessId = asString(req.body?.businessId);
  if (!businessId) return res.status(400).json({ error: 'businessId is required' });

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
