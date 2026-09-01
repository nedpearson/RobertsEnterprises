import type { SupabaseClient } from '@supabase/supabase-js';
import twilio from 'twilio';

interface DurableAutomationJob {
  id: string;
  business_id?: string | null;
  payload: Record<string, any>;
}

const CANCELLED_STATUSES = new Set(['CANCELLED', 'CANCELED', 'VOID', 'DELETED']);

function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

async function resolveSmsFromNumber(db: SupabaseClient, businessId: string): Promise<string | null> {
  const { data, error } = await db
    .from('provider_connections')
    .select('provider,provider_account_id,metadata,capabilities,status')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .limit(50);
  if (error) throw new Error(`SMS connection lookup failed: ${error.message}`);

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

function replaceToken(template: string, key: string, value: string): string {
  return template.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value);
}

function renderTemplate(
  template: string,
  context: Record<string, string>,
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(context)) rendered = replaceToken(rendered, key, value);
  return rendered;
}

function formatterParts(date: Date, timezone: string) {
  const dateText = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timeText = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return { dateText, timeText };
}

async function markDelivery(
  db: SupabaseClient,
  businessId: string,
  deliveryId: string,
  status: 'SENT' | 'FAILED' | 'SKIPPED',
  errorMessage: string | null,
) {
  const payload: Record<string, unknown> = {
    status,
    error_message: errorMessage,
  };
  if (status === 'SENT') payload.sent_at = new Date().toISOString();
  const { error } = await db
    .from('communication_automation_deliveries')
    .update(payload)
    .eq('business_id', businessId)
    .eq('id', deliveryId);
  if (error) console.warn('[appointment-automation] delivery status update failed:', error.message);
}

async function moduleStillEnabled(db: SupabaseClient, businessId: string): Promise<boolean> {
  const { data, error } = await db
    .from('organization_module_preferences')
    .select('module_id,is_enabled')
    .eq('business_id', businessId)
    .in('module_id', ['communications.core', 'communications.automations']);
  if (error) throw new Error(`Module preference lookup failed: ${error.message}`);
  return !(data ?? []).some((row: any) => row.is_enabled === false);
}

export async function handleAppointmentAutomationDelivery(
  job: DurableAutomationJob,
  db: SupabaseClient,
): Promise<Record<string, unknown>> {
  const deliveryId = typeof job.payload?.delivery_id === 'string' ? job.payload.delivery_id : '';
  const businessId = typeof job.business_id === 'string' ? job.business_id : '';
  if (!deliveryId || !businessId) throw new Error('Automation delivery job is missing its business or delivery id.');

  const { data: delivery, error: deliveryError } = await db
    .from('communication_automation_deliveries')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', deliveryId)
    .maybeSingle();
  if (deliveryError) throw new Error(`Automation delivery lookup failed: ${deliveryError.message}`);
  if (!delivery) throw new Error('Automation delivery no longer exists.');
  if (delivery.status === 'SENT' || delivery.status === 'SKIPPED') {
    return { success: true, idempotent: true, deliveryId, status: delivery.status };
  }

  if (!(await moduleStillEnabled(db, businessId))) {
    await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Workspace automation module is disabled.');
    return { success: true, skipped: true, reason: 'MODULE_DISABLED' };
  }

  const [{ data: rule, error: ruleError }, { data: appointment, error: appointmentError }] = await Promise.all([
    db.from('communication_automation_rules').select('*').eq('business_id', businessId).eq('id', delivery.rule_id).maybeSingle(),
    db.from('appointments').select('id,business_id,location_id,customer_id,start_at,end_at,status,type,stylist').eq('business_id', businessId).eq('id', delivery.appointment_id).maybeSingle(),
  ]);
  if (ruleError) throw new Error(`Automation rule lookup failed: ${ruleError.message}`);
  if (appointmentError) throw new Error(`Automation appointment lookup failed: ${appointmentError.message}`);
  if (!rule || !rule.enabled) {
    await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Automation rule is disabled or deleted.');
    return { success: true, skipped: true, reason: 'RULE_DISABLED' };
  }
  if (!appointment) {
    await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Appointment no longer exists.');
    return { success: true, skipped: true, reason: 'APPOINTMENT_MISSING' };
  }
  if (CANCELLED_STATUSES.has(String(appointment.status ?? '').toUpperCase())) {
    await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Appointment was cancelled before delivery.');
    return { success: true, skipped: true, reason: 'APPOINTMENT_CANCELLED' };
  }
  if (!appointment.customer_id) {
    await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Appointment is not linked to a customer.');
    return { success: true, skipped: true, reason: 'CUSTOMER_NOT_LINKED' };
  }

  const [{ data: customer, error: customerError }, { data: business }, locationResult] = await Promise.all([
    db.from('customers').select('id,business_id,location_id,name,email,phone,sms_opt_in,sms_consent,email_consent').eq('business_id', businessId).eq('id', appointment.customer_id).maybeSingle(),
    db.from('businesses').select('id,name,timezone').eq('id', businessId).maybeSingle(),
    appointment.location_id
      ? db.from('locations').select('id,name,timezone').eq('business_id', businessId).eq('id', appointment.location_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (customerError) throw new Error(`Automation customer lookup failed: ${customerError.message}`);
  if (!customer) {
    await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Customer no longer exists.');
    return { success: true, skipped: true, reason: 'CUSTOMER_MISSING' };
  }
  if (locationResult.error) throw new Error(`Automation location lookup failed: ${locationResult.error.message}`);

  const start = new Date(appointment.start_at);
  const timezone = String(locationResult.data?.timezone || business?.timezone || 'UTC');
  let formatted;
  try {
    formatted = formatterParts(start, timezone);
  } catch {
    formatted = formatterParts(start, 'UTC');
  }
  const context = {
    customer_name: String(customer.name || 'there'),
    appointment_date: formatted.dateText,
    appointment_time: formatted.timeText,
    appointment_type: String(appointment.type || 'appointment'),
    stylist_name: String(appointment.stylist || ''),
    location_name: String(locationResult.data?.name || business?.name || ''),
    business_name: String(business?.name || ''),
  };
  const body = renderTemplate(String(rule.template_body || ''), context).trim();
  const subject = renderTemplate(String(rule.template_subject || 'Appointment update'), context).trim();
  if (!body) {
    await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Automation template body is empty.');
    return { success: true, skipped: true, reason: 'EMPTY_TEMPLATE' };
  }

  let toAddress = '';
  let externalId: string | null = null;
  try {
    if (rule.channel === 'SMS') {
      if (!customer.sms_opt_in && !customer.sms_consent) {
        await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Customer has not consented to SMS.');
        return { success: true, skipped: true, reason: 'SMS_NOT_CONSENTED' };
      }
      const to = normalizePhone(customer.phone);
      if (!to) {
        await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Customer does not have a valid SMS phone number.');
        return { success: true, skipped: true, reason: 'SMS_ADDRESS_MISSING' };
      }
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = await resolveSmsFromNumber(db, businessId);
      if (!accountSid || !authToken || !from) throw new Error('SMS provider is not configured for this organization.');
      const response = await twilio(accountSid, authToken).messages.create({ body, from, to });
      externalId = response.sid;
      toAddress = to;
    } else if (rule.channel === 'EMAIL') {
      if (!customer.email_consent) {
        await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Customer has not consented to email.');
        return { success: true, skipped: true, reason: 'EMAIL_NOT_CONSENTED' };
      }
      const to = String(customer.email || '').trim();
      if (!/^\S+@\S+\.\S+$/.test(to)) {
        await markDelivery(db, businessId, deliveryId, 'SKIPPED', 'Customer does not have a valid email address.');
        return { success: true, skipped: true, reason: 'EMAIL_ADDRESS_MISSING' };
      }
      const { data, error } = await db.functions.invoke('send-message', {
        body: { channel: 'email', to, subject, body },
      });
      if (error) throw new Error(error.message);
      if (data && typeof data === 'object') {
        externalId = String((data as Record<string, unknown>).id ?? (data as Record<string, unknown>).messageId ?? '') || null;
      }
      toAddress = to;
    } else {
      throw new Error(`Unsupported automation channel: ${String(rule.channel)}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markDelivery(db, businessId, deliveryId, 'FAILED', message.slice(0, 2000));
    throw error;
  }

  const now = new Date().toISOString();
  const { error: messageError } = await db.from('messages').insert({
    business_id: businessId,
    location_id: appointment.location_id ?? customer.location_id ?? null,
    customer_id: customer.id,
    customer: customer.name || toAddress,
    sender: 'VowOS Automation',
    content: body,
    body,
    subject: rule.channel === 'EMAIL' ? subject : null,
    kind: rule.rule_type === 'APPOINTMENT_REMINDER' ? 'reminder' : 'follow_up',
    channel: String(rule.channel).toLowerCase(),
    direction: 'outbound',
    status: 'sent',
    external_id: externalId,
    to_address: toAddress,
    sent_at: now,
  });
  if (messageError) {
    const message = `Provider delivery succeeded but message history failed: ${messageError.message}`;
    await markDelivery(db, businessId, deliveryId, 'FAILED', message.slice(0, 2000));
    throw new Error(message);
  }

  await markDelivery(db, businessId, deliveryId, 'SENT', null);
  return {
    success: true,
    deliveryId,
    channel: rule.channel,
    customerId: customer.id,
    externalId,
  };
}
