-- 20260806000002_complex_seed.sql
-- Injects complex deterministic scenarios for the AI matching demo

DO $$
DECLARE
    v_business_id UUID := 'b0000000-0000-0000-0000-000000000000';
    v_loc1_id UUID := 'c0000000-0000-0000-0000-000000000001';
    
    v_emp_sarah UUID;
    v_emp_jessica UUID;
    v_emp_emily UUID;
    
    v_service_bridal UUID := 'a0000000-0000-0000-0000-000000000001';
    v_service_alterations UUID := 'a0000000-0000-0000-0000-000000000002';
    
    v_vip_cust_id UUID := gen_random_uuid();
    v_regular_cust_id UUID := gen_random_uuid();
    v_flex_cust_id UUID := gen_random_uuid();
    
    v_req_conflict_vip UUID := gen_random_uuid();
    v_req_conflict_reg UUID := gen_random_uuid();
    v_req_flex UUID := gen_random_uuid();
    
    v_curr_date DATE := CURRENT_DATE;
BEGIN
    -- 1. Identify Employees
    SELECT id INTO v_emp_sarah FROM auth.users WHERE email = 'sarah@robertsenterprises.com';
    SELECT id INTO v_emp_jessica FROM auth.users WHERE email = 'jessica@robertsenterprises.com';
    SELECT id INTO v_emp_emily FROM auth.users WHERE email = 'emily@robertsenterprises.com';

    -- 2. Create the "Alterations" Service
    INSERT INTO appointment_services (id, business_id, name, duration_minutes, setup_buffer_minutes, required_role)
    VALUES (v_service_alterations, v_business_id, 'Alterations', 60, 10, 'Seamstress')
    ON CONFLICT (id) DO NOTHING;
    
    -- 3. Clear existing requests and appointments for a clean slate today
    DELETE FROM appointments WHERE DATE(start_at) = v_curr_date;
    DELETE FROM appointment_requests WHERE preferred_date_1 = v_curr_date;
    DELETE FROM employee_schedules WHERE shift_date = v_curr_date;

    -- 4. Setup Distinct Schedules for Today
    INSERT INTO employee_schedules (business_id, location_id, employee_id, shift_date, start_at, end_at, status)
    VALUES
    -- Sarah is fully open today (09:00 - 17:00)
    (v_business_id, v_loc1_id, v_emp_sarah, v_curr_date, (v_curr_date + '09:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '17:00:00'::TIME)::TIMESTAMPTZ, 'published'),
    -- Jessica has a fragmented day (09:00 - 11:30 and 13:00 - 15:00)
    (v_business_id, v_loc1_id, v_emp_jessica, v_curr_date, (v_curr_date + '09:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '15:00:00'::TIME)::TIMESTAMPTZ, 'published');
    
    -- Give Jessica some existing appointments to fragment her day
    INSERT INTO appointments (business_id, location_id, customer_id, service_id, employee_id, start_at, end_at, status, confirmation_status)
    VALUES 
    (v_business_id, v_loc1_id, (SELECT id FROM customers LIMIT 1), v_service_bridal, v_emp_jessica, (v_curr_date + '09:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '10:00:00'::TIME)::TIMESTAMPTZ, 'confirmed', 'confirmed'),
    (v_business_id, v_loc1_id, (SELECT id FROM customers OFFSET 1 LIMIT 1), v_service_bridal, v_emp_jessica, (v_curr_date + '11:30:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '13:00:00'::TIME)::TIMESTAMPTZ, 'confirmed', 'confirmed');

    -- 5. Create Customers
    INSERT INTO customers (id, business_id, location_id, name, email, phone, status, spend_cents)
    VALUES 
    (v_vip_cust_id, v_business_id, v_loc1_id, 'Victoria VIP (High Spend)', 'vip@demo.com', '555-0199', 'Purchased', 850000),
    (v_regular_cust_id, v_business_id, v_loc1_id, 'Rachel Regular', 'regular@demo.com', '555-0188', 'Shopping', 0),
    (v_flex_cust_id, v_business_id, v_loc1_id, 'Fiona Flexible', 'flex@demo.com', '555-0177', 'Shopping', 150000);

    -- 6. Inject Complex Scenarios (Requests)
    
    -- SCENARIO A: Double Booking Conflict
    -- Both Victoria and Rachel want 2:00 PM today for a Bridal Consultation. Only Sarah is fully free at 2:00 PM.
    -- The AI should score Sarah highly for BOTH, but give Victoria (VIP) a higher priority score.
    INSERT INTO appointment_requests (id, business_id, customer_id, service_id, preferred_location_id, preferred_date_1, preferred_window_1, status)
    VALUES
    (v_req_conflict_vip, v_business_id, v_vip_cust_id, v_service_bridal, v_loc1_id, v_curr_date, '14:00:00', 'pending'),
    (v_req_conflict_reg, v_business_id, v_regular_cust_id, v_service_bridal, v_loc1_id, v_curr_date, '14:00:00', 'pending');
    
    -- SCENARIO B: Gap Optimization
    -- Fiona wants a flexible time today. 
    -- Sarah has a massive open block. Jessica has exactly a 90-minute gap between 10:00 and 11:30.
    -- The AI should prefer Jessica to optimize schedule utilization.
    INSERT INTO appointment_requests (id, business_id, customer_id, service_id, preferred_location_id, preferred_date_1, status)
    VALUES
    (v_req_flex, v_business_id, v_flex_cust_id, v_service_bridal, v_loc1_id, v_curr_date, 'pending');

    -- 7. Insert Deterministic AI Recommendations for these scenarios
    
    -- VIP gets priority over Regular for the 2:00 PM slot with Sarah
    INSERT INTO appointment_assignment_recommendations (request_id, employee_id, location_id, proposed_start_at, proposed_end_at, score, score_breakdown_json, disqualification_reasons_json, model_metadata)
    VALUES
    (v_req_conflict_vip, v_emp_sarah, v_loc1_id, (v_curr_date + '14:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '15:30:00'::TIME)::TIMESTAMPTZ, 98, '{"availability": 100, "priority": 100, "vip_boost": 25}'::jsonb, '[]'::jsonb, '{"reasoning": "Optimal match. High-value VIP customer ($8,500 spend) prioritized for requested slot."}'::jsonb),
    (v_req_conflict_reg, v_emp_sarah, v_loc1_id, (v_curr_date + '14:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '15:30:00'::TIME)::TIMESTAMPTZ, 75, '{"availability": 100, "priority": 50, "vip_boost": 0}'::jsonb, '[]'::jsonb, '{"reasoning": "Available, but another high-priority request is competing for this exact time slot."}'::jsonb);

    -- Flexible Gap Optimization
    -- Jessica scores higher than Sarah because assigning Jessica perfectly fills her 90-minute gap (10:00 - 11:30)
    INSERT INTO appointment_assignment_recommendations (request_id, employee_id, location_id, proposed_start_at, proposed_end_at, score, score_breakdown_json, disqualification_reasons_json, model_metadata)
    VALUES
    (v_req_flex, v_emp_jessica, v_loc1_id, (v_curr_date + '10:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '11:30:00'::TIME)::TIMESTAMPTZ, 95, '{"availability": 100, "utilization_boost": 30}'::jsonb, '[]'::jsonb, '{"reasoning": "Perfect fit. This assignment perfectly optimizes schedule gaps, avoiding fragmented downtime."}'::jsonb),
    (v_req_flex, v_emp_sarah, v_loc1_id, (v_curr_date + '10:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '11:30:00'::TIME)::TIMESTAMPTZ, 80, '{"availability": 100, "utilization_boost": 0}'::jsonb, '[]'::jsonb, '{"reasoning": "Available, but leaves fragmented downtime in schedule compared to other options."}'::jsonb);

END $$;
