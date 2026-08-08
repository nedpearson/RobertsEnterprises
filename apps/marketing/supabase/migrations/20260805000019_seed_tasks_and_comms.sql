-- 20260805000019_seed_tasks_and_comms.sql

DO $$
DECLARE
    v_business_id UUID := 'b0000000-0000-0000-0000-000000000000';
    v_loc1_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_customer1_id UUID;
    v_emp1_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = v_business_id) THEN
        RETURN;
    END IF;

    SELECT id INTO v_customer1_id FROM customers WHERE name = 'Demo Bride 3' LIMIT 1;
    SELECT id INTO v_emp1_id FROM auth.users WHERE email = 'sarah@robertsenterprises.com' LIMIT 1;

    -- SEED TASKS
    IF v_emp1_id IS NOT NULL THEN
        INSERT INTO tasks (id, business_id, location_id, title, description, status, priority, created_by, due_date)
        VALUES 
            (gen_random_uuid(), v_business_id, v_loc1_id, 'Follow up with Demo Bride 3', 'Call to confirm her veil order', 'pending', 'high', v_emp1_id, now() + interval '1 day'),
            (gen_random_uuid(), v_business_id, v_loc1_id, 'Steam new arrivals', 'Berta trunk show dresses need steaming', 'in_progress', 'normal', v_emp1_id, now() + interval '2 hours'),
            (gen_random_uuid(), v_business_id, v_loc1_id, 'Call about delayed shipment', 'Vera Wang order is 2 weeks late', 'completed', 'urgent', v_emp1_id, now() - interval '1 day')
        ON CONFLICT DO NOTHING;
    END IF;

    -- SEED COMMUNICATIONS
    IF v_customer1_id IS NOT NULL AND v_emp1_id IS NOT NULL THEN
        INSERT INTO communications (id, business_id, location_id, customer_id, channel, direction, body, status, sender_id, sender_name, recipient_identifier)
        VALUES
            (gen_random_uuid(), v_business_id, v_loc1_id, v_customer1_id, 'email', 'outbound', 'Hi Demo Bride 3, your veil is here. You can pick it up anytime!', 'delivered', v_emp1_id, 'Sarah Smith', 'bride3@demo.com')
        ON CONFLICT DO NOTHING;
    END IF;

END $$;
