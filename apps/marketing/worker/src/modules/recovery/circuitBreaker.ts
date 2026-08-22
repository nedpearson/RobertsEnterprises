/**
 * Integration Circuit Breaker & Provider Outage Detector
 * VowOS Integration Operations & Auto-Recovery System
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CircuitBreakerRow, CircuitScope, CircuitState, CircuitStatus, FailureCategory } from './types';
import { classifyError } from './failureClassifier';

export interface CircuitOptions {
  failureThreshold?: number;
  cooldownSeconds?: number;
  halfOpenSuccessThreshold?: number;
  db?: SupabaseClient;
  businessId?: string;
}

interface InMemoryBreakerState {
  state: CircuitState;
  consecutiveFailures: number;
  failureThreshold: number;
  cooldownSeconds: number;
  halfOpenSuccessThreshold: number;
  halfOpenSuccessCount: number;
  lastFailureAt?: string;
  lastSuccessAt?: string;
  cooldownExpiresAt?: string | null;
  isProviderOutage: boolean;
  outageDetectedAt?: string;
  lastErrorMessage?: string;
  lastErrorCategory?: string;
  businessId?: string;
}

export class IntegrationCircuitBreaker {
  private static DEFAULT_FAILURE_THRESHOLD = 5;
  private static DEFAULT_COOLDOWN_SECONDS = 300;
  private static DEFAULT_HALF_OPEN_SUCCESS_THRESHOLD = 3;

  // In-memory breaker map: key = `${provider}:${scope}:${scopeId}`
  private static memoryBreakers: Map<string, InMemoryBreakerState> = new Map();

  private static getKey(provider: string, scope: CircuitScope, scopeId: string): string {
    return `${provider.toLowerCase()}:${scope.toUpperCase()}:${scopeId}`;
  }

  private static getOrCreateMemoryState(
    provider: string,
    scope: CircuitScope,
    scopeId: string,
    options?: CircuitOptions
  ): InMemoryBreakerState {
    const key = this.getKey(provider, scope, scopeId);
    let state = this.memoryBreakers.get(key);
    if (!state) {
      state = {
        state: 'CLOSED',
        consecutiveFailures: 0,
        failureThreshold: options?.failureThreshold || this.DEFAULT_FAILURE_THRESHOLD,
        cooldownSeconds: options?.cooldownSeconds || this.DEFAULT_COOLDOWN_SECONDS,
        halfOpenSuccessThreshold: options?.halfOpenSuccessThreshold || this.DEFAULT_HALF_OPEN_SUCCESS_THRESHOLD,
        halfOpenSuccessCount: 0,
        isProviderOutage: false,
        businessId: options?.businessId
      };
      this.memoryBreakers.set(key, state);
    }
    return state;
  }

  /**
   * Checks the circuit state for a given provider and scope.
   * If the circuit is OPEN and the cooldown period has expired, transitions to HALF_OPEN.
   */
  static async checkCircuit(
    provider: string,
    scope: CircuitScope,
    scopeId: string,
    options?: CircuitOptions
  ): Promise<CircuitStatus> {
    const mem = this.getOrCreateMemoryState(provider, scope, scopeId, options);
    if (options?.cooldownSeconds) mem.cooldownSeconds = options.cooldownSeconds;
    if (options?.failureThreshold) mem.failureThreshold = options.failureThreshold;
    if (options?.halfOpenSuccessThreshold) mem.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold;
    const db = options?.db;

    // Check DB if available
    if (db) {
      try {
        const { data: dbRow } = await db
          .from('integration_circuit_breakers')
          .select('*')
          .eq('provider', provider.toLowerCase())
          .eq('scope', scope.toUpperCase())
          .eq('scope_id', scopeId)
          .maybeSingle();

        if (dbRow) {
          mem.state = dbRow.state as CircuitState;
          mem.consecutiveFailures = dbRow.consecutive_failures;
          mem.isProviderOutage = dbRow.is_provider_outage;
          mem.cooldownExpiresAt = dbRow.cooldown_expires_at;
          mem.cooldownSeconds = dbRow.cooldown_seconds || mem.cooldownSeconds;
        }
      } catch (err) {
        // Fallback to in-memory state on DB error
      }
    }

    // Check if OPEN cooldown has expired -> Transition to HALF_OPEN
    if (mem.state === 'OPEN' && mem.cooldownExpiresAt) {
      const expiresMs = new Date(mem.cooldownExpiresAt).getTime();
      if (Date.now() >= expiresMs) {
        mem.state = 'HALF_OPEN';
        mem.halfOpenSuccessCount = 0;

        if (db) {
          try {
            await db
              .from('integration_circuit_breakers')
              .update({
                state: 'HALF_OPEN',
                updated_at: new Date().toISOString()
              })
              .eq('provider', provider.toLowerCase())
              .eq('scope', scope.toUpperCase())
              .eq('scope_id', scopeId);
          } catch (_) {}
        }
      }
    }

    const allowExecution = (mem.state === 'CLOSED' || mem.state === 'HALF_OPEN') && !mem.isProviderOutage;

    return {
      state: mem.state,
      consecutiveFailures: mem.consecutiveFailures,
      isProviderOutage: mem.isProviderOutage,
      cooldownExpiresAt: mem.cooldownExpiresAt,
      allowExecution
    };
  }

  /**
   * Records a failure for a given provider and scope.
   * If in HALF_OPEN: immediately trips to OPEN with full cooldown.
   * If consecutive failures reach threshold: transitions to OPEN.
   * Also checks for provider-wide outage conditions.
   */
  static async recordFailure(
    provider: string,
    scope: CircuitScope,
    scopeId: string,
    error: unknown,
    options?: CircuitOptions
  ): Promise<void> {
    const mem = this.getOrCreateMemoryState(provider, scope, scopeId, options);
    if (options?.cooldownSeconds) mem.cooldownSeconds = options.cooldownSeconds;
    if (options?.failureThreshold) mem.failureThreshold = options.failureThreshold;
    if (options?.halfOpenSuccessThreshold) mem.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold;
    const db = options?.db;
    const businessId = options?.businessId || mem.businessId;

    const classified = classifyError(error, provider, businessId || 'unknown');
    const nowIso = new Date().toISOString();

    mem.consecutiveFailures += 1;
    mem.lastFailureAt = nowIso;
    mem.lastErrorMessage = classified.rootCause;
    mem.lastErrorCategory = classified.category;

    let newState: CircuitState = mem.state;
    let cooldownExpiresAt = mem.cooldownExpiresAt;

    if (mem.state === 'HALF_OPEN') {
      // In HALF_OPEN, a single probe failure trips immediately back to OPEN
      newState = 'OPEN';
      cooldownExpiresAt = new Date(Date.now() + mem.cooldownSeconds * 1000).toISOString();
      mem.state = 'OPEN';
      mem.cooldownExpiresAt = cooldownExpiresAt;
    } else if (mem.consecutiveFailures >= mem.failureThreshold) {
      // Threshold reached -> trip to OPEN
      newState = 'OPEN';
      cooldownExpiresAt = new Date(Date.now() + mem.cooldownSeconds * 1000).toISOString();
      mem.state = 'OPEN';
      mem.cooldownExpiresAt = cooldownExpiresAt;
    }

    // Check provider-wide outage condition:
    // Outage is declared if >= 3 distinct tenants/scopes for this provider have consecutiveFailures >= 3
    const providerBreakers = Array.from(this.memoryBreakers.entries()).filter(([k]) =>
      k.startsWith(`${provider.toLowerCase()}:`)
    );
    const failingCount = providerBreakers.filter(([_, v]) => v.consecutiveFailures >= 3).length;

    let isProviderOutage = mem.isProviderOutage;
    if (failingCount >= 3) {
      isProviderOutage = true;
      for (const [_, v] of providerBreakers) {
        v.isProviderOutage = true;
        v.outageDetectedAt = nowIso;
      }
    }

    if (db) {
      try {
        await db.from('integration_circuit_breakers').upsert({
          provider: provider.toLowerCase(),
          scope: scope.toUpperCase(),
          scope_id: scopeId,
          business_id: businessId || null,
          state: newState,
          failure_count: mem.consecutiveFailures,
          consecutive_failures: mem.consecutiveFailures,
          last_failure_at: nowIso,
          cooldown_expires_at: cooldownExpiresAt,
          cooldown_seconds: mem.cooldownSeconds,
          is_provider_outage: isProviderOutage,
          last_error_message: classified.rootCause,
          last_error_category: classified.category,
          updated_at: nowIso
        }, {
          onConflict: 'provider,scope,scope_id'
        });

        // Also update provider_connections if scope is ACCOUNT or TENANT and scopeId looks like a UUID
        if (scopeId.length > 20) {
          await db
            .from('provider_connections')
            .update({
              circuit_breaker_state: newState,
              health_status: isProviderOutage ? 'DEGRADED' : (newState === 'OPEN' ? 'DEGRADED' : 'RECOVERING'),
              last_error_at: nowIso,
              last_error_message: classified.rootCause,
              last_error_category: classified.category,
              updated_at: nowIso
            })
            .eq('id', scopeId);
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
  }

  /**
   * Records a successful operation for a given provider and scope.
   * If in HALF_OPEN: increments canary success count; once threshold is reached, closes circuit.
   * If in CLOSED: resets consecutive failures to 0.
   */
  static async recordSuccess(
    provider: string,
    scope: CircuitScope,
    scopeId: string,
    options?: CircuitOptions
  ): Promise<void> {
    const mem = this.getOrCreateMemoryState(provider, scope, scopeId, options);
    const db = options?.db;
    const nowIso = new Date().toISOString();

    mem.lastSuccessAt = nowIso;

    if (mem.state === 'HALF_OPEN') {
      mem.halfOpenSuccessCount += 1;
      if (mem.halfOpenSuccessCount >= mem.halfOpenSuccessThreshold) {
        mem.state = 'CLOSED';
        mem.consecutiveFailures = 0;
        mem.halfOpenSuccessCount = 0;
        mem.cooldownExpiresAt = null;
      }
    } else if (mem.state === 'CLOSED') {
      mem.consecutiveFailures = 0;
    }

    if (db) {
      try {
        await db
          .from('integration_circuit_breakers')
          .update({
            state: mem.state,
            consecutive_failures: mem.consecutiveFailures,
            last_success_at: nowIso,
            cooldown_expires_at: mem.cooldownExpiresAt,
            updated_at: nowIso
          })
          .eq('provider', provider.toLowerCase())
          .eq('scope', scope.toUpperCase())
          .eq('scope_id', scopeId);

        if (scopeId.length > 20 && mem.state === 'CLOSED') {
          await db
            .from('provider_connections')
            .update({
              circuit_breaker_state: 'CLOSED',
              health_status: 'HEALTHY',
              last_successful_sync_at: nowIso,
              updated_at: nowIso
            })
            .eq('id', scopeId);
        }
      } catch (_) {}
    }
  }

  /**
   * Resets the provider outage flag across all connections and sets OPEN breakers to HALF_OPEN
   * to allow canary probes to verify connectivity.
   */
  static async resetProviderOutage(provider: string, options?: CircuitOptions): Promise<void> {
    const provLower = provider.toLowerCase();
    for (const [k, v] of this.memoryBreakers.entries()) {
      if (k.startsWith(`${provLower}:`)) {
        v.isProviderOutage = false;
        v.outageDetectedAt = undefined;
        if (v.state === 'OPEN') {
          v.state = 'HALF_OPEN';
          v.halfOpenSuccessCount = 0;
        }
      }
    }

    const db = options?.db;
    if (db) {
      try {
        await db
          .from('integration_circuit_breakers')
          .update({
            is_provider_outage: false,
            state: 'HALF_OPEN',
            updated_at: new Date().toISOString()
          })
          .eq('provider', provLower);
      } catch (_) {}
    }
  }

  /**
   * Resets all in-memory breakers (useful in test runners).
   */
  static clearMemoryState(): void {
    this.memoryBreakers.clear();
  }
}
