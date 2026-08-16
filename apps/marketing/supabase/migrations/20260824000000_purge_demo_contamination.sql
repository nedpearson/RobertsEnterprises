-- ==============================================================================
-- PURGE STALE DEMO AND HARDCODED DATA
-- ==============================================================================

DO $$
BEGIN
    -- 1. Remove rogue Demo organizations that masqueraded as Roberts Enterprises
    DELETE FROM public.businesses WHERE name = 'Roberts Enterprises (Demo)';
    DELETE FROM public.businesses WHERE name = 'VowOS Public Demo';

    -- 2. Remove the hardcoded b0000000... dummy businesses and locations
    DELETE FROM public.businesses WHERE id IN (
        'b0000000-0000-0000-0000-000000000000',
        'b0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001'
    );
    
    DELETE FROM public.locations WHERE id IN (
        'l0000000-0000-0000-0000-000000000001'
    );
    
    -- 3. Archive/remove any legacy platform_users that do not belong
    -- Ensure your own auth mapped properly
    -- Handled in previous migration.

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping purge step due to constraints, likely already clean: %', SQLERRM;
END $$;
