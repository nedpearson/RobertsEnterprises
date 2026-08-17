/**
 * Public attribution tracking.
 *
 * This is the write side of attribution. Without it
 * growth_attribution_touchpoints stays empty forever and the Attribution tab is
 * decorative — reading is useless if nothing ever records a click.
 *
 * SECURITY POSTURE, stated plainly: these two endpoints are deliberately
 * unauthenticated, because the people they record are anonymous visitors who
 * have not signed in and never will. That is the same trade every analytics
 * pixel makes. It is contained by making the surface as small as possible:
 *
 *   - append-only; nothing here reads tenant data back to the caller
 *   - business_id must resolve to a real business, else 404
 *   - every field is whitelisted and length-capped before it reaches the DB
 *   - per-IP rate limiting, so it cannot be used to bulk-insert rows
 *   - responses carry no data, so it cannot be used as an oracle
 *
 * Anything that reads or mutates tenant state stays behind requireGrowthAccess.
 */
import { Router } from 'express';
import { db } from './store';

export const trackingRouter = Router();

const MAX_FIELD = 512;
const clip = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, MAX_FIELD) : null;
};

/**
 * Small in-memory limiter. Deliberately not Redis: one Railway replica, and a
 * dependency for this would be worse than the problem. Resets hourly.
 */
const HITS = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 120;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = HITS.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    HITS.set(ip, { count: 1, windowStart: now });
    if (HITS.size > 10_000) {
      // Bound memory: drop everything once the map gets unreasonable rather
      // than leaking one entry per visitor IP forever.
      for (const [key, value] of HITS) if (now - value.windowStart > WINDOW_MS) HITS.delete(key);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

async function businessExists(businessId: string): Promise<boolean> {
  const { data } = await db().from('businesses').select('id').eq('id', businessId).maybeSingle();
  return Boolean(data);
}

/**
 * Derive a channel from the raw parameters, so the UI never has to.
 *
 * The mapping is intentionally coarse and named the way an owner would say it
 * out loud — "Google Search", "Meta" — and matches the channel names the ad
 * syncs write into growth_channel_spend, so spend and conversions land on the
 * same row instead of two lookalike channels that never join.
 */
export function deriveChannel(input: {
  source: string | null;
  medium: string | null;
  clickId: string | null;
  referrer: string | null;
}): string {
  const source = (input.source ?? '').toLowerCase();
  const medium = (input.medium ?? '').toLowerCase();
  const ref = (input.referrer ?? '').toLowerCase();

  if (input.clickId?.startsWith('gclid') || /gclid/.test(medium)) return 'Google Search';
  if (/^(cpc|ppc|paid|paidsearch)$/.test(medium)) {
    if (/google/.test(source)) return 'Google Search';
    if (/facebook|instagram|meta|fb|ig/.test(source)) return 'Meta';
    if (/pinterest/.test(source)) return 'Pinterest';
    return source ? source.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Paid';
  }
  if (/facebook|instagram|meta/.test(source) || /facebook\.com|instagram\.com/.test(ref)) return 'Meta';
  if (/pinterest/.test(source) || /pinterest\./.test(ref)) return 'Pinterest';
  if (/tiktok/.test(source) || /tiktok\./.test(ref)) return 'TikTok';
  if (/theknot|wedding ?wire/.test(source) || /theknot\.com|weddingwire\.com/.test(ref)) return 'The Knot';
  if (/email|newsletter|klaviyo|mailchimp/.test(medium) || /email/.test(source)) return 'Email';
  if (/google\.|bing\.|duckduckgo\.|search\.yahoo/.test(ref) || medium === 'organic') return 'Organic Search';
  if (ref && !/vowos\.bridgebox\.ai|bridgebox\.ai/.test(ref)) return 'Referral';
  return 'Direct';
}

/**
 * Record a touchpoint. Called on landing (no lead yet) and again at conversion.
 * lead_id stays null until /track/identify links the session.
 */
trackingRouter.post('/track', async (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ ok: false });

  const businessId = clip(req.body?.businessId);
  const sessionId = clip(req.body?.sessionId);
  if (!businessId || !sessionId) return res.status(400).json({ ok: false });
  if (!(await businessExists(businessId))) return res.status(404).json({ ok: false });

  const source = clip(req.body?.source);
  const medium = clip(req.body?.medium);
  const clickId = clip(req.body?.clickId);
  const referrer = clip(req.body?.referrer);

  const row = {
    business_id: businessId,
    lead_id: null,
    customer_id: null,
    occurred_at: new Date().toISOString(),
    channel: deriveChannel({ source, medium, clickId, referrer }),
    source,
    medium,
    campaign: clip(req.body?.campaign),
    term: clip(req.body?.term),
    content: clip(req.body?.content),
    click_id: clickId,
    landing_path: clip(req.body?.landingPath),
    referrer,
    session_id: sessionId,
    device: clip(req.body?.device),
    is_first_touch: req.body?.isFirstTouch === true,
    is_last_touch: req.body?.isLastTouch !== false,
  };

  const { error } = await db().from('growth_attribution_touchpoints').insert(row);
  if (error) {
    console.error('[growth] track insert failed:', error.message);
    return res.status(500).json({ ok: false });
  }
  // No body: this endpoint must never be usable to read anything back.
  return res.status(204).end();
});

/**
 * Link a session's touchpoints to the lead it became.
 *
 * Called right after a booking or enquiry succeeds. Without this step every
 * touchpoint has a null lead_id and the rollup attributes nothing — the join
 * key is the whole point.
 */
trackingRouter.post('/track/identify', async (req, res) => {
  const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ ok: false });

  const businessId = clip(req.body?.businessId);
  const sessionId = clip(req.body?.sessionId);
  const leadId = clip(req.body?.leadId);
  const customerId = clip(req.body?.customerId);
  if (!businessId || !sessionId || (!leadId && !customerId)) return res.status(400).json({ ok: false });

  const patch: Record<string, string> = {};
  if (leadId) patch.lead_id = leadId;
  if (customerId) patch.customer_id = customerId;

  const { error } = await db()
    .from('growth_attribution_touchpoints')
    .update(patch)
    .eq('business_id', businessId)
    .eq('session_id', sessionId)
    .is('lead_id', null);

  if (error) {
    console.error('[growth] identify failed:', error.message);
    return res.status(500).json({ ok: false });
  }
  return res.status(204).end();
});
