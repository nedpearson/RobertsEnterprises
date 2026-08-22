-- Harden public contract and bride-portal scoping around canonical customer UUIDs.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_business_customer
  ON public.contracts (business_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_alterations_business_customer
  ON public.alterations (business_id, customer_id);

WITH contract_matches AS (
  SELECT
    ct.id AS contract_id,
    MIN(c.id::text)::uuid AS customer_id,
    COUNT(*) AS match_count
  FROM public.contracts ct
  JOIN public.customers c
    ON c.business_id = ct.business_id
   AND LOWER(BTRIM(c.name)) = LOWER(BTRIM(ct.customer))
  WHERE ct.customer_id IS NULL
  GROUP BY ct.id
)
UPDATE public.contracts ct
   SET customer_id = cm.customer_id
  FROM contract_matches cm
 WHERE ct.id = cm.contract_id
   AND cm.match_count = 1
   AND ct.customer_id IS NULL;

WITH alteration_matches AS (
  SELECT
    alt.id AS alteration_id,
    MIN(c.id::text)::uuid AS customer_id,
    COUNT(*) AS match_count
  FROM public.alterations alt
  JOIN public.customers c
    ON c.business_id = alt.business_id
   AND LOWER(BTRIM(c.name)) = LOWER(BTRIM(alt.customer))
  WHERE alt.customer_id IS NULL
  GROUP BY alt.id
)
UPDATE public.alterations alt
   SET customer_id = am.customer_id
  FROM alteration_matches am
 WHERE alt.id = am.alteration_id
   AND am.match_count = 1
   AND alt.customer_id IS NULL;
