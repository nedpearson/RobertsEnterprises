-- Portal customer identity: replace name-based record association with customer_id.
--
-- The bride portal authenticated on (customer id + portal token) and then loaded
-- appointments / invoices / contracts / alterations by matching the customer's
-- NAME. Two customers with the same name -- in the same tenant or, worse, in two
-- different tenants -- would cross-load each other's records.
--
-- This migration gives every one of those tables a canonical customer_id and
-- backfills it CONSERVATIVELY: a row is linked only when its (business_id, name)
-- resolves to exactly one customer. Everything else is written to
-- customer_link_quarantine for manual resolution. Nothing is guessed.
--
-- customer_id is intentionally left NULLABLE here. It is promoted to NOT NULL in
-- a follow-up migration once quarantine is empty in production.

-- 1. Canonical column -------------------------------------------------------

ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- alterations.customer_id already exists (20260830000004); appointments and
-- invoices carry it from core_schema. Indexes are what the portal reads on.

CREATE INDEX IF NOT EXISTS idx_contracts_business_customer_id
    ON public.contracts(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_alterations_business_customer_id
    ON public.alterations(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business_customer_id
    ON public.appointments(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_customer_id
    ON public.invoices(business_id, customer_id);

-- 2. Quarantine for rows the backfill refuses to guess ------------------------

CREATE TABLE IF NOT EXISTS public.customer_link_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    customer_name TEXT,
    reason TEXT NOT NULL CHECK (reason IN ('AMBIGUOUS', 'UNMATCHED', 'NULL_TENANT')),
    candidate_count INTEGER NOT NULL DEFAULT 0,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_link_quarantine_open
    ON public.customer_link_quarantine(business_id, source_table)
    WHERE resolved_at IS NULL;

ALTER TABLE public.customer_link_quarantine ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can read customer link quarantine" ON public.customer_link_quarantine;
DROP POLICY IF EXISTS "Managers can resolve customer link quarantine" ON public.customer_link_quarantine;

CREATE POLICY "Managers can read customer link quarantine"
ON public.customer_link_quarantine FOR SELECT
USING (public.is_super_admin() OR public.is_business_manager(business_id));

CREATE POLICY "Managers can resolve customer link quarantine"
ON public.customer_link_quarantine FOR UPDATE
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

-- No INSERT/DELETE policy: rows are written by this migration and by
-- service-role maintenance jobs, both of which bypass RLS.

-- 3. Conservative backfill ---------------------------------------------------

DO $backfill$
DECLARE
    v_table TEXT;
    v_linked INTEGER;
    v_quarantined INTEGER;
BEGIN
    FOREACH v_table IN ARRAY ARRAY['contracts', 'alterations', 'appointments', 'invoices']
    LOOP
        -- Link only where (business_id, normalized name) is unambiguous.
        EXECUTE format($fmt$
            WITH unique_customer AS (
                SELECT business_id,
                       LOWER(BTRIM(name)) AS name_key,
                       (ARRAY_AGG(id))[1]  AS customer_id,
                       COUNT(*)           AS candidate_count
                FROM public.customers
                WHERE business_id IS NOT NULL
                  AND NULLIF(BTRIM(name), '') IS NOT NULL
                GROUP BY business_id, LOWER(BTRIM(name))
            )
            UPDATE public.%I t
               SET customer_id = u.customer_id
              FROM unique_customer u
             WHERE t.customer_id IS NULL
               AND t.business_id IS NOT NULL
               AND NULLIF(BTRIM(t.customer), '') IS NOT NULL
               AND u.candidate_count = 1
               AND u.business_id = t.business_id
               AND u.name_key = LOWER(BTRIM(t.customer))
        $fmt$, v_table);
        GET DIAGNOSTICS v_linked = ROW_COUNT;

        -- Everything still unlinked is recorded, never guessed.
        EXECUTE format($fmt$
            WITH candidates AS (
                SELECT business_id,
                       LOWER(BTRIM(name)) AS name_key,
                       COUNT(*)           AS candidate_count
                FROM public.customers
                WHERE business_id IS NOT NULL
                GROUP BY business_id, LOWER(BTRIM(name))
            )
            INSERT INTO public.customer_link_quarantine
                (business_id, source_table, source_id, customer_name, reason, candidate_count)
            SELECT t.business_id,
                   %L,
                   t.id::text,
                   t.customer,
                   CASE
                       WHEN t.business_id IS NULL THEN 'NULL_TENANT'
                       WHEN COALESCE(c.candidate_count, 0) > 1 THEN 'AMBIGUOUS'
                       ELSE 'UNMATCHED'
                   END,
                   COALESCE(c.candidate_count, 0)
              FROM public.%I t
              LEFT JOIN candidates c
                     ON c.business_id = t.business_id
                    AND c.name_key = LOWER(BTRIM(t.customer))
             WHERE t.customer_id IS NULL
            ON CONFLICT (source_table, source_id) DO NOTHING
        $fmt$, v_table, v_table);
        GET DIAGNOSTICS v_quarantined = ROW_COUNT;

        RAISE NOTICE 'customer_id backfill: % linked=% quarantined=%', v_table, v_linked, v_quarantined;
    END LOOP;
END
$backfill$;
