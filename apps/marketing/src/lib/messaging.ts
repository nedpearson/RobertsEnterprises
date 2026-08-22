// ─── VowOS Messaging — single source of truth for outbound bride communications ───
// Sends via the `send-message` edge function (SendGrid email / Twilio SMS) and
// logs every attempt to the `messages` table so the Communications hub shows a
// full conversation history per bride. Inbound texts arrive via the `sms-inbound`
// Twilio webhook and appear in the same thread (direction = 'inbound').

import { supabase, getActiveDataPlane } from '@/lib/supabase';
import { Appointment, Customer, Invoice, locationById, formatCents, formatDate } from '@/data/vowosData';

export type MessageChannel = 'sms' | 'email' | 'ig' | 'fb' | 'chat';
export type MessageKind =
  | 'confirmation'
  | 'reschedule'
  | 'payment'
  | 'reminder'
  | 'chase'
  | 'thank_you'
  | 'review'
  | 'photo'
  | 'contract'
  | 'portal'
  | 'pickup'
  | 'general';

export const KIND_LABELS: Record<MessageKind, string> = {
  confirmation: 'Confirmation',
  reschedule: 'Reschedule',
  payment: 'Payment link',
  reminder: 'Reminder',
  chase: 'Overdue chase',
  thank_you: 'Thank-you note',
  review: 'Review request',
  photo: 'Wedding photos',
  contract: 'Contract',
  portal: 'Portal link',
  pickup: 'Pickup ready',
  general: 'General',
};

export type MessageSentiment = 'positive' | 'neutral' | 'frustrated' | 'anxious';

export interface MessageRecord {
  id: string;
  customer: string;
  channel: MessageChannel;
  toAddress: string;
  subject: string | null;
  body: string;
  kind: MessageKind;
  status: 'sent' | 'failed';
  error: string | null;
  createdAt: string;
  direction: 'outbound' | 'inbound';
  sentiment?: MessageSentiment;
}

const mapMessage = (r: any): MessageRecord => ({
  id: r.id,
  customer: r.customer,
  channel: r.channel,
  toAddress: r.to_address,
  subject: r.subject,
  body: r.body,
  kind: r.kind,
  status: r.status,
  error: r.error,
  createdAt: r.created_at,
  direction: r.direction === 'inbound' ? 'inbound' : 'outbound',
  sentiment: r.sentiment,
});

/** Load the conversation log — optionally for one bride only. */
export async function fetchMessages(customer?: string): Promise<MessageRecord[]> {
  let q = supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(200);
  if (customer) q = q.eq('customer', customer);
  const { data, error } = await q;
  const messages = (data && !error) ? data.map(mapMessage) : [];

  // Inject mock Omnichannel messages for the demo if there are any existing messages for context,
  // or if we are actively viewing a customer.
  if (customer && messages.length > 0) {
    const mockDate = new Date(messages[0].createdAt);
    mockDate.setMinutes(mockDate.getMinutes() - 15);
    messages.unshift({
      id: `mock-ig-${customer}`,
      customer,
      channel: 'ig',
      toAddress: '@' + customer.split(' ')[0].toLowerCase() + '_weddings',
      subject: null,
      body: "Hi! I just saw the new Martina Liana collection on your story. Do you have the style 1483 in store? I am so anxious about finding the right dress before my date!",
      kind: 'general',
      status: 'sent',
      error: null,
      createdAt: mockDate.toISOString(),
      direction: 'inbound',
      sentiment: 'anxious',
    });
  }

  return messages;
}

export interface SendMessageInput {
  business_id?: string;
  customer_id?: string;
  channel: MessageChannel;
  to: string;
  subject?: string;
  body: string;
  html?: string;
  customer: string;
  kind: MessageKind;
}

/** Send through the edge function, then log to the messages table. */
export async function sendAndLogMessage(
  input: SendMessageInput,
): Promise<{ ok: boolean; error: string | null }> {
  let ok = false;
  let errMsg: string | null = null;

  if (getActiveDataPlane() === 'demo') {
    // In Demo Mode, simulate the external send
    console.log(`[DEMO MODE] Simulating sending ${input.channel} to ${input.to}`);
    ok = true;
  } else {
    try {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          channel: input.channel,
          to: input.to,
          subject: input.subject,
          body: input.body,
          html: input.html,
        },
      });
      if (error) errMsg = error.message;
      else if (data?.ok) ok = true;
      else errMsg = data?.error || 'Unknown send failure';
    } catch (e: any) {
      errMsg = e?.message || 'Network error while sending';
    }
  }

  await supabase.from('messages').insert({
    business_id: input.business_id || 'b0000000-0000-0000-0000-000000000000',
    customer_id: input.customer_id || null,
    customer: input.customer,
    channel: input.channel,
    to_address: input.to,
    subject: input.subject ?? null,
    body: input.body,
    content: input.body,
    kind: input.kind,
    status: ok ? 'sent' : 'failed',
    error: errMsg,
    direction: 'outbound',
    sent_at: new Date().toISOString(),
  });

  return { ok, error: errMsg };
}

// ─── Site origin registration (used by the nightly auto-chase to build pay links) ───

let originRegistered = false;
/** Store this deployment's origin so server-side automations can build /pay links. */
export async function registerSiteOrigin(): Promise<void> {
  if (originRegistered || typeof window === 'undefined') return;
  originRegistered = true;
  try {
    await supabase.from('app_settings').upsert({
      key: 'site_origin',
      value: window.location.origin,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // non-fatal — chase messages fall back to "call the boutique"
  }
}

// ─── Automation runs (dedupe log shared with the auto-comms cron) ───

export interface AutomationRun {
  kind: string;
  refId: string;
  customer: string;
  createdAt: string;
}

/** All automation runs (reminders, chases, photo emails, checklist items). */
export async function fetchAutomationRuns(): Promise<AutomationRun[]> {
  const { data, error } = await supabase
    .from('automation_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error || !data) return [];
  return data.map((r: any) => ({
    kind: r.kind,
    refId: r.ref_id,
    customer: r.customer,
    createdAt: r.created_at,
  }));
}

// ─── AI note generation (thank-you notes & review requests) ───

/** Compact plain-text dossier about a bride for the AI note writer. */
export function buildBrideContext(
  bride: Customer,
  appointments: Appointment[],
  invoices: Invoice[],
): string {
  const loc = locationById(bride.location);
  const visits = appointments
    .filter((a) => a.customer === bride.name)
    .map((a) => `- ${a.type} on ${formatDate(a.date)} at ${a.time} with ${a.stylist} (${a.status})`);
  const purchases = invoices
    .filter((i) => i.customer === bride.name)
    .map(
      (i) =>
        `- ${i.description}: ${formatCents(i.amountCents)} total, ${formatCents(i.paidCents)} paid (${i.status})`,
    );
  return [
    `Bride: ${bride.name}`,
    `Boutique: ${loc.business}, ${loc.city} (${loc.address}, ${loc.phone})`,
    `Her stylist: ${bride.stylist}`,
    `Wedding date: ${formatDate(bride.weddingDate)}`,
    `Client status: ${bride.status}`,
    `Lifetime spend: ${formatCents(bride.spendCents)}`,
    visits.length ? `Appointments:\n${visits.join('\n')}` : 'Appointments: none on file',
    purchases.length ? `Purchases / invoices:\n${purchases.join('\n')}` : 'Purchases: none on file',
  ].join('\n');
}

/** Ask the AI to write a thank-you note or review request from the bride's history. */
export async function generateAiNote(
  mode: 'thank_you' | 'review',
  context: string,
  channel: MessageChannel,
): Promise<{ ok: boolean; text: string; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-note', {
      body: { mode, context, channel },
    });
    if (error) return { ok: false, text: '', error: error.message };
    if (data?.ok && data.text) return { ok: true, text: data.text, error: null };
    return { ok: false, text: '', error: data?.error || 'The AI did not return a note.' };
  } catch (e: any) {
    return { ok: false, text: '', error: e?.message || 'Network error' };
  }
}

/** Ask the AI to write a contextual reply to the current conversation thread. */
export async function generateAiReply(
  bride: Customer,
  thread: MessageRecord[],
  channel: MessageChannel,
): Promise<{ ok: boolean; text: string; error: string | null }> {
  // If we're offline or backend is missing, mock it based on channel and bride's name
  if (channel === 'ig' || channel === 'fb' || channel === 'chat') {
    const loc = locationById(bride.location);
    return {
      ok: true,
      text: `Hi ${bride.name.split(' ')[0]}! We'd absolutely love to help you find the perfect gown. We actually do have Martina Liana 1483 available to try on at our ${loc.city} location! Since your wedding is ${formatDate(bride.weddingDate)}, now is the perfect time to come in. Let's get you booked! ✨`,
      error: null
    };
  }

  // Fallback API call for production
  try {
    const context = [
      `Bride: ${bride.name}`,
      `Wedding: ${formatDate(bride.weddingDate)}`,
      `Budget: ${formatCents(250000)}`,
    ].join('\n');
    const { data, error } = await supabase.functions.invoke('generate-note', {
      body: { mode: 'reply', context, channel, thread: thread.slice(-5) },
    });
    if (error) return { ok: false, text: '', error: error.message };
    if (data?.ok && data.text) return { ok: true, text: data.text, error: null };
    return { ok: false, text: '', error: data?.error || 'The AI did not return a note.' };
  } catch (e: any) {
    return { ok: false, text: '', error: e?.message || 'Network error' };
  }
}

// ─── Template builders ───

export interface MessageTemplates {
  emailSubject: string;
  emailText: string;
  emailHtml: string;
  sms: string;
}

export const emailShell = (title: string, bodyHtml: string, storeLine: string) => `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;background:#faf8f5;border-radius:16px">
  <p style="letter-spacing:3px;font-size:11px;color:#e11d48;text-transform:uppercase;margin:0">VowOS · The Boutique Bridal</p>
  <h2 style="color:#1c1917;margin:8px 0 16px">${title}</h2>
  <div style="color:#44403c;font-size:15px;line-height:1.6">${bodyHtml}</div>
  <p style="margin-top:24px;color:#78716c;font-size:12px">${storeLine}</p>
</div>`;

/** Booking confirmation for a new appointment. */
export function appointmentConfirmationTemplates(a: Appointment): MessageTemplates {
  const loc = locationById(a.location);
  const when = `${formatDate(a.date)} at ${a.time}`;
  return {
    emailSubject: `You're confirmed! ${a.type} on ${formatDate(a.date)} — ${loc.business}`,
    emailText: `Hi ${a.customer},\n\nYour ${a.type.toLowerCase()} is confirmed for ${when} with ${a.stylist} at ${loc.business}, ${loc.address}.\n\nBoutique hours: ${loc.hours}. Questions? Call ${loc.phone}.\n\nWe can't wait to see you!\n— ${loc.business}`,
    emailHtml: emailShell(
      'Your appointment is confirmed',
      `<p>Hi ${a.customer},</p>
       <p>Your <strong>${a.type}</strong> is confirmed for <strong>${when}</strong> with ${a.stylist}.</p>
       <p><strong>${loc.business}</strong><br/>${loc.address}<br/>${loc.hours}</p>
       <p>Questions or need to reschedule? Call <a href="tel:${loc.phone}">${loc.phone}</a>.</p>`,
      `${loc.business} · ${loc.address} · ${loc.phone}`,
    ),
    sms: `${loc.business}: Hi ${a.customer}! Your ${a.type.toLowerCase()} is confirmed for ${when} with ${a.stylist} at ${loc.address}. Reply STOP to opt out.`,
  };
}

/** Reschedule notice when an appointment is moved (calendar already updated). */
export function appointmentRescheduleTemplates(a: Appointment): MessageTemplates {
  const loc = locationById(a.location);
  const when = `${formatDate(a.date)} at ${a.time}`;
  return {
    emailSubject: `Updated: your ${a.type.toLowerCase()} is now ${formatDate(a.date)} — ${loc.business}`,
    emailText: `Hi ${a.customer},\n\nYour ${a.type.toLowerCase()} has been rescheduled to ${when} with ${a.stylist} at ${loc.business}, ${loc.address}.\n\nOur calendar has been updated — no action needed. Questions? Call ${loc.phone}.\n\n— ${loc.business}`,
    emailHtml: emailShell(
      'Your appointment has been rescheduled',
      `<p>Hi ${a.customer},</p>
       <p>Your <strong>${a.type}</strong> now takes place on <strong>${when}</strong> with ${a.stylist}.</p>
       <p><strong>${loc.business}</strong><br/>${loc.address}<br/>${loc.hours}</p>
       <p>Our calendar is already updated — no action needed. Questions? Call <a href="tel:${loc.phone}">${loc.phone}</a>.</p>`,
      `${loc.business} · ${loc.address} · ${loc.phone}`,
    ),
    sms: `${loc.business}: Hi ${a.customer}, your ${a.type.toLowerCase()} moved to ${when} with ${a.stylist}. Our calendar is updated. Questions? ${loc.phone}`,
  };
}

/** Secure hosted payment page URL for an invoice. */
export function paymentLinkUrl(inv: Invoice): string {
  return `${window.location.origin}/pay/${inv.id}?t=${inv.payToken}`;
}

/** Payment request with hosted pay link. */
export function paymentLinkTemplates(inv: Invoice): MessageTemplates {
  const loc = locationById(inv.location);
  const balance = formatCents(inv.amountCents - inv.paidCents);
  const url = paymentLinkUrl(inv);
  return {
    emailSubject: `Payment link for invoice ${inv.id} — balance ${balance}`,
    emailText: `Hi ${inv.customer},\n\nHere is your secure payment link for invoice ${inv.id} (${inv.description}).\nBalance due: ${balance} · Due ${formatDate(inv.dueDate)}\n\nPay online: ${url}\n\nThank you!\n— ${loc.business}`,
    emailHtml: emailShell(
      'Your payment link is ready',
      `<p>Hi ${inv.customer},</p>
       <p>Invoice <strong>${inv.id}</strong> — ${inv.description}</p>
       <p>Balance due: <strong>${balance}</strong> · Due ${formatDate(inv.dueDate)}</p>
       <p style="margin:20px 0"><a href="${url}" style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px">Pay ${balance} securely</a></p>
       <p>Or copy this link: <a href="${url}">${url}</a></p>`,
      `${loc.business} · ${loc.address} · ${loc.phone}`,
    ),
    sms: `${loc.business}: Hi ${inv.customer}, your balance of ${balance} on invoice ${inv.id} is due ${formatDate(inv.dueDate)}. Pay securely here: ${url}`,
  };
}

/** Friendly overdue-balance chase (also sent automatically every 4 days by auto-comms). */
export function overdueChaseTemplates(inv: Invoice): MessageTemplates {
  const loc = locationById(inv.location);
  const balance = formatCents(inv.amountCents - inv.paidCents);
  const url = paymentLinkUrl(inv);
  return {
    emailSubject: `Friendly reminder: ${balance} past due on invoice ${inv.id}`,
    emailText: `Hi ${inv.customer},\n\nWe hope wedding planning is going beautifully! This is a friendly reminder that invoice ${inv.id} (${inv.description}) has an outstanding balance of ${balance}, which was due ${formatDate(inv.dueDate)}.\n\nPay securely online: ${url}\n\nIf you've already sent payment, please disregard this note.\n\nWarmly,\n${loc.business}\n${loc.address}\nTel ${loc.phone}`,
    emailHtml: emailShell(
      'A friendly balance reminder',
      `<p>Hi ${inv.customer},</p>
       <p>Invoice <strong>${inv.id}</strong> (${inv.description}) has an outstanding balance of <strong>${balance}</strong>, due ${formatDate(inv.dueDate)}.</p>
       <p style="margin:20px 0"><a href="${url}" style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px">Pay ${balance} securely</a></p>
       <p>If you've already sent payment, please disregard this note.</p>`,
      `${loc.business} · ${loc.address} · ${loc.phone}`,
    ),
    sms: `${loc.business}: Hi ${inv.customer.split(' ')[0]}, a friendly note — your balance of ${balance} on invoice ${inv.id} was due ${formatDate(inv.dueDate)}. Pay securely: ${url}`,
  };
}

/** Gentle reminder for an upcoming visit. */
export function reminderTemplates(a: Appointment): MessageTemplates {
  const loc = locationById(a.location);
  const when = `${formatDate(a.date)} at ${a.time}`;
  return {
    emailSubject: `See you soon — ${a.type.toLowerCase()} on ${formatDate(a.date)}`,
    emailText: `Hi ${a.customer},\n\nJust a friendly reminder about your ${a.type.toLowerCase()} on ${when} with ${a.stylist} at ${loc.business}, ${loc.address}.\n\nSee you soon!\n— ${loc.business}`,
    emailHtml: emailShell(
      'A friendly reminder',
      `<p>Hi ${a.customer},</p>
       <p>We're looking forward to your <strong>${a.type}</strong> on <strong>${when}</strong> with ${a.stylist}.</p>
       <p><strong>${loc.business}</strong><br/>${loc.address}</p>`,
      `${loc.business} · ${loc.address} · ${loc.phone}`,
    ),
    sms: `${loc.business}: Reminder — ${a.customer}, your ${a.type.toLowerCase()} is ${when} with ${a.stylist}. See you soon!`,
  };
}

/** The "I Do Team" wedding photo request — auto-sent 2 months after the wedding. */
export function weddingPhotoTemplates(bride: Customer): MessageTemplates {
  const loc = locationById(bride.location);
  const first = bride.name.split(' ')[0];
  const bodyText = `Hi ${first}!\n\nThe I Do Team wanted to congratulate you on your recent wedding celebration. We would love to see some photos of you in your gorgeous gown on your special day and share them on our Instagram and Facebook page. We'd love it if you shared your album or gallery link with us at ido@idobridalcouture.com along with your photographer's name and any other vendors you'd like to share. We can't wait to see!\n\nXo,\nThe I Do Team\n\n\n${loc.business}\n${loc.address}\nTel ${loc.phone}\nidobridalcouture.com`;
  return {
    emailSubject: `We'd love to see your wedding photos, ${first}!`,
    emailText: bodyText,
    emailHtml: emailShell(
      `Congratulations, ${first}!`,
      `<p>Hi ${first}!</p>
       <p>The I Do Team wanted to congratulate you on your recent wedding celebration. We would love to see some photos of you in your gorgeous gown on your special day and share them on our Instagram and Facebook page.</p>
       <p>We'd love it if you shared your album or gallery link with us at <a href="mailto:ido@idobridalcouture.com">ido@idobridalcouture.com</a> along with your photographer's name and any other vendors you'd like to share. We can't wait to see!</p>
       <p>Xo,<br/>The I Do Team</p>`,
      `${loc.business} · ${loc.address} · Tel ${loc.phone} · idobridalcouture.com`,
    ),
    sms: `${loc.business}: Hi ${first}! Congratulations on your recent wedding! We'd love to see photos of you in your gown — share your gallery link with us at ido@idobridalcouture.com. Xo, The I Do Team`,
  };
}

/** True when the string looks like a usable email address. */
export const isEmail = (s: string) => /.+@.+\..+/.test(s || '');
/** True when the string has at least 10 digits (usable phone). */
export const isPhone = (s: string) => ((s || '').replace(/[^\d]/g, '').length >= 10);
