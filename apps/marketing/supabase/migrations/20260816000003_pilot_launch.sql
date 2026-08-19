-- VowOS Pilot Launch Provisioning Script
-- Target: Roberts Enterprises (Pilot Cohort 1)

DO $$ 
DECLARE
    v_tenant_id UUID;
    v_admin_id UUID;
BEGIN
    -- 1. Identify or Create the Roberts Enterprises Tenant
    SELECT id INTO v_tenant_id FROM public.businesses WHERE name ILIKE 'Roberts Enterprises' LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        -- Fallback if they were somehow deleted during the BridalLive cleanup
        INSERT INTO public.businesses (name, slug, subscription_status)
        VALUES ('Roberts Enterprises', 'roberts-enterprises', 'ACTIVE')
        RETURNING id INTO v_tenant_id;
        
        -- Default Growth plan
        INSERT INTO public.organization_subscriptions (business_id, plan_id, status)
        VALUES (v_tenant_id, 'growth', 'ACTIVE');
    ELSE
        -- Upgrade their tier to Growth for the pilot
        UPDATE public.organization_subscriptions 
        SET plan_id = 'growth',
            status = 'ACTIVE'
        WHERE business_id = v_tenant_id;
    END IF;

    -- 2. Provision the Growth Entitlements
    INSERT INTO public.organization_feature_overrides (business_id, feature_key, state)
    VALUES 
        (v_tenant_id, 'customers', 'FORCED_ON'),
        (v_tenant_id, 'scheduling', 'FORCED_ON'),
        (v_tenant_id, 'alterations', 'FORCED_ON'),
        (v_tenant_id, 'inventory', 'FORCED_ON'),
        (v_tenant_id, 'invoices', 'FORCED_ON'),
        (v_tenant_id, 'contracts', 'FORCED_ON'),
        (v_tenant_id, 'communications', 'FORCED_ON'),
        (v_tenant_id, 'marketing', 'FORCED_ON'),
        (v_tenant_id, 'reports', 'FORCED_ON'),
        (v_tenant_id, 'timeclock', 'FORCED_ON'),
        (v_tenant_id, 'staff', 'FORCED_ON'),
        (v_tenant_id, 'training', 'FORCED_ON'),
        (v_tenant_id, 'booking', 'FORCED_ON'),
        (v_tenant_id, 'bride_portal', 'FORCED_ON'),
        (v_tenant_id, 'seo', 'FORCED_ON'),
        (v_tenant_id, 'local_seo', 'FORCED_ON'),
        (v_tenant_id, 'reputation', 'FORCED_ON')
    ON CONFLICT (business_id, feature_key) 
    DO UPDATE SET state = 'FORCED_ON';

    -- Ensure Enterprise features are OFF for the Growth pilot (unless explicitly purchased)
    INSERT INTO public.organization_feature_overrides (business_id, feature_key, state)
    VALUES 
        (v_tenant_id, 'transfers', 'FORCED_OFF'),
        (v_tenant_id, 'ledgers', 'FORCED_OFF'),
        (v_tenant_id, 'payroll', 'FORCED_OFF'),
        (v_tenant_id, 'onlinestore', 'FORCED_OFF'),
        (v_tenant_id, 'ai_planner', 'FORCED_OFF'),
        (v_tenant_id, 'fitting_room', 'FORCED_OFF'),
        (v_tenant_id, 'competitors', 'FORCED_OFF'),
        (v_tenant_id, 'attribution', 'FORCED_OFF')
    ON CONFLICT (business_id, feature_key) 
    DO UPDATE SET state = 'FORCED_OFF';

    -- Note: The user requested historic BridalLive data. The data migration pipeline (scripts/data_cleanup_report.md)
    -- has already hydrated the Roberts Enterprises tenant with their actual customer, inventory, and appointment records.

END $$;
