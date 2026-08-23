-- Shopify production hardening
-- - deterministic brand/shop ownership
-- - resumable webhook processing
-- - privacy/compliance request durability
-- - cross-delivery idempotency for Shopify-created appointments and leads

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES business_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shop_domain TEXT;

CREATE INDEX IF NOT EXISTS orders_shopify_shop_lookup_idx
  ON orders (business_id, brand_id, shop_domain, external_order_id)
  WHERE source_type = 'SHOPIFY' AND shop_domain IS NOT NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS leads_external_source_reference_unique
  ON leads (business_id, external_source, external_reference)
  WHERE external_source IS NOT NULL AND external_reference IS NOT NULL;

-- Public-site intake already owns (source_site_id, idempotency_key). Shopify has
-- no source_site_id, so give non-site integrations their own tenant-scoped key.
CREATE UNIQUE INDEX IF NOT EXISTS appointment_requests_integration_idempotency_unique
  ON appointment_requests (business_id, idempotency_key)
  WHERE source_site_id IS NULL AND idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS shopify_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  shop_domain TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES business_brands(id) ON DELETE SET NULL,
  external_resource_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'succeeded', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  appointment_request_id UUID REFERENCES appointment_requests(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  last_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shopify_webhook_events_shop_resource_idx
  ON shopify_webhook_events (shop_domain, external_resource_id, received_at DESC);
CREATE INDEX IF NOT EXISTS shopify_webhook_events_failed_idx
  ON shopify_webhook_events (status, updated_at)
  WHERE status = 'failed';

ALTER TABLE shopify_webhook_events ENABLE ROW LEVEL SECURITY;
-- No client policy by design. The worker service-role is the only writer/reader.

CREATE TABLE IF NOT EXISTS shopify_customer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES growth_provider_connections(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES business_brands(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  external_customer_id TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_created_by_shopify BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_domain, external_customer_id)
);

CREATE INDEX IF NOT EXISTS shopify_customer_links_customer_idx
  ON shopify_customer_links (business_id, brand_id, customer_id);
ALTER TABLE shopify_customer_links ENABLE ROW LEVEL SECURITY;
-- No client policy by design. Contains provider identity mappings.

CREATE TABLE IF NOT EXISTS shopify_privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL CHECK (topic IN ('customers/data_request', 'customers/redact', 'shop/redact')),
  shop_domain TEXT NOT NULL,
  connection_id UUID REFERENCES growth_provider_connections(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES business_brands(id) ON DELETE SET NULL,
  external_customer_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  last_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shopify_privacy_requests_status_idx
  ON shopify_privacy_requests (status, received_at);
ALTER TABLE shopify_privacy_requests ENABLE ROW LEVEL SECURITY;
-- No client policy by design. Privacy payloads/results must remain service-role only.
