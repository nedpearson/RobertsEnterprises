-- VowOS Production Audit: Operating Invariants & Orphan Check
-- Manual SQL companion to scripts/run_audit.cjs.
-- Every count should be zero in a healthy production database.

BEGIN;

-- 1. Customers without businesses
SELECT count(*) AS orphaned_customers
FROM public.customers
WHERE business_id IS NULL;

-- 2. Appointments without businesses
SELECT count(*) AS orphaned_appointments
FROM public.appointments
WHERE business_id IS NULL;

-- 3. Appointments cross-tenant pollution
SELECT count(*) AS cross_tenant_appointments
FROM public.appointments a
JOIN public.customers c ON a.customer_id = c.id
WHERE a.business_id != c.business_id;

-- 4. Inventory without businesses
SELECT count(*) AS orphaned_inventory
FROM public.gowns
WHERE business_id IS NULL;

-- 5. Invoices without businesses
SELECT count(*) AS orphaned_invoices
FROM public.invoices
WHERE business_id IS NULL;

-- 6. Invoices cross-tenant pollution
SELECT count(*) AS cross_tenant_invoices
FROM public.invoices i
JOIN public.customers c ON i.customer_id = c.id
WHERE i.business_id != c.business_id;

-- 7. Purchase orders without businesses
SELECT count(*) AS orphaned_orders
FROM public.purchase_orders
WHERE business_id IS NULL;

-- 8. Assigned-customer purchase orders cross tenant boundaries.
-- The canonical core schema uses purchase_orders.assigned_customer.
SELECT count(*) AS cross_tenant_orders
FROM public.purchase_orders po
JOIN public.customers c ON po.assigned_customer = c.id
WHERE po.business_id != c.business_id;

-- 9. Leads without businesses
SELECT count(*) AS orphaned_leads
FROM public.leads
WHERE business_id IS NULL;

-- 10. Transfers cross tenant boundaries.
SELECT count(*) AS cross_tenant_transfers
FROM public.transfers t
JOIN public.locations l1 ON t.from_location_id = l1.id
JOIN public.locations l2 ON t.to_location_id = l2.id
WHERE l1.business_id != l2.business_id;

-- 11. Messages without businesses
SELECT count(*) AS orphaned_messages
FROM public.messages
WHERE business_id IS NULL;

-- 12. Messages cross-tenant pollution
SELECT count(*) AS cross_tenant_messages
FROM public.messages m
JOIN public.customers c ON m.customer_id = c.id
WHERE m.business_id != c.business_id;

COMMIT;
