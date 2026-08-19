-- 20260804000004_seed_demo_data.sql

-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_demo_user_id UUID;
    v_emp1_id UUID;
    v_emp2_id UUID;
    v_emp3_id UUID;
    v_emp4_id UUID;
    
    v_business_id UUID := 'b0000000-0000-0000-0000-000000000000';
    v_loc1_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_loc2_id UUID := 'c0000000-0000-0000-0000-000000000002';
    v_loc3_id UUID := 'c0000000-0000-0000-0000-000000000003';
    v_loc4_id UUID := 'c0000000-0000-0000-0000-000000000004';
    
    v_room1 UUID := 'f0000000-0000-0000-0000-000000000001';
    v_room2 UUID := 'f0000000-0000-0000-0000-000000000002';
    
    v_service1 UUID := 'a0000000-0000-0000-0000-000000000001';
    
    v_customer_id UUID;
    v_gown_id UUID;
    
    i INT;
BEGIN
    -- 1. Create or Get Demo User
    SELECT id INTO v_demo_user_id FROM auth.users WHERE email = 'demo123@gmail.com';
    IF v_demo_user_id IS NULL THEN
        v_demo_user_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (v_demo_user_id, '00000000-0000-0000-0000-000000000000', 'demo123@gmail.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"name": "Demo Owner", "role": "Owner"}');
    END IF;

    -- Update demo user password just in case they were created previously without the right password
    UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()), encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')) WHERE id = v_demo_user_id;

    -- Employee 1
    SELECT id INTO v_emp1_id FROM auth.users WHERE email = 'sarah@robertsenterprises.com';
    IF v_emp1_id IS NULL THEN
        v_emp1_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (v_emp1_id, '00000000-0000-0000-0000-000000000000', 'sarah@robertsenterprises.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"name": "Sarah Smith", "role": "Stylist"}');
    END IF;

    -- Employee 2
    SELECT id INTO v_emp2_id FROM auth.users WHERE email = 'jessica@robertsenterprises.com';
    IF v_emp2_id IS NULL THEN
        v_emp2_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (v_emp2_id, '00000000-0000-0000-0000-000000000000', 'jessica@robertsenterprises.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"name": "Jessica Lee", "role": "Stylist"}');
    END IF;

    -- Employee 3
    SELECT id INTO v_emp3_id FROM auth.users WHERE email = 'emily@robertsenterprises.com';
    IF v_emp3_id IS NULL THEN
        v_emp3_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (v_emp3_id, '00000000-0000-0000-0000-000000000000', 'emily@robertsenterprises.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"name": "Emily Chen", "role": "Stylist"}');
    END IF;

    -- Employee 4
    SELECT id INTO v_emp4_id FROM auth.users WHERE email = 'michael@robertsenterprises.com';
    IF v_emp4_id IS NULL THEN
        v_emp4_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (v_emp4_id, '00000000-0000-0000-0000-000000000000', 'michael@robertsenterprises.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"name": "Michael Taylor", "role": "Manager"}');
    END IF;

    -- 2. Create Business & Locations
    INSERT INTO businesses (id, name) VALUES (v_business_id, 'Magnolia Bridal Group') ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO locations (id, business_id, name, address) 
    VALUES 
        (v_loc1_id, v_business_id, 'I Do Bridal Couture - Baton Rouge', '4343 Perkins Rd, Baton Rouge, LA 70808'),
        (v_loc2_id, v_business_id, 'I Do Bridal Couture - Covington', '316 Lee Ln, Covington, LA 70433'),
        (v_loc3_id, v_business_id, 'Proper & Co. - Baton Rouge', '4347 Perkins Rd, Suite A, Baton Rouge, LA 70808'),
        (v_loc4_id, v_business_id, 'Proper & Co. - Covington', '311 Lee Ln, Suite A, Covington, LA 70433')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;
    
    -- 3. Business Memberships
    INSERT INTO business_memberships (user_id, business_id, role)
    VALUES 
        (v_demo_user_id, v_business_id, 'Owner'),
        (v_emp1_id, v_business_id, 'Stylist'),
        (v_emp2_id, v_business_id, 'Stylist'),
        (v_emp3_id, v_business_id, 'Stylist'),
        (v_emp4_id, v_business_id, 'Manager')
    ON CONFLICT (user_id, business_id) DO NOTHING;

    -- Ensure staff_profiles table exists if it somehow isn't defined yet
    CREATE TABLE IF NOT EXISTS staff_profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT,
        role TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO staff_profiles (id, name, role)
    VALUES
        (v_demo_user_id, 'Demo Owner', 'Owner'),
        (v_emp1_id, 'Sarah Smith', 'Stylist'),
        (v_emp2_id, 'Jessica Lee', 'Stylist'),
        (v_emp3_id, 'Emily Chen', 'Stylist'),
        (v_emp4_id, 'Michael Taylor', 'Manager')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;
    
    -- 4. Rooms and Services
    INSERT INTO rooms (id, business_id, location_id, name, room_type, capacity)
    VALUES
        (v_room1, v_business_id, v_loc1_id, 'Bridal Suite A', 'bridal', 1),
        (v_room2, v_business_id, v_loc1_id, 'Bridal Suite B', 'bridal', 1)
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO appointment_services (id, business_id, name, duration_minutes, setup_buffer_minutes, required_role)
    VALUES
        (v_service1, v_business_id, 'Bridal Consultation', 90, 15, 'Stylist')
    ON CONFLICT (id) DO NOTHING;

    -- 5. Generate robust mock data
    
    -- Customers (15 active brides)
    FOR i IN 1..15 LOOP
        v_customer_id := gen_random_uuid();
        INSERT INTO customers (id, business_id, location_id, name, email, phone, wedding_date, status, spend_cents)
        VALUES (
            v_customer_id, 
            v_business_id, 
            v_loc1_id, 
            'Demo Bride ' || i, 
            'bride' || i || '@demo.com', 
            '555-010' || LPAD(i::text, 2, '0'),
            (CURRENT_DATE + (i * 10 || ' days')::INTERVAL)::DATE,
            CASE WHEN i % 3 = 0 THEN 'Purchased' ELSE 'Shopping' END,
            CASE WHEN i % 3 = 0 THEN (200000 + i * 15000) ELSE 0 END
        );
        
        -- Invoices for purchased customers
        IF i % 3 = 0 THEN
            INSERT INTO invoices (business_id, location_id, customer_id, description, amount_cents, paid_cents, status)
            VALUES (
                v_business_id,
                v_loc1_id,
                v_customer_id,
                'Bridal Gown & Accessories',
                (200000 + i * 15000),
                (100000 + i * 5000),
                'Partially Paid'
            );
        END IF;

        -- Appointments for everyone
        BEGIN
            INSERT INTO appointments (business_id, location_id, customer_id, service_id, employee_id, room_id, start_at, end_at, status)
            VALUES (
                v_business_id,
                v_loc1_id,
                v_customer_id,
                v_service1,
                v_emp1_id,
                v_room1,
                (CURRENT_DATE + (i || ' days')::INTERVAL + '10:00:00'::TIME)::TIMESTAMPTZ,
                (CURRENT_DATE + (i || ' days')::INTERVAL + '11:30:00'::TIME)::TIMESTAMPTZ,
                'confirmed'
            );
        EXCEPTION WHEN OTHERS THEN
            -- Ignore double booking errors on seed re-runs
            NULL;
        END;
    END LOOP;

    -- Leads (10 raw leads)
    FOR i IN 1..10 LOOP
        INSERT INTO leads (business_id, location_id, name, email, source, budget_cents, stage, ai_score, ai_insight)
        VALUES (
            v_business_id,
            v_loc1_id,
            'New Lead ' || i,
            'lead' || i || '@demo.com',
            'Website',
            250000,
            'New',
            (70 + i * 2),
            'High likelihood of booking based on budget'
        );
    END LOOP;

    -- Gowns (30 gowns)
    FOR i IN 1..30 LOOP
        INSERT INTO gowns (business_id, location_id, name, designer, style, price_cents, stock, status)
        VALUES (
            v_business_id,
            v_loc1_id,
            'Gown Model ' || i,
            CASE WHEN i % 2 = 0 THEN 'Vera Wang' ELSE 'Monique Lhuillier' END,
            CASE WHEN i % 3 = 0 THEN 'Mermaid' ELSE 'A-Line' END,
            (150000 + i * 10000),
            (i % 3) + 1,
            'In Stock'
        );
    END LOOP;

    UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL AND email IN ('demo123@gmail.com', 'sarah@robertsenterprises.com', 'jessica@robertsenterprises.com', 'emily@robertsenterprises.com', 'michael@robertsenterprises.com');
END $$;
