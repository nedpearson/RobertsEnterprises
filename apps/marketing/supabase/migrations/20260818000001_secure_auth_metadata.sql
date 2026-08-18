-- Fix P4: Prevent privilege escalation via public signup user_meta_data injection
CREATE OR REPLACE FUNCTION public.secure_auth_user_metadata()
RETURNS TRIGGER AS $str$
BEGIN
  -- Strip platform_role to prevent Super Admin escalation
  IF NEW.raw_user_meta_data ? 'platform_role' THEN
    NEW.raw_user_meta_data := NEW.raw_user_meta_data - 'platform_role';
  END IF;

  RETURN NEW;
END;
$str$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS secure_auth_metadata_trigger ON auth.users;
CREATE TRIGGER secure_auth_metadata_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.secure_auth_user_metadata();
