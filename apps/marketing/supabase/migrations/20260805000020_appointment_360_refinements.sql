-- 20260805000020_appointment_360_refinements.sql

-- 1. Customer Preferences
CREATE TABLE customer_preferences (
    customer_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    preferred_contact_method TEXT DEFAULT 'email',
    accessibility_needs TEXT,
    language TEXT DEFAULT 'en',
    communication_consent BOOLEAN DEFAULT true,
    sms_consent BOOLEAN DEFAULT false,
    email_consent BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Employee Time Off
CREATE TABLE employee_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL, -- auth.users(id)
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'denied'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Communication Recipients
CREATE TABLE communication_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL, -- 'to', 'cc', 'bcc'
    address TEXT NOT NULL,
    name TEXT
);

-- 4. Double Booking Prevention Triggers
-- Prevent double booking an employee
CREATE OR REPLACE FUNCTION check_employee_double_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_id IS NOT NULL AND NEW.start_at IS NOT NULL AND NEW.end_at IS NOT NULL AND NEW.status != 'Cancelled' THEN
        IF EXISTS (
            SELECT 1 FROM appointments
            WHERE employee_id = NEW.employee_id
              AND status != 'Cancelled'
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
              AND start_at < NEW.end_at
              AND end_at > NEW.start_at
        ) THEN
            RAISE EXCEPTION 'Double booking detected for employee %', NEW.employee_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_employee_no_double_booking
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION check_employee_double_booking();

-- Prevent double booking a room
CREATE OR REPLACE FUNCTION check_room_double_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.room_id IS NOT NULL AND NEW.start_at IS NOT NULL AND NEW.end_at IS NOT NULL AND NEW.status != 'Cancelled' THEN
        IF EXISTS (
            SELECT 1 FROM appointments
            WHERE room_id = NEW.room_id
              AND status != 'Cancelled'
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
              AND start_at < NEW.end_at
              AND end_at > NEW.start_at
        ) THEN
            RAISE EXCEPTION 'Double booking detected for room %', NEW.room_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_room_no_double_booking
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION check_room_double_booking();

-- Enable RLS for new tables
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for business members" ON customer_preferences FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON employee_time_off FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON communication_recipients FOR ALL USING (communication_id IN (SELECT id FROM communications WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())));
