-- VowOS MASTER SAAS / TENANT / DEMO / SUPER ADMIN IMPLEMENTATION
-- This migration drops the parallel tenant architecture and establishes the single
-- source of truth for VowOS SaaS using the `businesses` table as the Tenant/Organization record.

-- 1. Drop redundant parallel architecture
DROP TABLE IF EXISTS vowos_tenant_brands CASCADE;
DROP TABLE IF EXISTS vowos_tenant_users CASCADE;
DROP TABLE IF EXISTS vowos_subscriptions CASCADE;
DROP TABLE IF EXISTS vowos_tenants CASCADE;

-- 2. Platform Users (for PLATFORM_OWNER role)
ALTER TABLE platform_users ADD UNIQUE (email);

-- Seed PLATFORM_OWNER (upsert by email)
INSERT INTO platform_users (email, platform_role) 
VALUES ('nedpearson@gmail.com', 'PLATFORM_OWNER')
ON CONFLICT (email) DO UPDATE SET platform_role = 'PLATFORM_OWNER';

-- 3. Support Sessions
CREATE TABLE IF NOT EXISTS support_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    platform_user_id uuid REFERENCES auth.users(id) NOT NULL,
    target_organization_id uuid REFERENCES businesses(id) NOT NULL,
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    active boolean DEFAULT true,
    ip_address text,
    user_agent text
);

-- Enable RLS on support_sessions
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform owners can manage support sessions" ON support_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM platform_users
            WHERE platform_users.auth_user_id = auth.uid()
            AND platform_users.platform_role = 'PLATFORM_OWNER'
        )
    );

-- 4. Establish Roberts Enterprises Privileges
-- Ensure Roberts Enterprises is comped
UPDATE businesses 
SET subscription_status = 'COMPED' 
WHERE slug IN ('roberts-enterprises', 'robertsenterprises', 're');

-- Add the feature override for Full Platform Access
INSERT INTO organization_feature_overrides (business_id, feature_key, state, reason)
SELECT id, 'ALL_CURRENT_AND_FUTURE_FEATURES', 'FORCED_ON', 'Platform Owner Directive'
FROM businesses 
WHERE slug IN ('roberts-enterprises', 'robertsenterprises', 're')
ON CONFLICT (business_id, feature_key) DO UPDATE SET state = 'FORCED_ON';

-- 5. Ensure Demo Organization
-- Ensure id constraint is clean
INSERT INTO businesses (id, name, slug, organization_type, status, onboarding_status)
VALUES (
    '11111111-1111-1111-1111-111111111111', -- Stable demo UUID if needed
    'VowOS Demo', 
    'demo', 
    'DEMO', 
    'ACTIVE', 
    'COMPLETED'
)
ON CONFLICT (id) DO UPDATE SET 
    name = 'VowOS Demo',
    slug = 'demo',
    organization_type = 'DEMO';

-- Ensure demo user has OWNER access to demo organization
INSERT INTO business_memberships (business_id, user_id, role, status)
SELECT 
    '11111111-1111-1111-1111-111111111111', 
    u.id, 
    'OWNER', 
    'ACTIVE'
FROM auth.users u WHERE u.email = 'demo123@gmail.com'
ON CONFLICT DO NOTHING;

-- 6. Update Platform Users trigger
-- We need to link auth.users.id to platform_users when a user signs up.
CREATE OR REPLACE FUNCTION link_platform_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE platform_users 
    SET auth_user_id = NEW.id 
    WHERE email = NEW.email AND auth_user_id IS NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_link_platform ON auth.users;
CREATE TRIGGER on_auth_user_created_link_platform
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION link_platform_user();

-- Also run it immediately for any existing users
UPDATE platform_users p
SET auth_user_id = u.id
FROM auth.users u
WHERE p.email = u.email AND p.auth_user_id IS NULL;
