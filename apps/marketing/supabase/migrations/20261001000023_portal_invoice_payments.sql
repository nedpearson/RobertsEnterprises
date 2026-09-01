-- Public invoice payment boundary.
--
-- The public pay page (anon key) updated invoices directly, then looked the bride
-- up through the public.brides VIEW BY NAME to bump her lifetime spend, then wrote
-- an activity row whose business_id fell back to a hard-coded organization when
-- the invoice did not carry one. Same defect family as the e-sign page: tenancy
-- supplied by the client, records associated by name.
--
-- Payment posting now happens in one SECURITY DEFINER function that derives the
-- organization and the customer from the invoice row, is idempotent on the
-- payment processor reference, and can never post more than the open balance.

CREATE TABLE IF NOT EXISTS public.invoice_payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    reference TEXT NOT NULL,
    payer_name TEXT,
    payer_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (invoice_id, reference)
);

ALTER TABLE public.invoice_payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read invoice payment events" ON public.invoice_payment_events;
CREATE POLICY "Members read invoice payment events"
ON public.invoice_payment_events FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));

CREATE OR REPLACE FUNCTION public.portal_get_invoice(
    p_invoice_id uuid,
    p_pay_token text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice public.invoices%ROWTYPE;
BEGIN
    IF p_invoice_id IS NULL OR COALESCE(BTRIM(p_pay_token), '') = '' THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_invoice
      FROM public.invoices i
     WHERE i.id = p_invoice_id
       AND i.pay_token IS NOT NULL
       AND BTRIM(i.pay_token) <> ''
       AND i.pay_token = p_pay_token;

    IF NOT FOUND OR v_invoice.business_id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(v_invoice);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_apply_invoice_payment(
    p_invoice_id uuid,
    p_pay_token text,
    p_amount_cents integer,
    p_reference text,
    p_payer_name text DEFAULT NULL,
    p_payer_email text DEFAULT NULL,
    p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice public.invoices%ROWTYPE;
    v_balance integer;
    v_applied integer;
    v_new_paid integer;
    v_new_status text;
    v_reference text := BTRIM(COALESCE(p_reference, ''));
    v_body text;
BEGIN
    IF p_invoice_id IS NULL OR COALESCE(BTRIM(p_pay_token), '') = '' OR v_reference = '' THEN
        RAISE EXCEPTION 'invalid_payment_link' USING ERRCODE = '28000';
    END IF;
    IF COALESCE(p_amount_cents, 0) <= 0 THEN
        RAISE EXCEPTION 'invalid_payment_amount' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_invoice
      FROM public.invoices i
     WHERE i.id = p_invoice_id
       AND i.pay_token IS NOT NULL
       AND BTRIM(i.pay_token) <> ''
       AND i.pay_token = p_pay_token
       FOR UPDATE;

    IF NOT FOUND OR v_invoice.business_id IS NULL THEN
        RAISE EXCEPTION 'invalid_payment_link' USING ERRCODE = '28000';
    END IF;

    -- Idempotent on the processor reference: a retried submit returns the
    -- invoice as it already stands instead of posting the charge twice.
    IF EXISTS (
        SELECT 1 FROM public.invoice_payment_events e
         WHERE e.invoice_id = v_invoice.id AND e.reference = v_reference
    ) THEN
        RETURN to_jsonb(v_invoice);
    END IF;

    v_balance := GREATEST(COALESCE(v_invoice.amount_cents, 0) - COALESCE(v_invoice.paid_cents, 0), 0);
    IF v_balance = 0 THEN
        RETURN to_jsonb(v_invoice);
    END IF;

    -- Never post more than is owed, whatever the client sends.
    v_applied := LEAST(p_amount_cents, v_balance);
    v_new_paid := COALESCE(v_invoice.paid_cents, 0) + v_applied;
    v_new_status := CASE WHEN v_new_paid >= COALESCE(v_invoice.amount_cents, 0) THEN 'Paid' ELSE 'Partial' END;

    UPDATE public.invoices
       SET paid_cents = v_new_paid,
           status = v_new_status
     WHERE id = v_invoice.id
    RETURNING * INTO v_invoice;

    INSERT INTO public.invoice_payment_events
        (business_id, invoice_id, customer_id, amount_cents, reference, payer_name, payer_email)
    VALUES
        (v_invoice.business_id, v_invoice.id, v_invoice.customer_id, v_applied, v_reference,
         NULLIF(BTRIM(COALESCE(p_payer_name, '')), ''), NULLIF(BTRIM(COALESCE(p_payer_email, '')), ''));

    -- Lifetime spend follows customer_id, never a name lookup on a view.
    IF v_invoice.customer_id IS NOT NULL THEN
        UPDATE public.customers
           SET spend_cents = COALESCE(spend_cents, 0) + v_applied
         WHERE id = v_invoice.customer_id
           AND business_id = v_invoice.business_id;
    END IF;

    v_body := COALESCE(NULLIF(BTRIM(COALESCE(p_note, '')), ''),
                       'Payment applied to invoice ' || v_invoice.id::text || '.');

    INSERT INTO public.messages (
        business_id, customer_id, customer, channel, to_address, subject,
        body, content, kind, status, direction, sent_at
    ) VALUES (
        v_invoice.business_id,
        v_invoice.customer_id,
        v_invoice.customer,
        'email',
        COALESCE(NULLIF(BTRIM(COALESCE(p_payer_email, '')), ''), 'online payment'),
        'Payment received - ' || v_invoice.id::text,
        v_body,
        v_body,
        'payment',
        'sent',
        'outbound',
        NOW()
    );

    RETURN to_jsonb(v_invoice);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_get_invoice(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_apply_invoice_payment(uuid, text, integer, text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.portal_get_invoice(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_apply_invoice_payment(uuid, text, integer, text, text, text, text) TO anon, authenticated;
