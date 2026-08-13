-- Add parent_id to businesses for hierarchical organizations
ALTER TABLE businesses 
ADD COLUMN parent_id uuid REFERENCES businesses(id) ON DELETE SET NULL;

-- Create table for multiple websites per business
CREATE TABLE business_websites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for business_websites
ALTER TABLE business_websites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view websites for businesses they are members of
CREATE POLICY "Users can view websites for their businesses" ON business_websites
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
  );

-- Policy: Users can manage websites for their businesses
CREATE POLICY "Users can manage websites for their businesses" ON business_websites
  FOR ALL USING (
    business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
  );

-- UPDATE PROVISION NEW ORGANIZATION RPC TO SUPPORT PARENT AND WEBSITES
DROP FUNCTION IF EXISTS provision_new_organization(text, text, text, text, text, text, text, text);

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
    p_websites text[] DEFAULT NULL
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

    -- 3.5 Insert websites if provided
    IF p_websites IS NOT NULL AND array_length(p_websites, 1) > 0 THEN
        FOREACH v_website IN ARRAY p_websites
        LOOP
            INSERT INTO business_websites (business_id, url)
            VALUES (v_new_business_id, v_website);
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
        'starter', -- Default plan
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
