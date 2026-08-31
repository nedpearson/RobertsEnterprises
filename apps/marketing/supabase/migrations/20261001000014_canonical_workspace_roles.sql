-- Canonical workspace authorization convergence.
--
-- Application authorization recognizes exactly four workspace roles:
--   OWNER, STORE_MANAGER, BRIDAL_CONSULTANT, ALTERATIONS_SPECIALIST.
-- Historical rows/policies used aliases such as Manager, Stylist, Employee,
-- Seamstress, ORG_ADMIN, etc.  This migration keeps those historical values
-- readable while evaluating every authorization decision through one canonical
-- role function. New provisioning writes only canonical values.

CREATE OR REPLACE FUNCTION public.canonical_workspace_role(p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT CASE UPPER(BTRIM(p_role))
    WHEN 'OWNER' THEN 'OWNER'
    WHEN 'ORG_SUPER_ADMIN' THEN 'OWNER'

    WHEN 'STORE_MANAGER' THEN 'STORE_MANAGER'
    WHEN 'STORE MANAGER' THEN 'STORE_MANAGER'
    WHEN 'MANAGER' THEN 'STORE_MANAGER'
    WHEN 'ADMIN' THEN 'STORE_MANAGER'
    WHEN 'ORG_ADMIN' THEN 'STORE_MANAGER'

    WHEN 'BRIDAL_CONSULTANT' THEN 'BRIDAL_CONSULTANT'
    WHEN 'BRIDAL CONSULTANT' THEN 'BRIDAL_CONSULTANT'
    WHEN 'STYLIST' THEN 'BRIDAL_CONSULTANT'
    WHEN 'EMPLOYEE' THEN 'BRIDAL_CONSULTANT'
    WHEN 'FRONT DESK' THEN 'BRIDAL_CONSULTANT'
    WHEN 'FRONT_DESK' THEN 'BRIDAL_CONSULTANT'
    WHEN 'FRONT-DESK' THEN 'BRIDAL_CONSULTANT'

    WHEN 'ALTERATIONS_SPECIALIST' THEN 'ALTERATIONS_SPECIALIST'
    WHEN 'ALTERATIONS SPECIALIST' THEN 'ALTERATIONS_SPECIALIST'
    WHEN 'SEAMSTRESS' THEN 'ALTERATIONS_SPECIALIST'
    WHEN 'ALTERATIONS' THEN 'ALTERATIONS_SPECIALIST'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.canonical_workspace_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.canonical_workspace_role(text) TO authenticated;

-- Replace the shared role predicate so legacy policy role arrays and canonical
-- membership values interoperate without maintaining parallel authorization
-- semantics. Unknown roles fail closed because canonical_workspace_role = NULL.
CREATE OR REPLACE FUNCTION public.user_has_role(check_business_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_business_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.business_memberships bm
      WHERE bm.business_id = check_business_id
        AND bm.user_id = auth.uid()
        AND COALESCE(UPPER(BTRIM(bm.status)), 'ACTIVE') = 'ACTIVE'
        AND public.canonical_workspace_role(bm.role) IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM unnest(COALESCE(allowed_roles, ARRAY[]::text[])) AS requested(role)
          WHERE public.canonical_workspace_role(requested.role)
              = public.canonical_workspace_role(bm.role)
        )
    );
$$;

REVOKE ALL ON FUNCTION public.user_has_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_role(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_active_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_business_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.business_memberships bm
      WHERE bm.business_id = p_business_id
        AND bm.user_id = auth.uid()
        AND COALESCE(UPPER(BTRIM(bm.status)), 'ACTIVE') = 'ACTIVE'
        AND public.canonical_workspace_role(bm.role) IS NOT NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.is_business_manager(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_business_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.business_memberships bm
      WHERE bm.business_id = p_business_id
        AND bm.user_id = auth.uid()
        AND COALESCE(UPPER(BTRIM(bm.status)), 'ACTIVE') = 'ACTIVE'
        AND public.canonical_workspace_role(bm.role) IN ('OWNER', 'STORE_MANAGER')
    );
$$;

REVOKE ALL ON FUNCTION public.is_active_business_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_manager(uuid) TO authenticated;

-- Feature/module preferences previously embedded a second manager-role list.
-- Route all of those policies through the same canonical manager predicate.
DROP POLICY IF EXISTS "Organization admins can insert module preferences" ON public.organization_module_preferences;
DROP POLICY IF EXISTS "Organization admins can update module preferences" ON public.organization_module_preferences;
DROP POLICY IF EXISTS "Organization admins can delete module preferences" ON public.organization_module_preferences;

CREATE POLICY "Organization admins can insert module preferences"
ON public.organization_module_preferences
FOR INSERT
WITH CHECK (
  public.is_super_admin() OR public.is_business_manager(business_id)
);

CREATE POLICY "Organization admins can update module preferences"
ON public.organization_module_preferences
FOR UPDATE
USING (
  public.is_super_admin() OR public.is_business_manager(business_id)
)
WITH CHECK (
  public.is_super_admin() OR public.is_business_manager(business_id)
);

CREATE POLICY "Organization admins can delete module preferences"
ON public.organization_module_preferences
FOR DELETE
USING (
  public.is_super_admin() OR public.is_business_manager(business_id)
);

CREATE OR REPLACE FUNCTION public.update_organization_industry_pack(
  p_business_id uuid,
  p_industry_pack text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack text := LOWER(BTRIM(COALESCE(p_industry_pack, '')));
  v_before text;
  v_after public.organization_subscriptions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_pack NOT IN ('bridal', 'prom', 'menswear', 'general_retail') THEN
    RAISE EXCEPTION 'Unsupported industry pack: %', p_industry_pack;
  END IF;

  IF NOT public.is_super_admin() AND NOT public.is_business_manager(p_business_id) THEN
    RAISE EXCEPTION 'Organization administrator access required';
  END IF;

  SELECT industry_pack INTO v_before
  FROM public.organization_subscriptions
  WHERE business_id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization subscription not found';
  END IF;

  UPDATE public.organization_subscriptions
  SET industry_pack = v_pack,
      updated_at = now()
  WHERE business_id = p_business_id
  RETURNING * INTO v_after;

  INSERT INTO public.audit_logs (
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
    'INDUSTRY_PACK_CHANGED',
    auth.uid(),
    jsonb_build_object('industry_pack', v_before),
    jsonb_build_object('industry_pack', v_pack),
    'Organization terminology pack changed'
  );

  RETURN to_jsonb(v_after);
END;
$$;

REVOKE ALL ON FUNCTION public.update_organization_industry_pack(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_organization_industry_pack(uuid, text) TO authenticated;

-- Tenant-readable platform operations must require an ACTIVE, recognized role,
-- not merely the existence of any membership row.
DROP POLICY IF EXISTS "Tenants can read their own support tickets" ON public.support_tickets;
CREATE POLICY "Tenants can read their own support tickets"
ON public.support_tickets FOR SELECT
USING (public.is_active_business_member(business_id));

DROP POLICY IF EXISTS "Tenants can read their own integration sync status" ON public.integration_sync_status;
CREATE POLICY "Tenants can read their own integration sync status"
ON public.integration_sync_status FOR SELECT
USING (public.is_active_business_member(organization_id));

-- Public self-service registration remains explicit, but it no longer fabricates
-- a store/location or address. Onboarding creates a location only after the
-- customer provides real location data.
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
    'OWNER'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.business_memberships (user_id, business_id, role, status)
  VALUES (NEW.id, v_business_id, 'OWNER', 'ACTIVE')
  ON CONFLICT (user_id, business_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Platform-created tenant users use the same canonical role mapping as the
-- worker API and cannot receive a fifth "Support" tenant role.
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
  v_role text := public.canonical_workspace_role(p_role);
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
  END IF;

  IF v_role IS NULL THEN
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

  INSERT INTO public.staff_profiles (id, business_id, name, role)
  VALUES (p_user_id, p_business_id, COALESCE(v_name, 'New User'), v_role)
  ON CONFLICT (id) DO UPDATE
    SET name = COALESCE(public.staff_profiles.name, EXCLUDED.name);

  INSERT INTO public.business_memberships (business_id, user_id, role, status)
  VALUES (p_business_id, p_user_id, v_role, 'ACTIVE')
  ON CONFLICT (business_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'ACTIVE';

  RETURN jsonb_build_object('success', true, 'role', v_role);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_add_tenant_user(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_add_tenant_user(uuid, uuid, text) TO authenticated;
