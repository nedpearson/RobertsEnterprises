-- 20260807000006_integrations.sql

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- e.g., 'stripe', 'quickbooks', 'twilio'
    status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    access_token TEXT,
    refresh_token TEXT,
    webhook_id TEXT,
    webhook_secret TEXT,
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (business_id, provider)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for business members" ON integrations
    FOR SELECT
    USING (
        business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    );

CREATE POLICY "Enable modify for business members" ON integrations
    FOR ALL
    USING (
        business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    );

-- Insert dummy data for demo business so it's not empty
INSERT INTO integrations (business_id, provider, status, webhook_id, last_sync_at)
SELECT id, 'stripe', 'connected', 'we_123456789', NOW()
FROM businesses
LIMIT 1
ON CONFLICT (business_id, provider) DO NOTHING;
