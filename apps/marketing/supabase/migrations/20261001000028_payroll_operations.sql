-- Authoritative payroll operations.
-- Payroll money, approvals, and period snapshots no longer live in settings JSON.
-- Gross wages are derived from the real time_entries ledger; statutory tax/net
-- amounts remain unresolved until a verified payroll provider supplies them.

CREATE TABLE IF NOT EXISTS public.payroll_configuration (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  workweek_start smallint NOT NULL DEFAULT 0 CHECK (workweek_start BETWEEN 0 AND 6),
  overtime_threshold_minutes integer NOT NULL DEFAULT 2400 CHECK (overtime_threshold_minutes BETWEEN 60 AND 10080),
  overtime_multiplier numeric(6,3) NOT NULL DEFAULT 1.500 CHECK (overtime_multiplier >= 1 AND overtime_multiplier <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.payroll_compensation_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  compensation_type text NOT NULL CHECK (compensation_type IN ('HOURLY','SALARY','HOURLY_PLUS_COMMISSION','SALARY_PLUS_COMMISSION')),
  pay_frequency text NOT NULL DEFAULT 'SEMIMONTHLY' CHECK (pay_frequency IN ('WEEKLY','BIWEEKLY','SEMIMONTHLY','MONTHLY')),
  hourly_rate_cents bigint NOT NULL DEFAULT 0 CHECK (hourly_rate_cents >= 0),
  annual_salary_cents bigint NOT NULL DEFAULT 0 CHECK (annual_salary_cents >= 0),
  commission_rate_bps integer NOT NULL DEFAULT 0 CHECK (commission_rate_bps BETWEEN 0 AND 10000),
  draw_amount_cents bigint NOT NULL DEFAULT 0 CHECK (draw_amount_cents >= 0),
  effective_from date NOT NULL,
  effective_to date,
  reason text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payroll_compensation_effective_range CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT payroll_compensation_amount_matches_type CHECK (
    (compensation_type IN ('HOURLY','HOURLY_PLUS_COMMISSION') AND hourly_rate_cents > 0)
    OR
    (compensation_type IN ('SALARY','SALARY_PLUS_COMMISSION') AND annual_salary_cents > 0)
  ),
  CONSTRAINT uq_payroll_compensation_version UNIQUE (business_id, employee_id, effective_from)
);
CREATE INDEX IF NOT EXISTS idx_payroll_compensation_employee_effective
  ON public.payroll_compensation_profiles(business_id, employee_id, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_compensation_open_profile
  ON public.payroll_compensation_profiles(business_id, employee_id)
  WHERE effective_to IS NULL AND is_active = true;

CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  pay_date date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEWING','APPROVED','POSTED','PROVIDER_SUBMITTED','RECONCILED','FAILED','VOIDED')),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_at timestamptz,
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_state_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_gross_cents bigint NOT NULL DEFAULT 0 CHECK (total_gross_cents >= 0),
  total_reimbursements_cents bigint NOT NULL DEFAULT 0 CHECK (total_reimbursements_cents >= 0),
  total_known_deductions_cents bigint NOT NULL DEFAULT 0 CHECK (total_known_deductions_cents >= 0),
  total_tax_cents bigint,
  total_net_cents bigint,
  employee_count integer NOT NULL DEFAULT 0 CHECK (employee_count >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payroll_period_date_range CHECK (end_date >= start_date),
  CONSTRAINT payroll_period_net_requires_tax CHECK (total_net_cents IS NULL OR total_tax_cents IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_business_dates
  ON public.payroll_periods(business_id, start_date DESC, end_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_period_active_range
  ON public.payroll_periods(business_id, start_date, end_date)
  WHERE status <> 'VOIDED';

CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  payroll_period_id uuid REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('BONUS','COMMISSION','REIMBURSEMENT','DEDUCTION')),
  tax_treatment text NOT NULL CHECK (tax_treatment IN ('TAXABLE','NON_TAXABLE','PRE_TAX','AFTER_TAX')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  occurred_on date NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','LOCKED','APPLIED')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_business_employee_date
  ON public.payroll_adjustments(business_id, employee_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_period
  ON public.payroll_adjustments(payroll_period_id);

CREATE TABLE IF NOT EXISTS public.payroll_period_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  employee_name text NOT NULL,
  compensation_type text NOT NULL,
  hourly_rate_cents bigint NOT NULL DEFAULT 0 CHECK (hourly_rate_cents >= 0),
  annual_salary_cents bigint NOT NULL DEFAULT 0 CHECK (annual_salary_cents >= 0),
  regular_minutes integer NOT NULL DEFAULT 0 CHECK (regular_minutes >= 0),
  overtime_minutes integer NOT NULL DEFAULT 0 CHECK (overtime_minutes >= 0),
  regular_pay_cents bigint NOT NULL DEFAULT 0 CHECK (regular_pay_cents >= 0),
  overtime_pay_cents bigint NOT NULL DEFAULT 0 CHECK (overtime_pay_cents >= 0),
  bonus_cents bigint NOT NULL DEFAULT 0 CHECK (bonus_cents >= 0),
  commission_cents bigint NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  reimbursement_cents bigint NOT NULL DEFAULT 0 CHECK (reimbursement_cents >= 0),
  pre_tax_deduction_cents bigint NOT NULL DEFAULT 0 CHECK (pre_tax_deduction_cents >= 0),
  after_tax_deduction_cents bigint NOT NULL DEFAULT 0 CHECK (after_tax_deduction_cents >= 0),
  gross_pay_cents bigint NOT NULL DEFAULT 0 CHECK (gross_pay_cents >= 0),
  taxable_gross_cents bigint NOT NULL DEFAULT 0 CHECK (taxable_gross_cents >= 0),
  tax_cents bigint,
  net_pay_cents bigint,
  tax_status text NOT NULL DEFAULT 'PROVIDER_NOT_CONNECTED' CHECK (tax_status IN ('PROVIDER_NOT_CONNECTED','PENDING_PROVIDER','FINAL','ERROR')),
  source_time_entry_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  source_adjustment_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  calculation_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_payroll_period_employee UNIQUE (payroll_period_id, employee_id),
  CONSTRAINT payroll_line_net_requires_tax CHECK (net_pay_cents IS NULL OR tax_cents IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_payroll_period_lines_business_period
  ON public.payroll_period_lines(business_id, payroll_period_id);

CREATE TABLE IF NOT EXISTS public.payroll_time_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  time_entry_id uuid NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  correction_type text NOT NULL CHECK (correction_type IN ('MISSED_IN','MISSED_OUT','WRONG_TIME','WRONG_LOCATION','OTHER')),
  proposed_clock_in timestamptz,
  proposed_clock_out timestamptz,
  proposed_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_payroll_time_corrections_business_status
  ON public.payroll_time_corrections(business_id, status, requested_at DESC);

CREATE TABLE IF NOT EXISTS public.payroll_provider_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  provider_connection_id uuid REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  provider text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('VALIDATE','TAX_CALCULATE','SUBMIT','RECONCILE','EXPORT')),
  status text NOT NULL CHECK (status IN ('PENDING','SUCCEEDED','FAILED','ACTION_REQUIRED')),
  provider_reference text,
  request_fingerprint text,
  error_code text,
  error_message text,
  response_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_payroll_provider_submissions_period
  ON public.payroll_provider_submissions(business_id, payroll_period_id, created_at DESC);

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS payroll_period_id uuid REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payroll_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS payroll_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_payroll_period ON public.time_entries(payroll_period_id);

-- Payroll is deliberately API-write-only. Managers may inspect via authenticated
-- database sessions, but mutation invariants are enforced only by the worker's
-- service-role routes / SECURITY DEFINER functions below.
ALTER TABLE public.payroll_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_compensation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_period_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_time_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_provider_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers read payroll configuration" ON public.payroll_configuration;
CREATE POLICY "Managers read payroll configuration" ON public.payroll_configuration FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));
DROP POLICY IF EXISTS "Managers read payroll compensation" ON public.payroll_compensation_profiles;
CREATE POLICY "Managers read payroll compensation" ON public.payroll_compensation_profiles FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));
DROP POLICY IF EXISTS "Managers read payroll periods" ON public.payroll_periods;
CREATE POLICY "Managers read payroll periods" ON public.payroll_periods FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));
DROP POLICY IF EXISTS "Managers read payroll adjustments" ON public.payroll_adjustments;
CREATE POLICY "Managers read payroll adjustments" ON public.payroll_adjustments FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));
DROP POLICY IF EXISTS "Managers read payroll period lines" ON public.payroll_period_lines;
CREATE POLICY "Managers read payroll period lines" ON public.payroll_period_lines FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));
DROP POLICY IF EXISTS "Managers read payroll corrections" ON public.payroll_time_corrections;
CREATE POLICY "Managers read payroll corrections" ON public.payroll_time_corrections FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));
DROP POLICY IF EXISTS "Managers read payroll provider submissions" ON public.payroll_provider_submissions;
CREATE POLICY "Managers read payroll provider submissions" ON public.payroll_provider_submissions FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));

CREATE OR REPLACE FUNCTION public.create_payroll_draft_server(
  p_business_id uuid,
  p_created_by uuid,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_pay_date date,
  p_provider_state jsonb,
  p_lines jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_id uuid;
  v_line jsonb;
  v_source_entries uuid[];
  v_source_adjustments uuid[];
BEGIN
  IF p_business_id IS NULL OR p_created_by IS NULL THEN RAISE EXCEPTION 'business and actor are required'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN RAISE EXCEPTION 'invalid payroll period dates'; END IF;
  IF p_pay_date IS NULL THEN RAISE EXCEPTION 'pay date is required'; END IF;
  IF COALESCE(jsonb_typeof(p_lines), '') <> 'array' THEN RAISE EXCEPTION 'payroll lines must be an array'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || p_start_date::text || ':' || p_end_date::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.payroll_periods
    WHERE business_id = p_business_id AND start_date = p_start_date AND end_date = p_end_date AND status <> 'VOIDED'
  ) THEN RAISE EXCEPTION 'an active payroll period already exists for this date range'; END IF;

  INSERT INTO public.payroll_periods (
    business_id, name, start_date, end_date, pay_date, status,
    provider_state_snapshot, created_by, calculated_at
  ) VALUES (
    p_business_id, BTRIM(p_name), p_start_date, p_end_date, p_pay_date, 'DRAFT',
    COALESCE(p_provider_state, '{}'::jsonb), p_created_by, now()
  ) RETURNING id INTO v_period_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_source_entries := ARRAY(
      SELECT value::uuid FROM jsonb_array_elements_text(COALESCE(v_line->'source_time_entry_ids', '[]'::jsonb))
    );
    v_source_adjustments := ARRAY(
      SELECT value::uuid FROM jsonb_array_elements_text(COALESCE(v_line->'source_adjustment_ids', '[]'::jsonb))
    );

    INSERT INTO public.payroll_period_lines (
      business_id, payroll_period_id, employee_id, employee_name, compensation_type,
      hourly_rate_cents, annual_salary_cents, regular_minutes, overtime_minutes,
      regular_pay_cents, overtime_pay_cents, bonus_cents, commission_cents,
      reimbursement_cents, pre_tax_deduction_cents, after_tax_deduction_cents,
      gross_pay_cents, taxable_gross_cents, tax_cents, net_pay_cents, tax_status,
      source_time_entry_ids, source_adjustment_ids, calculation_snapshot
    ) VALUES (
      p_business_id, v_period_id, (v_line->>'employee_id')::uuid, v_line->>'employee_name', v_line->>'compensation_type',
      COALESCE((v_line->>'hourly_rate_cents')::bigint,0), COALESCE((v_line->>'annual_salary_cents')::bigint,0),
      COALESCE((v_line->>'regular_minutes')::integer,0), COALESCE((v_line->>'overtime_minutes')::integer,0),
      COALESCE((v_line->>'regular_pay_cents')::bigint,0), COALESCE((v_line->>'overtime_pay_cents')::bigint,0),
      COALESCE((v_line->>'bonus_cents')::bigint,0), COALESCE((v_line->>'commission_cents')::bigint,0),
      COALESCE((v_line->>'reimbursement_cents')::bigint,0), COALESCE((v_line->>'pre_tax_deduction_cents')::bigint,0),
      COALESCE((v_line->>'after_tax_deduction_cents')::bigint,0), COALESCE((v_line->>'gross_pay_cents')::bigint,0),
      COALESCE((v_line->>'taxable_gross_cents')::bigint,0),
      CASE WHEN v_line->>'tax_cents' IS NULL THEN NULL ELSE (v_line->>'tax_cents')::bigint END,
      CASE WHEN v_line->>'net_pay_cents' IS NULL THEN NULL ELSE (v_line->>'net_pay_cents')::bigint END,
      COALESCE(v_line->>'tax_status','PROVIDER_NOT_CONNECTED'),
      COALESCE(v_source_entries, '{}'::uuid[]), COALESCE(v_source_adjustments, '{}'::uuid[]),
      COALESCE(v_line->'calculation_snapshot','{}'::jsonb)
    );
  END LOOP;

  UPDATE public.payroll_periods p
  SET total_gross_cents = x.total_gross,
      total_reimbursements_cents = x.total_reimbursements,
      total_known_deductions_cents = x.total_deductions,
      total_tax_cents = x.total_tax,
      total_net_cents = x.total_net,
      employee_count = x.employee_count,
      updated_at = now()
  FROM (
    SELECT payroll_period_id,
      COALESCE(SUM(gross_pay_cents),0)::bigint AS total_gross,
      COALESCE(SUM(reimbursement_cents),0)::bigint AS total_reimbursements,
      COALESCE(SUM(pre_tax_deduction_cents + after_tax_deduction_cents),0)::bigint AS total_deductions,
      CASE WHEN BOOL_AND(tax_cents IS NOT NULL) THEN COALESCE(SUM(tax_cents),0)::bigint ELSE NULL END AS total_tax,
      CASE WHEN BOOL_AND(net_pay_cents IS NOT NULL) THEN COALESCE(SUM(net_pay_cents),0)::bigint ELSE NULL END AS total_net,
      COUNT(*)::integer AS employee_count
    FROM public.payroll_period_lines WHERE payroll_period_id = v_period_id GROUP BY payroll_period_id
  ) x
  WHERE p.id = x.payroll_period_id;

  RETURN v_period_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_payroll_draft_server(uuid,uuid,text,date,date,date,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payroll_draft_server(uuid,uuid,text,date,date,date,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.approve_payroll_period_server(
  p_business_id uuid,
  p_period_id uuid,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.payroll_periods%ROWTYPE;
BEGIN
  SELECT * INTO v_period FROM public.payroll_periods
  WHERE id = p_period_id AND business_id = p_business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payroll period not found'; END IF;
  IF v_period.status NOT IN ('DRAFT','REVIEWING') THEN RAISE EXCEPTION 'only draft or reviewing payroll can be approved'; END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payroll_period_lines l
    JOIN public.time_entries t ON t.id = ANY(l.source_time_entry_ids)
    WHERE l.payroll_period_id = p_period_id
      AND (t.business_id <> p_business_id OR t.clock_out IS NULL OR t.updated_at > v_period.calculated_at)
  ) THEN RAISE EXCEPTION 'time entries changed after payroll calculation; regenerate the draft'; END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payroll_period_lines l
    JOIN public.time_entries t ON t.id = ANY(l.source_time_entry_ids)
    WHERE l.payroll_period_id = p_period_id
      AND t.payroll_period_id IS NOT NULL AND t.payroll_period_id <> p_period_id
  ) THEN RAISE EXCEPTION 'one or more time entries are already locked to another payroll period'; END IF;

  UPDATE public.time_entries t
  SET payroll_period_id = p_period_id, payroll_approved_at = now(), payroll_approved_by = p_actor_id, updated_at = now()
  WHERE t.business_id = p_business_id
    AND t.id IN (
      SELECT DISTINCT unnest(l.source_time_entry_ids)
      FROM public.payroll_period_lines l WHERE l.payroll_period_id = p_period_id
    );

  UPDATE public.payroll_adjustments a
  SET payroll_period_id = p_period_id, status = 'LOCKED', updated_at = now()
  WHERE a.business_id = p_business_id
    AND a.status = 'APPROVED'
    AND a.id IN (
      SELECT DISTINCT unnest(l.source_adjustment_ids)
      FROM public.payroll_period_lines l WHERE l.payroll_period_id = p_period_id
    );

  UPDATE public.payroll_periods
  SET status = 'APPROVED', approved_at = now(), approved_by = p_actor_id, updated_at = now()
  WHERE id = p_period_id
  RETURNING * INTO v_period;

  RETURN to_jsonb(v_period);
END;
$$;
REVOKE ALL ON FUNCTION public.approve_payroll_period_server(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_payroll_period_server(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.post_payroll_period_server(
  p_business_id uuid,
  p_period_id uuid,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.payroll_periods%ROWTYPE;
BEGIN
  SELECT * INTO v_period FROM public.payroll_periods
  WHERE id = p_period_id AND business_id = p_business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payroll period not found'; END IF;
  IF v_period.status <> 'APPROVED' THEN RAISE EXCEPTION 'payroll period must be approved before posting'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.payroll_period_lines
    WHERE payroll_period_id = p_period_id AND (tax_status <> 'FINAL' OR tax_cents IS NULL OR net_pay_cents IS NULL)
  ) THEN RAISE EXCEPTION 'provider-final tax and net-pay results are required before payroll can be posted'; END IF;

  UPDATE public.payroll_adjustments
  SET status = 'APPLIED', updated_at = now()
  WHERE business_id = p_business_id AND payroll_period_id = p_period_id AND status = 'LOCKED';

  UPDATE public.payroll_periods
  SET status = 'POSTED', posted_at = now(), posted_by = p_actor_id, updated_at = now()
  WHERE id = p_period_id
  RETURNING * INTO v_period;

  RETURN to_jsonb(v_period);
END;
$$;
REVOKE ALL ON FUNCTION public.post_payroll_period_server(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_payroll_period_server(uuid,uuid,uuid) TO service_role;
