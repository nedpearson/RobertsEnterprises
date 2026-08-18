/**
 * Public intake tests.
 *
 * The catalog keys are load-bearing: the booking page sends 'ido-br' etc.
 * verbatim, and the Shopify embeds rely on the domain mapping to land requests
 * in the right business. If someone renames a key or a domain, these fail
 * before production does.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STORE_CATALOG,
  buildRequestNotes,
  clearStoreCache,
  isStoreKey,
  resolveStore,
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
    business_sites: [{ business_id: 'uuid-proper', domain: 'https://properandcompany.com' }],
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

test('falls back to name match, first location, then null location', async () => {
  clearStoreCache();
  const noSite = stubDb({
    business_sites: [],
    businesses: [{ id: 'uuid-ido', name: 'I Do Bridal Couture' }],
    locations: [{ id: 'loc-x', business_id: 'uuid-ido', name: 'Main Boutique' }],
  });
  const r = await resolveStore(noSite, 'ido-br');
  assert.equal(r.businessId, 'uuid-ido');
  assert.equal(r.locationId, 'loc-x', 'no city match must fall back to the first location');

  clearStoreCache();
  const noLocs = stubDb({
    business_sites: [],
    businesses: [{ id: 'uuid-ido', name: 'I Do Bridal Couture' }],
    locations: [],
  });
  const r2 = await resolveStore(noLocs, 'ido-cov');
  assert.equal(r2.locationId, null);
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
  // Name matches 'proper', but the full name contains 'demo'
  const demoOnly = stubDb({
    business_sites: [],
    businesses: [{ id: 'uuid-demo', name: 'Proper & Company (Demo)' }],
    locations: [{ id: 'loc-demo', business_id: 'uuid-demo', name: 'Proper & Co. - Baton Rouge' }],
  });
  
  await assert.rejects(
    () => resolveStore(demoOnly, 'pc-br'),
    /Demo businesses cannot accept live public bookings/i,
    'the demo guard must reject the resolution'
  );
});
