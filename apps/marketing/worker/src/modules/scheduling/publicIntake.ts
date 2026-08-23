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
 * UUIDs, never invent text ids for UUID columns, and never guess among multiple
 * live tenants or locations. Businesses are resolved at runtime — first by an
 * exact registered website domain (business_sites), then by an unambiguous name
 * match — and locations by city. Results are cached briefly; failures carry an
 * actionable reason instead of silently writing an appointment to the wrong
 * boutique.
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
  store?: StoreKey;
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
  siteDomain?: string;
  idempotencyKey?: string;
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
  brandId: string | null;
  siteId: string | null;
  locationId: string | null;
  locationName: string | null;
}

export interface ResolvedWebsiteIntake {
  businessId: string;
  businessName: string;
  brandId: string;
  brandName: string;
  siteId: string;
  domain: string;
  locationId: string;
  locationName: string | null;
  notificationEmail: string | null;
}

export function normalizeSiteDomain(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const host = new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return null;
  }
}

function normalizeLabel(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function distinctById<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

export function chooseStoreLocation(
  rows: Array<{ id: string; name: string | null }>,
  spec: StoreSpec,
): { id: string; name: string | null } | null {
  const uniqueRows = distinctById(rows.filter((row) => Boolean(row?.id)));
  if (uniqueRows.length === 0) return null;

  const city = normalizeLabel(spec.city);
  const brand = normalizeLabel(spec.nameLike);
  const cityMatches = uniqueRows.filter((row) => normalizeLabel(row.name).includes(city));

  if (cityMatches.length === 1) return cityMatches[0];
  if (cityMatches.length > 1) {
    const brandedCityMatches = cityMatches.filter((row) => normalizeLabel(row.name).includes(brand));
    if (brandedCityMatches.length === 1) return brandedCityMatches[0];
    throw new Error(
      `Ambiguous location mapping for "${spec.label}": ${cityMatches.length} active locations match "${spec.city}". Assign a single default location to the public site before accepting bookings.`,
    );
  }

  // A one-location business is deterministic even when its location name does
  // not contain the city. Multi-location businesses must never fall back to
  // database row order because that can route Baton Rouge requests to
  // Covington (or vice versa) depending on insertion/order changes.
  if (uniqueRows.length === 1) return uniqueRows[0];

  throw new Error(
    `No deterministic location mapping for "${spec.label}": none of ${uniqueRows.length} active locations contains "${spec.city}". Rename/map the location before accepting public bookings.`,
  );
}

/**
 * Resolve a location selected on an existing website form. The visible form can
 * keep its current labels; this matcher accepts labels such as "Baton Rouge",
 * "Baton Rouge Store", or "I Do Bridal Couture - Covington". It never falls
 * back to row order for a multi-location business.
 */
export function chooseWebsiteSubmissionLocation(
  rows: Array<{ id: string; name: string | null }>,
  locationHint: string,
): { id: string; name: string | null } {
  const uniqueRows = distinctById(rows.filter((row) => Boolean(row?.id)));
  if (uniqueRows.length === 0) throw new Error('No locations are configured for this website business.');

  const hint = normalizeLabel(locationHint);
  if (!hint) throw new Error('A submitted location is required.');

  const exact = uniqueRows.filter((row) => normalizeLabel(row.name) === hint);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new Error(`Location "${locationHint}" matches more than one configured location.`);

  const contains = uniqueRows.filter((row) => {
    const name = normalizeLabel(row.name);
    return Boolean(name) && (name.includes(hint) || hint.includes(name));
  });
  if (contains.length === 1) return contains[0];
  if (contains.length > 1) throw new Error(`Location "${locationHint}" is ambiguous across ${contains.length} locations.`);

  const cityCatalogMatches = Object.values(STORE_CATALOG)
    .filter((spec) => hint.includes(normalizeLabel(spec.city)))
    .map((spec) => normalizeLabel(spec.city));
  const cityMatches = uniqueRows.filter((row) => cityCatalogMatches.some((city) => normalizeLabel(row.name).includes(city)));
  if (cityMatches.length === 1) return cityMatches[0];

  if (uniqueRows.length === 1) return uniqueRows[0];
  throw new Error(`Could not map submitted location "${locationHint}" to a single configured location.`);
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
 * Order of trust: exact business_sites domain match (the canonical "requests
 * from this site belong to this business" mapping) → unambiguous businesses.name
 * match. Location is matched by city within that business only. A business with
 * one location may use that sole location; a multi-location business with no
 * deterministic city match fails closed instead of guessing.
 */
export async function resolveStore(db: SupabaseClient, storeKey: StoreKey): Promise<ResolvedStore> {
  const hit = CACHE.get(storeKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const spec = STORE_CATALOG[storeKey];

  let businessId: string | null = null;
  let businessName: string | null = null;

  const bySite = await db
    .from('business_sites')
    .select('business_id,domain,status')
    .ilike('domain', `%${spec.domain}%`)
    .limit(20);
  if (bySite.error) throw new Error(`Website mapping lookup failed for "${spec.domain}": ${bySite.error.message}`);

  const exactSiteMappings = ((bySite.data ?? []) as Array<{ business_id: string | null; domain: string | null; status?: string | null }>)
    .filter((row) => row.business_id && normalizeSiteDomain(row.domain) === normalizeSiteDomain(spec.domain))
    .filter((row) => !row.status || String(row.status).toUpperCase() === 'ACTIVE');
  const siteBusinessIds = [...new Set(exactSiteMappings.map((row) => String(row.business_id)))];
  if (siteBusinessIds.length > 1) {
    throw new Error(`Website domain "${spec.domain}" is mapped to more than one active business. Public booking is blocked until the duplicate tenant mapping is removed.`);
  }
  if (siteBusinessIds.length === 1) {
    businessId = siteBusinessIds[0];
    const biz = await db.from('businesses').select('id, name').eq('id', businessId).maybeSingle();
    if (biz.error) throw new Error(`Business lookup failed for website "${spec.domain}": ${biz.error.message}`);
    businessName = (biz.data?.name as string) ?? spec.label;
  }

  if (!businessId) {
    const byName = await db
      .from('businesses')
      .select('id, name')
      .ilike('name', `%${spec.nameLike}%`)
      .limit(20);
    if (byName.error) throw new Error(`Business lookup failed for "${spec.nameLike}": ${byName.error.message}`);

    const nameMatches = distinctById(((byName.data ?? []) as Array<{ id: string; name: string | null }>).filter((row) => Boolean(row.id)));
    const liveMatches = nameMatches.filter((row) => !/demo/i.test(row.name ?? ''));
    if (liveMatches.length > 1) {
      throw new Error(`Business name match "${spec.nameLike}" resolved to ${liveMatches.length} live businesses. Configure business_sites for "${spec.domain}" before accepting public bookings.`);
    }
    if (liveMatches.length === 1) {
      businessId = liveMatches[0].id;
      businessName = liveMatches[0].name;
    } else if (nameMatches.length > 0) {
      throw new Error(`Demo businesses cannot accept live public bookings: "${nameMatches[0].name ?? spec.nameLike}"`);
    }
  }

  if (businessName && /demo/i.test(businessName)) {
    throw new Error(`Demo businesses cannot accept live public bookings: "${businessName}"`);
  }

  if (!businessId) {
    throw new Error(
      `No business found for "${spec.label}" - expected an active business_sites row for "${spec.domain}" or one unambiguous business named like "${spec.nameLike}".`,
    );
  }

  const locs = await db
    .from('locations')
    .select('id, name')
    .eq('business_id', businessId)
    .limit(50);
  if (locs.error) throw new Error(`Location lookup failed for "${spec.label}": ${locs.error.message}`);
  const rows = (locs.data ?? []) as Array<{ id: string; name: string | null }>;
  const chosen = chooseStoreLocation(rows, spec);

  const value: ResolvedStore = {
    storeKey,
    businessId,
    businessName: businessName ?? spec.label,
    brandId: null,
    siteId: null,
    locationId: chosen?.id ?? null,
    locationName: chosen?.name ?? null,
  };
  CACHE.set(storeKey, { value, at: Date.now() });
  return value;
}

/**
 * Resolves a new organization's public site without any business-name fallback.
 * A website may accept bookings only when it is active and explicitly owns one
 * brand and default location in the same organization.
 */
export async function resolveWebsiteIntake(db: SupabaseClient, requestedDomain: string): Promise<ResolvedWebsiteIntake> {
  const domain = normalizeSiteDomain(requestedDomain);
  if (!domain) throw new Error('A valid website domain is required.');

  const { data, error } = await db
    .from('business_sites')
    .select('id,business_id,brand_id,location_id,name,domain,status,booking_enabled,notification_email')
    .ilike('domain', `%${domain}%`)
    .limit(10);
  if (error) throw new Error(`Website lookup failed: ${error.message}`);

  const matches = ((data ?? []) as Array<Record<string, unknown>>).filter((site) =>
    normalizeSiteDomain(String(site.domain ?? '')) === domain &&
    String(site.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE' &&
    site.booking_enabled === true,
  );
  if (matches.length !== 1) {
    throw new Error(matches.length > 1
      ? `Website domain "${domain}" has more than one active booking mapping.`
      : `Website domain "${domain}" is not configured for public booking.`);
  }

  const site = matches[0];
  if (!site.brand_id || !site.location_id || !site.business_id) {
    throw new Error(`Website domain "${domain}" needs an assigned brand and default location.`);
  }

  const [{ data: business }, { data: brand }, { data: location }] = await Promise.all([
    db.from('businesses').select('id,name').eq('id', site.business_id).maybeSingle(),
    db.from('business_brands').select('id,business_id,name').eq('id', site.brand_id).maybeSingle(),
    db.from('locations').select('id,business_id,name').eq('id', site.location_id).maybeSingle(),
  ]);
  if (!business?.id || !brand?.id || !location?.id || brand.business_id !== site.business_id || location.business_id !== site.business_id) {
    throw new Error(`Website domain "${domain}" has an invalid organization mapping.`);
  }

  return {
    businessId: String(site.business_id),
    businessName: String(business.name ?? site.name ?? domain),
    brandId: String(site.brand_id),
    brandName: String(brand.name ?? site.name ?? domain),
    siteId: String(site.id),
    domain,
    locationId: String(site.location_id),
    locationName: location.name ? String(location.name) : null,
    notificationEmail: typeof site.notification_email === 'string' ? site.notification_email : null,
  };
}

/**
 * Resolve a shadow copy from an existing website form. Unlike the hosted form,
 * one domain can legitimately represent multiple boutiques, so the submitted
 * location is authoritative and must resolve to exactly one location in the
 * business. This is the bridge used by Powerful Form -> Make/Zapier/n8n.
 */
export async function resolveWebsiteSubmissionIntake(
  db: SupabaseClient,
  requestedDomain: string,
  locationHint: string,
): Promise<ResolvedWebsiteIntake> {
  const domain = normalizeSiteDomain(requestedDomain);
  if (!domain) throw new Error('A valid website domain is required.');

  const { data, error } = await db
    .from('business_sites')
    .select('id,business_id,brand_id,location_id,name,domain,status,booking_enabled,notification_email')
    .ilike('domain', `%${domain}%`)
    .limit(20);
  if (error) throw new Error(`Website lookup failed: ${error.message}`);

  const matches = ((data ?? []) as Array<Record<string, unknown>>).filter((site) =>
    normalizeSiteDomain(String(site.domain ?? '')) === domain &&
    String(site.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE' &&
    site.booking_enabled === true,
  );
  if (!matches.length) throw new Error(`Website domain "${domain}" is not configured for public booking.`);

  const businessIds = [...new Set(matches.map((site) => String(site.business_id ?? '')).filter(Boolean))];
  if (businessIds.length !== 1) {
    throw new Error(`Website domain "${domain}" must map to exactly one active business before form bridging is enabled.`);
  }
  const businessId = businessIds[0];

  const brandIds = [...new Set(matches.map((site) => String(site.brand_id ?? '')).filter(Boolean))];
  if (brandIds.length !== 1) {
    throw new Error(`Website domain "${domain}" must map to exactly one brand before form bridging is enabled.`);
  }
  const brandId = brandIds[0];

  const [{ data: business, error: businessError }, { data: brand, error: brandError }, locationsResult] = await Promise.all([
    db.from('businesses').select('id,name').eq('id', businessId).maybeSingle(),
    db.from('business_brands').select('id,business_id,name').eq('id', brandId).maybeSingle(),
    db.from('locations').select('id,business_id,name').eq('business_id', businessId).limit(50),
  ]);
  if (businessError) throw new Error(`Business lookup failed for "${domain}": ${businessError.message}`);
  if (brandError) throw new Error(`Brand lookup failed for "${domain}": ${brandError.message}`);
  if (locationsResult.error) throw new Error(`Location lookup failed for "${domain}": ${locationsResult.error.message}`);
  if (!business?.id || !brand?.id || brand.business_id !== businessId) {
    throw new Error(`Website domain "${domain}" has an invalid business/brand mapping.`);
  }

  const chosen = chooseWebsiteSubmissionLocation(
    (locationsResult.data ?? []) as Array<{ id: string; name: string | null }>,
    locationHint,
  );

  const siteForLocation = matches.filter((site) => String(site.location_id ?? '') === chosen.id);
  let site: Record<string, unknown>;
  if (siteForLocation.length === 1) site = siteForLocation[0];
  else if (siteForLocation.length > 1) {
    throw new Error(`Website domain "${domain}" has duplicate booking mappings for location "${chosen.name ?? locationHint}".`);
  } else if (matches.length === 1) {
    // One site can represent a multi-location brand. The form's location choice
    // supplies the operational location while the site row remains the source.
    site = matches[0];
  } else {
    throw new Error(`Website domain "${domain}" has multiple site rows and none is assigned to location "${chosen.name ?? locationHint}".`);
  }

  return {
    businessId,
    businessName: String(business.name ?? site.name ?? domain),
    brandId,
    brandName: String(brand.name ?? site.name ?? domain),
    siteId: String(site.id),
    domain,
    locationId: chosen.id,
    locationName: chosen.name,
    notificationEmail: typeof site.notification_email === 'string' ? site.notification_email : null,
  };
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
