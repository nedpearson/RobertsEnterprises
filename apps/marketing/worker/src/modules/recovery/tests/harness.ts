/**
 * Integration Operations & Auto-Recovery Test Harness & Reference Oracle
 * VowOS Monorepo — Production Acceptance Test Harness
 * 
 * Provides in-memory models, deterministic provider simulators,
 * crypto signing helpers, and interface contract assertions.
 */

import * as crypto from 'crypto';

// ============================================================================
// Types & Contracts (PROJECT.md Specification)
// ============================================================================

export type HealthStatus = 'HEALTHY' | 'RECOVERING' | 'ACTION_REQUIRED' | 'DEGRADED' | 'DISCONNECTED';
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export type AuthState = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'REVOKED' | 'REFRESHING';

export type FailureCategory =
  | 'WEBHOOK_MISSING'
  | 'AUTH_REVOKED'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'PROVIDER_OUTAGE'
  | 'TRANSIENT_5XX'
  | 'CHANNEL_EXPIRED'
  | 'SCOPE_INSUFFICIENT'
  | 'SCHEMA_MISMATCH';

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

export interface CircuitStatus {
  state: CircuitBreakerState;
  consecutiveFailures: number;
  isProviderOutage: boolean;
  cooldownExpiresAt?: string | null;
  allowExecution: boolean;
}

export interface RepairResult {
  success: boolean;
  actionTaken: string;
  details?: Record<string, unknown>;
  reconciledCount?: number;
  reconnectUrl?: string;
  status: HealthStatus;
}

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

export interface RecoveryTimelineStep {
  id: string;
  timestamp: string;
  stage: 'DETECTED' | 'REPAIRING' | 'RECONCILING' | 'COMPLETED' | 'FAILED';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderConnection {
  id: string;
  business_id: string;
  brand_id?: string | null;
  location_id?: string | null;
  provider: string;
  provider_account_id: string;
  display_name: string;
  health_status: HealthStatus;
  last_event_at: string | null;
  last_successful_sync_at: string | null;
  last_health_check_at: string;
  sync_errors_24h: number;
  circuit_breaker_state: CircuitBreakerState;
  auth_state: AuthState;
  webhook_id?: string | null;
  webhook_status?: 'ACTIVE' | 'DRIFTED' | 'MISSING';
  webhook_secret?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface SyncCursor {
  id: string;
  connection_id: string;
  business_id: string;
  brand_id?: string | null;
  location_id?: string | null;
  provider: string;
  resource_type: string;
  cursor_type: 'TIMESTAMP' | 'NUMERIC_ID' | 'GRAPH_CURSOR' | 'SYNC_TOKEN';
  cursor_value: string;
  high_watermark_timestamp: string;
  last_successful_sync_at: string;
  records_synced_last_run: number;
  total_records_synced: number;
  status: 'HEALTHY' | 'SYNCING' | 'RECONCILING' | 'ERROR' | 'DRIFT_DETECTED';
  last_error?: string | null;
  is_locked: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  lock_expires_at?: string | null;
}

export interface GoogleDriveWatch {
  id: string;
  connection_id: string;
  business_id: string;
  channel_id: string;
  resource_id: string;
  resource_uri?: string;
  expiration_at: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'RENEWED' | 'REVOKED';
  last_renewed_at?: string;
  auto_renew: boolean;
}

export interface DlqEvent {
  id: string;
  connection_id?: string;
  business_id: string;
  provider: string;
  event_type: string;
  idempotency_key: string;
  raw_payload: Record<string, unknown>;
  headers: Record<string, string>;
  status: 'PENDING' | 'PROCESSING' | 'REPLAYED' | 'DEAD_LETTER' | 'DISCARDED';
  attempts: number;
  max_attempts: number;
  last_error?: string;
  next_retry_at: string;
}

export interface OrderRecord {
  id: string;
  business_id: string;
  location_id?: string;
  external_order_id: string;
  source_type: string;
  total_cents: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OmnichannelMessageRecord {
  id: string;
  business_id: string;
  brand_id?: string;
  provider_connection_id: string;
  sender_id: string;
  sender_name?: string;
  recipient_id: string;
  content: string;
  external_message_id: string;
  created_at: string;
}

export interface AppointmentRecord {
  id: string;
  business_id: string;
  location_id?: string;
  provider: string;
  external_id: string;
  type: string;
  date: string;
  time: string;
  status: string;
  created_at: string;
}

// ============================================================================
// In-Memory Database Store (Isolated Per Test Run)
// ============================================================================

export class IntegrationTestStore {
  connections: Map<string, ProviderConnection> = new Map();
  circuitBreakers: Map<string, {
    state: CircuitBreakerState;
    consecutiveFailures: number;
    failureThreshold: number;
    cooldownSeconds: number;
    halfOpenSuccessThreshold: number;
    halfOpenSuccessCount: number;
    lastFailureAt?: string;
    cooldownExpiresAt?: string;
    isProviderOutage: boolean;
    outageDetectedAt?: string;
  }> = new Map();
  syncCursors: Map<string, SyncCursor> = new Map();
  recoveryTimelines: Map<string, RecoveryTimelineStep[]> = new Map();
  driveWatches: Map<string, GoogleDriveWatch> = new Map();
  dlqEvents: Map<string, DlqEvent> = new Map();
  orders: Map<string, OrderRecord> = new Map();
  inboxMessages: Map<string, OmnichannelMessageRecord> = new Map();
  appointments: Map<string, AppointmentRecord> = new Map();
  errorLogs: Array<{
    id: string;
    connection_id?: string;
    business_id: string;
    provider: string;
    error_category: FailureCategory;
    root_cause: string;
    raw_error?: string;
    occurred_at: string;
  }> = [];

  constructor() {
    this.seedDefaultStore();
  }

  seedDefaultStore() {
    // Seed standard tenant & multi-brand connections
    const connShopify: ProviderConnection = {
      id: 'conn_shopify_ido',
      business_id: 'biz_ido_bridal',
      brand_id: 'brand_ido_couture',
      location_id: 'loc_baton_rouge',
      provider: 'shopify',
      provider_account_id: 'ido-bridal-couture.myshopify.com',
      display_name: 'I Do Bridal Shopify Store',
      health_status: 'HEALTHY',
      last_event_at: new Date(Date.now() - 300_000).toISOString(),
      last_successful_sync_at: new Date(Date.now() - 300_000).toISOString(),
      last_health_check_at: new Date().toISOString(),
      sync_errors_24h: 0,
      circuit_breaker_state: 'CLOSED',
      auth_state: 'VALID',
      webhook_id: 'wh_shopify_9921',
      webhook_status: 'ACTIVE',
      webhook_secret: 'shpss_live_secret_44921',
      access_token: 'shpat_live_access_token_8832',
      token_expires_at: new Date(Date.now() + 86400000 * 30).toISOString()
    };

    const connInstagram: ProviderConnection = {
      id: 'conn_instagram_ido',
      business_id: 'biz_ido_bridal',
      brand_id: 'brand_ido_couture',
      location_id: 'loc_baton_rouge',
      provider: 'instagram',
      provider_account_id: 'act_ig_idobridal',
      display_name: 'I Do Bridal Instagram DMs',
      health_status: 'HEALTHY',
      last_event_at: new Date(Date.now() - 600_000).toISOString(),
      last_successful_sync_at: new Date(Date.now() - 600_000).toISOString(),
      last_health_check_at: new Date().toISOString(),
      sync_errors_24h: 0,
      circuit_breaker_state: 'CLOSED',
      auth_state: 'VALID',
      access_token: 'EAAB_live_meta_token_1192',
      token_expires_at: new Date(Date.now() + 86400000 * 45).toISOString()
    };

    const connGoogleDrive: ProviderConnection = {
      id: 'conn_gdrive_ido',
      business_id: 'biz_ido_bridal',
      brand_id: 'brand_ido_couture',
      location_id: 'loc_baton_rouge',
      provider: 'google_drive',
      provider_account_id: 'drive_ido_bridal_vault',
      display_name: 'Google Drive Gown Assets',
      health_status: 'HEALTHY',
      last_event_at: new Date(Date.now() - 1200_000).toISOString(),
      last_successful_sync_at: new Date(Date.now() - 1200_000).toISOString(),
      last_health_check_at: new Date().toISOString(),
      sync_errors_24h: 0,
      circuit_breaker_state: 'CLOSED',
      auth_state: 'VALID',
      access_token: 'ya29.live_google_token_7721',
      refresh_token: '1//0g_live_google_refresh_token_9912',
      token_expires_at: new Date(Date.now() + 3600_000).toISOString()
    };

    this.connections.set(connShopify.id, connShopify);
    this.connections.set(connInstagram.id, connInstagram);
    this.connections.set(connGoogleDrive.id, connGoogleDrive);

    // Seed Sync Cursors
    const cursorShopify: SyncCursor = {
      id: 'cur_shopify_ido',
      connection_id: connShopify.id,
      business_id: connShopify.business_id,
      brand_id: connShopify.brand_id,
      location_id: connShopify.location_id,
      provider: 'shopify',
      resource_type: 'orders',
      cursor_type: 'TIMESTAMP',
      cursor_value: new Date(Date.now() - 3600_000).toISOString(),
      high_watermark_timestamp: new Date(Date.now() - 3600_000).toISOString(),
      last_successful_sync_at: new Date(Date.now() - 3600_000).toISOString(),
      records_synced_last_run: 5,
      total_records_synced: 142,
      status: 'HEALTHY',
      is_locked: false
    };

    const cursorInstagram: SyncCursor = {
      id: 'cur_ig_ido',
      connection_id: connInstagram.id,
      business_id: connInstagram.business_id,
      brand_id: connInstagram.brand_id,
      location_id: connInstagram.location_id,
      provider: 'instagram',
      resource_type: 'messages',
      cursor_type: 'GRAPH_CURSOR',
      cursor_value: 'cur_ig_msg_watermark_9901',
      high_watermark_timestamp: new Date(Date.now() - 3600_000).toISOString(),
      last_successful_sync_at: new Date(Date.now() - 3600_000).toISOString(),
      records_synced_last_run: 2,
      total_records_synced: 89,
      status: 'HEALTHY',
      is_locked: false
    };

    this.syncCursors.set(`${connShopify.id}:orders`, cursorShopify);
    this.syncCursors.set(`${connInstagram.id}:messages`, cursorInstagram);

    // Seed Drive Watch
    const driveWatch: GoogleDriveWatch = {
      id: 'watch_gdrive_ido',
      connection_id: connGoogleDrive.id,
      business_id: connGoogleDrive.business_id,
      channel_id: 'chan_gdrive_uuid_9921',
      resource_id: 'res_gdrive_vault_root',
      expiration_at: new Date(Date.now() + 86400000 * 5).toISOString(),
      status: 'ACTIVE',
      auto_renew: true
    };
    this.driveWatches.set(driveWatch.channel_id, driveWatch);
  }
}

// ============================================================================
// Crypto Helpers & Signed OAuth State Generator
// ============================================================================

export class CryptoHelper {
  private static SECRET_KEY = 'vowos_test_oauth_state_secret_key_32bytes_long!';

  static signState(payload: Record<string, unknown>): string {
    const raw = JSON.stringify({
      ...payload,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex')
    });
    const hmac = crypto.createHmac('sha256', this.SECRET_KEY).update(raw).digest('base64url');
    return `${Buffer.from(raw).toString('base64url')}.${hmac}`;
  }

  static verifyState(signedState: string, maxAgeMs: number = 600_000): { valid: boolean; payload?: Record<string, unknown>; error?: string } {
    try {
      const parts = signedState.split('.');
      if (parts.length !== 2) return { valid: false, error: 'Malformed state format' };

      const [encodedPayload, receivedHmac] = parts;
      const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const expectedHmac = crypto.createHmac('sha256', this.SECRET_KEY).update(raw).digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
        return { valid: false, error: 'HMAC signature mismatch' };
      }

      const payload = JSON.parse(raw);
      if (Date.now() - payload.timestamp > maxAgeMs) {
        return { valid: false, error: 'State expired' };
      }

      return { valid: true, payload };
    } catch (err: unknown) {
      return { valid: false, error: (err as Error).message };
    }
  }

  static computeHmacSha256(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('base64');
  }

  static verifyShopifyHmac(bodyString: string, receivedHmac: string, secret: string): boolean {
    const calculated = this.computeHmacSha256(bodyString, secret);
    return calculated === receivedHmac;
  }
}

// ============================================================================
// Core Recovery Logic Reference Engine (Opaque-Box Verification Harness)
// ============================================================================

export class FailureClassifierOracle {
  static classify(error: unknown, provider: string, businessId: string, hasRefreshToken: boolean = false): ClassifiedFailure {
    const raw = error instanceof Error
      ? `${error.name}: ${error.message}`
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? `${(error as any).name || 'Error'}: ${(error as any).message}`
        : typeof error === 'string'
          ? error
          : String(error);
    const errObj = (typeof error === 'object' && error !== null) ? (error as Record<string, unknown>) : {};
    const status = typeof errObj.status === 'number' ? errObj.status : typeof errObj.statusCode === 'number' ? errObj.statusCode : undefined;

    // 1. Rate Limiting (429)
    if (status === 429 || raw.includes('429') || raw.toLowerCase().includes('rate limit') || raw.toLowerCase().includes('quota exceeded')) {
      const retryAfter = typeof errObj.retryAfter === 'number' ? errObj.retryAfter : 60;
      return {
        category: 'RATE_LIMITED',
        provider,
        businessId,
        statusCode: 429,
        retryAfterSeconds: retryAfter,
        isAutoRepairable: true,
        rootCause: `Provider ${provider} returned 429 Too Many Requests (Rate limit exceeded).`,
        suggestedAction: `Apply bounded exponential backoff and resume after ${retryAfter}s.`,
        rawError: raw
      };
    }

    // 2. Authentication & Revocation (401 / OAuth exceptions)
    if (status === 401 || raw.includes('401') || raw.includes('invalid_grant') || raw.includes('OAuthException') || raw.includes('app_uninstalled') || raw.includes('Token revoked')) {
      if (hasRefreshToken) {
        return {
          category: 'AUTH_EXPIRED',
          provider,
          businessId,
          statusCode: 401,
          isAutoRepairable: true,
          rootCause: `Access token for ${provider} expired, but valid refresh token exists.`,
          suggestedAction: `Execute automated OAuth token refresh using stored refresh token.`,
          rawError: raw
        };
      } else {
        return {
          category: 'AUTH_REVOKED',
          provider,
          businessId,
          statusCode: 401,
          isAutoRepairable: false,
          rootCause: `OAuth authorization revoked by user or application uninstalled in ${provider}.`,
          suggestedAction: `Transition status to ACTION_REQUIRED and generate signed OAuth reconnection URL.`,
          rawError: raw
        };
      }
    }

    // 3. Webhook Missing / Drift
    if (raw.includes('WEBHOOK_MISSING') || raw.includes('404 Not Found') || raw.includes('Webhook subscription not found') || raw.includes('webhook_drift')) {
      return {
        category: 'WEBHOOK_MISSING',
        provider,
        businessId,
        statusCode: 404,
        isAutoRepairable: true,
        rootCause: `Registered webhook subscription in ${provider} is missing or endpoint URL drifted.`,
        suggestedAction: `Automatically re-register webhook subscriptions with valid endpoint and secret.`,
        rawError: raw
      };
    }

    // 4. Google Drive Watch Channel Expired / Calendar 410 Gone
    if (raw.includes('CHANNEL_EXPIRED') || raw.includes('410') || raw.includes('channel expired') || raw.includes('Channel not found')) {
      return {
        category: 'CHANNEL_EXPIRED',
        provider,
        businessId,
        statusCode: 410,
        isAutoRepairable: true,
        rootCause: `Google Drive watch channel or Calendar sync token expired or invalidated (HTTP 410).`,
        suggestedAction: `Generate new channel UUID or fallback to full delta sync scan.`,
        rawError: raw
      };
    }

    // 5. Server 5xx / Outage
    if (status && status >= 500 && status <= 504) {
      return {
        category: 'TRANSIENT_5XX',
        provider,
        businessId,
        statusCode: status,
        isAutoRepairable: true,
        rootCause: `Provider ${provider} returned transient HTTP ${status} server error.`,
        suggestedAction: `Queue retry with exponential backoff and track circuit breaker failure count.`,
        rawError: raw
      };
    }

    // 6. Schema Mismatch / Malformed
    if (raw.includes('SyntaxError') || raw.includes('Unexpected token') || raw.includes('SCHEMA_MISMATCH') || raw.includes('JSON')) {
      return {
        category: 'SCHEMA_MISMATCH',
        provider,
        businessId,
        statusCode: 400,
        isAutoRepairable: false,
        rootCause: `Incoming webhook payload could not be parsed or failed schema validation.`,
        suggestedAction: `Route payload to Dead Letter Queue (DLQ) for inspection and replay.`,
        rawError: raw
      };
    }

    // Default Fallback
    return {
      category: 'TRANSIENT_5XX',
      provider,
      businessId,
      statusCode: 500,
      isAutoRepairable: true,
      rootCause: `Unclassified error from ${provider}: ${raw.slice(0, 100)}`,
      suggestedAction: `Retry with backoff.`,
      rawError: raw
    };
  }
}

export class CircuitBreakerOracle {
  constructor(private store: IntegrationTestStore) {}

  async checkCircuit(provider: string, scope: 'GLOBAL' | 'ACCOUNT' | 'TENANT', scopeId: string): Promise<CircuitStatus> {
    const key = `${provider}:${scope}:${scopeId}`;
    let cb = this.store.circuitBreakers.get(key);

    if (!cb) {
      cb = {
        state: 'CLOSED',
        consecutiveFailures: 0,
        failureThreshold: 5,
        cooldownSeconds: 300,
        halfOpenSuccessThreshold: 3,
        halfOpenSuccessCount: 0,
        isProviderOutage: false
      };
      this.store.circuitBreakers.set(key, cb);
    }

    // If OPEN, check if cooldown has expired -> Transition to HALF_OPEN
    if (cb.state === 'OPEN' && cb.cooldownExpiresAt) {
      const expiresAt = new Date(cb.cooldownExpiresAt).getTime();
      if (Date.now() >= expiresAt) {
        cb.state = 'HALF_OPEN';
        cb.halfOpenSuccessCount = 0;
      }
    }

    const allow = cb.state === 'CLOSED' || cb.state === 'HALF_OPEN';
    return {
      state: cb.state,
      consecutiveFailures: cb.consecutiveFailures,
      isProviderOutage: cb.isProviderOutage,
      cooldownExpiresAt: cb.cooldownExpiresAt,
      allowExecution: allow && !cb.isProviderOutage
    };
  }

  async recordFailure(provider: string, scope: 'GLOBAL' | 'ACCOUNT' | 'TENANT', scopeId: string, error: unknown): Promise<void> {
    const key = `${provider}:${scope}:${scopeId}`;
    const cb = (await this.checkCircuit(provider, scope, scopeId));
    const entry = this.store.circuitBreakers.get(key)!;

    entry.consecutiveFailures += 1;
    entry.lastFailureAt = new Date().toISOString();

    // If in HALF_OPEN, a single failure immediately trips back to OPEN
    if (entry.state === 'HALF_OPEN') {
      entry.state = 'OPEN';
      entry.cooldownExpiresAt = new Date(Date.now() + entry.cooldownSeconds * 1000).toISOString();
      return;
    }

    // If failures hit threshold -> OPEN
    if (entry.consecutiveFailures >= entry.failureThreshold) {
      entry.state = 'OPEN';
      entry.cooldownExpiresAt = new Date(Date.now() + entry.cooldownSeconds * 1000).toISOString();
    }

    // Check for provider-wide outage (>3 tenants failing)
    const providerBreakers = Array.from(this.store.circuitBreakers.entries()).filter(([k]) => k.startsWith(`${provider}:`));
    const failingTenants = providerBreakers.filter(([_, v]) => v.consecutiveFailures >= 3).length;
    if (failingTenants >= 3) {
      for (const [_, v] of providerBreakers) {
        v.isProviderOutage = true;
        v.outageDetectedAt = new Date().toISOString();
      }
    }
  }

  async recordSuccess(provider: string, scope: 'GLOBAL' | 'ACCOUNT' | 'TENANT', scopeId: string): Promise<void> {
    const key = `${provider}:${scope}:${scopeId}`;
    const entry = this.store.circuitBreakers.get(key);
    if (!entry) return;

    if (entry.state === 'HALF_OPEN') {
      entry.halfOpenSuccessCount += 1;
      if (entry.halfOpenSuccessCount >= entry.halfOpenSuccessThreshold) {
        entry.state = 'CLOSED';
        entry.consecutiveFailures = 0;
        entry.halfOpenSuccessCount = 0;
        entry.cooldownExpiresAt = undefined;
      }
    } else if (entry.state === 'CLOSED') {
      entry.consecutiveFailures = 0;
    }
  }

  resetProviderOutage(provider: string) {
    for (const [k, v] of this.store.circuitBreakers.entries()) {
      if (k.startsWith(`${provider}:`)) {
        v.isProviderOutage = false;
        v.outageDetectedAt = undefined;
        if (v.state === 'OPEN') {
          v.state = 'HALF_OPEN';
          v.halfOpenSuccessCount = 0;
        }
      }
    }
  }
}

export class ReconciliationOracle {
  constructor(private store: IntegrationTestStore) {}

  async reconcileShopifyOrders(connectionId: string, ordersToIngest: Array<{ id: string; total_cents: number; status: string; updated_at: string }>): Promise<ReconciliationReport> {
    const t0 = Date.now();
    const conn = this.store.connections.get(connectionId);
    if (!conn) throw new Error(`Connection ${connectionId} not found`);

    const cursorKey = `${connectionId}:orders`;
    let cursor = this.store.syncCursors.get(cursorKey);
    if (!cursor) {
      cursor = {
        id: `cur_${connectionId}_orders`,
        connection_id: connectionId,
        business_id: conn.business_id,
        brand_id: conn.brand_id,
        location_id: conn.location_id,
        provider: 'shopify',
        resource_type: 'orders',
        cursor_type: 'TIMESTAMP',
        cursor_value: new Date(Date.now() - 86400000).toISOString(),
        high_watermark_timestamp: new Date(Date.now() - 86400000).toISOString(),
        last_successful_sync_at: new Date().toISOString(),
        records_synced_last_run: 0,
        total_records_synced: 0,
        status: 'HEALTHY',
        is_locked: false
      };
      this.store.syncCursors.set(cursorKey, cursor);
    }

    if (cursor.is_locked) {
      throw new Error(`Sync cursor for ${connectionId}:orders is currently locked by another worker`);
    }

    // Acquire lock
    cursor.is_locked = true;
    cursor.locked_at = new Date().toISOString();

    let ingested = 0;
    let skipped = 0;
    let maxTimestamp = cursor.high_watermark_timestamp;

    for (const ord of ordersToIngest) {
      const orderKey = `${conn.business_id}:${ord.id}`;
      if (this.store.orders.has(orderKey)) {
        // Idempotent duplicate: update status if newer, count as skipped new
        const existing = this.store.orders.get(orderKey)!;
        existing.status = ord.status;
        existing.total_cents = ord.total_cents;
        existing.updated_at = ord.updated_at;
        skipped += 1;
      } else {
        // Insert new order
        this.store.orders.set(orderKey, {
          id: `ord_${ord.id}`,
          business_id: conn.business_id,
          location_id: conn.location_id || 'default_loc',
          external_order_id: ord.id,
          source_type: 'SHOPIFY',
          total_cents: ord.total_cents,
          status: ord.status,
          created_at: ord.updated_at,
          updated_at: ord.updated_at
        });
        ingested += 1;
      }

      if (new Date(ord.updated_at).getTime() > new Date(maxTimestamp).getTime()) {
        maxTimestamp = ord.updated_at;
      }
    }

    // Release lock & update cursor
    cursor.is_locked = false;
    cursor.locked_at = null;
    cursor.cursor_value = maxTimestamp;
    cursor.high_watermark_timestamp = maxTimestamp;
    cursor.last_successful_sync_at = new Date().toISOString();
    cursor.records_synced_last_run = ingested;
    cursor.total_records_synced += ingested;
    cursor.status = 'HEALTHY';

    conn.health_status = 'HEALTHY';
    conn.last_event_at = maxTimestamp;
    conn.last_successful_sync_at = new Date().toISOString();

    return {
      connectionId,
      provider: 'shopify',
      resourceType: 'orders',
      startCursor: cursor.cursor_value,
      newCursor: maxTimestamp,
      recordsIngested: ingested,
      recordsSkippedDuplicates: skipped,
      durationMs: Date.now() - t0,
      success: true
    };
  }

  async reconcileInstagramMessages(connectionId: string, messagesToIngest: Array<{ id: string; sender_id: string; sender_name?: string; text: string; created_time: string }>): Promise<ReconciliationReport> {
    const t0 = Date.now();
    const conn = this.store.connections.get(connectionId);
    if (!conn) throw new Error(`Connection ${connectionId} not found`);

    let ingested = 0;
    let skipped = 0;
    let maxTimestamp = new Date(0).toISOString();

    for (const msg of messagesToIngest) {
      const msgKey = `${conn.business_id}:${msg.id}`;
      if (this.store.inboxMessages.has(msgKey)) {
        skipped += 1;
      } else {
        this.store.inboxMessages.set(msgKey, {
          id: `msg_${msg.id}`,
          business_id: conn.business_id,
          brand_id: conn.brand_id || undefined,
          provider_connection_id: conn.id,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name,
          recipient_id: conn.provider_account_id,
          content: msg.text,
          external_message_id: msg.id,
          created_at: msg.created_time
        });
        ingested += 1;
      }

      if (new Date(msg.created_time).getTime() > new Date(maxTimestamp).getTime()) {
        maxTimestamp = msg.created_time;
      }
    }

    conn.health_status = 'HEALTHY';
    conn.last_event_at = maxTimestamp;

    return {
      connectionId,
      provider: 'instagram',
      resourceType: 'messages',
      startCursor: 'start_cursor',
      newCursor: maxTimestamp,
      recordsIngested: ingested,
      recordsSkippedDuplicates: skipped,
      durationMs: Date.now() - t0,
      success: true
    };
  }
}
