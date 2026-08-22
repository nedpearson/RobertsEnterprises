-- 20260830000005_growth_verified_conversion_reconciliation.sql
-- Make VowOS operational outcomes safely reconcilable into marketing facts.

ALTER TABLE public.growth_verified_conversions
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.growth_ad_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_entity_type text,
  ADD COLUMN IF NOT EXISTS source_entity_id text,
  ADD COLUMN IF NOT EXISTS attribution_model text NOT NULL DEFAULT 'last_touch',
  ADD COLUMN IF NOT EXISTS attribution_confidence numeric(5,4),
  ADD COLUMN IF NOT EXISTS attribution_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_growth_verified_conversion_source
  ON public.growth_verified_conversions (
    business_id,
    conversion_type,
    source_entity_type,
    source_entity_id
  )
  WHERE source_entity_type IS NOT NULL AND source_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_growth_verified_conversion_campaign_date
  ON public.growth_verified_conversions (business_id, campaign_id, occurred_at DESC);

-- Preserve the difference between operational truth and attribution quality.
ALTER TABLE public.growth_data_health
  ADD COLUMN IF NOT EXISTS verified_sales_coverage_pct numeric(6,2),
  ADD COLUMN IF NOT EXISTS verified_appointment_coverage_pct numeric(6,2);
