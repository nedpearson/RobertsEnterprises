-- VowOS Production Audit: Operating Invariants & Orphan Check
-- This script validates that all canonical data models obey strict tenant isolation and foreign key integrity.

BEGIN;

-- 1. Customers without businesses
SELECT count(*) as orphaned_customers FROM public.customers WHERE business_id IS NULL;

-- 2. Appointments without businesses
SELECT count(*) as orphaned_appointments FROM public.appointments WHERE business_id IS NULL;

-- 3. Appointments cross-tenant pollution (Appointment business_id != Customer business_id)
SELECT count(*) as cross_tenant_appointments
FROM public.appointments a
JOIN public.customers c ON a.customer_id = c.id
WHERE a.business_id != c.business_id;

-- 4. Inventory (gowns) without businesses
SELECT count(*) as orphaned_inventory FROM public.gowns WHERE business_id IS NULL;

-- 5. Invoices without businesses
SELECT count(*) as orphaned_invoices FROM public.invoices WHERE business_id IS NULL;

-- 6. Invoices cross-tenant pollution
SELECT count(*) as cross_tenant_invoices
FROM public.invoices i
JOIN public.customers c ON i.customer_id = c.id
WHERE i.business_id != c.business_id;

-- 7. Purchase Orders without businesses
SELECT count(*) as orphaned_orders FROM public.purchase_orders WHERE business_id IS NULL;

-- 8. Purchase Orders cross-tenant pollution
SELECT count(*) as cross_tenant_orders
FROM public.purchase_orders po
JOIN public.customers c ON po.customer_id = c.id
WHERE po.business_id != c.business_id;

-- 9. Leads without businesses
SELECT count(*) as orphaned_leads FROM public.leads WHERE business_id IS NULL;

-- 10. Transfers cross-tenant pollution (from location and to location must be in same business)
SELECT count(*) as cross_tenant_transfers
FROM public.transfers t
JOIN public.locations l1 ON t.from_location_id = l1.id
JOIN public.locations l2 ON t.to_location_id = l2.id
WHERE l1.business_id != l2.business_id;

-- 11. Messages without businesses
SELECT count(*) as orphaned_messages FROM public.messages WHERE business_id IS NULL;

-- 12. Messages cross-tenant pollution
SELECT count(*) as cross_tenant_messages
FROM public.messages m
JOIN public.customers c ON m.customer_id = c.id
WHERE m.business_id != c.business_id;

COMMIT;
