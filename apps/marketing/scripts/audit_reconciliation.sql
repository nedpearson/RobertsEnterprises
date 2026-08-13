-- VowOS Production Audit: Financial & Inventory Reconciliation
-- Manual SQL companion to scripts/run_audit.cjs.
-- All checks below should return zero rows in a healthy production database.

BEGIN;

-- 1. Invoices vs Paid Amount Reconciliation
SELECT
    id,
    amount_cents,
    paid_cents,
    status
FROM public.invoices
WHERE (status = 'Paid' AND paid_cents < amount_cents)
   OR (paid_cents > amount_cents);

-- 2. Customer 360 LTV Reconciliation
-- Join by canonical customer_id, never by customer name.
SELECT
    c.id AS customer_id,
    c.spend_cents AS cached_ltv,
    COALESCE(SUM(i.paid_cents), 0) AS computed_ltv
FROM public.customers c
LEFT JOIN public.invoices i ON i.customer_id = c.id
GROUP BY c.id, c.spend_cents
HAVING c.spend_cents != COALESCE(SUM(i.paid_cents), 0);

-- 3. Inventory sanity check
SELECT
    g.id AS gown_id,
    g.stock AS cached_stock
FROM public.gowns g
WHERE g.stock < 0;

COMMIT;
