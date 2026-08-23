import crypto from 'node:crypto';
import { Router, type Request } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { normalizeShopDomain } from './oauth';
import { verifyShopifyWebhookHmac } from './hardening';

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (client) return client;
  client = createClient(
    process.env.VITE_SUPABASE_URL || 'https://missing-config.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-service-key',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}

export const shopifyComplianceRouter = Router();

const nowIso = () => new Date().toISOString();
const clip = (value: unknown, max = 500): string => String(value ?? '').trim().slice(0, max);
const metadataBrandId = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).brandId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

function rawBody(req: Request): Buffer {
  const raw = (req as any).rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (typeof raw === 'string') return Buffer.from(raw, 'utf8');
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  return Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
}

function parseBody(req: Request, raw: Buffer): any {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  return JSON.parse(raw.toString('utf8'));
}

function verifiedRequest(req: Request): { raw: Buffer; shop: string } | null {
  const raw = rawBody(req);
  const hmac = req.get('X-Shopify-Hmac-Sha256') || req.get('x-shopify-hmac-sha256') || undefined;
  // Shopify signs webhooks with the app client secret. The legacy dedicated env
  // name remains a compatibility fallback, but can never override the real key.
  const secret = process.env.SHOPIFY_CLIENT_SECRET || process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!verifyShopifyWebhookHmac(raw, hmac, secret)) return null;
  const shop = normalizeShopDomain(
    req.get('X-Shopify-Shop-Domain') || req.get('x-shopify-shop-domain') || '',
  );
  return shop ? { raw, shop } : null;
}

function externalCustomerId(payload: any): string | null {
  const value = payload?.customer?.id ?? payload?.customer_id;
  return value === undefined || value === null ? null : clip(value, 160);
}

function eventId(req: Request, raw: Buffer, shop: string): string {
  const supplied = req.get('X-Shopify-Webhook-Id') || req.get('x-shopify-webhook-id');
  if (supplied?.trim()) return supplied.trim().slice(0, 200);
  return `body:${crypto.createHash('sha256').update('customers/data_request\0').update(shop).update('\0').update(raw).digest('hex')}`;
}

async function connectionForShop(shop: string): Promise<{
  id: string;
  business_id: string;
  metadata: Record<string, unknown> | null;
} | null> {
  const result = await db()
    .from('growth_provider_connections')
    .select('id,business_id,metadata')
    .eq('provider', 'shopify')
    .ilike('metadata->>shopDomain', shop)
    .limit(2);
  if (result.error) throw result.error;
  if ((result.data ?? []).length > 1) throw new Error('Shopify privacy request resolves to multiple VowOS connections.');
  return (result.data?.[0] as any) ?? null;
}

/**
 * Customer data export runs before the broader Shopify hardening router. Leads
 * are selected only through this customer's external order ids; a shop-wide
 * lead query would expose another customer's data.
 */
shopifyComplianceRouter.post('/webhooks/customers/data_request', async (req, res) => {
  const verified = verifiedRequest(req);
  if (!verified) return res.status(401).json({ error: 'Unauthorized: invalid Shopify privacy webhook signature or shop domain.' });

  const requestKey = `customers/data_request:${eventId(req, verified.raw, verified.shop)}`.slice(0, 500);
  let privacyId: string | null = null;
  try {
    const payload = parseBody(req, verified.raw);
    const connection = await connectionForShop(verified.shop);
    const customerExternalId = externalCustomerId(payload);

    const existing = await db().from('shopify_privacy_requests')
      .select('id,status,attempts')
      .eq('request_key', requestKey)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.status === 'processed') return res.status(200).json({ success: true, duplicate: true });

    if (existing.data) {
      privacyId = existing.data.id;
      const update = await db().from('shopify_privacy_requests').update({
        status: 'processing',
        attempts: Number(existing.data.attempts ?? 1) + 1,
        last_error: null,
        updated_at: nowIso(),
      }).eq('id', privacyId);
      if (update.error) throw update.error;
    } else {
      const inserted = await db().from('shopify_privacy_requests').insert({
        request_key: requestKey,
        topic: 'customers/data_request',
        shop_domain: verified.shop,
        connection_id: connection?.id ?? null,
        business_id: connection?.business_id ?? null,
        brand_id: metadataBrandId(connection?.metadata),
        external_customer_id: customerExternalId,
        payload,
        status: 'processing',
      }).select('id').single();
      if (inserted.error) throw inserted.error;
      privacyId = inserted.data.id;
    }

    let result: Record<string, unknown> = {
      customer: null,
      orders: [],
      appointmentRequests: [],
      leads: [],
    };

    if (connection?.business_id && customerExternalId) {
      const link = await db().from('shopify_customer_links')
        .select('customer_id,business_id,brand_id')
        .eq('shop_domain', verified.shop)
        .eq('external_customer_id', customerExternalId)
        .maybeSingle();
      if (link.error) throw link.error;

      if (link.data) {
        if (link.data.business_id !== connection.business_id) {
          throw new Error('Shopify customer link conflicts with the OAuth-bound business.');
        }
        const customerId = link.data.customer_id;
        const [customer, orders, appointments] = await Promise.all([
          db().from('customers')
            .select('id,name,email,phone,wedding_date,created_at')
            .eq('id', customerId)
            .eq('business_id', connection.business_id)
            .maybeSingle(),
          db().from('orders')
            .select('id,external_order_id,total_cents,status,created_at')
            .eq('business_id', connection.business_id)
            .eq('shop_domain', verified.shop)
            .eq('customer_id', customerId),
          db().from('appointment_requests')
            .select('id,preferred_date_1,preferred_window_1,status,notes,submitted_at')
            .eq('business_id', connection.business_id)
            .eq('customer_id', customerId)
            .ilike('intake_source', 'Shopify Storefront%'),
        ]);
        for (const query of [customer, orders, appointments]) if (query.error) throw query.error;

        const externalReferences = (orders.data ?? [])
          .map((order: any) => order.external_order_id ? `${verified.shop}:${order.external_order_id}` : null)
          .filter((value): value is string => Boolean(value));

        let leads: any[] = [];
        if (externalReferences.length) {
          const leadQuery = await db().from('leads')
            .select('id,name,email,source,wedding_date,stage,created_at')
            .eq('business_id', connection.business_id)
            .eq('external_source', 'shopify_order')
            .in('external_reference', externalReferences);
          if (leadQuery.error) throw leadQuery.error;
          leads = leadQuery.data ?? [];
        }

        result = {
          customer: customer.data ?? null,
          orders: orders.data ?? [],
          appointmentRequests: appointments.data ?? [],
          leads,
        };
      }
    }

    const completed = await db().from('shopify_privacy_requests').update({
      status: 'processed',
      result_json: result,
      last_error: null,
      processed_at: nowIso(),
      updated_at: nowIso(),
    }).eq('id', privacyId);
    if (completed.error) throw completed.error;

    return res.status(200).json({ success: true });
  } catch (error) {
    if (privacyId) {
      await db().from('shopify_privacy_requests').update({
        status: 'failed',
        last_error: clip(error instanceof Error ? error.message : error, 1000),
        updated_at: nowIso(),
      }).eq('id', privacyId).catch(() => undefined);
    }
    console.error('[shopify] customers/data_request processing failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/** Tenant-authenticated operational view of privacy requests. */
shopifyComplianceRouter.get('/privacy/requests', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const result = await db().from('shopify_privacy_requests')
    .select('id,topic,shop_domain,brand_id,status,attempts,last_error,received_at,processed_at')
    .eq('business_id', businessId)
    .order('received_at', { ascending: false })
    .limit(100);
  if (result.error) return res.status(500).json({ error: result.error.message });
  return res.json({ requests: result.data ?? [] });
});

/** Result data never bypasses the authenticated active-business boundary. */
shopifyComplianceRouter.get('/privacy/requests/:id', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const result = await db().from('shopify_privacy_requests')
    .select('id,topic,shop_domain,brand_id,status,attempts,last_error,received_at,processed_at,result_json')
    .eq('id', req.params.id)
    .eq('business_id', businessId)
    .maybeSingle();
  if (result.error) return res.status(500).json({ error: result.error.message });
  if (!result.data) return res.status(404).json({ error: 'Shopify privacy request not found for this business.' });
  return res.json(result.data);
});
