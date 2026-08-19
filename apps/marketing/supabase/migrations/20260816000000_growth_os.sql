-- VowOS Growth OS Database Schema Additions
-- Author: Antigravity

-- 1. Tenant Integrations (OAuth Tokens & Connections)
CREATE TABLE IF NOT EXISTS public.tenant_integrations (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- e.g., 'google_search_console', 'google_business', 'meta_ads'
    provider_account_id VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    scopes TEXT[],
    token_expires_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, provider)
);

-- Enable RLS
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses can manage their own integrations"
    ON public.tenant_integrations FOR ALL
    USING (business_id IN (SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()));

-- 2. SEO Health Snapshots (Automated Technical SEO Audits)
CREATE TABLE IF NOT EXISTS public.seo_health_snapshots (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    target_url TEXT NOT NULL,
    score_overall INTEGER,
    score_performance INTEGER,
    score_accessibility INTEGER,
    score_best_practices INTEGER,
    score_seo INTEGER,
    core_web_vitals JSONB DEFAULT '{}'::jsonb, -- lcp, inp, cls
    issues JSONB DEFAULT '[]'::jsonb,
    snapshot_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.seo_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses can view their own SEO snapshots"
    ON public.seo_health_snapshots FOR SELECT
    USING (business_id IN (SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()));

-- 3. Marketing Campaigns (Google Ads, Meta Ads imported data)
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    external_campaign_id VARCHAR(255),
    campaign_name TEXT NOT NULL,
    status VARCHAR(50),
    budget NUMERIC(12, 2),
    spend_to_date NUMERIC(12, 2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses can view their own campaigns"
    ON public.marketing_campaigns FOR SELECT
    USING (business_id IN (SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()));

-- 4. Growth Recommendations (AI Next Best Actions)
CREATE TABLE IF NOT EXISTS public.growth_recommendations (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- e.g., 'SEO', 'REVIEWS', 'ADS'
    title TEXT NOT NULL,
    description TEXT,
    evidence TEXT,
    expected_impact TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, DISMISSED, COMPLETED
    action_type VARCHAR(50), -- e.g., 'UPDATE_HOURS', 'REPLY_REVIEW'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.growth_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses can manage their own recommendations"
    ON public.growth_recommendations FOR ALL
    USING (business_id IN (SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()));

-- 5. Marketing Attribution (Link leads/sales to traffic sources)
CREATE TABLE IF NOT EXISTS public.marketing_attribution (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.platform_leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
    touch_type VARCHAR(50) DEFAULT 'FIRST_TOUCH', -- FIRST_TOUCH, LATEST_TOUCH
    source VARCHAR(255), -- e.g., 'google', 'direct', 'facebook'
    medium VARCHAR(255), -- e.g., 'organic', 'cpc', 'referral'
    campaign VARCHAR(255),
    term TEXT, -- search query
    content TEXT,
    landing_page TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.marketing_attribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses can view their own attribution"
    ON public.marketing_attribution FOR SELECT
    USING (business_id IN (SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()));

-- 6. Organization Reviews (Google, Yelp, etc)
CREATE TABLE IF NOT EXISTS public.organization_reviews (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- e.g., 'google'
    external_review_id VARCHAR(255),
    reviewer_name TEXT,
    reviewer_photo_url TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_date TIMESTAMPTZ,
    reply_text TEXT,
    reply_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'PUBLISHED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, provider, external_review_id)
);

ALTER TABLE public.organization_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses can manage their own reviews"
    ON public.organization_reviews FOR ALL
    USING (business_id IN (SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_tenant_integrations_updated_at
        BEFORE UPDATE ON public.tenant_integrations
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;

DO $$ BEGIN
    CREATE TRIGGER update_marketing_campaigns_updated_at
        BEFORE UPDATE ON public.marketing_campaigns
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;

DO $$ BEGIN
    CREATE TRIGGER update_growth_recommendations_updated_at
        BEFORE UPDATE ON public.growth_recommendations
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;

DO $$ BEGIN
    CREATE TRIGGER update_organization_reviews_updated_at
        BEFORE UPDATE ON public.organization_reviews
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;
