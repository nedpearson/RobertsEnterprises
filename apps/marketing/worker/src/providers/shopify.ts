/**
 * REMOVED — do not reintroduce.
 *
 * This file previously exported a `ShopifyAdapter` that:
 *   - returned a hardcoded `{ success: true, count: 1520 }` from syncCatalog()
 *     without ever contacting Shopify, so dashboards reported a catalog sync
 *     that never happened;
 *   - queried `provider_connections` for `access_token`, `shop_domain` and
 *     `brand`, none of which exist on that table (offline tokens live in
 *     `growth_provider_secrets`), so checkHealth() always reported
 *     "disconnected" regardless of the real state;
 *   - pinned Shopify API version '2024-01' while the OAuth module used
 *     '2026-07'.
 *
 * The real implementations now live in:
 *   - catalog + inventory sync  → modules/shopify/catalogSync.ts
 *   - credentials + REST calls  → modules/shopify/admin.ts
 *   - delivery health           → modules/shopify/webhookRegistry.ts
 *
 * The throwing shim below exists so that any surviving import fails loudly at
 * the call site instead of silently resurrecting fabricated numbers.
 */

const REMOVAL_NOTICE =
  'ShopifyAdapter has been removed because it reported success it never achieved. ' +
  'Use syncShopifyCatalog() from modules/shopify/catalogSync.ts and ' +
  'connectionDeliveryHealth() from modules/shopify/webhookRegistry.ts instead.';

export class ShopifyAdapter {
  constructor() {
    throw new Error(REMOVAL_NOTICE);
  }
}

export {};
