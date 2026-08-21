-- Create RPCs for platform admins to create brands and locations

CREATE OR REPLACE FUNCTION platform_create_brand(
  p_business_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_logo_url text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_new_brand business_brands%ROWTYPE;
BEGIN
  -- 1. Authorization: Only super admins
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can create brands';
  END IF;

  -- 2. Validate tenant exists
  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- 3. Insert Brand
  INSERT INTO business_brands (
    business_id,
    name,
    description,
    logo_url
  ) VALUES (
    p_business_id,
    p_name,
    p_description,
    p_logo_url
  ) RETURNING * INTO v_new_brand;

  RETURN to_jsonb(v_new_brand);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION platform_create_location(
  p_business_id uuid,
  p_name text,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL
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
    email
  ) VALUES (
    p_business_id,
    p_name,
    p_address,
    p_phone,
    p_email
  ) RETURNING * INTO v_new_loc;

  RETURN to_jsonb(v_new_loc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
