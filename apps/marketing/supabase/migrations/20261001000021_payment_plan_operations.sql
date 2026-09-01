-- Atomic server-only operations for layaway/payment plans.

CREATE OR REPLACE FUNCTION public.create_payment_plan_server(
  p_business_id uuid,
  p_location_id uuid,
  p_customer_id uuid,
  p_invoice_id uuid,
  p_plan_type text,
  p_total_cents integer,
  p_down_payment_cents integer,
  p_installment_count integer,
  p_frequency text,
  p_start_date date,
  p_notes text,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.payment_plans%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_remaining integer;
  v_base integer;
  v_remainder integer;
  v_seq integer;
  v_due date;
  v_amount integer;
BEGIN
  IF p_business_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION 'business and customer are required';
  END IF;
  IF UPPER(COALESCE(p_plan_type, '')) NOT IN ('LAYAWAY','PAYMENT_PLAN') THEN
    RAISE EXCEPTION 'unsupported plan type';
  END IF;
  IF UPPER(COALESCE(p_frequency, '')) NOT IN ('WEEKLY','BIWEEKLY','MONTHLY','CUSTOM') THEN
    RAISE EXCEPTION 'unsupported frequency';
  END IF;
  IF COALESCE(p_total_cents, -1) < 0 OR COALESCE(p_down_payment_cents, -1) < 0 OR p_down_payment_cents > p_total_cents THEN
    RAISE EXCEPTION 'invalid plan amounts';
  END IF;
  IF COALESCE(p_installment_count, 0) < 1 OR p_installment_count > 120 THEN
    RAISE EXCEPTION 'installment count must be between 1 and 120';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id AND business_id = p_business_id
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'customer not found in business'; END IF;

  IF p_invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id AND business_id = p_business_id AND customer_id = p_customer_id
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invoice not found for customer in business'; END IF;
  END IF;

  IF p_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.locations WHERE id = p_location_id AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'location not found in business';
  END IF;

  INSERT INTO public.payment_plans (
    business_id, location_id, customer_id, invoice_id, plan_type, status,
    total_cents, down_payment_cents, installment_count, frequency, start_date,
    notes, created_by, updated_by
  ) VALUES (
    p_business_id, p_location_id, p_customer_id, p_invoice_id, UPPER(p_plan_type), 'ACTIVE',
    p_total_cents, p_down_payment_cents, p_installment_count, UPPER(p_frequency), COALESCE(p_start_date, CURRENT_DATE),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''), p_actor_id, p_actor_id
  ) RETURNING * INTO v_plan;

  v_remaining := p_total_cents - p_down_payment_cents;
  v_base := CASE WHEN p_installment_count > 0 THEN v_remaining / p_installment_count ELSE 0 END;
  v_remainder := CASE WHEN p_installment_count > 0 THEN v_remaining % p_installment_count ELSE 0 END;

  FOR v_seq IN 1..p_installment_count LOOP
    v_due := CASE UPPER(p_frequency)
      WHEN 'WEEKLY' THEN COALESCE(p_start_date, CURRENT_DATE) + ((v_seq - 1) * 7)
      WHEN 'BIWEEKLY' THEN COALESCE(p_start_date, CURRENT_DATE) + ((v_seq - 1) * 14)
      WHEN 'MONTHLY' THEN (COALESCE(p_start_date, CURRENT_DATE) + ((v_seq - 1) || ' months')::interval)::date
      ELSE COALESCE(p_start_date, CURRENT_DATE) + ((v_seq - 1) * 30)
    END;
    v_amount := v_base + CASE WHEN v_seq <= v_remainder THEN 1 ELSE 0 END;

    INSERT INTO public.payment_schedules (
      business_id, invoice_id, plan_id, sequence_no, stage_name, amount_cents,
      due_date, paid_cents, status
    ) VALUES (
      p_business_id,
      COALESCE(p_invoice_id, v_plan.invoice_id),
      v_plan.id,
      v_seq,
      CASE WHEN UPPER(p_plan_type) = 'LAYAWAY' THEN 'Layaway ' ELSE 'Installment ' END || v_seq,
      v_amount,
      v_due,
      0,
      'Pending'
    );
  END LOOP;

  INSERT INTO public.audit_logs (
    entity_type, entity_id, action, user_id, before_value, after_value, reason
  ) VALUES (
    'payment_plan', v_plan.id::text, 'PAYMENT_PLAN_CREATED', p_actor_id, NULL,
    to_jsonb(v_plan), UPPER(p_plan_type) || ' plan created'
  );

  RETURN jsonb_build_object(
    'plan', to_jsonb(v_plan),
    'schedule', COALESCE((
      SELECT jsonb_agg(to_jsonb(ps) ORDER BY ps.sequence_no)
      FROM public.payment_schedules ps
      WHERE ps.plan_id = v_plan.id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_payment_plan_server(uuid,uuid,uuid,uuid,text,integer,integer,integer,text,date,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment_plan_server(uuid,uuid,uuid,uuid,text,integer,integer,integer,text,date,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.record_payment_plan_installment_server(
  p_business_id uuid,
  p_schedule_id uuid,
  p_amount_cents integer,
  p_payment_method text,
  p_provider_transaction_id text,
  p_notes text,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule public.payment_schedules%ROWTYPE;
  v_plan public.payment_plans%ROWTYPE;
  v_new_paid integer;
  v_payment public.payments%ROWTYPE;
  v_plan_paid integer;
BEGIN
  IF COALESCE(p_amount_cents, 0) <= 0 THEN
    RAISE EXCEPTION 'payment amount must be positive';
  END IF;

  SELECT * INTO v_schedule
  FROM public.payment_schedules
  WHERE id = p_schedule_id AND business_id = p_business_id
  FOR UPDATE;
  IF NOT FOUND OR v_schedule.plan_id IS NULL THEN
    RAISE EXCEPTION 'payment schedule not found';
  END IF;

  SELECT * INTO v_plan
  FROM public.payment_plans
  WHERE id = v_schedule.plan_id AND business_id = p_business_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment plan not found'; END IF;
  IF v_plan.status NOT IN ('ACTIVE','DRAFT') THEN
    RAISE EXCEPTION 'payment plan is not payable';
  END IF;

  v_new_paid := COALESCE(v_schedule.paid_cents, 0) + p_amount_cents;
  IF v_new_paid > v_schedule.amount_cents THEN
    RAISE EXCEPTION 'payment exceeds installment balance';
  END IF;

  INSERT INTO public.payments (
    business_id, location_id, customer_id, invoice_id, amount_cents,
    payment_method, provider_transaction_id, status, notes, processed_by
  ) VALUES (
    p_business_id, v_plan.location_id, v_plan.customer_id, v_plan.invoice_id,
    p_amount_cents, COALESCE(NULLIF(BTRIM(p_payment_method), ''), 'manual'),
    NULLIF(BTRIM(COALESCE(p_provider_transaction_id, '')), ''), 'completed',
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''), p_actor_id
  ) RETURNING * INTO v_payment;

  UPDATE public.payment_schedules
  SET paid_cents = v_new_paid,
      status = CASE WHEN v_new_paid >= amount_cents THEN 'Paid' ELSE 'Partial' END,
      payment_reference = COALESCE(NULLIF(BTRIM(COALESCE(p_provider_transaction_id, '')), ''), v_payment.id::text),
      paid_at = CASE WHEN v_new_paid >= amount_cents THEN now() ELSE paid_at END,
      updated_at = now()
  WHERE id = v_schedule.id
  RETURNING * INTO v_schedule;

  IF v_plan.invoice_id IS NOT NULL THEN
    UPDATE public.invoices
    SET paid_cents = LEAST(COALESCE(amount_cents, 0), COALESCE(paid_cents, 0) + p_amount_cents),
        status = CASE
          WHEN COALESCE(paid_cents, 0) + p_amount_cents >= COALESCE(amount_cents, 0) THEN 'Paid'
          WHEN COALESCE(paid_cents, 0) + p_amount_cents > 0 THEN 'Partial'
          ELSE status
        END
    WHERE id = v_plan.invoice_id AND business_id = p_business_id;
  END IF;

  SELECT COALESCE(SUM(ps.paid_cents), 0) INTO v_plan_paid
  FROM public.payment_schedules ps
  WHERE ps.plan_id = v_plan.id;

  UPDATE public.payment_plans
  SET status = CASE
        WHEN v_plan_paid >= (total_cents - down_payment_cents) THEN 'COMPLETED'
        ELSE 'ACTIVE'
      END,
      updated_by = p_actor_id,
      updated_at = now()
  WHERE id = v_plan.id
  RETURNING * INTO v_plan;

  INSERT INTO public.audit_logs (
    entity_type, entity_id, action, user_id, before_value, after_value, reason
  ) VALUES (
    'payment_plan', v_plan.id::text, 'PAYMENT_PLAN_INSTALLMENT_RECORDED', p_actor_id,
    NULL, jsonb_build_object('payment', to_jsonb(v_payment), 'schedule', to_jsonb(v_schedule)),
    'Payment-plan installment recorded'
  );

  RETURN jsonb_build_object('plan', to_jsonb(v_plan), 'schedule', to_jsonb(v_schedule), 'payment', to_jsonb(v_payment));
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment_plan_installment_server(uuid,uuid,integer,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_plan_installment_server(uuid,uuid,integer,text,text,text,uuid) TO service_role;
