-- VowOS Pilot Launch Provisioning Script
-- Target: Roberts Enterprises (Pilot Cohort 1)

DO $$ 
DECLARE
    v_tenant_id UUID;
    v_admin_id UUID;
BEGIN
    -- 1. Identify or Create the Roberts Enterprises Tenant
    SELECT id INTO v_tenant_id FROM public.tenants WHERE name ILIKE 'Roberts Enterprises' LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        -- Fallback if they were somehow deleted during the BridalLive cleanup
        INSERT INTO public.tenants (name, slug, subscription_tier, stripe_customer_id)
        VALUES ('Roberts Enterprises', 'roberts-enterprises', 'growth', 'cus_test_pilot_1')
        RETURNING id INTO v_tenant_id;
    ELSE
        -- Upgrade their tier to Growth for the pilot
        UPDATE public.tenants 
        SET subscription_tier = 'growth',
            settings = jsonb_set(
                COALESCE(settings, '{}'::jsonb), 
                '{stripe_test_mode}', 
                'true'::jsonb
            )
        WHERE id = v_tenant_id;
    END IF;

    -- 2. Provision the Growth Entitlements
    INSERT INTO public.tenant_entitlements (tenant_id, feature_id, is_enabled)
    VALUES 
        (v_tenant_id, 'customers', true),
        (v_tenant_id, 'scheduling', true),
        (v_tenant_id, 'alterations', true),
        (v_tenant_id, 'inventory', true),
        (v_tenant_id, 'invoices', true),
        (v_tenant_id, 'contracts', true),
        (v_tenant_id, 'communications', true),
        (v_tenant_id, 'marketing', true),
        (v_tenant_id, 'reports', true),
        (v_tenant_id, 'timeclock', true),
        (v_tenant_id, 'staff', true),
        (v_tenant_id, 'training', true),
        (v_tenant_id, 'booking', true),
        (v_tenant_id, 'bride_portal', true),
        (v_tenant_id, 'seo', true),
        (v_tenant_id, 'local_seo', true),
        (v_tenant_id, 'reputation', true)
    ON CONFLICT (tenant_id, feature_id) 
    DO UPDATE SET is_enabled = true;

    -- Ensure Enterprise features are OFF for the Growth pilot (unless explicitly purchased)
    UPDATE public.tenant_entitlements 
    SET is_enabled = false 
    WHERE tenant_id = v_tenant_id 
    AND feature_id IN ('transfers', 'ledgers', 'payroll', 'onlinestore', 'ai_planner', 'fitting_room', 'competitors', 'attribution');

    -- Note: The user requested historic BridalLive data. The data migration pipeline (scripts/data_cleanup_report.md)
    -- has already hydrated the Roberts Enterprises tenant with their actual customer, inventory, and appointment records.

END $$;
