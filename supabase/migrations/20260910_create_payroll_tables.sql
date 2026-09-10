-- Create strict relational payroll tables mapped to business and locations
-- This ensures payroll data is perfectly isolated and accurate for multi-brand reporting

CREATE TABLE IF NOT EXISTS workforce_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  manager_name text,
  cost_center text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workforce_job_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compensation_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  pay_type text NOT NULL,
  pay_frequency text,
  hourly_rate_cents integer DEFAULT 0,
  salary_amount_cents integer DEFAULT 0,
  commission_rate numeric DEFAULT 0,
  draw_amount_cents integer DEFAULT 0,
  effective_date date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  accrual_rate numeric DEFAULT 0,
  max_balance_hours numeric DEFAULT 0,
  carryover_limit_hours numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES leave_policies(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  hours numeric NOT NULL,
  status text DEFAULT 'pending',
  reason text,
  manager_note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  department_id uuid REFERENCES workforce_departments(id) ON DELETE SET NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS official_payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  run_date date NOT NULL,
  status text DEFAULT 'draft',
  total_gross_cents integer DEFAULT 0,
  total_net_cents integer DEFAULT 0,
  total_taxes_cents integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS leave_balances (
  employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES leave_policies(id) ON DELETE CASCADE,
  balance_hours numeric DEFAULT 0,
  PRIMARY KEY (employee_id, policy_id)
);

CREATE TABLE IF NOT EXISTS employee_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  type text NOT NULL,
  amount_cents integer DEFAULT 0,
  fixed boolean DEFAULT true,
  percent_value numeric,
  goal_amount integer,
  remaining_balance integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_reimbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  date date NOT NULL,
  category text NOT NULL,
  amount_cents integer DEFAULT 0,
  purpose text,
  receipt_url text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount_cents integer DEFAULT 0,
  reason text,
  payroll_period_id uuid REFERENCES official_payroll_periods(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  requested_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workforce_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  actor_name text,
  action text,
  details text,
  ip_address text
);

CREATE TABLE IF NOT EXISTS time_entry_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid REFERENCES time_entries(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES staff_profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  department_id uuid REFERENCES workforce_departments(id) ON DELETE SET NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  paid_minutes integer DEFAULT 0,
  unpaid_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entry_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid REFERENCES time_entries(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  requested_at timestamptz DEFAULT now(),
  type text NOT NULL,
  proposed_clock_in timestamptz,
  proposed_clock_out timestamptz,
  proposed_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  reason text,
  status text DEFAULT 'pending',
  resolved_by uuid REFERENCES staff_profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
