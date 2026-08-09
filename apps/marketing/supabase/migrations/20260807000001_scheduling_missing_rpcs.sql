-- Add columns to appointment_requests
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS number_of_guests INTEGER DEFAULT 1;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS budget_cents INTEGER;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS designer_interest TEXT;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS campaign_attribution TEXT;
ALTER TABLE appointment_requests ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb;

-- Add columns to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS accessibility_needs TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Enable RLS for modified tables (confirming)
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 1. Publish Employee Schedule
CREATE OR REPLACE FUNCTION publish_employee_schedule(
    p_business_id uuid,
    p_location_id uuid
) RETURNS void AS $$
BEGIN
    UPDATE employee_schedules
    SET status = 'published',
        published_at = NOW()
    WHERE business_id = p_business_id
      AND (p_location_id IS NULL OR location_id = p_location_id)
      AND status = 'draft';
END;
$$ LANGUAGE plpgsql;

-- 2. Create Appointment Hold
CREATE OR REPLACE FUNCTION create_appointment_hold(
    p_request_id uuid,
    p_employee_id uuid,
    p_business_id uuid,
    p_location_id uuid,
    p_room_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_expires_in_minutes integer DEFAULT 15
) RETURNS uuid AS $$
DECLARE
    v_hold_id uuid;
    v_conflict_count integer;
BEGIN
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

    INSERT INTO appointment_holds (
        request_id,
        employee_id,
        business_id,
        location_id,
        room_id,
        start_at,
        end_at,
        expires_at
    ) VALUES (
        p_request_id,
        p_employee_id,
        p_business_id,
        p_location_id,
        p_room_id,
        p_start_at,
        p_end_at,
        NOW() + (p_expires_in_minutes || ' minutes')::interval
    ) RETURNING id INTO v_hold_id;

    -- Update request status
    UPDATE appointment_requests
    SET status = 'tentative_hold'
    WHERE id = p_request_id;

    RETURN v_hold_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Confirm Appointment Hold
CREATE OR REPLACE FUNCTION confirm_appointment_hold(
    p_hold_id uuid
) RETURNS uuid AS $$
DECLARE
    v_hold record;
    v_appt_id uuid;
    v_service_id uuid;
BEGIN
    SELECT * INTO v_hold FROM appointment_holds WHERE id = p_hold_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hold not found';
    END IF;
    
    IF v_hold.expires_at < NOW() THEN
        RAISE EXCEPTION 'Hold has expired';
    END IF;

    SELECT service_id INTO v_service_id FROM appointment_requests WHERE id = v_hold.request_id;

    -- Create appointment
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
        v_hold.business_id,
        v_hold.location_id,
        (SELECT customer_id FROM appointment_requests WHERE id = v_hold.request_id),
        v_hold.request_id,
        v_hold.employee_id,
        v_service_id,
        v_hold.room_id,
        v_hold.start_at,
        v_hold.end_at,
        'Scheduled',
        'Confirmed',
        NOW()
    ) RETURNING id INTO v_appt_id;

    -- Update request status
    UPDATE appointment_requests
    SET status = 'confirmed'
    WHERE id = v_hold.request_id;

    -- Delete all competing holds for this request or employee overlap
    DELETE FROM appointment_holds
    WHERE request_id = v_hold.request_id OR id = p_hold_id;

    RETURN v_appt_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Transition Request Status
CREATE OR REPLACE FUNCTION transition_request_status(
    p_request_id uuid,
    p_new_status text,
    p_reason text DEFAULT NULL
) RETURNS void AS $$
DECLARE
    v_old_status text;
    v_req record;
BEGIN
    SELECT * INTO v_req FROM appointment_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found';
    END IF;
    v_old_status := v_req.status;

    UPDATE appointment_requests
    SET status = p_new_status
    WHERE id = p_request_id;

    -- Audit event
    INSERT INTO appointment_audit_events (
        business_id,
        location_id,
        request_id,
        event_type,
        previous_values,
        new_values
    ) VALUES (
        v_req.business_id,
        v_req.preferred_location_id,
        p_request_id,
        'request_status_transition',
        jsonb_build_object('status', v_old_status),
        jsonb_build_object('status', p_new_status, 'reason', p_reason)
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Create Direct Appointment
CREATE OR REPLACE FUNCTION create_direct_appointment(
    p_business_id uuid,
    p_location_id uuid,
    p_customer_id uuid,
    p_service_id uuid,
    p_employee_id uuid,
    p_room_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz
) RETURNS uuid AS $$
DECLARE
    v_appt_id uuid;
    v_conflict_count integer;
BEGIN
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

    INSERT INTO appointments (
        business_id,
        location_id,
        customer_id,
        employee_id,
        service_id,
        room_id,
        start_at,
        end_at,
        status,
        confirmation_status,
        confirmed_at
    ) VALUES (
        p_business_id,
        p_location_id,
        p_customer_id,
        p_employee_id,
        p_service_id,
        p_room_id,
        p_start_at,
        p_end_at,
        'Scheduled',
        'Confirmed',
        NOW()
    ) RETURNING id INTO v_appt_id;

    RETURN v_appt_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Handle Employee Callout
CREATE OR REPLACE FUNCTION handle_employee_callout(
    p_employee_id uuid,
    p_date date,
    p_reason text DEFAULT NULL
) RETURNS void AS $$
BEGIN
    -- 1. Unpublish/mark draft shifts for this employee on that date
    UPDATE employee_schedules
    SET status = 'draft',
        notes = COALESCE(notes, '') || ' Callout: ' || COALESCE(p_reason, 'No reason')
    WHERE employee_id = p_employee_id
      AND shift_date = p_date;

    -- 2. Mark appointments affected on that date as pending_reassignment or flag them
    UPDATE appointments
    SET confirmation_status = 'Pending Reassignment'
    WHERE employee_id = p_employee_id
      AND start_at::date = p_date;
END;
$$ LANGUAGE plpgsql;

-- 7. Check In Appointment
CREATE OR REPLACE FUNCTION check_in_appointment(
    p_appointment_id uuid
) RETURNS void AS $$
BEGIN
    UPDATE appointments
    SET status = 'Checked In',
        confirmation_status = 'Checked In'
    WHERE id = p_appointment_id;

    INSERT INTO appointment_audit_events (
        business_id,
        location_id,
        appointment_id,
        event_type,
        new_values
    ) VALUES (
        (SELECT business_id FROM appointments WHERE id = p_appointment_id),
        (SELECT location_id FROM appointments WHERE id = p_appointment_id),
        p_appointment_id,
        'appointment_check_in',
        '{"status": "Checked In"}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- 8. Start Appointment
CREATE OR REPLACE FUNCTION start_appointment(
    p_appointment_id uuid
) RETURNS void AS $$
BEGIN
    UPDATE appointments
    SET status = 'In Progress',
        confirmation_status = 'In Progress'
    WHERE id = p_appointment_id;

    INSERT INTO appointment_audit_events (
        business_id,
        location_id,
        appointment_id,
        event_type,
        new_values
    ) VALUES (
        (SELECT business_id FROM appointments WHERE id = p_appointment_id),
        (SELECT location_id FROM appointments WHERE id = p_appointment_id),
        p_appointment_id,
        'appointment_start',
        '{"status": "In Progress"}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Complete Appointment
CREATE OR REPLACE FUNCTION complete_appointment(
    p_appointment_id uuid,
    p_outcome text,
    p_notes text DEFAULT NULL
) RETURNS void AS $$
BEGIN
    UPDATE appointments
    SET status = 'Completed',
        confirmation_status = 'Completed'
    WHERE id = p_appointment_id;

    INSERT INTO appointment_audit_events (
        business_id,
        location_id,
        appointment_id,
        event_type,
        new_values
    ) VALUES (
        (SELECT business_id FROM appointments WHERE id = p_appointment_id),
        (SELECT location_id FROM appointments WHERE id = p_appointment_id),
        p_appointment_id,
        'appointment_complete',
        jsonb_build_object('status', 'Completed', 'outcome', p_outcome, 'notes', p_notes)
    );
END;
$$ LANGUAGE plpgsql;
