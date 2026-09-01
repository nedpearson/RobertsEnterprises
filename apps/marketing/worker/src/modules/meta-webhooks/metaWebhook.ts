import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { growthDb } from '../growth/client';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { resolveIntegrationCustomer } from '../integrations/customerIdentity';

type Db = SupabaseClient | any;

type MetaObject = Record<string, unknown>;

export interface MetaInboundEvent {
  providerAccountId: string;
  externalEventId: string;
  senderId: string;
  recipientId: string;
  content: string | null;
  messageType: 'text' | 'attachment' | 'postback';
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface MetaAccountScope {
  connectionId: string;
  businessId: string;
  brandId: string;
  locationId: string | null;
}

/** Meta sender IDs are Page/account scoped; never treat a bare sender ID as global. */
export function metaCustomerExternalId(providerAccountId: string, senderId: string): string {
  return `${providerAccountId}:${senderId}`;
}

interface ProviderConnectionCandidate {
  id?: string | null;
  business_id?: string | null;
  brand_id?: string | null;
  location_id?: string | null;
  provider?: string | null;
  provider_account_id?: string | null;
  status?: string | null;
  auth_state?: string | null;
}

const META_PROVIDERS = ['meta', 'meta_social', 'facebook', 'instagram'];
const ACTIVE_CONNECTION_STATES = new Set(['active', 'connected']);
const MAX_CONTENT_LENGTH = 10_000;

const objectOf = (value: unknown): MetaObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as MetaObject : {};

const stringOf = (value: unknown, max = 512): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const timestampOf = (value: unknown): string => {
  const millis = Number(value);
  return Number.isFinite(millis) && millis > 0
    ? new Date(millis).toISOString()
    : new Date(0).toISOString();
};

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

/** Verify Meta's POST signature over the exact bytes received by Express. */
export function verifyMetaWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!rawBody.length || !signatureHeader || !appSecret) return false;
  if (!/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)) return false;

  const supplied = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/** Verify the one-time app-level token used by Meta's GET subscription handshake. */
export function verifyMetaWebhookToken(supplied: string, configured: string): boolean {
  return Boolean(supplied && configured) && constantTimeEqual(supplied, configured);
}

function stableEventId(providerAccountId: string, event: MetaObject): string {
  const eventBody = JSON.stringify({ providerAccountId, event });
  return `derived_${createHash('sha256').update(eventBody).digest('hex')}`;
}

/**
 * Parse only inbound message/postback records after HMAC verification.
 * Browser/body supplied organization, brand, and location fields are ignored.
 */
export function parseMetaWebhookEvents(rawBody: Buffer): MetaInboundEvent[] {
  let payload: MetaObject;
  try {
    payload = objectOf(JSON.parse(rawBody.toString('utf8')));
  } catch {
    throw new Error('Meta webhook payload is not valid JSON.');
  }

  const objectType = stringOf(payload.object, 32).toLowerCase();
  if (objectType !== 'page' && objectType !== 'instagram') {
    throw new Error('Unsupported Meta webhook object.');
  }

  const entries = Array.isArray(payload.entry) ? payload.entry.slice(0, 500) : [];
  const parsed: MetaInboundEvent[] = [];

  for (const rawEntry of entries) {
    const entry = objectOf(rawEntry);
    const providerAccountId = stringOf(entry.id);
    if (!providerAccountId) continue;

    const messaging = Array.isArray(entry.messaging) ? entry.messaging.slice(0, 500) : [];
    for (const rawMessageEvent of messaging) {
      const messageEvent = objectOf(rawMessageEvent);
      const senderId = stringOf(objectOf(messageEvent.sender).id);
      const recipientId = stringOf(objectOf(messageEvent.recipient).id);
      const message = objectOf(messageEvent.message);
      const postback = objectOf(messageEvent.postback);

      // Delivery/read receipts and outbound echoes are operational signals, not
      // inbound customer messages. Do not manufacture inbox records from them.
      if ((!Object.keys(message).length && !Object.keys(postback).length) || message.is_echo === true) continue;
      if (!senderId || !recipientId) continue;

      const attachments = Array.isArray(message.attachments) ? message.attachments.slice(0, 20) : [];
      const messageId = stringOf(message.mid) || stringOf(postback.mid);
      const content = stringOf(message.text, MAX_CONTENT_LENGTH)
        || stringOf(postback.title, MAX_CONTENT_LENGTH)
        || stringOf(postback.payload, MAX_CONTENT_LENGTH)
        || null;
      const messageType: MetaInboundEvent['messageType'] = Object.keys(postback).length
        ? 'postback'
        : attachments.length
          ? 'attachment'
          : 'text';

      parsed.push({
        providerAccountId,
        externalEventId: messageId || stableEventId(providerAccountId, messageEvent),
        senderId,
        recipientId,
        content,
        messageType,
        occurredAt: timestampOf(messageEvent.timestamp ?? entry.time),
        metadata: {
          object: objectType,
          attachmentTypes: attachments.map((item) => stringOf(objectOf(item).type, 64)).filter(Boolean),
          payloadDigest: createHash('sha256').update(JSON.stringify(messageEvent)).digest('hex'),
        },
      });
    }
  }

  return parsed;
}

/** Pure fail-closed validation used by the database resolver and adversarial tests. */
export function scopeFromCandidates(
  candidates: ProviderConnectionCandidate[],
  providerAccountId: string,
): MetaAccountScope | null {
  if (candidates.length !== 1) return null;
  const row = candidates[0];
  const provider = stringOf(row.provider, 64).toLowerCase();
  const status = stringOf(row.status, 64).toLowerCase();
  const authState = stringOf(row.auth_state, 64).toUpperCase();

  if (!META_PROVIDERS.includes(provider)) return null;
  if (stringOf(row.provider_account_id) !== providerAccountId) return null;
  if (!ACTIVE_CONNECTION_STATES.has(status) || authState !== 'AUTHORIZED') return null;
  if (!row.id || !row.business_id || !row.brand_id) return null;

  return {
    connectionId: row.id,
    businessId: row.business_id,
    brandId: row.brand_id,
    locationId: row.location_id ?? null,
  };
}

export async function resolveMetaAccountScope(db: Db, providerAccountId: string): Promise<MetaAccountScope | null> {
  const { data, error } = await db
    .from('provider_connections')
    .select('id,business_id,brand_id,location_id,provider,provider_account_id,status,auth_state')
    .eq('provider_account_id', providerAccountId)
    .in('provider', META_PROVIDERS)
    .limit(2);
  if (error) throw new Error(`Meta provider binding lookup failed: ${error.message}`);

  const scope = scopeFromCandidates((data ?? []) as ProviderConnectionCandidate[], providerAccountId);
  if (!scope) return null;

  const { data: brand, error: brandError } = await db
    .from('business_brands')
    .select('id,business_id')
    .eq('id', scope.brandId)
    .eq('business_id', scope.businessId)
    .maybeSingle();
  if (brandError) throw new Error(`Meta brand binding validation failed: ${brandError.message}`);
  if (!brand?.id) return null;

  if (scope.locationId) {
    const { data: location, error: locationError } = await db
      .from('locations')
      .select('id,business_id,brand_id')
      .eq('id', scope.locationId)
      .eq('business_id', scope.businessId)
      .eq('brand_id', scope.brandId)
      .maybeSingle();
    if (locationError) throw new Error(`Meta location binding validation failed: ${locationError.message}`);
    if (!location?.id) return null;
  }

  return scope;
}

const uniqueViolation = (error: unknown): boolean =>
  Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505');

async function processMetaEvent(
  db: Db,
  scope: MetaAccountScope,
  event: MetaInboundEvent,
  correlationId: string,
  payloadDigest: string,
): Promise<'PROCESSED' | 'UNRESOLVED_IDENTITY' | 'DUPLICATE'> {
  const claim = await db.from('integration_webhook_events').insert({
    provider: 'META',
    provider_account_id: event.providerAccountId,
    external_event_id: event.externalEventId,
    provider_connection_id: scope.connectionId,
    business_id: scope.businessId,
    brand_id: scope.brandId,
    location_id: scope.locationId,
    signature_verified: true,
    processing_status: 'PROCESSING',
    correlation_id: correlationId,
    payload_digest: payloadDigest,
  }).select('id').single();

  if (uniqueViolation(claim.error)) return 'DUPLICATE';
  if (claim.error || !claim.data?.id) {
    throw new Error(`Meta webhook event claim failed: ${claim.error?.message || 'No event id returned.'}`);
  }

  try {
    const identity = await resolveIntegrationCustomer(db, {
      businessId: scope.businessId,
      provider: 'META',
      externalId: metaCustomerExternalId(event.providerAccountId, event.senderId),
      locationId: scope.locationId,
    });
    const processingStatus = identity.customerId ? 'PROCESSED' : 'UNRESOLVED_IDENTITY';

    const inboxInsert = await db.from('omnichannel_inbox').insert({
      business_id: scope.businessId,
      brand_id: scope.brandId,
      location_id: scope.locationId,
      provider_connection_id: scope.connectionId,
      customer_id: identity.customerId,
      identity_status: identity.customerId ? 'RESOLVED' : 'UNRESOLVED',
      external_message_id: event.externalEventId,
      sender_id: event.senderId,
      recipient_id: event.recipientId,
      content: event.content,
      message_type: event.messageType,
      metadata: { ...event.metadata, occurredAt: event.occurredAt, identityResolution: identity.resolution },
      status: 'unread',
      created_at: event.occurredAt,
    });
    if (inboxInsert.error && !uniqueViolation(inboxInsert.error)) {
      throw new Error(`Meta inbox insert failed: ${inboxInsert.error.message}`);
    }

    await db.from('integration_webhook_events').update({
      processing_status: processingStatus,
      customer_id: identity.customerId,
      processed_at: new Date().toISOString(),
      error_code: null,
    }).eq('id', claim.data.id);

    // A real signed event routed through the provider account is direct health
    // evidence. OAuth or a local database lookup alone must never set HEALTHY.
    await db.from('provider_connections').update({
      health_status: 'HEALTHY',
      last_health_check_at: new Date().toISOString(),
      last_error_at: null,
      last_error_code: null,
      last_error_message: null,
    }).eq('id', scope.connectionId).eq('business_id', scope.businessId);

    return processingStatus;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.from('integration_webhook_events').update({
      processing_status: 'FAILED',
      error_code: 'PROCESSING_ERROR',
      retry_count: 1,
    }).eq('id', claim.data.id);

    await db.from('integration_dlq_events').insert({
      provider_connection_id: scope.connectionId,
      business_id: scope.businessId,
      provider: 'META',
      event_type: 'messages/receive',
      idempotency_key: `META:${scope.connectionId}:${event.externalEventId}`,
      payload: {
        providerAccountId: event.providerAccountId,
        externalEventId: event.externalEventId,
        senderId: event.senderId,
        recipientId: event.recipientId,
        messageType: event.messageType,
        content: event.content,
        occurredAt: event.occurredAt,
        metadata: event.metadata,
        payloadDigest,
      },
      headers: {},
      error_message: message.slice(0, 2_000),
      status: 'PENDING',
    });
    throw error;
  }
}

function requestHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function correlationIdOf(req: Request): string {
  const supplied = requestHeader(req, 'x-correlation-id');
  return supplied && /^[a-zA-Z0-9._:-]{1,128}$/.test(supplied)
    ? supplied
    : `meta_${randomUUID()}`;
}

export const metaWebhookRouter = Router();

metaWebhookRouter.get('/webhook', (req: Request, res: Response) => {
  const mode = stringOf(req.query['hub.mode'], 64);
  const suppliedToken = stringOf(req.query['hub.verify_token'], 512);
  const challenge = stringOf(req.query['hub.challenge'], 2048);
  const configuredToken = process.env.META_WEBHOOK_VERIFY_TOKEN || '';

  if (mode !== 'subscribe' || !challenge || !verifyMetaWebhookToken(suppliedToken, configuredToken)) {
    return res.status(403).send('Forbidden');
  }
  return res.status(200).send(challenge);
});

metaWebhookRouter.post('/webhook', async (req: Request, res: Response) => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const appSecret = process.env.META_APP_SECRET || '';
  const signature = requestHeader(req, 'x-hub-signature-256');

  if (!Buffer.isBuffer(rawBody) || !verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
    return res.status(401).json({ error: 'Invalid Meta webhook signature.' });
  }

  let events: MetaInboundEvent[];
  try {
    events = parseMetaWebhookEvents(rawBody);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid Meta webhook payload.' });
  }

  if (!events.length) return res.status(200).json({ received: 0, processed: 0, duplicates: 0 });

  const db = growthDb();
  const accountIds = Array.from(new Set(events.map((event) => event.providerAccountId)));
  const scopes = new Map<string, MetaAccountScope>();
  try {
    for (const accountId of accountIds) {
      const scope = await resolveMetaAccountScope(db, accountId);
      if (!scope) return res.status(404).json({ error: 'Verified Meta account binding was not found.' });
      scopes.set(accountId, scope);
    }

    const correlationId = correlationIdOf(req);
    const payloadDigest = createHash('sha256').update(rawBody).digest('hex');
    let processed = 0;
    let unresolved = 0;
    let duplicates = 0;

    for (const event of events) {
      const result = await processMetaEvent(db, scopes.get(event.providerAccountId)!, event, correlationId, payloadDigest);
      if (result === 'DUPLICATE') duplicates += 1;
      else if (result === 'UNRESOLVED_IDENTITY') unresolved += 1;
      else processed += 1;
    }

    return res.status(200).json({ received: events.length, processed, unresolved, duplicates, correlationId });
  } catch (error) {
    console.error('[meta-webhook] processing failed:', error instanceof Error ? error.message : String(error));
    return res.status(500).json({ error: 'Meta webhook processing failed.' });
  }
});

/**
 * Authenticated binding endpoint. A Page/Instagram account must first be
 * discovered through the tenant's verified Meta OAuth connection. The caller
 * may then bind it to one real brand/location; business_id is derived from JWT.
 */
metaWebhookRouter.post('/bindings', requireGrowthAccess, async (req: Request, res: Response) => {
  const { businessId } = growthContextOf(req);
  const providerAccountId = stringOf(req.body?.providerAccountId);
  const brandId = stringOf(req.body?.brandId);
  const locationId = stringOf(req.body?.locationId) || null;
  const claimedBusinessId = stringOf(req.body?.businessId);

  if (claimedBusinessId && claimedBusinessId !== businessId) {
    return res.status(403).json({ error: 'The requested organization does not match the authenticated workspace.' });
  }
  if (!providerAccountId || !brandId) {
    return res.status(400).json({ error: 'providerAccountId and brandId are required.' });
  }

  const db = growthDb();
  const [{ data: accounts, error: accountError }, { data: brand, error: brandError }] = await Promise.all([
    db.from('growth_social_accounts')
      .select('id,platform,external_id,connection_id')
      .eq('business_id', businessId)
      .eq('external_id', providerAccountId)
      .limit(2),
    db.from('business_brands')
      .select('id,business_id')
      .eq('id', brandId)
      .eq('business_id', businessId)
      .maybeSingle(),
  ]);

  if (accountError || brandError) return res.status(500).json({ error: 'Could not validate the Meta binding.' });
  if ((accounts ?? []).length !== 1 || !brand?.id) {
    return res.status(400).json({ error: 'The Meta account or brand is not uniquely owned by this organization.' });
  }


  const sourceConnectionId = stringOf(accounts![0].connection_id);
  if (!sourceConnectionId) {
    return res.status(400).json({ error: 'The Meta account is not attached to a verified OAuth connection.' });
  }
  const { data: sourceConnection, error: sourceError } = await db.from('growth_provider_connections')
    .select('id,business_id,provider,status')
    .eq('id', sourceConnectionId)
    .eq('business_id', businessId)
    .in('provider', ['meta', 'meta_social'])
    .eq('status', 'connected')
    .maybeSingle();
  if (sourceError) return res.status(500).json({ error: 'Could not validate the Meta OAuth connection.' });
  if (!sourceConnection?.id) {
    return res.status(400).json({ error: 'The Meta OAuth connection is not active.' });
  }

  if (locationId) {
    const { data: location, error } = await db.from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('business_id', businessId)
      .eq('brand_id', brandId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: 'Could not validate the Meta location binding.' });
    if (!location?.id) return res.status(400).json({ error: 'The selected location does not belong to this brand.' });
  }

  const { data: existing, error: existingError } = await db.from('provider_connections')
    .select('id,business_id')
    .eq('provider_account_id', providerAccountId)
    .in('provider', META_PROVIDERS)
    .limit(2);
  if (existingError) return res.status(500).json({ error: 'Could not inspect existing Meta bindings.' });
  if ((existing ?? []).some((row: { business_id?: string }) => row.business_id !== businessId)) {
    return res.status(409).json({ error: 'This Meta account is already bound to another organization.' });
  }
  if ((existing ?? []).length > 1) {
    return res.status(409).json({ error: 'This Meta account has ambiguous bindings and requires platform repair.' });
  }

  const platform = stringOf(accounts![0].platform, 32).toLowerCase();
  const patch = {
    business_id: businessId,
    brand_id: brandId,
    location_id: locationId,
    provider: 'meta_social',
    provider_account_id: providerAccountId,
    status: 'active',
    auth_state: 'AUTHORIZED',
    health_status: 'RECOVERING',
    capabilities: { inbound_messages: true, platform },
    updated_at: new Date().toISOString(),
  };

  const result = existing?.[0]?.id
    ? await db.from('provider_connections').update(patch).eq('id', existing[0].id).select('id').single()
    : await db.from('provider_connections').insert(patch).select('id').single();
  if (result.error) return res.status(500).json({ error: 'Could not save the Meta account binding.' });

  return res.status(200).json({ id: result.data.id, providerAccountId, brandId, locationId, status: 'RECOVERING' });
});
