import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isStoreKey } from '../scheduling/publicIntake';
import { normalizeShopDomain } from './oauth';
import {
  resolveShopifyTenant,
  ShopifyConnectionInactiveError,
  verifyShopifyWebhookHmac,
} from './hardening';

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

export const shopifyOrdersRouter = Router();

const nowIso = () => new Date().toISOString();
const clip = (value: unknown, max = 500): string => String(value ?? '').trim().slice(0, max);
const isUniqueViolation = (error: unknown): boolean =>
  Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505');

function rawBody(req: Request): Buffer {
  const raw = (req as any).rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (typeof raw === 'string') return Buffer.from(raw, 'utf8');
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  return Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
}

function verifyRequest(req: Request): { raw: Buffer; shop: string } | null {
  const raw = rawBody(req);
  const signature = req.get('X-Shopify-Hmac-Sha256') || req.get('x-shopify-hmac-sha256') || undefined;
  const secret = process.env.SHOPIFY_CLIENT_SECRET || process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!verifyShopifyWebhookHmac(raw, signature, secret)) return null;
  const shop = normalizeShopDomain(
    req.get('X-Shopify-Shop-Domain') || req.get('x-shopify-shop-domain') || '',
  );
  return shop ? { raw, shop } : null;
}

function parseJson(req: Request, raw: Buffer): any {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  return JSON.parse(raw.toString('utf8'));
}

function eventId(req: Request, raw: Buffer, shop: string): string {
  const supplied = req.get('X-Shopify-Webhook-Id') || req.get('x-shopify-webhook-id');
  if (supplied?.trim()) return supplied.trim().slice(0, 200);
  return `body:${crypto.createHash('sha256').update('orders/create\0').update(shop).update('\0').update(raw).digest('hex')}`;
}

function safeDate(value: unknown): string {
  const raw = clip(value, 64);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = raw ? new Date(raw) : new Date();
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

type AppointmentDetails = {
  date: string;
  time: string;
  storeKey?: string;
  type: string;
};

function appointmentDetails(order: any): AppointmentDetails {
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
        const value = clip(property?.value, 240);
        if (name.includes('date') && value) date = value;
        if (name.includes('time') && value) time = value;
        if ((name.includes('store') || name.includes('location')) && value && isStoreKey(value)) {
          storeKey = value;
        }
      }
    }
  }

  return { date: safeDate(date), time, storeKey, type };
}

async function beginEvent(
  database: SupabaseClient | any,
  id: string,
  shop: string,
): Promise<{ duplicate: boolean; rowId: string | null }> {
  const existing = await database.from('shopify_webhook_events')
    .select('id,status,attempts')
    .eq('webhook_id', id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.status === 'succeeded') return { duplicate: true, rowId: existing.data.id };

  if (existing.data) {
    const update = await database.from('shopify_webhook_events').update({
      status: 'processing',
      attempts: Number(existing.data.attempts ?? 1) + 1,
      last_error: null,
      updated_at: nowIso(),
    }).eq('id', existing.data.id);
    if (update.error) throw update.error;
    return { duplicate: false, rowId: existing.data.id };
  }

  const inserted = await database.from('shopify_webhook_events').insert({
    webhook_id: id,
    topic: 'orders/create',
    shop_domain: shop,
    status: 'processing',
    attempts: 1,
  }).select('id').single();
  if (!inserted.error) return { duplicate: false, rowId: inserted.data.id };
  if (!isUniqueViolation(inserted.error)) throw inserted.error;

  const race = await database.from('shopify_webhook_events')
    .select('id,status')
    .eq('webhook_id', id)
    .maybeSingle();
  if (race.error) throw race.error;
  return { duplicate: race.data?.status === 'succeeded', rowId: race.data?.id ?? null };
}

async function failEvent(database: SupabaseClient | any, rowId: string | null, error: unknown): Promise<void> {
  if (!rowId) return;
  await database.from('shopify_webhook_events').update({
    status: 'failed',
    last_error: clip(error instanceof Error ? error.message : error, 1000),
    updated_at: nowIso(),
  }).eq('id', rowId);
}

async function findOrCreateCustomer(
  database: SupabaseClient | any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  shop: string,
  order: any,
): Promise<string> {
  const externalCustomerId = clip(order.customer?.id, 160);
  if (!externalCustomerId) throw new Error('Shopify order is missing a stable customer id.');

  const linked = await database.from('shopify_customer_links')
    .select('customer_id,business_id,brand_id')
    .eq('shop_domain', shop)
    .eq('external_customer_id', externalCustomerId)
    .maybeSingle();
  if (linked.error) throw linked.error;
  if (linked.data) {
    if (linked.data.business_id !== tenant.businessId || linked.data.brand_id !== tenant.brandId) {
      throw new Error('Shopify customer identity is linked outside the OAuth-bound brand.');
    }
    return linked.data.customer_id;
  }

  const email = clip(order.email || order.customer?.email, 320).toLowerCase();
  const phone = clip(order.phone || order.customer?.phone, 64);
  const name = clip(`${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`, 240) || 'Shopify Customer';

  let customerId: string | null = null;
  let createdByShopify = false;

  if (email) {
    const byEmail = await database.from('customers')
      .select('id')
      .eq('business_id', tenant.businessId)
      .ilike('email', email)
      .limit(1);
    if (byEmail.error) throw byEmail.error;
    customerId = byEmail.data?.[0]?.id ?? null;
  }
  if (!customerId && phone) {
    const byPhone = await database.from('customers')
      .select('id')
      .eq('business_id', tenant.businessId)
      .eq('phone', phone)
      .limit(1);
    if (byPhone.error) throw byPhone.error;
    customerId = byPhone.data?.[0]?.id ?? null;
  }

  if (!customerId) {
    const inserted = await database.from('customers').insert({
      business_id: tenant.businessId,
      location_id: tenant.locationId,
      name,
      email: email || null,
      phone: phone || null,
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    customerId = inserted.data.id;
    createdByShopify = true;
  }

  const link = await database.from('shopify_customer_links').insert({
    connection_id: tenant.connectionId,
    business_id: tenant.businessId,
    brand_id: tenant.brandId,
    shop_domain: shop,
    external_customer_id: externalCustomerId,
    customer_id: customerId,
    customer_created_by_shopify: createdByShopify,
  });
  if (!link.error) return customerId;
  if (!isUniqueViolation(link.error)) throw link.error;

  const race = await database.from('shopify_customer_links')
    .select('customer_id,business_id,brand_id')
    .eq('shop_domain', shop)
    .eq('external_customer_id', externalCustomerId)
    .maybeSingle();
  if (race.error) throw race.error;
  if (!race.data || race.data.business_id !== tenant.businessId || race.data.brand_id !== tenant.brandId) {
    throw new Error('Concurrent Shopify customer linkage resolved outside the OAuth-bound brand.');
  }
  const raceCustomerId = typeof race.data.customer_id === 'string' ? race.data.customer_id.trim() : '';
  if (!raceCustomerId) {
    throw new Error('Concurrent Shopify customer linkage did not return a valid VowOS customer id.');
  }
  return raceCustomerId;
}

/** Shopify order identity is (business, permanent shop domain, order id). */
async function upsertOrder(
  database: SupabaseClient | any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  shop: string,
  externalOrderId: string,
  customerId: string,
  order: any,
): Promise<string> {
  const existing = await database.from('orders')
    .select('id,status')
    .eq('business_id', tenant.businessId)
    .eq('shop_domain', shop)
    .eq('external_order_id', externalOrderId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    const update = await database.from('orders').update({
      brand_id: tenant.brandId,
      location_id: tenant.locationId,
      customer_id: customerId,
      shop_domain: shop,
      status: order.financial_status || existing.data.status,
      updated_at: nowIso(),
    }).eq('id', existing.data.id);
    if (update.error) throw update.error;
    return existing.data.id;
  }

  const total = Number.parseFloat(String(order.total_price ?? '0'));
  const inserted = await database.from('orders').insert({
    business_id: tenant.businessId,
    brand_id: tenant.brandId,
    location_id: tenant.locationId,
    customer_id: customerId,
    channel_id: null,
    external_order_id: externalOrderId,
    shop_domain: shop,
    source_type: 'SHOPIFY',
    total_cents: Number.isFinite(total) ? Math.round(total * 100) : 0,
    status: order.financial_status || 'paid',
  }).select('id').single();
  if (!inserted.error) return inserted.data.id;
  if (!isUniqueViolation(inserted.error)) throw inserted.error;

  const race = await database.from('orders')
    .select('id')
    .eq('business_id', tenant.businessId)
    .eq('shop_domain', shop)
    .eq('external_order_id', externalOrderId)
    .maybeSingle();
  if (race.error) throw race.error;
  if (!race.data?.id) throw inserted.error;
  return race.data.id;
}

async function findOrCreateAppointment(
  database: SupabaseClient | any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  shop: string,
  externalOrderId: string,
  customerId: string,
  order: any,
  details: AppointmentDetails,
): Promise<string> {
  const idempotencyKey = `shopify-order:${shop}:${externalOrderId}`.slice(0, 128);
  const existing = await database.from('appointment_requests')
    .select('id')
    .eq('business_id', tenant.businessId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;

  const inserted = await database.from('appointment_requests').insert({
    customer_id: customerId,
    business_id: tenant.businessId,
    brand_id: tenant.brandId,
    preferred_location_id: tenant.locationId,
    intake_source: `Shopify Storefront — ${tenant.brandName}`,
    preferred_date_1: details.date,
    preferred_window_1: details.time,
    status: 'submitted',
    priority: 'normal',
    idempotency_key: idempotencyKey,
    notes: `Appointment Type: ${details.type} | Shopify Order #${clip(order.order_number || externalOrderId, 120)}`,
  }).select('id').single();
  if (!inserted.error) return inserted.data.id;
  if (!isUniqueViolation(inserted.error)) throw inserted.error;

  const race = await database.from('appointment_requests')
    .select('id')
    .eq('business_id', tenant.businessId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (race.error) throw race.error;
  if (!race.data?.id) throw inserted.error;
  return race.data.id;
}

async function findOrCreateLead(
  database: SupabaseClient | any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  shop: string,
  externalOrderId: string,
  order: any,
  details: AppointmentDetails,
): Promise<string | null> {
  const externalReference = `${shop}:${externalOrderId}`.slice(0, 300);
  const existing = await database.from('leads')
    .select('id')
    .eq('business_id', tenant.businessId)
    .eq('external_source', 'shopify_order')
    .eq('external_reference', externalReference)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;

  const name = clip(`${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`, 240) || 'Shopify Customer';
  const email = clip(order.email || order.customer?.email, 320).toLowerCase() || null;
  const inserted = await database.from('leads').insert({
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

  const race = await database.from('leads')
    .select('id')
    .eq('business_id', tenant.businessId)
    .eq('external_source', 'shopify_order')
    .eq('external_reference', externalReference)
    .maybeSingle();
  if (race.error) throw race.error;
  return race.data?.id ?? null;
}

async function enqueueNotifications(
  database: SupabaseClient | any,
  tenant: Awaited<ReturnType<typeof resolveShopifyTenant>>,
  appointmentRequestId: string,
  order: any,
  details: AppointmentDetails,
): Promise<void> {
  const name = clip(`${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`, 240) || 'Shopify Customer';
  const total = Number.parseFloat(String(order.total_price ?? '0'));
  const totalText = Number.isFinite(total) ? `$${total.toFixed(2)}` : '$0.00';
  const recipients = [...new Set(['robertsenterprises@bridgebox.ai', ...tenant.notificationEmails].filter(Boolean))];
  const body = `New appointment booked via Shopify by ${name}. Total Paid: ${totalText}. Appointment: ${details.type} on ${details.date} at ${details.time} (${tenant.brandName}).`;

  for (const recipient of recipients) {
    const queued = await database.from('appointment_intake_notification_outbox').upsert({
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
    if (queued.error) throw queued.error;
  }
}

shopifyOrdersRouter.post('/webhooks/orders/create', async (req: Request, res: Response) => {
  const verified = verifyRequest(req);
  if (!verified) return res.status(401).json({ error: 'Unauthorized: invalid Shopify webhook signature or shop domain.' });

  const database = (req as any).context?.db || db();
  let eventRowId: string | null = null;
  try {
    const event = await beginEvent(database, eventId(req, verified.raw, verified.shop), verified.shop);
    eventRowId = event.rowId;
    if (event.duplicate) return res.status(200).json({ success: true, duplicate: true });

    const order = parseJson(req, verified.raw);
    if (!order || typeof order !== 'object' || !order.id || !order.customer) {
      throw new Error('Shopify orders/create payload is missing order or customer identity.');
    }

    const externalOrderId = clip(order.id, 160);
    const details = appointmentDetails(order);
    const shopifyLocationId = order.location_id ? clip(order.location_id, 128) : undefined;
    const tenant = await resolveShopifyTenant(database, verified.shop, details.storeKey, shopifyLocationId);

    const eventContext = await database.from('shopify_webhook_events').update({
      business_id: tenant.businessId,
      brand_id: tenant.brandId,
      external_resource_id: externalOrderId,
      updated_at: nowIso(),
    }).eq('id', eventRowId);
    if (eventContext.error) throw eventContext.error;

    const customerId = await findOrCreateCustomer(database, tenant, verified.shop, order);
    const orderId = await upsertOrder(database, tenant, verified.shop, externalOrderId, customerId, order);
    const appointmentRequestId = await findOrCreateAppointment(
      database, tenant, verified.shop, externalOrderId, customerId, order, details,
    );
    const leadId = await findOrCreateLead(database, tenant, verified.shop, externalOrderId, order, details);
    await enqueueNotifications(database, tenant, appointmentRequestId, order, details);

    const complete = await database.from('shopify_webhook_events').update({
      status: 'succeeded',
      customer_id: customerId,
      order_id: orderId,
      appointment_request_id: appointmentRequestId,
      lead_id: leadId,
      last_error: null,
      completed_at: nowIso(),
      updated_at: nowIso(),
    }).eq('id', eventRowId);
    if (complete.error) throw complete.error;

    return res.status(200).json({
      success: true,
      orderId,
      customerId,
      appointmentRequestId,
      leadId,
      businessId: tenant.businessId,
      brandId: tenant.brandId,
      locationId: tenant.locationId,
      shopDomain: verified.shop,
    });
  } catch (error) {
    await failEvent(database, eventRowId, error).catch(() => undefined);
    if (error instanceof ShopifyConnectionInactiveError) {
      return res.status(410).json({ success: false, ignored: true, error: error.message });
    }
    console.error('[shopify] shop-scoped orders/create processing failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
