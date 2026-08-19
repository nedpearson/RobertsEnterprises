CREATE TABLE appointment_gowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    gown_id UUID REFERENCES gowns(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    style TEXT,
    price_cents INTEGER,
    rating TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointment_gowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for business members" ON appointment_gowns
FOR ALL
USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

-- Add metrics/lifecycle to alterations if missing
ALTER TABLE alterations ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE alterations ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE alterations ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL;

