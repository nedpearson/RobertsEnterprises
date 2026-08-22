-- ============================================================================
-- 20260911000000_integration_operations_and_recovery.sql
-- Milestone 1: Database Schema for Integration Operations & Auto-Recovery
-- ============================================================================

-- Ensure uuid-ossp or pgcrypto is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENHANCE provider_connections TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.provider_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES public.business_brands(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    capabilities JSONB DEFAULT '{}'::jsonb,
    auth_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.provider_connections
    ADD COLUMN IF NOT EXISTS health_status TEXT NOT NULL DEFAULT 'HEALTHY',
    ADD COLUMN IF NOT EXISTS circuit_breaker_state TEXT NOT NULL DEFAULT 'CLOSED',
    ADD COLUMN IF NOT EXISTS auth_state TEXT NOT NULL DEFAULT 'AUTHORIZED',
    ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_successful_sync_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error_code TEXT,
    ADD COLUMN IF NOT EXISTS last_error_message TEXT,
    ADD COLUMN IF NOT EXISTS last_error_category TEXT,
    ADD COLUMN IF NOT EXISTS sync_errors_24h INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS recovery_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_recovery_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reconnect_url TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Indexes on provider_connections
CREATE INDEX IF NOT EXISTS idx_provider_connections_health ON public.provider_connections(health_status);
CREATE INDEX IF NOT EXISTS idx_provider_connections_circuit ON public.provider_connections(circuit_breaker_state);
CREATE INDEX IF NOT EXISTS idx_provider_connections_business_provider ON public.provider_connections(business_id, provider);
CREATE INDEX IF NOT EXISTS idx_provider_connections_brand ON public.provider_connections(brand_id);
CREATE INDEX IF NOT EXISTS idx_provider_connections_location ON public.provider_connections(location_id);

-- ============================================================================
-- 2. INTEGRATION CIRCUIT BREAKERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_circuit_breakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'ACCOUNT' CHECK (scope IN ('GLOBAL', 'ACCOUNT', 'TENANT')),
    scope_id TEXT NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
    failure_count INTEGER NOT NULL DEFAULT 0,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    cooldown_expires_at TIMESTAMPTZ,
    cooldown_seconds INTEGER NOT NULL DEFAULT 60,
    is_provider_outage BOOLEAN NOT NULL DEFAULT false,
    last_error_message TEXT,
    last_error_category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_circuit_breakers_provider_scope UNIQUE (provider, scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_circuit_breakers_lookup ON public.integration_circuit_breakers(provider, scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_state ON public.integration_circuit_breakers(state);
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_business ON public.integration_circuit_breakers(business_id);

-- ============================================================================
-- 3. INTEGRATION SYNC CURSORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_sync_cursors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- e.g. 'orders', 'messages', 'appointments', 'inventory', 'customers'
    last_cursor TEXT, -- High-water mark cursor value or timestamp
    last_sync_timestamp TIMESTAMPTZ,
    buffer_seconds INTEGER NOT NULL DEFAULT 120,
    sync_status TEXT NOT NULL DEFAULT 'IDLE' CHECK (sync_status IN ('IDLE', 'SYNCING', 'FAILED', 'RECOVERING')),
    records_synced_total INTEGER NOT NULL DEFAULT 0,
    records_synced_last_run INTEGER NOT NULL DEFAULT 0,
    lock_acquired_at TIMESTAMPTZ,
    lock_expires_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_sync_cursors_conn_resource UNIQUE (provider_connection_id, resource_type)
);

CREATE INDEX IF NOT EXISTS idx_sync_cursors_conn_resource ON public.integration_sync_cursors(provider_connection_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_sync_cursors_business ON public.integration_sync_cursors(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_cursors_status ON public.integration_sync_cursors(sync_status);

-- ============================================================================
-- 4. INTEGRATION ERROR LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE SET NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    endpoint TEXT,
    status_code INTEGER,
    failure_category TEXT NOT NULL, -- e.g. 'AUTH_REVOKED', 'RATE_LIMITED', 'WEBHOOK_MISSING', 'TRANSIENT_5XX', etc.
    error_message TEXT NOT NULL,
    root_cause TEXT,
    suggested_action TEXT,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    sanitized_headers JSONB DEFAULT '{}'::jsonb,
    is_auto_repairable BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolution_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_conn ON public.integration_error_logs(provider_connection_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_business ON public.integration_error_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_provider ON public.integration_error_logs(provider);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.integration_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON public.integration_error_logs(failure_category);

-- ============================================================================
-- 5. INTEGRATION RECOVERY TIMELINES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_recovery_timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'DIAGNOSTIC_RUN', 'WEBHOOK_RECREATED', 'WATCH_RENEWED', 'TOKEN_REFRESHED', 'RECONCILIATION_RUN', 'MANUAL_INTERVENTION_REQUESTED', 'CIRCUIT_TRIPPED', 'CIRCUIT_RESET'
    trigger TEXT NOT NULL DEFAULT 'AUTOMATIC', -- 'AUTOMATIC', 'SCHEDULED_CRON', 'WEBHOOK_ERROR', 'OPERATOR_MANUAL', 'RECONNECT_CALLBACK'
    previous_status TEXT NOT NULL,
    resulting_status TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    success BOOLEAN NOT NULL DEFAULT true,
    duration_ms INTEGER DEFAULT 0,
    executed_by TEXT DEFAULT 'SYSTEM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_timelines_conn ON public.integration_recovery_timelines(provider_connection_id);
CREATE INDEX IF NOT EXISTS idx_recovery_timelines_business ON public.integration_recovery_timelines(business_id);
CREATE INDEX IF NOT EXISTS idx_recovery_timelines_created ON public.integration_recovery_timelines(created_at DESC);

-- ============================================================================
-- 6. INTEGRATION DEAD LETTER QUEUE (DLQ) EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_dlq_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE SET NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL, -- e.g. 'orders/create', 'messages/receive', 'calendar/sync'
    idempotency_key TEXT,
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}'::jsonb,
    error_message TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'REPLAYED', 'EXHAUSTED', 'DISCARDED')),
    replay_result JSONB DEFAULT '{}'::jsonb,
    replayed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dlq_events_conn ON public.integration_dlq_events(provider_connection_id);
CREATE INDEX IF NOT EXISTS idx_dlq_events_business ON public.integration_dlq_events(business_id);
CREATE INDEX IF NOT EXISTS idx_dlq_events_status_retry ON public.integration_dlq_events(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_dlq_events_idempotency ON public.integration_dlq_events(idempotency_key);

-- ============================================================================
-- 7. GOOGLE DRIVE WATCHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.google_drive_watches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL UNIQUE,
    resource_id TEXT NOT NULL,
    resource_uri TEXT,
    expiration_timestamp TIMESTAMPTZ NOT NULL,
    token TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED', 'REVOKED', 'FAILED')),
    last_renewed_at TIMESTAMPTZ,
    renewal_error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_drive_watches_channel ON public.google_drive_watches(channel_id);
CREATE INDEX IF NOT EXISTS idx_google_drive_watches_conn ON public.google_drive_watches(provider_connection_id);
CREATE INDEX IF NOT EXISTS idx_google_drive_watches_business ON public.google_drive_watches(business_id);
CREATE INDEX IF NOT EXISTS idx_google_drive_watches_exp ON public.google_drive_watches(expiration_timestamp, status);

-- ============================================================================
-- 8. IDEMPOTENT UNIQUE INDEXES ON CORE TABLES
-- ============================================================================

-- 8.1 orders idempotency indexes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_business_channel_external ON public.orders (business_id, channel_id, external_order_id) WHERE external_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_business_external ON public.orders (business_id, external_order_id) WHERE external_order_id IS NOT NULL AND channel_id IS NULL;

-- 8.2 omnichannel_inbox idempotency indexes
ALTER TABLE public.omnichannel_inbox ADD COLUMN IF NOT EXISTS external_message_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_omnichannel_inbox_conn_external_msg ON public.omnichannel_inbox (provider_connection_id, external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_omnichannel_inbox_business ON public.omnichannel_inbox (business_id);

-- 8.3 appointments idempotency indexes
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS external_appointment_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_business_external ON public.appointments (business_id, external_appointment_id) WHERE external_appointment_id IS NOT NULL;

-- ============================================================================
-- 9. TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_circuit_breakers_updated_at ON public.integration_circuit_breakers;
CREATE TRIGGER update_circuit_breakers_updated_at
BEFORE UPDATE ON public.integration_circuit_breakers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_cursors_updated_at ON public.integration_sync_cursors;
CREATE TRIGGER update_sync_cursors_updated_at
BEFORE UPDATE ON public.integration_sync_cursors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dlq_events_updated_at ON public.integration_dlq_events;
CREATE TRIGGER update_dlq_events_updated_at
BEFORE UPDATE ON public.integration_dlq_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_google_drive_watches_updated_at ON public.google_drive_watches;
CREATE TRIGGER update_google_drive_watches_updated_at
BEFORE UPDATE ON public.google_drive_watches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.integration_circuit_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_recovery_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_dlq_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_watches ENABLE ROW LEVEL SECURITY;

-- 10.1 integration_circuit_breakers RLS
DROP POLICY IF EXISTS "Super admins have full access to circuit breakers" ON public.integration_circuit_breakers;
CREATE POLICY "Super admins have full access to circuit breakers" ON public.integration_circuit_breakers
    FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Tenants can view their circuit breakers" ON public.integration_circuit_breakers;
CREATE POLICY "Tenants can view their circuit breakers" ON public.integration_circuit_breakers
    FOR SELECT USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']) OR public.is_super_admin());

DROP POLICY IF EXISTS "Managers can update their circuit breakers" ON public.integration_circuit_breakers;
CREATE POLICY "Managers can update their circuit breakers" ON public.integration_circuit_breakers
    FOR ALL USING ((business_id IS NOT NULL AND public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])) OR public.is_super_admin());

-- 10.2 integration_sync_cursors RLS
DROP POLICY IF EXISTS "Super admins have full access to sync cursors" ON public.integration_sync_cursors;
CREATE POLICY "Super admins have full access to sync cursors" ON public.integration_sync_cursors
    FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Tenants can view their sync cursors" ON public.integration_sync_cursors;
CREATE POLICY "Tenants can view their sync cursors" ON public.integration_sync_cursors
    FOR SELECT USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']) OR public.is_super_admin());

DROP POLICY IF EXISTS "Managers can update their sync cursors" ON public.integration_sync_cursors;
CREATE POLICY "Managers can update their sync cursors" ON public.integration_sync_cursors
    FOR ALL USING ((business_id IS NOT NULL AND public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])) OR public.is_super_admin());

-- 10.3 integration_error_logs RLS
DROP POLICY IF EXISTS "Super admins have full access to error logs" ON public.integration_error_logs;
CREATE POLICY "Super admins have full access to error logs" ON public.integration_error_logs
    FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Tenants can view their error logs" ON public.integration_error_logs;
CREATE POLICY "Tenants can view their error logs" ON public.integration_error_logs
    FOR SELECT USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']) OR public.is_super_admin());

DROP POLICY IF EXISTS "Managers can manage their error logs" ON public.integration_error_logs;
CREATE POLICY "Managers can manage their error logs" ON public.integration_error_logs
    FOR ALL USING ((business_id IS NOT NULL AND public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])) OR public.is_super_admin());

-- 10.4 integration_recovery_timelines RLS
DROP POLICY IF EXISTS "Super admins have full access to recovery timelines" ON public.integration_recovery_timelines;
CREATE POLICY "Super admins have full access to recovery timelines" ON public.integration_recovery_timelines
    FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Tenants can view their recovery timelines" ON public.integration_recovery_timelines;
CREATE POLICY "Tenants can view their recovery timelines" ON public.integration_recovery_timelines
    FOR SELECT USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']) OR public.is_super_admin());

DROP POLICY IF EXISTS "Managers can manage their recovery timelines" ON public.integration_recovery_timelines;
CREATE POLICY "Managers can manage their recovery timelines" ON public.integration_recovery_timelines
    FOR ALL USING ((business_id IS NOT NULL AND public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])) OR public.is_super_admin());

-- 10.5 integration_dlq_events RLS
DROP POLICY IF EXISTS "Super admins have full access to dlq events" ON public.integration_dlq_events;
CREATE POLICY "Super admins have full access to dlq events" ON public.integration_dlq_events
    FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Tenants can view their dlq events" ON public.integration_dlq_events;
CREATE POLICY "Tenants can view their dlq events" ON public.integration_dlq_events
    FOR SELECT USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']) OR public.is_super_admin());

DROP POLICY IF EXISTS "Managers can manage their dlq events" ON public.integration_dlq_events;
CREATE POLICY "Managers can manage their dlq events" ON public.integration_dlq_events
    FOR ALL USING ((business_id IS NOT NULL AND public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])) OR public.is_super_admin());

-- 10.6 google_drive_watches RLS
DROP POLICY IF EXISTS "Super admins have full access to google drive watches" ON public.google_drive_watches;
CREATE POLICY "Super admins have full access to google drive watches" ON public.google_drive_watches
    FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Tenants can view their google drive watches" ON public.google_drive_watches;
CREATE POLICY "Tenants can view their google drive watches" ON public.google_drive_watches
    FOR SELECT USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']) OR public.is_super_admin());

DROP POLICY IF EXISTS "Managers can manage their google drive watches" ON public.google_drive_watches;
CREATE POLICY "Managers can manage their google drive watches" ON public.google_drive_watches
    FOR ALL USING ((business_id IS NOT NULL AND public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])) OR public.is_super_admin());

-- 10.7 Super Admins full access policy for provider_connections
DROP POLICY IF EXISTS "Super admins have full access to provider_connections" ON public.provider_connections;
CREATE POLICY "Super admins have full access to provider_connections" ON public.provider_connections
    FOR ALL USING (public.is_super_admin());

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
