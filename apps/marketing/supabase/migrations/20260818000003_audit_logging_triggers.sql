-- 20260818000003_audit_logging_triggers.sql
-- Enforces universal audit logging for critical canonical tables

-- Ensure audit_logs has the correct tenant boundary column if missing
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION process_audit_log() RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_business_id uuid;
BEGIN
    -- Extract user if executed via authenticated Supabase request
    v_user_id := auth.uid();
    
    -- Attempt to extract business_id from the modified record
    BEGIN
        IF TG_OP = 'DELETE' THEN
            v_business_id := OLD.business_id;
        ELSE
            v_business_id := NEW.business_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_business_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (entity_type, entity_id, business_id, action, user_id, after_value, reason)
        VALUES (TG_TABLE_NAME, NEW.id, v_business_id, 'INSERT', v_user_id, row_to_json(NEW)::jsonb, 'System Audit Trigger');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (entity_type, entity_id, business_id, action, user_id, before_value, after_value, reason)
        VALUES (TG_TABLE_NAME, NEW.id, v_business_id, 'UPDATE', v_user_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, 'System Audit Trigger');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (entity_type, entity_id, business_id, action, user_id, before_value, reason)
        VALUES (TG_TABLE_NAME, OLD.id, v_business_id, 'DELETE', v_user_id, row_to_json(OLD)::jsonb, 'System Audit Trigger');
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to canonical ledgers
DROP TRIGGER IF EXISTS audit_appointments_trigger ON appointments;
CREATE TRIGGER audit_appointments_trigger
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS audit_orders_trigger ON orders;
CREATE TRIGGER audit_orders_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS audit_invoices_trigger ON invoices;
CREATE TRIGGER audit_invoices_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS audit_customers_trigger ON customers;
CREATE TRIGGER audit_customers_trigger
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION process_audit_log();
