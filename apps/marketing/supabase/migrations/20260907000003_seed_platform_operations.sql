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

-- support_tickets predates Platform Operations and is canonically tenant-scoped by
-- business_id. Repair only the stale partial-schema variant that used tenant_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'tenant_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.support_tickets RENAME COLUMN tenant_id TO business_id;
  END IF;
END $$;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
