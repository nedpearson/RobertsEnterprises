/**
 * Shopify catalog and inventory synchronisation.
 *
 * Replaces worker/src/providers/shopify.ts, which returned a hardcoded
 * `{ success: true, count: 1520 }` without ever contacting Shopify, and whose
 * health check queried columns that do not exist on provider_connections so it
 * always reported disconnected.
 *
 * Everything here reports what it actually did. A sync that wrote nothing says
 * it wrote nothing.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClientForConnection, ShopifyAdminError, type ShopifyAdminClient } from './admin';
import { hasScope } from './oauth';
import { toCents } from './orderMapper';
import type { ShopifyTenant } from './context';

export interface CatalogSyncSummary {
  productsWritten: number;
  variantsWritten: number;
  inventoryLevelsWritten: number;
  skippedUnmappedLocations: number;
  errors: string[];
}

export interface ProductUpsertSummary {
  externalProductId: string;
  productId: string | null;
  variantsWritten: number;
  skipped?: string;
}

const text = (value: unknown, max = 512): string | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

/**
 * Shopify has no concept of a bridal vendor record, but products.vendor_id is
 * NOT NULL. The product's `vendor` string is resolved to a VowOS vendor,
 * creating one where the merchant has not already set it up. An unnamed vendor
 * resolves to a single explicit "Unassigned (Shopify)" record rather than a row
 * per product.
 */
async function resolveVendorId(
  db: SupabaseClient | any,
  businessId: string,
  vendorName: string | null,
  cache: Map<string, string>,
): Promise<string> {
  const name = vendorName?.trim() || 'Unassigned (Shopify)';
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const { data: existing, error } = await db
    .from('vendors')
    .select('id')
    .eq('business_id', businessId)
    .ilike('name', name)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Vendor lookup failed: ${error.message}`);

  if (existing?.id) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const insert = await db
    .from('vendors')
    .insert({ business_id: businessId, name, status: 'Active' })
    .select('id')
    .single();

  if (insert.error) {
    // Lost a race with a concurrent product; adopt the winner.
    const { data: raced } = await db
      .from('vendors')
      .select('id')
      .eq('business_id', businessId)
      .ilike('name', name)
      .limit(1)
      .maybeSingle();
    if (raced?.id) {
      cache.set(key, raced.id);
      return raced.id;
    }
    throw new Error(`Could not create vendor "${name}": ${insert.error.message}`);
  }

  cache.set(key, insert.data.id);
  return insert.data.id;
}

/**
 * Derives a style number.
 *
 * products.style_number is NOT NULL and is what a bridal buyer actually
 * searches by. Shopify has no dedicated field, so precedence is: the first
 * variant SKU, then the product handle, then the Shopify id. Never a fabricated
 * placeholder.
 */
function deriveStyleNumber(product: any): string {
  const variantSku = Array.isArray(product?.variants)
    ? product.variants.map((variant: any) => text(variant?.sku, 128)).find(Boolean)
    : null;
  return variantSku || text(product?.handle, 128) || `shopify-${product?.id}`;
}

function variantColorAndSize(product: any, variant: any): { color: string | null; size: string | null } {
  const options: Array<{ name: string; position: number }> = Array.isArray(product?.options)
    ? product.options.map((option: any) => ({
        name: String(option?.name ?? '').trim().toLowerCase(),
        position: Number(option?.position) || 0,
      }))
    : [];

  const valueAt = (position: number): string | null =>
    text(variant?.[`option${position}`], 128);

  let color: string | null = null;
  let size: string | null = null;

  for (const option of options) {
    const value = valueAt(option.position);
    if (!value) continue;
    if (!color && /colou?r|shade|finish/.test(option.name)) color = value;
    if (!size && /size|length|fit/.test(option.name)) size = value;
  }

  // Shopify's default single-option product uses "Title" / "Default Title".
  if (!size && !color) {
    const first = valueAt(1);
    if (first && first.toLowerCase() !== 'default title') size = first;
  }

  return { color, size };
}

/**
 * Upserts one Shopify product and its variants.
 *
 * Keyed on (business_id, external_product_id) and (business_id,
 * external_variant_id) so a redelivered webhook or a repeated backfill
 * converges rather than duplicating the catalog.
 */
export async function upsertShopifyProduct(
  db: SupabaseClient | any,
  tenant: Pick<ShopifyTenant, 'businessId' | 'brandId'>,
  product: any,
  vendorCache: Map<string, string> = new Map(),
): Promise<ProductUpsertSummary> {
  const externalProductId = product?.id === null || product?.id === undefined ? null : String(product.id);
  if (!externalProductId) {
    return { externalProductId: '', productId: null, variantsWritten: 0, skipped: 'PRODUCT_PAYLOAD_INCOMPLETE' };
  }

  const vendorId = await resolveVendorId(db, tenant.businessId, text(product?.vendor, 256), vendorCache);
  const images = Array.isArray(product?.images) ? product.images.map((image: any) => image?.src).filter(Boolean) : [];

  const productRow = {
    business_id: tenant.businessId,
    vendor_id: vendorId,
    style_number: deriveStyleNumber(product),
    name: text(product?.title, 512),
    description: text(product?.body_html, 8000),
    category: text(product?.product_type, 128),
    status: String(product?.status ?? 'active').toLowerCase() === 'active' ? 'Active' : 'Archived',
    attributes: {
      shopifyTags: text(product?.tags, 2000),
      shopifyHandle: text(product?.handle, 256),
      shopifyStatus: text(product?.status, 64),
    },
    primary_image: images[0] ?? null,
    additional_images: images.slice(1),
    external_product_id: externalProductId,
    external_handle: text(product?.handle, 256),
    external_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existingProduct, error: existingError } = await db
    .from('products')
    .select('id')
    .eq('business_id', tenant.businessId)
    .eq('external_product_id', externalProductId)
    .maybeSingle();
  if (existingError) throw new Error(`Product lookup failed: ${existingError.message}`);

  let productId: string;
  if (existingProduct?.id) {
    const { error } = await db.from('products').update(productRow).eq('id', existingProduct.id);
    if (error) throw new Error(`Product update failed: ${error.message}`);
    productId = existingProduct.id;
  } else {
    const insert = await db.from('products').insert(productRow).select('id').single();
    if (insert.error) throw new Error(`Product insert failed: ${insert.error.message}`);
    productId = insert.data.id;
  }

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const variantRows = variants
    .filter((variant: any) => variant?.id !== null && variant?.id !== undefined)
    .map((variant: any) => {
      const { color, size } = variantColorAndSize(product, variant);
      return {
        business_id: tenant.businessId,
        product_id: productId,
        vendor_sku: text(variant?.sku, 128),
        upc: text(variant?.barcode, 128),
        color,
        size,
        // Shopify has no cost field on the variant REST payload; the merchant's
        // cost lives on the InventoryItem. Left null rather than invented.
        cost_cents: null,
        msrp_cents: variant?.compare_at_price ? toCents(variant.compare_at_price) : null,
        store_retail_cents: toCents(variant?.price),
        active: true,
        external_variant_id: String(variant.id),
        external_inventory_item_id:
          variant?.inventory_item_id === null || variant?.inventory_item_id === undefined
            ? null
            : String(variant.inventory_item_id),
        external_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

  if (variantRows.length) {
    const { error } = await db
      .from('product_variants')
      .upsert(variantRows, { onConflict: 'business_id,external_variant_id' });
    if (error) throw new Error(`Variant upsert failed: ${error.message}`);
  }

  // Variants removed in Shopify are deactivated, never deleted: an order line
  // already references them and a hard delete would orphan sales history.
  const keptIds = variantRows.map((row: any) => row.external_variant_id);
  if (keptIds.length) {
    await db
      .from('product_variants')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('business_id', tenant.businessId)
      .eq('product_id', productId)
      .not('external_variant_id', 'is', null)
      .not('external_variant_id', 'in', `(${keptIds.map((id: string) => `"${id}"`).join(',')})`);
  }

  return { externalProductId, productId, variantsWritten: variantRows.length };
}

/** Archives a product deleted in Shopify without destroying sales history. */
export async function deleteShopifyProduct(
  db: SupabaseClient | any,
  businessId: string,
  externalProductId: string,
): Promise<boolean> {
  const { data: product, error } = await db
    .from('products')
    .select('id')
    .eq('business_id', businessId)
    .eq('external_product_id', externalProductId)
    .maybeSingle();
  if (error) throw new Error(`Product lookup failed: ${error.message}`);
  if (!product?.id) return false;

  const { error: updateError } = await db
    .from('products')
    .update({ status: 'Archived', updated_at: new Date().toISOString() })
    .eq('id', product.id);
  if (updateError) throw new Error(`Could not archive product: ${updateError.message}`);

  await db
    .from('product_variants')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .eq('product_id', product.id);

  return true;
}

/**
 * Applies one inventory level.
 *
 * Requires both a variant carrying the inventory item id (written by catalog
 * sync) and a mapped VowOS location. Either missing means the level is skipped
 * with a stated reason — stock is never written against a guessed location.
 */
export async function applyInventoryLevel(
  db: SupabaseClient | any,
  tenant: Pick<ShopifyTenant, 'businessId' | 'connectionId'>,
  input: { inventoryItemId: string; shopifyLocationId: string; available: number },
): Promise<{ applied: boolean; reason?: string; variantId?: string; locationId?: string }> {
  const { data: variant, error: variantError } = await db
    .from('product_variants')
    .select('id')
    .eq('business_id', tenant.businessId)
    .eq('external_inventory_item_id', input.inventoryItemId)
    .maybeSingle();
  if (variantError) throw new Error(`Variant lookup failed: ${variantError.message}`);
  if (!variant?.id) {
    return { applied: false, reason: 'VARIANT_NOT_SYNCED' };
  }

  const { data: mapping, error: mappingError } = await db
    .from('shopify_location_mappings')
    .select('location_id')
    .eq('business_id', tenant.businessId)
    .eq('connection_id', tenant.connectionId)
    .eq('shopify_location_id', input.shopifyLocationId)
    .maybeSingle();
  if (mappingError) throw new Error(`Location mapping lookup failed: ${mappingError.message}`);
  if (!mapping?.location_id) {
    return { applied: false, reason: 'LOCATION_NOT_MAPPED' };
  }

  const { error } = await db.from('inventory_levels').upsert(
    {
      business_id: tenant.businessId,
      variant_id: variant.id,
      location_id: mapping.location_id,
      available: input.available,
      external_inventory_item_id: input.inventoryItemId,
      external_location_id: input.shopifyLocationId,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'variant_id,location_id' },
  );
  if (error) throw new Error(`Inventory level upsert failed: ${error.message}`);

  return { applied: true, variantId: variant.id, locationId: mapping.location_id };
}

/**
 * Full catalog and inventory backfill for a connection.
 *
 * Returns real counts. If a scope is missing the sync says so and continues
 * with what it can do rather than failing wholesale or claiming success.
 */
export async function syncShopifyCatalog(
  db: SupabaseClient | any,
  tenant: ShopifyTenant,
  options: { admin?: ShopifyAdminClient; includeInventory?: boolean } = {},
): Promise<CatalogSyncSummary> {
  const summary: CatalogSyncSummary = {
    productsWritten: 0,
    variantsWritten: 0,
    inventoryLevelsWritten: 0,
    skippedUnmappedLocations: 0,
    errors: [],
  };

  if (!hasScope(tenant.grantedScopes, 'read_products')) {
    summary.errors.push('This store has not granted read_products. Reconnect Shopify to authorize catalog sync.');
    return summary;
  }

  const admin =
    options.admin ??
    (await adminClientForConnection(db, { id: tenant.connectionId, shopDomain: tenant.shopDomain }));

  let products: any[];
  try {
    products = await admin.paginate<any>('/products.json', 'products', { limit: 250 }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    summary.errors.push(
      error instanceof ShopifyAdminError && error.requiresReauth
        ? `Shopify rejected the catalog request (${error.status}). The store must reconnect to grant read_products.`
        : `Catalog fetch failed: ${message}`,
    );
    return summary;
  }

  const vendorCache = new Map<string, string>();
  for (const product of products) {
    try {
      const result = await upsertShopifyProduct(db, tenant, product, vendorCache);
      if (result.productId) {
        summary.productsWritten += 1;
        summary.variantsWritten += result.variantsWritten;
      }
    } catch (error) {
      summary.errors.push(
        `Product ${product?.id ?? 'unknown'}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (options.includeInventory === false) return summary;

  if (!hasScope(tenant.grantedScopes, 'read_inventory') || !hasScope(tenant.grantedScopes, 'read_locations')) {
    summary.errors.push(
      'Inventory was not synced: this store has not granted read_inventory and read_locations. Reconnect Shopify to authorize stock levels.',
    );
    return summary;
  }

  const { data: mappings, error: mappingError } = await db
    .from('shopify_location_mappings')
    .select('shopify_location_id,location_id')
    .eq('business_id', tenant.businessId)
    .eq('connection_id', tenant.connectionId)
    .not('shopify_location_id', 'is', null);
  if (mappingError) {
    summary.errors.push(`Could not read location mappings: ${mappingError.message}`);
    return summary;
  }

  const mappedLocations = (mappings ?? []) as Array<{ shopify_location_id: string; location_id: string }>;
  if (!mappedLocations.length) {
    summary.errors.push(
      'Inventory was not synced: no Shopify locations are mapped to VowOS locations. Map them, then re-run the sync.',
    );
    return summary;
  }

  const { data: variantRows, error: variantError } = await db
    .from('product_variants')
    .select('id,external_inventory_item_id')
    .eq('business_id', tenant.businessId)
    .not('external_inventory_item_id', 'is', null);
  if (variantError) {
    summary.errors.push(`Could not read variants for inventory sync: ${variantError.message}`);
    return summary;
  }

  const variantByInventoryItem = new Map<string, string>();
  for (const row of (variantRows ?? []) as Array<{ id: string; external_inventory_item_id: string }>) {
    variantByInventoryItem.set(String(row.external_inventory_item_id), row.id);
  }
  if (!variantByInventoryItem.size) return summary;

  const inventoryItemIds = [...variantByInventoryItem.keys()];
  const levelRows: Array<Record<string, unknown>> = [];

  // Shopify caps inventory_levels.json at 50 ids per request.
  for (let index = 0; index < inventoryItemIds.length; index += 50) {
    const batch = inventoryItemIds.slice(index, index + 50);
    try {
      const levels = await admin.paginate<any>(
        '/inventory_levels.json',
        'inventory_levels',
        { inventory_item_ids: batch.join(','), limit: 250 },
        20,
      );

      for (const level of levels) {
        const shopifyLocationId = String(level?.location_id ?? '');
        const mapping = mappedLocations.find((row) => row.shopify_location_id === shopifyLocationId);
        if (!mapping) {
          summary.skippedUnmappedLocations += 1;
          continue;
        }
        const variantId = variantByInventoryItem.get(String(level?.inventory_item_id ?? ''));
        if (!variantId) continue;

        levelRows.push({
          business_id: tenant.businessId,
          variant_id: variantId,
          location_id: mapping.location_id,
          available: Number.isFinite(Number(level?.available)) ? Math.trunc(Number(level.available)) : 0,
          external_inventory_item_id: String(level.inventory_item_id),
          external_location_id: shopifyLocationId,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      summary.errors.push(
        `Inventory batch starting at ${index}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  for (let index = 0; index < levelRows.length; index += 500) {
    const chunk = levelRows.slice(index, index + 500);
    const { error } = await db.from('inventory_levels').upsert(chunk, { onConflict: 'variant_id,location_id' });
    if (error) {
      summary.errors.push(`Inventory write failed: ${error.message}`);
      break;
    }
    summary.inventoryLevelsWritten += chunk.length;
  }

  return summary;
}

/**
 * Backfills historical orders.
 *
 * read_orders exposes only the trailing 60 days; read_all_orders is required
 * for anything older and is requested only when SHOPIFY_REQUEST_ALL_ORDERS is
 * enabled. The caller is told which window it actually got.
 */
export async function backfillShopifyOrders(
  db: SupabaseClient | any,
  tenant: ShopifyTenant,
  persist: (order: any) => Promise<void>,
  options: { since?: string; admin?: ShopifyAdminClient; maxPages?: number } = {},
): Promise<{ fetched: number; persisted: number; failed: number; window: string; errors: string[] }> {
  const result = { fetched: 0, persisted: 0, failed: 0, window: '', errors: [] as string[] };

  if (!hasScope(tenant.grantedScopes, 'read_orders')) {
    result.errors.push('This store has not granted read_orders. Reconnect Shopify to authorize order backfill.');
    return result;
  }

  const hasAllOrders = hasScope(tenant.grantedScopes, 'read_all_orders');
  const defaultSince = new Date(Date.now() - 59 * 24 * 3600 * 1000).toISOString();
  const since = options.since ?? defaultSince;
  result.window = hasAllOrders ? `since ${since} (full history authorized)` : `since ${since} (60-day limit — read_all_orders not granted)`;

  const admin =
    options.admin ??
    (await adminClientForConnection(db, { id: tenant.connectionId, shopDomain: tenant.shopDomain }));

  let orders: any[];
  try {
    orders = await admin.paginate<any>(
      '/orders.json',
      'orders',
      { status: 'any', created_at_min: since, limit: 250 },
      options.maxPages ?? 100,
    );
  } catch (error) {
    result.errors.push(`Order fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }

  result.fetched = orders.length;

  for (const order of orders) {
    try {
      await persist(order);
      result.persisted += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push(`Order ${order?.id ?? 'unknown'}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}
