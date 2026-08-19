-- Synthetic Demo SMS Threads for Two-Way SMS

DO $$
DECLARE
    v_business_id UUID := 'b0000000-0000-0000-0000-000000000000';
    v_customer1_id UUID;
    v_customer2_id UUID;
BEGIN
    -- Enable sms_opt_in for some demo customers
    UPDATE customers SET sms_opt_in = true, phone = '+15550100001' WHERE name = 'Demo Bride 1' AND business_id = v_business_id;
    UPDATE customers SET sms_opt_in = true, phone = '+15550100002' WHERE name = 'Demo Bride 2' AND business_id = v_business_id;

    SELECT id INTO v_customer1_id FROM customers WHERE name = 'Demo Bride 1' AND business_id = v_business_id LIMIT 1;
    SELECT id INTO v_customer2_id FROM customers WHERE name = 'Demo Bride 2' AND business_id = v_business_id LIMIT 1;

    IF v_customer1_id IS NOT NULL THEN
        -- Thread 1
        INSERT INTO messages (business_id, customer_id, sender, content, channel, direction, status, created_at)
        VALUES 
        (v_business_id, v_customer1_id, 'Business', 'Hi there! We are so excited for your appointment tomorrow. Do you have any questions?', 'sms', 'outbound', 'sent', now() - interval '2 days'),
        (v_business_id, v_customer1_id, 'Customer', 'Thanks! Can I bring 4 guests instead of 3?', 'sms', 'inbound', 'received', now() - interval '1 day'),
        (v_business_id, v_customer1_id, 'Business', 'Absolutely, we will have extra champagne ready!', 'sms', 'outbound', 'sent', now() - interval '23 hours');
    END IF;

    IF v_customer2_id IS NOT NULL THEN
        -- Thread 2
        INSERT INTO messages (business_id, customer_id, sender, content, channel, direction, status, created_at)
        VALUES 
        (v_business_id, v_customer2_id, 'Business', 'Your alterations are complete and your dress is ready for pickup!', 'sms', 'outbound', 'sent', now() - interval '5 hours'),
        (v_business_id, v_customer2_id, 'Customer', 'Omg yay! I will be there tomorrow at 2pm.', 'sms', 'inbound', 'received', now() - interval '1 hour');
    END IF;
END $$;
