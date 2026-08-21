DROP POLICY IF EXISTS "Users can view their own organizations" ON "public"."businesses";
CREATE POLICY "Users can view their own organizations" ON "public"."businesses"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."business_memberships" bm
      WHERE bm.user_id = auth.uid()
      AND bm.business_id = businesses.id
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE auth_user_id = auth.uid()
      AND platform_role IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Only Platform Owners can delete organizations" ON "public"."businesses";
CREATE POLICY "Only Platform Owners can delete organizations" ON "public"."businesses"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE auth_user_id = auth.uid()
      AND platform_role = 'PLATFORM_OWNER'
    )
  );

DROP POLICY IF EXISTS "Platform owners can manage platform_leads" ON platform_leads;
CREATE POLICY "Platform owners can manage platform_leads" ON platform_leads FOR ALL
USING (
  EXISTS (SELECT 1 FROM platform_users WHERE auth_user_id = auth.uid() AND platform_role = 'PLATFORM_OWNER')
);

DROP POLICY IF EXISTS "Platform owners can manage platform_notifications" ON platform_notifications;
CREATE POLICY "Platform owners can manage platform_notifications" ON platform_notifications FOR ALL
USING (
  EXISTS (SELECT 1 FROM platform_users WHERE auth_user_id = auth.uid() AND platform_role = 'PLATFORM_OWNER')
);


DROP POLICY IF EXISTS "Super admins can manage incidents" ON platform_incidents;
CREATE POLICY "Super admins can manage incidents" ON platform_incidents FOR ALL
USING (
  EXISTS (SELECT 1 FROM platform_users WHERE auth_user_id = auth.uid() AND platform_role = 'PLATFORM_OWNER')
);

DROP POLICY IF EXISTS "Super admins can manage failed jobs" ON platform_failed_jobs;
CREATE POLICY "Super admins can manage failed jobs" ON platform_failed_jobs FOR ALL
USING (
  EXISTS (SELECT 1 FROM platform_users WHERE auth_user_id = auth.uid() AND platform_role = 'PLATFORM_OWNER')
);

