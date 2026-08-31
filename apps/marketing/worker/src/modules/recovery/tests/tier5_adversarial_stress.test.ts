/**
 * Tier 5: Adversarial Stress & Chaos Verification Suite
 *
 * The production invariant is explicit: local recovery logic may classify,
 * isolate, back off and stage reconciliation, but it may not fabricate remote
 * provider state. Provider mutations fail closed until an official API adapter
 * confirms them.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateBackoff } from '../failureClassifier';
import { IntegrationCircuitBreaker } from '../circuitBreaker';
import { RepairActions } from '../repairActions';
import {
  ReconciliationEngine,
  type IngestMessagePayload,
  type IngestOrderPayload,
} from '../reconciliationEngine';
import { IntegrationRecoveryService } from '../integrationRecoveryService';

process.env.PUBLIC_APP_URL ??= 'https://vowos.example.test';

// ---------------------------------------------------------------------------
// Circuit breaker / outage isolation
// ---------------------------------------------------------------------------

test('ADV-CB-01: repeated sub-threshold failure flapping resets on success', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'adv_flap_provider';
  const scopeId = 'conn_flap_1';

  for (let cycle = 1; cycle <= 20; cycle += 1) {
    for (let failure = 0; failure < 4; failure += 1) {
      await IntegrationCircuitBreaker.recordFailure(
        provider,
        'ACCOUNT',
        scopeId,
        new Error('500 Flap Error'),
        { failureThreshold: 5 },
      );
    }

    let status = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', scopeId);
    assert.equal(status.state, 'CLOSED');
    assert.equal(status.consecutiveFailures, 4);

    await IntegrationCircuitBreaker.recordSuccess(provider, 'ACCOUNT', scopeId);
    status = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', scopeId);
    assert.equal(status.state, 'CLOSED');
    assert.equal(status.consecutiveFailures, 0, `cycle ${cycle} must reset failure streak`);
  }
});

test('ADV-CB-02: HALF_OPEN probe failure immediately re-trips OPEN', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'adv_retrip_provider';
  const scopeId = 'conn_retrip_1';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await IntegrationCircuitBreaker.recordFailure(
      provider,
      'ACCOUNT',
      scopeId,
      new Error('503'),
      { cooldownSeconds: 0.05, failureThreshold: 5 },
    );
  }

  let status = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', scopeId);
  assert.equal(status.state, 'OPEN');

  await new Promise((resolve) => setTimeout(resolve, 60));
  status = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', scopeId);
  assert.equal(status.state, 'HALF_OPEN');

  await IntegrationCircuitBreaker.recordFailure(
    provider,
    'ACCOUNT',
    scopeId,
    new Error('500 probe failed'),
    { cooldownSeconds: 1 },
  );
  status = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', scopeId);
  assert.equal(status.state, 'OPEN');
  assert.equal(status.allowExecution, false);
});

test('ADV-OUTAGE-01: outage requires three independently failing account scopes', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'adv_outage_provider';

  for (const connectionId of ['tenant_1', 'tenant_2']) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await IntegrationCircuitBreaker.recordFailure(
        provider,
        'ACCOUNT',
        connectionId,
        new Error('503'),
        { failureThreshold: 3 },
      );
    }
  }

  assert.equal(
    (await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_1')).isProviderOutage,
    false,
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await IntegrationCircuitBreaker.recordFailure(
      provider,
      'ACCOUNT',
      'tenant_3',
      new Error('503'),
      { failureThreshold: 3 },
    );
  }

  for (const connectionId of ['tenant_1', 'tenant_2', 'tenant_3']) {
    const status = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', connectionId);
    assert.equal(status.isProviderOutage, true);
    assert.equal(status.allowExecution, false);
  }
});

test('ADV-OUTAGE-02: provider outage state is isolated by provider', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const providerA = 'shopify_adv';

  for (const connectionId of ['a1', 'a2', 'a3']) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await IntegrationCircuitBreaker.recordFailure(
        providerA,
        'ACCOUNT',
        connectionId,
        new Error('503'),
        { failureThreshold: 3 },
      );
    }
  }

  assert.equal(
    (await IntegrationCircuitBreaker.checkCircuit(providerA, 'ACCOUNT', 'a1')).isProviderOutage,
    true,
  );

  for (const other of ['instagram_adv', 'google_drive_adv']) {
    const status = await IntegrationCircuitBreaker.checkCircuit(other, 'ACCOUNT', 'a1');
    assert.equal(status.isProviderOutage, false);
    assert.equal(status.state, 'CLOSED');
    assert.equal(status.allowExecution, true);
  }
});

// ---------------------------------------------------------------------------
// Provider mutations fail closed
// ---------------------------------------------------------------------------

test('ADV-PROVIDER-01: Drive renewal never fabricates channel identifiers', async () => {
  const result = await RepairActions.renewGoogleDriveWatch({
    channel_id: 'expired-channel-fixture',
    resource_id: 'resource-fixture',
    provider_connection_id: 'conn_gdrive_adv_1',
  });

  assert.equal(result.success, false);
  assert.equal(result.actionTaken, 'WATCH_RENEWED');
  assert.equal(result.details?.providerMutationPerformed, false);
  assert.equal(result.details?.manualInterventionRequired, true);
  assert.equal('newChannelId' in (result.details || {}), false);
});

test('ADV-PROVIDER-02: Google token refresh never mints an access token locally', async () => {
  const withoutCredential = await RepairActions.refreshGoogleToken({
    id: 'conn_no_refresh',
    provider: 'google_drive',
    metadata: {},
  });
  assert.equal(withoutCredential.success, false);
  assert.equal(withoutCredential.details?.providerMutationPerformed, false);
  assert.match(withoutCredential.error || '', /reconnect/i);

  const withFixtureCredential = await RepairActions.refreshGoogleToken({
    id: 'conn_has_refresh',
    provider: 'google_drive',
    metadata: { refresh_token: 'synthetic-refresh-fixture' },
  });
  assert.equal(withFixtureCredential.success, false);
  assert.equal('newAccessToken' in (withFixtureCredential.details || {}), false);
});

test('ADV-PROVIDER-03: missing webhook becomes ACTION_REQUIRED, never HEALTHY', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const result = await IntegrationRecoveryService.diagnoseAndRepair(
    'conn_webhook_missing',
    'AUTOMATIC',
    {
      connectionOverride: {
        id: 'conn_webhook_missing',
        provider: 'shopify',
        business_id: 'biz_adv_1',
        health_status: 'DEGRADED',
        auth_state: 'AUTHORIZED',
        circuit_breaker_state: 'CLOSED',
      },
      simulatedError: new Error('404 webhook subscription not found'),
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.status, 'ACTION_REQUIRED');
  assert.equal(result.actionTaken, 'MANUAL_INTERVENTION_REQUESTED');
  assert.match(result.reconnectUrl || '', /tab=integrations/);
});

test('ADV-PROVIDER-04: generic callback cannot accept arbitrary tokens', async () => {
  await assert.rejects(
    () => IntegrationRecoveryService.handleReconnectCallback(
      'forged-state',
      { access_token: 'synthetic-token-fixture' },
    ),
    /retired/i,
  );
});

// ---------------------------------------------------------------------------
// Reconciliation engine internal test harness / locks
// ---------------------------------------------------------------------------

test('ADV-LOCK-01: explicit synthetic order batch advances its in-memory cursor', async () => {
  const orders: IngestOrderPayload[] = [
    { id: 'ord_lock_101', total_cents: 10000, status: 'paid', updated_at: '2026-08-21T14:00:00Z' },
  ];

  const report = await ReconciliationEngine.reconcileConnection('conn_lock_contention_1', {
    resourceType: 'orders',
    ordersToIngest: orders,
  });

  assert.equal(report.success, true);
  assert.equal(report.recordsIngested, 1);
  assert.equal(report.resourceType, 'orders');
});

test('ADV-LOCK-02: independent resource cursors can execute concurrently in the test harness', async () => {
  const orders: IngestOrderPayload[] = [
    { id: 'ord_res_1', total_cents: 5000, status: 'paid', updated_at: '2026-08-21T15:00:00Z' },
  ];
  const messages: IngestMessagePayload[] = [
    { id: 'msg_res_1', sender_id: 'cust_1', text: 'Hello', created_at: '2026-08-21T15:05:00Z' },
  ];

  const [ordersReport, messagesReport] = await Promise.all([
    ReconciliationEngine.reconcileConnection('conn_multi_resource_1', {
      resourceType: 'orders',
      ordersToIngest: orders,
    }),
    ReconciliationEngine.reconcileConnection('conn_multi_resource_1', {
      resourceType: 'messages',
      messagesToIngest: messages,
    }),
  ]);

  assert.equal(ordersReport.success, true);
  assert.equal(messagesReport.success, true);
});

test('ADV-TIME-01: future external watermark is clamped near wall-clock time', async () => {
  const futureTimestamp = new Date(Date.now() + 30 * 86400000).toISOString();
  const report = await ReconciliationEngine.reconcileConnection('conn_timestamp_skew_1', {
    resourceType: 'orders',
    ordersToIngest: [
      { id: 'skew_ord_1', total_cents: 1000, status: 'paid', updated_at: futureTimestamp },
    ],
  });

  const cursorMs = Date.parse(report.newCursor);
  assert.ok(cursorMs <= Date.now() + 5000, 'future timestamp must be clamped to current time');
});

test('ADV-BACKOFF-01: exponential backoff clamps extreme attempt counts', () => {
  assert.equal(calculateBackoff(0), 5);
  assert.equal(calculateBackoff(1), 10);
  assert.equal(calculateBackoff(5), 160);
  assert.equal(calculateBackoff(6), 300);
  assert.equal(calculateBackoff(1000), 300);
  assert.ok(Number.isFinite(calculateBackoff(1000)));
});
