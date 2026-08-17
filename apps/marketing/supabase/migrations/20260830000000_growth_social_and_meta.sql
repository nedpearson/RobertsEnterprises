-- 20260830000000_growth_social_and_meta.sql
--
-- SOCIAL PLATFORMS, META ADVERTISING, AND PAGE METADATA
--
-- Extends the growth foundation (20260829000000) with:
--   * organic social presence (Instagram, Facebook, Pinterest, TikTok)
--   * paid campaign detail for Meta and Google Ads
--   * Open Graph / Twitter Card / schema.org metadata captured per page
--
-- Same conventions as the foundation: every table is business_id-scoped and RLS
-- enforced through public.user_has_role(). Ad SPEND continues to live in
-- growth_channel_spend so attribution and ROAS keep working off one table no
-- matter which network the money went to — growth_ad_campaigns holds the
-- per-campaign detail that spend rows deliberately do not carry.

-- ---------------------------------------------------------------------------
-- Social accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.growth_provider_connections(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'pinterest', 'tiktok', 'youtube')),
  external_id text NOT NULL,
  username text,
  display_name text,
  profile_url text,
  avatar_url text,
  followers integer NOT NULL DEFAULT 0,
  follows integer NOT NULL DEFAULT 0,
  media_count integer NOT NULL DEFAULT 0,
  is_business_account boolean NOT NULL DEFAULT false,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_social_accounts_business
  ON public.growth_social_accounts (business_id, platform);

-- ---------------------------------------------------------------------------
-- Social posts + their engagement
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.growth_social_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_id text NOT NULL,
  post_type text,
  permalink text,
  caption text,
  media_url text,
  thumbnail_url text,
  posted_at timestamptz NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  video_views integer NOT NULL DEFAULT 0,
  -- engagement / reach, stored so the UI never has to guess a denominator
  engagement_rate numeric(6,4),
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_social_posts_recent
  ON public.growth_social_posts (business_id, posted_at DESC);

-- Daily account-level rollup, so follower growth is a trend, not a snapshot.
CREATE TABLE IF NOT EXISTS public.growth_social_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.growth_social_accounts(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  followers integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  profile_views integer NOT NULL DEFAULT 0,
  website_clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_growth_social_metrics_date
  ON public.growth_social_metrics (business_id, metric_date DESC);

-- ---------------------------------------------------------------------------
-- Paid campaigns (Meta, Google Ads)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.growth_provider_connections(id) ON DELETE SET NULL,
  network text NOT NULL CHECK (network IN ('meta', 'google_ads', 'pinterest', 'tiktok', 'manual')),
  external_id text NOT NULL,
  ad_account_id text,
  name text NOT NULL,
  objective text,
  status text,
  daily_budget_cents bigint,
  lifetime_budget_cents bigint,
  started_at timestamptz,
  ended_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, network, external_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_ad_campaigns_business
  ON public.growth_ad_campaigns (business_id, network);

-- Per-campaign daily performance. growth_channel_spend stays the single source
-- for channel-level spend used by attribution; this holds the detail.
CREATE TABLE IF NOT EXISTS public.growth_ad_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.growth_ad_campaigns(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  spend_cents bigint NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  frequency numeric(6,2),
  ctr numeric(6,4),
  cpc_cents bigint,
  cpm_cents bigint,
  conversions integer NOT NULL DEFAULT 0,
  conversion_value_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_growth_ad_metrics_date
  ON public.growth_ad_metrics (business_id, metric_date DESC);

-- ---------------------------------------------------------------------------
-- Page metadata (Open Graph / Twitter Card / schema.org)
-- ---------------------------------------------------------------------------
-- Added to the existing per-page audit rows rather than a new table: metadata is
-- captured in the same crawl and is meaningless without the page it came from.
ALTER TABLE public.growth_seo_page_results
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS og_type text,
  ADD COLUMN IF NOT EXISTS twitter_card text,
  ADD COLUMN IF NOT EXISTS twitter_title text,
  ADD COLUMN IF NOT EXISTS twitter_image text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS robots_directives text,
  ADD COLUMN IF NOT EXISTS schema_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS social_score integer;

COMMENT ON COLUMN public.growth_seo_page_results.social_score IS
  'How well this page renders when shared: OG/Twitter tags + image + canonical, 0-100.';

-- ---------------------------------------------------------------------------
-- Provider list gains the social/ads networks
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
    'meta_social',
    'pinterest',
    'tiktok',
    'manual'
  ));

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.growth_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_social_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_social_metrics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_ad_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_ad_metrics      ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  social_tables text[] := ARRAY[
    'growth_social_accounts',
    'growth_social_posts',
    'growth_social_metrics',
    'growth_ad_campaigns',
    'growth_ad_metrics'
  ];
BEGIN
  FOREACH t IN ARRAY social_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Growth members can view %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Growth members can view %1$s" ON public.%1$I FOR SELECT USING (public.user_has_role(business_id, ARRAY[''OWNER'',''ADMIN'',''MANAGER'']))',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Growth managers can insert %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Growth managers can insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY[''OWNER'',''ADMIN'',''MANAGER'']))',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Growth managers can update %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Growth managers can update %1$s" ON public.%1$I FOR UPDATE USING (public.user_has_role(business_id, ARRAY[''OWNER'',''ADMIN'',''MANAGER'']))',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS "Growth owners can delete %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Growth owners can delete %1$s" ON public.%1$I FOR DELETE USING (public.user_has_role(business_id, ARRAY[''OWNER'',''ADMIN'']))',
      t
    );
  END LOOP;
END $$;

DO $$
DECLARE
  t text;
  touched text[] := ARRAY['growth_social_accounts', 'growth_ad_campaigns'];
BEGIN
  FOREACH t IN ARRAY touched LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.growth_touch_updated_at()',
      t
    );
  END LOOP;
END $$;
