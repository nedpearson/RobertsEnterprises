import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyShopifyWebhookHmac, resolveShopifyTenant, ShopifyConnectionInactiveError } from '../routes';
import { mergeShopifyConnectionMetadata } from '../store';

function computeHmac(body: Buffer | string, secret: string): string {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  return crypto.createHmac('sha256', secret).update(buf).digest('base64');
}

function readField(row: Record<string, any>, column: string): any {
  const jsonPath = column.match(/^([^>]+)->>(.+)$/);
  if (!jsonPath) return row[column];
  return row[jsonPath[1]]?.[jsonPath[2]];
}

function stubDb(tables: Record<string, any[]>) {
  return {
    from(table: string) {
      const chain: any = {
        _rows: [...(tables[table] ?? [])],
        select() { return chain; },
        eq(col: string, val: any) {
          chain._rows = chain._rows.filter((row: any) => readField(row, col) === val);
          return chain;
        },
        ilike(col: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          chain._rows = chain._rows.filter((row: any) => String(readField(row, col) ?? '').toLowerCase().includes(needle));
          return chain;
        },
        limit(n: number) {
          chain._rows = chain._rows.slice(0, n);
          return chain;
        },
        order() { return chain; },
        maybeSingle() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        single() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        then(resolve: any) { resolve({ data: chain._rows, error: null }); },
      };
      return chain;
    },
  } as any;
}

test('verifyShopifyWebhookHmac: accepts an exact raw-body signature', () => {
  const secret = 'shpss_test_secret_12345';
  const rawBody = Buffer.from(JSON.stringify({ id: 1001, email: 'test@example.com' }), 'utf8');
  assert.equal(verifyShopifyWebhookHmac(rawBody, computeHmac(rawBody, secret), secret), true);
});

test('verifyShopifyWebhookHmac: rejects tampering, truncation, and missing values', () => {
  const secret = 'shpss_test_secret_12345';
  const original = Buffer.from(JSON.stringify({ id: 1001, total_price: '100.00' }), 'utf8');
  const signature = computeHmac(original, secret);
  const tampered = Buffer.from(JSON.stringify({ id: 1001, total_price: '1.00' }), 'utf8');
  assert.equal(verifyShopifyWebhookHmac(tampered, signature, secret), false);
  assert.equal(verifyShopifyWebhookHmac(original, signature.slice(0, 20), secret), false);
  assert.equal(verifyShopifyWebhookHmac(undefined, signature, secret), false);
  assert.equal(verifyShopifyWebhookHmac(original, undefined, secret), false);
  assert.equal(verifyShopifyWebhookHmac(original, signature, undefined), false);
  assert.equal(verifyShopifyWebhookHmac(original, `  ${signature}  \n`, secret), true);
});

test('mergeShopifyConnectionMetadata: reauthorization preserves configured location mappings', () => {
  const merged = mergeShopifyConnectionMetadata(
    {
      shopDomain: 'old-name.myshopify.com',
      brandId: 'brand-proper',
      locationMappings: [{ shopifyLocationId: 'shopify-22', vowosLocationId: 'vowos-covington' }],
      customFlag: true,
    },
    { shopDomain: 'properandcompany.myshopify.com', webhooksProvisionedAt: '2026-08-23T00:00:00Z' },
  );
  assert.equal(merged.shopDomain, 'properandcompany.myshopify.com');
  assert.equal(merged.brandId, 'brand-proper');
  assert.deepEqual(merged.locationMappings, [{ shopifyLocationId: 'shopify-22', vowosLocationId: 'vowos-covington' }]);
  assert.equal(merged.customFlag, true);
});

function robertsDb(shopDomain: string, brandId: 'brand-ido' | 'brand-proper', overrides: Record<string, any[]> = {}) {
  const brandName = brandId === 'brand-ido' ? 'I Do Bridal Couture' : 'Proper & Company';
  const email = brandId === 'brand-ido' ? 'ido@idobridalcouture.com' : 'hello@properandcompany.com';
  return stubDb({
    growth_provider_connections: [{
      id: `conn-${brandId}`,
      business_id: 'biz-roberts',
      provider: 'shopify',
      status: 'connected',
      metadata: { shopDomain, brandId },
    }],
    businesses: [{ id: 'biz-roberts', name: 'Roberts Enterprises' }],
    business_brands: [
      { id: 'brand-ido', business_id: 'biz-roberts', name: 'I Do Bridal Couture' },
      { id: 'brand-proper', business_id: 'biz-roberts', name: 'Proper & Company' },
    ],
    business_sites: [{ business_id: 'biz-roberts', brand_id: brandId, notification_email: email }],
    locations: [],
    ...overrides,
  });
}

test('resolveShopifyTenant: Proper stays under Roberts Enterprises and binds only to Proper', async () => {
  const db = robertsDb('properandcompany.myshopify.com', 'brand-proper');
  const result = await resolveShopifyTenant(db, 'properandcompany.myshopify.com');
  assert.equal(result.connectionId, 'conn-brand-proper');
  assert.equal(result.businessId, 'biz-roberts');
  assert.equal(result.brandId, 'brand-proper');
  assert.equal(result.brandName, 'Proper & Company');
  assert.deepEqual(result.notificationEmails, ['hello@properandcompany.com']);
  assert.equal(result.locationId, null);
});

test('resolveShopifyTenant: I Do stays under Roberts Enterprises and binds only to I Do', async () => {
  const db = robertsDb('idobridalcouture.myshopify.com', 'brand-ido');
  const result = await resolveShopifyTenant(db, 'idobridalcouture.myshopify.com');
  assert.equal(result.businessId, 'biz-roberts');
  assert.equal(result.brandId, 'brand-ido');
  assert.equal(result.brandName, 'I Do Bridal Couture');
  assert.equal(result.boutiqueEmail, 'ido@idobridalcouture.com');
});

test('resolveShopifyTenant: Shopify location id may refine location only inside the OAuth-bound business', async () => {
  const db = stubDb({
    growth_provider_connections: [{
      id: 'conn-proper',
      business_id: 'biz-roberts',
      provider: 'shopify',
      status: 'connected',
      metadata: {
        shopDomain: 'properandcompany.myshopify.com',
        brandId: 'brand-proper',
        locationMappings: [{ shopifyLocationId: 'sh-loc-22', vowosLocationId: 'loc-proper-cov' }],
      },
    }],
    businesses: [{ id: 'biz-roberts', name: 'Roberts Enterprises' }],
    business_brands: [{ id: 'brand-proper', business_id: 'biz-roberts', name: 'Proper & Company' }],
    business_sites: [{ business_id: 'biz-roberts', brand_id: 'brand-proper', notification_email: 'hello@properandcompany.com' }],
    locations: [{ id: 'loc-proper-cov', business_id: 'biz-roberts', name: 'Proper & Company - Covington' }],
  });
  const result = await resolveShopifyTenant(db, 'properandcompany.myshopify.com', undefined, 'sh-loc-22');
  assert.equal(result.locationId, 'loc-proper-cov');
});

test('resolveShopifyTenant: disconnected canonical store fails closed', async () => {
  const db = stubDb({
    growth_provider_connections: [{
      id: 'conn-proper',
      business_id: 'biz-roberts',
      provider: 'shopify',
      status: 'disconnected',
      metadata: { shopDomain: 'properandcompany.myshopify.com', brandId: 'brand-proper' },
    }],
  });
  await assert.rejects(
    () => resolveShopifyTenant(db, 'properandcompany.myshopify.com'),
    (error: unknown) => error instanceof ShopifyConnectionInactiveError && /disconnected/i.test(error.message),
  );
});

test('resolveShopifyTenant: a connected store without exact brand_id fails closed', async () => {
  const db = stubDb({
    growth_provider_connections: [{
      id: 'legacy-conn',
      business_id: 'biz-roberts',
      provider: 'shopify',
      status: 'connected',
      metadata: { shopDomain: 'properandcompany.myshopify.com' },
    }],
  });
  await assert.rejects(
    () => resolveShopifyTenant(db, 'properandcompany.myshopify.com'),
    /no exact VowOS brand binding/i,
  );
});

test('resolveShopifyTenant: business-site and name lookalikes cannot replace OAuth binding', async () => {
  const db = stubDb({
    growth_provider_connections: [],
    businesses: [{ id: 'biz-roberts', name: 'Roberts Enterprises' }],
    business_brands: [{ id: 'brand-ido', business_id: 'biz-roberts', name: 'I Do Bridal Couture' }],
    business_sites: [{
      business_id: 'biz-roberts', brand_id: 'brand-ido', domain: 'idobridalcouture.myshopify.com', notification_email: 'ido@idobridalcouture.com',
    }],
    locations: [],
  });
  await assert.rejects(
    () => resolveShopifyTenant(db, 'idobridalcouture.myshopify.com'),
    /not OAuth-bound to VowOS/i,
  );
});

test('resolveShopifyTenant: arbitrary unknown domain fails closed', async () => {
  const db = stubDb({ growth_provider_connections: [], businesses: [], business_brands: [], business_sites: [], locations: [] });
  await assert.rejects(
    () => resolveShopifyTenant(db, 'unknown-boutique-xyz.myshopify.com'),
    /not OAuth-bound to VowOS/i,
  );
});
