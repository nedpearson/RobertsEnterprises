-- Real vendor-return workflow and refund-provider reconciliation metadata.

CREATE TABLE IF NOT EXISTS public.vendor_return_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  return_number text NOT NULL,
  vendor_name text NOT NULL,
  gown_id uuid REFERENCES public.gowns(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  item_description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 1000),
  value_cents integer NOT NULL DEFAULT 0 CHECK (value_cents >= 0),
  reason text NOT NULL CHECK (reason IN ('DEFECTIVE_MERCHANDISE','STOCK_BALANCING','SAMPLE_RETURN','CUSTOMER_CANCELLATION','SIZE_DISCREPANCY','OTHER')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SHIPPED','CREDIT_RECEIVED','CANCELLED')),
  carrier text,
  tracking_number text,
  notes text,
  shipped_at timestamptz,
  credit_received_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendor_return_orders_number_unique UNIQUE (business_id, return_number)
);
CREATE INDEX IF NOT EXISTS idx_vendor_return_orders_business_status
  ON public.vendor_return_orders(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_return_orders_location
  ON public.vendor_return_orders(business_id, location_id, status);

ALTER TABLE public.vendor_return_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read vendor return orders" ON public.vendor_return_orders;
CREATE POLICY "Members can read vendor return orders"
ON public.vendor_return_orders FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "Managers can manage vendor return orders" ON public.vendor_return_orders;
CREATE POLICY "Managers can manage vendor return orders"
ON public.vendor_return_orders FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

DROP TRIGGER IF EXISTS trg_vendor_return_orders_touch ON public.vendor_return_orders;
CREATE TRIGGER trg_vendor_return_orders_touch
BEFORE UPDATE ON public.vendor_return_orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_refund_id text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_refunds_business_status
  ON public.refunds(business_id, status, processed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_provider_refund_id
  ON public.refunds(provider, provider_refund_id)
  WHERE provider_refund_id IS NOT NULL;

-- Reserve refundable balance under a row lock before any external provider call.
-- processing + completed refunds consume the payment balance. failed refunds do
-- not, which lets a manager safely retry after the provider rejects a request.
CREATE OR REPLACE FUNCTION public.create_refund_request_server(
  p_business_id uuid,
  p_payment_id uuid,
  p_amount_cents integer,
  p_reason text,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_reserved integer;
  v_refund public.refunds%ROWTYPE;
BEGIN
  IF p_business_id IS NULL OR p_payment_id IS NULL THEN
    RAISE EXCEPTION 'business and payment are required';
  END IF;
  IF COALESCE(p_amount_cents, 0) <= 0 THEN
    RAISE EXCEPTION 'refund amount must be positive';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND business_id = p_business_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF LOWER(COALESCE(v_payment.status, '')) IN ('failed','pending') THEN
    RAISE EXCEPTION 'payment is not refundable';
  END IF;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_reserved
  FROM public.refunds
  WHERE business_id = p_business_id
    AND payment_id = p_payment_id
    AND LOWER(COALESCE(status, '')) IN ('processing','completed');

  IF v_reserved + p_amount_cents > v_payment.amount_cents THEN
    RAISE EXCEPTION 'refund exceeds remaining refundable balance';
  END IF;

  INSERT INTO public.refunds (
    business_id,
    payment_id,
    amount_cents,
    reason,
    status,
    processed_by,
    processed_at,
    created_at,
    updated_at
  ) VALUES (
    p_business_id,
    p_payment_id,
    p_amount_cents,
    NULLIF(BTRIM(COALESCE(p_reason, '')), ''),
    'processing',
    p_actor_id,
    now(),
    now(),
    now()
  ) RETURNING * INTO v_refund;

  RETURN to_jsonb(v_refund);
END;
$$;

REVOKE ALL ON FUNCTION public.create_refund_request_server(uuid,uuid,integer,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_refund_request_server(uuid,uuid,integer,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_refund_server(
  p_business_id uuid,
  p_refund_id uuid,
  p_provider text,
  p_provider_refund_id text,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund public.refunds%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_total_refunded integer;
  v_invoice public.invoices%ROWTYPE;
BEGIN
  IF p_business_id IS NULL OR p_refund_id IS NULL THEN
    RAISE EXCEPTION 'business and refund are required';
  END IF;

  SELECT * INTO v_refund
  FROM public.refunds
  WHERE id = p_refund_id AND business_id = p_business_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund not found'; END IF;

  IF LOWER(COALESCE(v_refund.status, '')) = 'completed' THEN
    RETURN to_jsonb(v_refund);
  END IF;
  IF LOWER(COALESCE(v_refund.status, '')) <> 'processing' THEN
    RAISE EXCEPTION 'refund is not in processing state';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = v_refund.payment_id AND business_id = p_business_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;

  UPDATE public.refunds
  SET status = 'completed',
      provider = NULLIF(BTRIM(COALESCE(p_provider, '')), ''),
      provider_refund_id = NULLIF(BTRIM(COALESCE(p_provider_refund_id, '')), ''),
      error_message = NULL,
      processed_by = p_actor_id,
      processed_at = now(),
      updated_at = now()
  WHERE id = v_refund.id
  RETURNING * INTO v_refund;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_refunded
  FROM public.refunds
  WHERE business_id = p_business_id
    AND payment_id = v_payment.id
    AND LOWER(COALESCE(status, '')) = 'completed';

  UPDATE public.payments
  SET status = CASE WHEN v_total_refunded >= amount_cents THEN 'refunded' ELSE 'completed' END
  WHERE id = v_payment.id AND business_id = p_business_id;

  IF v_payment.invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = v_payment.invoice_id AND business_id = p_business_id
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.invoices
      SET paid_cents = GREATEST(0, COALESCE(paid_cents, 0) - v_refund.amount_cents),
          status = CASE
            WHEN GREATEST(0, COALESCE(paid_cents, 0) - v_refund.amount_cents) = 0 THEN 'Open'
            WHEN GREATEST(0, COALESCE(paid_cents, 0) - v_refund.amount_cents) < COALESCE(amount_cents, 0) THEN 'Partial'
            ELSE status
          END
      WHERE id = v_invoice.id AND business_id = p_business_id;
    END IF;
  END IF;

  RETURN to_jsonb(v_refund);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_refund_server(uuid,uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_refund_server(uuid,uuid,text,text,uuid) TO service_role;
