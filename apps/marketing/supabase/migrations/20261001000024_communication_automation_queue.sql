-- Durable, idempotent appointment automation queueing.
--
-- The scheduler may run on more than one Railway replica. Delivery creation and
-- durable-job creation therefore happen in one database transaction, protected
-- by the existing UNIQUE(rule_id, appointment_id) constraint.

ALTER TABLE public.communication_automation_rules
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_communication_automation_rules_active
  ON public.communication_automation_rules(business_id, enabled, archived_at, rule_type);

CREATE OR REPLACE FUNCTION public.queue_communication_automation_delivery_server(
  p_business_id uuid,
  p_rule_id uuid,
  p_appointment_id uuid,
  p_scheduled_for timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.communication_automation_rules%ROWTYPE;
  v_appointment public.appointments%ROWTYPE;
  v_delivery public.communication_automation_deliveries%ROWTYPE;
  v_job public.durable_jobs%ROWTYPE;
BEGIN
  IF p_business_id IS NULL OR p_rule_id IS NULL OR p_appointment_id IS NULL OR p_scheduled_for IS NULL THEN
    RAISE EXCEPTION 'business, rule, appointment, and scheduled time are required';
  END IF;

  SELECT * INTO v_rule
  FROM public.communication_automation_rules
  WHERE id = p_rule_id
    AND business_id = p_business_id
    AND enabled = true
    AND archived_at IS NULL
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'RULE_NOT_ACTIVE');
  END IF;

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id
    AND business_id = p_business_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'APPOINTMENT_NOT_FOUND');
  END IF;

  IF v_appointment.customer_id IS NULL THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'CUSTOMER_NOT_LINKED');
  END IF;

  IF v_rule.location_id IS NOT NULL
     AND v_appointment.location_id IS DISTINCT FROM v_rule.location_id THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'LOCATION_MISMATCH');
  END IF;

  INSERT INTO public.communication_automation_deliveries (
    business_id,
    rule_id,
    appointment_id,
    customer_id,
    channel,
    status,
    scheduled_for
  ) VALUES (
    p_business_id,
    v_rule.id,
    v_appointment.id,
    v_appointment.customer_id,
    v_rule.channel,
    'QUEUED',
    p_scheduled_for
  )
  ON CONFLICT (rule_id, appointment_id) DO NOTHING
  RETURNING * INTO v_delivery;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('queued', false, 'reason', 'ALREADY_QUEUED');
  END IF;

  INSERT INTO public.durable_jobs (
    business_id,
    queue_name,
    payload,
    status,
    attempts,
    max_attempts,
    next_retry_at
  ) VALUES (
    p_business_id,
    'send_appointment_automation',
    jsonb_build_object('delivery_id', v_delivery.id),
    'pending',
    0,
    5,
    GREATEST(now(), p_scheduled_for)
  )
  RETURNING * INTO v_job;

  UPDATE public.communication_automation_deliveries
  SET durable_job_id = v_job.id
  WHERE id = v_delivery.id;

  RETURN jsonb_build_object(
    'queued', true,
    'delivery_id', v_delivery.id,
    'job_id', v_job.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.queue_communication_automation_delivery_server(uuid,uuid,uuid,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_communication_automation_delivery_server(uuid,uuid,uuid,timestamptz) TO service_role;

CREATE INDEX IF NOT EXISTS idx_communication_automation_deliveries_rule_status
  ON public.communication_automation_deliveries(rule_id, status, scheduled_for);
