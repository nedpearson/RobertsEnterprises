-- Auth users are created by multiple flows. Only the public self-service
-- registration flow is allowed to create a default tenant. Support-created
-- tenant users are attached by platform_add_tenant_user after Auth succeeds.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'provision_default_tenant', 'false') <> 'true' THEN
    RETURN NEW;
  END IF;

  v_business_id := gen_random_uuid();

  INSERT INTO public.businesses (id, name, organization_type)
  VALUES (
    v_business_id,
    COALESCE(
      NULLIF(trim(concat_ws(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')), ''),
      NEW.raw_user_meta_data->>'name',
      'My Business'
    ) || '''s Business',
    'TRIAL'
  );

  INSERT INTO public.staff_profiles (id, business_id, name, role)
  VALUES (
    NEW.id,
    v_business_id,
    COALESCE(
      NULLIF(trim(concat_ws(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')), ''),
      NEW.raw_user_meta_data->>'name',
      'New User'
    ),
    'Owner'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.business_memberships (user_id, business_id, role)
  VALUES (NEW.id, v_business_id, 'Owner')
  ON CONFLICT (user_id, business_id) DO NOTHING;

  INSERT INTO public.locations (id, business_id, name, address)
  VALUES (gen_random_uuid(), v_business_id, 'Main Store', '123 Main St');

  RETURN NEW;
END;
$$;
