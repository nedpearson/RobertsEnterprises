/**
 * Shared Type Definitions for VowOS Integration Operations & Auto-Recovery System
 * Frontend & Client Contracts
 */

export type IntegrationHealthStatus = 'HEALTHY' | 'RECOVERING' | 'ACTION_REQUIRED' | 'DEGRADED';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CircuitScope = 'GLOBAL' | 'ACCOUNT' | 'TENANT';

export type AuthState = 'AUTHORIZED' | 'EXPIRED' | 'REVOKED' | 'PENDING';

export type FailureCategory =
  | 'AUTH_REVOKED'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'WEBHOOK_MISSING'
  | 'WEBHOOK_MISCONFIGURED'
  | 'SCHEMA_DRIFT'
  | 'PROVIDER_OUTAGE'
  | 'RESOURCE_NOT_FOUND'
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
 * Failure Classifier Contract
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
 * Circuit Breaker Contract
 */
export interface CircuitStatus {
  state: CircuitState;
  consecutiveFailures: number;
  isProviderOutage: boolean;
  cooldownExpiresAt?: string | null;
  allowExecution: boolean;
}

/**
 * Recovery Service Repair Result
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
 * Missed Data Reconciliation Report
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

/**
 * Database Entities (Full Row Types)
 */
export interface IntegrationCircuitBreaker {
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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSyncCursor {
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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationErrorLog {
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
  raw_payload: Record<string, unknown>;
  sanitized_headers: Record<string, unknown>;
  is_auto_repairable: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_action: string | null;
  created_at: string;
}

export interface IntegrationRecoveryTimeline {
  id: string;
  provider_connection_id: string;
  business_id: string | null;
  provider: string;
  action_type: RecoveryActionType;
  trigger: RecoveryTrigger;
  previous_status: string;
  resulting_status: string;
  details: Record<string, unknown>;
  success: boolean;
  duration_ms: number;
  executed_by: string;
  created_at: string;
}

export interface IntegrationDLQEvent {
  id: string;
  provider_connection_id: string | null;
  business_id: string | null;
  provider: string;
  event_type: string;
  idempotency_key: string | null;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  error_message: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  status: DLQEventStatus;
  replay_result: Record<string, unknown>;
  replayed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleDriveWatch {
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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProviderConnectionRecord {
  id: string;
  business_id: string | null;
  brand_id: string | null;
  location_id: string | null;
  provider: string;
  provider_account_id: string;
  status: string;
  capabilities: Record<string, unknown> | null;
  auth_token: string | null;
  health_status: IntegrationHealthStatus;
  circuit_breaker_state: CircuitState;
  auth_state: AuthState;
  last_health_check_at: string | null;
  last_successful_sync_at: string | null;
  last_error_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  last_error_category: FailureCategory | string | null;
  sync_errors_24h: number;
  recovery_attempts: number;
  last_recovery_at: string | null;
  reconnect_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * 8-Column Observability Table Row (Platform Admin)
 */
export interface IntegrationTableRow {
  id: string;
  business_id: string | null;
  brand_id: string | null;
  brand_name: string;
  location_id: string | null;
  location_name: string;
  provider: string;
  provider_account_id: string;
  health_status: IntegrationHealthStatus;
  circuit_breaker_state: CircuitState;
  auth_state: AuthState;
  last_event_at: string | null;
  last_successful_sync_at: string | null;
  recovery_status: string;
  sync_errors_24h: number;
  is_auto_repairable: boolean;
  reconnect_url: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Diagnostic Drawer Full State
 */
export interface DiagnosticDrawerData {
  connection: ProviderConnectionRecord;
  circuitBreaker: IntegrationCircuitBreaker | null;
  latestError: IntegrationErrorLog | null;
  timeline: IntegrationRecoveryTimeline[];
  cursors: IntegrationSyncCursor[];
  dlqEvents: IntegrationDLQEvent[];
  driveWatch: GoogleDriveWatch | null;
}

/**
 * Simplified Customer Portal Health State
 */
export interface CustomerHealthView {
  status: 'HEALTHY' | 'REPAIRING' | 'ACTION_REQUIRED' | 'DEGRADED';
  label: string;
  description: string;
  canReconnect: boolean;
  reconnectUrl?: string;
}
