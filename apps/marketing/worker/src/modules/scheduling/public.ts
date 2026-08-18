/**
 * Public booking intake — the front door of the product.
 *
 * Serves the hosted booking page (vowos.bridgebox.ai/book) and the embedded
 * Shopify pages on idobridalcouture.com and properandcompany.com. Writes an
 * appointment_requests row (the real intake entity the scheduling workspace
 * consumes) plus a lead, using tenant UUIDs resolved at runtime — see
 * publicIntake.ts for why nothing here is hardcoded.
 *
 * SECURITY POSTURE: deliberately unauthenticated (brides are anonymous), same
 * containment rules as growth/tracking.ts — append-only, whitelisted fields,
 * length caps, no data readable back except the created ids.
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
  sanitizeSource,
} from './publicIntake';

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 booking requests per windowMs
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many booking requests from this IP, please try again after 15 minutes.' });
  }
});

export const publicSchedulingRouter = Router();

const MAX_FIELD = 512;
const clip = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, MAX_FIELD) : '');

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

// Public endpoint to submit a booking request
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
    };

    if (!payload.name || !payload.email || !payload.date || !payload.time) {
      return res.status(400).json({ error: 'Missing required booking details' });
    }
    if (!isStoreKey(payload.store)) {
      return res.status(400).json({ error: 'Unknown store.' });
    }

    const source = sanitizeSource(req.body?.source);

    // 1) Resolve the tenant — the whole point. A request from
    //    properandcompany.com must land in Proper & Company, never anywhere else.
    let resolved;
    try {
      resolved = await resolveStore(supabase, payload.store);
    } catch (e: any) {
      console.error('[public-intake] store resolution failed:', e.message);
      return res.status(503).json({
        error: 'This boutique is not accepting online requests right now — please call the store.',
      });
    }

    // 2) Find or create the customer (best-effort; null is acceptable).
    const customerId = await findOrCreateCustomer(supabase, resolved, payload);

    // 3) The appointment request — the row the scheduling workspace works from.
    const requestInsert: Record<string, unknown> = {
      business_id: resolved.businessId,
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

    // 4) Log a lead (id defaults to a UUID — never invent one).
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

    // 5) Notify — boutique + BridgeBox + the bride.
    const summary = [
      `New appointment request at ${resolved.businessName}${resolved.locationName ? ` · ${resolved.locationName}` : ''}.`,
      `${payload.name} (${payload.email}) asked for ${payload.date} at ${payload.time}.`,
      buildRequestNotes(payload),
      `Source: ${source}. Request id ${requestId}.`,
    ]
      .filter(Boolean)
      .join('\n');

    const boutiqueEmail = payload.store.startsWith('ido') ? 'ido@idobridalcouture.com' : 'hello@properandcompany.com';
    const recipients = ['robertsenterprises@bridgebox.ai', boutiqueEmail, payload.email];
    for (const recipient of recipients) {
      try {
        await supabase.functions.invoke('send-message', {
          body: {
            channel: 'email',
            to: recipient,
            subject: `Appointment request received — ${resolved.businessName} (${payload.date} ${payload.time})`,
            body: summary,
          },
        });
      } catch (e) {
        console.error(`[public-intake] email to ${recipient} failed:`, e);
      }
    }

    // 6) In-app message log (columns per core schema: sender/content).
    const msg = await supabase.from('messages').insert({
      business_id: resolved.businessId,
      location_id: resolved.locationId,
      customer_id: customerId,
      sender: 'system',
      content: summary,
    });
    if (msg.error) console.error('[public-intake] message log failed:', msg.error.message);

    // businessId + leadId let the booking page link this session's attribution
    // touchpoints to the lead it just became (growth/tracking `/track/identify`).
    res.json({
      success: true,
      requestId,
      leadId,
      businessId: resolved.businessId,
      store: payload.store,
      date: payload.date,
      time: payload.time,
    });
  } catch (err: any) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Booking failed — please call the boutique.' });
  }
});
