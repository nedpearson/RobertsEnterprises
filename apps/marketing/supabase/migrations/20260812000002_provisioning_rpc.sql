-- PROVISION NEW ORGANIZATION RPC

CREATE OR REPLACE FUNCTION provision_new_organization(
    p_organization_type text,
    p_legal_name text,
    p_display_name text,
    p_slug text,
    p_industry text,
    p_country text,
    p_state text,
    p_timezone text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_business_id uuid;
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
        state
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
        p_state
    ) RETURNING id INTO v_new_business_id;

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
