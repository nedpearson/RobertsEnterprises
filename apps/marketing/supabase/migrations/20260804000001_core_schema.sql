-- 20260804000001_core_schema.sql



-- Operational tables
CREATE TABLE gowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    designer TEXT,
    style TEXT,
    size TEXT,
    color TEXT,
    price_cents INTEGER,
    stock INTEGER,
    status TEXT,
    image TEXT,
    sku TEXT,
    cost_cents INTEGER,
    msrp_cents INTEGER,
    category TEXT,
    condition TEXT,
    vendor TEXT,
    reorder_point INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    wedding_date DATE,
    stylist TEXT,
    status TEXT,
    spend_cents INTEGER,
    portal_token TEXT,
    profile_photo_url TEXT,
    profile_photo_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    gown_id UUID REFERENCES gowns(id) ON DELETE CASCADE,
    gown_name TEXT,
    from_location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    to_location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    qty INTEGER,
    status TEXT,
    requested TIMESTAMPTZ,
    received TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    source TEXT,
    budget_cents INTEGER,
    wedding_date DATE,
    stage TEXT,
    ai_score INTEGER,
    ai_insight TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    description TEXT,
    amount_cents INTEGER,
    paid_cents INTEGER,
    due_date DATE,
    status TEXT,
    pay_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT,
    date DATE,
    time TEXT,
    stylist TEXT,
    status TEXT,
    looking_for TEXT,
    budget_cents INTEGER,
    fee_paid BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    vendor TEXT,
    items TEXT,
    amount_cents INTEGER,
    ordered TIMESTAMPTZ,
    expected_delivery TIMESTAMPTZ,
    status TEXT,
    assigned_staff TEXT,
    assigned_customer UUID REFERENCES customers(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    sender TEXT,
    content TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT,
    status TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    key TEXT,
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS

ALTER TABLE gowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Define RLS Policies for operational tables
-- Helper function or direct subquery: business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())



CREATE POLICY "Enable all access for business members" ON gowns
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON customers
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON transfers
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON leads
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON invoices
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON appointments
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON purchase_orders
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON messages
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON automation_runs
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON settings
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
