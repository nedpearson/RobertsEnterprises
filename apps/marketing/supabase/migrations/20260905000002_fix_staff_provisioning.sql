
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_business_id uuid;
BEGIN
  -- If skip_auto_provision is set in metadata, do not create a default business
  IF NEW.raw_user_meta_data->>'skip_auto_provision' = 'true' THEN
    RETURN NEW;
  END IF;

  -- We don't auto-create if a membership was somehow already seeded (unlikely in normal flow)
  IF NOT EXISTS (SELECT 1 FROM public.business_memberships WHERE user_id = NEW.id) THEN
    v_business_id := gen_random_uuid();
    
    INSERT INTO public.businesses (id, name)
    VALUES (v_business_id, COALESCE(NEW.raw_user_meta_data->>'name', 'My Business') || '''s Business');

    INSERT INTO public.business_memberships (user_id, business_id, role)
    VALUES (NEW.id, v_business_id, 'Owner');

    INSERT INTO public.locations (id, business_id, name, address)
    VALUES (gen_random_uuid(), v_business_id, 'Main Store', '123 Main St');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for Platform Admins to add a user to a tenant
CREATE OR REPLACE FUNCTION platform_add_tenant_user(
    p_business_id uuid,
    p_user_id uuid,
    p_role text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
    END IF;
    
    INSERT INTO business_memberships (business_id, user_id, role)
    VALUES (p_business_id, p_user_id, p_role)
    ON CONFLICT (business_id, user_id) DO UPDATE SET role = EXCLUDED.role;
    
    -- Also ensure they have a staff profile
    INSERT INTO staff_profiles (id, name, role)
    SELECT p_user_id, raw_user_meta_data->>'name', p_role
    FROM auth.users WHERE id = p_user_id
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

