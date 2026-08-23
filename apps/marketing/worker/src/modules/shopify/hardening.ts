import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveStore, isStoreKey } from '../scheduling/publicIntake';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { saveTokens } from '../growth/store';
import {
  deleteShopifyWebhookSubscriptions,
  ensureShopifyWebhookSubscriptions,
  exchangeShopifyCode,
  normalizeShopDomain,
  readShopifyOAuthConfig,
  SHOPIFY_API_VERSION,
  SHOPIFY_SCOPES,
  verifyShopifyCallbackHmac,
  verifyShopifyShop,
  verifyShopifyState,
} from './oauth';
import { markShopifyConnectionError, upsertShopifyConnection } from './store';

let defaultDbClient: SupabaseClient | null = null;
function getShopifyDb(): SupabaseClient {
  if (defaultDbClient) return defaultDbClient;
  const url = process.env.VITE_SUPABASE_URL || 'https://missing-config.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-service-key';
  defaultDbClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return defaultDbClient;
}

export const shopifyHardeningRouter = Router();

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const isUniqueViolation = (error: unknown): boolean =>
  Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505');
const nowIso = (): string => new Date().toISOString();
const clip = (value: unknown, max = 500): string => String(value ?? '').trim().slice(0, max);

function metadataObject(metadata: unknown): Record<string, any> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as Record<string, any>
    : {};
}

function metadataBrandId(metadata: unknown): string | null {
  const value = metadataObject(metadata).brandId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function canonicalHeaderShop(value: string | undefined): string | null {
  return value ? normalizeShopDomain(value) : null;
}

function webhookSecret(): string | undefined {
  // Shopify signs webhooks with the app client secret. Keep the dedicated env
  // alias for deployments that already use it, but never require a second key.
  return process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
}

function rawBodyBuffer(req: Request): Buffer {
  const raw = (req as any).rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (typeof raw === 'string') return Buffer.from(raw, 'utf8');
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  return Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
}

/** Constant-time HMAC-SHA256 verification over the unmodified Shopify body. */
export function verifyShopifyWebhookHmac(
  rawBody: Buffer | string | undefined,
  hmacHeader: string | undefined,
  secret: string | undefined,
): boolean {
  if (!rawBody || !hmacHeader || !secret) return false;
  try {
    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
    const expected = Buffer.from(crypto.createHmac('sha256', secret).update(body).digest('base64'), 'utf8');
    const actual = Buffer.from(hmacHeader.trim(), 'utf8');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function validateWebhookRequest(req: Request): { rawBody: Buffer; shopDomain: string } | null {
  const rawBody = rawBodyBuffer(req);
  const hmac = req.get('X-Shopify-Hmac-Sha256') || req.get('x-shopify-hmac-sha256') || undefined;
  if (!verifyShopifyWebhookHmac(rawBody, hmac, webhookSecret())) return null;
  const shopDomain = canonicalHeaderShop(
    req.get('X-Shopify-Shop-Domain') || req.get('x-shopify-shop-domain') || undefined,
  );
  if (!shopDomain) return null;
  return { rawBody, shopDomain };
}

function webhookId(req: Request, rawBody: Buffer, topic: string, shop: string): string {
  const header = req.get('X-Shopify-Webhook-Id') || req.get('x-shopify-webhook-id');
  if (header?.trim()) return header.trim().slice(0, 200);
  return `body:${crypto.createHash('sha256').update(topic).update('\0').update(shop).update('\0').update(rawBody).digest('hex')}`;
}

function parseWebhookJson(req: Request, rawBody: Buffer): any {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  return JSON.parse(rawBody.toString('utf8'));
}

function safeDate(value: unknown): string {
  const raw = clip(value, 64);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = raw ? new Date(raw) : new Date();
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

function mapLocationId(metadata: Record<string, any>, shopifyLocationId?: string): string | null {
  if (!shopifyLocationId || !Array.isArray(metadata.locationMappings)) return null;
  for (const item of metadata.locationMappings) {
    if (!item || typeof item !== 'object') continue;
    if (String(item.shopifyLocationId ?? '') !== shopifyLocationId) continue;
    const value = item.vowosLocationId;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
  return null;
}

export class ShopifyConnectionInactiveError extends Error {
  constructor(public readonly shopDomain: string, public readonly status: string) {
    super(`Shopify store "${shopDomain}" is ${status || 'inactive'} in VowOS. Reconnect it before processing webhooks.`);
    this.name = 'ShopifyConnectionInactiveError';
  }
}

/**
 * Deterministic Shopify routing. The OAuth connection is the sole authority for
 * business + brand identity. Store keys and Shopify location ids may refine the
 * location only after that identity has been proven.
 */
export async function resolveShopifyTenant(
  db: SupabaseClient | any,
  shopDomainHeader?: string,
  storeKeyProperty?: string,
  shopifyLocationId?: string,
): Promise<{
  connectionId: string;
  businessId: string;
  brandId: string;
  locationId: string | null;
  businessName: string;
  brandName: string;
  boutiqueEmail: string;
  notificationEmails: string[];
}> {
  const cleanDomain = canonicalHeaderShop(shopDomainHeader);
  if (!cleanDomain) {
    throw new Error('Shopify webhook is missing a valid permanent myshopify.com domain.');
  }

  const connectionResult = await db
    .from('growth_provider_connections')
    .select('id,business_id,metadata,status')
    .eq('provider', 'shopify')
    .ilike('metadata->>shopDomain', cleanDomain)
    .limit(2);
  if (connectionResult?.error) {
    throw new Error(`Could not resolve Shopify connection for "${cleanDomain}": ${connectionResult.error.message}`);
  }
  const connections = (connectionResult?.data ?? []) as Array<{
    id: string;
    business_id: string;
    status: string | null;
    metadata: Record<string, any> | null;
  }>;
  if (connections.length !== 1) {
    throw new Error(connections.length
      ? `Shopify domain "${cleanDomain}" is bound to more than one VowOS connection.`
      : `Shopify domain "${cleanDomain}" is not OAuth-bound to VowOS. Connect the store from the correct brand workspace.`);
  }

  const connection = connections[0];
  const status = String(connection.status ?? '').trim().toLowerCase();
  if (status !== 'connected') throw new ShopifyConnectionInactiveError(cleanDomain, status || 'inactive');

  const metadata = metadataObject(connection.metadata);
  const brandId = metadataBrandId(metadata);
  if (!brandId) {
    throw new Error(`Shopify store "${cleanDomain}" has no exact VowOS brand binding. Reconnect it from a specific brand.`);
  }
  const businessId = connection.business_id;

  const [businessResult, brandResult] = await Promise.all([
    db.from('businesses').select('id,name').eq('id', businessId).maybeSingle(),
    db.from('business_brands').select('id,name,business_id').eq('id', brandId).eq('business_id', businessId).maybeSingle(),
  ]);
  if (businessResult?.error || !businessResult?.data) throw new Error('Shopify connection points to a business that no longer exists.');
  if (brandResult?.error || !brandResult?.data) throw new Error('Shopify connection points to a brand that no longer belongs to this business.');

  let locationId: string | null = null;
  const mapped = mapLocationId(metadata, shopifyLocationId);
  if (mapped) {
    if (isStoreKey(mapped)) {
      const resolved = await resolveStore(db, mapped);
      if (resolved.businessId !== businessId || (resolved.brandId && resolved.brandId !== brandId)) {
        throw new Error('Shopify location mapping points outside the OAuth-bound VowOS brand.');
      }
      locationId = resolved.locationId;
    } else {
      const locationResult = await db
        .from('locations')
        .select('id,business_id')
        .eq('id', mapped)
        .eq('business_id', businessId)
        .maybeSingle();
      if (locationResult?.error || !locationResult?.data) {
        throw new Error('Shopify location mapping points to an invalid VowOS location.');
      }
      locationId = locationResult.data.id;
    }
  }

  if (storeKeyProperty && isStoreKey(storeKeyProperty)) {
    const resolved = await resolveStore(db, storeKeyProperty);
    if (resolved.businessId !== businessId || (resolved.brandId && resolved.brandId !== brandId)) {
      throw new Error('Shopify storefront location conflicts with the OAuth-bound VowOS brand.');
    }
    if (locationId && resolved.locationId && locationId !== resolved.locationId) {
      throw new Error('Shopify order contains two conflicting VowOS location mappings.');
    }
    locationId = locationId || resolved.locationId;
  }

  const siteResult = await db
    .from('business_sites')
    .select('notification_email')
    .eq('business_id', businessId)
    .eq('brand_id', brandId)
    .limit(20);
  if (siteResult?.error) throw new Error(`Could not resolve brand notification routing: ${siteResult.error.message}`);
  const notificationEmails = [...new Set((siteResult?.data ?? [])
    .map((site: any) => typeof site.notification_email === 'string' ? site.notification_email.trim().toLowerCase() : '')
    .filter(Boolean))];

  return {
    connectionId: connection.id,
    businessId,
    brandId,
    locationId,
    businessName: businessResult.data.name || 'Retail Business',
    brandName: brandResult.data.name || 'Retail Brand',
    boutiqueEmail: notificationEmails[0] || 'robertsenterprises@bridgebox.ai',
    notificationEmails,
  };
}

/** Full readiness without leaking credential values. */
shopifyHardeningRouter.get('/setup/status', (_req, res) => {
  const redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI ?? null;
  let redirectUriValid = false;
  let webhookOrigin: string | null = null;
  try {
    const parsed = redirectUri ? new URL(redirectUri) : null;
    redirectUriValid = Boolean(parsed && parsed.protocol === 'https:' && /\/api\/shopify\/callback\/?$/.test(parsed.pathname));
    webhookOrigin = parsed?.origin ?? null;
  } catch {
    redirectUriValid = false;
  }

  const checks = [
    { key: 'SHOPIFY_CLIENT_ID', ok: Boolean(process.env.SHOPIFY_CLIENT_ID) },
    { key: 'SHOPIFY_CLIENT_SECRET', ok: Boolean(process.env.SHOPIFY_CLIENT_SECRET) },
    { key: 'SHOPIFY_OAUTH_REDIRECT_URI', ok: Boolean(redirectUri) },
    { key: 'SHOPIFY_STATE_SECRET', ok: Boolean(process.env.SHOPIFY_STATE_SECRET) },
    { key: 'SHOPIFY_WEBHOOK_SECRET_OR_CLIENT_SECRET', ok: Boolean(webhookSecret()) },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
  ];
  const missing = checks.filter((check) => !check.ok).map((check) => check.key);
  const ready = missing.length === 0 && redirectUriValid;
  res.status(ready ? 200 : 503).json({
    ready,
    missing,
    apiVersion: SHOPIFY_API_VERSION,
    adminApi: 'graphql',
    redirectUri,
    redirectUriValid,
    expectedRedirectPath: '/api/shopify/callback',
    managedWebhookRegistration: 'automatic-after-oauth',
    managedWebhooks: webhookOrigin ? [
      `${webhookOrigin}/api/shopify/webhooks/orders/create`,
      `${webhookOrigin}/api/shopify/webhooks/app/uninstalled`,
    ] : [],
    privacyCompliance: {
      handlersReady: true,
      subscriptionMode: 'shopify-app-specific',
      mandatoryTopics: ['customers/data_request', 'customers/redact', 'shop/redact'],
      paths: [
        '/api/shopify/webhooks/customers/data_request',
        '/api/shopify/webhooks/customers/redact',
        '/api/shopify/webhooks/shop/redact',
      ],
    },
  });
});

/**
 * Hardened callback: validates Shopify HMAC + signed VowOS state, verifies the
 * shop via GraphQL, persists credentials, then idempotently provisions all
 * shop-specific webhooks before reporting success to Settings.
 */
shopifyHardeningRouter.get('/callback', async (req, res) => {
  const appUrl = process.env.PUBLIC_APP_URL || 'https://vowos.bridgebox.ai';
  const state = asString(req.query.state);
  const code = asString(req.query.code);
  const returnedShop = normalizeShopDomain(asString(req.query.shop) ?? '');
  const config = readShopifyOAuthConfig();
  const redirect = (ok: boolean, error?: string, brandId?: string, shop?: string) => {
    const destination = new URL('/settings', appUrl);
    destination.searchParams.set('tab', 'integrations');
    destination.searchParams.set('shopify', ok ? 'connected' : 'failed');
    if (error) destination.searchParams.set('error', error.slice(0, 900));
    if (brandId) destination.searchParams.set('brandId', brandId);
    if (shop) destination.searchParams.set('shop', shop);
    return destination.toString();
  };

  if (!state || !code || !returnedShop || !config) {
    return res.redirect(redirect(false, 'Missing or invalid Shopify authorization details.'));
  }
  if (!verifyShopifyCallbackHmac(req.query as Record<string, unknown>, config.clientSecret)) {
    return res.redirect(redirect(false, 'Shopify callback signature validation failed. Restart the connection from VowOS.'));
  }
  const payload = verifyShopifyState(state);
  if (!payload || payload.shop !== returnedShop) {
    return res.redirect(redirect(false, 'The Shopify authorization expired or no longer matches this store. Restart the connection from VowOS.'));
  }

  try {
    const db = getShopifyDb();
    const brandQuery = await db
      .from('business_brands')
      .select('id,name')
      .eq('business_id', payload.businessId)
      .order('name');
    if (brandQuery.error) throw new Error(`Could not verify Shopify brand ownership: ${brandQuery.error.message}`);
    const brands = brandQuery.data ?? [];
    if (brands.length > 1 && !payload.brandId) {
      throw new Error('This organization has multiple brands; Shopify must be connected from one exact brand workspace.');
    }
    if (payload.brandId && !brands.some((brand: any) => brand.id === payload.brandId)) {
      throw new Error('The selected VowOS brand no longer exists in this organization.');
    }

    const tokens = await exchangeShopifyCode(config, returnedShop, code);
    const shop = await verifyShopifyShop(returnedShop, tokens.accessToken);
    const canonicalShopDomain = normalizeShopDomain(shop.myshopify_domain);
    if (!canonicalShopDomain) throw new Error('Shopify returned an invalid permanent shop domain.');

    const existingResult = await db
      .from('growth_provider_connections')
      .select('id,metadata,business_id')
      .eq('provider', 'shopify')
      .eq('external_account_id', shop.id)
      .limit(2);
    if (existingResult.error) throw new Error(`Could not verify existing Shopify binding: ${existingResult.error.message}`);
    for (const existing of existingResult.data ?? []) {
      const existingBrandId = metadataBrandId(existing.metadata);
      if (existing.business_id !== payload.businessId || (existingBrandId && payload.brandId && existingBrandId !== payload.brandId)) {
        throw new Error('This Shopify account is already assigned to a different VowOS organization or brand. Disconnect it there before reconnecting.');
      }
    }

    const connection = await upsertShopifyConnection(payload.businessId, shop.id, {
      status: 'connected',
      external_account_id: shop.id,
      display_name: shop.name,
      connected_by: payload.userId,
      connected_at: nowIso(),
      last_error: null,
      scopes: tokens.scope.length ? tokens.scope : SHOPIFY_SCOPES,
      metadata: {
        shopDomain: canonicalShopDomain,
        brandId: payload.brandId,
        adminApiVersion: SHOPIFY_API_VERSION,
        adminApiTransport: 'graphql',
      },
    } as never);

    await saveTokens(connection.id, {
      accessToken: tokens.accessToken,
      refreshToken: null,
      tokenType: 'shopify-offline',
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      scope: tokens.scope.join(' '),
    });

    await ensureShopifyWebhookSubscriptions(canonicalShopDomain, tokens.accessToken);
    await upsertShopifyConnection(payload.businessId, shop.id, {
      status: 'connected',
      last_error: null,
      metadata: { webhooksProvisionedAt: nowIso() },
    } as never);

    return res.redirect(redirect(true, undefined, payload.brandId, canonicalShopDomain));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markShopifyConnectionError(payload.businessId, returnedShop, message).catch(() => undefined);
    return res.redirect(redirect(false, message, payload.brandId, returnedShop));
  }
});

/** Disconnect one exact store, remove VowOS webhooks remotely when possible, then destroy local credentials. */
shopifyHardeningRouter.delete('/disconnect', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const requestedShop = normalizeShopDomain(asString(req.query.shop) ?? '');
  const db = getShopifyDb();

  let query = db
    .from('growth_provider_connections')
    .select('id,metadata,external_account_id')
    .eq('business_id', businessId)
    .eq('provider', 'shopify');
  if (requestedShop) query = query.ilike('metadata->>shopDomain', requestedShop);
  const lookup = await query.limit(2);
  if (lookup.error) return res.status(500).json({ error: `Could not resolve Shopify connection: ${lookup.error.message}` });
  const connections = lookup.data ?? [];
  if (!connections.length) return res.json({ success: true, alreadyDisconnected: true });
  if (connections.length > 1) {
    return res.status(409).json({ error: 'More than one Shopify store is connected. Specify the permanent .myshopify.com domain.' });
  }

  const connection = connections[0];
  const shop = normalizeShopDomain(metadataObject(connection.metadata).shopDomain ?? '') || requestedShop;
  const secretResult = await db
    .from('growth_provider_secrets')
    .select('access_token')
    .eq('connection_id', connection.id)
    .maybeSingle();

  let remoteWarning: string | null = null;
  if (shop && secretResult.data?.access_token) {
    try {
      await deleteShopifyWebhookSubscriptions(shop, secretResult.data.access_token);
    } catch (error) {
      remoteWarning = error instanceof Error ? error.message : String(error);
    }
  }

  const secretDelete = await db.from('growth_provider_secrets').delete().eq('connection_id', connection.id);
  if (secretDelete.error) return res.status(500).json({ error: `Could not remove Shopify credentials: ${secretDelete.error.message}` });
  const nextMetadata = { ...metadataObject(connection.metadata), webhooksProvisionedAt: null };
  const connectionUpdate = await db
    .from('growth_provider_connections')
    .update({ status: 'disconnected', last_error: remoteWarning, last_sync_status: null, metadata: nextMetadata })
    .eq('id', connection.id);
  if (connectionUpdate.error) return res.status(500).json({ error: `Could not mark Shopify disconnected: ${connectionUpdate.error.message}` });

  return res.json({ success: true, remoteWebhooksRemoved: !remoteWarning, warning: remoteWarning });
});

async function beginWebhookEvent(
  db: any,
  id: string,
  topic: string,
  shop: string,
): Promise<{ duplicate: boolean; rowId: string | null }> {
  const existing = await db.from('shopify_webhook_events').select('id,status,attempts').eq('webhook_id', id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.status === 'succeeded') return { duplicate: true, rowId: existing.data.id };
  if (existing.data) {
    const updated = await db.from('shopify_webhook_events').update({
      status: 'processing',
      attempts: Number(existing.data.attempts ?? 1) + 1,
      last_error: null,
      updated_at: nowIso(),
    }).eq('id', existing.data.id);
    if (updated.error) throw updated.error;
    return { duplicate: false, rowId: existing.data.id };
  }
  const inserted = await db.from('shopify_webhook_events').insert({
    webhook_id: id,
    topic,
    shop_domain: shop,
    status: 'processing',
    attempts: 1,
  }).select('id').single();
  if (inserted.error) {
    if (isUniqueViolation(inserted.error)) {
      const race = await db.from('shopify_webhook_events').select('id,status').eq('webhook_id', id).maybeSingle();
      return { duplicate: race.data?.status === 'succeeded', rowId: race.data?.id ?? null };
    }
    throw inserted.error;
  }
  return { duplicate: false, rowId: inserted.data.id };
}

async function failWebhookEvent(db: any, rowId: string | null, error: unknown): Promise<void> {
  if (!rowId) return;
  await db.from('shopify_webhook_events').update({
    status: 'failed',
    last_error: clip(error instanceof Error ? error.message : error, 1000),
    updated_at: nowIso(),
  }).eq('id', rowId);
}

async function findOrCreateShopifyCustomer(
  db: any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  shop: string,
  order: any,
): Promise<{ customerId: string; externalCustomerId: string; created: boolean }> {
  const rawEmail = clip(order.email || order.customer?.email, 320).toLowerCase();
  const phone = clip(order.phone || order.customer?.phone, 64) || null;
  const externalCustomerId = clip(order.customer?.id, 128);
  if (!externalCustomerId) throw new Error('Shopify order customer has no stable customer id.');
  const name = clip(`${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`, 240) || 'Shopify Customer';

  const link = await db.from('shopify_customer_links')
    .select('customer_id,business_id,brand_id')
    .eq('shop_domain', shop)
    .eq('external_customer_id', externalCustomerId)
    .maybeSingle();
  if (link.error) throw link.error;
  if (link.data) {
    if (link.data.business_id !== tenant.businessId || link.data.brand_id !== tenant.brandId) {
      throw new Error('Shopify customer identity is already linked outside the OAuth-bound brand.');
    }
    return { customerId: link.data.customer_id, externalCustomerId, created: false };
  }

  let customerId: string | null = null;
  let created = false;
  if (rawEmail) {
    const existing = await db.from('customers').select('id')
      .eq('business_id', tenant.businessId).ilike('email', rawEmail).limit(1);
    if (existing.error) throw existing.error;
    customerId = existing.data?.[0]?.id ?? null;
  }
  if (!customerId && phone) {
    const existing = await db.from('customers').select('id')
      .eq('business_id', tenant.businessId).eq('phone', phone).limit(1);
    if (existing.error) throw existing.error;
    customerId = existing.data?.[0]?.id ?? null;
  }
  if (!customerId) {
    const inserted = await db.from('customers').insert({
      name,
      email: rawEmail || null,
      phone,
      business_id: tenant.businessId,
      location_id: tenant.locationId,
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    customerId = inserted.data.id;
    created = true;
  }

  const linkInsert = await db.from('shopify_customer_links').insert({
    connection_id: tenant.connectionId,
    business_id: tenant.businessId,
    brand_id: tenant.brandId,
    shop_domain: shop,
    external_customer_id: externalCustomerId,
    customer_id: customerId,
    customer_created_by_shopify: created,
  });
  if (linkInsert.error && !isUniqueViolation(linkInsert.error)) throw linkInsert.error;
  if (linkInsert.error && isUniqueViolation(linkInsert.error)) {
    const race = await db.from('shopify_customer_links').select('customer_id,business_id,brand_id')
      .eq('shop_domain', shop).eq('external_customer_id', externalCustomerId).maybeSingle();
    if (!race.data || race.data.business_id !== tenant.businessId || race.data.brand_id !== tenant.brandId) {
      throw new Error('Concurrent Shopify customer linkage resolved outside the expected brand.');
    }
    customerId = race.data.customer_id;
  }
  return { customerId, externalCustomerId, created };
}

async function upsertShopifyOrder(
  db: any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  shop: string,
  externalOrderId: string,
  customerId: string,
  order: any,
): Promise<string> {
  const existing = await db.from('orders').select('id,status')
    .eq('business_id', tenant.businessId).eq('external_order_id', externalOrderId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const update = await db.from('orders').update({
      status: order.financial_status || existing.data.status,
      location_id: tenant.locationId,
      customer_id: customerId,
      brand_id: tenant.brandId,
      shop_domain: shop,
      updated_at: nowIso(),
    }).eq('id', existing.data.id);
    if (update.error) throw update.error;
    return existing.data.id;
  }

  const total = Number.parseFloat(String(order.total_price ?? '0'));
  const inserted = await db.from('orders').insert({
    business_id: tenant.businessId,
    brand_id: tenant.brandId,
    location_id: tenant.locationId,
    customer_id: customerId,
    external_order_id: externalOrderId,
    shop_domain: shop,
    source_type: 'SHOPIFY',
    total_cents: Number.isFinite(total) ? Math.round(total * 100) : 0,
    status: order.financial_status || 'paid',
  }).select('id').single();
  if (!inserted.error) return inserted.data.id;
  if (!isUniqueViolation(inserted.error)) throw inserted.error;
  const race = await db.from('orders').select('id').eq('business_id', tenant.businessId)
    .eq('external_order_id', externalOrderId).maybeSingle();
  if (!race.data?.id) throw inserted.error;
  return race.data.id;
}

function orderAppointmentDetails(order: any): { date: string; time: string; storeKey?: string; type: string } {
  let date: unknown = new Date().toISOString().slice(0, 10);
  let time = '12:00 PM';
  let storeKey: string | undefined;
  let type = 'Bridal Appointment';
  if (Array.isArray(order.line_items) && order.line_items.length) {
    const item = order.line_items[0] ?? {};
    type = clip(item.title, 240) || type;
    if (Array.isArray(item.properties)) {
      for (const property of item.properties) {
        const name = clip(property?.name, 120).toLowerCase();
        if (name.includes('date')) date = property?.value;
        if (name.includes('time')) time = clip(property?.value, 120) || time;
        if (name.includes('store') || name.includes('location')) storeKey = clip(property?.value, 120) || undefined;
      }
    }
  }
  return { date: safeDate(date), time, storeKey, type };
}

async function findOrCreateAppointmentRequest(
  db: any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  shop: string,
  externalOrderId: string,
  customerId: string,
  order: any,
  details: ReturnType<typeof orderAppointmentDetails>,
): Promise<string> {
  const idempotencyKey = `shopify-order:${shop}:${externalOrderId}`.slice(0, 128);
  const existing = await db.from('appointment_requests').select('id')
    .eq('business_id', tenant.businessId).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;

  const sourceLabel = `Shopify Storefront — ${tenant.brandName}`;
  const inserted = await db.from('appointment_requests').insert({
    customer_id: customerId,
    business_id: tenant.businessId,
    brand_id: tenant.brandId,
    preferred_location_id: tenant.locationId,
    intake_source: sourceLabel,
    preferred_date_1: details.date,
    preferred_window_1: details.time,
    status: 'submitted',
    priority: 'normal',
    idempotency_key: idempotencyKey,
    notes: `Appointment Type: ${details.type} | Shopify Order #${clip(order.order_number || externalOrderId, 120)}`,
  }).select('id').single();
  if (!inserted.error) return inserted.data.id;
  if (!isUniqueViolation(inserted.error)) throw inserted.error;
  const race = await db.from('appointment_requests').select('id')
    .eq('business_id', tenant.businessId).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (!race.data?.id) throw inserted.error;
  return race.data.id;
}

async function findOrCreateShopifyLead(
  db: any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  shop: string,
  externalOrderId: string,
  order: any,
  details: ReturnType<typeof orderAppointmentDetails>,
): Promise<string | null> {
  const externalReference = `${shop}:${externalOrderId}`.slice(0, 300);
  const existing = await db.from('leads').select('id')
    .eq('business_id', tenant.businessId)
    .eq('external_source', 'shopify_order')
    .eq('external_reference', externalReference)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;

  const email = clip(order.email || order.customer?.email, 320).toLowerCase() || null;
  const name = clip(`${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`, 240) || 'Shopify Customer';
  const inserted = await db.from('leads').insert({
    business_id: tenant.businessId,
    location_id: tenant.locationId,
    name,
    email,
    source: `Shopify Storefront — ${tenant.brandName}`,
    external_source: 'shopify_order',
    external_reference: externalReference,
    budget_cents: 300000,
    wedding_date: details.date,
    stage: 'Appointment Set',
  }).select('id').single();
  if (!inserted.error) return inserted.data.id;
  if (!isUniqueViolation(inserted.error)) throw inserted.error;
  const race = await db.from('leads').select('id')
    .eq('business_id', tenant.businessId)
    .eq('external_source', 'shopify_order')
    .eq('external_reference', externalReference)
    .maybeSingle();
  return race.data?.id ?? null;
}

async function enqueueShopifyNotifications(
  db: any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  appointmentRequestId: string,
  order: any,
  details: ReturnType<typeof orderAppointmentDetails>,
): Promise<void> {
  const total = Number.parseFloat(String(order.total_price ?? '0'));
  const totalText = Number.isFinite(total) ? `$${total.toFixed(2)}` : '$0.00';
  const name = clip(`${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`, 240) || 'Shopify Customer';
  const body = `New appointment booked via Shopify by ${name}. Total Paid: ${totalText}. Appointment: ${details.type} on ${details.date} at ${details.time} (${tenant.brandName}).`;
  const recipients = [...new Set(['robertsenterprises@bridgebox.ai', ...tenant.notificationEmails].filter(Boolean))];
  for (const recipient of recipients) {
    const result = await db.from('appointment_intake_notification_outbox').upsert({
      appointment_request_id: appointmentRequestId,
      business_id: tenant.businessId,
      brand_id: tenant.brandId,
      site_id: null,
      recipient,
      payload: { subject: `Shopify Booking Notification — ${name}`, body },
      notification_type: 'shopify_booking_received',
      status: 'pending',
      next_attempt_at: nowIso(),
      updated_at: nowIso(),
    }, {
      onConflict: 'appointment_request_id,recipient,notification_type',
      ignoreDuplicates: true,
    });
    if (result.error) throw result.error;
  }
}

/** Resumable, cross-delivery-idempotent Shopify order intake. */
shopifyHardeningRouter.post('/webhooks/orders/create', async (req: Request, res: Response) => {
  const verified = validateWebhookRequest(req);
  if (!verified) return res.status(401).json({ error: 'Unauthorized: invalid Shopify webhook signature or shop domain.' });
  const { rawBody, shopDomain } = verified;
  const eventId = webhookId(req, rawBody, 'orders/create', shopDomain);
  const db = (req as any).context?.db || getShopifyDb();
  let eventRowId: string | null = null;

  try {
    const event = await beginWebhookEvent(db, eventId, 'orders/create', shopDomain);
    eventRowId = event.rowId;
    if (event.duplicate) return res.status(200).json({ success: true, duplicate: true });

    const order = parseWebhookJson(req, rawBody);
    if (!order || typeof order !== 'object' || !order.customer || !order.id) {
      throw new Error('Shopify orders/create payload is missing order or customer identity.');
    }
    const externalOrderId = clip(order.id, 160);
    const details = orderAppointmentDetails(order);
    const shopifyLocationId = order.location_id ? clip(order.location_id, 128) : undefined;
    const tenant = await resolveShopifyTenant(db, shopDomain, details.storeKey, shopifyLocationId);

    await db.from('shopify_webhook_events').update({
      business_id: tenant.businessId,
      brand_id: tenant.brandId,
      external_resource_id: externalOrderId,
      updated_at: nowIso(),
    }).eq('id', eventRowId);

    const customer = await findOrCreateShopifyCustomer(db, tenant, shopDomain, order);
    const orderId = await upsertShopifyOrder(db, tenant, shopDomain, externalOrderId, customer.customerId, order);
    const appointmentRequestId = await findOrCreateAppointmentRequest(
      db, tenant, shopDomain, externalOrderId, customer.customerId, order, details,
    );
    const leadId = await findOrCreateShopifyLead(db, tenant, shopDomain, externalOrderId, order, details);
    await enqueueShopifyNotifications(db, tenant, appointmentRequestId, order, details);

    const completed = await db.from('shopify_webhook_events').update({
      status: 'succeeded',
      customer_id: customer.customerId,
      order_id: orderId,
      appointment_request_id: appointmentRequestId,
      lead_id: leadId,
      last_error: null,
      completed_at: nowIso(),
      updated_at: nowIso(),
    }).eq('id', eventRowId);
    if (completed.error) throw completed.error;

    return res.status(200).json({
      success: true,
      orderId,
      customerId: customer.customerId,
      appointmentRequestId,
      leadId,
      businessId: tenant.businessId,
      brandId: tenant.brandId,
      locationId: tenant.locationId,
    });
  } catch (error) {
    await failWebhookEvent(db, eventRowId, error).catch(() => undefined);
    if (error instanceof ShopifyConnectionInactiveError) {
      return res.status(410).json({ success: false, ignored: true, error: error.message });
    }
    console.error('[shopify] orders/create processing failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/** App uninstall immediately destroys the access token and fail-closes the connection. */
shopifyHardeningRouter.post('/webhooks/app/uninstalled', async (req: Request, res: Response) => {
  const verified = validateWebhookRequest(req);
  if (!verified) return res.status(401).json({ error: 'Unauthorized: invalid Shopify webhook signature or shop domain.' });
  const db = (req as any).context?.db || getShopifyDb();
  try {
    const lookup = await db.from('growth_provider_connections')
      .select('id,metadata,status')
      .eq('provider', 'shopify')
      .ilike('metadata->>shopDomain', verified.shopDomain)
      .limit(2);
    if (lookup.error) throw lookup.error;
    if ((lookup.data ?? []).length > 1) throw new Error('Shopify uninstall domain is ambiguously bound in VowOS.');
    const connection = lookup.data?.[0];
    if (connection) {
      await db.from('growth_provider_secrets').delete().eq('connection_id', connection.id);
      const metadata = { ...metadataObject(connection.metadata), webhooksProvisionedAt: null, uninstalledAt: nowIso() };
      const update = await db.from('growth_provider_connections').update({
        status: 'revoked',
        last_error: 'Shopify app was uninstalled from the merchant store.',
        metadata,
      }).eq('id', connection.id);
      if (update.error) throw update.error;
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[shopify] app/uninstalled processing failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

type PrivacyTopic = 'customers/data_request' | 'customers/redact' | 'shop/redact';

async function privacyConnection(db: any, shop: string): Promise<any | null> {
  const lookup = await db.from('growth_provider_connections')
    .select('id,business_id,metadata,status')
    .eq('provider', 'shopify')
    .ilike('metadata->>shopDomain', shop)
    .limit(2);
  if (lookup.error) throw lookup.error;
  if ((lookup.data ?? []).length > 1) throw new Error('Shopify privacy webhook domain is ambiguously bound in VowOS.');
  return lookup.data?.[0] ?? null;
}

function privacyCustomerId(payload: any): string | null {
  const value = payload?.customer?.id ?? payload?.customer_id;
  return value === undefined || value === null ? null : clip(value, 160);
}

async function beginPrivacyRequest(
  db: any,
  req: Request,
  verified: { rawBody: Buffer; shopDomain: string },
  topic: PrivacyTopic,
  payload: any,
  connection: any | null,
): Promise<{ duplicate: boolean; id: string }> {
  const id = webhookId(req, verified.rawBody, topic, verified.shopDomain);
  const requestKey = `${topic}:${id}`.slice(0, 500);
  const existing = await db.from('shopify_privacy_requests').select('id,status,attempts').eq('request_key', requestKey).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.status === 'processed') return { duplicate: true, id: existing.data.id };
  const brandId = metadataBrandId(connection?.metadata);
  if (existing.data) {
    const update = await db.from('shopify_privacy_requests').update({
      status: 'processing', attempts: Number(existing.data.attempts ?? 1) + 1,
      last_error: null, updated_at: nowIso(),
    }).eq('id', existing.data.id);
    if (update.error) throw update.error;
    return { duplicate: false, id: existing.data.id };
  }
  const insert = await db.from('shopify_privacy_requests').insert({
    request_key: requestKey,
    topic,
    shop_domain: verified.shopDomain,
    connection_id: connection?.id ?? null,
    business_id: connection?.business_id ?? null,
    brand_id: brandId,
    external_customer_id: privacyCustomerId(payload),
    payload,
    status: 'processing',
  }).select('id').single();
  if (insert.error) throw insert.error;
  return { duplicate: false, id: insert.data.id };
}

async function completePrivacyRequest(db: any, id: string, result: any, scrubPayload = false): Promise<void> {
  const update = await db.from('shopify_privacy_requests').update({
    status: 'processed',
    result_json: result,
    payload: scrubPayload ? { redacted: true } : undefined,
    external_customer_id: scrubPayload ? null : undefined,
    last_error: null,
    processed_at: nowIso(),
    updated_at: nowIso(),
  }).eq('id', id);
  if (update.error) throw update.error;
}

async function failPrivacyRequest(db: any, id: string | null, error: unknown): Promise<void> {
  if (!id) return;
  await db.from('shopify_privacy_requests').update({
    status: 'failed', last_error: clip(error instanceof Error ? error.message : error, 1000), updated_at: nowIso(),
  }).eq('id', id);
}

async function redactCustomerIfShopifyCreated(db: any, customerId: string, createdByShopify: boolean): Promise<void> {
  if (!createdByShopify) return;
  const remaining = await db.from('shopify_customer_links').select('id').eq('customer_id', customerId).limit(1);
  if (remaining.error) throw remaining.error;
  if (remaining.data?.length) return;
  const update = await db.from('customers').update({
    name: 'Redacted Customer',
    email: null,
    phone: null,
    profile_photo_url: null,
    profile_photo_updated_at: null,
  }).eq('id', customerId);
  if (update.error) throw update.error;
}

async function processCustomerDataRequest(db: any, shop: string, payload: any, connection: any | null): Promise<any> {
  const externalCustomerId = privacyCustomerId(payload);
  if (!externalCustomerId || !connection?.business_id) return { customer: null, orders: [], appointmentRequests: [], leads: [] };
  const link = await db.from('shopify_customer_links').select('customer_id,business_id,brand_id')
    .eq('shop_domain', shop).eq('external_customer_id', externalCustomerId).maybeSingle();
  if (link.error) throw link.error;
  if (!link.data) return { customer: null, orders: [], appointmentRequests: [], leads: [] };
  const customerId = link.data.customer_id;
  const [customer, orders, appointments, leads] = await Promise.all([
    db.from('customers').select('id,name,email,phone,wedding_date,created_at').eq('id', customerId).maybeSingle(),
    db.from('orders').select('id,external_order_id,total_cents,status,created_at').eq('business_id', connection.business_id).eq('shop_domain', shop).eq('customer_id', customerId),
    db.from('appointment_requests').select('id,preferred_date_1,preferred_window_1,status,notes,submitted_at').eq('business_id', connection.business_id).eq('customer_id', customerId).ilike('intake_source', 'Shopify Storefront%'),
    db.from('leads').select('id,name,email,source,wedding_date,stage,created_at').eq('business_id', connection.business_id).eq('external_source', 'shopify_order').like('external_reference', `${shop}:%`),
  ]);
  for (const result of [customer, orders, appointments, leads]) if (result.error) throw result.error;
  return {
    customer: customer.data ?? null,
    orders: orders.data ?? [],
    appointmentRequests: appointments.data ?? [],
    leads: leads.data ?? [],
  };
}

async function processCustomerRedact(db: any, shop: string, payload: any, connection: any | null): Promise<any> {
  const externalCustomerId = privacyCustomerId(payload);
  const orderIds = Array.isArray(payload?.orders_to_redact) ? payload.orders_to_redact.map((id: unknown) => clip(id, 160)).filter(Boolean) : [];
  const link = externalCustomerId
    ? await db.from('shopify_customer_links').select('id,customer_id,customer_created_by_shopify')
      .eq('shop_domain', shop).eq('external_customer_id', externalCustomerId).maybeSingle()
    : { data: null, error: null };
  if (link.error) throw link.error;

  const businessId = connection?.business_id ?? null;
  if (businessId) {
    for (const orderId of orderIds) {
      const appointmentKey = `shopify-order:${shop}:${orderId}`.slice(0, 128);
      const [orderDelete, appointmentDelete, leadDelete] = await Promise.all([
        db.from('orders').delete().eq('business_id', businessId).eq('shop_domain', shop).eq('external_order_id', orderId),
        db.from('appointment_requests').delete().eq('business_id', businessId).eq('idempotency_key', appointmentKey),
        db.from('leads').delete().eq('business_id', businessId).eq('external_source', 'shopify_order').eq('external_reference', `${shop}:${orderId}`),
      ]);
      for (const result of [orderDelete, appointmentDelete, leadDelete]) if (result.error) throw result.error;
    }
  }

  if (link.data) {
    const customerId = link.data.customer_id;
    const created = Boolean(link.data.customer_created_by_shopify);
    const deleted = await db.from('shopify_customer_links').delete().eq('id', link.data.id);
    if (deleted.error) throw deleted.error;
    await redactCustomerIfShopifyCreated(db, customerId, created);
  }
  return { redactedOrders: orderIds.length, customerMappingRemoved: Boolean(link.data) };
}

async function processShopRedact(db: any, shop: string, connection: any | null): Promise<any> {
  if (!connection) return { shopDataRemoved: true, connectionFound: false };
  const businessId = connection.business_id;
  const brandId = metadataBrandId(connection.metadata);
  const links = await db.from('shopify_customer_links').select('id,customer_id,customer_created_by_shopify')
    .eq('shop_domain', shop);
  if (links.error) throw links.error;

  const [appointments, leads, orders, events] = await Promise.all([
    db.from('appointment_requests').delete().eq('business_id', businessId).like('idempotency_key', `shopify-order:${shop}:%`),
    db.from('leads').delete().eq('business_id', businessId).eq('external_source', 'shopify_order').like('external_reference', `${shop}:%`),
    db.from('orders').delete().eq('business_id', businessId).eq('shop_domain', shop),
    db.from('shopify_webhook_events').delete().eq('shop_domain', shop),
  ]);
  for (const result of [appointments, leads, orders, events]) if (result.error) throw result.error;

  const linkDelete = await db.from('shopify_customer_links').delete().eq('shop_domain', shop);
  if (linkDelete.error) throw linkDelete.error;
  for (const link of links.data ?? []) {
    await redactCustomerIfShopifyCreated(db, link.customer_id, Boolean(link.customer_created_by_shopify));
  }

  const secretDelete = await db.from('growth_provider_secrets').delete().eq('connection_id', connection.id);
  if (secretDelete.error) throw secretDelete.error;
  const connectionDelete = await db.from('growth_provider_connections').delete().eq('id', connection.id);
  if (connectionDelete.error) throw connectionDelete.error;

  return { shopDataRemoved: true, connectionFound: true, businessId, brandId, customerMappingsRemoved: (links.data ?? []).length };
}

function installPrivacyHandler(topic: PrivacyTopic): void {
  shopifyHardeningRouter.post(`/webhooks/${topic}`, async (req: Request, res: Response) => {
    const verified = validateWebhookRequest(req);
    if (!verified) return res.status(401).json({ error: 'Unauthorized: invalid Shopify privacy webhook signature or shop domain.' });
    const db = (req as any).context?.db || getShopifyDb();
    let privacyId: string | null = null;
    try {
      const payload = parseWebhookJson(req, verified.rawBody);
      const connection = await privacyConnection(db, verified.shopDomain);
      const started = await beginPrivacyRequest(db, req, verified, topic, payload, connection);
      privacyId = started.id;
      if (started.duplicate) return res.status(200).json({ success: true, duplicate: true });

      let result: any;
      if (topic === 'customers/data_request') {
        result = await processCustomerDataRequest(db, verified.shopDomain, payload, connection);
        await completePrivacyRequest(db, privacyId, result, false);
      } else if (topic === 'customers/redact') {
        result = await processCustomerRedact(db, verified.shopDomain, payload, connection);
        await completePrivacyRequest(db, privacyId, result, true);
      } else {
        result = await processShopRedact(db, verified.shopDomain, connection);
        // Keep only a hashed shop reference after redaction so the audit row does
        // not retain the shop's permanent domain.
        const hashedShop = `redacted:${crypto.createHash('sha256').update(verified.shopDomain).digest('hex')}`;
        const update = await db.from('shopify_privacy_requests').update({ shop_domain: hashedShop }).eq('id', privacyId);
        if (update.error) throw update.error;
        await completePrivacyRequest(db, privacyId, { shopDataRemoved: true }, true);
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      await failPrivacyRequest(db, privacyId, error).catch(() => undefined);
      console.error(`[shopify] ${topic} processing failed:`, error);
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
}

installPrivacyHandler('customers/data_request');
installPrivacyHandler('customers/redact');
installPrivacyHandler('shop/redact');
