-- VowOS robust confirmation transaction
CREATE OR REPLACE FUNCTION public.confirm_booking_request(
    p_booking_request_id UUID,
    p_business_id UUID,
    p_location_id UUID,
    p_stylist_id UUID,
    p_appointment_start TIMESTAMPTZ,
    p_appointment_duration INT,
    p_send_email BOOLEAN,
    p_send_sms BOOLEAN,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_appointment_id UUID;
    v_request RECORD;
    v_existing_appt UUID;
BEGIN
    -- 1. Lock the booking request
    SELECT * INTO v_request
    FROM public.appointment_requests
    WHERE id = p_booking_request_id AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking request not found or access denied.';
    END IF;

    -- 2. Reject duplicate conversion
    IF v_request.status = 'CONFIRMED' THEN
        SELECT id INTO v_existing_appt FROM public.appointments WHERE request_id = p_booking_request_id LIMIT 1;
        IF v_existing_appt IS NOT NULL THEN
            RETURN v_existing_appt; -- Idempotency
        END IF;
    END IF;

    -- 3. Create appointment
    INSERT INTO public.appointments (
        business_id,
        location_id,
        customer_id,
        request_id,
        employee_id,
        start_at,
        end_at,
        status,
        confirmation_status,
        confirmed_at,
        confirmed_by
    ) VALUES (
        p_business_id,
        p_location_id,
        v_request.customer_id,
        p_booking_request_id,
        p_stylist_id,
        p_appointment_start,
        p_appointment_start + (p_appointment_duration || ' minutes')::INTERVAL,
        'Scheduled',
        'Confirmed',
        now(),
        p_user_id
    ) RETURNING id INTO v_appointment_id;

    -- 4. Update request status
    UPDATE public.appointment_requests
    SET status = 'CONFIRMED'
    WHERE id = p_booking_request_id;

    -- 5. Audit event
    INSERT INTO public.appointment_audit_events (
        appointment_id,
        business_id,
        event_type,
        actor_id,
        description
    ) VALUES (
        v_appointment_id,
        p_business_id,
        'CONFIRMATION',
        p_user_id,
        'Booking request confirmed and converted to appointment'
    );

    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
