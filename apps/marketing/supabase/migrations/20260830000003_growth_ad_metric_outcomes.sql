-- 20260830000003_growth_ad_metric_outcomes.sql
-- Preserve platform conversions separately while carrying VowOS-verified lead counts.
ALTER TABLE public.growth_ad_metrics
  ADD COLUMN IF NOT EXISTS leads integer NOT NULL DEFAULT 0;
