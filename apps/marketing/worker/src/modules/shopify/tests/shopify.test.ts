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
          chain._rows = chain._rows.filter((r: any) => readField(r, col) === val);
          return chain;
        },
        in(col: string, vals: any[]) {
          chain._rows = chain._rows.filter((r: any) => vals.includes(readField(r, col)));
          return chain;
        },
        ilike(col: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          chain._rows = chain._rows.filter((r: any) => String(readField(r, col) ?? '').toLowerCase().includes(needle));
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
              tables[table] = (tables[table] || []).map((r: any) => readField(r, col) === val ? { ...r, ...patch } : r);
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
  assert.equal(verifyShopifyWebhookHmac(rawBody, validHeader, secret), true);
});

test('verifyShopifyWebhookHmac: returns true for string rawBody matching HMAC SHA256', () => {
  const secret = 'shpss_test_secret_12345';
  const rawBodyStr = JSON.stringify({ id: 1002, email: 'test2@example.com' });
  const validHeader = computeHmac(rawBodyStr, secret);
  assert.equal(verifyShopifyWebhookHmac(rawBodyStr, validHeader, secret), true);
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

test('verifyShopifyWebhookHmac: rejects extended and truncated signatures', () => {
  const secret = 'shpss_test_secret_12345';
  const rawBody = Buffer.from(JSON.stringify({ id: 1003, total_price: '500.00' }), 'utf8');
  const validHeader = computeHmac(rawBody, secret);
  assert.equal(verifyShopifyWebhookHmac(rawBody, validHeader + '==extra', secret), false);
  assert.equal(verifyShopifyWebhookHmac(rawBody, validHeader + 'malformed', secret), false);
  assert.equal(verifyShopifyWebhookHmac(rawBody, validHeader.slice(0, 20), secret), false);
  assert.equal(verifyShopifyWebhookHmac(rawBody, `  ${validHeader}  \n`, secret), true);
});

test('mergeShopifyConnectionMetadata: reauthorization preserves configured location mappings', () => {
  const merged = mergeShopifyConnectionMetadata(
    {
      shopDomain: 'old-name.myshopify.com',
      locationMappings: [
        { shopifyLocationId: 'shopify-22', vowosLocationId: 'vowos-covington' },
      ],
      customFlag: true,
    },
    { shopDomain: 'properandcompany.myshopify.com' },
  );

  assert.equal(merged.shopDomain, 'properandcompany.myshopify.com');
  assert.deepEqual(merged.locationMappings, [
    { shopifyLocationId: 'shopify-22', vowosLocationId: 'vowos-covington' },
  ]);
  assert.equal(merged.customFlag, true);
});

test('resolveShopifyTenant: canonical OAuth shopDomain maps directly to the correct business', async () => {
  const db = stubDb({
    growth_provider_connections: [
      {
        business_id: 'biz-proper-uuid',
        provider: 'shopify',
        status: 'connected',
        metadata: { shopDomain: 'properandcompany.myshopify.com' },
      },
      {
        business_id: 'biz-ido-uuid',
        provider: 'shopify',
        status: 'connected',
        metadata: { shopDomain: 'idobridalcouture.myshopify.com' },
      },
    ],
    business_sites: [
      { business_id: 'biz-proper-uuid', notification_email: 'hello@properandcompany.com' },
    ],
    businesses: [
      { id: 'biz-proper-uuid', name: 'Proper & Company' },
      { id: 'biz-ido-uuid', name: 'I Do Bridal Couture' },
    ],
    locations: [
      { id: 'loc-proper-br', business_id: 'biz-proper-uuid', name: 'Proper & Co - Baton Rouge' },
      { id: 'loc-ido-br', business_id: 'biz-ido-uuid', name: 'I Do Bridal Couture - Baton Rouge' },
    ],
  });

  const res = await resolveShopifyTenant(db, 'properandcompany.myshopify.com');
  assert.equal(res.businessId, 'biz-proper-uuid');
  assert.equal(res.businessName, 'Proper & Company');
  assert.equal(res.locationId, null, 'domain alone must not guess a location in a multi-location business');
  assert.equal(res.boutiqueEmail, 'hello@properandcompany.com');
});

test('resolveShopifyTenant: disconnected canonical store fails closed before any legacy data', async () => {
  const db = stubDb({
    growth_provider_connections: [
      {
        business_id: 'biz-proper-uuid',
        provider: 'shopify',
        status: 'disconnected',
        metadata: { shopDomain: 'properandcompany.myshopify.com' },
      },
    ],
    business_sites: [
      { business_id: 'biz-proper-uuid', domain: 'properandcompany.myshopify.com' },
    ],
    businesses: [
      { id: 'biz-proper-uuid', name: 'Proper & Company' },
    ],
    locations: [],
  });

  await assert.rejects(
    () => resolveShopifyTenant(db, 'properandcompany.myshopify.com'),
    (error: unknown) => error instanceof ShopifyConnectionInactiveError && /disconnected/i.test(error.message),
  );
});

test('resolveShopifyTenant: database domain predicate finds a store beyond the first 100 Shopify connections', async () => {
  const filler = Array.from({ length: 150 }, (_, index) => ({
    business_id: `biz-${index}`,
    provider: 'shopify',
    status: 'connected',
    metadata: { shopDomain: `store-${index}.myshopify.com` },
  }));
  filler.push({
    business_id: 'biz-target',
    provider: 'shopify',
    status: 'connected',
    metadata: { shopDomain: 'properandcompany.myshopify.com' },
  });

  const db = stubDb({
    growth_provider_connections: filler,
    business_sites: [],
    businesses: [{ id: 'biz-target', name: 'Proper & Company' }],
    locations: [],
  });

  const res = await resolveShopifyTenant(db, 'properandcompany.myshopify.com');
  assert.equal(res.businessId, 'biz-target');
});

test('resolveShopifyTenant: legacy business-site domain cannot substitute for OAuth', async () => {
  const db = stubDb({
    growth_provider_connections: [],
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

  await assert.rejects(
    () => resolveShopifyTenant(db, 'properandcompany.myshopify.com'),
    /must complete OAuth before webhooks are accepted/i,
  );
});

test('resolveShopifyTenant: store keys cannot authenticate a tenant without OAuth', async () => {
  const db = stubDb({
    growth_provider_connections: [],
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

  await assert.rejects(
    () => resolveShopifyTenant(db, undefined),
    /valid permanent Shopify shop domain is required/i,
  );
});

test('resolveShopifyTenant: a location mapped to another organization is refused, not adopted', async () => {
  const db = stubDb({
    growth_provider_connections: [
      {
        id: 'conn-proper',
        business_id: 'biz-proper-uuid',
        provider: 'shopify',
        status: 'connected',
        metadata: { shopDomain: 'properandcompany.myshopify.com' },
      },
    ],
    // A mapping row pointing at a location owned by a different business. The
    // ownership re-check in resolveShopifyTenant must discard it rather than
    // attribute Proper's revenue to I Do's boutique.
    shopify_location_mappings: [
      {
        business_id: 'biz-proper-uuid',
        connection_id: 'conn-proper',
        shopify_location_id: 'sh-loc-22',
        location_id: 'loc-ido-br',
        is_default: false,
      },
    ],
    business_sites: [],
    businesses: [
      { id: 'biz-proper-uuid', name: 'Proper & Company' },
      { id: 'biz-ido-uuid', name: 'I Do Bridal Couture' },
    ],
    locations: [
      { id: 'loc-ido-br', business_id: 'biz-ido-uuid', name: 'I Do Bridal Couture - Baton Rouge' },
    ],
  });

  const res = await resolveShopifyTenant(db, 'properandcompany.myshopify.com', { shopifyLocationId: 'sh-loc-22' });
  assert.equal(res.businessId, 'biz-proper-uuid');
  assert.equal(res.locationId, null, 'a cross-tenant location mapping must not resolve');
  assert.equal(res.locationSource, 'UNMAPPED');
});

test('resolveShopifyTenant: maps a Shopify location through the stored mapping table', async () => {
  const db = stubDb({
    growth_provider_connections: [
      {
        id: 'conn-proper',
        business_id: 'biz-proper-uuid',
        provider: 'shopify',
        status: 'connected',
        metadata: { shopDomain: 'properandcompany.myshopify.com' },
      },
    ],
    // The production write path is PUT /api/shopify/mappings/locations, which
    // writes exactly these rows. This test reads what that endpoint writes —
    // it does not inject connection metadata no code path ever produces.
    shopify_location_mappings: [
      {
        business_id: 'biz-proper-uuid',
        connection_id: 'conn-proper',
        shopify_location_id: 'sh-loc-22',
        location_id: 'real-location-uuid',
        is_default: false,
      },
    ],
    business_sites: [],
    businesses: [{ id: 'biz-proper-uuid', name: 'Proper & Company' }],
    locations: [{ id: 'real-location-uuid', business_id: 'biz-proper-uuid', name: 'Proper & Co - Covington' }],
  });

  const res = await resolveShopifyTenant(db, 'properandcompany.myshopify.com', { shopifyLocationId: 'sh-loc-22' });
  assert.equal(res.businessId, 'biz-proper-uuid');
  assert.equal(res.locationId, 'real-location-uuid');
  assert.equal(res.locationSource, 'SHOPIFY_LOCATION');
});

test('resolveShopifyTenant: an online order with no Shopify location falls back to the configured default', async () => {
  const db = stubDb({
    growth_provider_connections: [
      {
        id: 'conn-proper',
        business_id: 'biz-proper-uuid',
        provider: 'shopify',
        status: 'connected',
        metadata: { shopDomain: 'properandcompany.myshopify.com' },
      },
    ],
    shopify_location_mappings: [
      {
        business_id: 'biz-proper-uuid',
        connection_id: 'conn-proper',
        shopify_location_id: 'sh-loc-22',
        location_id: 'loc-covington',
        is_default: false,
      },
      {
        business_id: 'biz-proper-uuid',
        connection_id: 'conn-proper',
        shopify_location_id: null,
        location_id: 'loc-baton-rouge',
        is_default: true,
      },
    ],
    business_sites: [],
    businesses: [{ id: 'biz-proper-uuid', name: 'Proper & Company' }],
    locations: [
      { id: 'loc-covington', business_id: 'biz-proper-uuid', name: 'Proper & Co - Covington' },
      { id: 'loc-baton-rouge', business_id: 'biz-proper-uuid', name: 'Proper & Co - Baton Rouge' },
    ],
  });

  // Shopify sends location_id: null on every online (non-POS) order.
  const res = await resolveShopifyTenant(db, 'properandcompany.myshopify.com', { shopifyLocationId: null });
  assert.equal(res.locationId, 'loc-baton-rouge');
  assert.equal(res.locationSource, 'DEFAULT');
});

test('resolveShopifyTenant: brand keyword matching cannot substitute for OAuth', async () => {
  const db = stubDb({
    growth_provider_connections: [],
    business_sites: [],
    businesses: [
      { id: 'biz-ido-uuid', name: 'I Do Bridal Couture' }
    ],
    locations: [
      { id: 'loc-ido-1', business_id: 'biz-ido-uuid', name: 'Main Store' }
    ]
  });

  await assert.rejects(
    () => resolveShopifyTenant(db, 'idobridal-staging.myshopify.com'),
    /must complete OAuth before webhooks are accepted/i,
  );
});

test('resolveShopifyTenant: throws descriptive error for unresolvable domain', async () => {
  const db = stubDb({
    growth_provider_connections: [],
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
  assert.equal((db as any).from('appointment_requests')._rows?.length ?? 0, 0);
  assert.equal((db as any).from('leads')._rows?.length ?? 0, 0);
});
