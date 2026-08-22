-- Phase 1: Delivery & Recovery Architecture

CREATE TABLE IF NOT EXISTS platform_delivery_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_fingerprint TEXT NOT NULL,
    repository TEXT NOT NULL,
    branch TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    commit_author TEXT,
    workflow TEXT NOT NULL,
    failed_job TEXT,
    failed_step TEXT,
    error_summary TEXT,
    sanitized_logs TEXT,
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (status IN ('DETECTED', 'COLLECTING', 'READY', 'REPAIRING', 'VALIDATING', 'PR_CREATED', 'CI_RUNNING', 'CI_FAILED', 'READY_TO_DEPLOY', 'DEPLOYING', 'VERIFYING', 'RECOVERED', 'ROLLED_BACK', 'BLOCKED', 'ESCALATED')),
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    repair_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_delivery_incidents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS platform_repair_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES platform_delivery_incidents(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    branch_name TEXT NOT NULL,
    antigravity_version TEXT,
    prompt_hash TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'VALIDATING', 'SUCCESS', 'FAILED', 'CIRCUIT_OPEN')),
    files_changed TEXT[],
    validation_results TEXT
);

ALTER TABLE platform_repair_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS platform_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    railway_deployment_id TEXT UNIQUE NOT NULL,
    service TEXT NOT NULL,
    environment TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DEPLOYING', 'VERIFYING', 'HEALTHY', 'DEGRADED', 'ROLLED_BACK', 'FAILED')),
    deployment_started TIMESTAMPTZ,
    deployment_completed TIMESTAMPTZ,
    can_rollback BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_deployments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS platform_automation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'SYSTEM',
    target TEXT,
    result TEXT,
    reason TEXT,
    request_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_automation_audit ENABLE ROW LEVEL SECURITY;

-- RBAC Policies
-- Only Super Admins and the automated internal roles can modify these tables.
CREATE POLICY "Super Admins can manage delivery incidents" ON platform_delivery_incidents FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can manage repair attempts" ON platform_repair_attempts FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can manage deployments" ON platform_deployments FOR ALL USING (is_super_admin());
CREATE POLICY "Super Admins can read automation audit" ON platform_automation_audit FOR SELECT USING (is_super_admin());
