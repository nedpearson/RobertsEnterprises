-- Restore tenant isolation after milestone schema-alignment compatibility policies.
-- Service-role workers bypass RLS; authenticated users must never receive global
-- FOR ALL access to tenant-owned operational tables.

CREATE OR REPLACE FUNCTION public.is_active_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_business_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = auth.uid()
      AND COALESCE(UPPER(bm.status), 'ACTIVE') = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_manager(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_business_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.business_memberships bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = auth.uid()
      AND COALESCE(UPPER(bm.status), 'ACTIVE') = 'ACTIVE'
      AND UPPER(bm.role) IN ('OWNER', 'ADMIN', 'ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER')
  );
$$;

-- app_settings ---------------------------------------------------------------
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Members can read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Managers can insert app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Managers can update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Managers can delete app_settings" ON public.app_settings;

CREATE POLICY "Members can read app_settings"
ON public.app_settings FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));

CREATE POLICY "Managers can insert app_settings"
ON public.app_settings FOR INSERT
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

CREATE POLICY "Managers can update app_settings"
ON public.app_settings FOR UPDATE
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

CREATE POLICY "Managers can delete app_settings"
ON public.app_settings FOR DELETE
USING (public.is_super_admin() OR public.is_business_manager(business_id));

-- durable_jobs ---------------------------------------------------------------
ALTER TABLE public.durable_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow workers and platform to manage durable_jobs" ON public.durable_jobs;
DROP POLICY IF EXISTS "Managers can read durable_jobs" ON public.durable_jobs;
DROP POLICY IF EXISTS "Platform admins can manage durable_jobs" ON public.durable_jobs;

CREATE POLICY "Managers can read durable_jobs"
ON public.durable_jobs FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));

-- Normal authenticated users never mutate the worker queue. Service-role workers
-- bypass RLS, while platform admins retain explicit emergency control.
CREATE POLICY "Platform admins can manage durable_jobs"
ON public.durable_jobs FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- automation_rules -----------------------------------------------------------
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Members can read automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Managers can insert automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Managers can update automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Managers can delete automation_rules" ON public.automation_rules;

CREATE POLICY "Members can read automation_rules"
ON public.automation_rules FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));

CREATE POLICY "Managers can insert automation_rules"
ON public.automation_rules FOR INSERT
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

CREATE POLICY "Managers can update automation_rules"
ON public.automation_rules FOR UPDATE
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

CREATE POLICY "Managers can delete automation_rules"
ON public.automation_rules FOR DELETE
USING (public.is_super_admin() OR public.is_business_manager(business_id));

-- marketing_budgets ----------------------------------------------------------
ALTER TABLE public.marketing_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to marketing_budgets" ON public.marketing_budgets;
DROP POLICY IF EXISTS "Members can read marketing_budgets" ON public.marketing_budgets;
DROP POLICY IF EXISTS "Managers can insert marketing_budgets" ON public.marketing_budgets;
DROP POLICY IF EXISTS "Managers can update marketing_budgets" ON public.marketing_budgets;
DROP POLICY IF EXISTS "Managers can delete marketing_budgets" ON public.marketing_budgets;

CREATE POLICY "Members can read marketing_budgets"
ON public.marketing_budgets FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));

CREATE POLICY "Managers can insert marketing_budgets"
ON public.marketing_budgets FOR INSERT
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

CREATE POLICY "Managers can update marketing_budgets"
ON public.marketing_budgets FOR UPDATE
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

CREATE POLICY "Managers can delete marketing_budgets"
ON public.marketing_budgets FOR DELETE
USING (public.is_super_admin() OR public.is_business_manager(business_id));

REVOKE ALL ON FUNCTION public.is_active_business_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_manager(uuid) TO authenticated;
