-- Repair user creation after staff_profiles became the membership user foreign key.
--
-- Public signups need a profile before their membership can be inserted. Platform
-- invitations intentionally skip automatic tenant creation and are attached by the
-- platform RPC after Auth has created the user.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'skip_auto_provision', 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_memberships
    WHERE user_id = NEW.id
  ) THEN
    v_business_id := gen_random_uuid();

    INSERT INTO public.businesses (id, name, organization_type)
    VALUES (
      v_business_id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'My Business') || '''s Business',
      'TRIAL'
    );

    -- business_memberships.user_id references staff_profiles.id in the canonical
    -- schema, so the profile must exist before its membership is created.
    INSERT INTO public.staff_profiles (id, business_id, name, role)
    VALUES (
      NEW.id,
      v_business_id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
      'Owner'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.business_memberships (user_id, business_id, role)
    VALUES (NEW.id, v_business_id, 'Owner');

    INSERT INTO public.locations (id, business_id, name, address)
    VALUES (gen_random_uuid(), v_business_id, 'Main Store', '123 Main St');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_add_tenant_user(
  p_business_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_name text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
  END IF;

  IF p_role NOT IN ('Owner', 'Manager', 'Stylist', 'Support') THEN
    RAISE EXCEPTION 'Invalid tenant role';
  END IF;

  SELECT raw_user_meta_data->>'name'
  INTO v_name
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User account does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
    RAISE EXCEPTION 'Tenant does not exist';
  END IF;

  -- A profile is identity-level. Do not overwrite its home tenant if this is an
  -- existing account receiving an additional membership.
  INSERT INTO public.staff_profiles (id, business_id, name, role)
  VALUES (p_user_id, p_business_id, COALESCE(v_name, 'New User'), p_role)
  ON CONFLICT (id) DO UPDATE
    SET name = COALESCE(public.staff_profiles.name, EXCLUDED.name);

  INSERT INTO public.business_memberships (business_id, user_id, role)
  VALUES (p_business_id, p_user_id, p_role)
  ON CONFLICT (business_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_add_tenant_user(uuid, uuid, text) TO authenticated;
