CREATE TABLE IF NOT EXISTS organization_module_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, module_id)
);

ALTER TABLE organization_module_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for organization members" ON organization_module_preferences
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Enable write access for organization members" ON organization_module_preferences
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_memberships WHERE user_id = auth.uid()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_subscriptions_business_id_fkey'
  ) THEN
    ALTER TABLE organization_subscriptions ADD CONSTRAINT organization_subscriptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_feature_overrides_business_id_fkey'
  ) THEN
    ALTER TABLE organization_feature_overrides ADD CONSTRAINT organization_feature_overrides_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_memberships_business_id_fkey'
  ) THEN
    ALTER TABLE business_memberships ADD CONSTRAINT business_memberships_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_memberships_user_id_fkey'
  ) THEN
    ALTER TABLE business_memberships ADD CONSTRAINT business_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES staff_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
