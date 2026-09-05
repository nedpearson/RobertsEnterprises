-- =============================================================================
-- 20261001000024_shopify_production_grain.sql
--
-- Closes the Shopify mapping gaps identified in the 2026-09-04 integration
-- audit (G2, G3, G4, G5, G7, G8, G11).
--
-- Every statement is idempotent. Everything is additive except the deliberate
-- relaxation of refunds.payment_id, which is guarded by a CHECK constraint so
-- a refund still cannot exist without a target.
--
-- RLS: every new table enables RLS *and* ships its tenant policy in the same
-- statement block. A table with RLS on and no policy denies all access, which
-- is a production outage, not a safe default.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- G4 + G5 — order header completeness
--
-- Shopify sends brand routing, currency, an authoritative timestamp and a full
-- financial breakdown on every order. Prior to this migration all of it was
-- discarded and a single total_cents survived.
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS brand_id            UUID REFERENCES public.business_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency            TEXT    NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS ordered_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_number        TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_cents      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_cents           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_cents      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cents      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_cents      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS financial_status    TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_status  TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason       TEXT,
  ADD COLUMN IF NOT EXISTS customer_note       TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address    JSONB,
  ADD COLUMN IF NOT EXISTS source_tags         TEXT[],
  ADD COLUMN IF NOT EXISTS raw_payload         JSONB,
  ADD COLUMN IF NOT EXISTS last_synced_at      TIMESTAMPTZ;

-- Reporting predicates. Sales dashboards filter by tenant and sort by the
-- merchant-facing order time, never by database insert time.
CREATE INDEX IF NOT EXISTS orders_business_ordered_at_idx
  ON public.orders (business_id, ordered_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS orders_brand_ordered_at_idx
  ON public.orders (brand_id, ordered_at DESC NULLS LAST)
  WHERE brand_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_location_ordered_at_idx
  ON public.orders (location_id, ordered_at DESC NULLS LAST)
  WHERE location_id IS NOT NULL;

-- The webhook resolves an order by (business_id, external_order_id). Without
-- this the lookup is a sequential scan on every single delivery.
CREATE INDEX IF NOT EXISTS orders_business_external_idx
  ON public.orders (business_id, external_order_id)
  WHERE external_order_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- G2 — the sales grain
--
-- Without a line-item table there is no SKU-level revenue, no units sold, no
-- designer or style attribution, and no COGS. This is the single highest-value
-- object in the migration.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id             UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  -- Provider identity. external_line_id is Shopify's line_items[].id and is the
  -- only stable key across an order edit.
  external_line_id     TEXT NOT NULL,
  external_product_id  TEXT,
  external_variant_id  TEXT,

  -- Resolved VowOS catalog links. Null until catalog sync has run; the order is
  -- never blocked on catalog resolution.
  product_id           UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id           UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,

  sku                  TEXT,
  title                TEXT NOT NULL,
  variant_title        TEXT,
  vendor_name          TEXT,

  quantity             INTEGER NOT NULL DEFAULT 1,
  refunded_quantity    INTEGER NOT NULL DEFAULT 0,
  unit_price_cents     INTEGER NOT NULL DEFAULT 0,
  discount_cents       INTEGER NOT NULL DEFAULT 0,
  tax_cents            INTEGER NOT NULL DEFAULT 0,
  total_cents          INTEGER NOT NULL DEFAULT 0,

  requires_shipping    BOOLEAN NOT NULL DEFAULT true,
  -- Bridal storefronts carry appointment date, event date and store selection
  -- as Shopify line-item properties. Preserved verbatim for later extraction.
  properties           JSONB,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT order_items_quantity_sane CHECK (quantity >= 0 AND refunded_quantity >= 0),
  CONSTRAINT order_items_line_uniq UNIQUE (order_id, external_line_id)
);

CREATE INDEX IF NOT EXISTS order_items_business_variant_idx
  ON public.order_items (business_id, external_variant_id)
  WHERE external_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS order_items_product_idx
  ON public.order_items (product_id) WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON public.order_items (order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items tenant access" ON public.order_items;
CREATE POLICY "order_items tenant access" ON public.order_items
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- G5 — refunds must be attachable to a Shopify order
--
-- refunds.payment_id was NOT NULL and referenced payments(id). A Shopify order
-- never produces a payments row, so a Shopify refund could not be recorded at
-- all. Relax the column, add an order target, and require at least one of them.
-- -----------------------------------------------------------------------------
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS order_id           UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS external_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS currency           TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS raw_payload        JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'refunds'
      AND column_name = 'payment_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.refunds ALTER COLUMN payment_id DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refunds_target_present'
  ) THEN
    ALTER TABLE public.refunds
      ADD CONSTRAINT refunds_target_present
      CHECK (payment_id IS NOT NULL OR order_id IS NOT NULL);
  END IF;
END $$;

-- One row per Shopify refund per tenant; replays are upserts, not duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS refunds_external_uniq
  ON public.refunds (business_id, external_refund_id)
  WHERE external_refund_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS refunds_order_idx
  ON public.refunds (order_id) WHERE order_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- G3 — location mapping as a real, writable table
--
-- The prior design read connection metadata.locationMappings that nothing ever
-- wrote, so every Shopify order landed with location_id = NULL. Online Shopify
-- orders carry no location_id at all, which is why is_default exists: it is the
-- location an online order belongs to when Shopify names none.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopify_location_mappings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  connection_id        UUID NOT NULL REFERENCES public.growth_provider_connections(id) ON DELETE CASCADE,

  -- NULL shopify_location_id marks the online/default fallback row.
  shopify_location_id  TEXT,
  shopify_location_name TEXT,
  location_id          UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_default           BOOLEAN NOT NULL DEFAULT false,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT shopify_location_row_shape
    CHECK (shopify_location_id IS NOT NULL OR is_default)
);

-- A Shopify location maps to exactly one VowOS location per connection.
CREATE UNIQUE INDEX IF NOT EXISTS shopify_location_pair_uniq
  ON public.shopify_location_mappings (connection_id, shopify_location_id)
  WHERE shopify_location_id IS NOT NULL;

-- At most one default per connection.
CREATE UNIQUE INDEX IF NOT EXISTS shopify_location_one_default
  ON public.shopify_location_mappings (connection_id)
  WHERE is_default;

ALTER TABLE public.shopify_location_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopify_location_mappings tenant access" ON public.shopify_location_mappings;
CREATE POLICY "shopify_location_mappings tenant access" ON public.shopify_location_mappings
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- G8 — catalog identity and per-location stock
--
-- Nothing in the schema tracked units on hand. product_variants stored cost and
-- price only, so "inventory" could never be answered.
-- -----------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS external_product_id TEXT,
  ADD COLUMN IF NOT EXISTS external_handle     TEXT,
  ADD COLUMN IF NOT EXISTS external_synced_at  TIMESTAMPTZ;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS external_variant_id      TEXT,
  ADD COLUMN IF NOT EXISTS external_inventory_item_id TEXT,
  ADD COLUMN IF NOT EXISTS external_synced_at       TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS products_external_uniq
  ON public.products (business_id, external_product_id)
  WHERE external_product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_external_uniq
  ON public.product_variants (business_id, external_variant_id)
  WHERE external_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_variants_inventory_item_idx
  ON public.product_variants (business_id, external_inventory_item_id)
  WHERE external_inventory_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.inventory_levels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  variant_id        UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  location_id       UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  available         INTEGER NOT NULL DEFAULT 0,
  external_inventory_item_id TEXT,
  external_location_id       TEXT,
  synced_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_levels_pair_uniq UNIQUE (variant_id, location_id)
);

CREATE INDEX IF NOT EXISTS inventory_levels_business_idx
  ON public.inventory_levels (business_id, location_id);

CREATE INDEX IF NOT EXISTS inventory_levels_lookup_idx
  ON public.inventory_levels (business_id, external_inventory_item_id, external_location_id)
  WHERE external_inventory_item_id IS NOT NULL;

ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_levels tenant access" ON public.inventory_levels;
CREATE POLICY "inventory_levels tenant access" ON public.inventory_levels
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- G1 / G7 — webhook subscription registry
--
-- Records what VowOS actually asked Shopify to deliver, so the ops view can
-- distinguish "token valid" from "we are receiving data" instead of guessing.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopify_webhook_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  connection_id       UUID NOT NULL REFERENCES public.growth_provider_connections(id) ON DELETE CASCADE,
  topic               TEXT NOT NULL,
  external_webhook_id TEXT,
  callback_url        TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'ACTIVE',
  last_error          TEXT,
  last_delivery_at    TIMESTAMPTZ,
  registered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shopify_webhook_topic_uniq UNIQUE (connection_id, topic)
);

ALTER TABLE public.shopify_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopify_webhook_subscriptions tenant access" ON public.shopify_webhook_subscriptions;
CREATE POLICY "shopify_webhook_subscriptions tenant access" ON public.shopify_webhook_subscriptions
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- G7 — webhook delivery idempotency
--
-- Shopify retries a delivery up to 19 times over 48 hours and will re-send on
-- its own schedule. X-Shopify-Webhook-Id is unique per delivery attempt group,
-- which makes it the correct dedupe key across every topic.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopify_webhook_deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  shop_domain         TEXT NOT NULL,
  topic               TEXT NOT NULL,
  external_webhook_id TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'PROCESSED',
  error_message       TEXT,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shopify_delivery_uniq UNIQUE (shop_domain, external_webhook_id)
);

CREATE INDEX IF NOT EXISTS shopify_deliveries_recent_idx
  ON public.shopify_webhook_deliveries (business_id, received_at DESC);

ALTER TABLE public.shopify_webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopify_webhook_deliveries tenant access" ON public.shopify_webhook_deliveries;
CREATE POLICY "shopify_webhook_deliveries tenant access" ON public.shopify_webhook_deliveries
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- G11 — make Shopify tenant routing indexable
--
-- resolveShopifyTenant filters growth_provider_connections on
-- metadata->>'shopDomain' with ilike. That expression cannot use any existing
-- index, so every webhook delivery scanned the table.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS growth_conn_shopify_domain_idx
  ON public.growth_provider_connections ((lower(metadata->>'shopDomain')))
  WHERE provider = 'shopify';


-- -----------------------------------------------------------------------------
-- Reporting surface — the sales grain the reports UI can query directly.
-- -----------------------------------------------------------------------------
-- security_invoker = true is load-bearing. Without it the view executes as its
-- OWNER, so RLS on orders and order_items is bypassed and any caller who can
-- read the view reads every tenant's line items. See 20261001000018.
CREATE OR REPLACE VIEW public.shopify_sales_grain
WITH (security_invoker = true) AS
SELECT
  o.business_id,
  o.brand_id,
  o.location_id,
  o.id                AS order_id,
  o.order_number,
  o.ordered_at,
  o.currency,
  o.financial_status,
  o.fulfillment_status,
  o.cancelled_at,
  i.id                AS order_item_id,
  i.sku,
  i.title,
  i.variant_title,
  i.vendor_name,
  i.product_id,
  i.variant_id,
  i.quantity,
  i.refunded_quantity,
  (i.quantity - i.refunded_quantity)                         AS net_quantity,
  i.unit_price_cents,
  i.discount_cents,
  i.tax_cents,
  i.total_cents,
  (i.total_cents - i.discount_cents)                         AS net_revenue_cents
FROM public.orders o
JOIN public.order_items i ON i.order_id = o.id
WHERE o.source_type = 'SHOPIFY';

COMMIT;
