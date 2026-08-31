/**
 * Integration Recovery Orchestration Service
 *
 * Recovery coordinates observed provider failures, circuit breaking, audit
 * timelines and reconnect guidance. It must never manufacture provider state or
 * mark a connection healthy without a verified provider-side operation.
 */

import * as crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type AuthState,
  type ClassifiedFailure,
  type IntegrationHealthStatus,
  type ProviderConnectionRow,
  type RecoveryActionType,
  type RecoveryTimelineRow,
  type RecoveryTrigger,
  type RepairResult,
} from './types';
import { classifyError } from './failureClassifier';
import { IntegrationCircuitBreaker } from './circuitBreaker';
import { RepairActions, type RepairResultPayload } from './repairActions';

interface DiagnoseOptions {
  db?: SupabaseClient;
  /** Test-only fault injection. Production routes never populate this field. */
  simulatedError?: unknown;
  /** Test-only connection injection. Production routes resolve from the DB. */
  connectionOverride?: Partial<ProviderConnectionRow> & { id: string };
}

export class IntegrationRecoveryService {
  private static memoryConnections = new Map<string, Partial<ProviderConnectionRow>>();
  private static memoryTimelines = new Map<string, RecoveryTimelineRow[]>();

  private static async loadConnection(
    connectionId: string,
    options?: DiagnoseOptions,
  ): Promise<Partial<ProviderConnectionRow> & { id: string }> {
    if (options?.db) {
      const { data, error } = await options.db
        .from('provider_connections')
        .select('*')
        .eq('id', connectionId)
        .maybeSingle();

      if (error) throw new Error(`Could not load provider connection: ${error.message}`);
      if (!data) throw new Error('Provider connection not found.');

      const connection = { ...(data as ProviderConnectionRow), id: connectionId };
      this.memoryConnections.set(connectionId, connection);
      return connection;
    }

    if (options?.connectionOverride) {
      const connection = { ...options.connectionOverride, id: connectionId };
      this.memoryConnections.set(connectionId, connection);
      return connection;
    }

    const cached = this.memoryConnections.get(connectionId);
    if (cached) return { ...cached, id: connectionId };

    throw new Error('A verified provider connection is required.');
  }

  private static recordedFailure(connection: Partial<ProviderConnectionRow>): unknown | null {
    if (!connection.last_error_message) return null;
    const numericStatus = Number(connection.last_error_code);
    return {
      message: connection.last_error_message,
      status: Number.isFinite(numericStatus) ? numericStatus : undefined,
      statusCode: Number.isFinite(numericStatus) ? numericStatus : undefined,
    };
  }

  private static authStateForFailure(
    classified: ClassifiedFailure,
    fallback: AuthState,
  ): AuthState {
    if (classified.category === 'AUTH_REVOKED') return 'REVOKED';
    if (classified.category === 'AUTH_EXPIRED') return 'EXPIRED';
    return fallback;
  }

  /**
   * Diagnostic and repair pipeline.
   *
   * A successful local DB write is never treated as proof that Shopify, Meta or
   * Google was repaired. Provider-side repair methods currently fail closed
   * unless a real adapter exists, and the connection remains ACTION_REQUIRED.
   */
  static async diagnoseAndRepair(
    connectionId: string,
    trigger: RecoveryTrigger = 'AUTOMATIC',
    options?: DiagnoseOptions,
  ): Promise<RepairResult> {
    const startedAt = Date.now();
    const db = options?.db;
    const connection = await this.loadConnection(connectionId, options);
    const provider = String(connection.provider || '').trim().toLowerCase();
    const businessId = connection.business_id;

    if (!provider) throw new Error('Provider connection is missing its provider identifier.');
    if (!businessId) throw new Error('Provider connection is missing its business scope.');

    const previousStatus: IntegrationHealthStatus = connection.health_status || 'DEGRADED';
    const currentAuthState: AuthState = connection.auth_state || 'PENDING';

    const circuitStatus = await IntegrationCircuitBreaker.checkCircuit(
      provider,
      'ACCOUNT',
      connectionId,
      { db, businessId },
    );

    if (circuitStatus.isProviderOutage || !circuitStatus.allowExecution) {
      await this.logTimeline(connectionId, businessId, provider, {
        actionType: 'CIRCUIT_TRIPPED',
        trigger,
        previousStatus,
        resultingStatus: 'DEGRADED',
        details: {
          circuitState: circuitStatus.state,
          isProviderOutage: circuitStatus.isProviderOutage,
          cooldownExpiresAt: circuitStatus.cooldownExpiresAt,
        },
        success: false,
        durationMs: Date.now() - startedAt,
        db,
      });

      return {
        success: false,
        actionTaken: 'CIRCUIT_TRIPPED',
        details: {
          circuitState: circuitStatus.state,
          isProviderOutage: circuitStatus.isProviderOutage,
        },
        status: 'DEGRADED',
      };
    }

    const rawError = options?.simulatedError ?? this.recordedFailure(connection);
    if (!rawError) {
      const healthy = previousStatus === 'HEALTHY' && currentAuthState === 'AUTHORIZED';
      await this.logTimeline(connectionId, businessId, provider, {
        actionType: 'DIAGNOSTIC_RUN',
        trigger,
        previousStatus,
        resultingStatus: previousStatus,
        details: {
          providerProbePerformed: false,
          message: 'No current provider failure is recorded. Recovery made no provider or health-state mutation.',
        },
        success: healthy,
        durationMs: Date.now() - startedAt,
        db,
      });

      return {
        success: healthy,
        actionTaken: 'DIAGNOSTIC_RUN',
        details: {
          providerProbePerformed: false,
          message: healthy
            ? 'Stored connection state is healthy; no live provider probe was performed.'
            : 'No repairable provider error is recorded. Live provider verification is required before health can improve.',
        },
        status: previousStatus,
      };
    }

    const hasRefreshToken = Boolean(connection.metadata?.refresh_token || connection.auth_token);
    const classified = classifyError(rawError, provider, businessId, { hasRefreshToken });

    await this.logTimeline(connectionId, businessId, provider, {
      actionType: 'DIAGNOSTIC_RUN',
      trigger,
      previousStatus,
      resultingStatus: classified.isAutoRepairable ? 'RECOVERING' : 'ACTION_REQUIRED',
      details: {
        classifiedCategory: classified.category,
        rootCause: classified.rootCause,
        suggestedAction: classified.suggestedAction,
      },
      success: true,
      durationMs: Date.now() - startedAt,
      db,
    });

    if (db) {
      const { error } = await db.from('integration_error_logs').insert({
        provider_connection_id: connectionId,
        business_id: businessId,
        provider,
        failure_category: classified.category,
        error_message: classified.rootCause,
        root_cause: classified.rootCause,
        suggested_action: classified.suggestedAction,
        is_auto_repairable: classified.isAutoRepairable,
        created_at: new Date().toISOString(),
      });
      if (error) console.error('[recovery] failed to persist integration error log:', error.message);
    }

    if (!classified.isAutoRepairable || classified.category === 'AUTH_REVOKED') {
      return this.requireManualIntervention(
        connectionId,
        businessId,
        provider,
        previousStatus,
        currentAuthState,
        classified,
        trigger,
        startedAt,
        db,
      );
    }

    let repair: RepairResultPayload | null = null;
    let actionType: RecoveryActionType | null = null;

    if (classified.category === 'WEBHOOK_MISSING' || classified.category === 'WEBHOOK_MISCONFIGURED') {
      actionType = 'WEBHOOK_RECREATED';
      repair = provider === 'shopify'
        ? await RepairActions.repairShopifyWebhook(connection, { db })
        : await RepairActions.repairMetaWebhook(connection, { db });
    } else if (classified.category === 'AUTH_EXPIRED') {
      actionType = 'TOKEN_REFRESHED';
      repair = provider === 'google_drive' || provider === 'google_calendar' || provider.startsWith('google')
        ? await RepairActions.refreshGoogleToken(connection, { db })
        : await RepairActions.refreshMetaLongLivedToken(connection, { db });
    } else if (classified.category === 'CHANNEL_EXPIRED') {
      actionType = 'WATCH_RENEWED';
      repair = await RepairActions.renewGoogleDriveWatch(
        { provider_connection_id: connectionId },
        connection,
        { db },
      );
    }

    if (repair && actionType) {
      await this.logTimeline(connectionId, businessId, provider, {
        actionType,
        trigger,
        previousStatus,
        resultingStatus: repair.success ? 'RECOVERING' : 'ACTION_REQUIRED',
        details: {
          ...(repair.details || {}),
          error: repair.error || null,
        },
        success: repair.success,
        durationMs: Date.now() - startedAt,
        db,
      });

      if (!repair.success) {
        return this.requireManualIntervention(
          connectionId,
          businessId,
          provider,
          previousStatus,
          currentAuthState,
          {
            ...classified,
            isAutoRepairable: false,
            rootCause: repair.error || classified.rootCause,
            suggestedAction: 'Reconnect or repair this provider through the verified integration setup flow.',
          },
          trigger,
          startedAt,
          db,
        );
      }

      // A future real provider adapter may report success. Even then, provider
      // mutation alone is not proof that missed data was reconciled, so remain
      // RECOVERING until the verified sync subsystem reports success.
      await this.updateConnectionStatus(connectionId, 'RECOVERING', currentAuthState, db, {
        last_recovery_at: new Date().toISOString(),
      });
      return {
        success: true,
        actionTaken: actionType,
        details: repair.details,
        status: 'RECOVERING',
      };
    }

    // Transient errors use the circuit breaker/backoff mechanism. They do not
    // imply that the provider has recovered.
    await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', connectionId, rawError, { db, businessId });
    await this.updateConnectionStatus(connectionId, 'RECOVERING', currentAuthState, db, {
      last_error_message: classified.rootCause,
      last_error_category: classified.category,
    });

    return {
      success: false,
      actionTaken: 'BACKOFF_SCHEDULED',
      details: {
        category: classified.category,
        retryAfterSeconds: classified.retryAfterSeconds,
        rootCause: classified.rootCause,
      },
      status: 'RECOVERING',
    };
  }

  private static async requireManualIntervention(
    connectionId: string,
    businessId: string,
    provider: string,
    previousStatus: IntegrationHealthStatus,
    currentAuthState: AuthState,
    classified: ClassifiedFailure,
    trigger: RecoveryTrigger,
    startedAt: number,
    db?: SupabaseClient,
  ): Promise<RepairResult> {
    const reconnectUrl = await this.generateReconnectUrl(connectionId, { db });
    const authState = this.authStateForFailure(classified, currentAuthState);

    await this.updateConnectionStatus(connectionId, 'ACTION_REQUIRED', authState, db, {
      reconnect_url: reconnectUrl,
      last_error_message: classified.rootCause,
      last_error_category: classified.category,
      last_error_at: new Date().toISOString(),
    });

    await this.logTimeline(connectionId, businessId, provider, {
      actionType: 'MANUAL_INTERVENTION_REQUESTED',
      trigger,
      previousStatus,
      resultingStatus: 'ACTION_REQUIRED',
      details: {
        rootCause: classified.rootCause,
        suggestedAction: classified.suggestedAction,
        reconnectUrl,
      },
      success: false,
      durationMs: Date.now() - startedAt,
      db,
    });

    return {
      success: false,
      actionTaken: 'MANUAL_INTERVENTION_REQUESTED',
      reconnectUrl,
      details: {
        rootCause: classified.rootCause,
        suggestedAction: classified.suggestedAction,
      },
      status: 'ACTION_REQUIRED',
    };
  }

  /**
   * Returns an application route to the verified provider integration setup.
   * It is intentionally not a home-grown OAuth callback URL and carries no
   * credentials or privileged state.
   */
  static async generateReconnectUrl(
    connectionId: string,
    options?: { db?: SupabaseClient },
  ): Promise<string> {
    const appBaseUrl = process.env.PUBLIC_APP_URL;
    if (!appBaseUrl) throw new Error('PUBLIC_APP_URL is required to generate an integration reconnect route.');

    let provider = 'integration';
    if (options?.db) {
      const { data, error } = await options.db
        .from('provider_connections')
        .select('provider')
        .eq('id', connectionId)
        .maybeSingle();
      if (error) throw new Error(`Could not resolve reconnect provider: ${error.message}`);
      if (!data) throw new Error('Provider connection not found.');
      provider = String(data.provider || 'integration');
    } else {
      provider = String(this.memoryConnections.get(connectionId)?.provider || 'integration');
    }

    const destination = new URL('/settings', appBaseUrl);
    destination.searchParams.set('tab', 'integrations');
    destination.searchParams.set('reconnect', '1');
    destination.searchParams.set('provider', provider);
    destination.searchParams.set('connectionId', connectionId);
    return destination.toString();
  }

  /**
   * Retired unsafe generic callback. Real OAuth callbacks live in the provider
   * modules (/api/growth/callback, /api/growth/callback-meta, /api/shopify/callback)
   * where provider signatures/state and credential storage are authoritative.
   */
  static async handleReconnectCallback(
    _signedState: string,
    _newAuthData: { access_token: string; refresh_token?: string; expires_in?: number },
    _options?: { db?: SupabaseClient },
  ): Promise<RepairResult> {
    throw new Error(
      'Generic recovery token callbacks are retired. Reconnect through the provider-specific OAuth flow.',
    );
  }

  static async renewDriveWatches(
    options?: { db?: SupabaseClient; businessId?: string },
  ): Promise<{ renewed: number; failed: number }> {
    return RepairActions.batchRenewDriveWatches(options);
  }

  static async checkStaleConnections(
    options?: { db?: SupabaseClient },
  ): Promise<{ checked: number; repaired: number }> {
    const db = options?.db;
    if (!db) return { checked: 0, repaired: 0 };

    const staleThreshold = new Date(Date.now() - 3600_000).toISOString();
    const { data: staleConnections, error } = await db
      .from('provider_connections')
      .select('id')
      .or(`last_health_check_at.lt.${staleThreshold},health_status.eq.DEGRADED,health_status.eq.RECOVERING`);

    if (error) throw new Error(`Could not scan stale provider connections: ${error.message}`);
    if (!staleConnections?.length) return { checked: 0, repaired: 0 };

    let repaired = 0;
    for (const connection of staleConnections) {
      try {
        const result = await this.diagnoseAndRepair(connection.id, 'SCHEDULED_CRON', { db });
        if (result.success && result.status === 'HEALTHY') repaired += 1;
      } catch (error) {
        console.error('[recovery] stale connection diagnostic failed:', error);
      }
    }

    return { checked: staleConnections.length, repaired };
  }

  private static async logTimeline(
    connectionId: string,
    businessId: string,
    provider: string,
    params: {
      actionType: RecoveryActionType;
      trigger: RecoveryTrigger;
      previousStatus: string;
      resultingStatus: string;
      details?: Record<string, unknown>;
      success: boolean;
      durationMs: number;
      db?: SupabaseClient;
    },
  ): Promise<void> {
    const row: RecoveryTimelineRow = {
      id: `rtl_${crypto.randomBytes(8).toString('hex')}`,
      provider_connection_id: connectionId,
      business_id: businessId,
      provider,
      action_type: params.actionType,
      trigger: params.trigger,
      previous_status: params.previousStatus,
      resulting_status: params.resultingStatus,
      details: params.details || {},
      success: params.success,
      duration_ms: params.durationMs,
      executed_by: 'VOWOS_RECOVERY_ENGINE',
      created_at: new Date().toISOString(),
    };

    const timeline = this.memoryTimelines.get(connectionId) || [];
    timeline.push(row);
    this.memoryTimelines.set(connectionId, timeline);

    if (params.db) {
      const { error } = await params.db.from('integration_recovery_timelines').insert(row);
      if (error) console.error('[recovery] failed to persist recovery timeline:', error.message);
    }
  }

  private static async updateConnectionStatus(
    connectionId: string,
    healthStatus: IntegrationHealthStatus,
    authState: AuthState,
    db?: SupabaseClient,
    extraFields?: Record<string, unknown>,
  ): Promise<void> {
    const cached = this.memoryConnections.get(connectionId);
    if (cached) {
      cached.health_status = healthStatus;
      cached.auth_state = authState;
      Object.assign(cached, extraFields || {});
      this.memoryConnections.set(connectionId, cached);
    }

    if (!db) return;

    const { error } = await db
      .from('provider_connections')
      .update({
        health_status: healthStatus,
        auth_state: authState,
        last_health_check_at: new Date().toISOString(),
        ...(extraFields || {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) throw new Error(`Could not update provider connection status: ${error.message}`);
  }

  static async getRecoveryTimeline(
    connectionId: string,
    options?: { db?: SupabaseClient },
  ): Promise<RecoveryTimelineRow[]> {
    if (options?.db) {
      const { data, error } = await options.db
        .from('integration_recovery_timelines')
        .select('*')
        .eq('provider_connection_id', connectionId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(`Could not load recovery timeline: ${error.message}`);
      return (data || []) as RecoveryTimelineRow[];
    }

    return this.memoryTimelines.get(connectionId) || [];
  }
}
