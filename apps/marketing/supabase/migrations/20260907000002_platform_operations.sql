-- Phase 4: Operations, Health & Incidents
-- support_tickets is intentionally not redefined here. Its canonical tenant column
-- is business_id and the table is created earlier by 20260819000000_customer_success_and_support.sql.

CREATE TABLE IF NOT EXISTS public.platform_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  affected_scope TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_incidents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.platform_failed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('FAILED', 'RETRYING', 'MANUAL_REVIEW', 'PROCESSING')),
  attempts INTEGER DEFAULT 1,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_failed_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
