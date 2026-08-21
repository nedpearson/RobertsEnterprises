-- 1. Schema Updates

-- Add columns to organization_subscriptions
ALTER TABLE organization_subscriptions 
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'PAID',
ADD COLUMN IF NOT EXISTS standard_price_cents integer,
ADD COLUMN IF NOT EXISTS effective_price_cents integer,
ADD COLUMN IF NOT EXISTS override_reason text,
ADD COLUMN IF NOT EXISTS override_by uuid REFERENCES auth.users,
ADD COLUMN IF NOT EXISTS override_date timestamptz,
ADD COLUMN IF NOT EXISTS override_expiration timestamptz,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- Add version to businesses
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- 2. RPC for Subscription Updates
CREATE OR REPLACE FUNCTION platform_update_subscription(
    p_business_id uuid,
    p_plan_id text,
    p_status text,
    p_account_type text,
    p_effective_price_cents integer,
    p_reason text,
    p_expected_version integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_version integer;
    v_updated_row organization_subscriptions;
    v_user_id uuid;
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
    END IF;

    v_user_id := auth.uid();
    
    -- Check concurrency
    SELECT version INTO v_current_version 
    FROM organization_subscriptions 
    WHERE business_id = p_business_id;

    IF v_current_version IS NOT NULL AND p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'Concurrency conflict: subscription was updated by another user (expected %, got %)', p_expected_version, v_current_version;
    END IF;

    -- Upsert the subscription
    INSERT INTO organization_subscriptions (
        business_id, 
        plan_id, 
        status, 
        account_type, 
        effective_price_cents, 
        version
    )
    VALUES (
        p_business_id, 
        p_plan_id, 
        p_status, 
        p_account_type, 
        p_effective_price_cents, 
        COALESCE(v_current_version, 0) + 1
    )
    ON CONFLICT (business_id) 
    DO UPDATE SET 
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        account_type = EXCLUDED.account_type,
        effective_price_cents = EXCLUDED.effective_price_cents,
        updated_at = now(),
        version = organization_subscriptions.version + 1
    RETURNING * INTO v_updated_row;

    -- Write audit log (PLATFORM_SUBSCRIPTION_UPDATED)
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        user_id,
        before_value,
        after_value,
        reason
    ) VALUES (
        'organization_subscription',
        p_business_id,
        'PLATFORM_SUBSCRIPTION_UPDATED',
        v_user_id,
        jsonb_build_object('version', v_current_version),
        to_jsonb(v_updated_row),
        p_reason
    );

    RETURN to_jsonb(v_updated_row);
END;
$$;

-- 3. RPC for Organization Core Updates
CREATE OR REPLACE FUNCTION platform_update_organization_core(
    p_business_id uuid,
    p_name text,
    p_slug text,
    p_status text,
    p_onboarding_status text,
    p_reason text,
    p_expected_version integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_version integer;
    v_updated_row businesses;
    v_user_id uuid;
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
    END IF;

    v_user_id := auth.uid();
    
    SELECT version INTO v_current_version 
    FROM businesses 
    WHERE id = p_business_id;

    IF v_current_version IS NULL THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;

    IF p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'Concurrency conflict: organization was updated by another user';
    END IF;

    UPDATE businesses SET
        name = p_name,
        slug = p_slug,
        status = p_status,
        onboarding_status = p_onboarding_status,
        updated_at = now(),
        version = version + 1
    WHERE id = p_business_id
    RETURNING * INTO v_updated_row;

    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        user_id,
        before_value,
        after_value,
        reason
    ) VALUES (
        'business',
        p_business_id,
        'PLATFORM_ORGANIZATION_UPDATED',
        v_user_id,
        jsonb_build_object('version', v_current_version),
        to_jsonb(v_updated_row),
        p_reason
    );

    RETURN to_jsonb(v_updated_row);
END;
$$;
