-- Close direct-browser mutation paths for workforce records. The worker uses the
-- service role after canonical API authorization; browser RLS is self-or-manager.

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can modify time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Staff or managers can insert time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Staff or managers can update time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Managers can delete time entries" ON public.time_entries;

CREATE POLICY "Staff or managers can insert time entries"
ON public.time_entries FOR INSERT
WITH CHECK (
  public.is_super_admin()
  OR public.is_business_manager(business_id)
  OR (public.is_active_business_member(business_id) AND user_id = auth.uid())
);

CREATE POLICY "Staff or managers can update time entries"
ON public.time_entries FOR UPDATE
USING (
  public.is_super_admin()
  OR public.is_business_manager(business_id)
  OR (public.is_active_business_member(business_id) AND user_id = auth.uid())
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_business_manager(business_id)
  OR (public.is_active_business_member(business_id) AND user_id = auth.uid())
);

CREATE POLICY "Managers can delete time entries"
ON public.time_entries FOR DELETE
USING (public.is_super_admin() OR public.is_business_manager(business_id));

ALTER TABLE public.time_entry_breaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage time entry breaks" ON public.time_entry_breaks;
DROP POLICY IF EXISTS "Staff or managers can insert time entry breaks" ON public.time_entry_breaks;
DROP POLICY IF EXISTS "Staff or managers can update time entry breaks" ON public.time_entry_breaks;
DROP POLICY IF EXISTS "Managers can delete time entry breaks" ON public.time_entry_breaks;

CREATE POLICY "Staff or managers can insert time entry breaks"
ON public.time_entry_breaks FOR INSERT
WITH CHECK (
  public.is_super_admin()
  OR public.is_business_manager(business_id)
  OR EXISTS (
    SELECT 1 FROM public.time_entries te
    WHERE te.id = time_entry_id
      AND te.business_id = business_id
      AND te.user_id = auth.uid()
  )
);

CREATE POLICY "Staff or managers can update time entry breaks"
ON public.time_entry_breaks FOR UPDATE
USING (
  public.is_super_admin()
  OR public.is_business_manager(business_id)
  OR EXISTS (
    SELECT 1 FROM public.time_entries te
    WHERE te.id = time_entry_id
      AND te.business_id = business_id
      AND te.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_business_manager(business_id)
  OR EXISTS (
    SELECT 1 FROM public.time_entries te
    WHERE te.id = time_entry_id
      AND te.business_id = business_id
      AND te.user_id = auth.uid()
  )
);

CREATE POLICY "Managers can delete time entry breaks"
ON public.time_entry_breaks FOR DELETE
USING (public.is_super_admin() OR public.is_business_manager(business_id));

ALTER TABLE public.time_entry_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Managers can manage time entry transfers" ON public.time_entry_transfers;
DROP POLICY IF EXISTS "Staff or managers can insert time entry transfers" ON public.time_entry_transfers;
DROP POLICY IF EXISTS "Managers can update time entry transfers" ON public.time_entry_transfers;
DROP POLICY IF EXISTS "Managers can delete time entry transfers" ON public.time_entry_transfers;

CREATE POLICY "Staff or managers can insert time entry transfers"
ON public.time_entry_transfers FOR INSERT
WITH CHECK (
  public.is_super_admin()
  OR public.is_business_manager(business_id)
  OR EXISTS (
    SELECT 1 FROM public.time_entries te
    WHERE te.id = time_entry_id
      AND te.business_id = business_id
      AND te.user_id = auth.uid()
  )
);

CREATE POLICY "Managers can update time entry transfers"
ON public.time_entry_transfers FOR UPDATE
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

CREATE POLICY "Managers can delete time entry transfers"
ON public.time_entry_transfers FOR DELETE
USING (public.is_super_admin() OR public.is_business_manager(business_id));
