-- Harden organization-owned feature settings.
-- Feature preferences customize an entitlement the tenant already owns; they must
-- never grant a paid capability or be mutable by an arbitrary employee.

DROP POLICY IF EXISTS "Enable write access for organization members" ON public.organization_module_preferences;
DROP POLICY IF EXISTS "Organization admins can insert module preferences" ON public.organization_module_preferences;
DROP POLICY IF EXISTS "Organization admins can update module preferences" ON public.organization_module_preferences;
DROP POLICY IF EXISTS "Organization admins can delete module preferences" ON public.organization_module_preferences;

CREATE POLICY "Organization admins can insert module preferences"
ON public.organization_module_preferences
FOR INSERT
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = organization_module_preferences.business_id
      AND bm.user_id = auth.uid()
      AND COALESCE(UPPER(bm.status), 'ACTIVE') = 'ACTIVE'
      AND UPPER(bm.role) IN ('OWNER', 'ADMIN', 'ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER')
  )
);

CREATE POLICY "Organization admins can update module preferences"
ON public.organization_module_preferences
FOR UPDATE
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = organization_module_preferences.business_id
      AND bm.user_id = auth.uid()
      AND COALESCE(UPPER(bm.status), 'ACTIVE') = 'ACTIVE'
      AND UPPER(bm.role) IN ('OWNER', 'ADMIN', 'ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = organization_module_preferences.business_id
      AND bm.user_id = auth.uid()
      AND COALESCE(UPPER(bm.status), 'ACTIVE') = 'ACTIVE'
      AND UPPER(bm.role) IN ('OWNER', 'ADMIN', 'ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER')
  )
);

CREATE POLICY "Organization admins can delete module preferences"
ON public.organization_module_preferences
FOR DELETE
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = organization_module_preferences.business_id
      AND bm.user_id = auth.uid()
      AND COALESCE(UPPER(bm.status), 'ACTIVE') = 'ACTIVE'
      AND UPPER(bm.role) IN ('OWNER', 'ADMIN', 'ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER')
  )
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

  IF NOT public.is_super_admin() AND NOT EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = auth.uid()
      AND COALESCE(UPPER(bm.status), 'ACTIVE') = 'ACTIVE'
      AND UPPER(bm.role) IN ('OWNER', 'ADMIN', 'ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER')
  ) THEN
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
