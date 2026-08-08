-- Migration: Init Autonomous Marketing Operations Schema

-- 1. provider_connections
CREATE TABLE IF NOT EXISTS provider_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL, -- e.g. 'shopify', 'meta', 'google'
    brand VARCHAR(100) NOT NULL, -- e.g. 'Proper & Company'
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected',
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(provider, brand)
);

-- 2. marketing_budgets
CREATE TABLE IF NOT EXISTS marketing_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    location VARCHAR(100), -- 'Baton Rouge' or 'Covington' or NULL for global
    platform VARCHAR(50) NOT NULL,
    monthly_limit_cents BIGINT NOT NULL,
    daily_limit_cents BIGINT,
    warning_threshold_percent INTEGER DEFAULT 80,
    hard_stop_percent INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. marketing_campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    objective VARCHAR(100),
    budget_cents BIGINT,
    spent_cents BIGINT DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. automation_rules
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    execution_level INTEGER NOT NULL, -- 1=Recommend, 2=Approval Required, 3=Autonomous
    max_financial_exposure_cents BIGINT,
    is_active BOOLEAN DEFAULT true,
    last_executed_at TIMESTAMPTZ,
    execution_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. durable_jobs (Background worker queue)
CREATE TABLE IF NOT EXISTS durable_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, dead-letter
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(255),
    error_message TEXT,
    error_code VARCHAR(100),
    next_retry_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    brand VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    user_id UUID, -- NULL if autonomous
    before_value JSONB,
    after_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
