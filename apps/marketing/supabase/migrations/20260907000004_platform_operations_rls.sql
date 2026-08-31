DO $$
BEGIN
  DROP POLICY IF EXISTS "Super admins can read platform incidents" ON public.platform_incidents;
  DROP POLICY IF EXISTS "Super admins can update platform incidents" ON public.platform_incidents;
  DROP POLICY IF EXISTS "Super admins can read platform failed jobs" ON public.platform_failed_jobs;
  DROP POLICY IF EXISTS "Super admins can read support tickets" ON public.support_tickets;
  DROP POLICY IF EXISTS "Tenants can read their own support tickets" ON public.support_tickets;
END $$;

CREATE POLICY "Super admins can read platform incidents"
  ON public.platform_incidents
  FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can update platform incidents"
  ON public.platform_incidents
  FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can read platform failed jobs"
  ON public.platform_failed_jobs
  FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can read support tickets"
  ON public.support_tickets
  FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Tenants can read their own support tickets"
  ON public.support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_memberships bm
      WHERE bm.business_id = support_tickets.business_id
        AND bm.user_id = auth.uid()
        AND UPPER(COALESCE(bm.status::text, '')) = 'ACTIVE'
    )
  );
