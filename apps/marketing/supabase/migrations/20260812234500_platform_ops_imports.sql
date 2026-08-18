-- Phase 9 & 10 Operational Telemetry & Migration Tables

-- 1. Platform Incidents
CREATE TABLE IF NOT EXISTS platform_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity VARCHAR(10) NOT NULL, -- SEV-1, SEV-2, SEV-3
  status VARCHAR(20) NOT NULL, -- OPEN, INVESTIGATING, MONITORING, RESOLVED
  title TEXT NOT NULL,
  affected_scope TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Failed Jobs (Dead Letter Queue)
CREATE TABLE IF NOT EXISTS platform_failed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- FAILED, RETRYING, MANUAL_REVIEW
  attempts INT DEFAULT 1,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Data Import Sessions
CREATE TABLE IF NOT EXISTS data_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- customers, products, appointments
  status VARCHAR(20) NOT NULL, -- PENDING, UPLOADED, MAPPED, VALIDATED, DRY_RUN, COMMITTED, FAILED
  total_rows INT DEFAULT 0,
  valid_rows INT DEFAULT 0,
  error_rows INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Data Import Staging Rows
CREATE TABLE IF NOT EXISTS data_import_staging_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES data_import_sessions(id) ON DELETE CASCADE,
  raw_data JSONB NOT NULL,
  mapped_data JSONB,
  validation_errors JSONB,
  status VARCHAR(20) NOT NULL, -- PENDING, VALID, INVALID, COMMITTED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE platform_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_failed_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_staging_rows ENABLE ROW LEVEL SECURITY;

-- Allow super admins to see all platform tables
CREATE POLICY "Super admins can manage incidents" ON platform_incidents FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'platform_role' = 'PLATFORM_OWNER')
);

CREATE POLICY "Super admins can manage failed jobs" ON platform_failed_jobs FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'platform_role' = 'PLATFORM_OWNER')
);

-- Tenant admins can manage their own imports
CREATE POLICY "Tenant users can manage their imports" ON data_import_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM business_memberships bm WHERE bm.business_id = data_import_sessions.business_id AND bm.user_id = auth.uid() AND bm.role IN ('OWNER', 'MANAGER'))
);

CREATE POLICY "Tenant users can manage their staging rows" ON data_import_staging_rows FOR ALL USING (
  EXISTS (
    SELECT 1 FROM data_import_sessions dis 
    JOIN business_memberships bm ON bm.business_id = dis.business_id 
    WHERE dis.id = data_import_staging_rows.session_id AND bm.user_id = auth.uid() AND bm.role IN ('OWNER', 'MANAGER')
  )
);
