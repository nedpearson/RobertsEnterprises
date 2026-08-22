-- 20260830000000_growth_intelligence_command_center.sql
-- Location-aware, tenant-safe marketing intelligence foundation.
-- Production data only: no fabricated metrics are seeded by this migration.

-- ---------------------------------------------------------------------------
-- Extend provider coverage and location mapping
-- ---------------------------------------------------------------------------
ALTER TABLE public.growth_provider_connections
  DROP CONSTRAINT IF EXISTS growth_provider_connections_provider_check;

ALTER TABLE public.growth_provider_connections
  ADD CONSTRAINT growth_provider_connections_provider_check CHECK (provider IN (
    'google_business_profile',
    'google_search_console',
    'google_analytics',
    'google_ads',
    'meta_ads',
    'tiktok_ads',
    'pinterest_ads',
    'youtube',
    'linkedin_ads',
    'shopify',
    'website',
    'manual'
  ));

ALTER TABLE public.growth_provider_connections
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_growth_conn_location
  ON public.growth_provider_connections (business_id, location_id, provider);

-- ---------------------------------------------------------------------------
-- Market profile: one local marketing brain per location
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_market_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  industry text,
  business_category text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  primary_radius_miles numeric(8,2),
  secondary_radius_miles numeric(8,2),
  target_cities text[] NOT NULL DEFAULT '{}',
  target_postal_codes text[] NOT NULL DEFAULT '{}',
  products_services text[] NOT NULL DEFAULT '{}',
  brands_designers text[] NOT NULL DEFAULT '{}',
  price_positioning text,
  website_url text,
  appointment_capacity_weekly integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, location_id)
);

-- ---------------------------------------------------------------------------
-- Canonical campaigns and daily financial/operational facts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  connection_id uuid REFERENCES public.growth_provider_connections(id) ON DELETE SET NULL,
  provider text NOT NULL,
  external_account_id text,
  external_campaign_id text,
  name text NOT NULL,
  objective text,
  status text,
  daily_budget_cents bigint,
  currency_code text NOT NULL DEFAULT 'USD',
  synced_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider, external_campaign_id)
);

CREATE TABLE IF NOT EXISTS public.growth_campaign_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  campaign_id uuid NOT NULL REFERENCES public.growth_campaigns(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  spend_cents bigint NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  reach bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  qualified_leads integer NOT NULL DEFAULT 0,
  appointments_booked integer NOT NULL DEFAULT 0,
  appointments_attended integer NOT NULL DEFAULT 0,
  sales integer NOT NULL DEFAULT 0,
  revenue_cents bigint NOT NULL DEFAULT 0,
  gross_profit_cents bigint NOT NULL DEFAULT 0,
  platform_reported_conversions numeric(14,4) NOT NULL DEFAULT 0,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_growth_campaigns_business
  ON public.growth_campaigns (business_id, location_id, provider, status);
CREATE INDEX IF NOT EXISTS idx_growth_campaign_metrics_business_date
  ON public.growth_campaign_daily_metrics (business_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_growth_campaign_metrics_campaign_date
  ON public.growth_campaign_daily_metrics (campaign_id, metric_date DESC);

-- ---------------------------------------------------------------------------
-- VowOS-verified conversions and outbound conversion feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_verified_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  touchpoint_id uuid REFERENCES public.growth_attribution_touchpoints(id) ON DELETE SET NULL,
  conversion_type text NOT NULL CHECK (conversion_type IN (
    'qualified_lead', 'appointment_booked', 'appointment_attended', 'purchase', 'refund'
  )),
  occurred_at timestamptz NOT NULL,
  value_cents bigint NOT NULL DEFAULT 0,
  gross_profit_cents bigint NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'USD',
  source_system text NOT NULL DEFAULT 'vowos',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_conversion_transmissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversion_id uuid NOT NULL REFERENCES public.growth_verified_conversions(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.growth_provider_connections(id) ON DELETE CASCADE,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'accepted', 'matched', 'rejected', 'failed', 'retrying'
  )),
  idempotency_key text NOT NULL UNIQUE,
  attempt_count integer NOT NULL DEFAULT 0,
  provider_reference text,
  last_error text,
  last_attempt_at timestamptz,
  accepted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_verified_conversions_business
  ON public.growth_verified_conversions (business_id, occurred_at DESC, conversion_type);
CREATE INDEX IF NOT EXISTS idx_growth_conversion_tx_status
  ON public.growth_conversion_transmissions (business_id, status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Tenant-safe AI recommendations and budget governance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  category text NOT NULL,
  title text NOT NULL,
  action_type text NOT NULL,
  rationale text NOT NULL,
  expected_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric(5,4),
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_window_start timestamptz,
  data_window_end timestamptz,
  data_freshness_seconds integer,
  financial_exposure_cents bigint NOT NULL DEFAULT 0,
  governance_level integer NOT NULL DEFAULT 1 CHECK (governance_level BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'dismissed', 'snoozed', 'executed', 'expired'
  )),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  recommendation_id uuid NOT NULL REFERENCES public.growth_ai_recommendations(id) ON DELETE CASCADE,
  executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  status text NOT NULL DEFAULT 'completed',
  idempotency_key text NOT NULL UNIQUE,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_budget_guardrails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  monthly_budget_cents bigint,
  daily_max_adjustment_pct numeric(6,2) NOT NULL DEFAULT 15,
  target_cac_cents bigint,
  target_roas numeric(8,3),
  minimum_channel_spend jsonb NOT NULL DEFAULT '{}'::jsonb,
  maximum_channel_spend jsonb NOT NULL DEFAULT '{}'::jsonb,
  automation_level integer NOT NULL DEFAULT 1 CHECK (automation_level BETWEEN 1 AND 3),
  required_confidence numeric(5,4) NOT NULL DEFAULT 0.80,
  excluded_campaign_ids uuid[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_ai_recommendations_business
  ON public.growth_ai_recommendations (business_id, status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Real competitor intelligence (measured/estimated/unavailable explicitly)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  website_url text,
  competitor_type text NOT NULL DEFAULT 'direct' CHECK (competitor_type IN (
    'direct', 'indirect', 'national', 'unknown'
  )),
  google_profile_url text,
  social_profiles jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_by_user boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, location_id, name)
);

CREATE TABLE IF NOT EXISTS public.growth_competitor_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  competitor_id uuid NOT NULL REFERENCES public.growth_competitors(id) ON DELETE CASCADE,
  source text NOT NULL,
  signal_type text NOT NULL,
  headline text,
  summary text,
  public_url text,
  evidence_quality text NOT NULL DEFAULT 'measured' CHECK (evidence_quality IN (
    'measured', 'estimated', 'unavailable'
  )),
  methodology text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_competitors_business
  ON public.growth_competitors (business_id, location_id, active);
CREATE INDEX IF NOT EXISTS idx_growth_competitor_signals_business
  ON public.growth_competitor_signals (business_id, location_id, detected_at DESC);

-- ---------------------------------------------------------------------------
-- Data health: explicit freshness and attribution completeness
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_data_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  overall_score integer NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  attribution_coverage_pct numeric(6,2),
  freshness_score integer CHECK (freshness_score BETWEEN 0 AND 100),
  connection_score integer CHECK (connection_score BETWEEN 0 AND 100),
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_data_health_business
  ON public.growth_data_health (business_id, location_id, calculated_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: every new tenant-owned row is business scoped.
-- ---------------------------------------------------------------------------
ALTER TABLE public.growth_market_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_campaign_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_verified_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_conversion_transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_budget_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_competitor_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_data_health ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  growth_intelligence_tables text[] := ARRAY[
    'growth_market_profiles',
    'growth_campaigns',
    'growth_campaign_daily_metrics',
    'growth_verified_conversions',
    'growth_conversion_transmissions',
    'growth_ai_recommendations',
    'growth_ai_actions',
    'growth_budget_guardrails',
    'growth_competitors',
    'growth_competitor_signals',
    'growth_data_health'
  ];
BEGIN
  FOREACH t IN ARRAY growth_intelligence_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Growth intelligence members can view %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Growth intelligence members can view %1$s" ON public.%1$I FOR SELECT USING (public.user_has_role(business_id, ARRAY[''OWNER'',''ADMIN'',''MANAGER'']))',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Growth intelligence managers can insert %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Growth intelligence managers can insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY[''OWNER'',''ADMIN'',''MANAGER'']))',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Growth intelligence managers can update %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Growth intelligence managers can update %1$s" ON public.%1$I FOR UPDATE USING (public.user_has_role(business_id, ARRAY[''OWNER'',''ADMIN'',''MANAGER'']))',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Growth intelligence owners can delete %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Growth intelligence owners can delete %1$s" ON public.%1$I FOR DELETE USING (public.user_has_role(business_id, ARRAY[''OWNER'',''ADMIN'']))',
      t
    );
  END LOOP;
END $$;

-- updated_at maintenance
DO $$
DECLARE
  t text;
  touched text[] := ARRAY[
    'growth_market_profiles',
    'growth_campaigns',
    'growth_conversion_transmissions',
    'growth_ai_recommendations',
    'growth_budget_guardrails',
    'growth_competitors'
  ];
BEGIN
  FOREACH t IN ARRAY touched LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.growth_touch_updated_at()',
      t
    );
  END LOOP;
END $$;
