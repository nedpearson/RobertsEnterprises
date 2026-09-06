/**
 * Shared verification prologue for every Shopify webhook topic.
 *
 * Previously the only topic handled (orders/create) inlined its own HMAC check,
 * tenant resolution and error mapping. Adding eight more topics that way would
 * mean nine copies of the security-critical path, and the first one to drift
 * becomes the vulnerability. Everything security-relevant lives here once.
 *
 * Order of operations is deliberate and must not be rearranged:
 *   1. HMAC over the exact raw body            — authenticate the sender
 *   2. Tenant resolution from the verified header — authorise the payload
 *   3. Delivery idempotency                    — absorb Shopify's retries
 *   4. Handler                                 — map the data
 *
 * Nothing in the payload may influence steps 1-2. Payload-derived tenant
 * routing is the vulnerability class this integration was already fixed for
 * once; it does not get reintroduced by a new topic.
 */
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeShopDomain, readShopifyWebhookSecret } from './oauth';
import { resolveMappedLocation } from './locations';

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

export class ShopifyConnectionInactiveError extends Error {
  constructor(public readonly shopDomain: string, public readonly status: string) {
    super(`Shopify store "${shopDomain}" is ${status || 'inactive'} in VowOS. Reconnect it before processing webhooks.`);
    this.name = 'ShopifyConnectionInactiveError';
  }
}

export class ShopifyTenantUnresolvedError extends Error {
  constructor(public readonly shopDomain: string, message: string) {
    super(message);
    this.name = 'ShopifyTenantUnresolvedError';
  }
}

type ShopifyConnectionMetadata = {
  shopDomain?: unknown;
  brandId?: unknown;
};

export interface ShopifyTenant {
  connectionId: string;
  businessId: string;
  brandId: string | null;
  locationId: string | null;
  locationSource: 'SHOPIFY_LOCATION' | 'DEFAULT' | 'STORE_KEY' | 'UNMAPPED';
  businessName: string;
  brandName: string | null;
  boutiqueEmail: string | null;
  providerAccountId: string | null;
  shopDomain: string;
  grantedScopes: string[];
}

export function normalizeHeaderDomain(value?: string | null): string | null {
  if (!value) return null;
  return normalizeShopDomain(value) || null;
}

function connectionBrandId(metadata: ShopifyConnectionMetadata | null): string | null {
  return typeof metadata?.brandId === 'string' && metadata.brandId.trim() ? metadata.brandId.trim() : null;
}

/**
 * Resolves the VowOS tenant for a verified Shopify delivery.
 *
 * The shop domain comes from X-Shopify-Shop-Domain, which is inside the HMAC
 * envelope and therefore attacker-proof. Store keys and brand keywords in the
 * payload may refine the location but can never select the organization.
 */
export async function resolveShopifyTenant(
  db: SupabaseClient | any,
  shopDomainHeader?: string | null,
  options: { shopifyLocationId?: string | null } = {},
): Promise<ShopifyTenant> {
  const cleanDomain = normalizeHeaderDomain(shopDomainHeader);
  if (!cleanDomain) {
    throw new ShopifyTenantUnresolvedError('', 'A valid permanent Shopify shop domain is required for tenant routing.');
  }

  const connections = await db
    .from('growth_provider_connections')
    .select('id,business_id,external_account_id,display_name,metadata,status,scopes')
    .eq('provider', 'shopify')
    .ilike('metadata->>shopDomain', cleanDomain)
    .limit(2);

  if (connections?.error) {
    throw new Error(`Could not resolve Shopify connection for "${cleanDomain}": ${connections.error.message}`);
  }

  const matching = (connections?.data ?? []) as Array<{
    id: string;
    business_id: string;
    external_account_id?: string | null;
    metadata: ShopifyConnectionMetadata | null;
    status?: string | null;
    scopes?: string[] | null;
  }>;

  if (matching.length === 0) {
    throw new ShopifyTenantUnresolvedError(
      cleanDomain,
      `Unable to resolve Shopify tenant for domain: "${cleanDomain}". The store must complete OAuth before webhooks are accepted.`,
    );
  }
  if (matching.length > 1) {
    throw new ShopifyTenantUnresolvedError(
      cleanDomain,
      `Shopify domain "${cleanDomain}" is mapped to more than one VowOS organization.`,
    );
  }

  const canonical = matching[0];
  const status = String(canonical.status || '').trim().toLowerCase();
  if (status !== 'connected') throw new ShopifyConnectionInactiveError(cleanDomain, status || 'inactive');

  const businessId = canonical.business_id;
  const brandId = connectionBrandId(canonical.metadata);

  const location = await resolveMappedLocation(db, {
    businessId,
    connectionId: canonical.id,
    shopifyLocationId: options.shopifyLocationId ?? null,
  });

  // Validate the mapped location still belongs to this tenant and brand. A
  // location moved between brands after mapping must not leak revenue across
  // the brand boundary.
  let locationId = location.locationId;
  if (locationId) {
    const { data: locationRow, error: locationError } = await db
      .from('locations')
      .select('id,business_id,brand_id')
      .eq('id', locationId)
      .eq('business_id', businessId)
      .maybeSingle();
    if (locationError) throw new Error(`Could not validate Shopify location mapping: ${locationError.message}`);
    if (!locationRow) locationId = null;
    else if (brandId && locationRow.brand_id && locationRow.brand_id !== brandId) locationId = null;
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

  let siteQuery = db.from('business_sites').select('notification_email').eq('business_id', businessId);
  if (brandId) siteQuery = siteQuery.eq('brand_id', brandId);
  const { data: sites, error: sitesError } = await siteQuery.limit(20);
  if (sitesError) throw new Error(`Could not load Shopify notification routing: ${sitesError.message}`);
  const boutiqueEmail =
    (sites ?? [])
      .map((site: any) => (typeof site.notification_email === 'string' ? site.notification_email.trim().toLowerCase() : ''))
      .find((email: string) => /^\S+@\S+\.\S+$/.test(email)) || null;

  return {
    connectionId: canonical.id,
    businessId,
    brandId,
    locationId,
    locationSource: locationId ? location.source : 'UNMAPPED',
    businessName: business.name,
    brandName,
    boutiqueEmail,
    providerAccountId: canonical.external_account_id ?? null,
    shopDomain: cleanDomain,
    grantedScopes: Array.isArray(canonical.scopes) ? canonical.scopes.map(String) : [],
  };
}

/**
 * Records a delivery and reports whether this exact delivery was already
 * processed. Shopify retries a failed delivery up to 19 times over 48 hours and
 * may also re-send spontaneously; X-Shopify-Webhook-Id is stable across those
 * attempts, which makes it the correct key for every topic.
 *
 * Returns true when the caller should skip processing.
 */
export async function alreadyDelivered(
  db: SupabaseClient | any,
  input: { businessId: string | null; shopDomain: string; topic: string; webhookId: string | null },
): Promise<boolean> {
  // No delivery id (hand-issued replay, or a test) means no dedupe is possible.
  // Downstream handlers are individually idempotent, so this is safe.
  if (!input.webhookId) return false;

  const { error } = await db.from('shopify_webhook_deliveries').insert({
    business_id: input.businessId,
    shop_domain: input.shopDomain,
    topic: input.topic,
    external_webhook_id: input.webhookId,
    status: 'PROCESSING',
  });

  if (!error) return false;
  if (error.code === '23505') return true;

  // A failure to record must not drop a real order. Fall through to the
  // handler, whose own upserts remain idempotent.
  console.warn('[shopify] Delivery ledger write failed; proceeding on handler idempotency:', error.message);
  return false;
}

async function finalizeDelivery(
  db: SupabaseClient | any,
  input: { shopDomain: string; webhookId: string | null; status: string; errorMessage?: string | null; businessId?: string | null },
): Promise<void> {
  if (!input.webhookId) return;
  await db
    .from('shopify_webhook_deliveries')
    .update({
      status: input.status,
      error_message: input.errorMessage ?? null,
      business_id: input.businessId ?? null,
    })
    .eq('shop_domain', input.shopDomain)
    .eq('external_webhook_id', input.webhookId);
}

export interface ShopifyWebhookRequest {
  topic: string;
  shopDomain: string;
  webhookId: string | null;
  payload: any;
  tenant: ShopifyTenant;
  db: SupabaseClient | any;
}

export type ShopifyWebhookHandler = (ctx: ShopifyWebhookRequest) => Promise<Record<string, unknown>>;

export interface WebhookRouteOptions {
  /** Compliance and app-lifecycle topics run before/without a connected tenant. */
  requireTenant?: boolean;
  /** Shopify's location id for this payload, used for location attribution. */
  locationIdOf?: (payload: any) => string | null;
}

/**
 * Wraps a topic handler with the full verification prologue.
 *
 * Status code discipline matters here: Shopify retries any non-2xx. A payload
 * VowOS cannot use is a 200 with an explanation (retrying will not help); a
 * transient failure is a 500 (retrying will help). Getting this backwards
 * either loses orders or produces an infinite retry storm.
 */
export function shopifyWebhook(
  getDb: () => SupabaseClient,
  topic: string,
  handler: ShopifyWebhookHandler,
  options: WebhookRouteOptions = {},
) {
  const requireTenant = options.requireTenant !== false;

  return async function handleShopifyWebhook(req: Request, res: Response): Promise<Response> {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256') || req.get('x-shopify-hmac-sha256');
    const shopDomainHeader = req.get('X-Shopify-Shop-Domain') || req.get('x-shopify-shop-domain');
    const webhookId = req.get('X-Shopify-Webhook-Id') || req.get('x-shopify-webhook-id') || null;
    const deliveredTopic = req.get('X-Shopify-Topic') || req.get('x-shopify-topic') || topic;

    if (!shopDomainHeader) {
      return res.status(400).json({ error: 'Missing X-Shopify-Shop-Domain header.' });
    }

    // 1. Authenticate.
    const secret = readShopifyWebhookSecret(shopDomainHeader);
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!verifyShopifyWebhookHmac(rawBody, hmacHeader, secret)) {
      return res.status(401).json({ error: 'Unauthorized: invalid or missing Shopify webhook signature.' });
    }

    // A verified request whose topic header contradicts the mounted route is a
    // misconfiguration, not an attack, but the payload shape cannot be trusted.
    if (deliveredTopic && deliveredTopic !== topic) {
      return res.status(200).json({
        success: true,
        ignored: true,
        message: `Delivery topic "${deliveredTopic}" does not match this endpoint ("${topic}").`,
      });
    }

    const shopDomain = normalizeHeaderDomain(shopDomainHeader) ?? shopDomainHeader.trim().toLowerCase();
    const db = (req as any).context?.db || getDb();
    const payload = req.body;

    // 2. Authorise.
    let tenant: ShopifyTenant | null = null;
    if (requireTenant) {
      try {
        tenant = await resolveShopifyTenant(db, shopDomainHeader, {
          shopifyLocationId: options.locationIdOf ? options.locationIdOf(payload) : null,
        });
      } catch (error) {
        if (error instanceof ShopifyConnectionInactiveError) {
          return res.status(410).json({ success: false, ignored: true, error: error.message });
        }
        if (error instanceof ShopifyTenantUnresolvedError) {
          // Authentic signature, unknown store. Retrying will not change that.
          return res.status(200).json({ success: false, ignored: true, error: error.message });
        }
        console.error(`[shopify:${topic}] Tenant resolution failed:`, error);
        return res.status(500).json({ error: 'Shopify webhook tenant resolution failed.' });
      }
    }

    // 3. Deduplicate.
    if (await alreadyDelivered(db, { businessId: tenant?.businessId ?? null, shopDomain, topic, webhookId })) {
      return res.status(200).json({ success: true, duplicate: true, topic });
    }

    // 4. Map.
    try {
      const result = await handler({
        topic,
        shopDomain,
        webhookId,
        payload,
        tenant: tenant as ShopifyTenant,
        db,
      });
      await finalizeDelivery(db, {
        shopDomain,
        webhookId,
        status: 'PROCESSED',
        businessId: tenant?.businessId ?? null,
      });
      return res.status(200).json({ success: true, topic, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await finalizeDelivery(db, {
        shopDomain,
        webhookId,
        status: 'FAILED',
        errorMessage: message,
        businessId: tenant?.businessId ?? null,
      }).catch(() => undefined);
      console.error(`[shopify:${topic}] Handler failed:`, message);
      // 500 so Shopify retries — this is the transient case.
      return res.status(500).json({ error: `Shopify ${topic} processing failed.` });
    }
  };
}

/**
 * Parks a verified payload VowOS could not map. The delivery is acknowledged so
 * Shopify stops retrying, and the payload is preserved verbatim for replay once
 * the blocking condition (unmapped location, unresolvable identity) is fixed.
 */
export async function quarantine(
  db: SupabaseClient | any,
  input: { businessId: string; topic: string; idempotencyKey: string; payload: unknown; reason: string },
): Promise<void> {
  const { error } = await db.from('integration_dlq_events').insert({
    business_id: input.businessId,
    provider: 'shopify',
    event_type: input.topic,
    idempotency_key: input.idempotencyKey,
    payload: input.payload,
    headers: {},
    error_message: input.reason,
    status: 'PENDING',
  });
  if (error && error.code !== '23505') {
    console.error('[shopify] Unable to quarantine event:', error.message);
  }
}
