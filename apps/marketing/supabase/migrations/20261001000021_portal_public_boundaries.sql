-- Public portal boundaries: server-derived tenancy for the bride portal and e-sign.
--
-- Two problems this closes.
--
-- (1) public.brides / inventory_items / inventory_variants are views created
--     without security_invoker. A view without it executes as its OWNER, so RLS on
--     the underlying tables is not applied to the caller. public.brides selects
--     from customers -- name, email, phone, wedding date and portal_token -- for
--     every tenant. Setting security_invoker = true makes the caller's own RLS
--     apply. organization_health_scores is deliberately platform-wide, so instead
--     of flipping it, anon/authenticated lose the grant on it.
--
-- (2) The bride portal and the public e-sign page queried tenant tables directly
--     with the anon key and associated records by customer NAME, and the e-sign
--     page fell back to a hard-coded organization id when writing its activity
--     row (mapContract never carried business_id, so the fallback was ALWAYS
--     taken -- every e-signature was logged against a foreign tenant).
--
--     Both flows now go through SECURITY DEFINER functions that take the secret
--     token, resolve the customer and the organization FROM THE ROW ITSELF, and
--     return only that customer's records scoped by (business_id, customer_id).

-- 1. Views stop bypassing RLS ------------------------------------------------

ALTER VIEW public.brides SET (security_invoker = true);
ALTER VIEW public.inventory_items SET (security_invoker = true);
ALTER VIEW public.inventory_variants SET (security_invoker = true);

REVOKE ALL ON public.organization_health_scores FROM anon, authenticated;

-- 2. Bride portal bundle ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.portal_get_bride_bundle(
    p_customer_id uuid,
    p_portal_token text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bride public.customers%ROWTYPE;
BEGIN
    IF p_customer_id IS NULL OR COALESCE(BTRIM(p_portal_token), '') = '' THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_bride
      FROM public.customers c
     WHERE c.id = p_customer_id
       AND c.portal_token IS NOT NULL
       AND BTRIM(c.portal_token) <> ''
       AND c.portal_token = p_portal_token;

    -- No row, or a customer with no tenant, is never served.
    IF NOT FOUND OR v_bride.business_id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'bride', to_jsonb(v_bride),
        'appointments', COALESCE((
            SELECT jsonb_agg(to_jsonb(a) ORDER BY a.date)
              FROM public.appointments a
             WHERE a.business_id = v_bride.business_id
               AND a.customer_id = v_bride.id), '[]'::jsonb),
        'invoices', COALESCE((
            SELECT jsonb_agg(to_jsonb(i) ORDER BY i.due_date)
              FROM public.invoices i
             WHERE i.business_id = v_bride.business_id
               AND i.customer_id = v_bride.id), '[]'::jsonb),
        'contracts', COALESCE((
            SELECT jsonb_agg(to_jsonb(ct) ORDER BY ct.created_at DESC)
              FROM public.contracts ct
             WHERE ct.business_id = v_bride.business_id
               AND ct.customer_id = v_bride.id), '[]'::jsonb),
        'alterations', COALESCE((
            SELECT jsonb_agg(to_jsonb(al) ORDER BY al.created_at DESC)
              FROM public.alterations al
             WHERE al.business_id = v_bride.business_id
               AND al.customer_id = v_bride.id), '[]'::jsonb),
        'measurements', COALESCE((
            SELECT jsonb_agg(to_jsonb(m) ORDER BY m.taken_on DESC)
              FROM public.measurements m
             WHERE m.bride_id = v_bride.id), '[]'::jsonb)
    );
END;
$$;

-- 3. Public e-sign ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.portal_get_contract(
    p_contract_id text,
    p_sign_token text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contract public.contracts%ROWTYPE;
BEGIN
    IF COALESCE(BTRIM(p_contract_id), '') = '' OR COALESCE(BTRIM(p_sign_token), '') = '' THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_contract
      FROM public.contracts c
     WHERE c.id = p_contract_id
       AND c.sign_token IS NOT NULL
       AND BTRIM(c.sign_token) <> ''
       AND c.sign_token = p_sign_token;

    IF NOT FOUND OR v_contract.business_id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(v_contract);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_sign_contract(
    p_contract_id text,
    p_sign_token text,
    p_signed_name text,
    p_signed_initials text
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contract public.contracts%ROWTYPE;
    v_name text := BTRIM(COALESCE(p_signed_name, ''));
    v_initials text := UPPER(BTRIM(COALESCE(p_signed_initials, '')));
    v_signed_at timestamptz := NOW();
BEGIN
    IF COALESCE(BTRIM(p_contract_id), '') = '' OR COALESCE(BTRIM(p_sign_token), '') = '' THEN
        RAISE EXCEPTION 'invalid_signing_link' USING ERRCODE = '28000';
    END IF;
    IF LENGTH(v_name) < 3 THEN
        RAISE EXCEPTION 'signed_name_too_short' USING ERRCODE = '22023';
    END IF;
    IF LENGTH(v_initials) < 2 THEN
        RAISE EXCEPTION 'signed_initials_too_short' USING ERRCODE = '22023';
    END IF;

    -- Lock the row so a double submit cannot log the signature twice.
    SELECT * INTO v_contract
      FROM public.contracts c
     WHERE c.id = p_contract_id
       AND c.sign_token IS NOT NULL
       AND BTRIM(c.sign_token) <> ''
       AND c.sign_token = p_sign_token
       FOR UPDATE;

    IF NOT FOUND OR v_contract.business_id IS NULL THEN
        RAISE EXCEPTION 'invalid_signing_link' USING ERRCODE = '28000';
    END IF;

    -- Already signed: return current state, do not re-log.
    IF UPPER(COALESCE(v_contract.status, '')) = 'SIGNED' THEN
        RETURN to_jsonb(v_contract);
    END IF;

    UPDATE public.contracts
       SET status = 'Signed',
           signed_name = v_name,
           signed_initials = v_initials,
           signed_at = v_signed_at
     WHERE id = v_contract.id
    RETURNING * INTO v_contract;

    -- Activity row, tenant derived from the contract -- never from the client.
    INSERT INTO public.messages (
        business_id, customer, channel, to_address, subject, body, content,
        kind, status, direction, sent_at
    ) VALUES (
        v_contract.business_id,
        v_contract.customer,
        'email',
        'e-sign',
        'Contract ' || v_contract.id || ' signed',
        v_name || ' electronically signed purchase agreement ' || v_contract.id
            || ' (' || COALESCE(v_contract.gown, '') || ').',
        v_name || ' electronically signed purchase agreement ' || v_contract.id
            || ' (' || COALESCE(v_contract.gown, '') || ').',
        'contract',
        'sent',
        'inbound',
        v_signed_at
    );

    RETURN to_jsonb(v_contract);
END;
$$;

-- 4. Exposure -----------------------------------------------------------------

REVOKE ALL ON FUNCTION public.portal_get_bride_bundle(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_get_contract(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_sign_contract(text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.portal_get_bride_bundle(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_contract(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_sign_contract(text, text, text, text) TO anon, authenticated;
