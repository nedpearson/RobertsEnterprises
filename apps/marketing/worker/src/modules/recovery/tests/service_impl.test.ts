/**
 * Direct implementation tests for Integration Operations.
 *
 * Recovery is intentionally conservative: local metadata writes are not proof
 * that a remote provider was repaired. Tests therefore assert fail-closed
 * behavior until a verified provider-side adapter succeeds.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyError, parseRetryAfter, calculateBackoff } from '../failureClassifier';
import { IntegrationCircuitBreaker } from '../circuitBreaker';
import { RepairActions } from '../repairActions';
import { ReconciliationEngine } from '../reconciliationEngine';
import { IntegrationRecoveryService } from '../integrationRecoveryService';

process.env.PUBLIC_APP_URL ??= 'https://vowos.example.test';

test('failureClassifier correctly parses Retry-After and classifies 429', () => {
  assert.equal(parseRetryAfter('120'), 120);
  assert.equal(parseRetryAfter(45), 45);
  assert.equal(calculateBackoff(0, 5, 300), 5);
  assert.equal(calculateBackoff(3, 5, 300), 40);
  assert.equal(calculateBackoff(10, 5, 300), 300);

  const classified = classifyError(
    { status: 429, headers: { 'retry-after': '75' } },
    'shopify',
    'biz_test_1',
  );
  assert.equal(classified.category, 'RATE_LIMITED');
  assert.equal(classified.statusCode, 429);
  assert.equal(classified.retryAfterSeconds, 75);
  assert.equal(classified.isAutoRepairable, true);
});

test('failureClassifier handles token expiration vs revocation with hasRefreshToken', () => {
  const expired = classifyError(
    new Error('OAuthException: Error validating access token: Session has expired'),
    'meta',
    'biz_test_1',
    { hasRefreshToken: true },
  );
  assert.equal(expired.category, 'AUTH_EXPIRED');
  assert.equal(expired.isAutoRepairable, true);

  const revoked = classifyError(
    new Error('OAuthException: App uninstalled or user revoked permission'),
    'meta',
    'biz_test_1',
    { hasRefreshToken: false },
  );
  assert.equal(revoked.category, 'AUTH_REVOKED');
  assert.equal(revoked.isAutoRepairable, false);
});

test('failureClassifier handles 410 Channel / Sync Token Expired', () => {
  const channelExpired = classifyError(
    { statusCode: 410, message: 'Google Drive push channel expired' },
    'google_drive',
    'biz_test_1',
  );
  assert.equal(channelExpired.category, 'CHANNEL_EXPIRED');
  assert.equal(channelExpired.statusCode, 410);
  assert.equal(channelExpired.isAutoRepairable, true);
});

test('IntegrationCircuitBreaker state machine: CLOSED -> OPEN -> HALF_OPEN -> CLOSED', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'test_shopify';
  const scope = 'ACCOUNT';
  const scopeId = 'conn_test_cb_1';

  let status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'CLOSED');
  assert.equal(status.allowExecution, true);

  for (let i = 1; i <= 5; i += 1) {
    await IntegrationCircuitBreaker.recordFailure(provider, scope, scopeId, new Error('500 Internal Server Error'), {
      cooldownSeconds: 1,
    });
  }

  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'OPEN');
  assert.equal(status.allowExecution, false);

  await new Promise((resolve) => setTimeout(resolve, 1100));
  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'HALF_OPEN');
  assert.equal(status.allowExecution, true);

  await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);
  await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);
  await IntegrationCircuitBreaker.recordSuccess(provider, scope, scopeId);

  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'CLOSED');
  assert.equal(status.consecutiveFailures, 0);
});

test('IntegrationCircuitBreaker detects provider-wide outage and resetProviderOutage recovers it', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'test_provider_outage';

  for (const connectionId of ['conn_1', 'conn_2', 'conn_3']) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', connectionId, new Error('503'), {
        failureThreshold: 3,
      });
    }
  }

  const status = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'conn_1');
  assert.equal(status.isProviderOutage, true);
  assert.equal(status.allowExecution, false);

  await IntegrationCircuitBreaker.resetProviderOutage(provider);
  const reset = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'conn_1');
  assert.equal(reset.isProviderOutage, false);
});

test('RepairActions never fabricate provider state when remote adapters are unavailable', async () => {
  const shopifyRepair = await RepairActions.repairShopifyWebhook({
    id: 'conn_test_shop',
    provider: 'shopify',
  });
  assert.equal(shopifyRepair.success, false);
  assert.equal(shopifyRepair.actionTaken, 'WEBHOOK_RECREATED');
  assert.equal(shopifyRepair.details?.providerMutationPerformed, false);

  const metaRepair = await RepairActions.repairMetaWebhook({
    id: 'conn_test_meta',
    provider: 'instagram',
  });
  assert.equal(metaRepair.success, false);
  assert.equal(metaRepair.details?.providerMutationPerformed, false);

  const googleTokenRefresh = await RepairActions.refreshGoogleToken({
    id: 'conn_test_gdrive',
    provider: 'google_drive',
    metadata: { refresh_token: 'synthetic-refresh-fixture' },
  });
  assert.equal(googleTokenRefresh.success, false);
  assert.equal(googleTokenRefresh.actionTaken, 'TOKEN_REFRESHED');
  assert.equal(googleTokenRefresh.details?.providerMutationPerformed, false);

  const driveWatchRenewal = await RepairActions.renewGoogleDriveWatch({
    channel_id: 'old_chan_1',
    resource_id: 'res_root_1',
    provider_connection_id: 'conn_test_gdrive',
  });
  assert.equal(driveWatchRenewal.success, false);
  assert.equal(driveWatchRenewal.actionTaken, 'WATCH_RENEWED');
  assert.equal(driveWatchRenewal.details?.providerMutationPerformed, false);
});

test('ReconciliationEngine test harness reconciles explicit synthetic records idempotently', async () => {
  const connId = 'conn_recon_test_1';
  const report = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'orders',
    ordersToIngest: [
      { id: '1001', total_cents: 5000, status: 'paid', updated_at: '2026-08-21T12:00:00Z' },
      { id: '1002', total_cents: 7500, status: 'paid', updated_at: '2026-08-21T12:30:00Z' },
    ],
  });

  assert.equal(report.success, true);
  assert.equal(report.recordsIngested, 2);
  assert.ok(Date.parse(report.newCursor) >= Date.parse('2026-08-21T12:30:00Z'));

  const staged = await ReconciliationEngine.stageDlqEvent({
    provider_connection_id: connId,
    business_id: 'biz_1',
    provider: 'shopify',
    event_type: 'orders/create',
    payload: { id: '1003', total_cents: 9900, status: 'paid' },
    error_message: 'Synthetic transient test failure',
  });

  assert.equal(staged.status, 'PENDING');
  assert.ok(staged.id.startsWith('dlq_'));

  const replayed = await ReconciliationEngine.replayDlqEvent(staged.id);
  assert.equal(replayed.success, true);
});

test('IntegrationRecoveryService fails closed instead of fabricating a successful provider repair', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const connId = 'conn_orch_test_1';
  const connection = {
    id: connId,
    provider: 'shopify',
    business_id: 'biz_test_1',
    health_status: 'DEGRADED' as const,
    auth_state: 'AUTHORIZED' as const,
    circuit_breaker_state: 'CLOSED' as const,
    metadata: {},
  };

  const webhookResult = await IntegrationRecoveryService.diagnoseAndRepair(connId, 'AUTOMATIC', {
    connectionOverride: connection,
    simulatedError: new Error('404 Not Found: Webhook subscription not found'),
  });

  assert.equal(webhookResult.success, false);
  assert.equal(webhookResult.status, 'ACTION_REQUIRED');
  assert.equal(webhookResult.actionTaken, 'MANUAL_INTERVENTION_REQUESTED');
  assert.match(webhookResult.reconnectUrl || '', /\/settings\?/);
  assert.match(webhookResult.reconnectUrl || '', /provider=shopify/);

  const revokedResult = await IntegrationRecoveryService.diagnoseAndRepair(connId, 'AUTOMATIC', {
    connectionOverride: connection,
    simulatedError: new Error('401 Unauthorized: App uninstalled by user in Shopify admin'),
  });

  assert.equal(revokedResult.success, false);
  assert.equal(revokedResult.status, 'ACTION_REQUIRED');
  assert.equal(revokedResult.actionTaken, 'MANUAL_INTERVENTION_REQUESTED');

  await assert.rejects(
    () => IntegrationRecoveryService.handleReconnectCallback('synthetic-state', {
      access_token: 'synthetic-access-token',
      expires_in: 3600,
    }),
    /generic recovery token callbacks are retired/i,
  );

  const timeline = await IntegrationRecoveryService.getRecoveryTimeline(connId);
  assert.ok(timeline.length >= 4);
});

test('degraded connection with no observed error is not silently promoted to healthy', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const result = await IntegrationRecoveryService.diagnoseAndRepair('conn_no_error_test', 'OPERATOR_MANUAL', {
    connectionOverride: {
      id: 'conn_no_error_test',
      provider: 'meta',
      business_id: 'biz_test_1',
      health_status: 'DEGRADED',
      auth_state: 'AUTHORIZED',
      circuit_breaker_state: 'CLOSED',
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.status, 'DEGRADED');
  assert.equal(result.actionTaken, 'DIAGNOSTIC_RUN');
  assert.equal(result.details?.providerProbePerformed, false);
});
