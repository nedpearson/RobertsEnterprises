-- Repair Roberts' live website routing and make future tenant provisioning use
-- the canonical Organization -> Brands -> Locations model. A booking-enabled
-- website row is intentionally location-specific so form submissions can never
-- be guessed into the wrong brand or store.

CREATE INDEX IF NOT EXISTS business_sites_intake_domain_idx
  ON public.business_sites (lower(domain), status, booking_enabled);

WITH site_source AS (
  SELECT
    b.id AS business_id,
    br.id AS brand_id,
    l.id AS location_id,
    br.name || ' - ' || l.name AS site_name,
    CASE
      WHEN lower(br.name) LIKE 'i do bridal%' THEN 'idobridalcouture.com'
      WHEN lower(br.name) LIKE 'proper%' THEN 'properandcompany.com'
    END AS domain,
    CASE
      WHEN lower(br.name) LIKE 'i do bridal%' THEN 'ido@idobridalcouture.com'
      WHEN lower(br.name) LIKE 'proper%' THEN 'hello@properandcompany.com'
    END AS notification_email
  FROM public.businesses b
  JOIN public.business_brands br ON br.business_id = b.id
  JOIN public.locations l ON l.business_id = b.id AND l.brand_id = br.id
  WHERE b.id = '82a5b426-78a2-47ba-896b-3146b1a99c53'::uuid
)
INSERT INTO public.business_sites (
  business_id, brand_id, location_id, name, domain, site_type, provider,
  status, is_primary, inquiry_enabled, booking_enabled, ecommerce_enabled,
  notification_email
)
SELECT
  source.business_id,
  source.brand_id,
  source.location_id,
  source.site_name,
  source.domain,
  'BRAND',
  'SHOPIFY',
  'ACTIVE',
  false,
  true,
  true,
  true,
  source.notification_email
FROM site_source source
WHERE source.domain IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.business_sites existing
    WHERE existing.business_id = source.business_id
      AND existing.brand_id = source.brand_id
      AND existing.location_id = source.location_id
      AND lower(existing.domain) = source.domain
  );

-- The existing I Do OAuth grant predates brand-bound connections. Bind it to
-- the canonical I Do brand without replacing any other metadata.
UPDATE public.growth_provider_connections connection
SET metadata = COALESCE(connection.metadata, '{}'::jsonb) || jsonb_build_object(
  'brandId', brand.id
)
FROM public.business_brands brand
WHERE connection.business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53'::uuid
  AND connection.provider = 'shopify'
  AND lower(COALESCE(connection.metadata->>'shopDomain', '')) = 'idobridalcouture.myshopify.com'
  AND brand.business_id = connection.business_id
  AND lower(brand.name) LIKE 'i do bridal%';

CREATE OR REPLACE FUNCTION public.provision_full_tenant(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_brand_id uuid;
  v_location_id uuid;
  v_owner_id uuid;
  v_slug text := lower(trim(payload->'orgDetails'->>'slug'));
  v_domain text;
  v_business_ids uuid[];
  v_brand_ids uuid[] := ARRAY[]::uuid[];
  v_location_ids uuid[] := ARRAY[]::uuid[];
  brand jsonb;
  location jsonb;
  additional_user jsonb;
  module_id text;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: tenant provisioning requires the trusted platform service';
  END IF;
  IF COALESCE(trim(payload->'orgDetails'->>'legalName'), '') = '' THEN
    RAISE EXCEPTION 'Organization legal name is required';
  END IF;
  IF v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Organization slug is invalid';
  END IF;
  IF payload->'businesses' IS NULL OR jsonb_array_length(payload->'businesses') = 0 THEN
    RAISE EXCEPTION 'At least one brand is required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Slug % already exists', v_slug;
  END IF;

  INSERT INTO public.businesses (
    name, legal_name, display_name, slug, subscription_status, status,
    timezone, currency, industry, website, support_email
  ) VALUES (
    COALESCE(NULLIF(trim(payload->'orgDetails'->>'displayName'), ''), trim(payload->'orgDetails'->>'legalName')),
    trim(payload->'orgDetails'->>'legalName'),
    COALESCE(NULLIF(trim(payload->'orgDetails'->>'displayName'), ''), trim(payload->'orgDetails'->>'legalName')),
    v_slug,
    'TRIAL',
    'ACTIVE',
    COALESCE(NULLIF(payload->'orgDetails'->>'timezone', ''), 'America/New_York'),
    COALESCE(NULLIF(payload->'orgDetails'->>'currency', ''), 'USD'),
    COALESCE(NULLIF(payload->'orgDetails'->>'industry', ''), 'Bridal'),
    NULLIF(trim(payload->'orgDetails'->>'primaryDomain'), ''),
    NULLIF(trim(payload->'orgDetails'->'primaryContact'->>'email'), '')
  ) RETURNING id INTO v_org_id;

  v_business_ids := ARRAY[v_org_id];

  INSERT INTO public.organization_subscriptions (business_id, plan_id, status, trial_end)
  VALUES (
    v_org_id,
    COALESCE(NULLIF(payload->'package'->>'plan', ''), 'essentials'),
    'ACTIVE',
    now() + (COALESCE(NULLIF(payload->'package'->>'trialDays', ''), '14')::integer * interval '1 day')
  );

  FOR brand IN SELECT value FROM jsonb_array_elements(payload->'businesses') LOOP
    IF COALESCE(trim(brand->>'name'), '') = '' THEN
      RAISE EXCEPTION 'Every brand needs a name';
    END IF;

    v_domain := lower(trim(regexp_replace(
      regexp_replace(COALESCE(brand->>'website', ''), '^https?://', '', 'i'),
      '/.*$', ''
    )));
    IF v_domain !~ '^[a-z0-9][a-z0-9.-]*\.[a-z0-9][a-z0-9-]*$' THEN
      RAISE EXCEPTION 'Brand % needs a valid website domain', trim(brand->>'name');
    END IF;

    INSERT INTO public.business_brands (business_id, name, description, logo_url)
    VALUES (
      v_org_id,
      trim(brand->>'name'),
      NULLIF(trim(brand->>'category'), ''),
      NULLIF(trim(brand->>'logo'), '')
    ) RETURNING id INTO v_brand_id;
    v_brand_ids := array_append(v_brand_ids, v_brand_id);

    IF brand->'locations' IS NULL OR jsonb_array_length(brand->'locations') = 0 THEN
      RAISE EXCEPTION 'Brand % needs at least one location', trim(brand->>'name');
    END IF;

    FOR location IN SELECT value FROM jsonb_array_elements(brand->'locations') LOOP
      IF COALESCE(trim(location->>'name'), '') = '' THEN
        RAISE EXCEPTION 'Every location needs a name';
      END IF;

      INSERT INTO public.locations (
        business_id, brand_id, name, address, timezone, phone, email, is_active
      ) VALUES (
        v_org_id,
        v_brand_id,
        trim(location->>'name'),
        NULLIF(trim(location->>'address'), ''),
        COALESCE(NULLIF(location->>'timezone', ''), payload->'orgDetails'->>'timezone', 'America/New_York'),
        NULLIF(trim(location->>'phone'), ''),
        NULLIF(trim(location->>'email'), ''),
        true
      ) RETURNING id INTO v_location_id;
      v_location_ids := array_append(v_location_ids, v_location_id);

      INSERT INTO public.business_sites (
        business_id, brand_id, location_id, name, domain, site_type, provider,
        status, inquiry_enabled, booking_enabled, ecommerce_enabled,
        notification_email
      ) VALUES (
        v_org_id,
        v_brand_id,
        v_location_id,
        trim(brand->>'name') || ' - ' || trim(location->>'name'),
        v_domain,
        'BRAND',
        COALESCE(NULLIF(upper(brand->>'provider'), ''), 'CUSTOM'),
        'ACTIVE',
        true,
        true,
        COALESCE((brand->>'provider') ~* 'shopify', false),
        COALESCE(NULLIF(trim(location->>'email'), ''), NULLIF(trim(payload->'orgDetails'->'primaryContact'->>'email'), ''))
      );
    END LOOP;
  END LOOP;

  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE lower(email) = lower(payload->'users'->'owner'->>'email')
  ORDER BY created_at
  LIMIT 1;
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.business_memberships (business_id, user_id, role, status)
    VALUES (v_org_id, v_owner_id, 'Owner', 'ACTIVE')
    ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'Owner', status = 'ACTIVE';
  END IF;

  IF payload->'users'->'additional' IS NOT NULL THEN
    FOR additional_user IN SELECT value FROM jsonb_array_elements(payload->'users'->'additional') LOOP
      SELECT id INTO v_owner_id
      FROM auth.users
      WHERE lower(email) = lower(additional_user->>'email')
      ORDER BY created_at
      LIMIT 1;
      IF v_owner_id IS NOT NULL THEN
        INSERT INTO public.business_memberships (business_id, user_id, role, status)
        VALUES (v_org_id, v_owner_id, COALESCE(NULLIF(additional_user->>'role', ''), 'Stylist'), 'ACTIVE')
        ON CONFLICT (user_id, business_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.settings_values (business_id, setting_namespace, setting_key, value_json)
  VALUES
    (v_org_id, 'tenant', 'settings', COALESCE(payload->'settings', '{}'::jsonb)),
    (v_org_id, 'tenant', 'connections', COALESCE(payload->'connections', '[]'::jsonb)),
    (v_org_id, 'tenant', 'migration', COALESCE(payload->'migration', '{}'::jsonb)),
    (v_org_id, 'tenant', 'training', COALESCE(payload->'training', '{}'::jsonb)),
    (v_org_id, 'tenant', 'go_live_requirements', COALESCE(payload->'goLiveRequirements', '[]'::jsonb)),
    (v_org_id, 'tenant', 'pending_users', COALESCE(payload->'users', '{}'::jsonb)),
    (v_org_id, 'tenant', 'onboarding', COALESCE(payload->'onboarding', '{}'::jsonb));

  IF payload->'modules' IS NOT NULL THEN
    FOR module_id IN SELECT value FROM jsonb_array_elements_text(payload->'modules') LOOP
      INSERT INTO public.organization_module_preferences (business_id, module_id, is_enabled)
      VALUES (v_org_id, module_id, true)
      ON CONFLICT (business_id, module_id) DO UPDATE SET is_enabled = true;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'organization_id', v_org_id,
    'business_ids', v_business_ids,
    'brand_ids', v_brand_ids,
    'location_ids', v_location_ids,
    'status', 'READY'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_full_tenant(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_full_tenant(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.provision_full_tenant(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.provision_full_tenant(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
