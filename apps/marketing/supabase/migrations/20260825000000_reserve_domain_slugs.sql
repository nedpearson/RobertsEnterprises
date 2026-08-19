CREATE OR REPLACE FUNCTION provision_new_organization(
    p_name TEXT,
    p_slug TEXT,
    p_industry TEXT,
    p_timezone TEXT,
    p_user_id UUID,
    p_first_name TEXT,
    p_last_name TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_business_id UUID;
    v_location_id UUID;
    v_member_id UUID;
    v_reserved_slugs TEXT[] := ARRAY['demo', 'www', 'api', 'platform', 'admin', 'app', 'auth', 'support', 'status', 'mail'];
BEGIN
    -- 1. Verify slug uniqueness and reservation
    IF p_slug = ANY(v_reserved_slugs) THEN
        RAISE EXCEPTION 'Slug is reserved and cannot be registered';
    END IF;

    IF EXISTS (SELECT 1 FROM businesses WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Organization slug already exists';
    END IF;

    IF EXISTS (SELECT 1 FROM businesses WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Business slug already exists';
    END IF;

    -- 2. Create organization
    INSERT INTO businesses (name, slug, subscription_tier, is_active)
    VALUES (p_name, p_slug, 'TRIAL', true)
    RETURNING id INTO v_org_id;

    -- 3. Create initial business
    INSERT INTO businesses (organization_id, name, slug, industry, is_active)
    VALUES (v_org_id, p_name, p_slug, p_industry, true)
    RETURNING id INTO v_business_id;

    -- 4. Create primary location
    INSERT INTO locations (business_id, name, slug, timezone, is_active)
    VALUES (v_business_id, 'Main Location', 'main', p_timezone, true)
    RETURNING id INTO v_location_id;

    -- 5. Create platform_users record if not exists
    INSERT INTO platform_users (id, email, first_name, last_name)
    VALUES (p_user_id, p_email, p_first_name, p_last_name)
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name;

    -- 6. Add user as ORG_SUPER_ADMIN
    INSERT INTO business_memberships (organization_id, user_id, role)
    VALUES (v_org_id, p_user_id, 'ORG_SUPER_ADMIN')
    RETURNING id INTO v_member_id;

    -- Return the newly created context
    RETURN jsonb_build_object(
        'organization_id', v_org_id,
        'business_id', v_business_id,
        'location_id', v_location_id,
        'slug', p_slug
    );
END;
$$;
