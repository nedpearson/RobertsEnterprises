-- Update is_super_admin() to recognize both SUPER_ADMIN and PLATFORM_OWNER roles
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM platform_users 
        WHERE auth_user_id = auth.uid() 
        AND platform_role IN ('SUPER_ADMIN', 'PLATFORM_OWNER')
        AND active = true
    ) INTO is_admin;
    
    RETURN is_admin;
END;
$$;
