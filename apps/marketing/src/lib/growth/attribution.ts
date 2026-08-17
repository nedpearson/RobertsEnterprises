/**
 * Client-side attribution capture.
 *
 * Records where a visitor came from, once per session, and links that session to
 * the lead it becomes. This is what makes the Attribution tab real — without it
 * growth_attribution_touchpoints never receives a row.
 *
 * Storage split is deliberate:
 *   - FIRST touch lives in localStorage, so a bride who discovers you on
 *     Instagram in March and books in May is still credited to Instagram as the
 *     channel that opened the journey.
 *   - SESSION id lives in sessionStorage, so each visit is its own touch and one
 *     person browsing over weeks does not collapse into a single event.
 *
 * Nothing here runs in the demo sandbox: recording synthetic prospects against a
 * real tenant would corrupt the numbers the owner is looking at.
 */
import { getActiveDataPlane } from '@/lib/supabase';

const FIRST_TOUCH_KEY = 'vowos_attr_first_v1';
const SESSION_KEY = 'vowos_attr_session_v1';
const SENT_KEY = 'vowos_attr_sent_v1';

export interface AttributionSnapshot {
  sessionId: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  clickId: string | null;
  landingPath: string | null;
  referrer: string | null;
  device: string;
  isFirstTouch: boolean;
}

const safeGet = (store: Storage | undefined, key: string): string | null => {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    // Private-mode Safari throws on storage access. Attribution is best-effort;
    // never let it break a booking form.
    return null;
  }
};

const safeSet = (store: Storage | undefined, key: string, value: string) => {
  try {
    store?.setItem(key, value);
  } catch {
    /* ignore */
  }
};

function newId(): string {
  // crypto.randomUUID is unavailable on older Safari and on http origins.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function deviceClass(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  return /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

/** Reads the current URL's campaign parameters. */
function readParams(): Omit<AttributionSnapshot, 'sessionId' | 'isFirstTouch' | 'device'> {
  const params = new URLSearchParams(window.location.search);
  const gclid = params.get('gclid');
  const fbclid = params.get('fbclid');
  const ttclid = params.get('ttclid');

  return {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    term: params.get('utm_term'),
    content: params.get('utm_content'),
    // Prefix so the channel deriver can tell platforms apart from the id alone.
    clickId: gclid ? `gclid:${gclid}` : fbclid ? `fbclid:${fbclid}` : ttclid ? `ttclid:${ttclid}` : null,
    landingPath: window.location.pathname,
    referrer: document.referrer || null,
  };
}

export function getSessionId(): string {
  let id = safeGet(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, SESSION_KEY);
  if (!id) {
    id = newId();
    safeSet(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, SESSION_KEY, id);
  }
  return id;
}

/** The stored first touch, if this visitor has been here before. */
export function getFirstTouch(): Partial<AttributionSnapshot> | null {
  const raw = safeGet(typeof localStorage !== 'undefined' ? localStorage : undefined, FIRST_TOUCH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<AttributionSnapshot>;
  } catch {
    return null;
  }
}

export function buildSnapshot(): AttributionSnapshot {
  const params = readParams();
  const existingFirst = getFirstTouch();
  const isFirstTouch = !existingFirst;

  if (isFirstTouch) {
    safeSet(
      typeof localStorage !== 'undefined' ? localStorage : undefined,
      FIRST_TOUCH_KEY,
      JSON.stringify({ ...params, capturedAt: new Date().toISOString() }),
    );
  }

  return { ...params, sessionId: getSessionId(), device: deviceClass(), isFirstTouch };
}

async function post(path: string, body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Tracking must never surface an error to a bride mid-booking.
  }
}

/**
 * Record this visit. Safe to call on every route change — it only sends once
 * per session, so a single-page app does not inflate touch counts.
 */
export async function trackVisit(businessId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (getActiveDataPlane() === 'demo') return;
  if (safeGet(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, SENT_KEY)) return;

  const snapshot = buildSnapshot();
  safeSet(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, SENT_KEY, '1');
  await post('/api/growth/track', { businessId, ...snapshot });
}

/**
 * Link this session's touchpoints to the lead it produced. Call immediately
 * after a booking or enquiry succeeds — until this runs the touchpoints have a
 * null lead_id and attribute nothing.
 */
export async function identifyLead(
  businessId: string,
  ids: { leadId?: string; customerId?: string },
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (getActiveDataPlane() === 'demo') return;
  if (!ids.leadId && !ids.customerId) return;
  await post('/api/growth/track/identify', { businessId, sessionId: getSessionId(), ...ids });
}
