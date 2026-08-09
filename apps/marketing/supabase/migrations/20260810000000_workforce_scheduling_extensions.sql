-- 20260810000000_workforce_scheduling_extensions.sql

-- 1. Extend employee_schedules
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'Regular';
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS shift_series_id UUID;
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS unpaid_break_minutes INTEGER DEFAULT 0;
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS paid_break_minutes INTEGER DEFAULT 0;

-- 2. Time Off Requests
CREATE TABLE IF NOT EXISTS time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    type TEXT NOT NULL, -- Vacation, Sick, Personal, Unavailable
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, denied
    notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Employee Availability
CREATE TABLE IF NOT EXISTS employee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, ..., 6=Sat
    is_available BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, day_of_week)
);

-- 4. Open Shifts
CREATE TABLE IF NOT EXISTS open_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    shift_type TEXT DEFAULT 'Regular',
    department TEXT,
    status TEXT DEFAULT 'open', -- open, claimed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Shift Swap Requests
CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES employee_schedules(id) ON DELETE CASCADE,
    requesting_employee_id UUID NOT NULL,
    covering_employee_id UUID,
    status TEXT DEFAULT 'pending', -- pending, offered, approved, denied
    manager_approval_required BOOLEAN DEFAULT true,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- Apply standard multi-tenant RLS Policies
CREATE POLICY "Enable all access for business members" ON time_off_requests FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON employee_availability FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON open_shifts FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON shift_swap_requests FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
