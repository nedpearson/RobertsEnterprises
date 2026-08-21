-- Allow platform admins to view tenant sub-entities

-- 1. business_brands
DROP POLICY IF EXISTS "Platform admins can view business_brands" ON public.business_brands;
CREATE POLICY "Platform admins can view business_brands" ON public.business_brands
  FOR SELECT USING (is_super_admin());

-- 2. locations
DROP POLICY IF EXISTS "Platform admins can view locations" ON public.locations;
CREATE POLICY "Platform admins can view locations" ON public.locations
  FOR SELECT USING (is_super_admin());

-- 3. business_memberships
DROP POLICY IF EXISTS "Platform admins can view business_memberships" ON public.business_memberships;
CREATE POLICY "Platform admins can view business_memberships" ON public.business_memberships
  FOR SELECT USING (is_super_admin());

-- 4. organization_feature_overrides
DROP POLICY IF EXISTS "Platform admins can view organization_feature_overrides" ON public.organization_feature_overrides;
CREATE POLICY "Platform admins can view organization_feature_overrides" ON public.organization_feature_overrides
  FOR SELECT USING (is_super_admin());
