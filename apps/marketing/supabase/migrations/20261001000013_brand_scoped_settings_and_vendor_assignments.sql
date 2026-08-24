-- 20261001000013_brand_scoped_settings_and_vendor_assignments.sql
-- Make settings and vendor ownership explicit across organization -> brand -> location.

ALTER TABLE settings_values
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES business_brands(id) ON DELETE CASCADE;

-- Replace the original scope uniqueness rule (which had no brand dimension).
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'settings_values'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%data_plane%'
      AND pg_get_constraintdef(oid) ILIKE '%setting_namespace%'
      AND pg_get_constraintdef(oid) ILIKE '%setting_key%'
  LOOP
    EXECUTE format('ALTER TABLE settings_values DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS settings_values_scope_unique;
CREATE UNIQUE INDEX settings_values_scope_unique
  ON settings_values (
    data_plane,
    business_id,
    brand_id,
    location_id,
    user_id,
    setting_namespace,
    setting_key
  ) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS settings_values_business_brand_location_idx
  ON settings_values (business_id, brand_id, location_id, setting_namespace, setting_key)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.assert_settings_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_brand_business UUID;
  v_location_business UUID;
  v_location_brand UUID;
BEGIN
  IF NEW.business_id IS NULL AND (NEW.brand_id IS NOT NULL OR NEW.location_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Brand/location settings require business_id';
  END IF;

  IF NEW.brand_id IS NOT NULL THEN
    SELECT business_id INTO v_brand_business
    FROM business_brands
    WHERE id = NEW.brand_id;

    IF v_brand_business IS NULL OR v_brand_business IS DISTINCT FROM NEW.business_id THEN
      RAISE EXCEPTION 'settings_values.brand_id must belong to settings_values.business_id';
    END IF;
  END IF;

  IF NEW.location_id IS NOT NULL THEN
    SELECT business_id, brand_id
      INTO v_location_business, v_location_brand
    FROM locations
    WHERE id = NEW.location_id;

    IF v_location_business IS NULL OR v_location_business IS DISTINCT FROM NEW.business_id THEN
      RAISE EXCEPTION 'settings_values.location_id must belong to settings_values.business_id';
    END IF;

    IF NEW.brand_id IS NOT NULL
       AND v_location_brand IS NOT NULL
       AND v_location_brand IS DISTINCT FROM NEW.brand_id THEN
      RAISE EXCEPTION 'settings_values location and brand scopes must agree';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settings_values_scope_guard ON settings_values;
CREATE TRIGGER settings_values_scope_guard
  BEFORE INSERT OR UPDATE OF business_id, brand_id, location_id
  ON settings_values
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_settings_scope();

-- A catalog vendor can serve one or more operating brands (I Do, Proper, etc.).
-- Keep this separate from catalog `brands`, which represents designer/product brands.
CREATE TABLE IF NOT EXISTS vendor_business_brand_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES business_brands(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, vendor_id, brand_id)
);

CREATE OR REPLACE FUNCTION public.assert_vendor_business_brand_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_vendor_business UUID;
  v_brand_business UUID;
BEGIN
  SELECT business_id INTO v_vendor_business FROM vendors WHERE id = NEW.vendor_id;
  SELECT business_id INTO v_brand_business FROM business_brands WHERE id = NEW.brand_id;

  IF v_vendor_business IS NULL OR v_vendor_business IS DISTINCT FROM NEW.business_id THEN
    RAISE EXCEPTION 'vendor assignment vendor must belong to the same business';
  END IF;
  IF v_brand_business IS NULL OR v_brand_business IS DISTINCT FROM NEW.business_id THEN
    RAISE EXCEPTION 'vendor assignment brand must belong to the same business';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendor_business_brand_assignments_scope_guard ON vendor_business_brand_assignments;
CREATE TRIGGER vendor_business_brand_assignments_scope_guard
  BEFORE INSERT OR UPDATE OF business_id, vendor_id, brand_id
  ON vendor_business_brand_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_vendor_business_brand_scope();

CREATE INDEX IF NOT EXISTS vendor_business_brand_assignments_brand_idx
  ON vendor_business_brand_assignments (business_id, brand_id, active);

ALTER TABLE vendor_business_brand_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business members manage vendor brand assignments"
  ON vendor_business_brand_assignments;
CREATE POLICY "business members manage vendor brand assignments"
  ON vendor_business_brand_assignments
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships WHERE user_id = auth.uid()
    )
  );
