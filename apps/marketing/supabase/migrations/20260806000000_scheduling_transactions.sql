-- supabase/migrations/20260806000000_scheduling_transactions.sql

CREATE OR REPLACE FUNCTION assign_appointment_request(
    p_request_id uuid,
    p_employee_id uuid,
    p_room_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz
) RETURNS uuid AS $$
DECLARE
    v_req record;
    v_new_appointment_id uuid;
    v_conflict_count integer;
BEGIN
    -- Lock request
    SELECT * INTO v_req
    FROM appointment_requests
    WHERE id = p_request_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    -- Check shift availability
    PERFORM id
    FROM employee_schedules
    WHERE employee_id = p_employee_id
      AND status = 'published'
      AND start_at <= p_start_at
      AND end_at >= p_end_at;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee does not have a published shift covering this time';
    END IF;

    -- Check overlapping appointments
    SELECT COUNT(*) INTO v_conflict_count
    FROM appointments
    WHERE employee_id = p_employee_id
      AND start_at < p_end_at
      AND end_at > p_start_at
      AND COALESCE(status, '') != 'Canceled';

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Employee has conflicting appointments';
    END IF;

    -- Check overlapping holds
    SELECT COUNT(*) INTO v_conflict_count
    FROM appointment_holds
    WHERE employee_id = p_employee_id
      AND start_at < p_end_at
      AND end_at > p_start_at
      AND expires_at > NOW();

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Employee has conflicting holds';
    END IF;

    -- Update request status
    UPDATE appointment_requests
    SET status = 'confirmed'
    WHERE id = p_request_id;

    -- Insert appointment
    INSERT INTO appointments (
        business_id,
        location_id,
        customer_id,
        request_id,
        employee_id,
        service_id,
        room_id,
        start_at,
        end_at,
        status,
        confirmation_status,
        confirmed_at
    ) VALUES (
        v_req.business_id,
        v_req.preferred_location_id,
        v_req.customer_id,
        v_req.id,
        p_employee_id,
        v_req.service_id,
        p_room_id,
        p_start_at,
        p_end_at,
        'Scheduled',
        'Confirmed',
        NOW()
    ) RETURNING id INTO v_new_appointment_id;

    RETURN v_new_appointment_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_ai_recommendations(p_request_id uuid)
RETURNS void AS $$
DECLARE
    v_req record;
    v_service record;
    v_shift record;
    v_prop_start timestamptz;
    v_prop_end timestamptz;
    v_conflict integer;
BEGIN
    -- Read request info
    SELECT * INTO v_req FROM appointment_requests WHERE id = p_request_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    SELECT * INTO v_service FROM appointment_services WHERE id = v_req.service_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    -- Find active employees at location with published shift that covers the requested time
    FOR v_shift IN 
        SELECT s.* 
        FROM employee_schedules s
        JOIN employee_service_eligibility e ON s.employee_id = e.employee_id
        WHERE s.location_id = v_req.preferred_location_id
          AND s.shift_date = v_req.preferred_date_1
          AND s.status = 'published'
          AND e.service_id = v_req.service_id
          AND e.active = true
    LOOP
        v_prop_start := v_shift.start_at;
        v_prop_end := v_prop_start + (v_service.duration_minutes || ' minutes')::interval;
        
        IF v_prop_end <= v_shift.end_at THEN
            -- Check overlapping appointments
            SELECT COUNT(*) INTO v_conflict
            FROM appointments
            WHERE employee_id = v_shift.employee_id
              AND start_at < v_prop_end
              AND end_at > v_prop_start
              AND COALESCE(status, '') != 'Canceled';
              
            -- Check overlapping holds
            IF v_conflict = 0 THEN
                SELECT COUNT(*) INTO v_conflict
                FROM appointment_holds
                WHERE employee_id = v_shift.employee_id
                  AND start_at < v_prop_end
                  AND end_at > v_prop_start
                  AND expires_at > NOW();
            END IF;
            
            -- Check breaks
            IF v_conflict = 0 THEN
                SELECT COUNT(*) INTO v_conflict
                FROM employee_schedule_breaks
                WHERE schedule_id = v_shift.id
                  AND start_at < v_prop_end
                  AND end_at > v_prop_start;
            END IF;
            
            IF v_conflict = 0 THEN
                INSERT INTO appointment_assignment_recommendations (
                    request_id,
                    employee_id,
                    location_id,
                    proposed_start_at,
                    proposed_end_at,
                    score,
                    score_breakdown_json,
                    disqualification_reasons_json
                ) VALUES (
                    p_request_id,
                    v_shift.employee_id,
                    v_req.preferred_location_id,
                    v_prop_start,
                    v_prop_end,
                    100,
                    '{"base": 100}'::jsonb,
                    '[]'::jsonb
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reschedule_appointment(
    p_appointment_id uuid,
    p_new_start_at timestamptz,
    p_new_end_at timestamptz,
    p_new_employee_id uuid
) RETURNS void AS $$
DECLARE
    v_conflict_count integer;
BEGIN
    -- Check shift availability
    PERFORM id
    FROM employee_schedules
    WHERE employee_id = p_new_employee_id
      AND status = 'published'
      AND start_at <= p_new_start_at
      AND end_at >= p_new_end_at;
      
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee does not have a published shift covering this time';
    END IF;

    -- Check overlapping appointments (excluding this one)
    SELECT COUNT(*) INTO v_conflict_count
    FROM appointments
    WHERE employee_id = p_new_employee_id
      AND id != p_appointment_id
      AND start_at < p_new_end_at
      AND end_at > p_new_start_at
      AND COALESCE(status, '') != 'Canceled';

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Employee has conflicting appointments';
    END IF;

    -- Check overlapping holds
    SELECT COUNT(*) INTO v_conflict_count
    FROM appointment_holds
    WHERE employee_id = p_new_employee_id
      AND start_at < p_new_end_at
      AND end_at > p_new_start_at
      AND expires_at > NOW();

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Employee has conflicting holds';
    END IF;

    -- Update appointment
    UPDATE appointments
    SET start_at = p_new_start_at,
        end_at = p_new_end_at,
        employee_id = p_new_employee_id
    WHERE id = p_appointment_id;
END;
$$ LANGUAGE plpgsql;
