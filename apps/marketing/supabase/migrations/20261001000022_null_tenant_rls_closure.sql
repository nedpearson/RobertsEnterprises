-- Close the null-tenant escape hatch in RLS.
--
-- Twenty policies were written as "(business_id IS NULL) OR <real tenant check>".
-- A row whose tenant column is NULL therefore satisfied the policy for EVERY
-- caller. None of these policies declared WITH CHECK, so on FOR ALL policies the
-- same expression gated writes: any member could INSERT a row with a NULL tenant
-- and it became visible to every other tenant. No migration seeds NULL-tenant
-- rows in any of these tables, so the clause was permissiveness, not a
-- shared-defaults feature.
--
-- Existing NULL-tenant rows are counted into tenant_orphan_audit BEFORE the
-- policies tighten, so nothing disappears silently.

-- 1. Record what is already orphaned -----------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_orphan_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    orphan_rows BIGINT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenant_orphan_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read tenant orphan audit" ON public.tenant_orphan_audit;
CREATE POLICY "Super admins read tenant orphan audit"
ON public.tenant_orphan_audit FOR SELECT
USING (public.is_super_admin());

DO $audit$
DECLARE
    v_table TEXT;
    v_count BIGINT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'document_templates', 'google_drive_watches', 'integration_circuit_breakers',
        'integration_dlq_events', 'integration_error_logs', 'integration_recovery_timelines',
        'integration_sync_cursors', 'measurements', 'pickups', 'sales_goals',
        'settings_values', 'staff_contacts', 'staff_schedules', 'time_entries', 'try_on_notes'
    ]
    LOOP
        EXECUTE format('SELECT count(*) FROM public.%I WHERE business_id IS NULL', v_table)
           INTO v_count;
        IF v_count > 0 THEN
            INSERT INTO public.tenant_orphan_audit (source_table, orphan_rows)
            VALUES (v_table, v_count);
            RAISE NOTICE 'null-tenant rows retained but no longer globally visible: % (%)', v_table, v_count;
        END IF;
    END LOOP;
END
$audit$;

-- 2. Member-scoped operational tables (FOR ALL) ------------------------------

DO $member_all$
DECLARE
    v_spec TEXT[];
BEGIN
    FOREACH v_spec SLICE 1 IN ARRAY ARRAY[
        ARRAY['measurements',   'Members can access measurements'],
        ARRAY['pickups',        'Members can access pickups'],
        ARRAY['staff_contacts', 'Members can access staff_contacts'],
        ARRAY['try_on_notes',   'Members can access try_on_notes'],
        ARRAY['time_entries',   'Members can modify time_entries']
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_spec[2], v_spec[1]);
        EXECUTE format($fmt$
            CREATE POLICY %I ON public.%I FOR ALL
            USING (
                business_id IS NOT NULL
                AND public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER','EMPLOYEE','Stylist'])
            )
            WITH CHECK (
                business_id IS NOT NULL
                AND public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER','EMPLOYEE','Stylist'])
            )
        $fmt$, v_spec[2], v_spec[1]);
    END LOOP;
END
$member_all$;

-- 3. Member-scoped read-only policies ----------------------------------------

DO $member_read$
DECLARE
    v_spec TEXT[];
BEGIN
    FOREACH v_spec SLICE 1 IN ARRAY ARRAY[
        ARRAY['sales_goals',     'Members can view sales_goals'],
        ARRAY['staff_schedules', 'Members can view staff_schedules'],
        ARRAY['time_entries',    'Members can view time_entries']
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_spec[2], v_spec[1]);
        EXECUTE format($fmt$
            CREATE POLICY %I ON public.%I FOR SELECT
            USING (
                business_id IS NOT NULL
                AND public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER','EMPLOYEE','Stylist'])
            )
        $fmt$, v_spec[2], v_spec[1]);
    END LOOP;
END
$member_read$;

-- 4. Manager-scoped write policies -------------------------------------------

DO $manager_all$
DECLARE
    v_spec TEXT[];
BEGIN
    FOREACH v_spec SLICE 1 IN ARRAY ARRAY[
        ARRAY['sales_goals',     'Managers can modify sales_goals'],
        ARRAY['staff_schedules', 'Managers can modify staff_schedules']
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_spec[2], v_spec[1]);
        EXECUTE format($fmt$
            CREATE POLICY %I ON public.%I FOR ALL
            USING (
                business_id IS NOT NULL
                AND public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER'])
            )
            WITH CHECK (
                business_id IS NOT NULL
                AND public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER'])
            )
        $fmt$, v_spec[2], v_spec[1]);
    END LOOP;
END
$manager_all$;

-- 5. Tenant-scoped integration telemetry (read-only, super admin retained) ----

DO $integration_read$
DECLARE
    v_spec TEXT[];
BEGIN
    FOREACH v_spec SLICE 1 IN ARRAY ARRAY[
        ARRAY['google_drive_watches',           'Tenants can view their google drive watches'],
        ARRAY['integration_circuit_breakers',   'Tenants can view their circuit breakers'],
        ARRAY['integration_dlq_events',         'Tenants can view their dlq events'],
        ARRAY['integration_error_logs',         'Tenants can view their error logs'],
        ARRAY['integration_recovery_timelines', 'Tenants can view their recovery timelines'],
        ARRAY['integration_sync_cursors',       'Tenants can view their sync cursors']
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_spec[2], v_spec[1]);
        EXECUTE format($fmt$
            CREATE POLICY %I ON public.%I FOR SELECT
            USING (
                public.is_super_admin()
                OR (
                    business_id IS NOT NULL
                    AND public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER','EMPLOYEE','Stylist'])
                )
            )
        $fmt$, v_spec[2], v_spec[1]);
    END LOOP;
END
$integration_read$;

-- 6. Membership-scoped configuration tables ----------------------------------

DROP POLICY IF EXISTS "Enable read for business members" ON public.document_templates;
CREATE POLICY "Enable read for business members"
ON public.document_templates FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));

DROP POLICY IF EXISTS "Enable modify for business members" ON public.document_templates;
CREATE POLICY "Enable modify for business members"
ON public.document_templates FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

DROP POLICY IF EXISTS "Enable all access for business members on settings_values" ON public.settings_values;
CREATE POLICY "Enable all access for business members on settings_values"
ON public.settings_values FOR ALL
USING (public.is_super_admin() OR public.is_active_business_member(business_id))
WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id));

-- settings_versions inherits its tenant through settings_values.
DROP POLICY IF EXISTS "Enable all access for business members on settings_versions" ON public.settings_versions;
CREATE POLICY "Enable all access for business members on settings_versions"
ON public.settings_versions FOR ALL
USING (
    setting_value_id IN (
        SELECT sv.id FROM public.settings_values sv
         WHERE public.is_super_admin() OR public.is_active_business_member(sv.business_id)
    )
)
WITH CHECK (
    setting_value_id IN (
        SELECT sv.id FROM public.settings_values sv
         WHERE public.is_super_admin() OR public.is_active_business_member(sv.business_id)
    )
);
