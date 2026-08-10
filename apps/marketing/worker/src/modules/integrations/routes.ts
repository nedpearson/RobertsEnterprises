import { createHmac, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction, Router } from 'express';
import { decryptSecret, encryptSecret, randomOpaqueToken, sha256 } from './crypto';
import {
  IntegrationProvider,
  PROVIDERS,
  configuredScopes,
  isIntegrationProvider,
  providerConfiguration,
} from './providerRegistry';

export const integrationsRouter = Router();

type RequestContext = {
  db: any;
  dataPlane: 'production' | 'demo';
  userId?: string;
  businessId?: string;
  role?: string;
};

function context(req: Request): RequestContext {
  return (req as any).context as RequestContext;
}

function requireBusiness(req: Request, res: Response, next: NextFunction) {
  const ctx = context(req);
  if (!ctx?.userId) return res.status(401).json({ error: 'Authentication required.' });
  if (!ctx.businessId) return res.status(403).json({ error: 'Active business membership required.' });
  next();
}

function requireIntegrationAdmin(req: Request, res: Response, next: NextFunction) {
  const ctx = context(req);
  const role = (ctx?.role || '').toLowerCase();
  if (!ctx?.userId) return res.status(401).json({ error: 'Authentication required.' });
  if (!ctx.businessId) return res.status(403).json({ error: 'Active business membership required.' });
  if (!['owner', 'manager'].includes(role)) {
    return res.status(403).json({ error: 'Only an Owner or Manager can change provider connections.' });
  }
  next();
}

function workerOrigin(): string {
  const configured = process.env.MARKETING_WORKER_PUBLIC_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MARKETING_WORKER_PUBLIC_URL is required in production for OAuth callbacks.');
  }
  return 'http://localhost:8080';
}

function appOrigin(): string {
  const configured = process.env.MARKETING_APP_ORIGIN?.replace(/\/$/, '');
  if (configured) return configured;
  return process.env.NODE_ENV === 'production'
    ? 'https://robertsenterprises.bridgebox.ai'
    : 'http://localhost:5173';
}

function safeReturnUrl(provider: string, status: 'success' | 'error', reason?: string) {
  const url = new URL('/growth', appOrigin());
  url.searchParams.set('marketingConnection', status);
  url.searchParams.set('provider', provider);
  if (reason) url.searchParams.set('reason', reason.slice(0, 160));
  return url.toString();
}

function normalizeScopes(provider: IntegrationProvider, raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((s): s is string => typeof s === 'string');
  if (typeof raw === 'string') return raw.split(/[ ,]+/).filter(Boolean);
  return configuredScopes(PROVIDERS[provider]);
}

function connectionStatus(row: any, configured: boolean) {
  if (!configured) return 'CONFIGURATION_REQUIRED';
  if (!row) return 'NOT_CONFIGURED';
  if (row.status === 'disconnected') return 'DISCONNECTED';
  if (row.status === 'error') return 'ERROR';
  if (row.status === 'reauthorization_required') return 'REAUTHORIZATION_REQUIRED';
  if (row.status === 'authorization_pending') return 'AUTHORIZATION_PENDING';
  if (row.status === 'connected_unverified') return 'CONNECTED_UNVERIFIED';

  const selected = Array.isArray(row.selected_resources) ? row.selected_resources : [];
  if (row.provider !== 'web_forms' && selected.length === 0) return 'ACCOUNT_SELECTION_REQUIRED';
  if (row.status === 'connected') return 'CONNECTED_HEALTHY';
  return 'CONNECTED_UNVERIFIED';
}

function publicConnection(provider: IntegrationProvider, row: any) {
  const definition = PROVIDERS[provider];
  const config = providerConfiguration(definition);
  const status = connectionStatus(row, config.configured);
  const grantedScopes = row?.granted_scopes || [];
  const configuredScopeSet = new Set(configuredScopes(definition));
  const grantedScopeSet = new Set<string>(grantedScopes);

  return {
    provider,
    title: definition.title,
    category: definition.category,
    description: definition.description,
    authMode: definition.authMode,
    status,
    configuration: {
      configured: config.configured,
      missing: config.missing,
    },
    externalOrganization: row?.external_organization_name
      ? {
          id: row.external_organization_id,
          name: row.external_organization_name,
          type: row.external_organization_type,
        }
      : null,
    tokenExpiresAt: row?.token_expires_at || null,
    lastVerifiedAt: row?.last_verified_at || null,
    lastSuccessfulSyncAt: row?.last_sync_at || null,
    lastWebhookAt: row?.last_webhook_at || null,
    lastError: row?.error_message || null,
    selectedResources: row?.selected_resources || [],
    brandMappings: row?.brand_mappings || [],
    locationMappings: row?.location_mappings || [],
    grantedScopes,
    expectedScopes: [...configuredScopeSet],
    missingScopes: [...configuredScopeSet].filter((scope) => !grantedScopeSet.has(scope)),
    healthEvidence: row?.health_evidence || {},
    subServices: definition.subServices.map((service) => ({
      ...service,
      configurationReady: (service.configurationEnv || []).every((name) => Boolean(process.env[name])),
    })),
  };
}

async function loadIntegration(req: Request, provider: IntegrationProvider) {
  const ctx = context(req);
  const { data, error } = await ctx.db
    .from('integrations')
    .select('*')
    .eq('business_id', ctx.businessId)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertIntegration(req: Request, provider: IntegrationProvider, values: Record<string, any>) {
  const ctx = context(req);
  const payload = {
    business_id: ctx.businessId,
    provider,
    updated_at: new Date().toISOString(),
    ...values,
  };
  const { data, error } = await ctx.db
    .from('integrations')
    .upsert(payload, { onConflict: 'business_id,provider' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

function oauthClientCredentials(provider: IntegrationProvider) {
  const definition = PROVIDERS[provider];
  const clientId = definition.clientIdEnv ? process.env[definition.clientIdEnv] : undefined;
  const clientSecret = definition.clientSecretEnv ? process.env[definition.clientSecretEnv] : undefined;
  if (!clientId || !clientSecret) {
    throw new Error(`Provider ${provider} is missing OAuth client configuration.`);
  }
  return { clientId, clientSecret };
}

function validShopDomain(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const shop = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : null;
}

function buildAuthorizationUrl(
  provider: IntegrationProvider,
  state: string,
  providerContext: Record<string, any>,
) {
  const definition = PROVIDERS[provider];
  const { clientId } = oauthClientCredentials(provider);
  const redirectUri = `${workerOrigin()}/api/integrations/oauth/callback/${provider}`;
  const scopes = configuredScopes(definition);

  if (provider === 'shopify') {
    const shop = validShopDomain(providerContext.shop);
    if (!shop) throw new Error('A valid *.myshopify.com store domain is required.');
    const url = new URL(`https://${shop}/admin/oauth/authorize`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('scope', scopes.join(','));
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    return url.toString();
  }

  if (!definition.authorizationUrl) throw new Error(`${provider} authorization URL is not configured.`);
  const url = new URL(definition.authorizationUrl);

  if (provider === 'tiktok') {
    url.searchParams.set(process.env.TIKTOK_CLIENT_ID_PARAM || 'client_key', clientId);
  } else {
    url.searchParams.set('client_id', clientId);
  }
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);

  if (scopes.length) url.searchParams.set('scope', scopes.join(provider === 'pinterest' ? ',' : ' '));
  if (provider === 'google') {
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent');
  }

  return url.toString();
}

async function exchangeOAuthCode(
  provider: IntegrationProvider,
  code: string,
  providerContext: Record<string, any>,
) {
  const definition = PROVIDERS[provider];
  const { clientId, clientSecret } = oauthClientCredentials(provider);
  const redirectUri = `${workerOrigin()}/api/integrations/oauth/callback/${provider}`;

  if (provider === 'shopify') {
    const shop = validShopDomain(providerContext.shop);
    if (!shop) throw new Error('Invalid Shopify store context.');
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || 'Shopify token exchange failed.');
    return payload;
  }

  if (!definition.tokenUrl) throw new Error(`${provider} token URL is not configured.`);
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };
  const body = new URLSearchParams({
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  if (provider === 'pinterest') {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  } else if (provider === 'tiktok') {
    body.set(process.env.TIKTOK_CLIENT_ID_PARAM || 'client_key', clientId);
    body.set(process.env.TIKTOK_CLIENT_SECRET_PARAM || 'client_secret', clientSecret);
  } else {
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
  }

  const response = await fetch(definition.tokenUrl, { method: 'POST', headers, body });
  const raw: any = await response.json().catch(() => ({}));
  const payload: any = raw?.data && typeof raw.data === 'object' ? raw.data : raw;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.message || payload.error || `${provider} token exchange failed.`);
  }
  return payload;
}

async function verifyBearer(provider: IntegrationProvider, token: string, providerContext: Record<string, any>) {
  if (provider === 'shopify') {
    const shop = validShopDomain(providerContext.shop);
    if (!shop) throw new Error('Shopify store context missing.');
    const response = await fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query: '{ shop { id name myshopifyDomain } }' }),
    });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok || body.errors) throw new Error('Shopify verification failed.');
    return {
      id: body?.data?.shop?.id || shop,
      name: body?.data?.shop?.name || shop,
      type: 'shopify_shop',
    };
  }

  const verifyUrl = PROVIDERS[provider].verifyUrl;
  if (!verifyUrl) {
    return { id: null, name: null, type: `${provider}_account`, unverified: true };
  }

  const response = await fetch(verifyUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || body.message || `${provider} credential verification failed.`);
  return {
    id: body.id || body.sub || body.username || null,
    name: body.name || body.email || body.username || body.localizedFirstName || null,
    type: `${provider}_account`,
  };
}

function verifyShopifyHmac(req: Request, secret: string) {
  const entries = Object.entries(req.query)
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value ?? '')] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  const message = entries.map(([key, value]) => `${key}=${value}`).join('&');
  const expected = createHmac('sha256', secret).update(message).digest('hex');
  const provided = typeof req.query.hmac === 'string' ? req.query.hmac : '';
  if (!provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
}

integrationsRouter.get('/', requireBusiness, async (req, res) => {
  try {
    const ctx = context(req);
    const { data, error } = await ctx.db
      .from('integrations')
      .select('*')
      .eq('business_id', ctx.businessId)
      .in('provider', Object.keys(PROVIDERS));
    if (error) throw error;
    const rows = new Map((data || []).map((row: any) => [row.provider, row]));
    res.json({
      connections: (Object.keys(PROVIDERS) as IntegrationProvider[]).map((provider) =>
        publicConnection(provider, rows.get(provider)),
      ),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to load provider connections.' });
  }
});

integrationsRouter.get('/catalog', requireBusiness, (_req, res) => {
  res.json({
    providers: (Object.keys(PROVIDERS) as IntegrationProvider[]).map((provider) => {
      const definition = PROVIDERS[provider];
      return {
        provider,
        title: definition.title,
        category: definition.category,
        authMode: definition.authMode,
        description: definition.description,
        subServices: definition.subServices,
        configuration: providerConfiguration(definition),
      };
    }),
  });
});

integrationsRouter.post('/:provider/connect', requireIntegrationAdmin, async (req, res) => {
  const providerRaw = req.params.provider;
  if (!isIntegrationProvider(providerRaw)) return res.status(404).json({ error: 'Unsupported provider.' });
  const provider = providerRaw;
  const definition = PROVIDERS[provider];
  if (definition.authMode !== 'oauth2') {
    return res.status(400).json({ error: `${definition.title} uses ${definition.authMode} setup, not OAuth.` });
  }

  try {
    const ctx = context(req);
    if (ctx.dataPlane === 'demo') {
      return res.status(409).json({ error: 'Live provider authorization is disabled in Demo Mode.' });
    }
    const config = providerConfiguration(definition);
    if (!config.configured) {
      return res.status(503).json({ error: 'Provider developer configuration is incomplete.', missing: config.missing });
    }

    const providerContext: Record<string, any> = {};
    if (provider === 'shopify') {
      const shop = validShopDomain(req.body?.shop);
      if (!shop) return res.status(400).json({ error: 'Enter the store as your-store.myshopify.com.' });
      providerContext.shop = shop;
    }

    const state = randomOpaqueToken(32);
    const stateHash = sha256(state);
    const redirectTo = safeReturnUrl(provider, 'success');
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const { error } = await ctx.db.from('integration_oauth_states').insert({
      business_id: ctx.businessId,
      user_id: ctx.userId,
      provider,
      state_hash: stateHash,
      redirect_to: redirectTo,
      provider_context: providerContext,
      expires_at: expiresAt,
    });
    if (error) throw error;

    await upsertIntegration(req, provider, {
      status: 'authorization_pending',
      auth_method: 'oauth2',
      error_message: null,
      last_error_at: null,
    });

    res.json({ authorizationUrl: buildAuthorizationUrl(provider, state, providerContext) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to start provider authorization.' });
  }
});

integrationsRouter.get('/oauth/callback/:provider', async (req, res) => {
  const providerRaw = req.params.provider;
  if (!isIntegrationProvider(providerRaw)) return res.status(404).send('Unsupported provider.');
  const provider = providerRaw;
  const definition = PROVIDERS[provider];

  try {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const providerError = typeof req.query.error === 'string' ? req.query.error : '';
    if (!state) throw new Error('OAuth state is missing.');

    const ctx = context(req);
    const { data: stateRow, error: stateError } = await ctx.db
      .from('integration_oauth_states')
      .select('*')
      .eq('state_hash', sha256(state))
      .maybeSingle();
    if (stateError) throw stateError;
    if (!stateRow) throw new Error('OAuth state is invalid.');
    if (stateRow.consumed_at) throw new Error('OAuth state has already been used.');
    if (new Date(stateRow.expires_at).getTime() < Date.now()) throw new Error('OAuth state has expired.');
    if (stateRow.provider !== provider) throw new Error('OAuth provider/state mismatch.');

    if (provider === 'shopify') {
      const { clientSecret } = oauthClientCredentials(provider);
      const callbackShop = validShopDomain(req.query.shop);
      if (!callbackShop || callbackShop !== stateRow.provider_context?.shop) throw new Error('Shopify store mismatch.');
      if (!verifyShopifyHmac(req, clientSecret)) throw new Error('Shopify callback HMAC validation failed.');
    }

    await ctx.db
      .from('integration_oauth_states')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', stateRow.id)
      .is('consumed_at', null);

    if (providerError) throw new Error(`Provider authorization was not completed: ${providerError}`);
    if (!code) throw new Error('Authorization code is missing.');

    const tokenResponse = await exchangeOAuthCode(provider, code, stateRow.provider_context || {});
    const accessToken = tokenResponse.access_token;
    const refreshToken = tokenResponse.refresh_token || null;
    const expiresIn = Number(tokenResponse.expires_in || 0);
    const tokenExpiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const grantedScopes = normalizeScopes(provider, tokenResponse.scope || tokenResponse.scopes);
    const identity = await verifyBearer(provider, accessToken, stateRow.provider_context || {});

    const { data: saved, error: saveError } = await ctx.db
      .from('integrations')
      .upsert({
        business_id: stateRow.business_id,
        provider,
        status: identity.unverified ? 'connected_unverified' : 'connected',
        auth_method: definition.authMode,
        access_token: null,
        refresh_token: null,
        access_token_ciphertext: encryptSecret(accessToken),
        refresh_token_ciphertext: encryptSecret(refreshToken),
        token_expires_at: tokenExpiresAt,
        granted_scopes: grantedScopes,
        external_organization_id: identity.id,
        external_organization_name: identity.name || stateRow.provider_context?.shop || definition.title,
        external_organization_type: identity.type,
        metadata: { providerContext: stateRow.provider_context || {} },
        last_verified_at: identity.unverified ? null : new Date().toISOString(),
        health_evidence: {
          authorization: 'passed',
          identity: identity.unverified ? 'pending' : 'passed',
          accountSelection: 'pending',
          resourceMapping: 'pending',
        },
        error_message: null,
        last_error_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id,provider' })
      .select('*')
      .single();
    if (saveError) throw saveError;

    res.redirect(stateRow.redirect_to || safeReturnUrl(provider, 'success'));
  } catch (error: any) {
    console.error(JSON.stringify({ event: 'integration_oauth_callback_failed', provider, message: error.message }));
    res.redirect(safeReturnUrl(provider, 'error', error.message || 'Authorization failed'));
  }
});

integrationsRouter.post('/:provider/credentials', requireIntegrationAdmin, async (req, res) => {
  const providerRaw = req.params.provider;
  if (!isIntegrationProvider(providerRaw)) return res.status(404).json({ error: 'Unsupported provider.' });
  const provider = providerRaw;
  const definition = PROVIDERS[provider];
  if (definition.authMode !== 'api_key') return res.status(400).json({ error: `${definition.title} does not use API-key setup.` });

  const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
  if (!apiKey) return res.status(400).json({ error: 'API key is required.' });

  try {
    if (context(req).dataPlane === 'demo') return res.status(409).json({ error: 'Live provider credentials are disabled in Demo Mode.' });
    let identity: any = { id: null, name: req.body?.organizationName || definition.title, type: `${provider}_account` };

    if (provider === 'klaviyo') {
      const response = await fetch(process.env.KLAVIYO_VERIFY_URL || 'https://a.klaviyo.com/api/accounts/', {
        headers: {
          Authorization: `Klaviyo-API-Key ${apiKey}`,
          Accept: 'application/json',
          revision: process.env.KLAVIYO_API_REVISION || '2025-07-15',
        },
      });
      const body: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.errors?.[0]?.detail || 'Klaviyo credential verification failed.');
      const account = body?.data?.[0];
      identity = {
        id: account?.id || null,
        name: account?.attributes?.contact_information?.organization_name || req.body?.organizationName || 'Klaviyo Account',
        type: 'klaviyo_account',
      };
    }

    if (provider === 'call_tracking') {
      const response = await fetch(process.env.CALLRAIL_VERIFY_URL || 'https://api.callrail.com/v3/a.json', {
        headers: { Authorization: `Token token="${apiKey}"`, Accept: 'application/json' },
      });
      const body: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || body.message || 'Call tracking credential verification failed.');
      identity = {
        id: body?.accounts?.[0]?.id || null,
        name: body?.accounts?.[0]?.name || req.body?.organizationName || 'Call Tracking Account',
        type: 'call_tracking_account',
      };
    }

    const saved = await upsertIntegration(req, provider, {
      status: 'connected',
      auth_method: 'api_key',
      access_token: null,
      access_token_ciphertext: encryptSecret(apiKey),
      external_organization_id: identity.id,
      external_organization_name: identity.name,
      external_organization_type: identity.type,
      last_verified_at: new Date().toISOString(),
      health_evidence: { authorization: 'passed', identity: 'passed', accountSelection: 'pending' },
      error_message: null,
      last_error_at: null,
    });
    res.json({ connection: publicConnection(provider, saved) });
  } catch (error: any) {
    await upsertIntegration(req, provider, {
      status: 'error',
      auth_method: 'api_key',
      error_message: error.message,
      last_error_at: new Date().toISOString(),
    }).catch(() => undefined);
    res.status(400).json({ error: error.message || 'Credential verification failed.' });
  }
});

integrationsRouter.post('/web_forms/provision', requireIntegrationAdmin, async (req, res) => {
  try {
    const secret = randomOpaqueToken(32);
    const saved = await upsertIntegration(req, 'web_forms', {
      status: 'connected_unverified',
      auth_method: 'internal',
      webhook_secret_ciphertext: encryptSecret(secret),
      external_organization_id: context(req).businessId,
      external_organization_name: 'VowOS Website Intake',
      external_organization_type: 'signed_webhook',
      selected_resources: [{ id: 'website-intake', name: 'Signed Website Intake Endpoint', type: 'webhook' }],
      health_evidence: { endpointProvisioned: 'passed', firstWebhook: 'pending' },
      error_message: null,
      last_error_at: null,
    });
    const endpoint = `${workerOrigin()}/api/integrations/web_forms/ingest/${context(req).businessId}`;
    res.json({
      connection: publicConnection('web_forms', saved),
      endpoint,
      signingSecret: secret,
      signingInstructions: 'HMAC-SHA256 the exact JSON request body and send X-VowOS-Signature: sha256=<hex>. The secret is only returned during provisioning.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to provision website intake.' });
  }
});

integrationsRouter.post('/web_forms/ingest/:businessId', async (req, res) => {
  try {
    const ctx = context(req);
    const businessId = req.params.businessId;
    const { data: connection, error } = await ctx.db
      .from('integrations')
      .select('*')
      .eq('business_id', businessId)
      .eq('provider', 'web_forms')
      .maybeSingle();
    if (error) throw error;
    if (!connection?.webhook_secret_ciphertext) return res.status(404).json({ error: 'Website intake is not provisioned.' });

    const secret = decryptSecret(connection.webhook_secret_ciphertext);
    if (!secret) throw new Error('Website intake secret is unavailable.');
    const rawBody: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const signature = String(req.headers['x-vowos-signature'] || '').replace(/^sha256=/i, '');
    if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }

    const externalEventId = typeof req.body?.eventId === 'string' ? req.body.eventId : null;
    const eventType = typeof req.body?.eventType === 'string' ? req.body.eventType : 'lead_form_submission';
    const { error: eventError } = await ctx.db.from('integration_events').upsert({
      business_id: businessId,
      provider: 'web_forms',
      event_type: eventType,
      external_event_id: externalEventId,
      payload: req.body || {},
      occurred_at: req.body?.occurredAt || new Date().toISOString(),
    }, { onConflict: 'business_id,provider,external_event_id', ignoreDuplicates: true });
    if (eventError) throw eventError;

    await ctx.db.from('integrations').update({
      status: 'connected',
      last_webhook_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      health_evidence: { endpointProvisioned: 'passed', firstWebhook: 'passed', signatureVerification: 'passed' },
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('business_id', businessId).eq('provider', 'web_forms');

    res.status(202).json({ accepted: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to ingest website event.' });
  }
});

integrationsRouter.post('/:provider/test', requireBusiness, async (req, res) => {
  const providerRaw = req.params.provider;
  if (!isIntegrationProvider(providerRaw)) return res.status(404).json({ error: 'Unsupported provider.' });
  const provider = providerRaw;

  try {
    const row = await loadIntegration(req, provider);
    if (!row) return res.status(404).json({ error: 'Provider is not configured.' });

    if (provider === 'web_forms') {
      return res.json({ connection: publicConnection(provider, row), tested: Boolean(row.last_webhook_at) });
    }

    const token = decryptSecret(row.access_token_ciphertext);
    if (!token) return res.status(409).json({ error: 'Provider credential is not available. Reconnect the provider.' });

    let identity: any;
    if (PROVIDERS[provider].authMode === 'api_key') {
      // Reuse the lightweight account verification used during credential save.
      if (provider === 'klaviyo') {
        const response = await fetch(process.env.KLAVIYO_VERIFY_URL || 'https://a.klaviyo.com/api/accounts/', {
          headers: { Authorization: `Klaviyo-API-Key ${token}`, Accept: 'application/json', revision: process.env.KLAVIYO_API_REVISION || '2025-07-15' },
        });
        if (!response.ok) throw new Error('Klaviyo verification failed.');
        identity = { id: row.external_organization_id, name: row.external_organization_name, type: 'klaviyo_account' };
      } else if (provider === 'call_tracking') {
        const response = await fetch(process.env.CALLRAIL_VERIFY_URL || 'https://api.callrail.com/v3/a.json', {
          headers: { Authorization: `Token token="${token}"`, Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Call tracking verification failed.');
        identity = { id: row.external_organization_id, name: row.external_organization_name, type: 'call_tracking_account' };
      }
    } else {
      identity = await verifyBearer(provider, token, row.metadata?.providerContext || {});
    }

    const status = identity?.unverified ? 'connected_unverified' : row.selected_resources?.length ? 'connected' : 'connected_unverified';
    const saved = await upsertIntegration(req, provider, {
      status,
      last_verified_at: identity?.unverified ? row.last_verified_at : new Date().toISOString(),
      error_message: null,
      last_error_at: null,
      health_evidence: {
        ...(row.health_evidence || {}),
        identity: identity?.unverified ? 'pending' : 'passed',
        credentialTest: identity?.unverified ? 'pending' : 'passed',
      },
    });
    res.json({ connection: publicConnection(provider, saved), tested: !identity?.unverified });
  } catch (error: any) {
    const saved = await upsertIntegration(req, provider, {
      status: 'error',
      error_message: error.message,
      last_error_at: new Date().toISOString(),
      health_evidence: { credentialTest: 'failed' },
    }).catch(() => null);
    res.status(400).json({ error: error.message || 'Connection verification failed.', connection: saved ? publicConnection(provider, saved) : undefined });
  }
});

integrationsRouter.put('/:provider/resources', requireIntegrationAdmin, async (req, res) => {
  const providerRaw = req.params.provider;
  if (!isIntegrationProvider(providerRaw)) return res.status(404).json({ error: 'Unsupported provider.' });
  const provider = providerRaw;
  const resources = Array.isArray(req.body?.resources) ? req.body.resources : [];
  const brandMappings = Array.isArray(req.body?.brandMappings) ? req.body.brandMappings : [];
  const locationMappings = Array.isArray(req.body?.locationMappings) ? req.body.locationMappings : [];

  try {
    const row = await loadIntegration(req, provider);
    if (!row?.access_token_ciphertext && provider !== 'web_forms') return res.status(409).json({ error: 'Connect the provider before selecting resources.' });
    const saved = await upsertIntegration(req, provider, {
      selected_resources: resources,
      brand_mappings: brandMappings,
      location_mappings: locationMappings,
      status: resources.length > 0 || provider === 'web_forms' ? 'connected' : 'connected_unverified',
      health_evidence: {
        ...(row?.health_evidence || {}),
        accountSelection: resources.length > 0 ? 'passed' : 'pending',
        resourceMapping: locationMappings.length > 0 || provider === 'web_forms' ? 'passed' : 'pending',
      },
    });
    res.json({ connection: publicConnection(provider, saved) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to save provider resources.' });
  }
});

integrationsRouter.delete('/:provider', requireIntegrationAdmin, async (req, res) => {
  const providerRaw = req.params.provider;
  if (!isIntegrationProvider(providerRaw)) return res.status(404).json({ error: 'Unsupported provider.' });
  const provider = providerRaw;
  try {
    const saved = await upsertIntegration(req, provider, {
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      access_token_ciphertext: null,
      refresh_token_ciphertext: null,
      token_expires_at: null,
      granted_scopes: [],
      selected_resources: [],
      brand_mappings: [],
      location_mappings: [],
      external_organization_id: null,
      external_organization_name: null,
      external_organization_type: null,
      health_evidence: { disconnectedByUser: 'passed' },
      error_message: null,
      last_error_at: null,
    });
    res.json({ connection: publicConnection(provider, saved) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to disconnect provider.' });
  }
});
