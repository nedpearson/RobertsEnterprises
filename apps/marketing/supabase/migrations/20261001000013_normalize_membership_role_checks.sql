-- Keep tenant authorization semantics consistent across legacy Title Case roles
-- (Owner/Manager) and canonical uppercase roles (OWNER/MANAGER).
--
-- This is security-preserving: the caller must still have an ACTIVE membership
-- for the exact business_id. Only case/whitespace normalization changes.
CREATE OR REPLACE FUNCTION public.user_has_role(
  check_business_id uuid,
  allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_memberships AS bm
    WHERE bm.business_id = check_business_id
      AND bm.user_id = auth.uid()
      AND upper(trim(COALESCE(bm.status, ''))) = 'ACTIVE'
      AND EXISTS (
        SELECT 1
        FROM unnest(allowed_roles) AS allowed(role)
        WHERE upper(trim(allowed.role)) = upper(trim(COALESCE(bm.role, '')))
      )
  );
$$;

COMMENT ON FUNCTION public.user_has_role(uuid, text[]) IS
  'Checks exact tenant membership with case-insensitive normalized role/status matching.';
