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

/**
 * Validates Twilio X-Twilio-Signature against request URL and POST parameters.
 */
export function validateTwilioWebhookSignature(
  authToken: string,
  signature: string | undefined,
  url: string,
  params: Record<string, any>
): boolean {
  if (!signature || !authToken) return false;

  // Use Twilio SDK validateRequest or manual HMAC-SHA1
  try {
    if (twilio.validateRequest(authToken, signature, url, params)) {
      return true;
    }
  } catch {
    // Fall through to manual constant-time comparison
  }

  try {
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) {
      data += key + (params[key] !== undefined && params[key] !== null ? String(params[key]) : '');
    }

    const hmac = crypto.createHmac('sha1', authToken);
    hmac.update(Buffer.from(data, 'utf-8'));
    const expectedSig = hmac.digest('base64');

    const bufA = Buffer.from(signature, 'utf-8');
    const bufB = Buffer.from(expectedSig, 'utf-8');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Normalizes phone numbers and resolves customer & business records from database.
 */
export async function resolveCustomerAndBusiness(
  db: any,
  fromPhone: string,
  toPhone?: string
): Promise<{
  customerId: string | null;
  customerName: string;
  businessId: string;
  locationId: string | null;
}> {
  const rawDigits = fromPhone.replace(/\D/g, '');
  const national10 =
    rawDigits.length === 11 && rawDigits.startsWith('1')
      ? rawDigits.slice(1)
      : rawDigits.length === 10
      ? rawDigits
      : null;

  const candidates = new Set<string>([fromPhone, `+${rawDigits}`, rawDigits]);
  if (national10) {
    candidates.add(national10);
    candidates.add(`${national10.slice(0, 3)}-${national10.slice(3, 6)}-${national10.slice(6)}`);
    candidates.add(`(${national10.slice(0, 3)}) ${national10.slice(3, 6)}-${national10.slice(6)}`);
    candidates.add(`${national10.slice(0, 3)}.${national10.slice(3, 6)}.${national10.slice(6)}`);
  }

  // 1. Search customers table
  const candidateArray = Array.from(candidates);
  let customer: any = null;

  const { data: matchedCustomers } = await db
    .from('customers')
    .select('id, business_id, location_id, name, phone')
    .in('phone', candidateArray)
    .limit(1);

  if (matchedCustomers && matchedCustomers.length > 0) {
    customer = matchedCustomers[0];
  } else if (national10) {
    // Fallback ILIKE search on 10 digits
    const { data: ilikeCustomers } = await db
      .from('customers')
      .select('id, business_id, location_id, name, phone')
      .ilike('phone', `%${national10}%`)
      .limit(1);
    if (ilikeCustomers && ilikeCustomers.length > 0) {
      customer = ilikeCustomers[0];
    }
  }

  if (customer) {
    return {
      customerId: customer.id,
      customerName: customer.name || fromPhone,
      businessId: customer.business_id,
      locationId: customer.location_id || null
    };
  }

  // 2. Unmatched phone fallback: Resolve real business UUID from businesses table (never dummy string)
  const { data: defaultBiz } = await db
    .from('businesses')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const businessId = defaultBiz?.id || '00000000-0000-0000-0000-000000000001';

  return {
    customerId: null,
    customerName: fromPhone,
    businessId,
    locationId: null
  };
}

/**
 * Authentication middleware for outbound communications endpoints.
 */
export async function requireCommunicationsAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in required.' });
  }

  const isDemo = req.headers['x-data-plane'] === 'demo';
  const db = (req as any).context?.db || (isDemo ? getDemoDb() : getProductionDb());
  const token = authHeader.slice('Bearer '.length).trim();

  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  const { data: membership } = await db
    .from('business_memberships')
    .select('business_id, role, status')
    .eq('user_id', data.user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!membership) {
    return res.status(403).json({ error: 'No active business membership for this account.' });
  }

  const allowedRoles = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'EMPLOYEE', 'STYLIST'];
  const userRole = (membership.role || '').toUpperCase();
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: 'Insufficient permissions to send communications.' });
  }

  const claimedBusinessId = req.body?.businessId;
  if (claimedBusinessId && claimedBusinessId !== membership.business_id) {
    return res.status(403).json({ error: 'Requested business does not match your membership.' });
  }

  (req as any).authContext = {
    userId: data.user.id,
    businessId: membership.business_id,
    role: userRole,
    db
  };
  next();
}

// Endpoint for sending outbound SMS (Secured with auth)
communicationsRouter.post('/send-sms', requireCommunicationsAuth, async (req, res) => {
  try {
    const { customerId, message, businessId } = req.body;
    const authCtx = (req as any).authContext;
    const db = authCtx?.db || (req as any).context?.db || getProductionDb();

    if (!customerId || !message || !businessId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1) Verify customer & smsOptIn
    const { data: customer, error: customerErr } = await db
      .from('customers')
      .select('id, name, phone, sms_opt_in, business_id, location_id')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (customerErr || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!customer.sms_opt_in) {
      return res.status(403).json({ error: 'Customer has not opted in to SMS' });
    }

    if (!customer.phone) {
      return res.status(400).json({ error: 'Customer does not have a phone number' });
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioSid || !twilioAuth || !twilioFrom) {
      return res.status(500).json({ error: 'Twilio is not configured' });
    }

    const client = twilio(twilioSid, twilioAuth);

    // 2) Send via Twilio
    const twilioResponse = await client.messages.create({
      body: message,
      from: twilioFrom,
      to: customer.phone,
    });

    // 3) Log in messages table with canonical Milestone 1 schema
    await db.from('messages').insert({
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
      sent_at: new Date().toISOString()
    });

    res.json({ success: true, messageId: twilioResponse.sid });
  } catch (err: any) {
    console.error('Send SMS error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Inbound webhook for Twilio
communicationsRouter.post('/twilio-webhook', async (req, res) => {
  try {
    const isDemo = req.headers['x-data-plane'] === 'demo';
    const db = (req as any).context?.db || (isDemo ? getDemoDb() : getProductionDb());

    const { From, To, Body, MessageSid } = req.body || {};

    if (!From || !Body) {
      return res.status(400).send('Bad Request');
    }

    // 1) Validate Twilio Signature if configured
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    if (twilioAuthToken) {
      const signature = req.headers['x-twilio-signature'] as string | undefined;
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost';
      const requestUrl = process.env.TWILIO_WEBHOOK_URL || `${proto}://${host}${req.originalUrl || req.url}`;

      const isValid = validateTwilioWebhookSignature(twilioAuthToken, signature, requestUrl, req.body);
      if (!isValid) {
        console.warn(`[Twilio Webhook] Invalid signature from ${From}`);
        return res.status(401).send('Unauthorized: Invalid Twilio Signature');
      }
    }

    // 2) Idempotency Check: Don't duplicate message if MessageSid was already inserted
    if (MessageSid) {
      const { data: existing } = await db
        .from('messages')
        .select('id')
        .eq('external_id', MessageSid)
        .maybeSingle();

      if (existing) {
        res.type('text/xml');
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }
    }

    // 3) Resolve customer, location, and business ID
    const { customerId, customerName, businessId, locationId } = await resolveCustomerAndBusiness(
      db,
      From,
      To
    );

    // 4) Insert inbound message with canonical schema
    await db.from('messages').insert({
      business_id: businessId,
      location_id: locationId,
      customer_id: customerId,
      customer: customerName,
      sender: customerName || 'Customer',
      content: Body,
      body: Body,
      channel: 'sms',
      direction: 'inbound',
      status: 'received',
      external_id: MessageSid || null,
      to_address: To || null,
      sent_at: new Date().toISOString()
    });

    res.type('text/xml');
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (err: any) {
    console.error('Twilio Webhook error:', err);
    res.status(500).send('Internal Server Error');
  }
});
