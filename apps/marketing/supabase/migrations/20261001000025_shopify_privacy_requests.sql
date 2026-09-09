-- =============================================================================
-- 20261001000025_shopify_privacy_requests.sql
--
-- Shopify's three mandatory privacy webhooks (customers/data_request,
-- customers/redact, shop/redact) are a condition of keeping the app installed.
-- 20261001000024 answered them by parking the request in integration_dlq_events
-- and telling an operator to handle it by hand inside the statutory window.
-- That is a to-do list, not compliance.
--
-- This adds the durable ledger those handlers need: one row per request, keyed
-- so Shopify's retries converge instead of re-running a redaction, carrying the
-- assembled export or the redaction summary as evidence of what was done.
--
-- Deliberately NOT here: shopify_customer_links. customer_external_identities
-- already maps (business_id, provider, external_id) -> customer_id and is the
-- table the order and customer handlers already write. A second mapping table
-- would be a second source of truth, and the one that drifts is the one that
-- answers a legal request wrongly.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.shopify_privacy_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Shopify's X-Shopify-Webhook-Id when present, else a hash of the exact body.
  -- UNIQUE is what makes a retry converge rather than redact twice.
  request_key           TEXT        NOT NULL UNIQUE,

  topic                 TEXT        NOT NULL
                          CHECK (topic IN ('customers/data_request',
                                           'customers/redact',
                                           'shop/redact')),

  shop_domain           TEXT        NOT NULL,
  connection_id         UUID        REFERENCES public.growth_provider_connections(id) ON DELETE SET NULL,

  -- Nullable on purpose: a shop/redact can arrive after the connection row is
  -- gone, and the request still has to be recorded and answered.
  business_id           UUID        REFERENCES public.businesses(id) ON DELETE SET NULL,
  brand_id              UUID        REFERENCES public.business_brands(id) ON DELETE SET NULL,

  external_customer_id  TEXT,
  resolved_customer_id  UUID        REFERENCES public.customers(id) ON DELETE SET NULL,

  status                TEXT        NOT NULL DEFAULT 'received'
                          CHECK (status IN ('received', 'processing', 'processed', 'failed')),
  attempts              INTEGER     NOT NULL DEFAULT 1,
  last_error            TEXT,

  payload               JSONB       NOT NULL DEFAULT '{}'::jsonb,
  result_json           JSONB,

  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at          TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A processed request must carry its evidence. Without this a redaction that
  -- silently wrote nothing is indistinguishable from one that worked.
  CONSTRAINT shopify_privacy_processed_has_result
    CHECK (status <> 'processed' OR result_json IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS shopify_privacy_requests_status_idx
  ON public.shopify_privacy_requests (status, received_at DESC);

CREATE INDEX IF NOT EXISTS shopify_privacy_requests_business_idx
  ON public.shopify_privacy_requests (business_id, received_at DESC);

CREATE INDEX IF NOT EXISTS shopify_privacy_requests_shop_idx
  ON public.shopify_privacy_requests (lower(shop_domain), topic);

-- RLS on, and no client policy by design. The payload and result_json hold the
-- personal data of a person who has just exercised a privacy right; the worker
-- service-role is the only reader and writer. Operator visibility goes through
-- the tenant-authenticated endpoints in compliance.ts, which filter by the
-- caller's active business, never through direct table access.
ALTER TABLE public.shopify_privacy_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.shopify_privacy_requests IS
  'Shopify GDPR/CCPA webhook ledger. Service-role only: RLS is enabled with no '
  'client policy deliberately. Read it through /api/shopify/privacy/requests.';

COMMIT;
