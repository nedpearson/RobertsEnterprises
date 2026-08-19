-- ==============================================================================
-- VOWOS PLATFORM CONTROL PLANE & SECURE SUPPORT RPCs
-- ==============================================================================

-- 1. Create Platform Audit Logs
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    target_resource_id uuid,
    target_resource_type text,
    details jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view audit logs
CREATE POLICY "Platform admins can view audit logs"
    ON public.platform_audit_logs FOR SELECT
    USING (is_super_admin());

-- 2. Audit Event Helper Function
CREATE OR REPLACE FUNCTION log_platform_event(
    p_action text,
    p_target_id uuid DEFAULT NULL,
    p_target_type text DEFAULT NULL,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.platform_audit_logs (actor_id, action, target_resource_id, target_resource_type, details)
    VALUES (auth.uid(), p_action, p_target_id, p_target_type, p_details);
END;
$$;

-- 3. Secure Platform Directory RPC
-- This safely fetches platform users joined with profiles without exposing raw auth data directly.
CREATE OR REPLACE FUNCTION get_platform_directory()
RETURNS TABLE (
    id uuid,
    email text,
    platform_role text,
    active boolean,
    created_at timestamp with time zone,
    last_login timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow platform owners or admins
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        pu.auth_user_id as id,
        pu.email,
        pu.platform_role,
        pu.active,
        pu.created_at,
        u.last_sign_in_at as last_login
    FROM public.platform_users pu
    LEFT JOIN auth.users u ON u.id = pu.auth_user_id
    ORDER BY pu.created_at DESC;
END;
$$;

-- 4. Secure Tenant User Directory RPC
CREATE OR REPLACE FUNCTION get_tenant_user_directory()
RETURNS TABLE (
    id uuid,
    email text,
    business_id uuid,
    role text,
    business_name text,
    created_at timestamp with time zone,
    last_login timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow platform owners or admins
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        bm.business_id,
        bm.role,
        b.name as business_name,
        u.created_at,
        u.last_sign_in_at as last_login
    FROM auth.users u
    JOIN public.business_memberships bm ON bm.user_id = u.id
    JOIN public.businesses b ON b.id = bm.business_id
    ORDER BY u.created_at DESC;
END;
$$;

-- 5. Support Mode Control Token Infrastructure
-- Allows a platform admin to generate a secure scoped token or state representing impersonation
-- Note: Since we are using Supabase auth context directly in RLS, we will log the action and 
-- use a custom claim mechanism or rely on frontend context propagation backed by RLS exceptions.

CREATE OR REPLACE FUNCTION enter_support_mode(target_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_name text;
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Must be Platform Admin to enter Support Mode';
    END IF;

    SELECT name INTO org_name FROM public.businesses WHERE id = target_org_id;

    IF org_name IS NULL THEN
        RAISE EXCEPTION 'Target organization not found';
    END IF;

    -- Log the entry
    PERFORM log_platform_event(
        'SUPPORT_MODE_ENTERED', 
        target_org_id, 
        'organization', 
        jsonb_build_object('organization_name', org_name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Support mode authorized',
        'business_id', target_org_id,
        'organization_name', org_name
    );
END;
$$;
