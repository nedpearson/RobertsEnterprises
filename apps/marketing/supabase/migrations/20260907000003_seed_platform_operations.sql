-- Compatibility repair for Platform Operations schema.
--
-- An earlier migration-version collision could cause an existing database to record
-- version 20260907000002 without applying the Platform Operations tables. Keep this
-- migration idempotent so both fresh and partially-applied databases converge on the
-- same schema.
--
-- IMPORTANT: This migration intentionally seeds no incidents, integration health,
-- failed jobs, tickets, or other synthetic production data. Operational state must be
-- derived only from real provider activity and real platform events.

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

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
