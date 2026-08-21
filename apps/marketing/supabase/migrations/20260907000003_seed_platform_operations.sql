-- Seed Platform Operations and Health
-- Run this securely so that we have realistic integrations, incidents, and failed jobs

-- 1. Seed Integrations for existing businesses
INSERT INTO public.integration_sync_status (organization_id, integration_type, status, last_successful_sync, last_attempt, records_processed)
SELECT 
    b.id,
    'SHOPIFY',
    CASE WHEN random() < 0.9 THEN 'LIVE' ELSE 'FAILED' END,
    now() - interval '1 hour' * random() * 24,
    now() - interval '5 minutes' * random(),
    floor(random() * 5000)
FROM public.businesses b
WHERE b.parent_id IS NULL
ON CONFLICT (organization_id, integration_type) DO NOTHING;

INSERT INTO public.integration_sync_status (organization_id, integration_type, status, last_successful_sync, last_attempt, records_processed)
SELECT 
    b.id,
    'STRIPE',
    CASE WHEN random() < 0.95 THEN 'LIVE' ELSE 'FAILED' END,
    now() - interval '1 hour' * random() * 12,
    now() - interval '5 minutes' * random(),
    floor(random() * 1000)
FROM public.businesses b
WHERE b.parent_id IS NULL
ON CONFLICT (organization_id, integration_type) DO NOTHING;

INSERT INTO public.integration_sync_status (organization_id, integration_type, status, last_successful_sync, last_attempt, records_processed)
SELECT 
    b.id,
    'GOOGLE BUSINESS',
    CASE WHEN random() < 0.8 THEN 'LIVE' ELSE 'FAILED' END,
    now() - interval '1 hour' * random() * 72,
    now() - interval '1 hour' * random() * 24,
    0
FROM public.businesses b
WHERE b.parent_id IS NULL
ON CONFLICT (organization_id, integration_type) DO NOTHING;

-- 2. Seed Failed Jobs
INSERT INTO public.platform_failed_jobs (org, type, status, attempts, error_message, next_retry)
SELECT 
    b.name,
    CASE WHEN random() < 0.5 THEN 'SHOPIFY_ORDER_SYNC' ELSE 'STRIPE_WEBHOOK' END,
    'FAILED',
    floor(random() * 5) + 1,
    'Connection timeout during bulk synchronization upstream.',
    now() + interval '1 hour' * random()
FROM public.businesses b
WHERE b.parent_id IS NULL AND random() < 0.3;

-- 3. Seed Incidents
INSERT INTO public.platform_incidents (title, description, severity, status)
VALUES 
('Shopify API Rate Limiting', 'Multiple tenants experiencing degraded sync performance due to upstream rate limits.', 'MEDIUM', 'INVESTIGATING'),
('Webhook Processing Delay', 'Stripe webhook queue is backing up, causing delay in payment status updates.', 'LOW', 'OPEN');
