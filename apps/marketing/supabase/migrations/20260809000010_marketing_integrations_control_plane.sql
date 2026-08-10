-- 20260809000010_marketing_integrations_control_plane.sql
-- Production integration control plane for Growth & Marketing.
-- Tokens are encrypted by the worker before persistence; the browser never receives them.

ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS auth_method TEXT,
  ADD COLUMN IF NOT EXISTS external_organization_id TEXT,
  ADD COLUMN IF NOT EXISTS external_organization_name TEXT,
  ADD COLUMN IF NOT EXISTS external_organization_type TEXT,
  ADD COLUMN IF NOT EXISTS access_token_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS granted_scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS selected_resources JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_mappings TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS location_mappings TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS health_evidence JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credential_version INTEGER NOT NULL DEFAULT 1;

-- Do not use the legacy plaintext token columns for new connections. Existing values are
-- intentionally not auto-migrated because the worker cannot safely encrypt them in SQL.
COMMENT ON COLUMN integrations.access_token IS 'LEGACY ONLY: do not write new secrets here; use access_token_ciphertext.';
COMMENT ON COLUMN integrations.refresh_token IS 'LEGACY ONLY: do not write new secrets here; use refresh_token_ciphertext.';
COMMENT ON COLUMN integrations.access_token_ciphertext IS 'AES-256-GCM ciphertext generated server-side by the marketing worker.';
COMMENT ON COLUMN integrations.refresh_token_ciphertext IS 'AES-256-GCM ciphertext generated server-side by the marketing worker.';

CREATE TABLE IF NOT EXISTS integration_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  state_hash TEXT NOT NULL UNIQUE,
  redirect_to TEXT NOT NULL,
  provider_context JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_oauth_states_business_provider
  ON integration_oauth_states (business_id, provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_oauth_states_expiry
  ON integration_oauth_states (expires_at);

ALTER TABLE integration_oauth_states ENABLE ROW LEVEL SECURITY;
-- OAuth state is intentionally server-only. The service-role worker owns all reads/writes.

CREATE TABLE IF NOT EXISTS integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_event_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  UNIQUE (business_id, provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_events_business_provider_received
  ON integration_events (business_id, provider, received_at DESC);

ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Integration events readable by business members" ON integration_events
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_memberships WHERE user_id = auth.uid()
    )
  );

-- Tighten integration mutations: ordinary staff may inspect connection health, but only
-- Owner/Manager membership can alter provider credentials or connection state.
DROP POLICY IF EXISTS "Enable modify for business members" ON integrations;
CREATE POLICY "Owners and managers manage integrations" ON integrations
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id
      FROM business_memberships
      WHERE user_id = auth.uid()
        AND lower(role) IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id
      FROM business_memberships
      WHERE user_id = auth.uid()
        AND lower(role) IN ('owner', 'manager')
    )
  );

-- Remove the misleading demo Stripe connection that the original integration migration
-- inserted into whichever business happened to be first. Demo data should be seeded in the
-- dedicated demo data plane instead of being mixed into production connection truth.
DELETE FROM integrations
WHERE provider = 'stripe'
  AND webhook_id = 'we_123456789'
  AND access_token IS NULL
  AND refresh_token IS NULL;
