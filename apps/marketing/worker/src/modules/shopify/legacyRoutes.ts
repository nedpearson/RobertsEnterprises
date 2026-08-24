import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveStore, isStoreKey } from '../scheduling/publicIntake';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { saveTokens } from '../growth/store';
import {
  buildShopifyAuthorizationUrl,
  exchangeShopifyCode,
  normalizeShopDomain,
  readShopifyOAuthConfig,
  SHOPIFY_SCOPES,
  signShopifyState,
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

export const shopifyRouter = Router();

const asString = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
const metadataBrandId = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).brandId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

/** Returns setup readiness without exposing credentials. */
shopifyRouter.get('/setup/status', (_req, res) => {
  const redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI ?? null;
  const redirectUriValid = Boolean(redirectUri && /\/api\/shopify\/callback\/?$/.test(redirectUri));
  const checks = [
    { key: 'SHOPIFY_CLIENT_ID', ok: Boolean(process.env.SHOPIFY_CLIENT_ID) },
    { key: 'SHOPIFY_CLIENT_SECRET', ok: Boolean(process.env.SHOPIFY_CLIENT_SECRET) },
    { key: 'SHOPIFY_OAUTH_REDIRECT_URI', ok: Boolean(redirectUri) },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
  ];
  const missing = checks.filter((check) => !check.ok).map((check) => check.key);
  res.status(missing.length || !redirectUriValid ? 503 : 200).json({
    ready: missing.length === 0 && redirectUriValid,
    missing,
    redirectUri,
    redirectUriValid,
    expectedRedirectPath: '/api/shopify/callback',
  });
});

/**
 * Starts merchant OAuth. The organization comes only from the verified session.
 * When a tenant has multiple brands, the caller must explicitly select the brand
 * that owns this Shopify store so OAuth cannot silently bind to the wrong brand.
 */
shopifyRouter.get('/connect', requireGrowthAccess, async (req, res) => {
  const shop = normalizeShopDomain(asString(req.query.shop) ?? '');
  if (!shop) {
    return res.status(400).json({
      code: 'INVALID_SHOP_DOMAIN',
      error: 'Enter the Shopify store handle, permanent .myshopify.com domain, or Shopify Admin store URL. Custom storefront domains are not valid OAuth shop identifiers.',
    });
  }

  const config = readShopifyOAuthConfig();
  if (!config) return res.status(503).json({
    code: 'SHOPIFY_NOT_CONFIGURED',
    error: 'Shopify connection is not configured for this VowOS service yet. The platform owner must add the Shopify app credentials and registered callback before stores can connect.',
  });

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
          error: 'The selected brand does not belong to the active VowOS organization.',
        });
      }
      brandName = brand.name;
    } else if (brands.length === 1) {
      brandId = brands[0].id;
      brandName = brands[0].name;
    } else if (brands.length > 1) {
      return res.status(409).json({
        code: 'BRAND_CONTEXT_REQUIRED',
        error: 'Select the exact brand before connecting Shopify. This organization has multiple brands and VowOS will not guess which brand owns the store.',
        brands,
      });
    }

    if (brandId) {
      const { data: existingRows, error: existingError } = await db
        .from('growth_provider_connections')
        .select('id,display_name,metadata')
        .eq('business_id', businessId)
        .eq('provider', 'shopify')
        .ilike('metadata->>shopDomain', shop)
        .limit(2);
      if (existingError) throw new Error(`Could not verify existing Shopify binding: ${existingError.message}`);

      const conflict = (existingRows ?? []).find((row: any) => {
        const existingBrandId = metadataBrandId(row.metadata);
        return existingBrandId && existingBrandId !== brandId;
      });
      if (conflict) {
        return res.status(409).json({
          code: 'SHOP_ALREADY_BOUND_TO_ANOTHER_BRAND',
          error: `This Shopify store is already assigned to another VowOS brand${conflict.display_name ? ` (${conflict.display_name})` : ''}. Disconnect or reassign that connection before continuing.`,
        });
      }
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

/** Remove VowOS-held Shopify credentials for one store in the active business. */
shopifyRouter.delete('/disconnect', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const requestedShop = normalizeShopDomain(asString(req.query.shop) ?? '');
  const db = getShopifyDb();

  let query = db
    .from('growth_provider_connections')
    .select('id,metadata')
    .eq('business_id', businessId)
    .eq('provider', 'shopify');
  if (requestedShop) query = query.ilike('metadata->>shopDomain', requestedShop);

  const { data: connections, error } = await query.limit(requestedShop ? 2 : 2);
  if (error) return res.status(500).json({ error: `Could not resolve Shopify connection: ${error.message}` });

  const matching = connections ?? [];
  if (!matching.length) return res.json({ success: true, alreadyDisconnected: true });
  if (matching.length > 1) {
    return res.status(409).json({ error: 'More than one Shopify store is connected. Specify the permanent .myshopify.com domain to disconnect.' });
  }

  const connection = matching[0];
  const secretDelete = await db
    .from('growth_provider_secrets')
    .delete()
    .eq('connection_id', connection.id);
  if (secretDelete.error) return res.status(500).json({ error: `Could not remove Shopify credentials: ${secretDelete.error.message}` });

  const connectionUpdate = await db
    .from('growth_provider_connections')
    .update({ status: 'disconnected', last_error: null, last_sync_status: null })
    .eq('id', connection.id);
  if (connectionUpdate.error) return res.status(500).json({ error: `Could not mark Shopify disconnected: ${connectionUpdate.error.message}` });

  return res.json({ success: true });
});

/** Shopify callback: validates both Shopify HMAC and signed organization state before storing anything. */
shopifyRouter.get('/callback', async (req, res) => {
  const appUrl = process.env.PUBLIC_APP_URL || 'https://vowos.bridgebox.ai';
  const state = asString(req.query.state);
  const code = asString(req.query.code);
  const returnedShop = normalizeShopDomain(asString(req.query.shop) ?? '');
  const config = readShopifyOAuthConfig();
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
    return res.redirect(redirect(false, 'Shopify callback signature validation failed. Restart the connection from VowOS.'));
  }

  const payload = verifyShopifyState(state);
  if (!payload || payload.shop !== returnedShop) {
    return res.redirect(redirect(false, 'The Shopify authorization expired or no longer matches this store. Restart the connection from VowOS.'));
  }

  try {
    const db = getShopifyDb();
    if (payload.brandId) {
      const { data: brand, error: brandError } = await db
        .from('business_brands')
        .select('id,name')
        .eq('id', payload.brandId)
        .eq('business_id', payload.businessId)
        .maybeSingle();
      if (brandError) throw new Error(`Could not verify Shopify brand ownership: ${brandError.message}`);
      if (!brand) throw new Error('The selected VowOS brand no longer exists in this organization.');
    }

    const tokens = await exchangeShopifyCode(config, returnedShop, code);
    const shop = await verifyShopifyShop(returnedShop, tokens.accessToken);
    const canonicalShopDomain = normalizeHeaderDomain(shop.myshopify_domain) || shop.myshopify_domain.toLowerCase();

    const { data: existing, error: existingError } = await db
      .from('growth_provider_connections')
      .select('id,metadata')
      .eq('business_id', payload.businessId)
      .eq('provider', 'shopify')
      .eq('external_account_id', shop.id)
      .maybeSingle();
    if (existingError) throw new Error(`Could not verify existing Shopify account binding: ${existingError.message}`);
    const existingBrandId = metadataBrandId(existing?.metadata);
    if (existingBrandId && payload.brandId && existingBrandId !== payload.brandId) {
      throw new Error('This Shopify account is already assigned to a different VowOS brand. Disconnect that assignment before reconnecting it elsewhere.');
    }

    const metadata: Record<string, unknown> = { shopDomain: canonicalShopDomain };
    if (payload.brandId) metadata.brandId = payload.brandId;

    const connection = await upsertShopifyConnection(payload.businessId, shop.id, {
      status: 'connected',
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
    return res.redirect(redirect(true, undefined, payload.brandId, canonicalShopDomain));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markShopifyConnectionError(payload.businessId, returnedShop, message).catch(() => undefined);
    return res.redirect(redirect(false, message, payload.brandId, returnedShop));
  }
});

/** Constant-time HMAC-SHA256 signature verification over raw request body. */
export function verifyShopifyWebhookHmac(
  rawBody: Buffer | string | undefined,
  hmacHeader: string | undefined,
  secret: string | undefined
): boolean {
  if (!rawBody || !hmacHeader || !secret) return false;
  try {
    const buffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
    const digestBase64 = crypto.createHmac('sha256', secret).update(buffer).digest('base64');
    const bufA = Buffer.from(digestBase64, 'utf-8');
    const bufB = Buffer.from(hmacHeader.trim(), 'utf-8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
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
  business_id: string;
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
  return value.replace(/^https?:\/\//, '').split('/')[0].trim().toLowerCase() || null;
}

function mappingLocationId(metadata: ShopifyConnectionMetadata | null, shopifyLocationId?: string): string | null {
  if (!shopifyLocationId || !Array.isArray(metadata?.locationMappings)) return null;
  for (const item of metadata.locationMappings) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (String(row.shopifyLocationId ?? '') !== shopifyLocationId) continue;
    return typeof row.vowosLocationId === 'string' ? row.vowosLocationId : null;
  }
  return null;
}

function connectionBrandId(metadata: ShopifyConnectionMetadata | null): string | null {
  return typeof metadata?.brandId === 'string' && metadata.brandId.trim() ? metadata.brandId.trim() : null;
}

/**
 * Resolve the exact VowOS business and brand from the Shopify permanent domain.
 * Canonical OAuth records are authoritative: if a known store is disconnected,
 * revoked, pending, or errored, webhook processing stops before any legacy
 * business-site/name recovery can run.
 */
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
  boutiqueEmail: string;
}> {
  let businessId: string | null = null;
  let businessName: string | null = null;
  let brandId: string | null = null;
  let brandName: string | null = null;
  let locationId: string | null = null;
  let connectionMetadata: ShopifyConnectionMetadata | null = null;
  const cleanDomain = normalizeHeaderDomain(shopDomainHeader);

  if (cleanDomain) {
    const connections = await db
      .from('growth_provider_connections')
      .select('business_id,metadata,status')
      .eq('provider', 'shopify')
      .ilike('metadata->>shopDomain', cleanDomain)
      .limit(2);
    if (connections?.error) {
      throw new Error(`Could not resolve Shopify connection for "${cleanDomain}": ${connections.error.message}`);
    }

    const matching = (connections?.data || []) as ShopifyDomainConnection[];
    if (matching.length > 1) throw new Error(`Shopify domain "${cleanDomain}" is mapped to more than one VowOS business.`);
    if (matching.length === 1) {
      const canonical = matching[0];
      const status = String(canonical.status || '').trim().toLowerCase();
      if (status !== 'connected') throw new ShopifyConnectionInactiveError(cleanDomain, status || 'inactive');
      businessId = canonical.business_id;
      connectionMetadata = canonical.metadata;
      brandId = connectionBrandId(canonical.metadata);
    }
  }

  // Legacy recovery is intentionally used only when no canonical Shopify row
  // exists for the domain. A disconnected canonical row must never fall through.
  if (!businessId && cleanDomain) {
    const site = await db
      .from('business_sites')
      .select('business_id,brand_id')
      .ilike('domain', `%${cleanDomain}%`)
      .limit(2);
    const siteRows = (site?.data || []) as Array<{ business_id: string; brand_id: string | null }>;
    if (siteRows.length > 1) throw new Error(`Shopify domain "${cleanDomain}" matches more than one VowOS business site.`);
    if (siteRows.length === 1) {
      businessId = siteRows[0].business_id;
      brandId = siteRows[0].brand_id;
    }
  }

  if (storeKeyProperty && isStoreKey(storeKeyProperty)) {
    const resolved = await resolveStore(db, storeKeyProperty);
    if (businessId && resolved.businessId !== businessId) {
      throw new Error(`Shopify store/location mapping conflicts with the OAuth-bound business for "${cleanDomain || 'unknown'}".`);
    }
    businessId = businessId || resolved.businessId;
    businessName = resolved.businessName;
    locationId = resolved.locationId;
  }

  if (businessId && !locationId) {
    const mappedLocation = mappingLocationId(connectionMetadata, shopifyLocationId);
    if (mappedLocation) {
      if (isStoreKey(mappedLocation)) {
        const resolved = await resolveStore(db, mappedLocation);
        if (resolved.businessId !== businessId) throw new Error('Shopify location mapping points to another VowOS business.');
        locationId = resolved.locationId;
      } else {
        const mappedRow = await db
          .from('locations')
          .select('id,business_id')
          .eq('id', mappedLocation)
          .eq('business_id', businessId)
          .maybeSingle();
        locationId = mappedRow?.data?.id || null;
      }
    }
  }

  if (!businessId && cleanDomain) {
    const lower = cleanDomain.toLowerCase();
    const term = lower.includes('ido') || lower.includes('bridal')
      ? 'i do bridal'
      : lower.includes('proper')
        ? 'proper'
        : null;
    if (term) {
      const biz = await db
        .from('businesses')
        .select('id, name')
        .ilike('name', `%${term}%`)
        .limit(2);
      const rows = (biz?.data || []) as Array<{ id: string; name: string }>;
      if (rows.length > 1) throw new Error(`More than one VowOS business matches Shopify domain "${cleanDomain}".`);
      if (rows.length === 1) {
        businessId = rows[0].id;
        businessName = rows[0].name;
      }
    }
  }

  if (!businessId) {
    throw new Error(`Unable to resolve Shopify tenant for domain: "${cleanDomain || 'unknown'}". Connect the store from the correct VowOS business workspace.`);
  }

  const bizRow = await db.from('businesses').select('id, name').eq('id', businessId).maybeSingle();
  const finalBusinessName: string = businessName || bizRow?.data?.name || 'Retail Boutique';

  if (brandId) {
    const brandRow = await db
      .from('business_brands')
      .select('id,name,business_id')
      .eq('id', brandId)
      .eq('business_id', businessId)
      .maybeSingle();
    if (!brandRow?.data) throw new Error('Shopify connection points to a brand that is no longer valid for this business.');
    brandName = brandRow.data.name || null;
  }

  let boutiqueEmail: string | null = null;
  if (brandId) {
    const sites = await db
      .from('business_sites')
      .select('notification_email')
      .eq('business_id', businessId)
      .eq('brand_id', brandId)
      .limit(10);
    const configured = (sites?.data || [])
      .map((site: any) => typeof site.notification_email === 'string' ? site.notification_email.trim() : '')
      .find(Boolean);
    boutiqueEmail = configured || null;
  }

  if (!boutiqueEmail) {
    const routingLabel = (brandName || finalBusinessName).toLowerCase();
    const isBridal = routingLabel.includes('bridal') || routingLabel.includes('i do') || routingLabel.includes('ido');
    boutiqueEmail = isBridal ? 'ido@idobridalcouture.com' : 'hello@properandcompany.com';
  }

  return { businessId, brandId, locationId, businessName: finalBusinessName, brandName, boutiqueEmail };
}

shopifyRouter.post('/webhooks/orders/create', async (req: Request, res: Response) => {
  try {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256') || req.get('x-shopify-hmac-sha256');
    const shopDomain = req.get('X-Shopify-Shop-Domain') || req.get('x-shopify-shop-domain');
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

    const rawBody = (req as any).rawBody || req.body;
    if (!verifyShopifyWebhookHmac(rawBody, hmacHeader, secret)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing Shopify webhook signature' });
    }

    let order = req.body;
    if (typeof order === 'string' || Buffer.isBuffer(order)) {
      try {
        order = JSON.parse(order.toString('utf8'));
      } catch {
        return res.status(200).json({ success: true, message: 'Ignored: Non-JSON order payload' });
      }
    }

    if (!order || typeof order !== 'object' || !order.customer || !order.id) {
      return res.status(200).json({ success: true, message: 'Ignored: Not an order with customer and ID' });
    }

    const externalOrderId = String(order.id);
    const db = (req as any).context?.db || getShopifyDb();

    let date = new Date().toISOString().split('T')[0];
    let time = '12:00 PM';
    let storeKey: string | undefined;
    let type = 'Bridal Appointment';

    if (Array.isArray(order.line_items) && order.line_items.length > 0) {
      const item = order.line_items[0];
      type = item.title || type;
      if (Array.isArray(item.properties)) {
        for (const prop of item.properties) {
          const propName = (prop.name || '').toLowerCase();
          if (propName.includes('date')) date = String(prop.value);
          if (propName.includes('time')) time = String(prop.value);
          if (propName.includes('store') || propName.includes('location')) storeKey = String(prop.value);
        }
      }
    }

    const shopifyLocationId = order.location_id ? String(order.location_id) : undefined;
    const tenant = await resolveShopifyTenant(db, shopDomain, storeKey, shopifyLocationId);
    const { businessId, brandId, locationId, businessName, brandName, boutiqueEmail } = tenant;

    const { data: existingOrder } = await db
      .from('orders')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('external_order_id', externalOrderId)
      .maybeSingle();

    if (existingOrder) {
      await db
        .from('orders')
        .update({
          status: order.financial_status || existingOrder.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrder.id);

      return res.status(200).json({
        success: true,
        duplicate: true,
        orderId: existingOrder.id,
        message: 'Order already processed idempotently'
      });
    }

    const email = (order.email || order.customer.email || '').trim().toLowerCase();
    const phone = order.phone || order.customer.phone;
    const name = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Shopify Customer';
    const totalCents = Math.round(parseFloat(order.total_price || '0') * 100);

    let customerId = '';
    const { data: existingCust } = await db
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .ilike('email', email)
      .maybeSingle();

    if (existingCust) {
      customerId = existingCust.id;
    } else {
      const { data: newCust, error: custErr } = await db
        .from('customers')
        .insert({ name, email, phone, business_id: businessId, location_id: locationId })
        .select('id')
        .single();
      if (custErr) throw custErr;
      customerId = newCust.id;
    }

    await db.from('orders').insert({
      business_id: businessId,
      location_id: locationId,
      customer_id: customerId,
      external_order_id: externalOrderId,
      source_type: 'SHOPIFY',
      total_cents: totalCents,
      status: order.financial_status || 'paid'
    });

    const sourceLabel = brandName ? `Shopify Storefront — ${brandName}` : 'Shopify Storefront';
    const { data: apptData, error: apptErr } = await db
      .from('appointment_requests')
      .insert({
        customer_id: customerId,
        business_id: businessId,
        brand_id: brandId,
        preferred_location_id: locationId,
        intake_source: sourceLabel,
        preferred_date_1: date,
        preferred_window_1: time,
        status: 'submitted',
        priority: 'normal',
        notes: `Bridal Appointment Type: ${type} | Shopify Order #${order.order_number || externalOrderId}`
      })
      .select('id')
      .single();

    if (apptErr) throw apptErr;

    await db.from('leads').insert({
      business_id: businessId,
      location_id: locationId,
      name,
      email,
      source: sourceLabel,
      budget_cents: 300000,
      wedding_date: date,
      stage: 'Appointment Set'
    });

    const routingName = brandName || businessName;
    const bodyText = `New appointment booked via Shopify by ${name}. Total Paid: $${(totalCents / 100).toFixed(2)}. Appointment: ${type} on ${date} at ${time} (${routingName}).`;
    const recipients = [...new Set(['robertsenterprises@bridgebox.ai', boutiqueEmail].filter(Boolean))];

    for (const recipient of recipients) {
      try {
        await getShopifyDb().functions.invoke('send-message', {
          body: { channel: 'email', to: recipient, subject: `Shopify Booking Notification — ${name}`, body: bodyText }
        });
      } catch (e) {
        console.error(`Shopify Webhook - Email delivery warning for ${recipient}:`, e);
      }
    }

    await db.from('messages').insert({
      business_id: businessId,
      location_id: locationId,
      customer_id: customerId,
      sender: sourceLabel,
      content: bodyText,
      channel: 'email',
      status: 'sent',
      direction: 'outbound',
      sent_at: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      orderId: externalOrderId,
      customerId,
      appointmentRequestId: apptData?.id,
      businessId,
      brandId,
      locationId,
    });
  } catch (err: any) {
    if (err instanceof ShopifyConnectionInactiveError) {
      return res.status(410).json({
        success: false,
        ignored: true,
        error: err.message,
      });
    }
    console.error('Shopify Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
});