/**
 * Shared Type Definitions for VowOS Integration Operations & Auto-Recovery System
 * Backend Worker Contracts & Recovery Engine Interfaces
 */

export type IntegrationHealthStatus = 'HEALTHY' | 'RECOVERING' | 'ACTION_REQUIRED' | 'DEGRADED';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CircuitScope = 'GLOBAL' | 'ACCOUNT' | 'TENANT';

export type AuthState = 'AUTHORIZED' | 'EXPIRED' | 'REVOKED' | 'PENDING' | 'REAUTH_REQUIRED';

export type FailureCategory =
  | 'AUTH_REVOKED'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'WEBHOOK_MISSING'
  | 'WEBHOOK_MISCONFIGURED'
  | 'SCHEMA_DRIFT'
  | 'SCHEMA_MISMATCH'
  | 'PROVIDER_OUTAGE'
  | 'RESOURCE_NOT_FOUND'
  | 'CHANNEL_EXPIRED'
  | 'SCOPE_INSUFFICIENT'
  | 'TRANSIENT_5XX'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export type RecoveryActionType =
  | 'DIAGNOSTIC_RUN'
  | 'WEBHOOK_RECREATED'
  | 'WATCH_RENEWED'
  | 'TOKEN_REFRESHED'
  | 'RECONCILIATION_RUN'
  | 'MANUAL_INTERVENTION_REQUESTED'
  | 'CIRCUIT_TRIPPED'
  | 'CIRCUIT_RESET'
  | 'RECONNECT_URL_GENERATED';

export type RecoveryTrigger =
  | 'AUTOMATIC'
  | 'SCHEDULED_CRON'
  | 'WEBHOOK_ERROR'
  | 'OPERATOR_MANUAL'
  | 'RECONNECT_CALLBACK';

export type DLQEventStatus = 'PENDING' | 'PROCESSING' | 'REPLAYED' | 'EXHAUSTED' | 'DISCARDED';

export type GoogleDriveWatchStatus =
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'RENEWED'
  | 'REVOKED'
  | 'FAILED';

export type SyncCursorStatus = 'IDLE' | 'SYNCING' | 'FAILED' | 'RECOVERING';

/**
 * 1. Failure Classifier Interfaces
 */
export interface ClassifiedFailure {
  category: FailureCategory;
  provider: string;
  businessId: string;
  statusCode?: number;
  retryAfterSeconds?: number;
  isAutoRepairable: boolean;
  rootCause: string;
  suggestedAction: string;
  rawError?: string;
}

/**
 * 2. Circuit Breaker Interfaces
 */
export interface CircuitStatus {
  state: CircuitState;
  consecutiveFailures: number;
  isProviderOutage: boolean;
  cooldownExpiresAt?: string | null;
  allowExecution: boolean;
}

export interface CircuitCheckOptions {
  provider: string;
  scope: CircuitScope;
  scopeId: string;
  businessId?: string;
}

/**
 * 3. Master Recovery Orchestrator Interfaces
 */
export interface RepairResult {
  success: boolean;
  actionTaken: string;
  details?: Record<string, unknown>;
  reconciledCount?: number;
  reconnectUrl?: string;
  status: IntegrationHealthStatus;
}

/**
 * 4. Missed Data Reconciliation Interfaces
 */
export interface ReconciliationReport {
  connectionId: string;
  provider: string;
  resourceType: string;
  startCursor: string;
  newCursor: string;
  recordsIngested: number;
  recordsSkippedDuplicates: number;
  durationMs: number;
  success: boolean;
}

export interface ReconciliationOptions {
  connectionId?: string;
  resourceType?: string;
  lookbackBufferSeconds?: number;
  forceFullResync?: boolean;
}

/**
 * 5. Dead Letter Queue Interfaces
 */
export interface DLQReplayResult {
  dlqId: string;
  success: boolean;
  replayedAt: string;
  error?: string;
  result?: Record<string, unknown>;
}

/**
 * 6. Database Row Definitions
 */
export interface ProviderConnectionRow {
  id: string;
  business_id: string | null;
  brand_id: string | null;
  location_id: string | null;
  provider: string;
  provider_account_id: string;
  status: string;
  capabilities: Record<string, any> | null;
  auth_token: string | null;
  health_status: IntegrationHealthStatus;
  circuit_breaker_state: CircuitState;
  auth_state: AuthState;
  last_health_check_at: string | null;
  last_successful_sync_at: string | null;
  last_error_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  last_error_category: string | null;
  sync_errors_24h: number;
  recovery_attempts: number;
  last_recovery_at: string | null;
  reconnect_url: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CircuitBreakerRow {
  id: string;
  provider: string;
  scope: CircuitScope;
  scope_id: string;
  business_id: string | null;
  state: CircuitState;
  failure_count: number;
  consecutive_failures: number;
  success_count: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  cooldown_expires_at: string | null;
  cooldown_seconds: number;
  is_provider_outage: boolean;
  last_error_message: string | null;
  last_error_category: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface SyncCursorRow {
  id: string;
  provider_connection_id: string;
  business_id: string | null;
  resource_type: string;
  last_cursor: string | null;
  last_sync_timestamp: string | null;
  buffer_seconds: number;
  sync_status: SyncCursorStatus;
  records_synced_total: number;
  records_synced_last_run: number;
  lock_acquired_at: string | null;
  lock_expires_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationErrorLogRow {
  id: string;
  provider_connection_id: string | null;
  business_id: string | null;
  provider: string;
  endpoint: string | null;
  status_code: number | null;
  failure_category: FailureCategory;
  error_message: string;
  root_cause: string | null;
  suggested_action: string | null;
  raw_payload: Record<string, any> | null;
  sanitized_headers: Record<string, any> | null;
  is_auto_repairable: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_action: string | null;
  created_at: string;
}

/** Backwards-compatible public name retained for recovery consumers. */
export type ErrorLogRow = IntegrationErrorLogRow;

export interface RecoveryTimelineRow {
  id: string;
  provider_connection_id: string;
  business_id: string | null;
  provider: string;
  action_type: RecoveryActionType;
  trigger: RecoveryTrigger;
  previous_status: string;
  resulting_status: string;
  details: Record<string, any> | null;
  success: boolean;
  duration_ms: number;
  executed_by: string;
  created_at: string;
}

export interface DLQEventRow {
  id: string;
  provider_connection_id: string | null;
  business_id: string | null;
  provider: string;
  event_type: string;
  idempotency_key: string | null;
  payload: Record<string, any>;
  headers: Record<string, any> | null;
  error_message: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  status: DLQEventStatus;
  replay_result: Record<string, any> | null;
  replayed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleDriveWatchRow {
  id: string;
  provider_connection_id: string;
  business_id: string | null;
  channel_id: string;
  resource_id: string;
  resource_uri: string | null;
  expiration_timestamp: string;
  token: string | null;
  status: GoogleDriveWatchStatus;
  last_renewed_at: string | null;
  renewal_error: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}
