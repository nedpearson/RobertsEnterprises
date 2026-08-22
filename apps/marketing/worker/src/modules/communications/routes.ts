import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import twilio from 'twilio';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const communicationsRouter = Router();

let defaultProdClient: SupabaseClient | null = null;
let defaultDemoClient: SupabaseClient | null = null;

export function getProductionDb(): SupabaseClient {
  if (defaultProdClient) return defaultProdClient;
  const prodUrl = process.env.VITE_SUPABASE_URL || 'https://missing-config.supabase.co';
  const prodKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-service-key';
  defaultProdClient = createClient(prodUrl, prodKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return defaultProdClient;
}

export function getDemoDb(): SupabaseClient {
  if (defaultDemoClient) return defaultDemoClient;
  const demoUrl = process.env.VITE_DEMO_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://missing-config.supabase.co';
  const demoKey = process.env.DEMO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-service-key';
  defaultDemoClient = createClient(demoUrl, demoKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return defaultDemoClient;
}

/** Validates Twilio X-Twilio-Signature against request URL and POST parameters. */
export function validateTwilioWebhookSignature(
  authToken: string,
  signature: string | undefined,
  url: string,
  params: Record<string, unknown>,
): boolean {
  if (!signature || !authToken) return false;

  try {
    if (twilio.validateRequest(authToken, signature, url, params)) return true;
  } catch {
    // Fall through to a constant-time manual comparison.
  }

  try {
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) {
      const value = params[key];
      data += key + (value !== undefined && value !== null ? String(value) : '');
    }
    const expectedSig = crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
    const supplied = Buffer.from(signature, 'utf-8');
    const expected = Buffer.from(expectedSig, 'utf-8');
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  } catch {
    return false;
  }
}

export function normalizePhoneIdentity(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

function phoneCandidates(value: string): string[] {
  const normalized = normalizePhoneIdentity(value);
  const digits = value.replace(/\D/g, '');
  const national10 = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits.length === 10 ? digits : null;
  const candidates = new Set<string>([value, digits]);
  if (normalized) candidates.add(normalized);
  if (national10) {
    candidates.add(national10);
    candidates.add(`${national10.slice(0, 3)}-${national10.slice(3, 6)}-${national10.slice(6)}`);
    candidates.add(`(${national10.slice(0, 3)}) ${national10.slice(3, 6)}-${national10.slice(6)}`);
    candidates.add(`${national10.slice(0, 3)}.${national10.slice(3, 6)}.${national10.slice(6)}`);
  }
  return Array.from(candidates).filter(Boolean);
}

type ProviderConnectionRow = {
  id: string;
  business_id: string | null;
  location_id: string | null;
  provider: string;
  provider_account_id: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  capabilities: Record<string, unknown> | null;
};

type CustomerRow = {
  id: string;
  business_id: string;
  location_id: string | null;
  name: string | null;
  phone: string | null;
};

function connectionNumbers(connection: ProviderConnectionRow): string[] {
  const metadata = connection.metadata || {};
  const capabilities = connection.capabilities || {};
  const values = [
    connection.provider_account_id,
    metadata.phone_number,
    metadata.from_number,
    metadata.twilio_phone_number,
    metadata.sms_number,
    capabilities.phone_number,
    capabilities.from_number,
  ];
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => normalizePhoneIdentity(value))
    .filter((value): value is string => Boolean(value));
}

async function getSmsConnections(db: SupabaseClient): Promise<ProviderConnectionRow[]> {
  const { data, error } = await db
    .from('provider_connections')
    .select('id,business_id,location_id,provider,provider_account_id,status,metadata,capabilities')
    .eq('status', 'active')
    .limit(1000);

  if (error) {
    console.warn('[Communications] Unable to load provider connections for SMS routing:', error.message);
    return [];
  }

  return ((data || []) as ProviderConnectionRow[]).filter((row) => {
    const provider = String(row.provider || '').toLowerCase();
    return provider.includes('twilio') || provider.includes('sms');
  });
}

async function resolveDestinationScope(
  db: SupabaseClient,
  toPhone?: string,
): Promise<{ businessId: string; locationId: string | null } | null> {
  const normalizedTo = normalizePhoneIdentity(toPhone);
  if (!normalizedTo) return null;

  const matching = (await getSmsConnections(db)).filter((connection) =>
    connectionNumbers(connection).includes(normalizedTo),
  );

  const businessIds = Array.from(new Set(matching.map((row) => row.business_id).filter((id): id is string => Boolean(id))));
  if (businessIds.length !== 1) return null;

  const businessId = businessIds[0];
  const locations = Array.from(
    new Set(
      matching
        .filter((row) => row.business_id === businessId)
        .map((row) => row.location_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  return { businessId, locationId: locations.length === 1 ? locations[0] : null };
}

async function queryCustomerMatches(
  db: SupabaseClient,
  fromPhone: string,
  businessId?: string,
): Promise<CustomerRow[]> {
  let query = db
    .from('customers')
    .select('id,business_id,location_id,name,phone')
    .in('phone', phoneCandidates(fromPhone))
    .limit(20);
  if (businessId) query = query.eq('business_id', businessId);

  const { data, error } = await query;
  if (error) throw new Error(`Customer phone lookup failed: ${error.message}`);
  if (data?.length) return data as CustomerRow[];

  const normalized = normalizePhoneIdentity(fromPhone);
  const national10 = normalized?.startsWith('+1') ? normalized.slice(2) : null;
  if (!national10) return [];

  let fallback = db
    .from('customers')
    .select('id,business_id,location_id,name,phone')
    .ilike('phone', `%${national10}%`)
    .limit(20);
  if (businessId) fallback = fallback.eq('business_id', businessId);

  const { data: fallbackData, error: fallbackError } = await fallback;
  if (fallbackError) throw new Error(`Customer fallback phone lookup failed: ${fallbackError.message}`);
  return (fallbackData || []) as CustomerRow[];
}

/**
 * Resolves inbound SMS without ever guessing a tenant.
 *
 * Precedence:
 * 1. Destination Twilio/SMS connection -> organization/location scope.
 * 2. Customer phone inside that scope.
 * 3. If destination is not configured, customer phone may identify a tenant only
 *    when every match belongs to exactly one organization.
 * 4. Ambiguous/unmatched events return businessId=null and are quarantined.
 */
export async function resolveCustomerAndBusiness(
  db: SupabaseClient,
  fromPhone: string,
  toPhone?: string,
): Promise<{
  customerId: string | null;
  customerName: string;
  businessId: string | null;
  locationId: string | null;
  routing: 'DESTINATION_CONNECTION' | 'UNIQUE_CUSTOMER' | 'UNRESOLVED';
}> {
  const destination = await resolveDestinationScope(db, toPhone);

  if (destination) {
    const scopedCustomers = await queryCustomerMatches(db, fromPhone, destination.businessId);
    const customer = scopedCustomers[0] || null;
    return {
      customerId: customer?.id || null,
      customerName: customer?.name || fromPhone,
      businessId: destination.businessId,
      locationId: customer?.location_id || destination.locationId,
      routing: 'DESTINATION_CONNECTION',
    };
  }

  const customers = await queryCustomerMatches(db, fromPhone);
  const businessIds = Array.from(new Set(customers.map((customer) => customer.business_id).filter(Boolean)));
  if (businessIds.length === 1) {
    const customer = customers[0];
    return {
      customerId: customer?.id || null,
      customerName: customer?.name || fromPhone,
      businessId: businessIds[0],
      locationId: customer?.location_id || null,
      routing: 'UNIQUE_CUSTOMER',
    };
  }

  return {
    customerId: null,
    customerName: fromPhone,
    businessId: null,
    locationId: null,
    routing: 'UNRESOLVED',
  };
}

async function quarantineInboundSms(
  db: SupabaseClient,
  details: { from?: string; to?: string; messageSid?: string; reason: string },
): Promise<void> {
  const hash = (value?: string) => value ? crypto.createHash('sha256').update(value).digest('hex').slice(0, 20) : null;
  const { error } = await db.from('integration_error_logs').insert({
    provider: 'twilio',
    failure_category: 'INBOUND_TENANT_UNRESOLVED',
    error_message: details.reason,
    root_cause: 'Inbound message could not be mapped to exactly one organization.',
    suggested_action: 'Map the receiving Twilio number to the correct provider connection or resolve duplicate customer phone records.',
    raw_payload: {
      message_sid: details.messageSid || null,
      from_hash: hash(details.from),
      to_hash: hash(details.to),
    },
    sanitized_headers: {},
    is_auto_repairable: false,
    is_resolved: false,
  });
  if (error) console.error('[Communications] Failed to record quarantined inbound SMS:', error.message);
}

async function resolveOutboundNumber(db: SupabaseClient, businessId: string): Promise<string | null> {
  const connections = (await getSmsConnections(db)).filter((row) => row.business_id === businessId);
  for (const connection of connections) {
    const number = connectionNumbers(connection)[0];
    if (number) return number;
  }
  return normalizePhoneIdentity(process.env.TWILIO_PHONE_NUMBER || null);
}

/** Authentication middleware for outbound communications endpoints. */
export async function requireCommunicationsAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in required.' });

  const isDemo = req.headers['x-data-plane'] === 'demo';
  const db = (req as Request & { context?: { db?: SupabaseClient } }).context?.db || (isDemo ? getDemoDb() : getProductionDb());
  const token = authHeader.slice('Bearer '.length).trim();

  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired session.' });

  const { data: memberships, error: membershipError } = await db
    .from('business_memberships')
    .select('business_id, role, status')
    .eq('user_id', data.user.id)
    .eq('status', 'ACTIVE')
    .limit(20);
  if (membershipError) return res.status(500).json({ error: 'Unable to resolve your organization membership.' });

  const claimedBusinessId = typeof req.body?.businessId === 'string' ? req.body.businessId : null;
  const membership = claimedBusinessId
    ? memberships?.find((row) => row.business_id === claimedBusinessId)
    : memberships?.length === 1
      ? memberships[0]
      : null;

  if (!membership) {
    return res.status(403).json({
      error: claimedBusinessId
        ? 'Requested organization does not match an active membership.'
        : 'Select an organization before sending communications.',
    });
  }

  const allowedRoles = ['OWNER', 'ADMIN', 'ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'STAFF', 'EMPLOYEE', 'STYLIST'];
  const userRole = String(membership.role || '').toUpperCase();
  if (!allowedRoles.includes(userRole)) return res.status(403).json({ error: 'Insufficient permissions to send communications.' });

  (req as Request & { authContext?: unknown }).authContext = {
    userId: data.user.id,
    businessId: membership.business_id,
    role: userRole,
    db,
  };
  next();
}

type CommunicationsAuthContext = {
  userId: string;
  businessId: string;
  role: string;
  db: SupabaseClient;
};

communicationsRouter.post('/send-sms', requireCommunicationsAuth, async (req, res) => {
  try {
    const { customerId } = req.body || {};
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const authCtx = (req as Request & { authContext?: CommunicationsAuthContext }).authContext;
    if (!authCtx) return res.status(401).json({ error: 'Sign in required.' });
    const { db, businessId } = authCtx;

    if (!customerId || !message) return res.status(400).json({ error: 'Customer and message are required.' });
    if (message.length > 1600) return res.status(400).json({ error: 'SMS message is too long.' });

    const { data: customer, error: customerErr } = await db
      .from('customers')
      .select('id, name, phone, sms_opt_in, business_id, location_id')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (customerErr || !customer) return res.status(404).json({ error: 'Customer not found in this organization.' });
    if (!customer.sms_opt_in) return res.status(403).json({ error: 'Customer has not opted in to SMS.' });
    if (!customer.phone) return res.status(400).json({ error: 'Customer does not have a phone number.' });

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = await resolveOutboundNumber(db, businessId);
    if (!twilioSid || !twilioAuth || !twilioFrom) {
      return res.status(503).json({ error: 'SMS is not configured for this organization.' });
    }

    const client = twilio(twilioSid, twilioAuth);
    const twilioResponse = await client.messages.create({ body: message, from: twilioFrom, to: customer.phone });

    const { error: persistenceError } = await db.from('messages').insert({
      business_id: businessId,
      location_id: customer.location_id || null,
      customer_id: customerId,
      customer: customer.name || customer.phone,
      sender: 'Business',
      content: message,
      body: message,
      channel: 'sms',
      direction: 'outbound',
      status: 'sent',
      external_id: twilioResponse.sid,
      to_address: customer.phone,
      sent_at: new Date().toISOString(),
    });

    if (persistenceError) {
      console.error('[Communications] SMS sent but message history persistence failed:', persistenceError.message);
      await db.from('integration_error_logs').insert({
        business_id: businessId,
        provider: 'twilio',
        failure_category: 'MESSAGE_PERSISTENCE_FAILED',
        error_message: persistenceError.message,
        root_cause: 'Twilio accepted an outbound message but VowOS could not persist the communication record.',
        suggested_action: 'Reconcile the Twilio message SID into the communication history.',
        raw_payload: { message_sid: twilioResponse.sid },
        sanitized_headers: {},
        is_auto_repairable: true,
        is_resolved: false,
      });
    }

    return res.json({
      success: true,
      messageId: twilioResponse.sid,
      persistenceWarning: persistenceError ? 'Message sent; communication history is pending reconciliation.' : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to send SMS.';
    console.error('Send SMS error:', err);
    return res.status(500).json({ error: message });
  }
});

communicationsRouter.post('/twilio-webhook', async (req, res) => {
  try {
    const isDemo = req.headers['x-data-plane'] === 'demo';
    const db = (req as Request & { context?: { db?: SupabaseClient } }).context?.db || (isDemo ? getDemoDb() : getProductionDb());
    const { From, To, Body, MessageSid } = req.body || {};

    if (!From || !Body) return res.status(400).send('Bad Request');

    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    if (twilioAuthToken) {
      const signature = req.headers['x-twilio-signature'] as string | undefined;
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost';
      const requestUrl = process.env.TWILIO_WEBHOOK_URL || `${proto}://${host}${req.originalUrl || req.url}`;
      if (!validateTwilioWebhookSignature(twilioAuthToken, signature, requestUrl, req.body)) {
        console.warn(`[Twilio Webhook] Invalid signature for inbound message ${MessageSid || 'without SID'}`);
        return res.status(401).send('Unauthorized: Invalid Twilio Signature');
      }
    }

    if (MessageSid) {
      const { data: existing } = await db.from('messages').select('id').eq('external_id', MessageSid).maybeSingle();
      if (existing) {
        res.type('text/xml');
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }
    }

    const resolved = await resolveCustomerAndBusiness(db, From, To);
    if (!resolved.businessId) {
      await quarantineInboundSms(db, {
        from: From,
        to: To,
        messageSid: MessageSid,
        reason: 'Inbound SMS was not assigned because tenant routing was ambiguous or unconfigured.',
      });
      res.type('text/xml');
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const { error: insertError } = await db.from('messages').insert({
      business_id: resolved.businessId,
      location_id: resolved.locationId,
      customer_id: resolved.customerId,
      customer: resolved.customerName,
      sender: resolved.customerName || 'Customer',
      content: Body,
      body: Body,
      channel: 'sms',
      direction: 'inbound',
      status: 'received',
      external_id: MessageSid || null,
      to_address: To || null,
      sent_at: new Date().toISOString(),
    });
    if (insertError) throw new Error(`Inbound SMS persistence failed: ${insertError.message}`);

    res.type('text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown inbound SMS error';
    console.error('Twilio Webhook error:', message);
    return res.status(500).send('Internal Server Error');
  }
});
