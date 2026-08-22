-- Core operational records must be visible or mutable only by active members
-- of the row's organization. This replaces legacy FOR ALL policies that did
-- not require membership status to be ACTIVE.
DO $$
DECLARE
  tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'customers', 'leads', 'appointments', 'invoices',
    'purchase_orders', 'gowns', 'transfers'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for business members" ON public.%I', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS "Active members can read %1$s" ON public.%1$I', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS "Active members can insert %1$s" ON public.%1$I', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS "Active members can update %1$s" ON public.%1$I', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS "Active members can delete %1$s" ON public.%1$I', tenant_table);

    EXECUTE format(
      'CREATE POLICY "Active members can read %1$s" ON public.%1$I FOR SELECT USING (public.is_super_admin() OR public.is_active_business_member(business_id))',
      tenant_table
    );
    EXECUTE format(
      'CREATE POLICY "Active members can insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id))',
      tenant_table
    );
    EXECUTE format(
      'CREATE POLICY "Active members can update %1$s" ON public.%1$I FOR UPDATE USING (public.is_super_admin() OR public.is_active_business_member(business_id)) WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id))',
      tenant_table
    );
    EXECUTE format(
      'CREATE POLICY "Active members can delete %1$s" ON public.%1$I FOR DELETE USING (public.is_super_admin() OR public.is_active_business_member(business_id))',
      tenant_table
    );
  END LOOP;
END;
$$;
