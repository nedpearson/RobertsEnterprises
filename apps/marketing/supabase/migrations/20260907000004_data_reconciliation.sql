-- VowOS Platform Data Reconciliation & Integrity Pass

-- 1. Ensure all businesses have a default subscription if missing
INSERT INTO public.organization_subscriptions (business_id, plan_id, status)
SELECT 
    id as business_id, 
    'starter' as plan_id, 
    'ACTIVE' as status
FROM public.businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_subscriptions ts WHERE ts.business_id = b.id
)
AND b.parent_id IS NULL;

-- 2. Clean up duplicate subscriptions (Keep newest, delete older ones for the same org)
WITH ranked_subs AS (
    SELECT id, business_id, ROW_NUMBER() OVER (PARTITION BY business_id ORDER BY created_at DESC) as rn
    FROM public.organization_subscriptions
)
DELETE FROM public.organization_subscriptions
WHERE id IN (
    SELECT id FROM ranked_subs WHERE rn > 1
);

-- 3. Ensure all businesses have at least one location (Main Store)
INSERT INTO public.locations (id, business_id, name, address)
SELECT 
    gen_random_uuid(), 
    id, 
    'Main Store', 
    '123 Default St'
FROM public.businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM public.locations l WHERE l.business_id = b.id
)
AND b.parent_id IS NULL;

-- 4. Orphaned user memberships cleanup (memberships pointing to non-existent businesses)
DELETE FROM public.business_memberships
WHERE business_id NOT IN (SELECT id FROM public.businesses);

-- 5. Remove orphaned locations
DELETE FROM public.locations
WHERE business_id NOT IN (SELECT id FROM public.businesses);

-- 6. Ensure all support tickets link to a valid tenant (if support_tickets has tenant_id)
-- Skipping unless certain, but safe if it exists.
-- DELETE FROM public.support_tickets WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM public.businesses);

-- 7. Force RLS enforcement on any table that missed it
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

