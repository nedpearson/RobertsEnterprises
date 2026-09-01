-- Payroll correctness guards layered on the operational ledger.

ALTER TABLE public.payroll_adjustments
  DROP CONSTRAINT IF EXISTS payroll_adjustment_tax_treatment_matches_type;
ALTER TABLE public.payroll_adjustments
  ADD CONSTRAINT payroll_adjustment_tax_treatment_matches_type
  CHECK (
    (adjustment_type IN ('BONUS','COMMISSION') AND tax_treatment = 'TAXABLE')
    OR (adjustment_type = 'REIMBURSEMENT' AND tax_treatment = 'NON_TAXABLE')
    OR (adjustment_type = 'DEDUCTION' AND tax_treatment IN ('PRE_TAX','AFTER_TAX'))
  );

-- The application currently snapshots one compensation profile per employee
-- payroll line. Never let a rate change inside the source data be silently
-- flattened into that one profile. Hourly entries/adjustments must all fall
-- within the snapshotted profile's effective dates; salary profiles must cover
-- the entire payroll period because prorating policy is employer-specific.
CREATE OR REPLACE FUNCTION public.validate_payroll_line_compensation_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_profile public.payroll_compensation_profiles%ROWTYPE;
  v_period public.payroll_periods%ROWTYPE;
BEGIN
  BEGIN
    v_profile_id := NULLIF(NEW.calculation_snapshot->>'compensation_profile_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'payroll line has an invalid compensation profile snapshot';
  END;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'payroll line requires a compensation profile snapshot';
  END IF;

  SELECT * INTO v_profile
  FROM public.payroll_compensation_profiles
  WHERE id = v_profile_id
    AND business_id = NEW.business_id
    AND employee_id = NEW.employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payroll compensation snapshot does not belong to employee/business';
  END IF;

  SELECT * INTO v_period
  FROM public.payroll_periods
  WHERE id = NEW.payroll_period_id AND business_id = NEW.business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'payroll period not found for line'; END IF;

  IF v_profile.compensation_type IN ('SALARY','SALARY_PLUS_COMMISSION')
     AND (
       v_profile.effective_from > v_period.start_date
       OR (v_profile.effective_to IS NOT NULL AND v_profile.effective_to < v_period.end_date)
     ) THEN
    RAISE EXCEPTION 'salary compensation changes inside payroll period; split the payroll period or configure an explicit proration policy';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.time_entries t
    WHERE t.id = ANY(NEW.source_time_entry_ids)
      AND (
        t.business_id <> NEW.business_id
        OR t.user_id IS DISTINCT FROM NEW.employee_id
        OR t.clock_in::date < v_profile.effective_from
        OR (v_profile.effective_to IS NOT NULL AND t.clock_in::date > v_profile.effective_to)
      )
  ) THEN
    RAISE EXCEPTION 'time entry crosses the selected compensation profile effective range; split payroll at the compensation change';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payroll_adjustments a
    WHERE a.id = ANY(NEW.source_adjustment_ids)
      AND (
        a.business_id <> NEW.business_id
        OR a.employee_id <> NEW.employee_id
        OR a.occurred_on < v_profile.effective_from
        OR (v_profile.effective_to IS NOT NULL AND a.occurred_on > v_profile.effective_to)
      )
  ) THEN
    RAISE EXCEPTION 'payroll adjustment crosses the selected compensation profile effective range; split payroll at the compensation change';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payroll_line_compensation_snapshot ON public.payroll_period_lines;
CREATE TRIGGER trg_validate_payroll_line_compensation_snapshot
BEFORE INSERT OR UPDATE OF employee_id, source_time_entry_ids, source_adjustment_ids, calculation_snapshot
ON public.payroll_period_lines
FOR EACH ROW EXECUTE FUNCTION public.validate_payroll_line_compensation_snapshot();
