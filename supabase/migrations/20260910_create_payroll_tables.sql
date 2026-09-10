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
