-- 20260817000000_multi_channel_commerce.sql
-- VowOS Multi-Channel Commerce Architecture

-- 1. Drop existing unused dummy table to replace with formal OAuth model
DROP TABLE IF EXISTS integrations CASCADE;

-- ==========================================
-- CONNECTED ACCOUNTS & RESOURCES
-- ==========================================

-- Extensible provider model (Shopify, GoDaddy, etc.)
CREATE TABLE IF NOT EXISTS connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- e.g., 'SHOPIFY', 'GODADDY', 'STRIPE'
    external_account_id TEXT,
    display_name TEXT NOT NULL,
    status TEXT DEFAULT 'CONNECTED', -- 'CONNECTED', 'DISCONNECTED', 'ERROR', 'REAUTH_REQUIRED'
    access_token TEXT, -- Encrypted/secured at rest
    refresh_token TEXT,
    scopes JSONB,
    connected_by UUID REFERENCES auth.users(id),
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (business_id, provider, external_account_id)
);

CREATE TABLE IF NOT EXISTS connected_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- e.g., 'STORE', 'DOMAIN', 'WEBSITE'
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connected_account_id, external_id)
);

-- ==========================================
-- SITES & BRANDS
-- ==========================================

-- Rename/Upgrade business_websites to business_sites for a unified domain model
-- (Dropping it for clean creation since we are in active early dev, assuming no prod data exists for it yet)
DROP TABLE IF EXISTS business_websites CASCADE;

CREATE TABLE IF NOT EXISTS business_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES business_brands(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    site_type TEXT NOT NULL, -- 'MARKETING', 'ECOMMERCE', 'BOOKING', 'BRAND', 'LOCATION'
    provider TEXT NOT NULL, -- 'SHOPIFY', 'GODADDY', 'VOWOS_HOSTED', 'CUSTOM'
    status TEXT DEFAULT 'ACTIVE',
    is_primary BOOLEAN DEFAULT false,
    inquiry_enabled BOOLEAN DEFAULT true,
    booking_enabled BOOLEAN DEFAULT false,
    ecommerce_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- COMMERCE CHANNELS & PUBLISHING
-- ==========================================

CREATE TABLE IF NOT EXISTS commerce_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES business_sites(id) ON DELETE CASCADE,
    connected_resource_id UUID REFERENCES connected_resources(id) ON DELETE SET NULL, -- E.g., the specific Shopify Store
    sync_direction TEXT DEFAULT 'VOWOS_TO_SHOPIFY', -- 'VOWOS_TO_SHOPIFY', 'SHOPIFY_TO_VOWOS', 'BIDIRECTIONAL'
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES commerce_channels(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    external_product_id TEXT,
    external_variant_id TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PUBLISHED', 'PENDING', 'SYNCING', 'FAILED', 'CONFLICT'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS channel_product_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES channel_listings(id) ON DELETE CASCADE,
    price_cents INTEGER,
    compare_at_cents INTEGER,
    title_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id)
);

-- ==========================================
-- SYNC HEALTH & CONFLICTS
-- ==========================================

CREATE TABLE IF NOT EXISTS sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES commerce_channels(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL, -- 'FULL_CATALOG_SYNC', 'INVENTORY_RECONCILIATION', 'ORDER_IMPORT'
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'MANUAL_REVIEW'
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'PRODUCT', 'ORDER', 'CUSTOMER', 'INVENTORY'
    local_id UUID,
    external_id TEXT,
    conflict_reason TEXT NOT NULL,
    resolution_status TEXT DEFAULT 'UNRESOLVED', -- 'UNRESOLVED', 'RESOLVED_LOCAL_WON', 'RESOLVED_EXTERNAL_WON'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ==========================================
-- CUSTOMER IDENTITIES
-- ==========================================

CREATE TABLE IF NOT EXISTS customer_external_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, provider, external_id)
);

-- ==========================================
-- ORDERS UPGRADE
-- ==========================================

-- Create orders table if not exists
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'PENDING',
    total_cents INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alter existing orders table to capture channel origin
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'IN_STORE'; -- 'IN_STORE', 'WEBSITE', 'SHOPIFY'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES business_sites(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES commerce_channels(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_url TEXT;

-- ==========================================
-- FORM SUBMISSIONS (Web Inquiries)
-- ==========================================

CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    site_id UUID REFERENCES business_sites(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    form_type TEXT DEFAULT 'INQUIRY',
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'NEW',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_product_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_external_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Shared Policy Template for Business Members
DROP POLICY IF EXISTS "Enable all access for business members" ON connected_accounts;
CREATE POLICY "Enable all access for business members" ON connected_accounts FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON connected_resources;
CREATE POLICY "Enable all access for business members" ON connected_resources FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON business_brands;
CREATE POLICY "Enable all access for business members" ON business_brands FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON business_sites;
CREATE POLICY "Enable all access for business members" ON business_sites FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON commerce_channels;
CREATE POLICY "Enable all access for business members" ON commerce_channels FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON channel_listings;
CREATE POLICY "Enable all access for business members" ON channel_listings FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON channel_product_overrides;
CREATE POLICY "Enable all access for business members" ON channel_product_overrides FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON sync_jobs;
CREATE POLICY "Enable all access for business members" ON sync_jobs FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON sync_conflicts;
CREATE POLICY "Enable all access for business members" ON sync_conflicts FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON customer_external_identities;
CREATE POLICY "Enable all access for business members" ON customer_external_identities FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON form_submissions;
CREATE POLICY "Enable all access for business members" ON form_submissions FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

-- ==========================================
-- UPDATE PROVISIONING RPC
-- ==========================================

-- Modify the existing provision_new_organization to use business_sites instead of business_websites
CREATE OR REPLACE FUNCTION provision_new_organization(
    p_organization_type text,
    p_legal_name text,
    p_display_name text,
    p_slug text,
    p_industry text,
    p_country text,
    p_state text,
    p_timezone text,
    p_parent_id uuid DEFAULT NULL,
    p_websites text[] DEFAULT NULL,
    p_plan_id text DEFAULT 'starter'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_business_id uuid;
    v_website text;
BEGIN
    -- 1. Validate auth user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Verify slug uniqueness
    IF EXISTS (SELECT 1 FROM businesses WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Slug already exists';
    END IF;

    -- 3. Create the Organization (Businesses table)
    INSERT INTO businesses (
        name,
        organization_type,
        legal_name,
        display_name,
        slug,
        status,
        subscription_status,
        timezone,
        country,
        state,
        parent_id
    ) VALUES (
        COALESCE(p_display_name, p_legal_name),
        p_organization_type,
        p_legal_name,
        p_display_name,
        p_slug,
        'ACTIVE',
        'TRIAL',
        COALESCE(p_timezone, 'America/New_York'),
        p_country,
        p_state,
        p_parent_id
    ) RETURNING id INTO v_new_business_id;

    -- 3.5 Insert sites if provided
    IF p_websites IS NOT NULL AND array_length(p_websites, 1) > 0 THEN
        FOREACH v_website IN ARRAY p_websites
        LOOP
            INSERT INTO business_sites (business_id, name, domain, site_type, provider, is_primary)
            VALUES (v_new_business_id, v_website, v_website, 'MARKETING', 'CUSTOM', true);
        END LOOP;
    END IF;

    -- 4. Assign the caller as the OWNER
    INSERT INTO business_memberships (
        user_id,
        business_id,
        role,
        status,
        invited_by,
        approved_by
    ) VALUES (
        auth.uid(),
        v_new_business_id,
        'OWNER',
        'ACTIVE',
        auth.uid(),
        auth.uid()
    );

    -- 5. Create Default Subscription (TRIAL)
    INSERT INTO organization_subscriptions (
        business_id,
        plan_id,
        status,
        trial_start,
        trial_end
    ) VALUES (
        v_new_business_id,
        p_plan_id,
        'ACTIVE',
        now(),
        now() + interval '14 days'
    );

    -- 6. Audit Log
    INSERT INTO audit_logs (
        actor_user_id,
        actor_type,
        business_id,
        action,
        resource,
        resource_id
    ) VALUES (
        auth.uid(),
        'USER',
        v_new_business_id,
        'ORGANIZATION_PROVISIONED',
        'organization',
        v_new_business_id::text
    );

    RETURN v_new_business_id;
END;
$$;
