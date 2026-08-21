
DROP POLICY IF EXISTS "Super Admins can select organization_subscriptions" ON organization_subscriptions;
CREATE POLICY "Super Admins can select organization_subscriptions" ON organization_subscriptions
    FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS "Super Admins can select organization_feature_overrides" ON organization_feature_overrides;
CREATE POLICY "Super Admins can select organization_feature_overrides" ON organization_feature_overrides
    FOR SELECT USING (is_super_admin());

