-- 20260829000000_growth_foundation.sql
--
-- GROWTH & MARKETING FOUNDATION
--
-- Backing store for the Growth & Marketing section (Growth Overview, Technical
-- SEO Health, Local SEO & Google, Reviews & Reputation, Marketing Attribution,
-- Website & SEO Builder). Every table is business_id-scoped and RLS-enforced
-- with the same public.user_has_role() convention as the rest of the schema.
--
-- WHY NEW TABLES: the legacy marketing_* tables (20260727053027) are scoped by a
-- VARCHAR "brand" column from the single-tenant Proper & Company build. They have
-- no business_id and no tenant RLS, so they cannot back a multi-tenant product.
-- They are left untouched here and should be treated as deprecated.
--
-- SECRET HANDLING: OAuth tokens live in growth_provider_secrets, which has RLS
-- ENABLED and DELIBERATELY NO POLICIES. That makes it unreadable by every
-- anon/authenticated client; only the worker's service-role key can touch it.
-- Never add a policy to that table.

-- ---------------------------------------------------------------------------
-- Provider connections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN (
    'google_business_profile',
    'google_search_console',
    'google_analytics',
    'google_ads',
    'meta_ads',
    'manual'
  )),
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN (
    'disconnected', 'pending', 'connected', 'error', 'revoked'
  )),
  external_account_id text,
  display_name text,
  scopes text[] NOT NULL DEFAULT '{}',
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider, external_account_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_conn_business ON public.growth_provider_connections (business_id, provider);

-- Tokens. RLS on, zero policies: service-role only. Do not add policies.
CREATE TABLE IF NOT EXISTS public.growth_provider_secrets (
  connection_id uuid PRIMARY KEY REFERENCES public.growth_provider_connections(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Sync observability
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.growth_provider_connections(id) ON DELETE SET NULL,
  provider text NOT NULL,
  job text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  records_written integer NOT NULL DEFAULT 0,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_growth_sync_runs_business ON public.growth_sync_runs (business_id, provider, started_at DESC);

-- ---------------------------------------------------------------------------
-- Local SEO / Google Business Profile
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_local_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  connection_id uuid REFERENCES public.growth_provider_connections(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'google_business_profile',
  external_id text,
  title text NOT NULL,
  storefront_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone text,
  website_url text,
  primary_category text,
  additional_categories text[] NOT NULL DEFAULT '{}',
  regular_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  verification_state text,
  is_published boolean NOT NULL DEFAULT false,
  rating numeric(2,1),
  review_count integer NOT NULL DEFAULT 0,
  completeness_score integer CHECK (completeness_score BETWEEN 0 AND 100),
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_listings_business ON public.growth_local_listings (business_id);

CREATE TABLE IF NOT EXISTS public.growth_local_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.growth_local_listings(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  impressions_maps integer NOT NULL DEFAULT 0,
  impressions_search integer NOT NULL DEFAULT 0,
  website_clicks integer NOT NULL DEFAULT 0,
  calls integer NOT NULL DEFAULT 0,
  direction_requests integer NOT NULL DEFAULT 0,
  bookings integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_growth_local_metrics_date ON public.growth_local_metrics (business_id, metric_date DESC);

-- ---------------------------------------------------------------------------
-- Reviews & reputation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.growth_local_listings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'google' CHECK (source IN (
    'google', 'yelp', 'facebook', 'the_knot', 'wedding_wire', 'manual'
  )),
  external_id text,
  author_name text,
  author_photo_url text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'needs_reply' CHECK (status IN (
    'needs_reply', 'replied', 'flagged', 'ignored'
  )),
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  ai_draft text,
  response_body text,
  responded_at timestamptz,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  response_sync_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_reviews_business ON public.growth_reviews (business_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_reviews_status ON public.growth_reviews (business_id, status);

-- ---------------------------------------------------------------------------
-- Search Console metrics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_search_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.growth_provider_connections(id) ON DELETE SET NULL,
  site_url text NOT NULL,
  metric_date date NOT NULL,
  query text,
  page text,
  device text,
  country text,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr numeric(6,4) NOT NULL DEFAULT 0,
  position numeric(6,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_search_metrics_date ON public.growth_search_metrics (business_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_growth_search_metrics_query ON public.growth_search_metrics (business_id, query);
CREATE UNIQUE INDEX IF NOT EXISTS uq_growth_search_metrics_grain
  ON public.growth_search_metrics (business_id, site_url, metric_date, COALESCE(query, ''), COALESCE(page, ''), COALESCE(device, ''), COALESCE(country, ''));

-- ---------------------------------------------------------------------------
-- Technical SEO audits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_seo_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  site_url text NOT NULL,
  source text NOT NULL DEFAULT 'pagespeed' CHECK (source IN ('pagespeed', 'internal_crawl', 'manual')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'failed')),
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  pages_crawled integer NOT NULL DEFAULT 0,
  issues_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error text
);

CREATE INDEX IF NOT EXISTS idx_growth_seo_audits_business ON public.growth_seo_audits (business_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.growth_seo_page_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  audit_id uuid NOT NULL REFERENCES public.growth_seo_audits(id) ON DELETE CASCADE,
  url text NOT NULL,
  http_status integer,
  indexable boolean,
  performance_score integer,
  seo_score integer,
  accessibility_score integer,
  best_practices_score integer,
  lcp_ms integer,
  inp_ms integer,
  cls numeric(6,3),
  ttfb_ms integer,
  title text,
  meta_description text,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_seo_pages_audit ON public.growth_seo_page_results (audit_id);

-- ---------------------------------------------------------------------------
-- Attribution
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_attribution_touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL,
  source text,
  medium text,
  campaign text,
  term text,
  content text,
  click_id text,
  landing_path text,
  referrer text,
  session_id text,
  device text,
  is_first_touch boolean NOT NULL DEFAULT false,
  is_last_touch boolean NOT NULL DEFAULT false,
  cost_cents bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_touch_business ON public.growth_attribution_touchpoints (business_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_touch_lead ON public.growth_attribution_touchpoints (lead_id);
CREATE INDEX IF NOT EXISTS idx_growth_touch_customer ON public.growth_attribution_touchpoints (customer_id);

-- ---------------------------------------------------------------------------
-- Channel spend (manual entry today, ad-platform sync later)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_channel_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.growth_provider_connections(id) ON DELETE SET NULL,
  channel text NOT NULL,
  campaign text,
  spend_date date NOT NULL,
  spend_cents bigint NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  entry_source text NOT NULL DEFAULT 'manual' CHECK (entry_source IN ('manual', 'synced')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Expression uniqueness must be an index, not a table constraint: campaign is
-- nullable and NULLs would otherwise defeat the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS uq_growth_spend_grain
  ON public.growth_channel_spend (business_id, channel, COALESCE(campaign, ''), spend_date);

CREATE INDEX IF NOT EXISTS idx_growth_spend_date ON public.growth_channel_spend (business_id, spend_date DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.growth_provider_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_provider_secrets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_sync_runs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_local_listings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_local_metrics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_search_metrics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_seo_audits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_seo_page_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_attribution_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_channel_spend          ENABLE ROW LEVEL SECURITY;

-- growth_provider_secrets intentionally gets NO policies (service role only).

DO $$
DECLARE
  t text;
  growth_tables text[] := ARRAY[
    'growth_provider_connections',
    'growth_sync_runs',
    'growth_local_listings',
    'growth_local_metrics',
    'growth_reviews',
    'growth_search_metrics',
    'growth_seo_audits',
    'growth_seo_page_results',
    'growth_attribution_touchpoints',
    'growth_channel_spend'
  ];
BEGIN
  FOREACH t IN ARRAY growth_tables LOOP
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

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.growth_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
  touched text[] := ARRAY[
    'growth_provider_connections',
    'growth_local_listings',
    'growth_reviews',
    'growth_channel_spend'
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
