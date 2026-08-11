-- 1. PLATFORM HIERARCHY

CREATE TABLE platform_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    platform_role text NOT NULL DEFAULT 'USER',
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(auth_user_id)
);

-- Enable RLS
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can view platform_users
CREATE POLICY "Super Admins can view platform_users" ON platform_users
    FOR SELECT USING (
        auth_user_id = auth.uid() AND platform_role = 'SUPER_ADMIN'
    );

-- Seed initial SUPER_ADMIN (nedpearson@gmail.com)
-- This requires the auth user to exist, which we can look up by email,
-- or we can insert it if it doesn't exist. Since auth users are handled 
-- by Supabase, we'll do an insert if exists.
DO $$
DECLARE
    super_admin_id uuid;
BEGIN
    SELECT id INTO super_admin_id FROM auth.users WHERE email = 'nedpearson@gmail.com';
    
    IF super_admin_id IS NOT NULL THEN
        INSERT INTO platform_users (auth_user_id, email, platform_role)
        VALUES (super_admin_id, 'nedpearson@gmail.com', 'SUPER_ADMIN')
        ON CONFLICT (auth_user_id) DO UPDATE SET platform_role = 'SUPER_ADMIN';
    END IF;
END $$;

-- 2. SECURE PLATFORM RPCs
-- Function to securely check if the current user is a super admin
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
        AND platform_role = 'SUPER_ADMIN'
        AND active = true
    ) INTO is_admin;
    
    RETURN is_admin;
END;
$$;
