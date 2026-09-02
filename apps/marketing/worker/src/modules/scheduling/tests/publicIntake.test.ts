/**
 * Public intake tests.
 *
 * The catalog keys are load-bearing: the booking page sends 'ido-br' etc.
 * verbatim, and the Shopify embeds rely on the domain mapping to land requests
 * in the right business. If someone renames a key/domain or reintroduces an
 * order-dependent location fallback, these fail before production does.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STORE_CATALOG,
  buildRequestNotes,
  chooseStoreLocation,
  chooseWebsiteSubmissionLocation,
  clearStoreCache,
  isStoreKey,
  normalizeSiteDomain,
  resolveStore,
  resolveWebsiteIntake,
  resolveWebsiteSubmissionIntake,
  sanitizeSource,
} from '../publicIntake';

test('catalog covers all four boutiques and both retail domains', () => {
  assert.deepEqual(Object.keys(STORE_CATALOG).sort(), ['ido-br', 'ido-cov', 'pc-br', 'pc-cov']);
  assert.equal(STORE_CATALOG['ido-br'].domain, 'idobridalcouture.com');
  assert.equal(STORE_CATALOG['ido-cov'].domain, 'idobridalcouture.com');
  assert.equal(STORE_CATALOG['pc-br'].domain, 'properandcompany.com');
  assert.equal(STORE_CATALOG['pc-cov'].domain, 'properandcompany.com');
});

test('store keys are validated, not trusted', () => {
  assert.equal(isStoreKey('pc-cov'), true);
  assert.equal(isStoreKey('demo-business'), false);
  assert.equal(isStoreKey(''), false);
  assert.equal(isStoreKey(undefined), false);
});

test('website domains normalize before matching a registered site', () => {
  assert.equal(normalizeSiteDomain('HTTPS://BRIDAL.EXAMPLE.COM/path'), 'bridal.example.com');
  assert.equal(normalizeSiteDomain('www.bridal.example.com'), 'bridal.example.com');
  assert.equal(normalizeSiteDomain('bridal.example.com'), 'bridal.example.com');
  assert.equal(normalizeSiteDomain('not a domain'), null);
});

test('intake source is whitelisted', () => {
  assert.equal(sanitizeSource('shopify-properandcompany'), 'shopify-properandcompany');
  assert.equal(sanitizeSource('shopify-idobridalcouture'), 'shopify-idobridalcouture');
  assert.equal(sanitizeSource('  Booking-Page '), 'booking-page');
  assert.equal(sanitizeSource('<script>alert(1)</script>'), 'booking-page');
  assert.equal(sanitizeSource(undefined), 'booking-page');
  assert.equal(sanitizeSource('a'.repeat(80)), 'booking-page');
});

test('request notes carry every fact the stylist needs, skip absent ones', () => {
  const notes = buildRequestNotes({
    name: 'Amy', email: 'a@b.c', store: 'pc-br', date: '2026-09-01', time: '10:00 AM',
    type: 'Bridal Consultation', lookingFor: 'Ball gown', budgetCents: 250000,
    weddingDate: '2027-05-01', phone: '225-555-0101', smsOptIn: true,
    totalCents: 7500, brandLabel: 'Visa', paymentIntentId: 'pi_123',
  });
  assert.match(notes, /Type: Bridal Consultation/);
  assert.match(notes, /Looking for: Ball gown/);
  assert.match(notes, /Budget: \$2500\.00/);
  assert.match(notes, /Wedding date: 2027-05-01/);
  assert.match(notes, /Phone: 225-555-0101 \(SMS ok\)/);
  assert.match(notes, /Booking fee paid: \$75\.00 on Visa — Stripe ref pi_123/);

  const sparse = buildRequestNotes({ name: 'B', email: 'b@c.d', store: 'ido-br', date: '2026-09-01', time: '1:00 PM' });
  assert.equal(sparse, '');
});

/** Minimal chainable stub that mimics the supabase-js query builder. */
function stubDb(tables: Record<string, any[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const chain: any = {
        _rows: rows,
        select() { return chain; },
        ilike(col: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          chain._rows = chain._rows.filter((r: any) => String(r[col] ?? '').toLowerCase().includes(needle));
          return chain;
        },
        eq(col: string, v: unknown) {
          chain._rows = chain._rows.filter((r: any) => r[col] === v);
          return chain;
        },
        limit() { return chain; },
        maybeSingle() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        then(resolve: any) { resolve({ data: chain._rows, error: null }); },
      };
      return chain;
    },
  } as any;
}

test('domain mapping wins over name matching and picks the city location', async () => {
  clearStoreCache();
  const db = stubDb({
    business_sites: [{ business_id: 'uuid-proper', domain: 'https://properandcompany.com', status: 'ACTIVE' }],
    businesses: [
      { id: 'uuid-proper', name: 'Proper & Company' },
      { id: 'uuid-impostor', name: 'A Proper Impostor LLC' },
    ],
    locations: [
      { id: 'loc-br', business_id: 'uuid-proper', name: 'Proper & Co. - Baton Rouge' },
      { id: 'loc-cov', business_id: 'uuid-proper', name: 'Proper & Co. - Covington' },
    ],
  });
  const r = await resolveStore(db, 'pc-cov');
  assert.equal(r.businessId, 'uuid-proper');
  assert.equal(r.locationId, 'loc-cov');
  assert.equal(r.locationName, 'Proper & Co. - Covington');
});

test('city-only location names route correctly regardless of database row order', async () => {
  clearStoreCache();
  const db = stubDb({
    business_sites: [{ business_id: 'uuid-proper', domain: 'properandcompany.com', status: 'ACTIVE' }],
    businesses: [{ id: 'uuid-proper', name: 'Proper & Company' }],
    // Intentionally reversed: the old implementation silently picked rows[0]
    // because the names did not also contain the brand string.
    locations: [
      { id: 'loc-cov', business_id: 'uuid-proper', name: 'Covington' },
      { id: 'loc-br', business_id: 'uuid-proper', name: 'Baton Rouge' },
    ],
  });

  const br = await resolveStore(db, 'pc-br');
  assert.equal(br.locationId, 'loc-br');
  assert.equal(br.locationName, 'Baton Rouge');

  clearStoreCache();
  const cov = await resolveStore(db, 'pc-cov');
  assert.equal(cov.locationId, 'loc-cov');
  assert.equal(cov.locationName, 'Covington');
});

test('a sole location is a safe fallback and no locations remains nullable', async () => {
  clearStoreCache();
  const noSite = stubDb({
    business_sites: [],
    businesses: [{ id: 'uuid-ido', name: 'I Do Bridal Couture' }],
    locations: [{ id: 'loc-x', business_id: 'uuid-ido', name: 'Main Boutique' }],
  });
  const r = await resolveStore(noSite, 'ido-br');
  assert.equal(r.businessId, 'uuid-ido');
  assert.equal(r.locationId, 'loc-x', 'a one-location business is deterministic');

  clearStoreCache();
  const noLocs = stubDb({
    business_sites: [],
    businesses: [{ id: 'uuid-ido', name: 'I Do Bridal Couture' }],
    locations: [],
  });
  const r2 = await resolveStore(noLocs, 'ido-cov');
  assert.equal(r2.locationId, null);
});

test('multi-location intake fails closed when the requested city cannot be mapped', async () => {
  clearStoreCache();
  const db = stubDb({
    business_sites: [{ business_id: 'uuid-proper', domain: 'properandcompany.com', status: 'ACTIVE' }],
    businesses: [{ id: 'uuid-proper', name: 'Proper & Company' }],
    locations: [
      { id: 'loc-1', business_id: 'uuid-proper', name: 'Northshore Boutique' },
      { id: 'loc-2', business_id: 'uuid-proper', name: 'Capital Boutique' },
    ],
  });

  await assert.rejects(
    () => resolveStore(db, 'pc-br'),
    /No deterministic location mapping.*Baton Rouge/i,
    'multi-location booking must never guess from database row order',
  );
});

test('duplicate city mappings fail closed instead of choosing an arbitrary location', () => {
  assert.throws(
    () => chooseStoreLocation([
      { id: 'loc-br-1', name: 'Baton Rouge' },
      { id: 'loc-br-2', name: 'Baton Rouge Bridal District' },
    ], STORE_CATALOG['pc-br']),
    /Ambiguous location mapping/i,
  );
});

test('a domain mapped to multiple businesses is rejected', async () => {
  clearStoreCache();
  const db = stubDb({
    business_sites: [
      { business_id: 'biz-1', domain: 'properandcompany.com', status: 'ACTIVE' },
      { business_id: 'biz-2', domain: 'https://www.properandcompany.com', status: 'ACTIVE' },
    ],
    businesses: [
      { id: 'biz-1', name: 'Proper & Company One' },
      { id: 'biz-2', name: 'Proper & Company Two' },
    ],
    locations: [],
  });

  await assert.rejects(() => resolveStore(db, 'pc-cov'), /mapped to more than one active business/i);
});

test('an unmapped store throws an actionable error instead of writing anywhere', async () => {
  clearStoreCache();
  const empty = stubDb({ business_sites: [], businesses: [], locations: [] });
  await assert.rejects(
    () => resolveStore(empty, 'pc-br'),
    /properandcompany\.com|proper/i,
    'the error must name what mapping is missing',
  );
});

test('a demo business is never chosen even if it is the only match', async () => {
  clearStoreCache();
  const demoOnly = stubDb({
    business_sites: [],
    businesses: [{ id: 'uuid-demo', name: 'Proper & Company (Demo)' }],
    locations: [{ id: 'loc-demo', business_id: 'uuid-demo', name: 'Proper & Co. - Baton Rouge' }],
  });

  await assert.rejects(
    () => resolveStore(demoOnly, 'pc-br'),
    /Demo businesses cannot accept live public bookings/i,
    'the demo guard must reject the resolution',
  );
});

test('ambiguous live business-name fallback is rejected', async () => {
  clearStoreCache();
  const db = stubDb({
    business_sites: [],
    businesses: [
      { id: 'biz-1', name: 'Proper & Company' },
      { id: 'biz-2', name: 'Proper Bridal Holdings' },
    ],
    locations: [],
  });
  await assert.rejects(() => resolveStore(db, 'pc-br'), /resolved to 2 live businesses/i);
});

test('website booking resolves only an active site with a scoped brand and location', async () => {
  const db = stubDb({
    business_sites: [{
      id: 'site-1', business_id: 'biz-1', brand_id: 'brand-1', location_id: 'loc-1',
      name: 'Aster Bridal', domain: 'https://aster.example.com', status: 'ACTIVE', booking_enabled: true,
      notification_email: 'appointments@aster.example.com',
    }],
    businesses: [{ id: 'biz-1', name: 'Roberts Enterprises' }],
    business_brands: [{ id: 'brand-1', business_id: 'biz-1', name: 'Aster Bridal' }],
    locations: [{ id: 'loc-1', business_id: 'biz-1', name: 'Aster Baton Rouge' }],
  });

  const site = await resolveWebsiteIntake(db, 'https://aster.example.com/book');
  assert.equal(site.businessId, 'biz-1');
  assert.equal(site.brandId, 'brand-1');
  assert.equal(site.locationId, 'loc-1');
  assert.equal(site.notificationEmail, 'appointments@aster.example.com');
});

test('website booking rejects a disabled or cross-business mapping', async () => {
  const disabled = stubDb({
    business_sites: [{ id: 'site-1', business_id: 'biz-1', brand_id: 'brand-1', location_id: 'loc-1', domain: 'disabled.example.com', status: 'ACTIVE', booking_enabled: false }],
  });
  await assert.rejects(() => resolveWebsiteIntake(disabled, 'disabled.example.com'), /not configured/i);

  const mismatched = stubDb({
    business_sites: [{ id: 'site-1', business_id: 'biz-1', brand_id: 'brand-1', location_id: 'loc-2', domain: 'wrong.example.com', status: 'ACTIVE', booking_enabled: true }],
    businesses: [{ id: 'biz-1', name: 'Roberts Enterprises' }],
    business_brands: [{ id: 'brand-1', business_id: 'biz-1', name: 'Aster Bridal' }],
    locations: [{ id: 'loc-2', business_id: 'biz-other', name: 'Other Store' }],
  });
  await assert.rejects(() => resolveWebsiteIntake(mismatched, 'wrong.example.com'), /invalid organization mapping/i);
});

/**
 * Regression: Roberts Enterprises runs two brands (I Do Bridal Couture and
 * Proper & Co) in the same two cities, so the organization holds two locations
 * whose names both contain "Baton Rouge". Matching a submitted city across
 * every location in the organization is ambiguous by construction and used to
 * reject every form-bridge submission. Candidates must be scoped to the brand
 * that owns the site.
 */
test('a two-brand organization routes a submitted city to the site brand location', async () => {
  const db = stubDb({
    business_sites: [{
      id: 'site-ido', business_id: 'roberts', brand_id: 'brand-ido', location_id: 'ido-br',
      name: 'I Do Bridal Couture', domain: 'idobridalcouture.com', status: 'ACTIVE', booking_enabled: true,
    }],
    businesses: [{ id: 'roberts', name: 'Roberts Enterprises' }],
    business_brands: [{ id: 'brand-ido', business_id: 'roberts', name: 'I Do Bridal Couture' }],
    locations: [
      { id: 'ido-br', business_id: 'roberts', brand_id: 'brand-ido', name: 'I Do Bridal Couture - Baton Rouge' },
      { id: 'ido-cov', business_id: 'roberts', brand_id: 'brand-ido', name: 'I Do Bridal Couture - Covington' },
      { id: 'pc-br', business_id: 'roberts', brand_id: 'brand-pc', name: 'Proper & Co. - Baton Rouge' },
      { id: 'pc-cov', business_id: 'roberts', brand_id: 'brand-pc', name: 'Proper & Co. - Covington' },
    ],
  });

  const brSite = await resolveWebsiteSubmissionIntake(db, 'idobridalcouture.com', 'Baton Rouge');
  assert.equal(brSite.businessId, 'roberts');
  assert.equal(brSite.brandId, 'brand-ido');
  assert.equal(brSite.locationId, 'ido-br', 'Baton Rouge must resolve to the I Do store, not Proper & Co.');

  const covSite = await resolveWebsiteSubmissionIntake(db, 'idobridalcouture.com', 'Covington');
  assert.equal(covSite.locationId, 'ido-cov');
});

test('brand scoping falls back to the organization when the brand owns no locations', async () => {
  const db = stubDb({
    business_sites: [{
      id: 'site-1', business_id: 'biz-1', brand_id: 'brand-1', location_id: 'loc-1',
      name: 'Aster Bridal', domain: 'aster.example.com', status: 'ACTIVE', booking_enabled: true,
    }],
    businesses: [{ id: 'biz-1', name: 'Aster Holdings' }],
    business_brands: [{ id: 'brand-1', business_id: 'biz-1', name: 'Aster Bridal' }],
    // brand_id not yet backfilled on the location rows
    locations: [
      { id: 'loc-1', business_id: 'biz-1', brand_id: null, name: 'Aster - Baton Rouge' },
      { id: 'loc-2', business_id: 'biz-1', brand_id: null, name: 'Aster - Covington' },
    ],
  });

  const site = await resolveWebsiteSubmissionIntake(db, 'aster.example.com', 'Covington');
  assert.equal(site.locationId, 'loc-2', 'unbackfilled tenants must keep working');
});

/**
 * The hosted booking page resolves by city across the whole organization too.
 * Post-consolidation Roberts has four active locations, two per city, so this
 * pins the brand tiebreak that keeps ido-br off the Proper & Co. storefront.
 */
test('the hosted booking page disambiguates four locations across two brands', () => {
  const roberts = [
    { id: 'ido-br', name: 'I Do Bridal Couture - Baton Rouge' },
    { id: 'ido-cov', name: 'I Do Bridal Couture - Covington' },
    { id: 'pc-br', name: 'Proper & Co. - Baton Rouge' },
    { id: 'pc-cov', name: 'Proper & Co. - Covington' },
  ];

  assert.equal(chooseStoreLocation(roberts, STORE_CATALOG['ido-br'])?.id, 'ido-br');
  assert.equal(chooseStoreLocation(roberts, STORE_CATALOG['ido-cov'])?.id, 'ido-cov');
  assert.equal(chooseStoreLocation(roberts, STORE_CATALOG['pc-br'])?.id, 'pc-br');
  assert.equal(chooseStoreLocation(roberts, STORE_CATALOG['pc-cov'])?.id, 'pc-cov');
});

/**
 * The same four locations under their pre-consolidation city-only names are
 * genuinely ambiguous. This is why the data script renames them: the rename is
 * load-bearing, not cosmetic, and this test fails if someone reverts it.
 */
test('city-only location names are rejected rather than guessed', () => {
  const cityOnly = [
    { id: 'ido-br', name: 'Baton Rouge' },
    { id: 'ido-cov', name: 'Covington' },
    { id: 'pc-br', name: 'Baton Rouge' },
    { id: 'pc-cov', name: 'Covington' },
  ];

  assert.throws(() => chooseStoreLocation(cityOnly, STORE_CATALOG['ido-br']), /Ambiguous location mapping/i);
  assert.throws(
    () => chooseWebsiteSubmissionLocation(cityOnly, 'Baton Rouge'),
    /matches more than one configured location/i,
  );
});
