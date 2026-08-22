-- Stabilize the Platform Organizations directory.
-- The previous RPC referenced organization_subscriptions.price_cents, a column that
-- does not exist. Pricing remains a presentation/catalog concern; the RPC returns
-- the persisted plan/status so callers can resolve the current catalog price.

CREATE OR REPLACE FUNCTION public.platform_get_organizations(
    p_search text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_page integer DEFAULT 1,
    p_page_size integer DEFAULT 25
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_count integer;
    v_results jsonb;
    v_page integer := GREATEST(COALESCE(p_page, 1), 1);
    v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
    v_offset integer;
    v_search text := NULLIF(BTRIM(p_search), '');
    v_status text := NULLIF(UPPER(BTRIM(p_status)), '');
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
    END IF;

    v_offset := (v_page - 1) * v_page_size;

    SELECT count(*)
      INTO v_total_count
      FROM public.businesses b
      LEFT JOIN public.organization_health_scores h
        ON h.organization_id = b.id
     WHERE b.parent_id IS NULL
       AND (v_search IS NULL OR b.name ILIKE '%' || v_search || '%')
       AND (v_status IS NULL OR COALESCE(UPPER(h.health_status), 'UNKNOWN') = v_status);

    WITH orgs AS (
        SELECT
            b.id,
            b.name,
            b.organization_type,
            b.created_at,
            COALESCE(h.health_status, 'UNKNOWN') AS health_status,
            COALESCE(h.health_score, 0) AS health_score,
            sub.plan_id,
            sub.status AS subscription_status,
            (
                SELECT count(*)
                  FROM public.support_tickets st
                 WHERE st.business_id = b.id
                   AND st.status = 'OPEN'
            ) AS open_tickets
        FROM public.businesses b
        LEFT JOIN public.organization_health_scores h
          ON h.organization_id = b.id
        LEFT JOIN public.organization_subscriptions sub
          ON sub.business_id = b.id
        WHERE b.parent_id IS NULL
          AND (v_search IS NULL OR b.name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR COALESCE(UPPER(h.health_status), 'UNKNOWN') = v_status)
        ORDER BY b.created_at DESC
        LIMIT v_page_size
        OFFSET v_offset
    )
    SELECT COALESCE(jsonb_agg(to_jsonb(orgs)), '[]'::jsonb)
      INTO v_results
      FROM orgs;

    RETURN jsonb_build_object(
        'data', v_results,
        'metadata', jsonb_build_object(
            'total_count', v_total_count,
            'page', v_page,
            'page_size', v_page_size,
            'total_pages', CASE
                WHEN v_total_count = 0 THEN 1
                ELSE CEIL(v_total_count::numeric / v_page_size::numeric)::integer
            END
        )
    );
END;
$$;

COMMENT ON FUNCTION public.platform_get_organizations(text, text, integer, integer)
IS 'Platform-only paginated organization directory. p_status filters health status. Returns persisted subscription plan/status without duplicating catalog pricing in SQL.';
