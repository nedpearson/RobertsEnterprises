-- 1. Create a unique constraint for locations on a per-brand basis
-- Different brands can have locations with the same name, but a single brand cannot.
CREATE UNIQUE INDEX IF NOT EXISTS locations_business_name_idx ON locations (business_id, lower(name));

-- 2. Ensure locations has the missing properties from the frontend
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS timezone text,
ADD COLUMN IF NOT EXISTS hours jsonb,
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Ensure businesses has the right columns
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS timezone text,
ADD COLUMN IF NOT EXISTS currency text,
ADD COLUMN IF NOT EXISTS industry text;

-- 3. The provision_full_tenant RPC
CREATE OR REPLACE FUNCTION public.provision_full_tenant(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_business_id UUID;
    v_location_id UUID;
    v_owner_id UUID;
    v_slug TEXT;
    
    biz JSONB;
    loc JSONB;
    mod TEXT;
    
    v_business_ids UUID[] := ARRAY[]::UUID[];
    v_location_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- 1. Validate auth.uid() is a platform admin (reuse is_super_admin)
    IF auth.uid() IS NOT NULL AND NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Must be a platform admin';
    END IF;

    v_slug := payload->'orgDetails'->>'slug';

    -- 2. Validate slug uniqueness across organizations
    IF EXISTS (SELECT 1 FROM businesses WHERE slug = v_slug) THEN
        RAISE EXCEPTION 'Slug % already exists', v_slug;
    END IF;

    -- 3. INSERT root business (the "organization")
    INSERT INTO businesses (name, slug, subscription_status, status, timezone, currency, industry)
    VALUES (
        payload->'orgDetails'->>'legalName',
        v_slug,
        'TRIAL',
        'ACTIVE',
        payload->'orgDetails'->>'timezone',
        payload->'orgDetails'->>'currency',
        payload->'orgDetails'->>'industry'
    )
    RETURNING id INTO v_org_id;
    
    -- 4 & 5 & 6. For EACH business in payload.businesses
    IF payload->'businesses' IS NOT NULL AND jsonb_array_length(payload->'businesses') > 0 THEN
        FOR biz IN SELECT * FROM jsonb_array_elements(payload->'businesses') LOOP
            INSERT INTO businesses (parent_id, name, display_name, slug, industry, status)
            VALUES (
                v_org_id,
                biz->>'name',
                biz->>'displayName',
                v_slug || '-' || (biz->>'name'), 
                payload->'orgDetails'->>'industry',
                'ACTIVE'
            )
            RETURNING id INTO v_business_id;
            
            v_business_ids := array_append(v_business_ids, v_business_id);
            
            -- Insert subscription for the first business
            IF array_length(v_business_ids, 1) = 1 THEN
                INSERT INTO organization_subscriptions (business_id, plan_id, status, trial_end)
                VALUES (
                    v_business_id,
                    payload->'package'->>'plan',
                    'ACTIVE',
                    NOW() + ((payload->'package'->>'trialDays')::integer * interval '1 day')
                );
            END IF;

            -- For EACH location under that business
            IF biz->'locations' IS NOT NULL AND jsonb_array_length(biz->'locations') > 0 THEN
                FOR loc IN SELECT * FROM jsonb_array_elements(biz->'locations') LOOP
                    INSERT INTO locations (business_id, name, address, timezone, phone, email, is_active)
                    VALUES (
                        v_business_id,
                        COALESCE(loc->>'name', (biz->>'name') || ' - ' || (loc->>'address')), -- fallback
                        loc->>'address',
                        loc->>'timezone',
                        loc->>'phone',
                        loc->>'email',
                        true
                    )
                    RETURNING id INTO v_location_id;
                    
                    v_location_ids := array_append(v_location_ids, v_location_id);
                END LOOP;
            END IF;

            -- 7. INSERT the owner user membership as ORG_SUPER_ADMIN
            IF payload->'users'->'owner'->>'email' IS NOT NULL THEN
                SELECT id INTO v_owner_id FROM auth.users WHERE email = payload->'users'->'owner'->>'email';
                IF v_owner_id IS NOT NULL THEN
                    INSERT INTO business_memberships (business_id, user_id, role)
                    VALUES (v_business_id, v_owner_id, 'ORG_SUPER_ADMIN')
                    ON CONFLICT DO NOTHING;
                END IF;
            END IF;
            
            -- And additional users
            IF payload->'users'->'additional' IS NOT NULL AND jsonb_array_length(payload->'users'->'additional') > 0 THEN
                FOR loc IN SELECT * FROM jsonb_array_elements(payload->'users'->'additional') LOOP
                    SELECT id INTO v_owner_id FROM auth.users WHERE email = loc->>'email';
                    IF v_owner_id IS NOT NULL THEN
                        INSERT INTO business_memberships (business_id, user_id, role)
                        VALUES (v_business_id, v_owner_id, COALESCE(loc->>'role', 'Stylist'))
                        ON CONFLICT DO NOTHING;
                    END IF;
                END LOOP;
            END IF;
            
            -- 8. INSERT initial settings_values
            INSERT INTO settings_values (business_id, setting_namespace, setting_key, value_json)
            VALUES 
                (v_business_id, 'tenant', 'settings', COALESCE(payload->'settings', '{}'::jsonb)),
                (v_business_id, 'tenant', 'connections', COALESCE(payload->'connections', '[]'::jsonb)),
                (v_business_id, 'tenant', 'migration', COALESCE(payload->'migration', '{}'::jsonb)),
                (v_business_id, 'tenant', 'training', COALESCE(payload->'training', '{}'::jsonb)),
                (v_business_id, 'tenant', 'go_live_requirements', COALESCE(payload->'goLiveRequirements', '[]'::jsonb)),
                (v_business_id, 'tenant', 'pending_users', COALESCE(payload->'users', '{}'::jsonb)),
                (v_business_id, 'tenant', 'onboarding', COALESCE(payload->'onboarding', '{}'::jsonb));
                
        END LOOP;
    END IF;
    
    -- Modules -> organization_module_preferences
    IF payload->'modules' IS NOT NULL THEN
        FOR mod IN SELECT * FROM jsonb_array_elements_text(payload->'modules') LOOP
            INSERT INTO organization_module_preferences (business_id, module_id, is_enabled)
            VALUES (v_org_id, mod, true)
            ON CONFLICT (business_id, module_id) DO NOTHING;
        END LOOP;
    END IF;

    -- 10. RETURN jsonb
    RETURN jsonb_build_object(
        'organization_id', v_org_id,
        'business_ids', v_business_ids,
        'location_ids', v_location_ids,
        'status', 'READY'
    );
END;
$$;

-- Replace provision_new_organization to wrap provision_full_tenant
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
BEGIN
    RETURN provision_full_tenant(
        jsonb_build_object(
            'orgDetails', jsonb_build_object(
                'legalName', p_name,
                'slug', p_slug,
                'industry', p_industry,
                'timezone', p_timezone,
                'currency', 'USD'
            ),
            'package', jsonb_build_object(
                'plan', 'starter',
                'trialDays', 14
            ),
            'businesses', jsonb_build_array(
                jsonb_build_object(
                    'name', p_name,
                    'displayName', p_name,
                    'locations', jsonb_build_array(
                        jsonb_build_object(
                            'name', 'Main Location',
                            'timezone', p_timezone
                        )
                    )
                )
            ),
            'users', jsonb_build_object(
                'owner', jsonb_build_object(
                    'id', p_user_id,
                    'email', p_email
                )
            )
        )
    );
END;
$$;
NOTIFY pgrst, 'reload schema';
