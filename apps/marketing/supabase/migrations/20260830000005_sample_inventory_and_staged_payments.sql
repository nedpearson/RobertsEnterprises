-- Sample Inventory & Staged Payments

-- 1. Inventory Types
ALTER TABLE gowns ADD COLUMN inventory_type TEXT DEFAULT 'Sellable';

-- 2. Payment Schedules for Staged Payments
CREATE TABLE payment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    stage_name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    due_date DATE,
    paid_cents INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for business members" ON payment_schedules
FOR ALL
USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

-- Add to Demo Data
DO $$
DECLARE
    v_business_id UUID := 'b0000000-0000-0000-0000-000000000000';
BEGIN
    -- Mark some existing gowns as samples
    UPDATE gowns SET inventory_type = 'Sample' WHERE name ILIKE '%Atelier%' AND business_id = v_business_id;
    UPDATE gowns SET inventory_type = 'Special Order' WHERE name ILIKE '%Couture%' AND business_id = v_business_id;
END $$;
