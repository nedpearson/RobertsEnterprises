-- Drop existing tables to recreate them with the exact schema needed for workforceStore generic mapping
DROP TABLE IF EXISTS official_payroll_periods CASCADE;
DROP TABLE IF EXISTS time_entry_corrections CASCADE;
DROP TABLE IF EXISTS time_entry_segments CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS workforce_audit_logs CASCADE;
DROP TABLE IF EXISTS employee_bonuses CASCADE;
DROP TABLE IF EXISTS employee_reimbursements CASCADE;
DROP TABLE IF EXISTS employee_deductions CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS leave_policies CASCADE;
DROP TABLE IF EXISTS compensation_profiles CASCADE;
DROP TABLE IF EXISTS workforce_job_titles CASCADE;
DROP TABLE IF EXISTS workforce_departments CASCADE;

CREATE TABLE workforce_departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    name text NOT NULL,
    manager_name text,
    locations text[],
    cost_center text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE workforce_job_titles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    name text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE compensation_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    employee_name text,
    type text NOT NULL,
    pay_frequency text,
    hourly_rate numeric,
    salary_amount numeric,
    commission_rate numeric,
    draw_amount numeric,
    effective_date date NOT NULL,
    reason text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE leave_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    name text NOT NULL,
    accrual_rate numeric NOT NULL,
    max_balance numeric,
    carryover_limit numeric,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE leave_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    employee_name text,
    policy_id uuid REFERENCES leave_policies(id) ON DELETE CASCADE,
    policy_name text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    hours numeric NOT NULL,
    status text DEFAULT 'pending',
    reason text,
    approved_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE leave_balances (
    employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    policy_id uuid REFERENCES leave_policies(id) ON DELETE CASCADE,
    balance_hours numeric NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (employee_id, policy_id)
);

CREATE TABLE employee_deductions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    employee_name text,
    code text NOT NULL,
    type text NOT NULL,
    amount_cents integer NOT NULL,
    fixed boolean DEFAULT true,
    percent_value numeric,
    goal_amount integer,
    remaining_balance integer,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE employee_reimbursements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    employee_name text,
    location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
    date date NOT NULL,
    category text NOT NULL,
    amount_cents integer NOT NULL,
    purpose text NOT NULL,
    receipt_url text,
    status text DEFAULT 'pending',
    approved_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE official_payroll_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    pay_date date NOT NULL,
    pay_frequency text NOT NULL,
    status text DEFAULT 'draft',
    eligible_pay_groups text[],
    total_gross_cents integer,
    total_net_cents integer,
    total_employer_cost_cents integer,
    employee_count integer,
    created_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
    posted_at timestamptz,
    provider_status text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE employee_bonuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    employee_name text,
    location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
    type text NOT NULL,
    amount_cents integer NOT NULL,
    reason text NOT NULL,
    payroll_period_id uuid REFERENCES official_payroll_periods(id) ON DELETE SET NULL,
    status text DEFAULT 'pending',
    requested_by text,
    approved_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE workforce_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp timestamptz NOT NULL,
    actor_name text NOT NULL,
    action text NOT NULL,
    details text NOT NULL,
    ip_address text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE time_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    employee_name text,
    clock_in timestamptz NOT NULL,
    clock_out timestamptz,
    original_location_id text,
    status text DEFAULT 'active',
    source text DEFAULT 'web',
    approved boolean DEFAULT false,
    approved_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE time_entry_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    time_entry_id uuid REFERENCES time_entries(id) ON DELETE CASCADE,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
    location_id text,
    department_id text,
    start_at timestamptz NOT NULL,
    end_at timestamptz,
    paid_minutes integer NOT NULL DEFAULT 0,
    unpaid_minutes integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE time_entry_corrections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    time_entry_id uuid REFERENCES time_entries(id) ON DELETE CASCADE,
    requested_by text NOT NULL,
    requested_at timestamptz NOT NULL,
    type text NOT NULL,
    proposed_clock_in timestamptz,
    proposed_clock_out timestamptz,
    proposed_location_id text,
    reason text NOT NULL,
    status text DEFAULT 'pending',
    resolved_by text,
    resolved_at timestamptz,
    created_at timestamptz DEFAULT now()
);
