-- Fix P0 Security Vulnerability: orders table missing RLS

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for business members" ON orders 
FOR ALL 
USING (
  business_id IN (
    SELECT business_id 
    FROM business_memberships 
    WHERE user_id = auth.uid()
  )
);
