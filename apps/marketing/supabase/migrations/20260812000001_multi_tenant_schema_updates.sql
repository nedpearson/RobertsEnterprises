-- MULTI-TENANT SCHEMA UPDATES

-- 1. Extend `businesses` to support the canonical Organization concept
-- (We retain the physical table name `businesses` to safely preserve all 40+ 
-- foreign keys and RLS policies across the platform without breaking existing integrations,
-- while fulfilling the architectural requirement for Individual vs Business workspaces.)

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS organization_type text DEFAULT 'BUSINESS',
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'TRIAL',
ADD COLUMN IF NOT EXISTS subscription_plan_id text,
ADD COLUMN IF NOT EXISTS trial_start timestamptz,
ADD COLUMN IF NOT EXISTS trial_end timestamptz,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS primary_color text,
ADD COLUMN IF NOT EXISTS secondary_color text,
ADD COLUMN IF NOT EXISTS accent_color text,
ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'PENDING';

-- 2. Extend `business_memberships` roles
-- Roles: OWNER, ADMIN, MANAGER, EMPLOYEE, STAFF, SALES, MARKETING, ACCOUNTING, READ_ONLY
ALTER TABLE business_memberships
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update existing memberships to OWNER if they are the only member (likely the creator)
-- or keep existing roles.
UPDATE business_memberships
SET role = 'OWNER'
WHERE id IN (
  SELECT id FROM business_memberships bm
  WHERE (SELECT COUNT(*) FROM business_memberships bm2 WHERE bm2.business_id = bm.business_id) = 1
) AND role != 'OWNER';

-- 3. Consolidate Subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
    plan_id text NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE',
    trial_start timestamptz,
    trial_end timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_feature_overrides (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    feature_key text NOT NULL,
    state text NOT NULL, -- 'FORCED_ON', 'FORCED_OFF'
    reason text,
    changed_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE(business_id, feature_key)
);

ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization subscriptions" ON organization_subscriptions
    FOR SELECT USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their organization feature overrides" ON organization_feature_overrides
    FOR SELECT USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

-- Only Super Admins can modify these
CREATE POLICY "Super Admins can modify organization_subscriptions" ON organization_subscriptions
    FOR ALL USING (is_super_admin());

CREATE POLICY "Super Admins can modify feature overrides" ON organization_feature_overrides
    FOR ALL USING (is_super_admin());

-- 4. Audit Logging (Extend existing table)
ALTER TABLE audit_logs 
    ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS actor_type text,
    ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS resource text,
    ADD COLUMN IF NOT EXISTS resource_id text,
    ADD COLUMN IF NOT EXISTS before_state jsonb,
    ADD COLUMN IF NOT EXISTS after_state jsonb,
    ADD COLUMN IF NOT EXISTS ip_address text,
    ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business audit logs" ON audit_logs
    FOR SELECT USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Super Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (is_super_admin());

-- Allow system/RPC to insert
CREATE POLICY "Users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()) OR is_super_admin()
    );
