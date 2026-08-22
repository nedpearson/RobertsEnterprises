-- Harden public auth metadata against tenant/platform privilege injection.
-- Authorization is derived from platform_users + business_memberships, never from
-- caller-controlled auth.user raw_user_meta_data.

CREATE OR REPLACE FUNCTION public.secure_auth_user_metadata()
RETURNS TRIGGER AS $str$
BEGIN
  NEW.raw_user_meta_data := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
    - 'platform_role'
    - 'role'
    - 'tenant_role'
    - 'organization_role';
  RETURN NEW;
END;
$str$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

DROP TRIGGER IF EXISTS secure_auth_metadata_trigger ON auth.users;
CREATE TRIGGER secure_auth_metadata_trigger
  BEFORE INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.secure_auth_user_metadata();

COMMENT ON FUNCTION public.secure_auth_user_metadata() IS
  'Strips caller-controlled authorization fields from auth metadata. VowOS roles must come from platform_users/business_memberships.';
