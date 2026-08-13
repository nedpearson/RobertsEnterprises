-- BILLING, ONBOARDING, AND ENTITLEMENT HARDENING

-- 1. Hardening businesses and subscriptions
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS billing_email text,
ADD COLUMN IF NOT EXISTS onboarding_progress jsonb DEFAULT '{"currentStep": 1, "completedSteps": [], "startedAt": null, "updatedAt": null}'::jsonb;

ALTER TABLE organization_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE;

-- 2. Revoke client-side modification of organization_subscriptions
-- We must drop the insecure policy that allows ORG_SUPER_ADMIN to update subscriptions directly from the browser.
DROP POLICY IF EXISTS "Super Admins can modify organization_subscriptions" ON organization_subscriptions;

-- Instead, only allow select. Any modification must happen via secure RPC or service role.
-- (The "Users can view their organization subscriptions" policy already exists for SELECT).
-- If we need Super Admins to be able to create the initial row during provisioning, the RPC `provision_new_organization` runs as SECURITY DEFINER, so it bypasses RLS.

-- 3. Webhook Idempotency Table
CREATE TABLE IF NOT EXISTS webhook_events (
    id text PRIMARY KEY,
    type text NOT NULL,
    status text NOT NULL DEFAULT 'processing', -- processing, processed, failed
    error text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- No public access to webhook_events. Only service role/RPC.

-- 4. Rewrite `provision_new_organization` to use ORG_SUPER_ADMIN and accept plan_id securely
CREATE OR REPLACE FUNCTION provision_new_organization(
    p_organization_type text,
    p_legal_name text,
    p_display_name text,
    p_slug text,
    p_industry text,
    p_country text,
    p_state text,
    p_timezone text,
    p_plan_id text DEFAULT 'essentials'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_business_id uuid;
    v_onboarding_progress jsonb;
BEGIN
    -- 1. Validate auth user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Verify slug uniqueness
    IF EXISTS (SELECT 1 FROM businesses WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'slug_exists'; -- Throw a specific code for the frontend to catch
    END IF;

    v_onboarding_progress := jsonb_build_object(
        'currentStep', 1,
        'completedSteps', '[]'::jsonb,
        'startedAt', now(),
        'updatedAt', now()
    );

    -- 3. Create the Organization
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
        onboarding_progress
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
        v_onboarding_progress
    ) RETURNING id INTO v_new_business_id;

    -- 4. Assign the caller as the ORG_SUPER_ADMIN (Canonical Role)
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
        'ORG_SUPER_ADMIN',
        'ACTIVE',
        auth.uid(),
        auth.uid()
    );

    -- 5. Create Default Subscription
    -- We only allow specific free/trial plans to be selected at provisioning
    IF p_plan_id NOT IN ('essentials', 'growth', 'pro', 'enterprise', 'comped') THEN
        p_plan_id := 'essentials';
    END IF;

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


-- 5. Simulated Billing RPCs for Deterministic Server-Side Checkout & Webhooks

CREATE OR REPLACE FUNCTION billing_create_checkout_session(
    p_business_id uuid,
    p_plan_id text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_access boolean;
    v_session_id text;
BEGIN
    -- Verify the caller is ORG_SUPER_ADMIN or PLATFORM_OWNER
    SELECT EXISTS (
        SELECT 1 FROM business_memberships
        WHERE business_id = p_business_id
          AND user_id = auth.uid()
          AND role = 'ORG_SUPER_ADMIN'
    ) OR is_super_admin() INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    -- Generate a mock session ID
    v_session_id := 'cs_mock_' || encode(gen_random_bytes(16), 'hex');

    -- In a real Stripe integration, we would call Stripe API here.
    -- For this simulated production gate, we return the mock URL.
    
    RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION billing_handle_webhook(
    p_event_id text,
    p_event_type text,
    p_business_id uuid,
    p_plan_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_status text;
BEGIN
    -- In a real app, this RPC is called by the Edge Function verifying the Stripe signature.
    
    -- 1. Idempotency Check
    SELECT status INTO v_existing_status FROM webhook_events WHERE id = p_event_id;
    IF FOUND THEN
        -- If it's already processed, just return true (idempotent)
        IF v_existing_status = 'processed' THEN
            RETURN true;
        END IF;
    ELSE
        -- Insert new event
        INSERT INTO webhook_events (id, type, status) VALUES (p_event_id, p_event_type, 'processing');
    END IF;

    -- 2. Handle Event
    IF p_event_type = 'checkout.session.completed' OR p_event_type = 'invoice.paid' THEN
        -- Safely update the subscription
        UPDATE organization_subscriptions
        SET plan_id = p_plan_id,
            status = 'ACTIVE',
            updated_at = now()
        WHERE business_id = p_business_id;

        -- We could also update businesses.subscription_status
        UPDATE businesses
        SET subscription_status = 'ACTIVE'
        WHERE id = p_business_id;
        
    ELSIF p_event_type = 'invoice.payment_failed' THEN
        UPDATE organization_subscriptions
        SET status = 'PAST_DUE',
            updated_at = now()
        WHERE business_id = p_business_id;

        UPDATE businesses
        SET subscription_status = 'PAST_DUE'
        WHERE id = p_business_id;

    ELSIF p_event_type = 'customer.subscription.deleted' THEN
        UPDATE organization_subscriptions
        SET status = 'CANCELED',
            updated_at = now()
        WHERE business_id = p_business_id;

        UPDATE businesses
        SET subscription_status = 'CANCELED'
        WHERE id = p_business_id;
    END IF;

    -- 3. Mark processed
    UPDATE webhook_events SET status = 'processed', updated_at = now() WHERE id = p_event_id;

    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- On failure, mark as failed if we inserted it
    UPDATE webhook_events SET status = 'failed', error = SQLERRM, updated_at = now() WHERE id = p_event_id;
    RAISE;
END;
$$;
