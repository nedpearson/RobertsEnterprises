-- Required production contract: organization -> operating brand -> location
-- must remain deterministic for settings and vendor management.
-- Run against local Supabase after every migration replay.

BEGIN;

DO $$
DECLARE
  v_business UUID := '81000000-0000-0000-0000-000000000001';
  v_other_business UUID := '81000000-0000-0000-0000-000000000002';
  v_ido UUID := '82000000-0000-0000-0000-000000000001';
  v_proper UUID := '82000000-0000-0000-0000-000000000002';
  v_other_brand UUID := '82000000-0000-0000-0000-000000000003';
  v_ido_location UUID := '83000000-0000-0000-0000-000000000001';
  v_proper_location UUID := '83000000-0000-0000-0000-000000000002';
  v_vendor UUID := '84000000-0000-0000-0000-000000000001';
  v_count INTEGER;
BEGIN
  INSERT INTO businesses (id, name, slug, status)
  VALUES
    (v_business, 'Brand Scope Contract Tenant', 'brand-scope-contract-tenant', 'ACTIVE'),
    (v_other_business, 'Other Contract Tenant', 'other-brand-scope-contract-tenant', 'ACTIVE');

  INSERT INTO business_brands (id, business_id, name)
  VALUES
    (v_ido, v_business, 'I Do Bridal Couture'),
    (v_proper, v_business, 'Proper & Co.'),
    (v_other_brand, v_other_business, 'Other Tenant Brand');

  INSERT INTO locations (id, business_id, brand_id, name, slug)
  VALUES
    (v_ido_location, v_business, v_ido, 'I Do Baton Rouge', 'ido-contract-location'),
    (v_proper_location, v_business, v_proper, 'Proper Baton Rouge', 'proper-contract-location');

  INSERT INTO vendors (id, business_id, name, status, primary_contact, ordering_rules)
  VALUES (
    v_vendor,
    v_business,
    'Contract Test Designer',
    'Active',
    '{"email":"orders@example.test","phone":"225-555-0100"}'::jsonb,
    '{"lead_time_days":120,"rush_lead_time_days":60}'::jsonb
  );

  INSERT INTO vendor_business_brand_assignments (business_id, vendor_id, brand_id)
  VALUES
    (v_business, v_vendor, v_ido),
    (v_business, v_vendor, v_proper);

  SELECT count(*) INTO v_count
  FROM vendor_business_brand_assignments
  WHERE business_id = v_business AND vendor_id = v_vendor AND active = true;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Expected vendor to map to both operating brands, got %', v_count;
  END IF;

  -- The trigger must reject cross-tenant brand assignment even when all UUIDs exist.
  BEGIN
    INSERT INTO vendor_business_brand_assignments (business_id, vendor_id, brand_id)
    VALUES (v_business, v_vendor, v_other_brand);
    RAISE EXCEPTION 'Cross-tenant vendor assignment was incorrectly accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Cross-tenant vendor assignment was incorrectly accepted' THEN
        RAISE;
      END IF;
  END;

  -- Same namespace/key can exist at organization, brand and location scopes.
  INSERT INTO settings_values (
    data_plane, business_id, brand_id, location_id, user_id,
    setting_namespace, setting_key, value_json, status
  ) VALUES
    ('production', v_business, NULL, NULL, NULL, 'contract_test', 'routing', '{"scope":"business"}'::jsonb, 'active'),
    ('production', v_business, v_ido, NULL, NULL, 'contract_test', 'routing', '{"scope":"ido"}'::jsonb, 'active'),
    ('production', v_business, v_proper, NULL, NULL, 'contract_test', 'routing', '{"scope":"proper"}'::jsonb, 'active'),
    ('production', v_business, v_ido, v_ido_location, NULL, 'contract_test', 'routing', '{"scope":"ido-location"}'::jsonb, 'active'),
    ('production', v_business, v_proper, v_proper_location, NULL, 'contract_test', 'routing', '{"scope":"proper-location"}'::jsonb, 'active');

  SELECT count(*) INTO v_count
  FROM settings_values
  WHERE business_id = v_business
    AND setting_namespace = 'contract_test'
    AND setting_key = 'routing';
  IF v_count <> 5 THEN
    RAISE EXCEPTION 'Expected five independently scoped settings rows, got %', v_count;
  END IF;

  -- A Proper location may never be written under the I Do brand scope.
  BEGIN
    INSERT INTO settings_values (
      data_plane, business_id, brand_id, location_id, user_id,
      setting_namespace, setting_key, value_json, status
    ) VALUES (
      'production', v_business, v_ido, v_proper_location, NULL,
      'contract_test', 'must_reject', '{"bad":true}'::jsonb, 'active'
    );
    RAISE EXCEPTION 'Cross-brand settings scope was incorrectly accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Cross-brand settings scope was incorrectly accepted' THEN
        RAISE;
      END IF;
  END;

  -- A location from one tenant may never be scoped to another tenant.
  BEGIN
    UPDATE settings_values
    SET business_id = v_other_business, brand_id = v_other_brand
    WHERE business_id = v_business
      AND location_id = v_ido_location
      AND setting_namespace = 'contract_test';
    RAISE EXCEPTION 'Cross-tenant location setting update was incorrectly accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Cross-tenant location setting update was incorrectly accepted' THEN
        RAISE;
      END IF;
  END;
END $$;

ROLLBACK;
