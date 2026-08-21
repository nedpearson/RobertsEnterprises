-- 1. Add brand_id to locations
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES business_brands(id) ON DELETE SET NULL;

-- 2. Update platform_create_location to accept brand_id
DROP FUNCTION IF EXISTS platform_create_location(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION platform_create_location(
  p_business_id uuid,
  p_name text,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_new_loc locations%ROWTYPE;
BEGIN
  -- 1. Authorization: Only super admins
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can create locations';
  END IF;

  -- 2. Validate tenant exists
  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- 3. Insert Location
  INSERT INTO locations (
    business_id,
    name,
    address,
    phone,
    email,
    brand_id
  ) VALUES (
    p_business_id,
    p_name,
    p_address,
    p_phone,
    p_email,
    p_brand_id
  ) RETURNING * INTO v_new_loc;

  RETURN to_jsonb(v_new_loc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
