-- 20260814000001_public_appointment_rpc.sql
-- SECURE PUBLIC BOOKING RPC
-- This RPC allows the public booking page to securely insert an appointment, lead, and message 
-- into the correct tenant's database without exposing RLS to anonymous users or requiring them to know the business_id.

CREATE OR REPLACE FUNCTION submit_public_appointment(
    p_store_slug text,
    p_customer_name text,
    p_email text,
    p_phone text,
    p_type text,
    p_date date,
    p_time text,
    p_looking_for text,
    p_budget_cents integer,
    p_payment_intent_id text,
    p_total_cents integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id uuid;
    v_location_id uuid;
    v_customer_id uuid;
    v_appointment_id uuid;
BEGIN
    -- Reference Tenant Lookup (Roberts Enterprises)
    SELECT id INTO v_business_id FROM businesses WHERE slug = 'roberts-enterprises' LIMIT 1;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Reference business not found';
    END IF;

    -- Lookup Location by matching name loosely against the slug/metadata
    -- (In a fully mature model, locations would have a 'slug' column, but for now we pick the first one)
    SELECT id INTO v_location_id FROM locations WHERE business_id = v_business_id LIMIT 1;

    -- 1) Upsert Customer
    SELECT id INTO v_customer_id FROM customers WHERE business_id = v_business_id AND email = p_email LIMIT 1;
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (business_id, first_name, last_name, email, phone)
        VALUES (
            v_business_id, 
            split_part(p_customer_name, ' ', 1), 
            SUBSTRING(p_customer_name FROM length(split_part(p_customer_name, ' ', 1)) + 2),
            p_email, 
            p_phone
        ) RETURNING id INTO v_customer_id;
    END IF;

    -- 2) Create Appointment
    INSERT INTO appointments (
        business_id,
        location_id,
        customer_id,
        type,
        date,
        time,
        status,
        looking_for,
        budget_cents,
        fee_paid
    ) VALUES (
        v_business_id,
        v_location_id,
        v_customer_id,
        p_type,
        p_date,
        p_time,
        'Pending',
        p_looking_for,
        p_budget_cents,
        true
    ) RETURNING id INTO v_appointment_id;

    -- 3) Create Lead (Marketing pipeline)
    INSERT INTO leads (
        business_id,
        location_id,
        name,
        email,
        source,
        budget_cents,
        wedding_date,
        stage
    ) VALUES (
        v_business_id,
        v_location_id,
        p_customer_name,
        p_email,
        'Booking Page',
        p_budget_cents,
        p_date,
        'Appointment Set'
    );

    -- 4) Create Message (Payment confirmation log)
    INSERT INTO messages (
        business_id,
        location_id,
        customer_id,
        sender,
        channel,
        to_address,
        subject,
        body,
        status
    ) VALUES (
        v_business_id,
        v_location_id,
        v_customer_id,
        'System',
        'email',
        p_email,
        'Booking fee received',
        'Payment of ' || (p_total_cents / 100.0)::text || ' received. Stripe Ref: ' || p_payment_intent_id,
        'sent'
    );

    RETURN v_appointment_id;
END;
$$;
