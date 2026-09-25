/**
 * Shopify privacy webhook tests.
 *
 * The previous implementation returned 200 and wrote a to-do note. It would
 * have passed any test that only checked the status code, which is precisely
 * why these assert on the database instead: was the customer actually redacted,
 * did the export actually contain the person's rows, and did a retry avoid
 * doing the work twice.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  externalCustomerId,
  handleShopifyPrivacyRequest,
  privacyRequestKey,
} from '../compliance';

const SHOP = 'idobridalcouture.myshopify.com';
const BUSINESS = 'biz-roberts';
const BRAND_IDO = 'brand-ido';

function readField(row: any, column: string): any {
  if (column.includes('->>')) {
    const [table, key] = column.split('->>');
    return row?.[table]?.[key];
  }
  return row?.[column];
}

/**
 * Minimal Supabase double. Filters are applied for real so a query that forgets
 * its business_id predicate returns another tenant's rows and fails the test,
 * rather than passing because the double ignored the filter.
 */
function fakeDb(tables: Record<string, any[]>) {
  let seq = 0;
  const api: any = {
    tables,
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      let mode: 'select' | 'delete' = 'select';
      let patch: any = null;

      const chain: any = {
        select() { return chain; },
        eq(col: string, val: any) { rows = rows.filter((r) => readField(r, col) === val); return chain; },
        ilike(col: string, pattern: string) {
          const needle = String(pattern).replace(/%/g, '').toLowerCase();
          rows = rows.filter((r) => String(readField(r, col) ?? '').toLowerCase().includes(needle));
          return chain;
        },
        order() { return chain; },
        limit(n: number) { rows = rows.slice(0, n); return chain; },
        maybeSingle() { return Promise.resolve({ data: rows[0] ?? null, error: null }); },
        single() { return Promise.resolve({ data: rows[0] ?? null, error: null }); },
        then(resolve: any) {
          if (mode === 'delete') {
            const doomed = new Set(rows);
            tables[table] = (tables[table] ?? []).filter((r) => !doomed.has(r));
            return resolve({ data: null, error: null });
          }
          if (patch) {
            const targets = new Set(rows);
            tables[table] = (tables[table] ?? []).map((r) => (targets.has(r) ? Object.assign(r, patch) : r));
            return resolve({ data: null, error: null });
          }
          return resolve({ data: rows, error: null });
        },
        insert(payload: any) {
          seq += 1;
          const row = { id: `row-${seq}`, ...payload };
          tables[table] = tables[table] ?? [];
          tables[table].push(row);
          return {
            select() { return { single: () => Promise.resolve({ data: row, error: null }) }; },
            then: (resolve: any) => resolve({ data: [row], error: null }),
          };
        },
        update(next: any) { patch = next; return chain; },
        delete() { mode = 'delete'; return chain; },
      };
      return chain;
    },
  };
  return api;
}

function seed() {
  return fakeDb({
    growth_provider_connections: [
      { id: 'conn-1', business_id: BUSINESS, provider: 'shopify', metadata: { shopDomain: SHOP, brandId: BRAND_IDO } },
    ],
    customer_external_identities: [
      { id: 'cei-1', business_id: BUSINESS, provider: 'SHOPIFY', external_id: '7788', customer_id: 'cus-1' },
    ],
    customers: [
      { id: 'cus-1', business_id: BUSINESS, name: 'Amelia Rae', email: 'amelia@example.com', phone: '+15550142' },
      { id: 'cus-2', business_id: 'biz-other', name: 'Someone Else', email: 'other@example.com', phone: '+15550199' },
    ],
    orders: [
      { id: 'ord-1', business_id: BUSINESS, brand_id: BRAND_IDO, customer_id: 'cus-1', source_type: 'SHOPIFY', order_number: '#1001' },
      { id: 'ord-2', business_id: BUSINESS, brand_id: 'brand-proper', customer_id: 'cus-1', source_type: 'SHOPIFY', order_number: '#2001' },
    ],
    appointment_requests: [
      { id: 'req-1', business_id: BUSINESS, customer_id: 'cus-1', status: 'NEW' },
    ],
    shopify_privacy_requests: [],
  });
}

const dataRequest = (payload: any = { customer: { id: 7788 } }) => ({
  topic: 'customers/data_request' as const,
  shopDomain: SHOP,
  webhookId: 'wh-1',
  rawBody: Buffer.from(JSON.stringify(payload)),
  payload,
});

test('a data request returns the customer, and only the orders for the shop that asked', async () => {
  const db = seed();
  const outcome = await handleShopifyPrivacyRequest(db, dataRequest());

  assert.equal(outcome.status, 'processed');
  const result = outcome.result as any;
  assert.equal(result.customer.email, 'amelia@example.com');
  assert.equal(result.appointmentRequests.length, 1);

  // Roberts runs two brands under one organization. A request from the I Do
  // storefront must not hand back the same person's Proper order.
  assert.deepEqual(result.orders.map((o: any) => o.order_number), ['#1001']);
});

test('a redaction actually blanks the customer and drops the Shopify link', async () => {
  const db = seed();
  const outcome = await handleShopifyPrivacyRequest(db, {
    ...dataRequest(),
    topic: 'customers/redact',
    webhookId: 'wh-2',
  });

  assert.equal(outcome.status, 'processed');
  const customer = db.tables.customers.find((c: any) => c.id === 'cus-1');
  assert.equal(customer.email, null);
  assert.equal(customer.phone, null);
  assert.notEqual(customer.name, 'Amelia Rae');
  assert.equal(db.tables.customer_external_identities.length, 0);

  // The row survives: orders reference it, and deleting it would take the
  // merchant's own financial records with it.
  assert.ok(customer);
});

test('another tenant is untouched by a redaction', async () => {
  const db = seed();
  await handleShopifyPrivacyRequest(db, { ...dataRequest(), topic: 'customers/redact', webhookId: 'wh-3' });
  const other = db.tables.customers.find((c: any) => c.id === 'cus-2');
  assert.equal(other.email, 'other@example.com');
});

test('a Shopify retry does not redact twice', async () => {
  const db = seed();
  const first = await handleShopifyPrivacyRequest(db, { ...dataRequest(), topic: 'customers/redact', webhookId: 'wh-4' });
  assert.equal(first.status, 'processed');

  // Shopify retries for 48 hours. If the customer row were reused in the
  // meantime, a second run would blank a live record.
  db.tables.customers[0].name = 'A New Bride';
  db.tables.customers[0].email = 'new@example.com';

  const second = await handleShopifyPrivacyRequest(db, { ...dataRequest(), topic: 'customers/redact', webhookId: 'wh-4' });
  assert.equal(second.status, 'duplicate');
  assert.equal(db.tables.customers[0].email, 'new@example.com');
});

test('a shop with no VowOS connection is answered honestly, not silently', async () => {
  const db = seed();
  db.tables.growth_provider_connections = [];
  const outcome = await handleShopifyPrivacyRequest(db, dataRequest());
  assert.equal(outcome.status, 'processed');
  assert.equal((outcome.result as any).customerFound, false);
  assert.equal((outcome.result as any).reason, 'NO_CONNECTION_FOR_SHOP');
});

test('two connections claiming one domain fail rather than guess a tenant', async () => {
  const db = seed();
  db.tables.growth_provider_connections.push({
    id: 'conn-2', business_id: 'biz-other', provider: 'shopify', metadata: { shopDomain: SHOP },
  });
  await assert.rejects(() => handleShopifyPrivacyRequest(db, dataRequest()), /more than one VowOS connection/);
});

test('shop/redact removes the linkage and records what it kept', async () => {
  const db = seed();
  const outcome = await handleShopifyPrivacyRequest(db, {
    ...dataRequest({ shop_id: 42 }),
    topic: 'shop/redact',
    webhookId: 'wh-5',
  });

  assert.equal(outcome.status, 'processed');
  assert.equal(db.tables.growth_provider_connections.length, 0);
  assert.equal(db.tables.customer_external_identities.length, 0);

  // Deleting a boutique's sales history because they uninstalled an app would
  // be the more serious failure. The decision is recorded, not implicit.
  assert.equal(db.tables.orders.length, 2);
  assert.ok((outcome.result as any).retained.includes('orders'));
});

test('the idempotency key falls back to the body when Shopify sends no webhook id', () => {
  const base = { topic: 'customers/redact' as const, shopDomain: SHOP, payload: {}, rawBody: Buffer.from('{"customer":{"id":1}}') };
  const a = privacyRequestKey({ ...base, webhookId: null });
  const b = privacyRequestKey({ ...base, webhookId: '   ' });
  const different = privacyRequestKey({ ...base, rawBody: Buffer.from('{"customer":{"id":2}}') });

  assert.equal(a, b);
  assert.notEqual(a, different);
  assert.ok(a.startsWith('customers/redact:body:'));
});

test('the customer id is read from either payload shape Shopify sends', () => {
  assert.equal(externalCustomerId({ customer: { id: 991 } }), '991');
  assert.equal(externalCustomerId({ customer_id: 992 }), '992');
  assert.equal(externalCustomerId({ shop_id: 5 }), null);
});
