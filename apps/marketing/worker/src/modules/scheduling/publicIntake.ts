/**
 * Public appointment-intake support: store resolution + payload shaping.
 *
 * WHY THIS EXISTS: the original /api/scheduling/public/book inserted rows with
 * text ids ('A-123456'), text business ids ('biz_ido_bridal') and columns the
 * migrations later dropped ('type', 'fee_paid'). Every column and both id
 * columns are UUIDs with FK constraints in the real schema, so the endpoint
 * returned 500 on every single production submission — the front door of the
 * product was nailed shut.
 *
 * The rule (learned from the catalog dead-tenant bug): NEVER hardcode tenant
 * UUIDs, and never invent text ids for UUID columns. Businesses are resolved at
 * runtime — first by their registered website domain (business_websites), then
 * by name — and locations by city. Results are cached briefly; failures carry
 * an actionable reason instead of a silent wrong-tenant write.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type StoreKey = 'ido-br' | 'ido-cov' | 'pc-br' | 'pc-cov';

export interface StoreSpec {
  /** Registered site whose booking page feeds this store. */
  domain: string;
  /** Fallback business-name match when no website row exists. */
  nameLike: string;
  city: string;
  label: string;
}

/**
 * The four boutiques. Keys MUST match the LocationId values used by the public
 * booking page (apps/marketing/src/data/vowosData.ts) — the frontend sends
 * these strings verbatim.
 */
export const STORE_CATALOG: Record<StoreKey, StoreSpec> = {
  'ido-br': { domain: 'idobridalcouture.com', nameLike: 'i do bridal', city: 'baton rouge', label: 'I Do Bridal Couture · Baton Rouge' },
  'ido-cov': { domain: 'idobridalcouture.com', nameLike: 'i do bridal', city: 'covington', label: 'I Do Bridal Couture · Covington' },
  'pc-br': { domain: 'properandcompany.com', nameLike: 'proper', city: 'baton rouge', label: 'Proper & Company · Baton Rouge' },
  'pc-cov': { domain: 'properandcompany.com', nameLike: 'proper', city: 'covington', label: 'Proper & Company · Covington' },
};

export function isStoreKey(v: unknown): v is StoreKey {
  return typeof v === 'string' && v in STORE_CATALOG;
}

/**
 * Whitelist the intake source so arbitrary caller strings never reach the DB.
 * Shopify pages send 'shopify-idobridalcouture' / 'shopify-properandcompany';
 * the hosted page defaults to 'booking-page'.
 */
export function sanitizeSource(v: unknown): string {
  if (typeof v !== 'string') return 'booking-page';
  const cleaned = v.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(cleaned) ? cleaned : 'booking-page';
}

export interface BookingPayload {
  name: string;
  email: string;
  phone?: string;
  smsOptIn?: boolean;
  weddingDate?: string;
  store: StoreKey;
  type?: string;
  lookingFor?: string;
  budgetCents?: number;
  date: string;
  time: string;
  paymentIntentId?: string;
  totalCents?: number;
  brandLabel?: string;
  surchargeCents?: number;
  surchargePct?: number;
}

/**
 * appointment_requests has no columns for service type / budget / payment, so
 * everything the stylist needs to see lands in notes — human-readable, one
 * fact per line, no placeholders for absent facts.
 */
export function buildRequestNotes(p: BookingPayload): string {
  const lines: string[] = [];
  if (p.type) lines.push(`Type: ${p.type}`);
  if (p.lookingFor) lines.push(`Looking for: ${p.lookingFor}`);
  if (typeof p.budgetCents === 'number' && p.budgetCents > 0) lines.push(`Budget: $${(p.budgetCents / 100).toFixed(2)}`);
  if (p.weddingDate) lines.push(`Wedding date: ${p.weddingDate}`);
  if (p.phone) lines.push(`Phone: ${p.phone}${p.smsOptIn ? ' (SMS ok)' : ''}`);
  if (typeof p.totalCents === 'number' && p.totalCents > 0) {
    const surcharge = p.surchargeCents && p.surchargeCents > 0
      ? ` incl. $${(p.surchargeCents / 100).toFixed(2)} card fee (${p.surchargePct}%)`
      : '';
    lines.push(`Booking fee paid: $${(p.totalCents / 100).toFixed(2)} on ${p.brandLabel ?? 'card'}${surcharge} — Stripe ref ${p.paymentIntentId ?? 'n/a'}`);
  }
  return lines.join('\n');
}

export interface ResolvedStore {
  storeKey: StoreKey;
  businessId: string;
  businessName: string;
  locationId: string | null;
  locationName: string | null;
}

interface CacheEntry {
  value: ResolvedStore;
  at: number;
}

const CACHE = new Map<StoreKey, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Test hook — resolution results are cached for 5 minutes otherwise. */
export function clearStoreCache(): void {
  CACHE.clear();
}

/**
 * Resolve a store key to real tenant UUIDs.
 *
 * Order of trust: business_websites domain match (the canonical "requests from
 * this site belong to this business" mapping) → businesses.name match. The
 * location is matched by city within that business only; if no city matches we
 * fall back to the business's first location, and if the business has no
 * locations at all preferred_location_id stays null (the column is nullable —
 * staff assign one in the scheduling workspace).
 */
export async function resolveStore(db: SupabaseClient, storeKey: StoreKey): Promise<ResolvedStore> {
  const hit = CACHE.get(storeKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const spec = STORE_CATALOG[storeKey];

  let businessId: string | null = null;
  let businessName: string | null = null;

  const bySite = await db
    .from('business_sites')
    .select('business_id')
    .ilike('domain', `%${spec.domain}%`)
    .limit(1)
    .maybeSingle();
  if (bySite.data?.business_id) {
    businessId = bySite.data.business_id as string;
    const biz = await db.from('businesses').select('id, name').eq('id', businessId).maybeSingle();
    businessName = (biz.data?.name as string) ?? spec.label;
  }

  if (!businessId) {
    const byName = await db
      .from('businesses')
      .select('id, name')
      .ilike('name', `%${spec.nameLike}%`)
      .limit(1)
      .maybeSingle();
    if (byName.data?.id) {
      businessId = byName.data.id as string;
      businessName = byName.data.name as string;
    }
  }

  if (businessName && /demo/i.test(businessName)) {
    throw new Error(`Demo businesses cannot accept live public bookings: "${businessName}"`);
  }

  if (!businessId) {
    throw new Error(
      `No business found for "${spec.label}" - expected a business_sites row containing "${spec.domain}" or a business named like "${spec.nameLike}".`,
    );
  }

  const locs = await db
    .from('locations')
    .select('id, name')
    .eq('business_id', businessId)
    .limit(50);
  const rows = (locs.data ?? []) as Array<{ id: string; name: string | null }>;
  const cityMatch = rows.find((l) => {
    const name = (l.name ?? '').toLowerCase();
    return name.includes(spec.city) && name.includes(spec.nameLike);
  });
  const chosen = cityMatch ?? rows[0] ?? null;

  const value: ResolvedStore = {
    storeKey,
    businessId,
    businessName: businessName ?? spec.label,
    locationId: chosen?.id ?? null,
    locationName: chosen?.name ?? null,
  };
  CACHE.set(storeKey, { value, at: Date.now() });
  return value;
}

/** Find a customer by email within the business, or create one. */
export async function findOrCreateCustomer(
  db: SupabaseClient,
  resolved: ResolvedStore,
  p: BookingPayload,
): Promise<string | null> {
  const email = p.email.trim().toLowerCase();
  const existing = await db
    .from('customers')
    .select('id')
    .eq('business_id', resolved.businessId)
    .ilike('email', email)
    .limit(1)
    .maybeSingle();
  if (existing.data?.id) return existing.data.id as string;

  const insert: Record<string, unknown> = {
    business_id: resolved.businessId,
    name: p.name.trim(),
    email,
    phone: p.phone?.trim() || null,
    wedding_date: p.weddingDate || null,
    status: 'Lead',
  };
  if (resolved.locationId) insert.location_id = resolved.locationId;

  const created = await db.from('customers').insert(insert).select('id').single();
  if (created.error) {
    // A booking must not die because the customer row could not be created —
    // the request row still lands and staff link the customer by hand.
    console.error('[public-intake] customer create failed:', created.error.message);
    return null;
  }
  return (created.data as { id: string }).id;
}

