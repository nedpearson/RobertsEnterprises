-- Create core tenant tables
CREATE TABLE businesses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE business_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Stylist',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, business_id)
);

CREATE TABLE location_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id uuid REFERENCES business_memberships(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(membership_id, location_id)
);

-- Note: We must also alter existing operational tables (gowns, invoices, etc.) 
-- to include business_id and location_id, but assuming those tables 
-- might not exist fully in this migration script, we document the pattern:

-- ALTER TABLE gowns ADD COLUMN business_id uuid REFERENCES businesses(id);
-- ALTER TABLE gowns ADD COLUMN location_id uuid REFERENCES locations(id);

-- Enable RLS on core tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read businesses they are members of
CREATE POLICY "Users can view their businesses" ON businesses
  FOR SELECT USING (
    id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
  );

-- Users can view locations belonging to their businesses
CREATE POLICY "Users can view locations in their businesses" ON locations
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
  );

-- Operational Table Policy Pattern (to be applied to gowns, invoices, etc.):
-- CREATE POLICY "Tenant Isolation" ON gowns
--   FOR ALL USING (
--     business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
--   );
