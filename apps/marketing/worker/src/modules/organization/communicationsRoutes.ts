import { Router } from 'express';
import twilio from 'twilio';
import { requirePermission, tenantContextOf } from '../../lib/auth/tenantContext';

export const organizationCommunicationsRouter = Router();

const text = (value: unknown, max = 4000): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = (value: unknown): string | null => typeof value === 'string' && UUID_RE.test(value) ? value : null;

function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

async function resolveSmsFromNumber(db: ReturnType<typeof tenantContextOf>['db'], businessId: string): Promise<string | null> {
  const { data } = await db
    .from('provider_connections')
    .select('provider,provider_account_id,metadata,capabilities,status')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .limit(50);

  for (const row of data ?? []) {
    const provider = String(row.provider ?? '').toLowerCase();
    if (!provider.includes('twilio') && !provider.includes('sms')) continue;
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const capabilities = (row.capabilities ?? {}) as Record<string, unknown>;
    const values = [
      row.provider_account_id,
      metadata.phone_number,
      metadata.from_number,
      metadata.twilio_phone_number,
      metadata.sms_number,
      capabilities.phone_number,
      capabilities.from_number,
    ];
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const normalized = normalizePhone(value);
      if (normalized) return normalized;
    }
  }

  return normalizePhone(process.env.TWILIO_PHONE_NUMBER ?? null);
}

async function customerForCommunication(db: ReturnType<typeof tenantContextOf>['db'], businessId: string, customerId: string) {
  const { data, error } = await db
    .from('customers')
    .select('id,business_id,location_id,name,email,phone,sms_opt_in,sms_consent,email_consent')
    .eq('business_id', businessId)
    .eq('id', customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function audit(
  db: ReturnType<typeof tenantContextOf>['db'],
  userId: string,
  entityId: string,
  action: string,
  afterValue: unknown,
  reason: string,
) {
  const { error } = await db.from('audit_logs').insert({
    entity_type: 'communication',
    entity_id: entityId,
    action,
    user_id: userId,
    before_value: null,
    after_value: afterValue,
    reason,
  });
  if (error) console.warn(`[organization/communications] audit failed for ${action}:`, error.message);
}

organizationCommunicationsRouter.get('/messages', requirePermission('customers.read'), async (req, res) => {
  const { db, businessId } = tenantContextOf(req);
  const requestedCustomerId = req.query.customerId ? uuid(req.query.customerId) : null;
  if (req.query.customerId && !requestedCustomerId) return res.status(400).json({ error: 'customerId must be a valid UUID.' });

  let messageQuery = db
    .from('messages')
    .select('*')
    .eq('business_id', businessId)
    .order('sent_at', { ascending: false })
    .limit(1000);
  if (requestedCustomerId) messageQuery = messageQuery.eq('customer_id', requestedCustomerId);

  const [messages, customers] = await Promise.all([
    messageQuery,
    db.from('customers')
      .select('id,name,email,phone,sms_opt_in,sms_consent,email_consent,location_id,status')
      .eq('business_id', businessId)
      .order('name'),
  ]);
  if (messages.error) return res.status(500).json({ error: messages.error.message });
  if (customers.error) return res.status(500).json({ error: customers.error.message });

  return res.json({ messages: messages.data ?? [], customers: customers.data ?? [] });
});

organizationCommunicationsRouter.post('/send-sms', requirePermission('customers.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const customerId = uuid(req.body?.customer_id);
  const body = text(req.body?.body ?? req.body?.message, 1600);
  if (!customerId || !body) return res.status(400).json({ error: 'Customer and SMS body are required.' });

  const customer = await customerForCommunication(db, businessId, customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found in this business.' });
  if (!customer.sms_opt_in && !customer.sms_consent) return res.status(403).json({ error: 'Customer has not consented to SMS.' });
  const to = normalizePhone(customer.phone);
  if (!to) return res.status(400).json({ error: 'Customer does not have a valid SMS phone number.' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = await resolveSmsFromNumber(db, businessId);
  if (!accountSid || !authToken || !from) return res.status(503).json({ error: 'SMS provider is not configured for this organization.' });

  let providerResponse;
  try {
    providerResponse = await twilio(accountSid, authToken).messages.create({ body, from, to });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Twilio rejected the message.';
    await db.from('integration_error_logs').insert({
      business_id: businessId,
      provider: 'twilio',
      failure_category: 'OUTBOUND_SMS_FAILED',
      error_message: message,
      root_cause: 'Outbound SMS provider request failed.',
      suggested_action: 'Check the Twilio connection, sender number, and recipient consent/number.',
      raw_payload: { customer_id: customerId },
      sanitized_headers: {},
      is_auto_repairable: false,
      is_resolved: false,
    });
    return res.status(502).json({ error: message });
  }

  const now = new Date().toISOString();
  const { data: messageRow, error: persistenceError } = await db.from('messages').insert({
    business_id: businessId,
    location_id: customer.location_id ?? null,
    customer_id: customer.id,
    customer: customer.name || to,
    sender: 'Business',
    content: body,
    body,
    channel: 'sms',
    direction: 'outbound',
    status: 'sent',
    external_id: providerResponse.sid,
    to_address: to,
    sent_at: now,
  }).select('*').single();

  if (persistenceError) {
    await db.from('integration_error_logs').insert({
      business_id: businessId,
      provider: 'twilio',
      failure_category: 'MESSAGE_PERSISTENCE_FAILED',
      error_message: persistenceError.message,
      root_cause: 'Twilio accepted the message but VowOS could not write its communication history row.',
      suggested_action: 'Reconcile the Twilio message SID into the communication history.',
      raw_payload: { message_sid: providerResponse.sid, customer_id: customerId },
      sanitized_headers: {},
      is_auto_repairable: true,
      is_resolved: false,
    });
    return res.status(502).json({ error: 'SMS was accepted by Twilio but VowOS could not persist its history. Reconciliation has been queued.', provider_message_id: providerResponse.sid });
  }

  await audit(db, userId, messageRow.id, 'SMS_SENT', { customer_id: customerId, external_id: providerResponse.sid }, 'Outbound SMS sent from Unified Inbox.');
  return res.status(201).json({ message: messageRow });
});

organizationCommunicationsRouter.post('/send-email', requirePermission('customers.manage'), async (req, res) => {
  const { db, businessId, userId } = tenantContextOf(req);
  const customerId = uuid(req.body?.customer_id);
  const subject = text(req.body?.subject, 300);
  const body = text(req.body?.body, 20_000);
  if (!customerId || !subject || !body) return res.status(400).json({ error: 'Customer, subject, and email body are required.' });

  const customer = await customerForCommunication(db, businessId, customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found in this business.' });
  if (!customer.email_consent) return res.status(403).json({ error: 'Customer has not consented to email.' });
  const to = text(customer.email, 320);
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({ error: 'Customer does not have a valid email address.' });

  const { data: providerData, error: providerError } = await db.functions.invoke('send-message', {
    body: { channel: 'email', to, subject, body },
  });
  if (providerError) {
    await db.from('integration_error_logs').insert({
      business_id: businessId,
      provider: 'email',
      failure_category: 'OUTBOUND_EMAIL_FAILED',
      error_message: providerError.message,
      root_cause: 'The configured send-message email provider rejected the request.',
      suggested_action: 'Check the organization email provider and sender configuration.',
      raw_payload: { customer_id: customerId },
      sanitized_headers: {},
      is_auto_repairable: false,
      is_resolved: false,
    });
    return res.status(502).json({ error: providerError.message });
  }

  const externalId = typeof providerData === 'object' && providerData
    ? String((providerData as Record<string, unknown>).id ?? (providerData as Record<string, unknown>).messageId ?? '') || null
    : null;
  const now = new Date().toISOString();
  const { data: messageRow, error: persistenceError } = await db.from('messages').insert({
    business_id: businessId,
    location_id: customer.location_id ?? null,
    customer_id: customer.id,
    customer: customer.name || to,
    sender: 'Business',
    content: body,
    body,
    subject,
    channel: 'email',
    direction: 'outbound',
    status: 'sent',
    external_id: externalId,
    to_address: to,
    sent_at: now,
  }).select('*').single();
  if (persistenceError) return res.status(500).json({ error: `Email was sent but history persistence failed: ${persistenceError.message}` });

  await audit(db, userId, messageRow.id, 'EMAIL_SENT', { customer_id: customerId, external_id: externalId }, 'Outbound email sent from Unified Inbox.');
  return res.status(201).json({ message: messageRow });
});
