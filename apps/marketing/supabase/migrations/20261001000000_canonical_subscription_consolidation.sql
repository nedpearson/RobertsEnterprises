-- Canonicalize VowOS subscription state on organization_subscriptions.
--
-- Background:
--   20260807000008 created tenant_subscriptions for commercial packaging.
--   20260812000001 later established organization_subscriptions as the SaaS
--   control-plane source used by billing, provisioning and platform admin.
-- Keeping both writable created plan drift, stale feature toggles and duplicate
-- subscription rows. This migration preserves legacy metadata, moves it onto the
-- canonical table, and stops creating new legacy rows without destructively
-- dropping historical data.

ALTER TABLE public.organization_subscriptions
  ADD COLUMN IF NOT EXISTS addons text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS grandfathered_features text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS active_trials jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS usage_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS industry_pack text NOT NULL DEFAULT 'bridal';

-- Import legacy subscription records only where the canonical row is missing.
-- Existing canonical plan/status/effective pricing always wins because it is the
-- source already used by billing and platform administration.
DO $$
BEGIN
  IF to_regclass('public.tenant_subscriptions') IS NOT NULL THEN
    INSERT INTO public.organization_subscriptions (
      business_id,
      plan_id,
      status,
      addons,
      grandfathered_features,
      active_trials,
      usage_limits,
      industry_pack,
      created_at,
      updated_at
    )
    SELECT
      ts.business_id,
      ts.plan::text,
      UPPER(ts.status::text),
      COALESCE(ts.addons, '{}'::text[]),
      COALESCE(ts.grandfathered_features, '{}'::text[]),
      COALESCE(ts.active_trials, '{}'::jsonb),
      COALESCE(ts.usage_limits, '{}'::jsonb),
      'bridal',
      COALESCE(ts.created_at, now()),
      COALESCE(ts.updated_at, now())
    FROM public.tenant_subscriptions ts
    ON CONFLICT (business_id) DO UPDATE SET
      addons = ARRAY(
        SELECT DISTINCT value
        FROM unnest(
          COALESCE(public.organization_subscriptions.addons, '{}'::text[])
          || COALESCE(EXCLUDED.addons, '{}'::text[])
        ) AS value
        ORDER BY value
      ),
      grandfathered_features = ARRAY(
        SELECT DISTINCT value
        FROM unnest(
          COALESCE(public.organization_subscriptions.grandfathered_features, '{}'::text[])
          || COALESCE(EXCLUDED.grandfathered_features, '{}'::text[])
        ) AS value
        ORDER BY value
      ),
      active_trials = COALESCE(EXCLUDED.active_trials, '{}'::jsonb)
        || COALESCE(public.organization_subscriptions.active_trials, '{}'::jsonb),
      usage_limits = COALESCE(EXCLUDED.usage_limits, '{}'::jsonb)
        || COALESCE(public.organization_subscriptions.usage_limits, '{}'::jsonb),
      updated_at = now();
  END IF;
END
$$;

-- New businesses are provisioned through the canonical provisioning path. Stop
-- the old trigger from silently creating a second subscription record.
DROP TRIGGER IF EXISTS on_business_created ON public.businesses;
DROP FUNCTION IF EXISTS public.handle_new_business_subscription();

-- Keep the historical table temporarily for rollback/audit safety. Application
-- code must not read or write it after this migration.
DO $$
BEGIN
  IF to_regclass('public.tenant_subscriptions') IS NOT NULL THEN
    COMMENT ON TABLE public.tenant_subscriptions IS
      'DEPRECATED: historical commercial subscription table. Canonical runtime/billing state lives in organization_subscriptions. Do not write new rows.';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status_plan
  ON public.organization_subscriptions(status, plan_id);
