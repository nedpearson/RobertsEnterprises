-- A public website must route to exactly one brand and one default location.
-- This prevents a booking from being assigned by a loose name/domain match.
ALTER TABLE business_sites
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notification_email TEXT;

ALTER TABLE appointment_requests
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES business_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_site_id UUID REFERENCES business_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS appointment_requests_site_idempotency_key_unique
  ON appointment_requests (source_site_id, idempotency_key)
  WHERE source_site_id IS NOT NULL AND idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS appointment_requests_brand_submitted_idx
  ON appointment_requests (business_id, brand_id, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.assert_business_site_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  brand_business_id UUID;
  location_business_id UUID;
BEGIN
  IF NEW.brand_id IS NULL OR NEW.location_id IS NULL THEN
    RAISE EXCEPTION 'A public business site must have a brand_id and location_id before booking can be enabled';
  END IF;

  SELECT business_id INTO brand_business_id FROM business_brands WHERE id = NEW.brand_id;
  SELECT business_id INTO location_business_id FROM locations WHERE id = NEW.location_id;

  IF brand_business_id IS DISTINCT FROM NEW.business_id THEN
    RAISE EXCEPTION 'business_sites.brand_id must belong to the same business';
  END IF;
  IF location_business_id IS DISTINCT FROM NEW.business_id THEN
    RAISE EXCEPTION 'business_sites.location_id must belong to the same business';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_sites_scope_guard ON business_sites;
CREATE TRIGGER business_sites_scope_guard
  BEFORE INSERT OR UPDATE OF business_id, brand_id, location_id ON business_sites
  FOR EACH ROW
  WHEN (NEW.booking_enabled = true)
  EXECUTE FUNCTION public.assert_business_site_scope();

-- An accepted booking is persisted before outbound mail is attempted. Failed
-- sends remain visible and retryable instead of losing the appointment request.
CREATE TABLE IF NOT EXISTS appointment_intake_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_request_id UUID NOT NULL REFERENCES appointment_requests(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES business_brands(id) ON DELETE SET NULL,
  site_id UUID REFERENCES business_sites(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_type TEXT NOT NULL DEFAULT 'appointment_request_received',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appointment_request_id, recipient, notification_type)
);

CREATE INDEX IF NOT EXISTS appointment_intake_notification_outbox_retry_idx
  ON appointment_intake_notification_outbox (status, next_attempt_at)
  WHERE status = 'pending';

ALTER TABLE appointment_intake_notification_outbox ENABLE ROW LEVEL SECURITY;


