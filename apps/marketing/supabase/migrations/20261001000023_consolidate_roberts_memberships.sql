-- Complete the 2026-09-02 Roberts organization consolidation by moving active
-- authorization from the retired brand tenant shells to the umbrella tenant.
-- Operational data already belongs to Roberts Enterprises; leaving membership
-- rows on the shells makes legitimate multi-brand owners resolve to no tenant.
BEGIN;

DO $$
DECLARE
  v_roberts_id uuid;
  v_legacy_ids constant uuid[] := ARRAY[
    '65ad28de-3f86-428d-a5b6-9d89af3542fc'::uuid,
    '81c291ed-e9a0-430c-ab8c-7ed2216a9c62'::uuid
  ];
BEGIN
  SELECT id
  INTO v_roberts_id
  FROM public.businesses
  WHERE id = '82a5b426-78a2-47ba-896b-3146b1a99c53'::uuid
     OR slug = 'roberts-enterprises'
     OR name = 'Roberts Enterprises'
  ORDER BY (id = '82a5b426-78a2-47ba-896b-3146b1a99c53'::uuid) DESC
  LIMIT 1;

  IF v_roberts_id IS NULL THEN
    RAISE EXCEPTION 'Roberts Enterprises tenant is missing';
  END IF;

  -- A user with two incomparable specialist roles needs an explicit decision.
  IF EXISTS (
    SELECT bm.user_id
    FROM public.business_memberships bm
    WHERE bm.business_id = ANY(v_legacy_ids)
      AND COALESCE(UPPER(BTRIM(bm.status)), 'ACTIVE') = 'ACTIVE'
      AND public.canonical_workspace_role(bm.role) IS NOT NULL
    GROUP BY bm.user_id
    HAVING bool_or(public.canonical_workspace_role(bm.role) = 'ALTERATIONS_SPECIALIST')
       AND bool_or(public.canonical_workspace_role(bm.role) = 'BRIDAL_CONSULTANT')
       AND NOT bool_or(public.canonical_workspace_role(bm.role) IN ('OWNER', 'STORE_MANAGER'))
  ) THEN
    RAISE EXCEPTION 'Roberts membership consolidation found ambiguous specialist roles';
  END IF;
  WITH source_roles AS (
    SELECT
      bm.user_id,
      CASE
        WHEN bool_or(public.canonical_workspace_role(bm.role) = 'OWNER') THEN 'OWNER'
        WHEN bool_or(public.canonical_workspace_role(bm.role) = 'STORE_MANAGER') THEN 'STORE_MANAGER'
        WHEN bool_or(public.canonical_workspace_role(bm.role) = 'ALTERATIONS_SPECIALIST') THEN 'ALTERATIONS_SPECIALIST'
        ELSE 'BRIDAL_CONSULTANT'
      END AS role
    FROM public.business_memberships bm
    WHERE bm.business_id = ANY(v_legacy_ids)
      AND COALESCE(UPPER(BTRIM(bm.status)), 'ACTIVE') = 'ACTIVE'
      AND public.canonical_workspace_role(bm.role) IS NOT NULL
    GROUP BY bm.user_id
  )
  INSERT INTO public.business_memberships (user_id, business_id, role, status)
  SELECT user_id, v_roberts_id, role, 'ACTIVE'
  FROM source_roles
  ON CONFLICT (user_id, business_id) DO UPDATE
  SET role = CASE
        WHEN public.canonical_workspace_role(public.business_memberships.role) = 'OWNER'
          OR EXCLUDED.role = 'OWNER' THEN 'OWNER'
        WHEN public.canonical_workspace_role(public.business_memberships.role) = 'STORE_MANAGER'
          OR EXCLUDED.role = 'STORE_MANAGER' THEN 'STORE_MANAGER'
        WHEN public.canonical_workspace_role(public.business_memberships.role) IS NOT NULL
          THEN public.canonical_workspace_role(public.business_memberships.role)
        ELSE EXCLUDED.role
      END,
      status = 'ACTIVE';

  -- Preserve any explicit location grants while translating retired locations.
  INSERT INTO public.location_permissions (membership_id, location_id)
  SELECT target.id, location_map.new_location_id
  FROM public.location_permissions permission
  JOIN public.business_memberships legacy ON legacy.id = permission.membership_id
  JOIN public.business_memberships target
    ON target.user_id = legacy.user_id AND target.business_id = v_roberts_id
  JOIN (VALUES
    ('1bf69ca1-91a2-417b-890f-79089763ae4f'::uuid, 'b7b013f4-6c5f-4ebd-bc55-290d73f969fb'::uuid),
    ('244179aa-63fa-408b-9615-9f552d57edd3'::uuid, 'f4809557-4834-41c7-a997-9046444682c0'::uuid),
    ('0d872f24-d8aa-48a7-ad3b-e9257509a6da'::uuid, '22783385-f099-4ddc-a8d6-0cafd0e3ffbd'::uuid),
    ('a31f8e83-3597-4868-a911-dc8c45612052'::uuid, '6c663431-dc51-467d-82e4-4f26ae4953bb'::uuid)
  ) AS location_map(old_location_id, new_location_id)
    ON location_map.old_location_id = permission.location_id
  WHERE legacy.business_id = ANY(v_legacy_ids)
    AND COALESCE(UPPER(BTRIM(legacy.status)), 'ACTIVE') = 'ACTIVE'
  ON CONFLICT (membership_id, location_id) DO NOTHING;

  UPDATE public.staff_profiles profile
  SET business_id = v_roberts_id
  WHERE profile.id IN (
    SELECT bm.user_id
    FROM public.business_memberships bm
    WHERE bm.business_id = ANY(v_legacy_ids)
      AND COALESCE(UPPER(BTRIM(bm.status)), 'ACTIVE') = 'ACTIVE'
      AND public.canonical_workspace_role(bm.role) IS NOT NULL
  )
    AND profile.business_id = ANY(v_legacy_ids);
  IF EXISTS (
    SELECT 1
    FROM public.business_memberships legacy
    WHERE legacy.business_id = ANY(v_legacy_ids)
      AND COALESCE(UPPER(BTRIM(legacy.status)), 'ACTIVE') = 'ACTIVE'
      AND public.canonical_workspace_role(legacy.role) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.business_memberships target
        WHERE target.user_id = legacy.user_id
          AND target.business_id = v_roberts_id
          AND COALESCE(UPPER(BTRIM(target.status)), 'ACTIVE') = 'ACTIVE'
          AND public.canonical_workspace_role(target.role) IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'A legacy member was not granted Roberts Enterprises access';
  END IF;

  UPDATE public.business_memberships
  SET status = 'SUSPENDED'
  WHERE business_id = ANY(v_legacy_ids)
    AND COALESCE(UPPER(BTRIM(status)), 'ACTIVE') = 'ACTIVE'
    AND public.canonical_workspace_role(role) IS NOT NULL;

  IF EXISTS (
    SELECT 1 FROM public.business_memberships
    WHERE business_id = ANY(v_legacy_ids)
      AND COALESCE(UPPER(BTRIM(status)), 'ACTIVE') = 'ACTIVE'
      AND public.canonical_workspace_role(role) IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Active membership remains on a retired Roberts brand shell';
  END IF;
END;
$$;

COMMIT;
