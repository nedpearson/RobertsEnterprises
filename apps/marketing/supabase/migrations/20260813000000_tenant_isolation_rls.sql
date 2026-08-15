-- Auto-generated tenant isolation RLS for missing tables

ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for business members" ON staff_profiles;
CREATE POLICY "Enable all access for business members" ON staff_profiles FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

