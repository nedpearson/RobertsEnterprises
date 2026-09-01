-- Authoritative commission ledger.
-- Commission is earned from explicitly attributed, completed payments and is
-- reversed by completed refunds. No customer-name or stylist-name inference.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sales_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_sales_staff
  ON public.invoices(business_id, sales_staff_id, created_at DESC);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS sales_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_sales_staff
  ON public.payments(business_id, sales_staff_id, processed_at DESC);

CREATE TABLE IF NOT EXISTS public.commission_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  basis text NOT NULL DEFAULT 'COLLECTED_NET_REFUNDS'
    CHECK (basis IN ('COLLECTED_NET_REFUNDS')),
  rate_bps integer NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_commission_plan_name UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS public.commission_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.commission_plans(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_assignment_range CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT uq_commission_assignment_version UNIQUE (business_id, employee_id, location_id, effective_from)
);
CREATE INDEX IF NOT EXISTS idx_commission_assignment_effective
  ON public.commission_assignments(business_id, employee_id, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_assignment_open_global
  ON public.commission_assignments(business_id, employee_id)
  WHERE location_id IS NULL AND effective_to IS NULL AND is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_assignment_open_location
  ON public.commission_assignments(business_id, employee_id, location_id)
  WHERE location_id IS NOT NULL AND effective_to IS NULL AND is_active = true;

CREATE TABLE IF NOT EXISTS public.commission_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','APPROVED','EXPORTED','PAID','VOIDED')),
  total_basis_cents bigint NOT NULL DEFAULT 0,
  total_commission_cents bigint NOT NULL DEFAULT 0,
  employee_count integer NOT NULL DEFAULT 0 CHECK (employee_count >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  exported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  exported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_batch_range CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_commission_batches_business_dates
  ON public.commission_batches(business_id, start_date DESC, end_date DESC);

CREATE TABLE IF NOT EXISTS public.commission_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.commission_plans(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  refund_id uuid REFERENCES public.refunds(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.commission_batches(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('EARN','REFUND_REVERSAL')),
  basis_cents bigint NOT NULL,
  rate_bps integer NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  commission_cents bigint NOT NULL,
  event_date date NOT NULL,
  settlement_status text NOT NULL DEFAULT 'OPEN'
    CHECK (settlement_status IN ('OPEN','BATCHED','EXPORTED','PAID')),
  source_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commission_earning_sign CHECK (
    (event_type = 'EARN' AND basis_cents > 0 AND commission_cents >= 0)
    OR
    (event_type = 'REFUND_REVERSAL' AND basis_cents < 0 AND commission_cents <= 0)
  ),
  CONSTRAINT uq_commission_earning_source UNIQUE (business_id, source_key)
);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_employee_open
  ON public.commission_earnings(business_id, employee_id, event_date DESC)
  WHERE settlement_status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_commission_earnings_batch
  ON public.commission_earnings(business_id, batch_id);

ALTER TABLE public.payroll_adjustments
  ADD COLUMN IF NOT EXISTS source_commission_batch_id uuid REFERENCES public.commission_batches(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_adjustment_commission_batch_employee
  ON public.payroll_adjustments(source_commission_batch_id, employee_id)
  WHERE source_commission_batch_id IS NOT NULL;

ALTER TABLE public.commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers read commission plans" ON public.commission_plans;
CREATE POLICY "Managers read commission plans" ON public.commission_plans FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));
DROP POLICY IF EXISTS "Managers read commission assignments" ON public.commission_assignments;
CREATE POLICY "Managers read commission assignments" ON public.commission_assignments FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));
DROP POLICY IF EXISTS "Managers read commission batches" ON public.commission_batches;
CREATE POLICY "Managers read commission batches" ON public.commission_batches FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));
DROP POLICY IF EXISTS "Managers read commission earnings" ON public.commission_earnings;
CREATE POLICY "Managers read commission earnings" ON public.commission_earnings FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));

-- Resolve the one applicable assignment, favoring a location-specific plan.
CREATE OR REPLACE FUNCTION public.commission_assignment_for_payment(
  p_business_id uuid,
  p_employee_id uuid,
  p_location_id uuid,
  p_event_date date
) RETURNS TABLE(assignment_id uuid, plan_id uuid, rate_bps integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, p.id, p.rate_bps
  FROM public.commission_assignments a
  JOIN public.commission_plans p
    ON p.id = a.plan_id AND p.business_id = a.business_id
  WHERE a.business_id = p_business_id
    AND a.employee_id = p_employee_id
    AND a.is_active = true
    AND p.is_active = true
    AND a.effective_from <= p_event_date
    AND (a.effective_to IS NULL OR a.effective_to >= p_event_date)
    AND (a.location_id IS NULL OR a.location_id = p_location_id)
  ORDER BY (a.location_id IS NOT NULL) DESC, a.effective_from DESC, a.created_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.commission_assignment_for_payment(uuid,uuid,uuid,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commission_assignment_for_payment(uuid,uuid,uuid,date) TO service_role;

-- Idempotently create an earning from a completed, explicitly attributed payment.
CREATE OR REPLACE FUNCTION public.reconcile_commission_payment_server(
  p_business_id uuid,
  p_payment_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_employee_id uuid;
  v_plan_id uuid;
  v_rate_bps integer;
  v_event_date date;
  v_earning public.commission_earnings%ROWTYPE;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND business_id = p_business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF LOWER(COALESCE(v_payment.status, '')) <> 'completed' THEN RETURN NULL; END IF;

  v_employee_id := v_payment.sales_staff_id;
  IF v_payment.invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = v_payment.invoice_id AND business_id = p_business_id;
    IF FOUND AND v_employee_id IS NULL THEN v_employee_id := v_invoice.sales_staff_id; END IF;
  END IF;
  IF v_employee_id IS NULL THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE id = v_employee_id AND business_id = p_business_id) THEN
    RAISE EXCEPTION 'sales staff attribution does not belong to business';
  END IF;

  v_event_date := COALESCE(v_payment.processed_at, v_payment.created_at, now())::date;
  SELECT x.plan_id, x.rate_bps INTO v_plan_id, v_rate_bps
  FROM public.commission_assignment_for_payment(p_business_id, v_employee_id, v_payment.location_id, v_event_date) x;
  IF v_plan_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.commission_earnings (
    business_id, employee_id, plan_id, invoice_id, payment_id,
    event_type, basis_cents, rate_bps, commission_cents, event_date,
    settlement_status, source_key
  ) VALUES (
    p_business_id, v_employee_id, v_plan_id, v_payment.invoice_id, v_payment.id,
    'EARN', v_payment.amount_cents, v_rate_bps,
    ROUND(v_payment.amount_cents::numeric * v_rate_bps / 10000.0)::bigint,
    v_event_date, 'OPEN', 'payment:' || v_payment.id::text
  )
  ON CONFLICT (business_id, source_key) DO NOTHING
  RETURNING * INTO v_earning;

  IF v_earning.id IS NULL THEN
    SELECT * INTO v_earning FROM public.commission_earnings
    WHERE business_id = p_business_id AND source_key = 'payment:' || v_payment.id::text;
  END IF;
  RETURN to_jsonb(v_earning);
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_commission_payment_server(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_commission_payment_server(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_commission_refund_server(
  p_business_id uuid,
  p_refund_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund public.refunds%ROWTYPE;
  v_original public.commission_earnings%ROWTYPE;
  v_reversal public.commission_earnings%ROWTYPE;
BEGIN
  SELECT * INTO v_refund
  FROM public.refunds
  WHERE id = p_refund_id AND business_id = p_business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund not found'; END IF;
  IF LOWER(COALESCE(v_refund.status, '')) <> 'completed' THEN RETURN NULL; END IF;

  SELECT * INTO v_original
  FROM public.commission_earnings
  WHERE business_id = p_business_id
    AND payment_id = v_refund.payment_id
    AND event_type = 'EARN'
  ORDER BY created_at
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO public.commission_earnings (
    business_id, employee_id, plan_id, invoice_id, payment_id, refund_id,
    event_type, basis_cents, rate_bps, commission_cents, event_date,
    settlement_status, source_key
  ) VALUES (
    p_business_id, v_original.employee_id, v_original.plan_id, v_original.invoice_id,
    v_original.payment_id, v_refund.id, 'REFUND_REVERSAL',
    -v_refund.amount_cents::bigint, v_original.rate_bps,
    -ROUND(v_refund.amount_cents::numeric * v_original.rate_bps / 10000.0)::bigint,
    COALESCE(v_refund.processed_at, v_refund.created_at, now())::date,
    'OPEN', 'refund:' || v_refund.id::text
  )
  ON CONFLICT (business_id, source_key) DO NOTHING
  RETURNING * INTO v_reversal;

  IF v_reversal.id IS NULL THEN
    SELECT * INTO v_reversal FROM public.commission_earnings
    WHERE business_id = p_business_id AND source_key = 'refund:' || v_refund.id::text;
  END IF;
  RETURN to_jsonb(v_reversal);
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_commission_refund_server(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_commission_refund_server(uuid,uuid) TO service_role;

-- Automatically attribute a new invoice to the authenticated staff creator.
CREATE OR REPLACE FUNCTION public.default_invoice_sales_staff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.sales_staff_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT id INTO NEW.sales_staff_id
    FROM public.staff_profiles
    WHERE id = auth.uid() AND business_id = NEW.business_id;
  END IF;

  IF NEW.sales_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff_profiles WHERE id = NEW.sales_staff_id AND business_id = NEW.business_id
  ) THEN RAISE EXCEPTION 'sales staff attribution does not belong to business'; END IF;

  IF TG_OP = 'UPDATE' AND NEW.sales_staff_id IS DISTINCT FROM OLD.sales_staff_id
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.is_business_manager(NEW.business_id) THEN
    RAISE EXCEPTION 'only a manager can reassign invoice sales attribution';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_default_invoice_sales_staff ON public.invoices;
CREATE TRIGGER trg_default_invoice_sales_staff
BEFORE INSERT OR UPDATE OF sales_staff_id ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.default_invoice_sales_staff();

-- Payments inherit invoice attribution. Direct browser callers cannot silently
-- swap the commissioned employee on an existing payment.
CREATE OR REPLACE FUNCTION public.default_payment_sales_staff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_staff uuid;
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT sales_staff_id INTO v_invoice_staff
    FROM public.invoices
    WHERE id = NEW.invoice_id AND business_id = NEW.business_id;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.sales_staff_id IS NULL THEN NEW.sales_staff_id := v_invoice_staff; END IF;

  IF NEW.sales_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff_profiles WHERE id = NEW.sales_staff_id AND business_id = NEW.business_id
  ) THEN RAISE EXCEPTION 'payment sales staff attribution does not belong to business'; END IF;

  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_business_manager(NEW.business_id) THEN
    IF TG_OP = 'INSERT' AND NEW.sales_staff_id IS DISTINCT FROM v_invoice_staff THEN
      NEW.sales_staff_id := v_invoice_staff;
    ELSIF TG_OP = 'UPDATE' AND NEW.sales_staff_id IS DISTINCT FROM OLD.sales_staff_id THEN
      RAISE EXCEPTION 'only a manager can reassign payment sales attribution';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_default_payment_sales_staff ON public.payments;
CREATE TRIGGER trg_default_payment_sales_staff
BEFORE INSERT OR UPDATE OF sales_staff_id, invoice_id ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.default_payment_sales_staff();

CREATE OR REPLACE FUNCTION public.capture_commission_payment_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF LOWER(COALESCE(NEW.status, '')) = 'completed'
     AND (TG_OP = 'INSERT' OR LOWER(COALESCE(OLD.status, '')) <> 'completed' OR NEW.sales_staff_id IS DISTINCT FROM OLD.sales_staff_id) THEN
    PERFORM public.reconcile_commission_payment_server(NEW.business_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_capture_commission_payment ON public.payments;
CREATE TRIGGER trg_capture_commission_payment
AFTER INSERT OR UPDATE OF status, sales_staff_id ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.capture_commission_payment_trigger();

CREATE OR REPLACE FUNCTION public.capture_commission_refund_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF LOWER(COALESCE(NEW.status, '')) = 'completed'
     AND (TG_OP = 'INSERT' OR LOWER(COALESCE(OLD.status, '')) <> 'completed') THEN
    PERFORM public.reconcile_commission_refund_server(NEW.business_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_capture_commission_refund ON public.refunds;
CREATE TRIGGER trg_capture_commission_refund
AFTER INSERT OR UPDATE OF status ON public.refunds
FOR EACH ROW EXECUTE FUNCTION public.capture_commission_refund_trigger();

-- Create a batch only for employees whose OPEN earning/reversal events net to a
-- positive payable amount. Negative carry-forward events remain OPEN.
CREATE OR REPLACE FUNCTION public.create_commission_batch_server(
  p_business_id uuid,
  p_actor_id uuid,
  p_name text,
  p_start_date date,
  p_end_date date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid;
  v_total_basis bigint;
  v_total_commission bigint;
  v_employee_count integer;
BEGIN
  IF p_end_date < p_start_date THEN RAISE EXCEPTION 'invalid commission batch date range'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('commission:' || p_business_id::text, 0));

  IF NOT EXISTS (
    SELECT 1
    FROM public.commission_earnings e
    WHERE e.business_id = p_business_id
      AND e.settlement_status = 'OPEN'
      AND e.event_date BETWEEN p_start_date AND p_end_date
    GROUP BY e.employee_id
    HAVING SUM(e.commission_cents) > 0
  ) THEN RAISE EXCEPTION 'no positive commission balance is available in this date range'; END IF;

  INSERT INTO public.commission_batches (
    business_id, name, start_date, end_date, status, created_by
  ) VALUES (
    p_business_id,
    COALESCE(NULLIF(BTRIM(COALESCE(p_name, '')), ''), p_start_date::text || ' to ' || p_end_date::text),
    p_start_date, p_end_date, 'DRAFT', p_actor_id
  ) RETURNING id INTO v_batch_id;

  WITH payable_employees AS (
    SELECT employee_id
    FROM public.commission_earnings
    WHERE business_id = p_business_id
      AND settlement_status = 'OPEN'
      AND event_date BETWEEN p_start_date AND p_end_date
    GROUP BY employee_id
    HAVING SUM(commission_cents) > 0
  )
  UPDATE public.commission_earnings e
  SET batch_id = v_batch_id, settlement_status = 'BATCHED'
  WHERE e.business_id = p_business_id
    AND e.settlement_status = 'OPEN'
    AND e.event_date BETWEEN p_start_date AND p_end_date
    AND e.employee_id IN (SELECT employee_id FROM payable_employees);

  SELECT COALESCE(SUM(basis_cents),0), COALESCE(SUM(commission_cents),0), COUNT(DISTINCT employee_id)::integer
  INTO v_total_basis, v_total_commission, v_employee_count
  FROM public.commission_earnings WHERE batch_id = v_batch_id;

  UPDATE public.commission_batches
  SET total_basis_cents = v_total_basis,
      total_commission_cents = v_total_commission,
      employee_count = v_employee_count,
      updated_at = now()
  WHERE id = v_batch_id;

  RETURN v_batch_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_commission_batch_server(uuid,uuid,text,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_commission_batch_server(uuid,uuid,text,date,date) TO service_role;

CREATE OR REPLACE FUNCTION public.approve_commission_batch_server(
  p_business_id uuid,
  p_batch_id uuid,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_batch public.commission_batches%ROWTYPE;
BEGIN
  SELECT * INTO v_batch FROM public.commission_batches
  WHERE id = p_batch_id AND business_id = p_business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'commission batch not found'; END IF;
  IF v_batch.status <> 'DRAFT' THEN RAISE EXCEPTION 'only draft commission batches can be approved'; END IF;

  UPDATE public.commission_batches
  SET status = 'APPROVED', approved_by = p_actor_id, approved_at = now(), updated_at = now()
  WHERE id = p_batch_id RETURNING * INTO v_batch;
  RETURN to_jsonb(v_batch);
END;
$$;
REVOKE ALL ON FUNCTION public.approve_commission_batch_server(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_commission_batch_server(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.export_commission_batch_to_payroll_server(
  p_business_id uuid,
  p_batch_id uuid,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.commission_batches%ROWTYPE;
  v_employee record;
  v_adjustment_count integer := 0;
  v_rows integer := 0;
BEGIN
  SELECT * INTO v_batch FROM public.commission_batches
  WHERE id = p_batch_id AND business_id = p_business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'commission batch not found'; END IF;
  IF v_batch.status <> 'APPROVED' THEN RAISE EXCEPTION 'commission batch must be approved before payroll export'; END IF;

  FOR v_employee IN
    SELECT employee_id, SUM(commission_cents)::bigint AS commission_cents
    FROM public.commission_earnings
    WHERE business_id = p_business_id AND batch_id = p_batch_id AND settlement_status = 'BATCHED'
    GROUP BY employee_id
    HAVING SUM(commission_cents) > 0
  LOOP
    INSERT INTO public.payroll_adjustments (
      business_id, employee_id, adjustment_type, tax_treatment, amount_cents,
      occurred_on, description, status, created_by, approved_by, approved_at,
      source_commission_batch_id
    ) VALUES (
      p_business_id, v_employee.employee_id, 'COMMISSION', 'TAXABLE', v_employee.commission_cents,
      v_batch.end_date, 'Commission batch: ' || v_batch.name, 'APPROVED',
      p_actor_id, p_actor_id, now(), p_batch_id
    )
    ON CONFLICT (source_commission_batch_id, employee_id) WHERE source_commission_batch_id IS NOT NULL
    DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_adjustment_count := v_adjustment_count + v_rows;
  END LOOP;

  IF v_adjustment_count = 0 THEN RAISE EXCEPTION 'commission batch produced no payable payroll adjustments'; END IF;

  UPDATE public.commission_earnings
  SET settlement_status = 'EXPORTED'
  WHERE business_id = p_business_id AND batch_id = p_batch_id AND settlement_status = 'BATCHED';

  UPDATE public.commission_batches
  SET status = 'EXPORTED', exported_by = p_actor_id, exported_at = now(), updated_at = now()
  WHERE id = p_batch_id RETURNING * INTO v_batch;

  RETURN to_jsonb(v_batch);
END;
$$;
REVOKE ALL ON FUNCTION public.export_commission_batch_to_payroll_server(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_commission_batch_to_payroll_server(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.void_commission_batch_server(
  p_business_id uuid,
  p_batch_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_batch public.commission_batches%ROWTYPE;
BEGIN
  SELECT * INTO v_batch FROM public.commission_batches
  WHERE id = p_batch_id AND business_id = p_business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'commission batch not found'; END IF;
  IF v_batch.status NOT IN ('DRAFT','APPROVED') THEN RAISE EXCEPTION 'exported or paid commission batches cannot be voided'; END IF;

  UPDATE public.commission_earnings
  SET settlement_status = 'OPEN', batch_id = NULL
  WHERE business_id = p_business_id AND batch_id = p_batch_id AND settlement_status = 'BATCHED';

  UPDATE public.commission_batches
  SET status = 'VOIDED', updated_at = now()
  WHERE id = p_batch_id RETURNING * INTO v_batch;
  RETURN to_jsonb(v_batch);
END;
$$;
REVOKE ALL ON FUNCTION public.void_commission_batch_server(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_commission_batch_server(uuid,uuid) TO service_role;

-- When the payroll adjustment generated from a commission batch becomes APPLIED,
-- mark the commission events PAID once every generated adjustment is applied.
CREATE OR REPLACE FUNCTION public.sync_commission_batch_from_payroll()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_commission_batch_id IS NULL OR NEW.status <> 'APPLIED' THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.payroll_adjustments
    WHERE source_commission_batch_id = NEW.source_commission_batch_id AND status <> 'APPLIED'
  ) THEN
    UPDATE public.commission_batches
    SET status = 'PAID', updated_at = now()
    WHERE id = NEW.source_commission_batch_id AND business_id = NEW.business_id AND status = 'EXPORTED';
    UPDATE public.commission_earnings
    SET settlement_status = 'PAID'
    WHERE batch_id = NEW.source_commission_batch_id AND business_id = NEW.business_id AND settlement_status = 'EXPORTED';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_commission_batch_from_payroll ON public.payroll_adjustments;
CREATE TRIGGER trg_sync_commission_batch_from_payroll
AFTER UPDATE OF status ON public.payroll_adjustments
FOR EACH ROW EXECUTE FUNCTION public.sync_commission_batch_from_payroll();
