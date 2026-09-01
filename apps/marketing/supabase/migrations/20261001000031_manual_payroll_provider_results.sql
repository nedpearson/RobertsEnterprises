-- Real fallback for organizations whose payroll provider is not API-connected.
-- Managers may transcribe final tax/net results from an external payroll system,
-- but VowOS never estimates those numbers. The external provider reference and
-- submitted values are preserved in the provider-submission audit trail.

CREATE OR REPLACE FUNCTION public.apply_manual_payroll_provider_results_server(
  p_business_id uuid,
  p_period_id uuid,
  p_actor_id uuid,
  p_provider_reference text,
  p_evidence_note text,
  p_lines jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.payroll_periods%ROWTYPE;
  v_line public.payroll_period_lines%ROWTYPE;
  v_input jsonb;
  v_tax bigint;
  v_net bigint;
  v_expected_count integer;
  v_input_count integer;
  v_total_tax bigint;
  v_total_net bigint;
BEGIN
  IF p_business_id IS NULL OR p_period_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'business, payroll period, and actor are required';
  END IF;
  IF COALESCE(BTRIM(p_provider_reference), '') = '' THEN
    RAISE EXCEPTION 'external payroll provider reference is required';
  END IF;
  IF jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'manual provider lines must be an array';
  END IF;

  SELECT * INTO v_period
  FROM public.payroll_periods
  WHERE id = p_period_id AND business_id = p_business_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payroll period not found'; END IF;
  IF v_period.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'payroll must be approved before provider-final results can be applied';
  END IF;

  SELECT COUNT(*)::integer INTO v_expected_count
  FROM public.payroll_period_lines
  WHERE payroll_period_id = p_period_id AND business_id = p_business_id;
  SELECT jsonb_array_length(p_lines) INTO v_input_count;
  IF v_input_count <> v_expected_count THEN
    RAISE EXCEPTION 'provider results must include exactly one result for every payroll employee line';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_lines) x
    GROUP BY x->>'line_id'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate payroll line ids are not allowed in provider results';
  END IF;

  FOR v_line IN
    SELECT * FROM public.payroll_period_lines
    WHERE payroll_period_id = p_period_id AND business_id = p_business_id
    ORDER BY employee_id
    FOR UPDATE
  LOOP
    SELECT x INTO v_input
    FROM jsonb_array_elements(p_lines) x
    WHERE x->>'line_id' = v_line.id::text;
    IF v_input IS NULL THEN
      RAISE EXCEPTION 'provider results are missing payroll line %', v_line.id;
    END IF;

    BEGIN
      v_tax := (v_input->>'tax_cents')::bigint;
      v_net := (v_input->>'net_pay_cents')::bigint;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'tax and net pay must be whole cent amounts';
    END;

    IF v_tax < 0 OR v_net < 0 THEN
      RAISE EXCEPTION 'tax and net pay cannot be negative';
    END IF;
    IF v_tax > v_line.taxable_gross_cents THEN
      RAISE EXCEPTION 'tax cannot exceed taxable gross for employee %', v_line.employee_name;
    END IF;
    IF v_net > v_line.gross_pay_cents + v_line.reimbursement_cents THEN
      RAISE EXCEPTION 'net pay exceeds gross pay plus reimbursements for employee %', v_line.employee_name;
    END IF;

    UPDATE public.payroll_period_lines
    SET tax_cents = v_tax,
        net_pay_cents = v_net,
        tax_status = 'FINAL',
        calculation_snapshot = calculation_snapshot || jsonb_build_object(
          'tax_calculation', 'Verified external payroll provider result',
          'provider_reference', BTRIM(p_provider_reference),
          'provider_evidence_note', NULLIF(BTRIM(COALESCE(p_evidence_note, '')), '')
        ),
        updated_at = now()
    WHERE id = v_line.id;
  END LOOP;

  SELECT COALESCE(SUM(tax_cents),0)::bigint, COALESCE(SUM(net_pay_cents),0)::bigint
  INTO v_total_tax, v_total_net
  FROM public.payroll_period_lines
  WHERE payroll_period_id = p_period_id AND business_id = p_business_id;

  INSERT INTO public.payroll_provider_submissions (
    business_id, payroll_period_id, provider_connection_id, provider, operation,
    status, provider_reference, response_summary, attempted_by, created_at, completed_at
  ) VALUES (
    p_business_id, p_period_id, NULL, 'MANUAL_VERIFIED', 'TAX_CALCULATE',
    'SUCCEEDED', BTRIM(p_provider_reference),
    jsonb_build_object(
      'mode', 'MANUAL_VERIFIED',
      'evidence_note', NULLIF(BTRIM(COALESCE(p_evidence_note, '')), ''),
      'line_count', v_expected_count,
      'total_tax_cents', v_total_tax,
      'total_net_cents', v_total_net
    ),
    p_actor_id, now(), now()
  );

  UPDATE public.payroll_periods
  SET total_tax_cents = v_total_tax,
      total_net_cents = v_total_net,
      provider_state_snapshot = provider_state_snapshot || jsonb_build_object(
        'finalization_mode', 'MANUAL_VERIFIED',
        'provider_reference', BTRIM(p_provider_reference),
        'finalized_at', now(),
        'finalized_by', p_actor_id
      ),
      updated_at = now()
  WHERE id = p_period_id AND business_id = p_business_id
  RETURNING * INTO v_period;

  RETURN to_jsonb(v_period);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_manual_payroll_provider_results_server(uuid,uuid,uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_manual_payroll_provider_results_server(uuid,uuid,uuid,text,text,jsonb) TO service_role;
