-- 20260804000002_intelligent_scheduling.sql

-- 1. Rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    room_type TEXT,
    capacity INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Appointment Services
CREATE TABLE appointment_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    setup_buffer_minutes INTEGER DEFAULT 0,
    cleanup_buffer_minutes INTEGER DEFAULT 0,
    required_role TEXT,
    required_room_type TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Employee Service Eligibility
CREATE TABLE employee_service_eligibility (
    employee_id UUID NOT NULL, -- references auth.users(id)
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES appointment_services(id) ON DELETE CASCADE,
    skill_level INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (employee_id, service_id)
);

-- 4. Employee Schedules
CREATE TABLE employee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    shift_date DATE NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    published_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Employee Schedule Breaks
CREATE TABLE employee_schedule_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES employee_schedules(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    break_type TEXT DEFAULT 'lunch'
);

-- 6. Appointment Requests
CREATE TABLE appointment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    preferred_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    intake_source TEXT,
    entered_by_user_id UUID,
    service_id UUID REFERENCES appointment_services(id) ON DELETE SET NULL,
    preferred_employee_id UUID,
    preferred_date_1 DATE,
    preferred_window_1 TEXT,
    preferred_date_2 DATE,
    preferred_window_2 TEXT,
    flexible_date BOOLEAN DEFAULT false,
    flexible_location BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'submitted',
    priority TEXT DEFAULT 'normal',
    notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Appointment Request Location Preferences
CREATE TABLE appointment_request_location_preferences (
    request_id UUID NOT NULL REFERENCES appointment_requests(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    preference_order INTEGER DEFAULT 1,
    PRIMARY KEY (request_id, location_id)
);

-- 8. Appointment Assignment Recommendations
CREATE TABLE appointment_assignment_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES appointment_requests(id) ON DELETE CASCADE,
    employee_id UUID,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    proposed_start_at TIMESTAMPTZ,
    proposed_end_at TIMESTAMPTZ,
    score INTEGER,
    score_breakdown_json JSONB,
    disqualification_reasons_json JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_metadata JSONB
);

-- 9. Appointment Holds
CREATE TABLE appointment_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES appointment_requests(id) ON DELETE CASCADE,
    employee_id UUID,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Alter existing Appointments table
ALTER TABLE appointments ADD COLUMN request_id UUID REFERENCES appointment_requests(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN employee_id UUID;
ALTER TABLE appointments ADD COLUMN service_id UUID REFERENCES appointment_services(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN start_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN end_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN confirmation_status TEXT;
ALTER TABLE appointments ADD COLUMN confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN confirmed_by UUID;
ALTER TABLE appointments ADD COLUMN intake_source TEXT;

-- Drop old columns we don't need from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS "type";
ALTER TABLE appointments DROP COLUMN IF EXISTS "date";
ALTER TABLE appointments DROP COLUMN IF EXISTS "time";
ALTER TABLE appointments DROP COLUMN IF EXISTS "stylist";
ALTER TABLE appointments DROP COLUMN IF EXISTS "looking_for";
ALTER TABLE appointments DROP COLUMN IF EXISTS "budget_cents";
ALTER TABLE appointments DROP COLUMN IF EXISTS "fee_paid";

-- 11. Employee Calendar Connections
CREATE TABLE employee_calendar_connections (
    employee_id UUID PRIMARY KEY,
    provider TEXT,
    encrypted_credential_reference TEXT,
    sync_mode TEXT,
    connection_status TEXT,
    last_synchronized TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Appointment Audit Events
CREATE TABLE appointment_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    request_id UUID REFERENCES appointment_requests(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    actor_user_id UUID,
    event_type TEXT NOT NULL,
    previous_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_service_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedule_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_request_location_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_assignment_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_audit_events ENABLE ROW LEVEL SECURITY;

-- Apply standard multi-tenant RLS Policies
CREATE POLICY "Enable all access for business members" ON rooms FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON appointment_services FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON employee_service_eligibility FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON employee_schedules FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON appointment_requests FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON appointment_holds FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON appointment_audit_events FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

-- RLS for dependent tables
CREATE POLICY "Enable all access for business members" ON employee_schedule_breaks FOR ALL USING (
  schedule_id IN (SELECT id FROM employee_schedules WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()))
);
CREATE POLICY "Enable all access for business members" ON appointment_request_location_preferences FOR ALL USING (
  request_id IN (SELECT id FROM appointment_requests WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()))
);
CREATE POLICY "Enable all access for business members" ON appointment_assignment_recommendations FOR ALL USING (
  request_id IN (SELECT id FROM appointment_requests WHERE business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()))
);

-- RLS for calendar connections (employees can only manage their own)
CREATE POLICY "Enable access to own calendar connection" ON employee_calendar_connections FOR ALL USING (employee_id = auth.uid());
