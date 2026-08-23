/**
 * Public booking intake — the front door of the product.
 *
 * Serves the hosted booking page and accepts secure shadow copies from the
 * existing Shopify appointment forms. The existing website forms and their
 * current email delivery remain untouched; the form bridge adds VowOS as an
 * additional operational destination only.
 *
 * SECURITY POSTURE: bride-facing booking is deliberately unauthenticated and
 * rate-limited. The existing-form bridge is additionally protected by a strong
 * server-side shared secret and is idempotent by the form provider submission
 * id. All writes resolve tenant/location at runtime and fail closed on ambiguity.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../../index';
import {
  BookingPayload,
  STORE_CATALOG,
  StoreKey,
  buildRequestNotes,
  findOrCreateCustomer,
  isStoreKey,
  resolveStore,
  resolveWebsiteIntake,
  resolveWebsiteSubmissionIntake,
  sanitizeSource,
} from './publicIntake';
import {
  isFormBridgeConfigured,
  normalizeFormBridgeSubmission,
  redactFormBridgePayload,
  verifyFormBridgeSecret,
} from './formBridge';

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many booking requests from this IP, please try again after 15 minutes.' });
  },
});

const formBridgeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Form bridge rate limit exceeded.' });
  },
});

export const publicSchedulingRouter = Router();

const MAX_FIELD = 512;
const clip = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, MAX_FIELD) : '');
const sanitizeIdempotencyKey = (v: unknown): string | null => {
  const value = clip(v).slice(0, 128);
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value) ? value : null;
};
const isUniqueViolation = (error: unknown): boolean =>
  Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505');

type IntakeNotification = {
  id: string;
  recipient: string;
  attempts: number;
  payload: { subject?: string; body?: string };
};

async function deliverNotification(notification: IntakeNotification): Promise<void> {
  const attempt = Number(notification.attempts ?? 0) + 1;
  try {
    const { error } = await supabase.functions.invoke('send-message', {
      body: { channel: 'email', to: notification.recipient, subject: notification.payload.subject, body: notification.payload.body },
    });
    if (error) throw error;
    await supabase.from('appointment_intake_notification_outbox').update({
      status: 'delivered', attempts: attempt, delivered_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
    }).eq('id', notification.id);
  } catch (error) {
    const exhausted = attempt >= 8;
    const delayMinutes = Math.min(360, 5 * 2 ** Math.min(attempt - 1, 6));
    await supabase.from('appointment_intake_notification_outbox').update({
      status: exhausted ? 'failed' : 'pending', attempts: attempt,
      next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
      last_error: error instanceof Error ? error.message.slice(0, 500) : 'Notification delivery failed', updated_at: new Date().toISOString(),
    }).eq('id', notification.id);
  }
}

export async function retryPendingAppointmentNotifications(): Promise<void> {
  const { data, error } = await supabase.from('appointment_intake_notification_outbox')
    .select('id,recipient,attempts,payload').eq('status', 'pending').lte('next_attempt_at', new Date().toISOString()).limit(25);
  if (error) {
    console.error('[public-intake] notification outbox query failed:', error.message);
    return;
  }
  for (const notification of (data ?? []) as IntakeNotification[]) await deliverNotification(notification);
}

export function startPublicIntakeNotificationScheduler(): void {
  if (process.env.PUBLIC_INTAKE_DELIVERY_ENABLED === 'false') return;
  const interval = setInterval(() => void retryPendingAppointmentNotifications(), 60_000);
  interval.unref?.();
}

/**
 * Self-check: shows, per store, whether the tenant mapping resolves — the same
 * pattern as /api/growth/setup/status. Names only; no ids leak to the public.
 */
publicSchedulingRouter.get('/stores', async (_req, res) => {
  const out: Record<string, { ok: boolean; business?: string; location?: string; error?: string }> = {};
  for (const key of Object.keys(STORE_CATALOG) as StoreKey[]) {
    try {
      const r = await resolveStore(supabase, key);
      out[key] = { ok: true, business: r.businessName, location: r.locationName ?? undefined };
    } catch (e: any) {
      out[key] = { ok: false, error: e.message };
    }
  }
  res.json({ stores: out, ready: Object.values(out).every((s) => s.ok) });
});

/**
 * Returns the businessId for a store so the booking page can record an
 * attribution touchpoint on landing. A bare id is not sensitive — every RLS
 * policy and API check scopes by membership, never by id secrecy.
 */
publicSchedulingRouter.get('/stores/:storeKey/attribution', async (req, res) => {
  const storeKey = String(req.params.storeKey);
  if (!isStoreKey(storeKey)) return res.status(404).json({ error: 'Unknown store.' });
  try {
    const r = await resolveStore(supabase, storeKey);
    res.json({ businessId: r.businessId });
  } catch {
    res.status(503).json({ error: 'Store mapping not configured yet.' });
  }
});

/** Public configuration check for a brand website's booking embed. */
publicSchedulingRouter.get('/sites/resolve', async (req, res) => {
  try {
    const site = await resolveWebsiteIntake(supabase, String(req.query.domain ?? ''));
    res.json({ ready: true, domain: site.domain, brand: site.brandName, location: site.locationName });
  } catch (error) {
    res.status(404).json({ ready: false, error: error instanceof Error ? error.message : 'Website is not configured.' });
  }
});

/**
 * Existing website form bridge health. This endpoint never reveals the secret;
 * it only tells deployment monitoring whether the server is ready to accept
 * authenticated shadow copies.
 */
publicSchedulingRouter.get('/form-bridge/status', (_req, res) => {
  const ready = isFormBridgeConfigured(process.env.PUBLIC_FORM_BRIDGE_SECRET);
  res.status(ready ? 200 : 503).json({
    ready,
    mode: 'shadow-copy',
    notificationPolicy: 'origin-email-preserved',
  });
});

/**
 * Secure shadow ingestion for the appointment forms already running on the
 * Roberts websites. Powerful Form keeps sending its existing emails exactly as
 * it does today. A Zapier/Make/n8n step sends the same submission here, where
 * VowOS creates the customer/lead/appointment request. THIS ROUTE MUST NEVER
 * enqueue appointment_intake_notification_outbox email rows; that would create
 * duplicate customer/store emails.
 */
publicSchedulingRouter.post('/form-bridge', formBridgeLimiter, async (req, res) => {
  const configuredSecret = process.env.PUBLIC_FORM_BRIDGE_SECRET;
  if (!isFormBridgeConfigured(configuredSecret)) {
    return res.status(503).json({ error: 'Website form bridge is not configured.' });
  }
  if (!verifyFormBridgeSecret(configuredSecret, req.headers.authorization, req.headers['x-vowos-form-secret'])) {
    return res.status(401).json({ error: 'Invalid form bridge credentials.' });
  }

  let submission;
  try {
    submission = normalizeFormBridgeSubmission(req.body);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid form submission.' });
  }

  let website;
  try {
    website = await resolveWebsiteSubmissionIntake(supabase, submission.siteDomain, submission.locationHint);
  } catch (error) {
    console.error('[form-bridge] website/location resolution failed:', error);
    return res.status(503).json({
      error: 'The submitted boutique/location is not mapped unambiguously in VowOS.',
    });
  }

  try {
    const existingForm = await supabase
      .from('form_submissions')
      .select('id,appointment_request_id,status')
      .eq('business_id', website.businessId)
      .eq('source_provider', submission.provider)
      .eq('external_submission_id', submission.externalSubmissionId)
      .maybeSingle();
    if (existingForm.error) throw existingForm.error;
    if (existingForm.data?.appointment_request_id) {
      return res.json({
        success: true,
        duplicate: true,
        requestId: existingForm.data.appointment_request_id,
        business: website.businessName,
        brand: website.brandName,
        location: website.locationName,
        notificationPolicy: 'origin-email-preserved',
      });
    }

    const bookingPayload: BookingPayload = {
      name: submission.name,
      email: submission.email,
      phone: submission.phone,
      weddingDate: submission.weddingDate,
      type: submission.type,
      lookingFor: submission.lookingFor,
      budgetCents: submission.budgetCents,
      date: submission.appointmentDate ?? '',
      time: submission.appointmentTime ?? '',
      siteDomain: submission.siteDomain,
      idempotencyKey: submission.idempotencyKey,
    };

    const resolved = {
      businessId: website.businessId,
      businessName: website.businessName,
      brandId: website.brandId,
      siteId: website.siteId,
      locationId: website.locationId,
      locationName: website.locationName,
    };
    const customerId = await findOrCreateCustomer(supabase, resolved as any, bookingPayload);

    let formSubmissionId = existingForm.data?.id as string | undefined;
    if (!formSubmissionId) {
      const formInsert = await supabase.from('form_submissions').insert({
        business_id: website.businessId,
        site_id: website.siteId,
        customer_id: customerId,
        form_type: 'APPOINTMENT_REQUEST',
        source_provider: submission.provider,
        external_submission_id: submission.externalSubmissionId,
        source_domain: website.domain,
        payload: redactFormBridgePayload(req.body),
        status: 'RECEIVED',
      }).select('id').single();

      if (formInsert.error && !isUniqueViolation(formInsert.error)) throw formInsert.error;
      if (formInsert.data?.id) formSubmissionId = formInsert.data.id as string;
      if (!formSubmissionId) {
        const raced = await supabase.from('form_submissions').select('id,appointment_request_id')
          .eq('business_id', website.businessId)
          .eq('source_provider', submission.provider)
          .eq('external_submission_id', submission.externalSubmissionId)
          .maybeSingle();
        if (raced.error || !raced.data?.id) throw raced.error ?? new Error('Could not recover form submission after retry race.');
        formSubmissionId = raced.data.id as string;
        if (raced.data.appointment_request_id) {
          return res.json({
            success: true,
            duplicate: true,
            requestId: raced.data.appointment_request_id,
            business: website.businessName,
            brand: website.brandName,
            location: website.locationName,
            notificationPolicy: 'origin-email-preserved',
          });
        }
      }
    }

    let requestId: string | null = null;
    let createdRequest = false;
    const existingRequest = await supabase.from('appointment_requests').select('id')
      .eq('source_site_id', website.siteId)
      .eq('idempotency_key', submission.idempotencyKey)
      .maybeSingle();
    if (existingRequest.error) throw existingRequest.error;
    if (existingRequest.data?.id) {
      requestId = existingRequest.data.id as string;
    } else {
      const noteText = [
        buildRequestNotes(bookingPayload),
        submission.notes ? `Website form notes: ${submission.notes}` : '',
        `Existing website form shadow import (${submission.provider}).`,
        `External submission: ${submission.externalSubmissionId}.`,
        'Original website email delivery is preserved; VowOS did not send a duplicate intake email.',
      ].filter(Boolean).join('\n');

      const requestInsert = await supabase.from('appointment_requests').insert({
        business_id: website.businessId,
        brand_id: website.brandId,
        source_site_id: website.siteId,
        idempotency_key: submission.idempotencyKey,
        preferred_location_id: website.locationId,
        customer_id: customerId,
        intake_source: `website-${submission.provider}`,
        preferred_date_1: submission.appointmentDate ?? null,
        preferred_window_1: submission.appointmentTime ?? null,
        status: 'submitted',
        priority: 'normal',
        notes: noteText,
      }).select('id').single();

      if (requestInsert.error && !isUniqueViolation(requestInsert.error)) throw requestInsert.error;
      if (requestInsert.data?.id) {
        requestId = requestInsert.data.id as string;
        createdRequest = true;
      } else {
        const racedRequest = await supabase.from('appointment_requests').select('id')
          .eq('source_site_id', website.siteId)
          .eq('idempotency_key', submission.idempotencyKey)
          .maybeSingle();
        if (racedRequest.error || !racedRequest.data?.id) throw racedRequest.error ?? new Error('Could not recover appointment request after retry race.');
        requestId = racedRequest.data.id as string;
      }
    }

    if (!requestId) throw new Error('Appointment request id was not created.');

    const formUpdate = await supabase.from('form_submissions').update({
      appointment_request_id: requestId,
      customer_id: customerId,
      status: 'IMPORTED',
    }).eq('id', formSubmissionId);
    if (formUpdate.error) throw formUpdate.error;

    let leadId: string | null = null;
    if (createdRequest) {
      const leadInsert = await supabase.from('leads').insert({
        business_id: website.businessId,
        location_id: website.locationId,
        name: submission.name,
        email: submission.email,
        source: `Website Form (${submission.provider})`,
        budget_cents: submission.budgetCents ?? null,
        wedding_date: submission.weddingDate || submission.appointmentDate || null,
        stage: 'Appointment Requested',
      }).select('id').single();
      if (leadInsert.error) console.error('[form-bridge] lead insert failed:', leadInsert.error.message);
      leadId = (leadInsert.data as { id: string } | null)?.id ?? null;

      const summary = [
        `Website appointment request imported for ${website.businessName} · ${website.locationName ?? submission.locationHint}.`,
        `${submission.name} (${submission.email})`,
        submission.appointmentDate ? `Requested date: ${submission.appointmentDate}` : '',
        submission.appointmentTime ? `Requested time/window: ${submission.appointmentTime}` : '',
        submission.notes ? `Notes: ${submission.notes}` : '',
        `Source: ${submission.provider}; external submission ${submission.externalSubmissionId}.`,
      ].filter(Boolean).join('\n');

      const msg = await supabase.from('messages').insert({
        business_id: website.businessId,
        location_id: website.locationId,
        customer_id: customerId,
        sender: 'system',
        content: summary,
      });
      if (msg.error) console.error('[form-bridge] message log failed:', msg.error.message);

      const audit = await supabase.from('appointment_audit_events').insert({
        business_id: website.businessId,
        location_id: website.locationId,
        request_id: requestId,
        event_type: 'WEBSITE_FORM_SHADOW_IMPORTED',
        new_values: {
          provider: submission.provider,
          externalSubmissionId: submission.externalSubmissionId,
          domain: website.domain,
          notificationPolicy: 'origin-email-preserved',
        },
      });
      if (audit.error) console.error('[form-bridge] audit log failed:', audit.error.message);
    }

    return res.status(createdRequest ? 201 : 200).json({
      success: true,
      duplicate: !createdRequest,
      requestId,
      leadId,
      business: website.businessName,
      brand: website.brandName,
      location: website.locationName,
      notificationPolicy: 'origin-email-preserved',
    });
  } catch (error) {
    console.error('[form-bridge] ingestion failed:', error);
    return res.status(500).json({ error: 'VowOS could not import this website form submission.' });
  }
});

// Public endpoint to submit a VowOS-hosted booking request.
publicSchedulingRouter.post('/book', bookingLimiter, async (req, res) => {
  try {
    const payload: BookingPayload = {
      name: clip(req.body?.name),
      email: clip(req.body?.email),
      phone: clip(req.body?.phone) || undefined,
      smsOptIn: req.body?.smsOptIn === true,
      weddingDate: clip(req.body?.weddingDate) || undefined,
      store: req.body?.store,
      type: clip(req.body?.type) || undefined,
      lookingFor: clip(req.body?.lookingFor) || undefined,
      budgetCents: typeof req.body?.budgetCents === 'number' ? req.body.budgetCents : undefined,
      date: clip(req.body?.date),
      time: clip(req.body?.time),
      paymentIntentId: clip(req.body?.paymentIntentId) || undefined,
      totalCents: typeof req.body?.totalCents === 'number' ? req.body.totalCents : undefined,
      brandLabel: clip(req.body?.brandLabel) || undefined,
      surchargeCents: typeof req.body?.surchargeCents === 'number' ? req.body.surchargeCents : undefined,
      surchargePct: typeof req.body?.surchargePct === 'number' ? req.body.surchargePct : undefined,
      siteDomain: clip(req.body?.siteDomain) || undefined,
      idempotencyKey: sanitizeIdempotencyKey(req.body?.idempotencyKey) || undefined,
    };

    if (!payload.name || !payload.email || !payload.date || !payload.time) {
      return res.status(400).json({ error: 'Missing required booking details' });
    }
    if (!payload.siteDomain && !isStoreKey(payload.store)) {
      return res.status(400).json({ error: 'Unknown store.' });
    }

    const source = sanitizeSource(req.body?.source);

    let resolved;
    let website: Awaited<ReturnType<typeof resolveWebsiteIntake>> | null = null;
    try {
      if (payload.siteDomain) {
        website = await resolveWebsiteIntake(supabase, payload.siteDomain);
        resolved = {
          businessId: website.businessId,
          businessName: website.businessName,
          locationId: website.locationId,
          locationName: website.locationName,
        };
      } else {
        resolved = await resolveStore(supabase, payload.store as StoreKey);
      }
    } catch (e: any) {
      console.error('[public-intake] store resolution failed:', e.message);
      return res.status(503).json({
        error: 'This boutique is not accepting online requests right now — please call the store.',
      });
    }

    if (website && payload.idempotencyKey) {
      const existing = await supabase.from('appointment_requests').select('id')
        .eq('source_site_id', website.siteId).eq('idempotency_key', payload.idempotencyKey).maybeSingle();
      if (existing.data?.id) {
        return res.json({ success: true, duplicate: true, requestId: existing.data.id, businessId: website.businessId, brand: website.brandName });
      }
    }

    const customerId = await findOrCreateCustomer(supabase, resolved, payload);

    const requestInsert: Record<string, unknown> = {
      business_id: resolved.businessId,
      brand_id: website?.brandId ?? null,
      source_site_id: website?.siteId ?? null,
      idempotency_key: payload.idempotencyKey ?? null,
      preferred_location_id: resolved.locationId,
      customer_id: customerId,
      intake_source: source,
      preferred_date_1: payload.date,
      preferred_window_1: payload.time,
      status: 'submitted',
      priority: 'normal',
      notes: buildRequestNotes(payload),
    };
    const reqRow = await supabase.from('appointment_requests').insert(requestInsert).select('id').single();
    if (reqRow.error) {
      console.error('[public-intake] appointment_requests insert failed:', reqRow.error.message);
      return res.status(500).json({ error: 'Failed to create appointment request.' });
    }
    const requestId = (reqRow.data as { id: string }).id;

    const leadInsert: Record<string, unknown> = {
      business_id: resolved.businessId,
      name: payload.name,
      email: payload.email.toLowerCase(),
      source: source === 'booking-page' ? 'Booking Page' : source,
      budget_cents: payload.budgetCents ?? null,
      wedding_date: payload.weddingDate || payload.date,
      stage: 'Appointment Requested',
    };
    if (resolved.locationId) leadInsert.location_id = resolved.locationId;
    const leadRow = await supabase.from('leads').insert(leadInsert).select('id').single();
    if (leadRow.error) console.error('[public-intake] lead insert failed:', leadRow.error.message);
    const leadId = (leadRow.data as { id: string } | null)?.id ?? null;

    const summary = [
      `New appointment request at ${resolved.businessName}${resolved.locationName ? ` · ${resolved.locationName}` : ''}.`,
      `${payload.name} (${payload.email}) asked for ${payload.date} at ${payload.time}.`,
      buildRequestNotes(payload),
      `Source: ${source}. Request id ${requestId}.`,
    ]
      .filter(Boolean)
      .join('\n');

    const legacyEmail = isStoreKey(payload.store)
      ? (payload.store.startsWith('ido') ? 'ido@idobridalcouture.com' : 'hello@properandcompany.com')
      : null;
    const recipients = [...new Set([
      'robertsenterprises@bridgebox.ai', website?.notificationEmail, legacyEmail, payload.email,
    ].filter((email): email is string => Boolean(email)))];
    const queued = await supabase.from('appointment_intake_notification_outbox').insert(recipients.map((recipient) => ({
      appointment_request_id: requestId,
      business_id: resolved.businessId,
      brand_id: website?.brandId ?? null,
      site_id: website?.siteId ?? null,
      recipient,
      payload: {
        subject: `Appointment request received — ${resolved.businessName} (${payload.date} ${payload.time})`,
        body: summary,
      },
    }))).select('id,recipient,attempts,payload');
    if (queued.error) {
      console.error('[public-intake] notification outbox insert failed:', queued.error.message);
    } else {
      for (const notification of (queued.data ?? []) as IntakeNotification[]) void deliverNotification(notification);
    }

    const msg = await supabase.from('messages').insert({
      business_id: resolved.businessId,
      location_id: resolved.locationId,
      customer_id: customerId,
      sender: 'system',
      content: summary,
    });
    if (msg.error) console.error('[public-intake] message log failed:', msg.error.message);

    res.json({
      success: true,
      requestId,
      leadId,
      businessId: resolved.businessId,
      store: payload.store ?? null,
      brand: website?.brandName ?? null,
      date: payload.date,
      time: payload.time,
    });
  } catch (err: any) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Booking failed — please call the boutique.' });
  }
});
