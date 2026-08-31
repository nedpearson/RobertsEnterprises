
-- RPC for fetching paginated and enriched organizations list for Platform Admin
CREATE OR REPLACE FUNCTION platform_get_organizations(
    p_search text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_page integer DEFAULT 1,
    p_page_size integer DEFAULT 25
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_count integer;
    v_results jsonb;
    v_offset integer;
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
    END IF;
    
    v_offset := (p_page - 1) * p_page_size;

    -- Count total records matching filter
    SELECT count(*) INTO v_total_count
    FROM public.businesses b
    LEFT JOIN public.organization_health_scores h ON h.organization_id = b.id
    WHERE b.parent_id IS NULL
      AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR COALESCE(h.health_status, 'UNKNOWN') = p_status);

    -- Fetch paginated results
    WITH orgs AS (
        SELECT 
            b.id,
            b.name,
            b.organization_type,
            b.created_at,
            COALESCE(h.health_status, 'UNKNOWN') as health_status,
            COALESCE(h.health_score, 0) as health_score,
            (
                SELECT sum(sub.price_cents)
                FROM public.organization_subscriptions sub
                WHERE sub.business_id = b.id AND sub.status = 'ACTIVE'
            ) as mrr_cents,
            (
                SELECT count(*)
                FROM public.support_tickets st
                WHERE st.business_id = b.id AND st.status = 'OPEN'
            ) as open_tickets
        FROM public.businesses b
        LEFT JOIN public.organization_health_scores h ON h.organization_id = b.id
        WHERE b.parent_id IS NULL
          AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%')
          AND (p_status IS NULL OR COALESCE(h.health_status, 'UNKNOWN') = p_status)
        ORDER BY b.created_at DESC
        LIMIT p_page_size
        OFFSET v_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(orgs)), '[]'::jsonb) INTO v_results FROM orgs;

    RETURN jsonb_build_object(
        'data', v_results,
        'metadata', jsonb_build_object(
            'total_count', v_total_count,
            'page', p_page,
            'page_size', p_page_size,
            'total_pages', CEIL(v_total_count::numeric / p_page_size::numeric)
        )
    );
END;
$$;
