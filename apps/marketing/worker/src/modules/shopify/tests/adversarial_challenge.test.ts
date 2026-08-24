import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { resolveShopifyTenant, ShopifyConnectionInactiveError, verifyShopifyWebhookHmac } from '../routes';

function readField(row: Record<string, any>, column: string): any {
  const jsonPath = column.match(/^([^>]+)->>(.+)$/);
  if (!jsonPath) return row[column];
  return row[jsonPath[1]]?.[jsonPath[2]];
}

function stubDb(initial: Record<string, any[]>) {
  const tables = structuredClone(initial);
  return {
    _tables: tables,
    from(table: string) {
      const chain: any = {
        _rows: [...(tables[table] ?? [])],
        select() { return chain; },
        eq(column: string, value: any) {
          chain._rows = chain._rows.filter((row: any) => readField(row, column) === value);
          return chain;
        },
        ilike(column: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          chain._rows = chain._rows.filter((row: any) => String(readField(row, column) ?? '').toLowerCase().includes(needle));
          return chain;
        },
        limit(count: number) {
          chain._rows = chain._rows.slice(0, count);
          return chain;
        },
        maybeSingle() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        then(resolve: any) { resolve({ data: chain._rows, error: null }); },
      };
      return chain;
    },
  } as any;
}

function hmac(body: Buffer | string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('base64');
}

test('adversarial HMAC: exact raw bytes are required', () => {
  const secret = 'shopify-adversarial-secret';
  const raw = Buffer.from('{\n  "id": 1,\n  "name": "Renée 👰"\n}\n', 'utf8');
  const signature = hmac(raw, secret);
  assert.equal(verifyShopifyWebhookHmac(raw, signature, secret), true);

  const reserialized = Buffer.from(JSON.stringify(JSON.parse(raw.toString('utf8'))), 'utf8');
  assert.notDeepEqual(reserialized, raw);
  assert.equal(verifyShopifyWebhookHmac(reserialized, signature, secret), false);
});

test('adversarial HMAC: forged, truncated, extended, and missing signatures fail closed', () => {
  const secret = 'shopify-adversarial-secret';
  const body = Buffer.from('{"id":987,"total":"100.00"}', 'utf8');
  const signature = hmac(body, secret);
  assert.equal(verifyShopifyWebhookHmac(body, signature.slice(0, 12), secret), false);
  assert.equal(verifyShopifyWebhookHmac(body, `${signature}extra`, secret), false);
  assert.equal(verifyShopifyWebhookHmac(body, hmac(Buffer.from('{"id":987,"total":"1.00"}'), secret), secret), false);
  assert.equal(verifyShopifyWebhookHmac(body, undefined, secret), false);
  assert.equal(verifyShopifyWebhookHmac(undefined, signature, secret), false);
  assert.equal(verifyShopifyWebhookHmac(body, signature, undefined), false);
});

test('adversarial routing: same Roberts parent cannot cross-wire I Do and Proper', async () => {
  const db = stubDb({
    growth_provider_connections: [
      {
        id: 'conn-ido',
        business_id: 'biz-roberts',
        provider: 'shopify',
        status: 'connected',
        metadata: {
          shopDomain: 'idobridalcouture.myshopify.com',
          brandId: 'brand-ido',
          locationMappings: [{ shopifyLocationId: 'shopify-ido-br', vowosLocationId: 'loc-ido-br' }],
        },
      },
      {
        id: 'conn-proper',
        business_id: 'biz-roberts',
        provider: 'shopify',
        status: 'connected',
        metadata: {
          shopDomain: 'properandcompany.myshopify.com',
          brandId: 'brand-proper',
          locationMappings: [{ shopifyLocationId: 'shopify-proper-cov', vowosLocationId: 'loc-proper-cov' }],
        },
      },
    ],
    businesses: [{ id: 'biz-roberts', name: 'Roberts Enterprises' }],
    business_brands: [
      { id: 'brand-ido', business_id: 'biz-roberts', name: 'I Do Bridal Couture' },
      { id: 'brand-proper', business_id: 'biz-roberts', name: 'Proper & Company' },
    ],
    business_sites: [
      { business_id: 'biz-roberts', brand_id: 'brand-ido', notification_email: 'ido@idobridalcouture.com' },
      { business_id: 'biz-roberts', brand_id: 'brand-proper', notification_email: 'hello@properandcompany.com' },
    ],
    locations: [
      { id: 'loc-ido-br', business_id: 'biz-roberts', name: 'I Do Bridal Couture - Baton Rouge' },
      { id: 'loc-proper-cov', business_id: 'biz-roberts', name: 'Proper & Company - Covington' },
    ],
  });

  const ido = await resolveShopifyTenant(db, 'idobridalcouture.myshopify.com', undefined, 'shopify-ido-br');
  const proper = await resolveShopifyTenant(db, 'properandcompany.myshopify.com', undefined, 'shopify-proper-cov');

  assert.equal(ido.businessId, 'biz-roberts');
  assert.equal(proper.businessId, 'biz-roberts');
  assert.equal(ido.brandId, 'brand-ido');
  assert.equal(proper.brandId, 'brand-proper');
  assert.equal(ido.locationId, 'loc-ido-br');
  assert.equal(proper.locationId, 'loc-proper-cov');
  assert.deepEqual(ido.notificationEmails, ['ido@idobridalcouture.com']);
  assert.deepEqual(proper.notificationEmails, ['hello@properandcompany.com']);
});

test('adversarial routing: an unbound lookalike domain cannot guess a business or brand', async () => {
  const db = stubDb({
    growth_provider_connections: [],
    businesses: [{ id: 'biz-roberts', name: 'Roberts Enterprises' }],
    business_brands: [{ id: 'brand-ido', business_id: 'biz-roberts', name: 'I Do Bridal Couture' }],
    business_sites: [{ business_id: 'biz-roberts', brand_id: 'brand-ido', domain: 'idobridalcouture.myshopify.com' }],
    locations: [],
  });
  await assert.rejects(
    () => resolveShopifyTenant(db, 'idobridalcouture-staging.myshopify.com'),
    /not OAuth-bound to VowOS/i,
  );
});

test('adversarial routing: duplicate domain bindings are rejected instead of choosing a tenant', async () => {
  const db = stubDb({
    growth_provider_connections: [
      { id: 'conn-a', business_id: 'biz-a', provider: 'shopify', status: 'connected', metadata: { shopDomain: 'shared.myshopify.com', brandId: 'brand-a' } },
      { id: 'conn-b', business_id: 'biz-b', provider: 'shopify', status: 'connected', metadata: { shopDomain: 'shared.myshopify.com', brandId: 'brand-b' } },
    ],
  });
  await assert.rejects(
    () => resolveShopifyTenant(db, 'shared.myshopify.com'),
    /more than one VowOS connection/i,
  );
});

test('adversarial routing: revoked/disconnected connections cannot process intake', async () => {
  for (const status of ['disconnected', 'revoked', 'error']) {
    const db = stubDb({
      growth_provider_connections: [{
        id: `conn-${status}`,
        business_id: 'biz-roberts',
        provider: 'shopify',
        status,
        metadata: { shopDomain: 'properandcompany.myshopify.com', brandId: 'brand-proper' },
      }],
    });
    await assert.rejects(
      () => resolveShopifyTenant(db, 'properandcompany.myshopify.com'),
      (error: unknown) => error instanceof ShopifyConnectionInactiveError,
    );
  }
});
