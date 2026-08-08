-- 20260806000001_seed_scheduling_data.sql
DO $$
DECLARE
    v_business_id UUID := 'b0000000-0000-0000-0000-000000000000';
    v_loc1_id UUID := 'c0000000-0000-0000-0000-000000000001';
    
    v_emp1_id UUID;
    v_emp2_id UUID;
    
    v_service1 UUID := 'a0000000-0000-0000-0000-000000000001';
    
    v_cust1_id UUID;
    v_cust2_id UUID;
    v_cust3_id UUID;
    
    v_req1_id UUID := gen_random_uuid();
    v_req2_id UUID := gen_random_uuid();
    v_req3_id UUID := gen_random_uuid();
    
    v_curr_date DATE := CURRENT_DATE;
BEGIN
    SELECT id INTO v_emp1_id FROM auth.users WHERE email = 'sarah@robertsenterprises.com';
    SELECT id INTO v_emp2_id FROM auth.users WHERE email = 'jessica@robertsenterprises.com';
    
    SELECT id INTO v_cust1_id FROM customers WHERE business_id = v_business_id LIMIT 1 OFFSET 0;
    SELECT id INTO v_cust2_id FROM customers WHERE business_id = v_business_id LIMIT 1 OFFSET 1;
    SELECT id INTO v_cust3_id FROM customers WHERE business_id = v_business_id LIMIT 1 OFFSET 2;
    
    -- Insert Schedules
    INSERT INTO employee_schedules (business_id, location_id, employee_id, shift_date, start_at, end_at, status)
    VALUES
    (v_business_id, v_loc1_id, v_emp1_id, v_curr_date, (v_curr_date + '09:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '17:00:00'::TIME)::TIMESTAMPTZ, 'published'),
    (v_business_id, v_loc1_id, v_emp2_id, v_curr_date, (v_curr_date + '10:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '18:00:00'::TIME)::TIMESTAMPTZ, 'published'),
    (v_business_id, v_loc1_id, v_emp1_id, v_curr_date + 1, ((v_curr_date + 1) + '09:00:00'::TIME)::TIMESTAMPTZ, ((v_curr_date + 1) + '17:00:00'::TIME)::TIMESTAMPTZ, 'published');
    
    -- Insert Appointment Requests
    INSERT INTO appointment_requests (id, business_id, customer_id, service_id, preferred_location_id, preferred_date_1, status)
    VALUES
    (v_req1_id, v_business_id, v_cust1_id, v_service1, v_loc1_id, v_curr_date, 'pending'),
    (v_req2_id, v_business_id, v_cust2_id, v_service1, v_loc1_id, v_curr_date, 'pending'),
    (v_req3_id, v_business_id, v_cust3_id, v_service1, v_loc1_id, v_curr_date, 'waitlist');
    
    -- Insert AI Recommendations
    INSERT INTO appointment_assignment_recommendations (request_id, employee_id, location_id, proposed_start_at, proposed_end_at, score, score_breakdown_json, disqualification_reasons_json)
    VALUES
    (v_req1_id, v_emp1_id, v_loc1_id, (v_curr_date + '14:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '15:30:00'::TIME)::TIMESTAMPTZ, 95, '{"availability": 100, "skill_match": 90}'::jsonb, '[]'::jsonb),
    (v_req1_id, v_emp2_id, v_loc1_id, (v_curr_date + '14:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '15:30:00'::TIME)::TIMESTAMPTZ, 82, '{"availability": 100, "skill_match": 64}'::jsonb, '[]'::jsonb),
    (v_req2_id, v_emp2_id, v_loc1_id, (v_curr_date + '15:00:00'::TIME)::TIMESTAMPTZ, (v_curr_date + '16:30:00'::TIME)::TIMESTAMPTZ, 88, '{"availability": 100, "skill_match": 76}'::jsonb, '[]'::jsonb);
    
END $$;
