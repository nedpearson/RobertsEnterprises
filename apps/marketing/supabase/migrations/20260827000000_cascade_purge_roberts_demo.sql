-- ==============================================================================
-- FINAL CASCADE PURGE OF "ROBERTS ENTERPRISES (DEMO)"
-- ==============================================================================

DO $$
DECLARE
    v_demo_id UUID := 'b0000000-0000-0000-0000-000000000000';
BEGIN
    -- 1. Purge all Appointments and their relations for this business
    DELETE FROM appointment_notes WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id = v_demo_id);
    DELETE FROM appointment_audit_events WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id = v_demo_id);
    DELETE FROM appointments WHERE business_id = v_demo_id;
    DELETE FROM appointment_services WHERE business_id = v_demo_id;

    -- 2. Purge all Customers and their relations
    DELETE FROM customer_notes WHERE customer_id IN (SELECT id FROM customers WHERE business_id = v_demo_id);
    DELETE FROM customer_preferences WHERE customer_id IN (SELECT id FROM customers WHERE business_id = v_demo_id);
    DELETE FROM customer_external_identities WHERE customer_id IN (SELECT id FROM customers WHERE business_id = v_demo_id);
    DELETE FROM form_submissions WHERE customer_id IN (SELECT id FROM customers WHERE business_id = v_demo_id);
    DELETE FROM communications WHERE customer_id IN (SELECT id FROM customers WHERE business_id = v_demo_id);
    DELETE FROM customers WHERE business_id = v_demo_id;

    -- 3. Purge all Tasks and reminders
    DELETE FROM task_assignments WHERE task_id IN (SELECT id FROM tasks WHERE business_id = v_demo_id);
    DELETE FROM tasks WHERE business_id = v_demo_id;

    -- 4. Purge Sales/Commerce Data
    DELETE FROM orders WHERE business_id = v_demo_id;
    DELETE FROM payments WHERE business_id = v_demo_id;
    DELETE FROM invoices WHERE business_id = v_demo_id;

    -- 5. Purge Inventory Data
    DELETE FROM products WHERE business_id = v_demo_id;
    DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE business_id = v_demo_id);
    DELETE FROM collections WHERE business_id = v_demo_id;

    -- 6. Purge Settings and Audit Logs
    DELETE FROM settings_values WHERE business_id = v_demo_id;
    DELETE FROM audit_logs WHERE business_id = v_demo_id;

    -- 7. Purge Location Data
    DELETE FROM location_permissions WHERE location_id IN (SELECT id FROM locations WHERE business_id = v_demo_id);
    DELETE FROM rooms WHERE location_id IN (SELECT id FROM locations WHERE business_id = v_demo_id);
    DELETE FROM locations WHERE business_id = v_demo_id;

    -- 8. Purge Memberships and Subscriptions
    DELETE FROM business_memberships WHERE business_id = v_demo_id;
    DELETE FROM organization_subscriptions WHERE business_id = v_demo_id;
    DELETE FROM organization_feature_overrides WHERE business_id = v_demo_id;

    -- 9. Delete the Demo Business (Organization)
    DELETE FROM businesses WHERE id = v_demo_id;

    RAISE NOTICE 'Successfully purged Roberts Enterprises (Demo) and all child records.';
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to purge demo data: %', SQLERRM;
END $$;
