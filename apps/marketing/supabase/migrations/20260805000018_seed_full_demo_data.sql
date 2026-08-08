-- 20260805000018_seed_full_demo_data.sql

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer TEXT NOT NULL,
    location TEXT NOT NULL,
    gown TEXT,
    amount_cents INTEGER DEFAULT 0,
    deposit_cents INTEGER DEFAULT 0,
    special_terms TEXT,
    status TEXT DEFAULT 'Draft',
    sign_token TEXT,
    signed_name TEXT,
    signed_initials TEXT,
    signed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alterations (
    id TEXT PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer TEXT NOT NULL,
    gown TEXT,
    seamstress TEXT,
    status TEXT DEFAULT 'Not Started',
    tasks JSONB DEFAULT '[]'::jsonb,
    next_fitting DATE,
    due_date DATE,
    price_cents INTEGER DEFAULT 0,
    notes TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for business members" ON contracts
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Enable all access for business members" ON alterations
    FOR ALL
    USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

DO $$
DECLARE
    v_business_id UUID := 'b0000000-0000-0000-0000-000000000000';
    v_loc1_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_loc2_id UUID := 'c0000000-0000-0000-0000-000000000002';
    v_customer1_id UUID;
    v_customer2_id UUID;
    v_gown1_id UUID;
BEGIN
    -- Only run this for the demo business
    IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = v_business_id) THEN
        RETURN;
    END IF;

    -- SEED CONTRACTS
    INSERT INTO contracts (id, business_id, customer, location, gown, amount_cents, deposit_cents, status, sign_token, signed_name, signed_initials, signed_at, sent_at, created_at)
    VALUES 
        ('CT-3001', v_business_id, 'Demo Bride 3', 'ido-br', 'Monique Lhuillier - Bliss, Ivory (Size 8)', 450000, 270000, 'Signed', 'token_1', 'Demo Bride 3', 'DB', now() - interval '2 days', now() - interval '3 days', now() - interval '5 days'),
        ('CT-3002', v_business_id, 'Demo Bride 6', 'ido-br', 'Vera Wang - Octavia, Silk White (Size 10)', 620000, 372000, 'Signed', 'token_2', 'Demo Bride 6', 'DB', now() - interval '1 day', now() - interval '2 days', now() - interval '4 days'),
        ('CT-3003', v_business_id, 'Demo Bride 9', 'proper', 'Berta - 19-101, Nude/Ivory (Size 38)', 890000, 0, 'Sent', 'token_3', null, null, null, now() - interval '4 hours', now() - interval '1 day'),
        ('CT-3004', v_business_id, 'Demo Bride 12', 'ido-br', 'Ines Di Santo - Quice, Off White (Size 12)', 540000, 0, 'Draft', 'token_4', null, null, null, null, now() - interval '1 hour')
    ON CONFLICT (id) DO NOTHING;

    -- SEED ALTERATIONS
    INSERT INTO alterations (id, business_id, customer, gown, seamstress, status, tasks, next_fitting, due_date, price_cents, location, created_at)
    VALUES
        ('ALT-101', v_business_id, 'Demo Bride 3', 'Monique Lhuillier - Bliss', 'Maria', 'In Progress', '[{"label": "Hem", "done": false}, {"label": "Bustle", "done": true}]'::jsonb, (CURRENT_DATE + interval '5 days')::DATE, (CURRENT_DATE + interval '14 days')::DATE, 85000, 'ido-br', now() - interval '7 days'),
        ('ALT-102', v_business_id, 'Demo Bride 6', 'Vera Wang - Octavia', 'Elena', 'Ready for Pickup', '[{"label": "Hem", "done": true}, {"label": "Bustle", "done": true}, {"label": "Take in bodice", "done": true}]'::jsonb, null, (CURRENT_DATE + interval '2 days')::DATE, 120000, 'ido-br', now() - interval '20 days'),
        ('ALT-103', v_business_id, 'Demo Bride 9', 'Berta - 19-101', 'Maria', 'Final Fitting', '[{"label": "Hem", "done": true}, {"label": "Bustle", "done": false}]'::jsonb, (CURRENT_DATE + interval '1 day')::DATE, (CURRENT_DATE + interval '8 days')::DATE, 95000, 'proper', now() - interval '12 days'),
        ('ALT-104', v_business_id, 'Demo Bride 1', 'Anne Barge - Blue Willow', 'Elena', 'Not Started', '[{"label": "Hem", "done": false}]'::jsonb, (CURRENT_DATE + interval '10 days')::DATE, (CURRENT_DATE + interval '30 days')::DATE, 60000, 'ido-br', now() - interval '1 day')
    ON CONFLICT (id) DO NOTHING;

    -- Get a customer and gown to use for relations
    SELECT id INTO v_customer1_id FROM customers WHERE name = 'Demo Bride 3' LIMIT 1;
    SELECT id INTO v_customer2_id FROM customers WHERE name = 'Demo Bride 6' LIMIT 1;
    SELECT id INTO v_gown1_id FROM gowns LIMIT 1;

    -- SEED PURCHASE ORDERS
    INSERT INTO purchase_orders (id, business_id, location_id, vendor, items, amount_cents, ordered, expected_delivery, status, notes)
    VALUES
        (gen_random_uuid(), v_business_id, v_loc1_id, 'Vera Wang', '1x Octavia (Size 10), 2x Felicity (Size 8, 12)', 850000, now() - interval '45 days', now() + interval '15 days', 'Ordered', 'Rush order for Octavia'),
        (gen_random_uuid(), v_business_id, v_loc1_id, 'Monique Lhuillier', '3x Bliss, 1x Majesty', 1200000, now() - interval '10 days', now() + interval '90 days', 'Ordered', 'Standard stock replenishment'),
        (gen_random_uuid(), v_business_id, v_loc2_id, 'Berta', '1x 19-101 (Size 38)', 450000, now() - interval '60 days', now() - interval '2 days', 'Received', 'Arrived early')
    ;

    -- SEED TRANSFERS
    INSERT INTO transfers (id, business_id, location_id, gown_id, gown_name, from_location_id, to_location_id, qty, status, requested, received)
    VALUES
        (gen_random_uuid(), v_business_id, v_loc1_id, v_gown1_id, 'Vera Wang - Octavia', v_loc1_id, v_loc2_id, 1, 'In Transit', now() - interval '1 day', null),
        (gen_random_uuid(), v_business_id, v_loc2_id, v_gown1_id, 'Monique Lhuillier - Bliss', v_loc2_id, v_loc1_id, 1, 'Completed', now() - interval '5 days', now() - interval '4 days')
    ;

    -- SEED MESSAGES
    IF v_customer1_id IS NOT NULL THEN
        INSERT INTO messages (id, business_id, location_id, customer_id, sender, content, sent_at)
        VALUES
            (gen_random_uuid(), v_business_id, v_loc1_id, v_customer1_id, 'store', 'Hi Demo Bride 3, your dress has arrived!', now() - interval '3 days'),
            (gen_random_uuid(), v_business_id, v_loc1_id, v_customer1_id, 'customer', 'That is amazing news! I am so excited.', now() - interval '2 days'),
            (gen_random_uuid(), v_business_id, v_loc1_id, v_customer1_id, 'store', 'Let us know when you would like to come in for your first fitting.', now() - interval '1 day')
        ;
    END IF;

END $$;
