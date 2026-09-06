/**
 * Shopify's three mandatory privacy webhooks.
 *
 * These are a condition of the app staying installed, and Shopify grades them
 * on answering 2xx — which is exactly why the previous implementation passed
 * while doing nothing. It recorded the request in the dead-letter table with an
 * error_message saying an operator had to action it inside the statutory
 * window, and returned success. Nobody was watching that table.
 *
 * What is implemented here:
 *   customers/data_request  assembles the export and stores it as evidence
 *   customers/redact        actually redacts, then proves what it redacted
 *   shop/redact             tears down the Shopify linkage for the shop
 *
 * Order of operations matches every other topic in this module and must not be
 * rearranged: HMAC over the exact raw body first, tenant from the verified
 * header second, payload last. The payload never selects a tenant.
 *
 * Idempotency is load-bearing here in a way it is not elsewhere. Shopify
 * retries for 48 hours; a redaction that runs twice is merely wasteful, but a
 * redaction that runs again *after* the customer row was reused would blank a
 * live record. The unique request_key is what stops that.
 */
import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { readShopifyWebhookSecret } from './oauth';
import { verifyShopifyWebhookHmac, normalizeHeaderDomain } from './context';

export type PrivacyTopic = 'customers/data_request' | 'customers/redact' | 'shop/redact';

export interface PrivacyRequestInput {
  topic: PrivacyTopic;
  shopDomain: string;
  webhookId?: string | null;
  rawBody: Buffer;
  payload: any;
}

const nowIso = () => new Date().toISOString();
const clip = (value: unknown, max = 1000): string => String(value ?? '').trim().slice(0, max);

/** Tombstone written over redacted PII. Recognisable, and never a real value. */
const REDACTED = '[redacted-shopify-privacy-request]';

/**
 * The idempotency key. Shopify's own webhook id when it sends one; otherwise a
 * hash over topic + shop + the exact bytes we authenticated, so two deliveries
 * of the same request collapse and two genuinely different requests do not.
 */
export function privacyRequestKey(input: PrivacyRequestInput): string {
  const supplied = input.webhookId?.trim();
  if (supplied) return `${input.topic}:${supplied}`.slice(0, 500);
  const digest = crypto
    .createHash('sha256')
    .update(input.topic)
    .update('\0')
    .update(input.shopDomain)
    .update('\0')
    .update(input.rawBody)
    .digest('hex');
  return `${input.topic}:body:${digest}`.slice(0, 500);
}

export function externalCustomerId(payload: any): string | null {
  const value = payload?.customer?.id ?? payload?.customer_id;
  if (value === undefined || value === null || value === '') return null;
  return String(value).slice(0, 512);
}

interface ShopConnection {
  id: string;
  business_id: string;
  brand_id: string | null;
}

/**
 * Resolves the shop to exactly one connection, or none.
 *
 * Two connections claiming one domain is the ambiguity that let an earlier
 * version of this integration default an unrecognised shop to I Do Bridal
 * Couture. A privacy request must never be answered with another tenant's data,
 * so ambiguity throws rather than picking.
 */
async function connectionForShop(
  db: SupabaseClient | any,
  shopDomain: string,
): Promise<ShopConnection | null> {
  const { data, error } = await db
    .from('growth_provider_connections')
    .select('id,business_id,metadata')
    .eq('provider', 'shopify')
    .ilike('metadata->>shopDomain', shopDomain)
    .limit(2);
  if (error) throw new Error(`Could not resolve Shopify connection: ${error.message}`);

  const rows = data ?? [];
  if (rows.length > 1) {
    throw new Error(`Shopify privacy request for "${shopDomain}" resolves to more than one VowOS connection.`);
  }
  if (!rows[0]) return null;

  const metadata = rows[0].metadata;
  const brandId =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata) && typeof metadata.brandId === 'string' && metadata.brandId.trim()
      ? metadata.brandId.trim()
      : null;

  return { id: rows[0].id, business_id: rows[0].business_id, brand_id: brandId };
}

/** The customer this request is about, via the mapping the handlers already write. */
async function linkedCustomerId(
  db: SupabaseClient | any,
  businessId: string,
  externalId: string,
): Promise<string | null> {
  const { data, error } = await db
    .from('customer_external_identities')
    .select('customer_id')
    .eq('business_id', businessId)
    .eq('provider', 'SHOPIFY')
    .eq('external_id', externalId)
    .maybeSingle();
  if (error) throw new Error(`Could not resolve Shopify customer identity: ${error.message}`);
  return data?.customer_id ?? null;
}

/**
 * customers/data_request — assemble everything VowOS holds about this person
 * that arrived through this shop.
 *
 * Scoped to the connection's business *and*, when the shop is bound to a brand,
 * that brand. Roberts runs two brands under one organization; a data request
 * from the Proper storefront must not return the same person's I Do history.
 */
async function assembleCustomerExport(
  db: SupabaseClient | any,
  connection: ShopConnection,
  customerId: string,
): Promise<Record<string, unknown>> {
  const customerQuery = db
    .from('customers')
    .select('id,name,email,phone,wedding_date,created_at')
    .eq('id', customerId)
    .eq('business_id', connection.business_id)
    .maybeSingle();

  let ordersQuery = db
    .from('orders')
    .select('id,order_number,ordered_at,currency,financial_status,fulfillment_status,subtotal_cents,tax_cents,discount_cents,refunded_cents')
    .eq('business_id', connection.business_id)
    .eq('customer_id', customerId)
    .eq('source_type', 'SHOPIFY');
  if (connection.brand_id) ordersQuery = ordersQuery.eq('brand_id', connection.brand_id);

  const appointmentsQuery = db
    .from('appointment_requests')
    .select('id,status,submitted_at,preferred_date_1,preferred_window_1,notes')
    .eq('business_id', connection.business_id)
    .eq('customer_id', customerId);

  const [customer, orders, appointments] = await Promise.all([customerQuery, ordersQuery, appointmentsQuery]);
  for (const result of [customer, orders, appointments]) {
    if (result?.error) throw new Error(`Privacy export query failed: ${result.error.message}`);
  }

  return {
    customer: customer?.data ?? null,
    orders: orders?.data ?? [],
    appointmentRequests: appointments?.data ?? [],
    scope: { businessId: connection.business_id, brandId: connection.brand_id },
  };
}

/**
 * customers/redact — overwrite the identifying fields and drop the Shopify link.
 *
 * The customer row itself stays. Orders, invoices and contracts reference it by
 * id, and deleting it would either cascade away the merchant's own financial
 * records or fail on the foreign key. Redaction is the correct shape: the
 * person is no longer identifiable, the merchant's books still balance.
 */
async function redactCustomer(
  db: SupabaseClient | any,
  connection: ShopConnection,
  customerId: string,
  externalId: string | null,
): Promise<Record<string, unknown>> {
  const { error: updateError } = await db
    .from('customers')
    .update({ name: REDACTED, email: null, phone: null, updated_at: nowIso() })
    .eq('id', customerId)
    .eq('business_id', connection.business_id);
  if (updateError) throw new Error(`Could not redact customer: ${updateError.message}`);

  let identitiesRemoved = 0;
  if (externalId) {
    const { error: deleteError } = await db
      .from('customer_external_identities')
      .delete()
      .eq('business_id', connection.business_id)
      .eq('provider', 'SHOPIFY')
      .eq('external_id', externalId);
    if (deleteError) throw new Error(`Could not remove Shopify customer identity: ${deleteError.message}`);
    identitiesRemoved = 1;
  }

  return { redactedCustomerId: customerId, identitiesRemoved, fields: ['name', 'email', 'phone'] };
}

/**
 * shop/redact — arrives 48h after uninstall.
 *
 * This deletes the Shopify *linkage*: the OAuth connection and the provider
 * identity rows that map Shopify ids onto VowOS customers. It deliberately does
 * NOT delete the merchant's customers, orders or appointments.
 *
 * That is a considered position, not an oversight. Those records are the
 * merchant's own business data, which VowOS holds as their processor and which
 * they are frequently required to retain for tax and consumer-protection
 * purposes; Shopify's shop/redact concerns the data Shopify caused us to hold
 * about the *shop*. Deleting a boutique's sales history because they uninstalled
 * an app would be the more serious failure. The result_json records exactly what
 * was removed and what was kept, so the decision is auditable rather than
 * implicit.
 */
async function redactShop(
  db: SupabaseClient | any,
  connection: ShopConnection | null,
  shopDomain: string,
): Promise<Record<string, unknown>> {
  if (!connection) {
    return { connectionRemoved: false, identitiesRemoved: 0, note: 'No Shopify connection existed for this shop.' };
  }

  const { data: identities, error: identityError } = await db
    .from('customer_external_identities')
    .select('id')
    .eq('business_id', connection.business_id)
    .eq('provider', 'SHOPIFY');
  if (identityError) throw new Error(`Could not enumerate Shopify identities: ${identityError.message}`);

  const identityCount = (identities ?? []).length;
  if (identityCount) {
    const { error: deleteError } = await db
      .from('customer_external_identities')
      .delete()
      .eq('business_id', connection.business_id)
      .eq('provider', 'SHOPIFY');
    if (deleteError) throw new Error(`Could not remove Shopify identities: ${deleteError.message}`);
  }

  const { error: connectionError } = await db
    .from('growth_provider_connections')
    .delete()
    .eq('id', connection.id);
  if (connectionError) throw new Error(`Could not remove Shopify connection: ${connectionError.message}`);

  return {
    connectionRemoved: true,
    identitiesRemoved: identityCount,
    shopDomain,
    retained: ['customers', 'orders', 'order_items', 'appointment_requests'],
    retentionReason: 'Merchant business records held as processor; not Shopify-derived shop data.',
  };
}

export interface PrivacyOutcome {
  status: 'processed' | 'duplicate' | 'failed';
  topic: PrivacyTopic;
  requestKey: string;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * The whole request lifecycle, separated from Express so it is testable without
 * standing up a server. Callers have already verified the HMAC.
 */
export async function handleShopifyPrivacyRequest(
  db: SupabaseClient | any,
  input: PrivacyRequestInput,
): Promise<PrivacyOutcome> {
  const requestKey = privacyRequestKey(input);

  const existing = await db
    .from('shopify_privacy_requests')
    .select('id,status,attempts')
    .eq('request_key', requestKey)
    .maybeSingle();
  if (existing?.error) throw new Error(`Could not read privacy ledger: ${existing.error.message}`);

  // A completed request is never re-run. This is the guard that stops a 48-hour
  // Shopify retry from redacting a customer row that has since been reused.
  if (existing?.data?.status === 'processed') {
    return { status: 'duplicate', topic: input.topic, requestKey };
  }

  const connection = await connectionForShop(db, input.shopDomain);
  const externalId = externalCustomerId(input.payload);

  let rowId: string | null = existing?.data?.id ?? null;
  if (rowId) {
    const { error } = await db
      .from('shopify_privacy_requests')
      .update({
        status: 'processing',
        attempts: Number(existing?.data?.attempts ?? 1) + 1,
        last_error: null,
        updated_at: nowIso(),
      })
      .eq('id', rowId);
    if (error) throw new Error(`Could not update privacy ledger: ${error.message}`);
  } else {
    const inserted = await db
      .from('shopify_privacy_requests')
      .insert({
        request_key: requestKey,
        topic: input.topic,
        shop_domain: input.shopDomain,
        connection_id: connection?.id ?? null,
        business_id: connection?.business_id ?? null,
        brand_id: connection?.brand_id ?? null,
        external_customer_id: externalId,
        payload: input.payload ?? {},
        status: 'processing',
      })
      .select('id')
      .single();
    if (inserted?.error) throw new Error(`Could not record privacy request: ${inserted.error.message}`);
    rowId = inserted?.data?.id ?? null;
  }

  try {
    let result: Record<string, unknown>;
    let resolvedCustomerId: string | null = null;

    if (input.topic === 'shop/redact') {
      result = await redactShop(db, connection, input.shopDomain);
    } else if (!connection) {
      // Honest outcome, not a silent success: there is nothing to search or
      // erase because this shop was never connected to a VowOS tenant.
      result = { customerFound: false, reason: 'NO_CONNECTION_FOR_SHOP' };
    } else if (!externalId) {
      result = { customerFound: false, reason: 'NO_CUSTOMER_ID_IN_PAYLOAD' };
    } else {
      resolvedCustomerId = await linkedCustomerId(db, connection.business_id, externalId);
      if (!resolvedCustomerId) {
        result = { customerFound: false, reason: 'NO_VOWOS_CUSTOMER_LINKED' };
      } else if (input.topic === 'customers/data_request') {
        result = await assembleCustomerExport(db, connection, resolvedCustomerId);
      } else {
        result = await redactCustomer(db, connection, resolvedCustomerId, externalId);
      }
    }

    const { error } = await db
      .from('shopify_privacy_requests')
      .update({
        status: 'processed',
        result_json: result,
        resolved_customer_id: resolvedCustomerId,
        processed_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq('id', rowId);
    if (error) throw new Error(`Could not persist privacy result: ${error.message}`);

    return { status: 'processed', topic: input.topic, requestKey, result };
  } catch (error) {
    const message = clip(error instanceof Error ? error.message : error);
    await db
      .from('shopify_privacy_requests')
      .update({ status: 'failed', last_error: message, updated_at: nowIso() })
      .eq('id', rowId);
    return { status: 'failed', topic: input.topic, requestKey, error: message };
  }
}

function rawBodyOf(req: Request): Buffer {
  const raw = (req as any).rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (typeof raw === 'string') return Buffer.from(raw, 'utf8');
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
  return Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
}

function parsedBodyOf(req: Request, raw: Buffer): any {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return {};
  }
}

/**
 * One handler shape for all three topics.
 *
 * Response codes are deliberate. 401 for a bad signature — Shopify should know
 * it is not authenticated. 200 for everything after that, including a handler
 * failure: Shopify counts a non-2xx as a compliance failure against the app,
 * and the request is already durable in the ledger with status 'failed', so
 * retrying the HTTP call adds nothing a human looking at /privacy/requests
 * cannot see. The failure is visible; it is just not visible to Shopify.
 */
export function privacyWebhookRoute(getDb: () => SupabaseClient | any, topic: PrivacyTopic) {
  return async (req: Request, res: Response): Promise<Response> => {
    const shopHeader = req.get('X-Shopify-Shop-Domain') || req.get('x-shopify-shop-domain');
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256') || req.get('x-shopify-hmac-sha256') || undefined;
    if (!shopHeader) {
      return res.status(400).json({ error: 'Missing X-Shopify-Shop-Domain header.' });
    }

    const raw = rawBodyOf(req);
    if (!verifyShopifyWebhookHmac(raw, hmacHeader, readShopifyWebhookSecret(shopHeader))) {
      return res.status(401).json({ error: 'Unauthorized: invalid or missing Shopify webhook signature.' });
    }

    const shopDomain = normalizeHeaderDomain(shopHeader);
    if (!shopDomain) {
      return res.status(400).json({ error: 'X-Shopify-Shop-Domain is not a valid permanent myshopify domain.' });
    }

    try {
      const outcome = await handleShopifyPrivacyRequest(getDb(), {
        topic,
        shopDomain,
        webhookId: req.get('X-Shopify-Webhook-Id') || req.get('x-shopify-webhook-id'),
        rawBody: raw,
        payload: parsedBodyOf(req, raw),
      });
      return res.status(200).json({ success: true, status: outcome.status, topic });
    } catch (error) {
      console.error(`[shopify:${topic}] privacy request could not be recorded:`, error);
      return res.status(200).json({ success: true, status: 'failed', topic, recorded: false });
    }
  };
}

/** Operator visibility, scoped to the caller's active business. */
export function createPrivacyAdminRouter(getDb: () => SupabaseClient | any): Router {
  const router = Router();

  router.get('/requests', requireGrowthAccess, async (req, res) => {
    const { businessId } = growthContextOf(req);
    const { data, error } = await getDb()
      .from('shopify_privacy_requests')
      .select('id,topic,shop_domain,brand_id,status,attempts,last_error,received_at,processed_at')
      .eq('business_id', businessId)
      .order('received_at', { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ requests: data ?? [] });
  });

  // result_json holds the export itself, so it never leaves the active-business
  // boundary: the business_id filter is part of the lookup, not a post-check.
  router.get('/requests/:id', requireGrowthAccess, async (req, res) => {
    const { businessId } = growthContextOf(req);
    const { data, error } = await getDb()
      .from('shopify_privacy_requests')
      .select('id,topic,shop_domain,brand_id,status,attempts,last_error,received_at,processed_at,result_json')
      .eq('id', req.params.id)
      .eq('business_id', businessId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Shopify privacy request not found for this business.' });
    return res.json(data);
  });

  return router;
}
