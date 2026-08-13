-- 20260818000000_concurrency_safe_scheduling.sql
-- Enforces true concurrency-safe assignment of appointments using Postgres Transactions and Advisory Locks

CREATE OR REPLACE FUNCTION assign_appointment_idempotent(
    p_business_id uuid,
    p_request_id uuid,
    p_employee_id uuid,
    p_location_id uuid,
    p_room_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request record;
    v_overlap_count int;
    v_appointment record;
    v_employee_lock_key bigint;
BEGIN
    -- 1. Acquire transaction-level advisory lock for the employee to serialize concurrent requests
    -- We convert the uuid to a bigint hash for the lock key
    v_employee_lock_key := ('x'||substr(md5(p_employee_id::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_employee_lock_key);

    -- 2. Verify Request Status
    SELECT * INTO v_request 
    FROM appointment_requests 
    WHERE id = p_request_id AND business_id = p_business_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or unauthorized';
    END IF;

    IF v_request.status <> 'submitted' THEN
        RAISE EXCEPTION 'Request already assigned or processed';
    END IF;

    -- 3. Check Employee Schedule Overlaps (Concurrency Safe due to lock)
    SELECT count(*) INTO v_overlap_count
    FROM appointments
    WHERE employee_id = p_employee_id
      AND end_at > p_start_at
      AND start_at < p_end_at
      AND status NOT IN ('Canceled', 'No-show');

    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION 'Employee is already booked during this time';
    END IF;

    -- 4. Check Room Overlaps if applicable
    IF p_room_id IS NOT NULL THEN
        SELECT count(*) INTO v_overlap_count
        FROM appointments
        WHERE room_id = p_room_id
          AND end_at > p_start_at
          AND start_at < p_end_at
          AND status NOT IN ('Canceled', 'No-show');

        IF v_overlap_count > 0 THEN
            RAISE EXCEPTION 'Room is already booked during this time';
        END IF;
    END IF;

    -- 5. Lock Tentative Holds
    SELECT count(*) INTO v_overlap_count
    FROM appointment_holds
    WHERE employee_id = p_employee_id
      AND end_at > p_start_at
      AND start_at < p_end_at
      AND expires_at > now();

    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION 'Employee has a tentative hold during this time';
    END IF;

    -- 6. Insert Canonical Appointment
    INSERT INTO appointments (
        business_id,
        location_id,
        request_id,
        customer_id,
        employee_id,
        service_id,
        room_id,
        start_at,
        end_at,
        confirmation_status,
        status,
        intake_source
    ) VALUES (
        p_business_id,
        p_location_id,
        p_request_id,
        v_request.customer_id,
        p_employee_id,
        v_request.service_id,
        p_room_id,
        p_start_at,
        p_end_at,
        'pending',
        'Pending',
        v_request.intake_source
    ) RETURNING * INTO v_appointment;

    -- 7. Update Request Status
    UPDATE appointment_requests 
    SET status = 'assigned' 
    WHERE id = p_request_id;

    -- 8. Clear Conflicting Recommendations
    DELETE FROM appointment_assignment_recommendations 
    WHERE request_id = p_request_id;

    RETURN to_jsonb(v_appointment);
END;
$$;
