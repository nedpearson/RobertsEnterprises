import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveStore, isStoreKey } from '../scheduling/publicIntake';
import { resolveIntegrationCustomer } from '../integrations/customerIdentity';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { saveTokens } from '../growth/store';
import {
  buildShopifyAuthorizationUrl,
  exchangeShopifyCode,
  normalizeShopDomain,
  readShopifyOAuthConfig,
  readShopifyWebhookSecret,
  shopifyStoreOverrideStatus,
  SHOPIFY_SCOPES,
  signShopifyState,
  verifyShopifyCallbackHmac,
  verifyShopifyShop,
  verifyShopifyState,
} from './oauth';
import { markShopifyConnectionError, upsertShopifyConnection } from './store';
import { ensureShopifyOrderWebhook } from './webhooks';

let defaultDbClient: SupabaseClient | null = null;
function getShopifyDb(): SupabaseClient {
  if (defaultDbClient) return defaultDbClient;
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Shopify worker database configuration is incomplete.');
  defaultDbClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return defaultDbClient;
}

export const shopifyRouter = Router();

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const metadataBrandId = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).brandId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

shopifyRouter.get('/setup/status', (_req, res) => {
  const redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI ?? null;
  const redirectUriValid = Boolean(redirectUri && /\/api\/shopify\/callback\/?$/.test(redirectUri));
  const overrideStatus = shopifyStoreOverrideStatus();
  const checks = [
    { key: 'SHOPIFY_CLIENT_ID', ok: Boolean(process.env.SHOPIFY_CLIENT_ID) },
    { key: 'SHOPIFY_CLIENT_SECRET', ok: Boolean(process.env.SHOPIFY_CLIENT_SECRET) },
    { key: 'SHOPIFY_OAUTH_REDIRECT_URI', ok: Boolean(redirectUri) },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { key: 'SHOPIFY_STORE_CONFIGS_JSON', ok: !overrideStatus.invalid },
  ];
  const missing = checks.filter((check) => !check.ok).map((check) => check.key);
  return res.status(missing.length || !redirectUriValid ? 503 : 200).json({
    ready: missing.length === 0 && redirectUriValid,
    missing,
    redirectUri,
    redirectUriValid,
    expectedRedirectPath: '/api/shopify/callback',
    storeOverrides: overrideStatus.configuredStores,
    storeOverridesValid: !overrideStatus.invalid,
  });
});

shopifyRouter.get('/connect', requireGrowthAccess, async (req, res) => {
  const shop = normalizeShopDomain(asString(req.query.shop) ?? '');
  if (!shop) {
    return res.status(400).json({
      code: 'INVALID_SHOP_DOMAIN',
      error: 'Enter the permanent .myshopify.com store domain or Shopify Admin store URL.',
    });
  }

  const config = readShopifyOAuthConfig(shop);
  if (!config) {
    return res.status(503).json({
      code: 'SHOPIFY_NOT_CONFIGURED',
      error: 'Shopify OAuth is not configured for this store.',
    });
  }

  const { businessId, userId } = growthContextOf(req);
  const requestedBrandId = asString(req.query.brandId);
  const db = getShopifyDb();

  try {
    const { data: brandData, error: brandError } = await db
      .from('business_brands')
      .select('id,name')
      .eq('business_id', businessId)
      .order('name');
    if (brandError) throw new Error(`Could not resolve brand context: ${brandError.message}`);

    const brands = (brandData ?? []) as Array<{ id: string; name: string }>;
    let brandId = requestedBrandId;
    let brandName: string | null = null;

    if (brandId) {
      const brand = brands.find((candidate) => candidate.id === brandId);
      if (!brand) {
        return res.status(403).json({
          code: 'INVALID_BRAND_CONTEXT',
          error: 'The selected brand does not belong to the active organization.',
        });
      }
      brandName = brand.name;
    } else if (brands.length === 1) {
      brandId = brands[0].id;
      brandName = brands[0].name;
    } else if (brands.length > 1) {
      return res.status(409).json({
        code: 'BRAND_CONTEXT_REQUIRED',
        error: 'Select the exact brand before connecting Shopify. VowOS will not guess among multiple brands.',
        brands,
      });
    }

    const { data: existingRows, error: existingError } = await db
      .from('growth_provider_connections')
      .select('id,business_id,display_name,metadata')
      .eq('provider', 'shopify')
      .ilike('metadata->>shopDomain', shop)
      .limit(2);
    if (existingError) throw new Error(`Could not verify existing Shopify binding: ${existingError.message}`);

    const otherTenant = (existingRows ?? []).find((row: any) => row.business_id && row.business_id !== businessId);
    if (otherTenant) {
      return res.status(409).json({
        code: 'SHOP_ALREADY_BOUND_TO_ANOTHER_ORGANIZATION',
        error: 'This Shopify store is already assigned to another VowOS organization.',
      });
    }

    const conflict = (existingRows ?? []).find((row: any) => {
      const existingBrandId = metadataBrandId(row.metadata);
      return existingBrandId && brandId && existingBrandId !== brandId;
    });
    if (conflict) {
      return res.status(409).json({
        code: 'SHOP_ALREADY_BOUND_TO_ANOTHER_BRAND',
        error: 'This Shopify store is already assigned to another VowOS brand.',
      });
    }

    const state = signShopifyState({
      businessId,
      userId,
      shop,
      brandId: brandId || undefined,
      issuedAt: Date.now(),
      purpose: 'shopify_connect',
    });

    return res.json({
      url: buildShopifyAuthorizationUrl(config, shop, state),
      shop,
      brandId: brandId || null,
      brandName,
    });
  } catch (error) {
    return res.status(500).json({
      code: 'SHOPIFY_CONNECT_FAILED',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

shopifyRouter.delete('/disconnect', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const requestedShop = normalizeShopDomain(asString(req.query.shop) ?? '');
  const db = getShopifyDb();

  let query = db
    .from('growth_provider_connections')
    .select('id,external_account_id,metadata')
    .eq('business_id', businessId)
    .eq('provider', 'shopify');
  if (requestedShop) query = query.ilike('metadata->>shopDomain', requestedShop);

  const { data: connections, error } = await query.limit(2);
  if (error) return res.status(500).json({ error: `Could not resolve Shopify connection: ${error.message}` });
  const matching = connections ?? [];
  if (!matching.length) return res.json({ success: true, alreadyDisconnected: true });
  if (matching.length > 1) {
    return res.status(409).json({ error: 'More than one Shopify store is connected. Specify the permanent shop domain.' });
  }

  const connection = matching[0];
  const secretDelete = await db.from('growth_provider_secrets').delete().eq('connection_id', connection.id);
  if (secretDelete.error) return res.status(500).json({ error: `Could not remove Shopify credentials: ${secretDelete.error.message}` });

  const connectionUpdate = await db
    .from('growth_provider_connections')
    .update({ status: 'disconnected', last_error: null, last_sync_status: null })
    .eq('id', connection.id);
  if (connectionUpdate.error) return res.status(500).json({ error: `Could not mark Shopify disconnected: ${connectionUpdate.error.message}` });

  if (connection.external_account_id) {
    await db
      .from('provider_connections')
      .update({ status: 'disconnected', auth_state: 'REAUTH_REQUIRED', health_status: 'ACTION_REQUIRED' })
      .eq('business_id', businessId)
      .eq('provider', 'shopify')
      .eq('provider_account_id', connection.external_account_id);
  }

  return res.json({ success: true });
});

async function syncRecoveryConnection(
  db: SupabaseClient | any,
  input: { businessId: string; brandId?: string; accountId: string; shopDomain: string; displayName?: string },
): Promise<void> {
  const { data: existing, error } = await db
    .from('provider_connections')
    .select('id')
    .eq('business_id', input.businessId)
    .eq('provider', 'shopify')
    .eq('provider_account_id', input.accountId)
    .limit(2);
  if (error) throw new Error(`Could not synchronize Integration Operations: ${error.message}`);
  if ((existing ?? []).length > 1) throw new Error('Duplicate Shopify provider_connections rows require repair before reconnecting.');

  const patch = {
    business_id: input.businessId,
    brand_id: input.brandId ?? null,
    provider: 'shopify',
    provider_account_id: input.accountId,
    status: 'active',
    // OAuth + /shop verification proves the credential is authorized. It does not
    // prove data synchronization or webhook delivery health, so remain RECOVERING
    // until a verified provider-side sync/health operation records success.
    health_status: 'RECOVERING',
    circuit_breaker_state: 'CLOSED',
    auth_state: 'AUTHORIZED',
    last_error_message: null,
    reconnect_url: null,
    metadata: { shopDomain: input.shopDomain, displayName: input.displayName ?? null },
  };

  if (existing?.[0]?.id) {
    const update = await db.from('provider_connections').update(patch).eq('id', existing[0].id);
    if (update.error) throw new Error(`Could not update Integration Operations: ${update.error.message}`);
  } else {
    const insert = await db.from('provider_connections').insert(patch);
    if (insert.error) throw new Error(`Could not create Integration Operations record: ${insert.error.message}`);
  }
}

shopifyRouter.get('/callback', async (req, res) => {
  const appUrl = process.env.PUBLIC_APP_URL || 'https://vowos.bridgebox.ai';
  const state = asString(req.query.state);
  const code = asString(req.query.code);
  const returnedShop = normalizeShopDomain(asString(req.query.shop) ?? '');
  const config = returnedShop ? readShopifyOAuthConfig(returnedShop) : null;
  const redirect = (ok: boolean, error?: string, brandId?: string, shop?: string) => {
    const destination = new URL('/settings', appUrl);
    destination.searchParams.set('tab', 'integrations');
    destination.searchParams.set('shopify', ok ? 'connected' : 'failed');
    if (error) destination.searchParams.set('error', error);
    if (brandId) destination.searchParams.set('brandId', brandId);
    if (shop) destination.searchParams.set('shop', shop);
    return destination.toString();
  };

  if (!state || !code || !returnedShop || !config) {
    return res.redirect(redirect(false, 'Missing or invalid Shopify authorization details.'));
  }
  if (!verifyShopifyCallbackHmac(req.query as Record<string, unknown>, config.clientSecret)) {
    return res.redirect(redirect(false, 'Shopify callback signature validation failed.'));
  }

  const payload = verifyShopifyState(state);
  if (!payload || payload.shop !== returnedShop) {
    return res.redirect(redirect(false, 'The Shopify authorization state is invalid or expired.'));
  }

  try {
    const db = getShopifyDb();
    if (payload.brandId) {
      const { data: brand, error: brandError } = await db
        .from('business_brands')
        .select('id')
        .eq('id', payload.brandId)
        .eq('business_id', payload.businessId)
        .maybeSingle();
      if (brandError) throw new Error(`Could not verify Shopify brand ownership: ${brandError.message}`);
      if (!brand) throw new Error('The selected VowOS brand no longer belongs to this organization.');
    }

    const tokens = await exchangeShopifyCode(config, returnedShop, code);
    const shop = await verifyShopifyShop(returnedShop, tokens.accessToken);
    const canonicalShopDomain = normalizeHeaderDomain(shop.myshopify_domain);
    if (!canonicalShopDomain) throw new Error('Shopify returned an invalid permanent shop domain.');

    const { data: globalBindings, error: globalError } = await db
      .from('growth_provider_connections')
      .select('id,business_id,metadata')
      .eq('provider', 'shopify')
      .eq('external_account_id', shop.id)
      .limit(2);
    if (globalError) throw new Error(`Could not verify Shopify account binding: ${globalError.message}`);
    const foreignBinding = (globalBindings ?? []).find((row: any) => row.business_id !== payload.businessId);
    if (foreignBinding) throw new Error('This Shopify account is already bound to another VowOS organization.');

    const existing = (globalBindings ?? []).find((row: any) => row.business_id === payload.businessId);
    const existingBrandId = metadataBrandId(existing?.metadata);
    if (existingBrandId && payload.brandId && existingBrandId !== payload.brandId) {
      throw new Error('This Shopify account is already assigned to a different VowOS brand.');
    }

    const metadata: Record<string, unknown> = { shopDomain: canonicalShopDomain };
    if (payload.brandId) metadata.brandId = payload.brandId;

    const connection = await upsertShopifyConnection(payload.businessId, shop.id, {
      status: 'connecting',
      external_account_id: shop.id,
      display_name: shop.name,
      connected_by: payload.userId,
      connected_at: new Date().toISOString(),
      last_error: null,
      scopes: tokens.scope.length ? tokens.scope : SHOPIFY_SCOPES,
      metadata,
    } as never);

    await saveTokens(connection.id, {
      accessToken: tokens.accessToken,
      refreshToken: null,
      tokenType: 'shopify-offline',
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      scope: tokens.scope.join(' '),
    });

    const webhook = await ensureShopifyOrderWebhook(
      canonicalShopDomain,
      tokens.accessToken,
      config.redirectUri,
    );

    await upsertShopifyConnection(payload.businessId, shop.id, {
      status: 'connected',
      last_error: null,
      metadata: {
        ...metadata,
        webhookSubscriptionId: webhook.id,
        webhookUri: webhook.uri,
        webhookVerifiedAt: new Date().toISOString(),
      },
    } as never);

    await syncRecoveryConnection(db, {
      businessId: payload.businessId,
      brandId: payload.brandId,
      accountId: shop.id,
      shopDomain: canonicalShopDomain,
      displayName: shop.name,
    });

    return res.redirect(redirect(true, undefined, payload.brandId, canonicalShopDomain));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markShopifyConnectionError(payload.businessId, returnedShop, message).catch(() => undefined);
    return res.redirect(redirect(false, message, payload.brandId, returnedShop));
  }
});

/** Constant-time HMAC-SHA256 verification over the exact raw request body. */
export function verifyShopifyWebhookHmac(
  rawBody: Buffer | string | undefined,
  hmacHeader: string | undefined,
  secret: string | undefined,
): boolean {
  if (!rawBody || !hmacHeader || !secret) return false;
  try {
    const buffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
    const digestBase64 = crypto.createHmac('sha256', secret).update(buffer).digest('base64');
    const expected = Buffer.from(digestBase64, 'utf8');
    const supplied = Buffer.from(hmacHeader.trim(), 'utf8');
    return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
  } catch {
    return false;
  }
}

type ShopifyConnectionMetadata = {
  shopDomain?: unknown;
  brandId?: unknown;
  locationMappings?: unknown;
};

type ShopifyDomainConnection = {
  id: string;
  business_id: string;
  external_account_id?: string | null;
  display_name?: string | null;
  metadata: ShopifyConnectionMetadata | null;
  status?: string | null;
};

export class ShopifyConnectionInactiveError extends Error {
  constructor(public readonly shopDomain: string, public readonly status: string) {
    super(`Shopify store "${shopDomain}" is ${status || 'inactive'} in VowOS. Reconnect it before processing webhooks.`);
    this.name = 'ShopifyConnectionInactiveError';
  }
}

function normalizeHeaderDomain(value?: string): string | null {
  if (!value) return null;
  const normalized = normalizeShopDomain(value);
  return normalized || null;
}

function mappingLocationId(metadata: ShopifyConnectionMetadata | null, shopifyLocationId?: string): string | null {
  if (!shopifyLocationId || !Array.isArray(metadata?.locationMappings)) return null;
  for (const item of metadata.locationMappings) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (String(row.shopifyLocationId ?? '') !== shopifyLocationId) continue;
    return typeof row.vowosLocationId === 'string' && row.vowosLocationId.trim() ? row.vowosLocationId.trim() : null;
  }
  return null;
}

function connectionBrandId(metadata: ShopifyConnectionMetadata | null): string | null {
  return typeof metadata?.brandId === 'string' && metadata.brandId.trim() ? metadata.brandId.trim() : null;
}

export async function resolveShopifyTenant(
  db: SupabaseClient | any,
  shopDomainHeader?: string,
  storeKeyProperty?: string,
  shopifyLocationId?: string,
): Promise<{
  businessId: string;
  brandId: string | null;
  locationId: string | null;
  businessName: string;
  brandName: string | null;
  boutiqueEmail: string | null;
  providerAccountId: string | null;
}> {
  const cleanDomain = normalizeHeaderDomain(shopDomainHeader);
  if (!cleanDomain) throw new Error('A valid permanent Shopify shop domain is required for tenant routing.');

  const connections = await db
    .from('growth_provider_connections')
    .select('id,business_id,external_account_id,display_name,metadata,status')
    .eq('provider', 'shopify')
    .ilike('metadata->>shopDomain', cleanDomain)
    .limit(2);
  if (connections?.error) throw new Error(`Could not resolve Shopify connection for "${cleanDomain}": ${connections.error.message}`);

  const matching = (connections?.data ?? []) as ShopifyDomainConnection[];
  if (matching.length === 0) {
    throw new Error(`Unable to resolve Shopify tenant for domain: "${cleanDomain}". The store must complete OAuth before webhooks are accepted.`);
  }
  if (matching.length > 1) throw new Error(`Shopify domain "${cleanDomain}" is mapped to more than one VowOS organization.`);

  const canonical = matching[0];
  const status = String(canonical.status || '').trim().toLowerCase();
  if (status !== 'connected') throw new ShopifyConnectionInactiveError(cleanDomain, status || 'inactive');

  const businessId = canonical.business_id;
  const brandId = connectionBrandId(canonical.metadata);
  let locationId: string | null = null;

  if (storeKeyProperty && isStoreKey(storeKeyProperty)) {
    const resolved = await resolveStore(db, storeKeyProperty);
    if (resolved.businessId !== businessId) {
      throw new Error(`Shopify store/location mapping conflicts with the OAuth-bound organization for "${cleanDomain}".`);
    }
    if (brandId && resolved.brandId && resolved.brandId !== brandId) {
      throw new Error('Shopify store/location mapping points to another brand.');
    }
    locationId = resolved.locationId;
  }

  if (!locationId) {
    const mappedLocation = mappingLocationId(canonical.metadata, shopifyLocationId);
    if (mappedLocation) {
      const { data: mappedRow, error: mappedError } = await db
        .from('locations')
        .select('id,business_id,brand_id')
        .eq('id', mappedLocation)
        .eq('business_id', businessId)
        .maybeSingle();
      if (mappedError) throw new Error(`Could not validate Shopify location mapping: ${mappedError.message}`);
      if (!mappedRow) throw new Error('Shopify location mapping points to an unavailable location.');
      if (brandId && mappedRow.brand_id && mappedRow.brand_id !== brandId) {
        throw new Error('Shopify location mapping points to another brand.');
      }
      locationId = mappedRow.id;
    }
  }

  const { data: business, error: businessError } = await db
    .from('businesses')
    .select('id,name')
    .eq('id', businessId)
    .maybeSingle();
  if (businessError) throw new Error(`Could not load Shopify organization: ${businessError.message}`);
  if (!business) throw new Error('Shopify connection points to an organization that no longer exists.');

  let brandName: string | null = null;
  if (brandId) {
    const { data: brand, error: brandError } = await db
      .from('business_brands')
      .select('id,name,business_id')
      .eq('id', brandId)
      .eq('business_id', businessId)
      .maybeSingle();
    if (brandError) throw new Error(`Could not validate Shopify brand: ${brandError.message}`);
    if (!brand) throw new Error('Shopify connection points to a brand that no longer belongs to this organization.');
    brandName = brand.name || null;
  }

  let siteQuery = db
    .from('business_sites')
    .select('notification_email')
    .eq('business_id', businessId);
  if (brandId) siteQuery = siteQuery.eq('brand_id', brandId);
  const { data: sites, error: sitesError } = await siteQuery.limit(20);
  if (sitesError) throw new Error(`Could not load Shopify notification routing: ${sitesError.message}`);
  const boutiqueEmail = (sites ?? [])
    .map((site: any) => typeof site.notification_email === 'string' ? site.notification_email.trim().toLowerCase() : '')
    .find((email: string) => /^\S+@\S+\.\S+$/.test(email)) || null;

  return {
    businessId,
    brandId,
    locationId,
    businessName: business.name,
    brandName,
    boutiqueEmail,
    providerAccountId: canonical.external_account_id ?? null,
  };
}

function parseOrderAppointment(order: any): {
  date: string | null;
  time: string | null;
  storeKey?: string;
  type: string | null;
} {
  let date: string | null = null;
  let time: string | null = null;
  let storeKey: string | undefined;
  let type: string | null = null;

  if (Array.isArray(order?.line_items)) {
    for (const item of order.line_items) {
      if (!type && typeof item?.title === 'string' && item.title.trim()) type = item.title.trim().slice(0, 256);
      if (!Array.isArray(item?.properties)) continue;
      for (const prop of item.properties) {
        const name = String(prop?.name || '').trim().toLowerCase();
        const value = String(prop?.value || '').trim();
        if (!value) continue;
        if (name.includes('date') && /^20\d{2}-\d{2}-\d{2}$/.test(value)) date = value;
        if (name.includes('time')) time = value.slice(0, 64);
        if (name.includes('store') || name.includes('location')) storeKey = value;
      }
    }
  }

  return { date, time, storeKey, type };
}

async function quarantineShopifyIdentity(
  db: SupabaseClient | any,
  input: { businessId: string; externalOrderId: string; order: any; reason: string },
): Promise<void> {
  const { error } = await db.from('integration_dlq_events').insert({
    business_id: input.businessId,
    provider: 'shopify',
    event_type: 'orders/create',
    idempotency_key: `shopify:order:${input.externalOrderId}`,
    payload: input.order,
    headers: {},
    error_message: input.reason,
    status: 'PENDING',
  });
  if (error && error.code !== '23505') {
    console.error('[shopify] Unable to quarantine unresolved identity:', error.message);
  }
}

async function markShopifyDeliveryHealthy(
  db: SupabaseClient | any,
  businessId: string,
  providerAccountId: string | null,
): Promise<void> {
  let query = db
    .from('growth_provider_connections')
    .update({
      status: 'connected',
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'success',
      last_error: null,
    })
    .eq('business_id', businessId)
    .eq('provider', 'shopify');
  if (providerAccountId) query = query.eq('external_account_id', providerAccountId);
  const { error } = await query;
  if (error) throw new Error(`Could not update Shopify delivery health: ${error.message}`);
}

shopifyRouter.post('/webhooks/orders/create', async (req: Request, res: Response) => {
  try {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256') || req.get('x-shopify-hmac-sha256');
    const shopDomain = req.get('X-Shopify-Shop-Domain') || req.get('x-shopify-shop-domain');
    if (!shopDomain) return res.status(400).json({ error: 'Missing X-Shopify-Shop-Domain header.' });

    const secret = readShopifyWebhookSecret(shopDomain);
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!verifyShopifyWebhookHmac(rawBody, hmacHeader, secret)) {
      return res.status(401).json({ error: 'Unauthorized: invalid or missing Shopify webhook signature.' });
    }

    const order = req.body;
    if (!order || typeof order !== 'object' || !order.id) {
      return res.status(200).json({ success: true, ignored: true, message: 'Ignored: payload has no Shopify order id.' });
    }

    const externalOrderId = String(order.id);
    const db = (req as any).context?.db || getShopifyDb();
    const appointment = parseOrderAppointment(order);
    const shopifyLocationId = order.location_id ? String(order.location_id) : undefined;
    const tenant = await resolveShopifyTenant(db, shopDomain, appointment.storeKey, shopifyLocationId);
    const { businessId, brandId, locationId, businessName, brandName, boutiqueEmail, providerAccountId } = tenant;

    const { data: existingOrder, error: existingError } = await db
      .from('orders')
      .select('id,status')
      .eq('business_id', businessId)
      .eq('external_order_id', externalOrderId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingOrder) {
      await db.from('orders').update({
        status: order.financial_status || existingOrder.status,
        updated_at: new Date().toISOString(),
      }).eq('id', existingOrder.id);
      await markShopifyDeliveryHealthy(db, businessId, providerAccountId);
      return res.status(200).json({ success: true, duplicate: true, orderId: existingOrder.id });
    }

    const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
    const identity = await resolveIntegrationCustomer(db, {
      businessId,
      provider: 'SHOPIFY',
      externalId: order.customer?.id ? String(order.customer.id) : null,
      name: customerName || null,
      email: order.email || order.customer?.email || null,
      phone: order.phone || order.customer?.phone || null,
      locationId,
    });

    if (!identity.customerId) {
      await quarantineShopifyIdentity(db, {
        businessId,
        externalOrderId,
        order,
        reason: 'Verified Shopify order could not be mapped to an authentic customer identity.',
      });
      return res.status(200).json({ success: true, quarantined: true, reason: 'CUSTOMER_IDENTITY_UNRESOLVED' });
    }

    const total = Number.parseFloat(String(order.total_price ?? '0'));
    const totalCents = Number.isFinite(total) && total >= 0 ? Math.round(total * 100) : 0;
    const orderInsert = await db.from('orders').insert({
      business_id: businessId,
      location_id: locationId,
      customer_id: identity.customerId,
      external_order_id: externalOrderId,
      source_type: 'SHOPIFY',
      total_cents: totalCents,
      status: order.financial_status || 'pending',
    }).select('id').single();

    if (orderInsert.error) {
      if (orderInsert.error.code === '23505') {
        return res.status(200).json({ success: true, duplicate: true, orderId: externalOrderId });
      }
      throw orderInsert.error;
    }

    const sourceLabel = brandName ? `Shopify Storefront — ${brandName}` : 'Shopify Storefront';
    let appointmentRequestId: string | null = null;

    // A Shopify purchase is not automatically an appointment. Only create the
    // appointment/lead when the verified order contains an explicit appointment date.
    if (appointment.date) {
      const { data: apptData, error: apptError } = await db.from('appointment_requests').insert({
        customer_id: identity.customerId,
        business_id: businessId,
        brand_id: brandId,
        preferred_location_id: locationId,
        intake_source: sourceLabel,
        preferred_date_1: appointment.date,
        preferred_window_1: appointment.time,
        status: 'submitted',
        priority: 'normal',
        notes: [
          appointment.type ? `Appointment type: ${appointment.type}` : null,
          `Shopify order #${order.order_number || externalOrderId}`,
        ].filter(Boolean).join(' | '),
      }).select('id').single();
      if (apptError) throw apptError;
      appointmentRequestId = apptData?.id ?? null;

      if (customerName) {
        const leadInsert = await db.from('leads').insert({
          business_id: businessId,
          location_id: locationId,
          name: customerName,
          email: identity.email,
          source: sourceLabel,
          budget_cents: null,
          wedding_date: null,
          stage: 'Appointment Set',
        });
        if (leadInsert.error) throw leadInsert.error;
      }
    }

    const routingName = brandName || businessName;
    const details = appointment.date
      ? ` Appointment: ${appointment.type || 'booking'} on ${appointment.date}${appointment.time ? ` at ${appointment.time}` : ''}.`
      : '';
    const bodyText = `Shopify order ${order.order_number || externalOrderId} received for ${customerName || identity.email || identity.phone || 'resolved customer'} at ${routingName}. Total: $${(totalCents / 100).toFixed(2)}.${details}`;
    // Notifications are tenant-configured only. Never copy another VowOS tenant's
    // mailbox into a webhook route, because that would disclose order/customer data.
    const recipients = boutiqueEmail ? [boutiqueEmail] : [];

    for (const recipient of recipients) {
      try {
        await getShopifyDb().functions.invoke('send-message', {
          body: { channel: 'email', to: recipient, subject: `Shopify Order Notification — ${order.order_number || externalOrderId}`, body: bodyText },
        });
      } catch (error) {
        console.error(`[shopify] Email delivery warning for ${recipient}:`, error);
      }
    }

    const messageInsert = await db.from('messages').insert({
      business_id: businessId,
      location_id: locationId,
      customer_id: identity.customerId,
      sender: sourceLabel,
      content: bodyText,
      channel: 'email',
      status: 'sent',
      direction: 'outbound',
      sent_at: new Date().toISOString(),
    });
    if (messageInsert.error) throw messageInsert.error;

    await markShopifyDeliveryHealthy(db, businessId, providerAccountId);

    return res.status(200).json({
      success: true,
      orderId: orderInsert.data?.id ?? externalOrderId,
      customerId: identity.customerId,
      customerResolution: identity.resolution,
      appointmentRequestId,
      businessId,
      brandId,
      locationId,
    });
  } catch (err: any) {
    if (err instanceof ShopifyConnectionInactiveError) {
      return res.status(410).json({ success: false, ignored: true, error: err.message });
    }
    console.error('[shopify] Webhook processing error:', err?.message || err);
    return res.status(500).json({ error: 'Shopify webhook processing failed.' });
  }
});
