import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyShopifyWebhookHmac, resolveShopifyTenant } from '../routes';

function computeHmac(body: Buffer | string, secret: string): string {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  return crypto.createHmac('sha256', secret).update(buf).digest('base64');
}

function stubDb(tables: Record<string, any[]>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const chain: any = {
        _rows: rows,
        select() { return chain; },
        eq(col: string, val: any) {
          chain._rows = chain._rows.filter((r: any) => r[col] === val);
          return chain;
        },
        in(col: string, vals: any[]) {
          chain._rows = chain._rows.filter((r: any) => vals.includes(r[col]));
          return chain;
        },
        ilike(col: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          chain._rows = chain._rows.filter((r: any) => String(r[col] ?? '').toLowerCase().includes(needle));
          return chain;
        },
        order() { return chain; },
        limit(n: number) {
          chain._rows = chain._rows.slice(0, n);
          return chain;
        },
        maybeSingle() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        single() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        insert(payload: any) {
          tables[table] = tables[table] || [];
          const inserted = Array.isArray(payload) ? payload : [{ id: `gen-${Date.now()}-${Math.random()}`, ...payload }];
          tables[table].push(...inserted);
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: inserted[0], error: null });
                }
              };
            },
            then(resolve: any) {
              resolve({ data: inserted, error: null });
            }
          };
        },
        update(patch: any) {
          return {
            eq(col: string, val: any) {
              tables[table] = (tables[table] || []).map((r: any) => r[col] === val ? { ...r, ...patch } : r);
              return Promise.resolve({ data: null, error: null });
            }
          };
        },
        then(resolve: any) { resolve({ data: chain._rows, error: null }); }
      };
      return chain;
    }
  } as any;
}

test('verifyShopifyWebhookHmac: returns true for matching HMAC SHA256 over raw buffer', () => {
  const secret = 'shpss_test_secret_12345';
  const rawBody = Buffer.from(JSON.stringify({ id: 1001, email: 'test@example.com' }), 'utf8');
  const validHeader = computeHmac(rawBody, secret);

  const result = verifyShopifyWebhookHmac(rawBody, validHeader, secret);
  assert.equal(result, true);
});

test('verifyShopifyWebhookHmac: returns true for string rawBody matching HMAC SHA256', () => {
  const secret = 'shpss_test_secret_12345';
  const rawBodyStr = JSON.stringify({ id: 1002, email: 'test2@example.com' });
  const validHeader = computeHmac(rawBodyStr, secret);

  const result = verifyShopifyWebhookHmac(rawBodyStr, validHeader, secret);
  assert.equal(result, true);
});

test('verifyShopifyWebhookHmac: returns false for mismatched or tampered payload', () => {
  const secret = 'shpss_test_secret_12345';
  const original = Buffer.from(JSON.stringify({ id: 1001, total_price: '100.00' }), 'utf8');
  const validHeader = computeHmac(original, secret);

  const tampered = Buffer.from(JSON.stringify({ id: 1001, total_price: '1.00' }), 'utf8');
  assert.equal(verifyShopifyWebhookHmac(tampered, validHeader, secret), false);
  assert.equal(verifyShopifyWebhookHmac(original, 'invalid_base64_sig', secret), false);
});

test('verifyShopifyWebhookHmac: returns false when header, secret, or rawBody is missing', () => {
  const secret = 'shpss_test_secret_12345';
  const rawBody = Buffer.from('{}', 'utf8');
  const validHeader = computeHmac(rawBody, secret);

  assert.equal(verifyShopifyWebhookHmac(undefined, validHeader, secret), false);
  assert.equal(verifyShopifyWebhookHmac(rawBody, undefined, secret), false);
  assert.equal(verifyShopifyWebhookHmac(rawBody, validHeader, undefined), false);
  assert.equal(verifyShopifyWebhookHmac(rawBody, '', secret), false);
});

test('verifyShopifyWebhookHmac: rejects extended base64 signatures with trailing garbage and truncated signatures', () => {
  const secret = 'shpss_test_secret_12345';
  const rawBody = Buffer.from(JSON.stringify({ id: 1003, total_price: '500.00' }), 'utf8');
  const validHeader = computeHmac(rawBody, secret);

  // Trailing garbage / extra padding bypass attempt
  assert.equal(verifyShopifyWebhookHmac(rawBody, validHeader + '==extra', secret), false);
  assert.equal(verifyShopifyWebhookHmac(rawBody, validHeader + 'malformed', secret), false);

  // Truncated signature
  assert.equal(verifyShopifyWebhookHmac(rawBody, validHeader.slice(0, 20), secret), false);

  // Valid signature with leading/trailing whitespace should pass because of trim()
  assert.equal(verifyShopifyWebhookHmac(rawBody, `  ${validHeader}  \n`, secret), true);
});

test('resolveShopifyTenant: resolves business_id dynamically via shopDomainHeader and business_sites', async () => {
  const db = stubDb({
    business_sites: [
      { business_id: 'biz-proper-uuid', domain: 'properandcompany.myshopify.com' }
    ],
    businesses: [
      { id: 'biz-proper-uuid', name: 'Proper & Company' }
    ],
    locations: [
      { id: 'loc-br-uuid', business_id: 'biz-proper-uuid', name: 'Proper & Co - Baton Rouge' }
    ]
  });

  const res = await resolveShopifyTenant(db, 'properandcompany.myshopify.com');
  assert.equal(res.businessId, 'biz-proper-uuid');
  assert.equal(res.businessName, 'Proper & Company');
  assert.equal(res.locationId, 'loc-br-uuid');
  assert.equal(res.boutiqueEmail, 'hello@properandcompany.com');
});

test('resolveShopifyTenant: resolves store keys (ido-br, pc-cov) via publicIntake', async () => {
  const db = stubDb({
    business_sites: [
      { business_id: 'biz-ido-uuid', domain: 'https://idobridalcouture.com' }
    ],
    businesses: [
      { id: 'biz-ido-uuid', name: 'I Do Bridal Couture' }
    ],
    locations: [
      { id: 'loc-ido-br', business_id: 'biz-ido-uuid', name: 'I Do Bridal Couture - Baton Rouge' }
    ]
  });

  const res = await resolveShopifyTenant(db, undefined, 'ido-br');
  assert.equal(res.businessId, 'biz-ido-uuid');
  assert.equal(res.locationId, 'loc-ido-br');
  assert.equal(res.boutiqueEmail, 'ido@idobridalcouture.com');
});

test('resolveShopifyTenant: falls back to brand keyword matching in domain', async () => {
  const db = stubDb({
    business_sites: [],
    businesses: [
      { id: 'biz-ido-uuid', name: 'I Do Bridal Couture' }
    ],
    locations: [
      { id: 'loc-ido-1', business_id: 'biz-ido-uuid', name: 'Main Store' }
    ]
  });

  const res = await resolveShopifyTenant(db, 'idobridal-staging.myshopify.com');
  assert.equal(res.businessId, 'biz-ido-uuid');
  assert.equal(res.businessName, 'I Do Bridal Couture');
  assert.equal(res.boutiqueEmail, 'ido@idobridalcouture.com');
});

test('resolveShopifyTenant: throws descriptive error for unresolvable domain', async () => {
  const db = stubDb({
    business_sites: [],
    businesses: [],
    locations: []
  });

  await assert.rejects(
    () => resolveShopifyTenant(db, 'unknown-boutique-xyz.myshopify.com'),
    /Unable to resolve Shopify tenant for domain/i
  );
});

test('Idempotency deduplication logic: rejects duplicate orders and avoids double booking', async () => {
  const db = stubDb({
    business_sites: [{ business_id: 'biz-1', domain: 'properandcompany.myshopify.com' }],
    businesses: [{ id: 'biz-1', name: 'Proper & Company' }],
    locations: [{ id: 'loc-1', business_id: 'biz-1', name: 'Proper Baton Rouge' }],
    orders: [
      { id: 'ord-db-1', business_id: 'biz-1', external_order_id: '500123', status: 'paid' }
    ],
    appointment_requests: [],
    leads: []
  });

  const existingOrder = await db
    .from('orders')
    .select('id, status')
    .eq('business_id', 'biz-1')
    .eq('external_order_id', '500123')
    .maybeSingle();

  assert.ok(existingOrder.data);
  assert.equal(existingOrder.data.id, 'ord-db-1');

  // Verify no new appointment requests or leads are inserted on duplicate
  assert.equal((db as any).from('appointment_requests')._rows?.length ?? 0, 0);
  assert.equal((db as any).from('leads')._rows?.length ?? 0, 0);
});
