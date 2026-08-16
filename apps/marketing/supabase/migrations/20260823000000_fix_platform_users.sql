-- ==============================================================================
-- FIX PLATFORM USERS RLS & MAPPING
-- ==============================================================================

-- 1. Fix the RLS Policy so Super Admins can see the whole directory
DROP POLICY IF EXISTS "Super Admins can view platform_users" ON public.platform_users;

CREATE POLICY "Super Admins can view platform_users" ON public.platform_users
    FOR SELECT USING (
        is_super_admin() OR auth_user_id = auth.uid()
    );

-- 2. Ensure nedpearson@gmail.com is properly mapped if they exist in auth.users
DO $$
DECLARE
    super_admin_id uuid;
BEGIN
    SELECT id INTO super_admin_id FROM auth.users WHERE email = 'nedpearson@gmail.com' LIMIT 1;
    
    IF super_admin_id IS NOT NULL THEN
        INSERT INTO public.platform_users (auth_user_id, email, platform_role)
        VALUES (super_admin_id, 'nedpearson@gmail.com', 'PLATFORM_OWNER')
        ON CONFLICT (auth_user_id) DO UPDATE SET platform_role = 'PLATFORM_OWNER';
    END IF;
END $$;

-- 3. Secure Platform User Invitation RPC
CREATE OR REPLACE FUNCTION invite_platform_user(
    p_email text,
    p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Must be Platform Owner or Admin';
    END IF;

    IF p_role NOT IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_BILLING', 'PLATFORM_READ_ONLY') THEN
        RAISE EXCEPTION 'Invalid platform role';
    END IF;

    -- Look up if auth.users already has this email
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

    -- If no auth.users record, we can insert the platform_users record with a null auth_user_id temporarily,
    -- or if the schema requires auth_user_id, we fail gracefully and prompt manual SSO first.
    -- Wait, our schema says auth_user_id uuid REFERENCES auth.users(id)
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must sign in via SSO or register before being assigned a platform role in this architecture.';
    END IF;

    INSERT INTO public.platform_users (auth_user_id, email, platform_role)
    VALUES (v_user_id, p_email, p_role)
    ON CONFLICT (auth_user_id) DO UPDATE SET platform_role = p_role, updated_at = now();

    -- Log the audit event
    PERFORM log_platform_event(
        'PLATFORM_USER_INVITED', 
        v_user_id, 
        'platform_user', 
        jsonb_build_object('email', p_email, 'role', p_role)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Platform user configured successfully');
END;
$$;
