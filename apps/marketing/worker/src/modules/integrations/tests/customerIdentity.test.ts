import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCustomerEmail,
  normalizeCustomerPhone,
  resolveIntegrationCustomer,
} from '../customerIdentity';

function stubDb(initial: Record<string, any[]>) {
  const tables = Object.fromEntries(Object.entries(initial).map(([key, rows]) => [key, rows.map((row) => ({ ...row }))]));
  const db: any = {
    tables,
    from(table: string) {
      tables[table] ||= [];
      let rows = [...tables[table]];
      const chain: any = {
        select() { return chain; },
        eq(column: string, value: any) {
          rows = rows.filter((row: any) => row[column] === value);
          return chain;
        },
        limit(n: number) { rows = rows.slice(0, n); return chain; },
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        insert(payload: any) {
          const row = { id: payload.id || `generated-${tables[table].length + 1}`, ...payload };
          tables[table].push(row);
          return {
            select: () => ({ single: async () => ({ data: row, error: null }) }),
            then: (resolve: any) => resolve({ data: [row], error: null }),
          };
        },
        delete() {
          return {
            eq(column: string, value: any) {
              tables[table] = tables[table].filter((row: any) => row[column] !== value);
              return { eq: async () => ({ data: null, error: null }) };
            },
          };
        },
        then(resolve: any) { return resolve({ data: rows, error: null }); },
      };
      return chain;
    },
  };
  return db;
}

test('identity normalization is deterministic', () => {
  assert.equal(normalizeCustomerEmail('  Bride@Example.COM '), 'bride@example.com');
  assert.equal(normalizeCustomerEmail('not-an-email'), null);
  assert.equal(normalizeCustomerPhone('(225) 555-1212'), '+12255551212');
  assert.equal(normalizeCustomerPhone('+44 20 7946 0958'), '+442079460958');
});

test('provider identity wins before email/phone matching', async () => {
  const db = stubDb({
    customer_external_identities: [
      { business_id: 'org-a', provider: 'SHOPIFY', external_id: 'customer-1', customer_id: 'cust-provider' },
    ],
    customers: [
      { id: 'cust-email', business_id: 'org-a', email: 'same@example.com', phone: '+12255550000' },
    ],
  });

  const result = await resolveIntegrationCustomer(db, {
    businessId: 'org-a',
    provider: 'shopify',
    externalId: 'customer-1',
    email: 'same@example.com',
    phone: '+1 225-555-0000',
  });
  assert.equal(result.customerId, 'cust-provider');
  assert.equal(result.resolution, 'PROVIDER_ID');
});

test('email matching never crosses organizations', async () => {
  const db = stubDb({
    customer_external_identities: [],
    customers: [
      { id: 'cust-a', business_id: 'org-a', email: 'bride@example.com', phone: null },
      { id: 'cust-b', business_id: 'org-b', email: 'bride@example.com', phone: null },
    ],
  });

  const result = await resolveIntegrationCustomer(db, {
    businessId: 'org-b',
    provider: 'shopify',
    email: 'Bride@Example.com',
  });
  assert.equal(result.customerId, 'cust-b');
  assert.equal(result.resolution, 'EMAIL');
});

test('insufficient identity is unresolved instead of synthetic customer creation', async () => {
  const db = stubDb({ customer_external_identities: [], customers: [] });
  const result = await resolveIntegrationCustomer(db, {
    businessId: 'org-a',
    provider: 'shopify',
    externalId: 'anonymous-provider-id',
  });
  assert.equal(result.customerId, null);
  assert.equal(result.resolution, 'UNRESOLVED');
  assert.equal(db.tables.customers.length, 0);
});

test('new customer creation requires real name plus email or phone and records provider identity', async () => {
  const db = stubDb({ customer_external_identities: [], customers: [] });
  const result = await resolveIntegrationCustomer(db, {
    businessId: 'org-a',
    provider: 'shopify',
    externalId: 'shop-customer-22',
    name: 'Jane Bride',
    email: 'JANE@example.com',
    phone: '(225) 555-2222',
    locationId: 'loc-a',
  });

  assert.equal(result.resolution, 'CREATED');
  assert.ok(result.customerId);
  assert.equal(db.tables.customers.length, 1);
  assert.equal(db.tables.customers[0].email, 'jane@example.com');
  assert.equal(db.tables.customers[0].phone, '+12255552222');
  assert.equal(db.tables.customer_external_identities.length, 1);
  assert.equal(db.tables.customer_external_identities[0].external_id, 'shop-customer-22');
});
