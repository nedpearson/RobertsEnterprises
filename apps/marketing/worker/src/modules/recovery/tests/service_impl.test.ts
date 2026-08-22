/**
 * Direct Implementation Unit & Integration Tests
 * Tests failureClassifier, IntegrationCircuitBreaker, RepairActions,
 * ReconciliationEngine, IntegrationRecoveryService, and recoveryRouter.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyError, parseRetryAfter, calculateBackoff } from '../failureClassifier';
import { IntegrationCircuitBreaker } from '../circuitBreaker';
import { RepairActions } from '../repairActions';
import { ReconciliationEngine } from '../reconciliationEngine';
import { IntegrationRecoveryService } from '../integrationRecoveryService';

test('failureClassifier correctly parses Retry-After and classifies 429', () => {
  assert.equal(parseRetryAfter('120'), 120);
  assert.equal(parseRetryAfter(45), 45);
  assert.equal(calculateBackoff(0, 5, 300), 5);
  assert.equal(calculateBackoff(3, 5, 300), 40);
  assert.equal(calculateBackoff(10, 5, 300), 300);

  const classified = classifyError(
    { status: 429, headers: { 'retry-after': '75' } },
    'shopify',
    'biz_test_1'
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
    { hasRefreshToken: true }
  );
  assert.equal(expired.category, 'AUTH_EXPIRED');
  assert.equal(expired.isAutoRepairable, true);

  const revoked = classifyError(
    new Error('OAuthException: App uninstalled or user revoked permission'),
    'meta',
    'biz_test_1',
    { hasRefreshToken: false }
  );
  assert.equal(revoked.category, 'AUTH_REVOKED');
  assert.equal(revoked.isAutoRepairable, false);
});

test('failureClassifier handles 410 Channel / Sync Token Expired', () => {
  const channelExp = classifyError(
    { statusCode: 410, message: 'Google Drive push channel expired' },
    'google_drive',
    'biz_test_1'
  );
  assert.equal(channelExp.category, 'CHANNEL_EXPIRED');
  assert.equal(channelExp.statusCode, 410);
  assert.equal(channelExp.isAutoRepairable, true);
});

test('IntegrationCircuitBreaker state machine: CLOSED -> OPEN -> HALF_OPEN -> CLOSED', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'test_shopify';
  const scope = 'ACCOUNT';
  const scopeId = 'conn_test_cb_1';

  // 1. Initial State: CLOSED
  let status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'CLOSED');
  assert.equal(status.allowExecution, true);

  // 2. Record 5 failures -> Transitions to OPEN
  for (let i = 1; i <= 5; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, scope, scopeId, new Error('500 Internal Server Error'), {
      cooldownSeconds: 1
    });
  }

  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'OPEN');
  assert.equal(status.allowExecution, false);

  // 3. Wait for 1s cooldown -> Transitions to HALF_OPEN
  await new Promise((r) => setTimeout(r, 1100));

  status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId);
  assert.equal(status.state, 'HALF_OPEN');
  assert.equal(status.allowExecution, true);

  // 4. Record 3 successful probes -> Transitions back to CLOSED
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

  // Record 3 failures across 3 distinct scopes
  await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'conn_1', new Error('503'), { failureThreshold: 3 });
  await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'conn_1', new Error('503'), { failureThreshold: 3 });
  await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'conn_1', new Error('503'), { failureThreshold: 3 });

  await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'conn_2', new Error('503'), { failureThreshold: 3 });
  await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'conn_2', new Error('503'), { failureThreshold: 3 });
  await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'conn_2', new Error('503'), { failureThreshold: 3 });

  await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'conn_3', new Error('503'), { failureThreshold: 3 });
  await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'conn_3', new Error('503'), { failureThreshold: 3 });
  await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'conn_3', new Error('503'), { failureThreshold: 3 });

  const status1 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'conn_1');
  assert.equal(status1.isProviderOutage, true);
  assert.equal(status1.allowExecution, false);

  // Reset provider outage
  await IntegrationCircuitBreaker.resetProviderOutage(provider);

  const statusReset = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'conn_1');
  assert.equal(statusReset.isProviderOutage, false);
});

test('RepairActions executes webhook repair, token refresh, and watch renewal', async () => {
  const shopifyRepair = await RepairActions.repairShopifyWebhook({
    id: 'conn_test_shop',
    provider: 'shopify'
  });
  assert.equal(shopifyRepair.success, true);
  assert.equal(shopifyRepair.actionTaken, 'WEBHOOK_RECREATED');

  const metaRepair = await RepairActions.repairMetaWebhook({
    id: 'conn_test_meta',
    provider: 'instagram'
  });
  assert.equal(metaRepair.success, true);
  assert.equal(metaRepair.actionTaken, 'WEBHOOK_RECREATED');

  const googleTokenRefresh = await RepairActions.refreshGoogleToken({
    id: 'conn_test_gdrive',
    metadata: { refresh_token: '1//valid_refresh_token' }
  });
  assert.equal(googleTokenRefresh.success, true);
  assert.equal(googleTokenRefresh.actionTaken, 'TOKEN_REFRESHED');

  const driveWatchRenew = await RepairActions.renewGoogleDriveWatch({
    channel_id: 'old_chan_1',
    resource_id: 'res_root_1'
  });
  assert.equal(driveWatchRenew.success, true);
  assert.equal(driveWatchRenew.actionTaken, 'WATCH_RENEWED');
});

test('ReconciliationEngine reconciles orders and records DLQ event', async () => {
  const connId = 'conn_recon_test_1';
  const report = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'orders',
    ordersToIngest: [
      { id: '1001', total_cents: 5000, status: 'paid', updated_at: '2026-08-21T12:00:00Z' },
      { id: '1002', total_cents: 7500, status: 'paid', updated_at: '2026-08-21T12:30:00Z' }
    ]
  });

  assert.equal(report.success, true);
  assert.equal(report.recordsIngested, 2);
  // A stale replay must never move the high-water mark backwards.
  assert.ok(Date.parse(report.newCursor) >= Date.parse('2026-08-21T12:30:00Z'));

  // DLQ Staging and Replay
  const staged = await ReconciliationEngine.stageDlqEvent({
    provider_connection_id: connId,
    business_id: 'biz_1',
    provider: 'shopify',
    event_type: 'orders/create',
    payload: { id: '1003', total_cents: 9900, status: 'paid' },
    error_message: 'Transient network failure'
  });

  assert.equal(staged.status, 'PENDING');
  assert.ok(staged.id.startsWith('dlq_'));

  const replayed = await ReconciliationEngine.replayDlqEvent(staged.id);
  assert.equal(replayed.success, true);
});

test('IntegrationRecoveryService handles automated repair, OAuth reconnect URL, and callback validation', async () => {
  const connId = 'conn_orch_test_1';

  // 1. Webhook missing auto-repair
  const webhookResult = await IntegrationRecoveryService.diagnoseAndRepair(connId, 'AUTOMATIC', {
    simulatedError: new Error('404 Not Found: Webhook subscription not found')
  });

  assert.equal(webhookResult.success, true);
  assert.equal(webhookResult.status, 'HEALTHY');
  assert.equal(webhookResult.actionTaken, 'WEBHOOK_RECREATED');

  // 2. OAuth revoked -> Action Required with signed reconnect URL
  const revokedResult = await IntegrationRecoveryService.diagnoseAndRepair(connId, 'AUTOMATIC', {
    simulatedError: new Error('401 Unauthorized: App uninstalled by user in Shopify admin')
  });

  assert.equal(revokedResult.success, false);
  assert.equal(revokedResult.status, 'ACTION_REQUIRED');
  assert.ok(revokedResult.reconnectUrl?.includes('reconnect=true'));
  assert.ok(revokedResult.reconnectUrl?.includes('state='));

  // 3. Extract signed state from reconnectUrl and handle callback
  const stateMatch = revokedResult.reconnectUrl!.match(/state=([^&]+)/);
  assert.ok(stateMatch && stateMatch[1]);
  const signedState = stateMatch![1];

  const callbackRes = await IntegrationRecoveryService.handleReconnectCallback(signedState, {
    access_token: 'new_shpat_token_valid_9921',
    expires_in: 3600
  });

  assert.equal(callbackRes.success, true);
  assert.equal(callbackRes.status, 'HEALTHY');

  // 4. Verify timeline entries recorded
  const timeline = await IntegrationRecoveryService.getRecoveryTimeline(connId);
  assert.ok(timeline.length >= 3);
});
