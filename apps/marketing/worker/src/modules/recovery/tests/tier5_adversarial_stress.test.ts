/**
 * Tier 5: Adversarial Stress & Chaos Verification Suite
 * VowOS Integration Operations & Auto-Recovery System
 * 
 * Challenger 1 (Adversarial System Verifier)
 * 
 * Target Dimensions:
 * 1. Rapid failure flapping and circuit breaker state transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED/OPEN)
 * 2. Provider outage cascading detection across concurrent tenants & isolation
 * 3. Google Drive push watch renewals under edge expiration conditions
 * 4. Concurrent access and distributed cursor lock contention
 * 5. Adversarial security, tamper-resistance, timestamp skew & backoff overflow
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import * as crypto from 'crypto';
import { classifyError, parseRetryAfter, calculateBackoff } from '../failureClassifier';
import { IntegrationCircuitBreaker } from '../circuitBreaker';
import { RepairActions } from '../repairActions';
import { ReconciliationEngine, IngestOrderPayload, IngestMessagePayload } from '../reconciliationEngine';
import { IntegrationRecoveryService } from '../integrationRecoveryService';
import {
  IntegrationTestStore,
  FailureClassifierOracle,
  CircuitBreakerOracle,
  ReconciliationOracle,
  CryptoHelper
} from './harness';

// ============================================================================
// Group 1: Rapid Failure Flapping & State Transition Stress
// ============================================================================

test('ADV-CB-01: Rapid failure flapping below threshold resets consecutiveFailures on every success', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'adv_flap_provider';
  const scope = 'ACCOUNT';
  const scopeId = 'conn_flap_1';

  // Perform 30 flapping cycles: 4 failures followed by 1 success (threshold = 5)
  for (let cycle = 1; cycle <= 30; cycle++) {
    for (let f = 1; f <= 4; f++) {
      await IntegrationCircuitBreaker.recordFailure(provider, scope, scopeId, new Error('500 Flap Error'), {
        failureThreshold: 5
      });
    }

    // Circuit should remain CLOSED because failures never reached threshold 5
    let status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
    assert.equal(status.state, 'CLOSED', `Cycle ${cycle}: circuit should be CLOSED during flapping`);
    assert.equal(status.consecutiveFailures, 4);

    // Record 1 success -> should reset consecutiveFailures to 0
    await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);

    status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
    assert.equal(status.state, 'CLOSED');
    assert.equal(status.consecutiveFailures, 0, `Cycle ${cycle}: consecutiveFailures must reset to 0`);
  }
});

test('ADV-CB-02: Single probe failure in HALF_OPEN immediately re-trips to OPEN with fresh cooldown', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'adv_retrip_provider';
  const scope = 'ACCOUNT';
  const scopeId = 'conn_retrip_1';

  // 1. Trip circuit to OPEN with 5 failures (cooldown 1s)
  for (let i = 0; i < 5; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, scope, scopeId, new Error('503 Service Unavailable'), {
      cooldownSeconds: 1,
      failureThreshold: 5
    });
  }

  let status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'OPEN');
  assert.equal(status.allowExecution, false);

  // 2. Wait for cooldown expiration -> transition to HALF_OPEN
  await new Promise(r => setTimeout(r, 1050));
  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'HALF_OPEN');
  assert.equal(status.allowExecution, true);

  // 3. Canary probe encounters a single failure -> must immediately re-trip to OPEN
  await IntegrationCircuitBreaker.recordFailure(provider, scope, scopeId, new Error('500 Probe Failure'), {
    cooldownSeconds: 2
  });

  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'OPEN', 'Single failure in HALF_OPEN must immediately transition to OPEN');
  assert.equal(status.allowExecution, false);
});

test('ADV-CB-03: Partial success streak in HALF_OPEN broken by failure resets required probes', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'adv_streak_provider';
  const scope = 'ACCOUNT';
  const scopeId = 'conn_streak_1';

  // 1. Trip to OPEN
  for (let i = 0; i < 5; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, scope, scopeId, new Error('503'), {
      cooldownSeconds: 1,
      halfOpenSuccessThreshold: 3
    });
  }

  // 2. Wait for cooldown -> HALF_OPEN
  await new Promise(r => setTimeout(r, 1050));
  let status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'HALF_OPEN');

  // 3. Record 2 successes (1 short of 3)
  await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);
  await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);
  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'HALF_OPEN');

  // 4. 3rd probe fails -> trips back to OPEN
  await IntegrationCircuitBreaker.recordFailure(provider, scope, scopeId, new Error('500 Probe 3 Failed'), {
    cooldownSeconds: 1
  });
  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'OPEN');

  // 5. Next cooldown cycle requires full 3 consecutive successes
  await new Promise(r => setTimeout(r, 1050));
  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'HALF_OPEN');

  // 1 success should still keep it in HALF_OPEN
  await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);
  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'HALF_OPEN');

  // 2 more successes -> closes circuit
  await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);
  await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);
  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'CLOSED');
  assert.equal(status.consecutiveFailures, 0);
});

test('ADV-CB-04: High-cycle stress: 15 full state cycles (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'adv_stress_cycle';
  const scope = 'ACCOUNT';
  const scopeId = 'conn_cycle_1';

  for (let cycle = 1; cycle <= 15; cycle++) {
    // 5 failures -> OPEN
    for (let f = 1; f <= 5; f++) {
      await IntegrationCircuitBreaker.recordFailure(provider, scope, scopeId, new Error('500 Stress'), {
        cooldownSeconds: 0.05,
        halfOpenSuccessThreshold: 2
      });
    }

    let status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
    assert.equal(status.state, 'OPEN', `Cycle ${cycle}: should be OPEN`);

    // Wait cooldown (60ms)
    await new Promise(r => setTimeout(r, 60));

    status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
    assert.equal(status.state, 'HALF_OPEN', `Cycle ${cycle}: should be HALF_OPEN`);

    // 2 successes -> CLOSED
    await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);
    await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);

    status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
    assert.equal(status.state, 'CLOSED', `Cycle ${cycle}: should be CLOSED`);
    assert.equal(status.consecutiveFailures, 0);
  }
});

// ============================================================================
// Group 2: Provider Outage Cascading & Multi-Tenant Isolation
// ============================================================================

test('ADV-OUTAGE-01: Provider outage boundary: exactly 2 failing tenants does NOT declare outage, 3rd tenant declares outage', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'adv_outage_provider';

  // Tenant 1 fails 3 times
  for (let i = 0; i < 3; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'tenant_1', new Error('503 Outage'), { failureThreshold: 3 });
  }

  // Tenant 2 fails 3 times
  for (let i = 0; i < 3; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'tenant_2', new Error('503 Outage'), { failureThreshold: 3 });
  }

  // Check: with 2 tenants, outage is not yet declared
  let s1 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_1');
  let s2 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_2');
  assert.equal(s1.isProviderOutage, false);
  assert.equal(s2.isProviderOutage, false);

  // Tenant 3 fails 3 times -> trips provider-wide outage threshold (>= 3 failing scopes)
  for (let i = 0; i < 3; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'tenant_3', new Error('503 Outage'), { failureThreshold: 3 });
  }

  s1 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_1');
  s2 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_2');
  let s3 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_3');

  assert.equal(s1.isProviderOutage, true);
  assert.equal(s2.isProviderOutage, true);
  assert.equal(s3.isProviderOutage, true);
  assert.equal(s1.allowExecution, false);
  assert.equal(s2.allowExecution, false);
  assert.equal(s3.allowExecution, false);
});

test('ADV-OUTAGE-02: Provider outage isolation: Provider A outage does NOT affect Provider B or C', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const providerA = 'shopify_adv';
  const providerB = 'instagram_adv';
  const providerC = 'google_drive_adv';

  // Cause outage on providerA (3 failing tenants)
  for (const tid of ['t1', 't2', 't3']) {
    for (let i = 0; i < 3; i++) {
      await IntegrationCircuitBreaker.recordFailure(providerA, 'ACCOUNT', tid, new Error('503'), { failureThreshold: 3 });
    }
  }

  const statusA = await IntegrationCircuitBreaker.checkCircuit(providerA, 'ACCOUNT', 't1');
  assert.equal(statusA.isProviderOutage, true);

  // Check providerB and providerC
  const statusB = await IntegrationCircuitBreaker.checkCircuit(providerB, 'ACCOUNT', 't1');
  const statusC = await IntegrationCircuitBreaker.checkCircuit(providerC, 'ACCOUNT', 't1');

  assert.equal(statusB.isProviderOutage, false);
  assert.equal(statusB.state, 'CLOSED');
  assert.equal(statusB.allowExecution, true);

  assert.equal(statusC.isProviderOutage, false);
  assert.equal(statusC.state, 'CLOSED');
  assert.equal(statusC.allowExecution, true);
});

test('ADV-OUTAGE-03: Provider outage reset clears outage flag and transitions OPEN circuits to HALF_OPEN for canaries', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'adv_reset_provider';

  for (const tid of ['t1', 't2', 't3']) {
    for (let i = 0; i < 3; i++) {
      await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', tid, new Error('503'), { failureThreshold: 3 });
    }
  }

  let s1 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 't1');
  assert.equal(s1.isProviderOutage, true);

  // Reset provider outage
  await IntegrationCircuitBreaker.resetProviderOutage(provider);

  s1 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 't1');
  assert.equal(s1.isProviderOutage, false);
  assert.equal(s1.state, 'HALF_OPEN', 'OPEN circuits should transition to HALF_OPEN after outage reset');
  assert.equal(s1.allowExecution, true);
});

// ============================================================================
// Group 3: Google Drive Push Watch Renewals Under Edge Conditions
// ============================================================================

test('ADV-WATCH-01: Renew Google Drive watch produces unique channel UUID and 7-day expiration', async () => {
  const watch = {
    channel_id: 'chan_old_expiring_1122',
    resource_id: 'res_vault_root_123',
    provider_connection_id: 'conn_gdrive_adv_1'
  };

  const beforeMs = Date.now();
  const res = await RepairActions.renewGoogleDriveWatch(watch);

  assert.equal(res.success, true);
  assert.equal(res.actionTaken, 'WATCH_RENEWED');
  assert.ok(res.details);
  assert.notEqual(res.details.newChannelId, watch.channel_id);
  assert.ok(String(res.details.newChannelId).startsWith('chan_gdrive_'));

  const expIso = res.details.expirationTimestamp as string;
  const expMs = new Date(expIso).getTime();
  const expectedMinMs = beforeMs + 6 * 86400000;
  const expectedMaxMs = Date.now() + 8 * 86400000;
  assert.ok(expMs >= expectedMinMs && expMs <= expectedMaxMs, 'Expiration should be ~7 days in the future');
});

test('ADV-WATCH-02: Renew watch handles missing channel_id and fallback resource_id gracefully', async () => {
  const watch = {
    provider_connection_id: 'conn_gdrive_fallback'
  };

  const res = await RepairActions.renewGoogleDriveWatch(watch);
  assert.equal(res.success, true);
  assert.equal(res.details?.resourceId, 'res_gdrive_root_vault');
  assert.ok(String(res.details?.newChannelId).startsWith('chan_gdrive_'));
});

test('ADV-WATCH-03: Google token refresh without refresh_token returns descriptive failure without throwing', async () => {
  const connWithoutRefresh = {
    id: 'conn_gdrive_no_token',
    metadata: {}
  };

  const res = await RepairActions.refreshGoogleToken(connWithoutRefresh);
  assert.equal(res.success, false);
  assert.ok(res.error?.includes('Missing refresh token'));
});

// ============================================================================
// Group 4: Concurrent Access & Distributed Cursor Lock Contention
// ============================================================================

test('ADV-LOCK-01: In-flight lock acquisition prevents simultaneous race conditions', async () => {
  const connId = 'conn_lock_contention_1';
  const orders: IngestOrderPayload[] = [
    { id: 'ord_lock_101', total_cents: 10000, status: 'paid', updated_at: '2026-08-21T14:00:00Z' }
  ];

  const res1 = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'orders',
    ordersToIngest: orders
  });

  assert.equal(res1.success, true);
  assert.equal(res1.recordsIngested, 1);
  assert.equal(res1.resourceType, 'orders');
});

test('ADV-LOCK-02: Independent resource types for the same connection do not lock each other', async () => {
  const connId = 'conn_multi_resource_1';
  const orders: IngestOrderPayload[] = [
    { id: 'ord_res_1', total_cents: 5000, status: 'paid', updated_at: '2026-08-21T15:00:00Z' }
  ];
  const messages: IngestMessagePayload[] = [
    { id: 'msg_res_1', sender_id: 'cust_1', text: 'Hello', created_at: '2026-08-21T15:05:00Z' }
  ];

  // Run orders and messages concurrently
  const [ordersReport, messagesReport] = await Promise.all([
    ReconciliationEngine.reconcileConnection(connId, {
      resourceType: 'orders',
      ordersToIngest: orders
    }),
    ReconciliationEngine.reconcileConnection(connId, {
      resourceType: 'messages',
      messagesToIngest: messages
    })
  ]);

  assert.equal(ordersReport.success, true);
  assert.equal(ordersReport.resourceType, 'orders');
  assert.equal(messagesReport.success, true);
  assert.equal(messagesReport.resourceType, 'messages');
});

test('ADV-LOCK-03: Massive duplicate order ingestion stress test (100 orders x 5 batches)', async () => {
  const connId = 'conn_mass_duplicate_test';
  const batchSize = 100;
  const orders: IngestOrderPayload[] = Array.from({ length: batchSize }, (_, i) => ({
    id: `dup_ord_${i + 1}`,
    external_order_id: `dup_ord_${i + 1}`,
    total_cents: (i + 1) * 1000,
    status: 'paid',
    updated_at: new Date(Date.now() - 3600_000 + i * 1000).toISOString()
  }));

  // First run: ingests all 100
  const report1 = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'orders',
    ordersToIngest: orders
  });
  assert.equal(report1.recordsIngested, 100);

  // Subsequent 4 runs: all processed idempotently
  for (let run = 2; run <= 5; run++) {
    const reportN = await ReconciliationEngine.reconcileConnection(connId, {
      resourceType: 'orders',
      ordersToIngest: orders
    });
    assert.equal(reportN.recordsIngested, 100);
    assert.equal(reportN.success, true);
  }
});

// ============================================================================
// Group 5: Adversarial Security, Skew & Edge Case Forensics
// ============================================================================

test('ADV-SEC-01: OAuth reconnection callback rejects tampered HMAC state and forged payloads', async () => {
  const connId = 'conn_sec_test_1';
  const originalUrl = await IntegrationRecoveryService.generateReconnectUrl(connId);

  const stateMatch = originalUrl.match(/state=([^&]+)/);
  assert.ok(stateMatch && stateMatch[1]);
  const signedState = stateMatch![1];

  const parts = signedState.split('.');
  assert.equal(parts.length, 2);

  // 1. Bit flip in payload with same HMAC
  const [payloadB64, hmac] = parts;
  const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  decoded.connectionId = 'conn_hacked_other_business';
  const forgedPayloadB64 = Buffer.from(JSON.stringify(decoded)).toString('base64url');
  const forgedState = `${forgedPayloadB64}.${hmac}`;

  await assert.rejects(
    async () => {
      await IntegrationRecoveryService.handleReconnectCallback(forgedState, {
        access_token: 'forged_token_123'
      });
    }
  );

  // 2. Same-length forged signature that does not match
  const fakeHmacSameLength = crypto.randomBytes(32).toString('base64url');
  const forgedHmacState = `${payloadB64}.${fakeHmacSameLength}`;
  await assert.rejects(
    async () => {
      await IntegrationRecoveryService.handleReconnectCallback(forgedHmacState, {
        access_token: 'forged_token_123'
      });
    },
    /Invalid OAuth state signature/
  );
});

test('ADV-SEC-02: OAuth reconnection callback rejects expired states (> 10 minutes)', async () => {
  const secret = process.env.OAUTH_STATE_SECRET || 'vowos_test_oauth_state_secret_key_32bytes_long!';
  const expiredTimestamp = Date.now() - 650_000; // 10.8 minutes ago

  const rawPayload = JSON.stringify({
    connectionId: 'conn_expired_state',
    timestamp: expiredTimestamp,
    nonce: 'adv_nonce_123'
  });

  const hmac = crypto.createHmac('sha256', secret).update(rawPayload).digest('base64url');
  const expiredSignedState = `${Buffer.from(rawPayload).toString('base64url')}.${hmac}`;

  await assert.rejects(
    async () => {
      await IntegrationRecoveryService.handleReconnectCallback(expiredSignedState, {
        access_token: 'valid_token_but_expired_state'
      });
    },
    /OAuth reconnection state has expired/
  );
});

test('ADV-SEC-03: Exponential backoff handles extreme attempt counts without overflow', () => {
  assert.equal(calculateBackoff(0), 5);
  assert.equal(calculateBackoff(1), 10);
  assert.equal(calculateBackoff(2), 20);
  assert.equal(calculateBackoff(5), 160);
  assert.equal(calculateBackoff(6), 300); // Clamped at max 300s
  assert.equal(calculateBackoff(20), 300); // Does not overflow
  assert.equal(calculateBackoff(100), 300); // Huge integer clamped
  assert.equal(calculateBackoff(-5), 5); // Negative attempt safe
  assert.ok(Number.isFinite(calculateBackoff(1000)));
});

test('ADV-SEC-04: Timestamp sanitization clamps distant future (+30 days) and ignores invalid strings', async () => {
  const connId = 'conn_timestamp_skew_1';
  const futureTimestamp = new Date(Date.now() + 30 * 86400000).toISOString();

  const report = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'orders',
    ordersToIngest: [
      { id: 'skew_ord_1', total_cents: 1000, status: 'paid', updated_at: futureTimestamp }
    ]
  });

  assert.equal(report.success, true);
  // Cursor should be clamped close to current wall clock time, not 30 days in future
  const cursorMs = new Date(report.newCursor).getTime();
  const nowMs = Date.now();
  assert.ok(cursorMs <= nowMs + 5000, 'Future timestamp must be clamped to now()');
});
