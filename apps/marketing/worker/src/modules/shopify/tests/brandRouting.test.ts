import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveShopifyTenant } from '../routes';

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
        maybeSingle() {
          return Promise.resolve({ data: chain._rows[0] ?? null, error: null });
        },
        then(resolve: any) {
          resolve({ data: chain._rows, error: null });
        },
      };
      return chain;
    },
  } as any;
}

test('Shopify canonical connection routes I Do under the Roberts parent to the I Do brand', async () => {
  const db = stubDb({
    growth_provider_connections: [{
      business_id: 'biz-roberts',
      provider: 'shopify',
      status: 'connected',
      id: 'conn-ido',
      metadata: {
        shopDomain: 'idobridalcouture.myshopify.com',
        brandId: 'brand-ido',
      },
    }],
    shopify_location_mappings: [{
      business_id: 'biz-roberts',
      connection_id: 'conn-ido',
      shopify_location_id: 'shopify-ido-br',
      location_id: 'loc-ido-br',
      is_default: false,
    }],
    businesses: [{ id: 'biz-roberts', name: 'Roberts Enterprises' }],
    business_brands: [
      { id: 'brand-ido', business_id: 'biz-roberts', name: 'I Do Bridal Couture' },
      { id: 'brand-proper', business_id: 'biz-roberts', name: 'Proper & Company' },
    ],
    business_sites: [{
      business_id: 'biz-roberts',
      brand_id: 'brand-ido',
      domain: 'idobridalcouture.com',
      notification_email: 'ido@idobridalcouture.com',
    }],
    locations: [{ id: 'loc-ido-br', business_id: 'biz-roberts', brand_id: 'brand-ido', name: 'I Do Bridal Couture - Baton Rouge' }],
  });

  const result = await resolveShopifyTenant(db, 'idobridalcouture.myshopify.com', {
    shopifyLocationId: 'shopify-ido-br',
  });

  assert.equal(result.businessId, 'biz-roberts');
  assert.equal(result.brandId, 'brand-ido');
  assert.equal(result.brandName, 'I Do Bridal Couture');
  assert.equal(result.locationId, 'loc-ido-br');
  assert.equal(result.boutiqueEmail, 'ido@idobridalcouture.com');
});

test('Shopify canonical connection routes Proper under the same Roberts parent to Proper only', async () => {
  const db = stubDb({
    growth_provider_connections: [{
      business_id: 'biz-roberts',
      provider: 'shopify',
      status: 'connected',
      metadata: {
        shopDomain: 'properandcompany.myshopify.com',
        brandId: 'brand-proper',
      },
    }],
    businesses: [{ id: 'biz-roberts', name: 'Roberts Enterprises' }],
    business_brands: [
      { id: 'brand-ido', business_id: 'biz-roberts', name: 'I Do Bridal Couture' },
      { id: 'brand-proper', business_id: 'biz-roberts', name: 'Proper & Company' },
    ],
    business_sites: [{
      business_id: 'biz-roberts',
      brand_id: 'brand-proper',
      domain: 'properandcompany.com',
      notification_email: 'hello@properandcompany.com',
    }],
    locations: [],
  });

  const result = await resolveShopifyTenant(db, 'properandcompany.myshopify.com');

  assert.equal(result.businessId, 'biz-roberts');
  assert.equal(result.brandId, 'brand-proper');
  assert.equal(result.brandName, 'Proper & Company');
  assert.equal(result.boutiqueEmail, 'hello@properandcompany.com');
});

test('legacy business-site data cannot substitute for a canonical Shopify OAuth binding', async () => {
  const db = stubDb({
    growth_provider_connections: [],
    businesses: [{ id: 'biz-roberts', name: 'Roberts Enterprises' }],
    business_brands: [{ id: 'brand-ido', business_id: 'biz-roberts', name: 'I Do Bridal Couture' }],
    business_sites: [{
      business_id: 'biz-roberts',
      brand_id: 'brand-ido',
      domain: 'idobridalcouture.myshopify.com',
      notification_email: 'ido@idobridalcouture.com',
    }],
    locations: [],
  });

  await assert.rejects(
    () => resolveShopifyTenant(db, 'idobridalcouture.myshopify.com'),
    /must complete OAuth before webhooks are accepted/i,
  );
});
