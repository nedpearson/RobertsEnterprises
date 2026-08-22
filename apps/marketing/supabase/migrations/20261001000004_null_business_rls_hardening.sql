-- Remove residual null-business / allow-all tenant escapes introduced during schema alignment.

-- time_entries ----------------------------------------------------------------
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Members can modify time_entries" ON public.time_entries;
CREATE POLICY "Members can view time_entries"
ON public.time_entries FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "Members can modify time_entries"
ON public.time_entries FOR ALL
USING (public.is_super_admin() OR public.is_active_business_member(business_id))
WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id));

-- sales_goals -----------------------------------------------------------------
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view sales_goals" ON public.sales_goals;
DROP POLICY IF EXISTS "Managers can modify sales_goals" ON public.sales_goals;
CREATE POLICY "Members can view sales_goals"
ON public.sales_goals FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "Managers can modify sales_goals"
ON public.sales_goals FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

-- try_on_notes ----------------------------------------------------------------
ALTER TABLE public.try_on_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can access try_on_notes" ON public.try_on_notes;
CREATE POLICY "Members can access try_on_notes"
ON public.try_on_notes FOR ALL
USING (public.is_super_admin() OR public.is_active_business_member(business_id))
WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id));

-- measurements ----------------------------------------------------------------
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can access measurements" ON public.measurements;
CREATE POLICY "Members can access measurements"
ON public.measurements FOR ALL
USING (public.is_super_admin() OR public.is_active_business_member(business_id))
WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id));

-- staff_schedules -------------------------------------------------------------
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view staff_schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "Managers can modify staff_schedules" ON public.staff_schedules;
CREATE POLICY "Members can view staff_schedules"
ON public.staff_schedules FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "Managers can modify staff_schedules"
ON public.staff_schedules FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

-- staff_contacts --------------------------------------------------------------
ALTER TABLE public.staff_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can access staff_contacts" ON public.staff_contacts;
CREATE POLICY "Members can access staff_contacts"
ON public.staff_contacts FOR ALL
USING (public.is_super_admin() OR public.is_active_business_member(business_id))
WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id));

-- pickups ---------------------------------------------------------------------
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can access pickups" ON public.pickups;
CREATE POLICY "Members can access pickups"
ON public.pickups FOR ALL
USING (public.is_super_admin() OR public.is_active_business_member(business_id))
WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id));

-- integration tables ----------------------------------------------------------
ALTER TABLE public.integration_circuit_breakers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can view their circuit breakers" ON public.integration_circuit_breakers;
DROP POLICY IF EXISTS "Managers can update their circuit breakers" ON public.integration_circuit_breakers;
CREATE POLICY "Tenants can view their circuit breakers"
ON public.integration_circuit_breakers FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "Managers can update their circuit breakers"
ON public.integration_circuit_breakers FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

ALTER TABLE public.integration_sync_cursors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can view their sync cursors" ON public.integration_sync_cursors;
DROP POLICY IF EXISTS "Managers can update their sync cursors" ON public.integration_sync_cursors;
CREATE POLICY "Tenants can view their sync cursors"
ON public.integration_sync_cursors FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "Managers can update their sync cursors"
ON public.integration_sync_cursors FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

ALTER TABLE public.integration_error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can view their error logs" ON public.integration_error_logs;
DROP POLICY IF EXISTS "Managers can manage their error logs" ON public.integration_error_logs;
CREATE POLICY "Tenants can view their error logs"
ON public.integration_error_logs FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "Managers can manage their error logs"
ON public.integration_error_logs FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

ALTER TABLE public.integration_recovery_timelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can view their recovery timelines" ON public.integration_recovery_timelines;
DROP POLICY IF EXISTS "Managers can manage their recovery timelines" ON public.integration_recovery_timelines;
CREATE POLICY "Tenants can view their recovery timelines"
ON public.integration_recovery_timelines FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "Managers can manage their recovery timelines"
ON public.integration_recovery_timelines FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

ALTER TABLE public.integration_dlq_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can view their dlq events" ON public.integration_dlq_events;
DROP POLICY IF EXISTS "Managers can manage their dlq events" ON public.integration_dlq_events;
CREATE POLICY "Tenants can view their dlq events"
ON public.integration_dlq_events FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "Managers can manage their dlq events"
ON public.integration_dlq_events FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

ALTER TABLE public.google_drive_watches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenants can view their google drive watches" ON public.google_drive_watches;
DROP POLICY IF EXISTS "Managers can manage their google drive watches" ON public.google_drive_watches;
CREATE POLICY "Tenants can view their google drive watches"
ON public.google_drive_watches FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
CREATE POLICY "Managers can manage their google drive watches"
ON public.google_drive_watches FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));
