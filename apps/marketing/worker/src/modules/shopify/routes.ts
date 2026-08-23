import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveStore, isStoreKey } from '../scheduling/publicIntake';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { saveTokens, upsertConnection } from '../growth/store';
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

/** Starts merchant OAuth. The organization comes only from the verified session. */
shopifyRouter.get('/connect', requireGrowthAccess, async (req, res) => {
  const shop = normalizeShopDomain(asString(req.query.shop) ?? '');
  if (!shop) return res.status(400).json({ error: 'Enter your Shopify store name or permanent domain, for example my-store or my-store.myshopify.com.' });
  const config = readShopifyOAuthConfig();
  if (!config) return res.status(503).json({
    error: 'Shopify connection is not configured for this VowOS service yet. The platform owner must add the Shopify app credentials and registered callback before stores can connect.',
  });

  const { businessId, userId } = growthContextOf(req);
  try {
    const state = signShopifyState({ businessId, userId, shop, issuedAt: Date.now(), purpose: 'shopify_connect' });
    return res.json({ url: buildShopifyAuthorizationUrl(config, shop, state) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/** Remove VowOS-held Shopify credentials for the active, verified business. */
shopifyRouter.delete('/disconnect', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const db = getShopifyDb();
  const { data: connection, error } = await db
    .from('growth_provider_connections')
    .select('id')
    .eq('business_id', businessId)
    .eq('provider', 'shopify')
    .maybeSingle();
  if (error) return res.status(500).json({ error: `Could not resolve Shopify connection: ${error.message}` });
  if (!connection?.id) return res.json({ success: true, alreadyDisconnected: true });

  const secretDelete = await db
    .from('growth_provider_secrets')
    .delete()
    .eq('connection_id', connection.id);
  if (secretDelete.error) return res.status(500).json({ error: `Could not remove Shopify credentials: ${secretDelete.error.message}` });

  const connectionUpdate = await db
    .from('growth_provider_connections')
    .update({
      status: 'disconnected',
      last_error: null,
      last_sync_status: null,
    })
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
  const redirect = (ok: boolean, error?: string) => `${appUrl}/settings?tab=integrations&shopify=${ok ? 'connected' : 'failed'}${error ? `&error=${encodeURIComponent(error)}` : ''}`;

  if (!state || !code || !returnedShop || !config) return res.redirect(redirect(false, 'Missing or invalid Shopify authorization details.'));
  if (!verifyShopifyCallbackHmac(req.query as Record<string, unknown>, config.clientSecret)) return res.status(400).send('Invalid Shopify callback signature.');

  const payload = verifyShopifyState(state);
  if (!payload || payload.shop !== returnedShop) return res.status(400).send('Invalid or expired Shopify connection state.');

  try {
    const tokens = await exchangeShopifyCode(config, returnedShop, code);
    const shop = await verifyShopifyShop(returnedShop, tokens.accessToken);
    const connection = await upsertConnection(payload.businessId, 'shopify', {
      status: 'connected',
      external_account_id: shop.id,
      display_name: shop.name,
      connected_by: payload.userId,
      connected_at: new Date().toISOString(),
      last_error: null,
      scopes: tokens.scope.length ? tokens.scope : SHOPIFY_SCOPES,
      metadata: { shopDomain: shop.myshopify_domain },
    } as never);
    await saveTokens(connection.id, {
      accessToken: tokens.accessToken,
      refreshToken: null,
      tokenType: 'shopify-offline',
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      scope: tokens.scope.join(' '),
    });
    return res.redirect(redirect(true));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await upsertConnection(payload.businessId, 'shopify', { status: 'error', last_error: message }).catch(() => undefined);
    return res.redirect(redirect(false, message));
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
  locationMappings?: unknown;
};

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

/**
 * Resolve the exact VowOS business from the Shopify permanent domain first.
 * Store/location form properties are used only as a secondary location signal.
 * This prevents an order with no custom line-item properties from silently
 * defaulting into I Do Bridal Baton Rouge.
 */
export async function resolveShopifyTenant(
  db: SupabaseClient | any,
  shopDomainHeader?: string,
  storeKeyProperty?: string,
  shopifyLocationId?: string,
): Promise<{ businessId: string; locationId: string | null; businessName: string; boutiqueEmail: string }> {
  let businessId: string | null = null;
  let businessName: string | null = null;
  let locationId: string | null = null;
  let connectionMetadata: ShopifyConnectionMetadata | null = null;
  const cleanDomain = normalizeHeaderDomain(shopDomainHeader);

  // 1. Canonical mapping: the domain verified during OAuth belongs to one
  // growth_provider_connections row. This is more reliable than matching the
  // merchant's public custom domain against business_sites.
  if (cleanDomain) {
    const connections = await db
      .from('growth_provider_connections')
      .select('business_id,metadata,status')
      .eq('provider', 'shopify')
      .limit(100);
    const matching = ((connections?.data || []) as Array<{ business_id: string; metadata: ShopifyConnectionMetadata | null; status?: string }>).filter((row) => {
      const stored = typeof row.metadata?.shopDomain === 'string' ? normalizeHeaderDomain(row.metadata.shopDomain) : null;
      return stored === cleanDomain && String(row.status || '').toLowerCase() !== 'disconnected';
    });
    if (matching.length > 1) {
      throw new Error(`Shopify domain "${cleanDomain}" is mapped to more than one VowOS business.`);
    }
    if (matching.length === 1) {
      businessId = matching[0].business_id;
      connectionMetadata = matching[0].metadata;
    }
  }

  // 2. Backward-compatible custom-domain mapping for stores connected before
  // the canonical Shopify connection metadata existed.
  if (!businessId && cleanDomain) {
    const site = await db
      .from('business_sites')
      .select('business_id')
      .ilike('domain', `%${cleanDomain}%`)
      .limit(2);
    const siteRows = (site?.data || []) as Array<{ business_id: string }>;
    if (siteRows.length > 1) throw new Error(`Shopify domain "${cleanDomain}" matches more than one VowOS business site.`);
    if (siteRows.length === 1) businessId = siteRows[0].business_id;
  }

  // 3. A store key is an explicit location signal from the storefront. Resolve
  // it, but never allow it to contradict the OAuth-bound business.
  if (storeKeyProperty && isStoreKey(storeKeyProperty)) {
    const resolved = await resolveStore(db, storeKeyProperty);
    if (businessId && resolved.businessId !== businessId) {
      throw new Error(`Shopify store/location mapping conflicts with the OAuth-bound business for "${cleanDomain || 'unknown'}".`);
    }
    businessId = businessId || resolved.businessId;
    businessName = resolved.businessName;
    locationId = resolved.locationId;
  }

  // 4. Shopify location mappings stored on the connection can resolve location
  // even when the product/booking form did not add a VowOS store key.
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

  // 5. Legacy recovery only when the permanent Shopify domain itself clearly
  // identifies one of the Roberts brands. Never treat an arbitrary domain as
  // Proper & Co merely because it is not I Do Bridal.
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

  const isBridal = finalBusinessName.toLowerCase().includes('bridal') || finalBusinessName.toLowerCase().includes('ido');
  const boutiqueEmail = isBridal ? 'ido@idobridalcouture.com' : 'hello@properandcompany.com';

  return { businessId, locationId, businessName: finalBusinessName, boutiqueEmail };
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
    const { businessId, locationId, businessName, boutiqueEmail } = tenant;

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
        .insert({
          name,
          email,
          phone,
          business_id: businessId,
          location_id: locationId
        })
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

    const { data: apptData, error: apptErr } = await db
      .from('appointment_requests')
      .insert({
        customer_id: customerId,
        business_id: businessId,
        preferred_location_id: locationId,
        intake_source: 'Shopify Storefront',
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
      source: 'Shopify Storefront',
      budget_cents: 300000,
      wedding_date: date,
      stage: 'Appointment Set'
    });

    const bodyText = `New appointment booked via Shopify by ${name}. Total Paid: $${(totalCents / 100).toFixed(2)}. Appointment: ${type} on ${date} at ${time} (${businessName}).`;
    const recipients = ['robertsenterprises@bridgebox.ai', boutiqueEmail];

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
      sender: 'Shopify Storefront',
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
      appointmentRequestId: apptData?.id
    });
  } catch (err: any) {
    console.error('Shopify Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
});
