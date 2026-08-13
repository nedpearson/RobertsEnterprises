-- Safe public tenant bootstrap resolver.
-- Returns only non-sensitive organization metadata needed to render a tenant shell.
-- Runtime authorization for tenant-owned records remains enforced by RLS.

CREATE OR REPLACE FUNCTION public.resolve_public_organization_by_slug(p_slug text)
RETURNS TABLE (
    id uuid,
    name text,
    display_name text,
    slug text,
    status text,
    subscription_status text,
    primary_color text,
    secondary_color text,
    accent_color text,
    logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        b.id,
        b.name,
        b.display_name,
        b.slug,
        b.status,
        b.subscription_status,
        b.primary_color,
        b.secondary_color,
        b.accent_color,
        b.logo_url
    FROM public.businesses b
    WHERE lower(b.slug) = lower(trim(p_slug))
      AND b.status = 'ACTIVE'
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_organization_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_organization_by_slug(text) TO anon, authenticated;
