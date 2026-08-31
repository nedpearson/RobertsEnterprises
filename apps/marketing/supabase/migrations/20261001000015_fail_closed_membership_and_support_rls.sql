-- Fail closed on absent membership state and retire legacy support-ticket policies.
--
-- Earlier authorization helpers treated a NULL membership status as ACTIVE, and
-- support_tickets retained older policies based on get_auth_tenant_id(), which can
-- select an arbitrary membership for multi-tenant users. PostgreSQL permissive RLS
-- policies are OR'ed, so those legacy policies must be removed explicitly.

CREATE OR REPLACE FUNCTION public.user_has_role(check_business_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_business_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.business_memberships bm
      WHERE bm.business_id = check_business_id
        AND bm.user_id = auth.uid()
        AND COALESCE(UPPER(BTRIM(bm.status)), '') = 'ACTIVE'
        AND public.canonical_workspace_role(bm.role) IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM unnest(COALESCE(allowed_roles, ARRAY[]::text[])) AS requested(role)
          WHERE public.canonical_workspace_role(requested.role)
              = public.canonical_workspace_role(bm.role)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_active_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_business_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.business_memberships bm
      WHERE bm.business_id = p_business_id
        AND bm.user_id = auth.uid()
        AND COALESCE(UPPER(BTRIM(bm.status)), '') = 'ACTIVE'
        AND public.canonical_workspace_role(bm.role) IS NOT NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.is_business_manager(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_business_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.business_memberships bm
      WHERE bm.business_id = p_business_id
        AND bm.user_id = auth.uid()
        AND COALESCE(UPPER(BTRIM(bm.status)), '') = 'ACTIVE'
        AND public.canonical_workspace_role(bm.role) IN ('OWNER', 'STORE_MANAGER')
    );
$$;

REVOKE ALL ON FUNCTION public.user_has_role(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_business_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_manager(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view their organization's tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can insert support tickets for their organization" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Tenants can read their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Tenants can create their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Managers can update tenant support tickets" ON public.support_tickets;

CREATE POLICY "Tenants can read their own support tickets"
ON public.support_tickets
FOR SELECT
USING (
  public.is_super_admin()
  OR public.is_active_business_member(business_id)
);

CREATE POLICY "Tenants can create their own support tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (
  public.is_super_admin()
  OR (
    user_id = auth.uid()
    AND public.is_active_business_member(business_id)
  )
);

CREATE POLICY "Managers can update tenant support tickets"
ON public.support_tickets
FOR UPDATE
USING (
  public.is_super_admin()
  OR public.is_business_manager(business_id)
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_business_manager(business_id)
);
