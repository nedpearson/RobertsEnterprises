-- Signed Meta/Facebook/Instagram webhook ingestion.
--
-- The worker verifies X-Hub-Signature-256 before parsing and routes each event
-- through one explicit provider_connections account binding. This table keeps
-- the idempotency/audit record without persisting raw provider payloads, access
-- tokens, app secrets, or customer message content.

CREATE TABLE IF NOT EXISTS public.integration_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  external_event_id text NOT NULL,
  provider_connection_id uuid REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.business_brands(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  signature_verified boolean NOT NULL DEFAULT false,
  processing_status text NOT NULL DEFAULT 'RECEIVED',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  processed_at timestamptz,
  error_code text,
  retry_count integer NOT NULL DEFAULT 0,
  correlation_id text NOT NULL,
  payload_digest text NOT NULL,
  CONSTRAINT uq_integration_webhook_provider_event
    UNIQUE (provider, provider_account_id, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_business
  ON public.integration_webhook_events (business_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_connection
  ON public.integration_webhook_events (provider_connection_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_status
  ON public.integration_webhook_events (processing_status, received_at DESC);

ALTER TABLE public.omnichannel_inbox
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS identity_status text NOT NULL DEFAULT 'UNRESOLVED';

CREATE INDEX IF NOT EXISTS idx_omnichannel_inbox_customer
  ON public.omnichannel_inbox (business_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_omnichannel_inbox_unresolved
  ON public.omnichannel_inbox (business_id, created_at DESC)
  WHERE customer_id IS NULL;

ALTER TABLE public.integration_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins read integration webhook events"
  ON public.integration_webhook_events;
CREATE POLICY "Platform admins read integration webhook events"
ON public.integration_webhook_events FOR SELECT
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Tenant managers read integration webhook events"
  ON public.integration_webhook_events;
CREATE POLICY "Tenant managers read integration webhook events"
ON public.integration_webhook_events FOR SELECT
USING (
  business_id IS NOT NULL
  AND public.is_business_manager(business_id)
);

-- No INSERT/UPDATE/DELETE policy is intentional. Provider webhook writes use
-- the worker's service-role client only; browsers cannot forge audit records.
