-- The existing-website form bridge refuses any submission whose site domain is
-- not registered: live probes of /api/scheduling/public/sites/resolve returned
-- "not configured for public booking" for BOTH brand domains, so even a
-- correctly-authenticated bridge POST could never land. Register one ACTIVE,
-- booking-enabled site row per brand domain. The submission resolver picks the
-- operational location from the form's location hint when a domain has a single
-- site row, so one row per domain with a default location is the correct shape.
-- Idempotent; skips with a NOTICE when a business/location is absent (fresh CI).
DO $$
DECLARE
  spec record;
  v_biz uuid;
  v_brand uuid;
  v_loc uuid;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('I Do Bridal Couture', 'idobridalcouture.com'),
      ('Proper & Company',    'properandcompany.com')
    ) AS t(biz_name, site_domain)
  LOOP
    SELECT id INTO v_biz FROM public.businesses
      WHERE name = spec.biz_name AND name !~* 'demo' LIMIT 1;
    IF v_biz IS NULL THEN
      RAISE NOTICE 'business "%" not found; skipping site registration', spec.biz_name;
      CONTINUE;
    END IF;

    SELECT id INTO v_brand FROM public.business_brands
      WHERE business_id = v_biz ORDER BY created_at LIMIT 1;
    IF v_brand IS NULL THEN
      INSERT INTO public.business_brands (business_id, name)
      VALUES (v_biz, spec.biz_name) RETURNING id INTO v_brand;
    END IF;

    SELECT id INTO v_loc FROM public.locations
      WHERE business_id = v_biz AND name ~* 'baton' LIMIT 1;
    IF v_loc IS NULL THEN
      SELECT id INTO v_loc FROM public.locations
        WHERE business_id = v_biz ORDER BY name LIMIT 1;
    END IF;
    IF v_loc IS NULL THEN
      RAISE NOTICE 'no location for "%"; skipping site registration', spec.biz_name;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.business_sites
      WHERE business_id = v_biz AND lower(domain) = spec.site_domain
    ) THEN
      INSERT INTO public.business_sites
        (business_id, brand_id, location_id, name, domain, site_type, provider,
         status, booking_enabled, inquiry_enabled)
      VALUES
        (v_biz, v_brand, v_loc, spec.biz_name, spec.site_domain, 'BOOKING',
         'SHOPIFY', 'ACTIVE', true, true);
    END IF;
  END LOOP;
END $$;
