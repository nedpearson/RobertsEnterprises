-- ============================================================================
-- VowOS Platform stabilization: authoritative metrics and operator mutations
-- ============================================================================

-- Corporate sales needs a real expected value/source instead of a UI estimate.
ALTER TABLE public.platform_leads
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'PLATFORM_ADMIN',
  ADD COLUMN IF NOT EXISTS estimated_mrr_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_platform_leads_status_created
  ON public.platform_leads(status, created_at DESC);

-- Correct the organization directory RPC. The prior function referenced
-- organization_subscriptions.price_cents even though the live canonical field is
-- effective_price_cents, which caused the entire Organizations view to fail.
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
    v_offset integer;
    v_page integer := GREATEST(COALESCE(p_page, 1), 1);
    v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
    END IF;

    v_offset := (v_page - 1) * v_page_size;

    SELECT count(*) INTO v_total_count
    FROM public.businesses b
    WHERE b.parent_id IS NULL
      AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%' OR b.slug ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR b.status = p_status OR b.organization_type = p_status);

    WITH orgs AS (
        SELECT
            b.id,
            b.name,
            b.slug,
            b.organization_type,
            b.status,
            b.onboarding_status,
            b.created_at,
            COALESCE(h.health_status, CASE WHEN b.status IN ('SUSPENDED','READ_ONLY') THEN 'AT_RISK' ELSE 'UNKNOWN' END) AS health_status,
            COALESCE(h.health_score, 0) AS health_score,
            COALESCE((
                SELECT sum(COALESCE(sub.effective_price_cents, 0))
                FROM public.organization_subscriptions sub
                WHERE sub.business_id = b.id AND upper(sub.status) IN ('ACTIVE','TRIALING','COMPLIMENTARY')
            ), 0) AS mrr_cents,
            (
                SELECT count(*)
                FROM public.support_tickets st
                WHERE COALESCE(st.business_id, st.organization_id, st.tenant_id) = b.id
                  AND upper(COALESCE(st.status, 'OPEN')) NOT IN ('RESOLVED','CLOSED')
            ) AS open_tickets,
            (
                SELECT count(*)
                FROM public.business_memberships bm
                WHERE bm.business_id = b.id
            ) AS user_count,
            (
                SELECT count(*)
                FROM public.locations l
                WHERE l.business_id = b.id
            ) AS location_count,
            (
                SELECT count(*)
                FROM public.business_brands bb
                WHERE bb.business_id = b.id
            ) AS brand_count
        FROM public.businesses b
        LEFT JOIN public.organization_health_scores h ON h.organization_id = b.id
        WHERE b.parent_id IS NULL
          AND (p_search IS NULL OR b.name ILIKE '%' || p_search || '%' OR b.slug ILIKE '%' || p_search || '%')
          AND (p_status IS NULL OR b.status = p_status OR b.organization_type = p_status)
        ORDER BY b.created_at DESC
        LIMIT v_page_size
        OFFSET v_offset
    )
    SELECT COALESCE(jsonb_agg(to_jsonb(orgs)), '[]'::jsonb) INTO v_results FROM orgs;

    RETURN jsonb_build_object(
        'data', v_results,
        'metadata', jsonb_build_object(
            'total_count', v_total_count,
            'page', v_page,
            'page_size', v_page_size,
            'total_pages', CASE WHEN v_total_count = 0 THEN 1 ELSE CEIL(v_total_count::numeric / v_page_size::numeric) END
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_command_center_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orgs integer := 0;
  v_new_7d integer := 0;
  v_new_30d integer := 0;
  v_trials integer := 0;
  v_mrr bigint := 0;
  v_active_users integer := 0;
  v_at_risk integer := 0;
  v_open_tickets integer := 0;
  v_failed_jobs integer := 0;
  v_open_incidents integer := 0;
  v_integration_failures integer := 0;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
  END IF;

  SELECT count(*) INTO v_orgs FROM public.businesses WHERE parent_id IS NULL;
  SELECT count(*) INTO v_new_7d FROM public.businesses WHERE parent_id IS NULL AND created_at >= now() - interval '7 days';
  SELECT count(*) INTO v_new_30d FROM public.businesses WHERE parent_id IS NULL AND created_at >= now() - interval '30 days';

  SELECT count(*) INTO v_trials
  FROM public.organization_subscriptions
  WHERE upper(status) IN ('TRIAL','TRIALING');

  SELECT COALESCE(sum(COALESCE(effective_price_cents, 0)), 0) INTO v_mrr
  FROM public.organization_subscriptions
  WHERE upper(status) IN ('ACTIVE','TRIALING','COMPLIMENTARY');

  SELECT count(DISTINCT u.id) INTO v_active_users
  FROM auth.users u
  JOIN public.business_memberships bm ON bm.user_id = u.id
  WHERE u.last_sign_in_at >= now() - interval '30 days';

  SELECT count(DISTINCT org_id) INTO v_at_risk
  FROM (
    SELECT id AS org_id FROM public.businesses WHERE parent_id IS NULL AND status IN ('SUSPENDED','READ_ONLY')
    UNION
    SELECT organization_id AS org_id FROM public.integration_sync_status WHERE status = 'FAILED' AND organization_id IS NOT NULL
  ) risk;

  SELECT count(*) INTO v_open_tickets
  FROM public.support_tickets
  WHERE upper(COALESCE(status, 'OPEN')) NOT IN ('RESOLVED','CLOSED');

  SELECT count(*) INTO v_failed_jobs
  FROM public.platform_failed_jobs
  WHERE status IN ('FAILED','MANUAL_REVIEW');

  SELECT count(*) INTO v_open_incidents
  FROM public.platform_incidents
  WHERE status <> 'RESOLVED';

  SELECT count(*) INTO v_integration_failures
  FROM public.integration_sync_status
  WHERE status = 'FAILED';

  RETURN jsonb_build_object(
    'total_organizations', v_orgs,
    'new_organizations_7d', v_new_7d,
    'new_organizations_30d', v_new_30d,
    'active_trials', v_trials,
    'mrr_cents', v_mrr,
    'active_users_30d', v_active_users,
    'at_risk', v_at_risk,
    'open_tickets', v_open_tickets,
    'failed_jobs', v_failed_jobs,
    'open_incidents', v_open_incidents,
    'integration_failures', v_integration_failures,
    'generated_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_create_lead(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_company_name text,
  p_phone text DEFAULT NULL,
  p_lead_type text DEFAULT 'DEMO',
  p_source text DEFAULT 'PLATFORM_ADMIN',
  p_estimated_mrr_cents integer DEFAULT 0,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_leads;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
  END IF;

  IF trim(COALESCE(p_first_name,'')) = '' OR trim(COALESCE(p_last_name,'')) = ''
     OR trim(COALESCE(p_email,'')) = '' OR trim(COALESCE(p_company_name,'')) = '' THEN
    RAISE EXCEPTION 'First name, last name, email, and company are required';
  END IF;

  IF upper(p_lead_type) NOT IN ('DEMO','PLAN_REQUEST') THEN
    RAISE EXCEPTION 'Invalid lead type';
  END IF;

  INSERT INTO public.platform_leads(
    first_name,last_name,email,company_name,phone,lead_type,status,source,estimated_mrr_cents,notes
  ) VALUES (
    trim(p_first_name),trim(p_last_name),lower(trim(p_email)),trim(p_company_name),nullif(trim(COALESCE(p_phone,'')),''),
    upper(p_lead_type),'NEW',COALESCE(NULLIF(trim(p_source),''),'PLATFORM_ADMIN'),GREATEST(COALESCE(p_estimated_mrr_cents,0),0),p_notes
  ) RETURNING * INTO v_row;

  PERFORM public.log_platform_event(
    'PLATFORM_LEAD_CREATED',
    v_row.id,
    'platform_lead',
    jsonb_build_object('company_name', v_row.company_name, 'email', v_row.email, 'source', v_row.source)
  );

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_update_incident_status(
  p_incident_id uuid,
  p_status text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.platform_incidents;
  v_after public.platform_incidents;
  v_status text := upper(p_status);
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
  END IF;
  IF v_status NOT IN ('OPEN','INVESTIGATING','RESOLVED') THEN
    RAISE EXCEPTION 'Invalid incident status';
  END IF;

  SELECT * INTO v_before FROM public.platform_incidents WHERE id = p_incident_id;
  IF v_before.id IS NULL THEN RAISE EXCEPTION 'Incident not found'; END IF;

  UPDATE public.platform_incidents
  SET status = v_status, updated_at = now()
  WHERE id = p_incident_id
  RETURNING * INTO v_after;

  PERFORM public.log_platform_event(
    'PLATFORM_INCIDENT_STATUS_CHANGED', p_incident_id, 'platform_incident',
    jsonb_build_object('before', v_before.status, 'after', v_after.status)
  );
  RETURN to_jsonb(v_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_create_incident(
  p_title text,
  p_severity text,
  p_affected_scope text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_incidents;
  v_severity text := upper(p_severity);
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
  END IF;
  IF trim(COALESCE(p_title,'')) = '' THEN RAISE EXCEPTION 'Incident title is required'; END IF;
  IF v_severity NOT IN ('LOW','MEDIUM','HIGH','CRITICAL') THEN RAISE EXCEPTION 'Invalid severity'; END IF;

  INSERT INTO public.platform_incidents(title, affected_scope, severity, status)
  VALUES (trim(p_title), nullif(trim(COALESCE(p_affected_scope,'')),''), v_severity, 'OPEN')
  RETURNING * INTO v_row;

  PERFORM public.log_platform_event('PLATFORM_INCIDENT_CREATED', v_row.id, 'platform_incident', to_jsonb(v_row));
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_update_support_ticket_status(
  p_ticket_id uuid,
  p_status text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.support_tickets;
  v_status text := upper(p_status);
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Requires super admin privileges';
  END IF;
  IF v_status NOT IN ('OPEN','NEW','IN_PROGRESS','WAITING_ON_CUSTOMER','RESOLVED','CLOSED') THEN
    RAISE EXCEPTION 'Invalid ticket status';
  END IF;

  UPDATE public.support_tickets
  SET status = v_status,
      resolved_at = CASE WHEN v_status IN ('RESOLVED','CLOSED') THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Support ticket not found'; END IF;
  PERFORM public.log_platform_event('PLATFORM_SUPPORT_STATUS_CHANGED', p_ticket_id, 'support_ticket', jsonb_build_object('status',v_status));
  RETURN to_jsonb(v_row);
END;
$$;
