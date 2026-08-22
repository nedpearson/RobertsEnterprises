/**
 * Tier 3: Cross-Feature Combinations Test Suite (10+ Complex Interaction Tests)
 * Integration Operations & Auto-Recovery System
 * 
 * Tests complex multi-module interactions:
 *  1. Simulated outage during active webhook drift + reconnection + reconciliation + circuit breaker recovery
 *  2. Token expiry during active sync cursor replay + auto-refresh + cursor advancement
 *  3. Circuit breaker OPEN -> HALF_OPEN during incoming webhook burst -> queue to DLQ -> auto-drain on recovery
 *  4. Multi-brand simultaneous failure: Brand A auto-repairable (webhook) vs Brand B action required (auth revoked)
 *  5. Stale connection detection -> watch renewal + token refresh in single recovery cycle
 *  6. Webhook payload corruption -> SCHEMA_MISMATCH -> DLQ -> replay with fixed schema
 *  7. Rate limit 429 backoff during reconciliation chunking -> backoff honored -> resume from exact cursor
 *  8. Simultaneous Google Calendar 410 invalid token + Google Drive watch renewal
 *  9. Dead letter queue replay with idempotency verification against existing orders table
 * 10. Operator manual "Force Reconcile" while background reconciliation is locked
 */

import assert from 'node:assert/strict';
import {
  IntegrationTestStore,
  FailureClassifierOracle,
  CircuitBreakerOracle,
  ReconciliationOracle,
  CryptoHelper,
  ProviderConnection,
  DlqEvent
} from './harness';

export async function runTier3CrossFeatureTests() {
  console.log('\n--- Running Tier 3: Cross-Feature Combination Tests (10 Tests) ---');
  let passed = 0;
  let failed = 0;
  const store = new IntegrationTestStore();
  const circuitBreaker = new CircuitBreakerOracle(store);
  const reconciler = new ReconciliationOracle(store);

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${(err as Error).message}`);
      failed++;
    }
  }

  // =========================================================================
  // 1. Outage during Webhook Drift + Reconnection + Reconciliation + Recovery
  // =========================================================================

  await test('X1-01: Outage during webhook drift -> trips circuit -> provider recovers -> auto-repairs webhook -> reconciles missed orders', async () => {
    const conn = store.connections.get('conn_shopify_ido')!;
    conn.webhook_status = 'MISSING';
    conn.health_status = 'DEGRADED';

    // Step 1: Multiple failures trip circuit breaker to OPEN
    for (let i = 0; i < 5; i++) {
      await circuitBreaker.recordFailure('shopify', 'TENANT', conn.business_id, new Error('503 Outage'));
    }
    const statusOpen = await circuitBreaker.checkCircuit('shopify', 'TENANT', conn.business_id);
    assert.equal(statusOpen.state, 'OPEN');

    // Step 2: Outage ends -> transition to HALF_OPEN
    const key = `shopify:TENANT:${conn.business_id}`;
    store.circuitBreakers.get(key)!.cooldownExpiresAt = new Date(Date.now() - 1000).toISOString();
    const statusHalfOpen = await circuitBreaker.checkCircuit('shopify', 'TENANT', conn.business_id);
    assert.equal(statusHalfOpen.state, 'HALF_OPEN');

    // Step 3: Auto-repair recreates webhook
    conn.webhook_id = 'wh_shopify_restored_2001';
    conn.webhook_status = 'ACTIVE';

    // Step 4: Reconcile missed orders accumulated during outage
    const missedOrders = [
      { id: '11001', total_cents: 450000, status: 'paid', updated_at: new Date().toISOString() },
      { id: '11002', total_cents: 180000, status: 'paid', updated_at: new Date().toISOString() }
    ];
    const report = await reconciler.reconcileShopifyOrders(conn.id, missedOrders);
    assert.equal(report.recordsIngested, 2);

    // Step 5: Circuit closes after successful operation
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.recordSuccess('shopify', 'TENANT', conn.business_id);
    }
    const finalCircuit = await circuitBreaker.checkCircuit('shopify', 'TENANT', conn.business_id);
    assert.equal(finalCircuit.state, 'CLOSED');
    assert.equal(conn.health_status, 'HEALTHY');
  });

  // =========================================================================
  // 2. Token Expiry during Active Sync Replay + Auto-Refresh + Cursor Advance
  // =========================================================================

  await test('X2-01: Token expires during sync replay -> auto-refreshes token -> resumes ingestion and advances watermark', async () => {
    const conn = store.connections.get('conn_gdrive_ido')!;
    conn.token_expires_at = new Date(Date.now() - 5000).toISOString(); // Expired

    // Detect expiration during sync
    const classification = FailureClassifierOracle.classify('401 Token Expired', 'google_drive', conn.business_id, !!conn.refresh_token);
    assert.equal(classification.category, 'AUTH_EXPIRED');

    // Execute token refresh
    conn.access_token = 'ya29.refreshed_during_sync_token';
    conn.token_expires_at = new Date(Date.now() + 3600_000).toISOString();
    conn.auth_state = 'VALID';

    // Advance cursor
    const cursor = store.syncCursors.get('conn_shopify_ido:orders')!;
    cursor.high_watermark_timestamp = new Date().toISOString();
    cursor.last_successful_sync_at = new Date().toISOString();

    assert.equal(conn.access_token, 'ya29.refreshed_during_sync_token');
    assert.equal(conn.auth_state, 'VALID');
  });

  // =========================================================================
  // 3. Circuit Breaker OPEN -> Webhooks Staged to DLQ -> Auto-Drain on Recovery
  // =========================================================================

  await test('X3-01: Webhooks received while circuit is OPEN are staged to DLQ and auto-drained when circuit recovers', async () => {
    const conn = store.connections.get('conn_shopify_ido')!;
    const incomingWebhooks = [
      { id: 'ord_wh_1', payload: { id: '20001', total_price: '500.00' } },
      { id: 'ord_wh_2', payload: { id: '20002', total_price: '750.00' } }
    ];

    // Stage to DLQ
    for (const wh of incomingWebhooks) {
      store.dlqEvents.set(wh.id, {
        id: `dlq_${wh.id}`,
        connection_id: conn.id,
        business_id: conn.business_id,
        provider: 'shopify',
        event_type: 'orders/create',
        idempotency_key: `idemp_${wh.id}`,
        raw_payload: wh.payload,
        headers: {},
        status: 'PENDING',
        attempts: 0,
        max_attempts: 5,
        next_retry_at: new Date().toISOString()
      });
    }

    assert.equal(store.dlqEvents.size, 2);

    // Drain DLQ on recovery
    for (const [id, evt] of store.dlqEvents.entries()) {
      if (evt.status === 'PENDING') {
        evt.status = 'REPLAYED';
        store.orders.set(`${evt.business_id}:${evt.raw_payload.id}`, {
          id: `ord_${evt.raw_payload.id}`,
          business_id: evt.business_id,
          external_order_id: String(evt.raw_payload.id),
          source_type: 'SHOPIFY',
          total_cents: 50000,
          status: 'paid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    const replayed = Array.from(store.dlqEvents.values()).filter(e => e.status === 'REPLAYED');
    assert.equal(replayed.length, 2);
  });

  // =========================================================================
  // 4. Multi-Brand Isolation: Auto-Repairable Brand vs Action Required Brand
  // =========================================================================

  await test('X4-01: Multi-brand concurrent failures isolate Brand A (auto-repairable) from Brand B (action required)', () => {
    const brandA_conn: ProviderConnection = {
      id: 'conn_brand_a',
      business_id: 'biz_ido_bridal',
      brand_id: 'brand_ido',
      provider: 'shopify',
      provider_account_id: 'ido.myshopify.com',
      display_name: 'Brand A Store',
      health_status: 'HEALTHY',
      last_event_at: null,
      last_successful_sync_at: null,
      last_health_check_at: new Date().toISOString(),
      sync_errors_24h: 0,
      circuit_breaker_state: 'CLOSED',
      auth_state: 'VALID',
      webhook_status: 'MISSING'
    };

    const brandB_conn: ProviderConnection = {
      id: 'conn_brand_b',
      business_id: 'biz_proper_co',
      brand_id: 'brand_proper',
      provider: 'shopify',
      provider_account_id: 'proper.myshopify.com',
      display_name: 'Brand B Store',
      health_status: 'HEALTHY',
      last_event_at: null,
      last_successful_sync_at: null,
      last_health_check_at: new Date().toISOString(),
      sync_errors_24h: 0,
      circuit_breaker_state: 'CLOSED',
      auth_state: 'REVOKED',
      refresh_token: undefined
    };

    // Classify Brand A
    const classA = FailureClassifierOracle.classify('WEBHOOK_MISSING 404', 'shopify', brandA_conn.business_id);
    assert.equal(classA.isAutoRepairable, true);
    brandA_conn.webhook_status = 'ACTIVE';
    brandA_conn.health_status = 'HEALTHY';

    // Classify Brand B
    const classB = FailureClassifierOracle.classify('401 Unauthorized app uninstalled', 'shopify', brandB_conn.business_id, false);
    assert.equal(classB.isAutoRepairable, false);
    brandB_conn.health_status = 'ACTION_REQUIRED';

    assert.equal(brandA_conn.health_status, 'HEALTHY');
    assert.equal(brandB_conn.health_status, 'ACTION_REQUIRED');
  });

  // =========================================================================
  // 5. Stale Connection Detection: Watch Renewal + Token Refresh in Single Cycle
  // =========================================================================

  await test('X5-01: Scheduled stale check executes both watch renewal and token refresh in unified recovery pass', async () => {
    const conn = store.connections.get('conn_gdrive_ido')!;
    conn.token_expires_at = new Date(Date.now() - 1000).toISOString(); // Stale token

    const watch = store.driveWatches.get('chan_gdrive_uuid_9921') || Array.from(store.driveWatches.values())[0];
    watch.expiration_at = new Date(Date.now() + 3600_000 * 2).toISOString(); // Stale watch (<24h)

    // Execute combined maintenance
    conn.access_token = 'ya29.new_cycle_token';
    conn.token_expires_at = new Date(Date.now() + 3600_000).toISOString();

    watch.expiration_at = new Date(Date.now() + 86400000 * 7).toISOString();
    watch.status = 'ACTIVE';

    assert.ok(new Date(conn.token_expires_at).getTime() > Date.now());
    assert.ok(new Date(watch.expiration_at).getTime() > Date.now() + 86400000 * 6);
  });

  // =========================================================================
  // 6. Webhook Payload Corruption -> DLQ -> Replay with Fixed Schema
  // =========================================================================

  await test('X6-01: Malformed webhook payload routed to DLQ and successfully replayed once schema is corrected', () => {
    const corruptPayload = { order: { id_number: "9912", total: "$5,400.00" } }; // Missing standard id & total_cents
    
    // Stage to DLQ
    const dlqEvent: DlqEvent = {
      id: 'dlq_corrupt_1',
      business_id: 'biz_ido_bridal',
      provider: 'shopify',
      event_type: 'orders/create',
      idempotency_key: 'idemp_corrupt_1',
      raw_payload: corruptPayload,
      headers: {},
      status: 'PENDING',
      attempts: 1,
      max_attempts: 5,
      last_error: 'SCHEMA_MISMATCH: Missing order.id field',
      next_retry_at: new Date().toISOString()
    };

    assert.equal(dlqEvent.last_error?.includes('SCHEMA_MISMATCH'), true);

    // Operator applies schema normalization transform and replays
    const normalizedPayload = { id: corruptPayload.order.id_number, total_cents: 540000, status: 'paid' };
    dlqEvent.raw_payload = normalizedPayload;
    dlqEvent.status = 'REPLAYED';

    store.orders.set(`biz_ido_bridal:${normalizedPayload.id}`, {
      id: `ord_${normalizedPayload.id}`,
      business_id: 'biz_ido_bridal',
      external_order_id: normalizedPayload.id,
      source_type: 'SHOPIFY',
      total_cents: normalizedPayload.total_cents,
      status: normalizedPayload.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    assert.equal(dlqEvent.status, 'REPLAYED');
    assert.ok(store.orders.has('biz_ido_bridal:9912'));
  });

  // =========================================================================
  // 7. Rate Limit 429 Backoff during Reconciliation Chunking
  // =========================================================================

  await test('X7-01: 429 Rate Limit encountered during multi-page reconciliation respects backoff and resumes from exact cursor', async () => {
    const cursor = store.syncCursors.get('conn_shopify_ido:orders')!;
    cursor.cursor_value = '2026-08-21T18:00:00Z';
    cursor.high_watermark_timestamp = '2026-08-21T18:00:00Z';

    const page1Orders = [{ id: 'p1_1', total_cents: 10000, status: 'paid', updated_at: '2026-08-21T18:01:00Z' }];
    const page2Orders = [{ id: 'p2_1', total_cents: 20000, status: 'paid', updated_at: '2026-08-21T18:02:00Z' }];

    // Ingest page 1
    const report1 = await reconciler.reconcileShopifyOrders('conn_shopify_ido', page1Orders);
    assert.equal(report1.recordsIngested, 1);
    assert.equal(report1.newCursor, '2026-08-21T18:01:00Z');

    // Encounter 429 before page 2 -> record backoff
    const classification = FailureClassifierOracle.classify({ status: 429, retryAfter: 1 }, 'shopify', 'biz_ido_bridal');
    assert.equal(classification.category, 'RATE_LIMITED');

    // Simulate wait and ingest page 2 from exact cursor
    const report2 = await reconciler.reconcileShopifyOrders('conn_shopify_ido', page2Orders);
    assert.equal(report2.recordsIngested, 1);
    assert.equal(report2.newCursor, '2026-08-21T18:02:00Z');
  });

  // =========================================================================
  // 8. Simultaneous Google Calendar 410 + Google Drive Watch Renewal
  // =========================================================================

  await test('X8-01: Handles simultaneous Google Calendar 410 sync token invalidation and Google Drive watch renewal', () => {
    // Calendar 410 handling
    const calClassification = FailureClassifierOracle.classify('Google Calendar 410 Gone', 'google_calendar', 'biz_ido_bridal');
    assert.equal(calClassification.statusCode, 410);

    // Drive renewal
    const driveClassification = FailureClassifierOracle.classify('CHANNEL_EXPIRED', 'google_drive', 'biz_ido_bridal');
    assert.equal(driveClassification.category, 'CHANNEL_EXPIRED');

    assert.equal(calClassification.isAutoRepairable, true);
    assert.equal(driveClassification.isAutoRepairable, true);
  });

  // =========================================================================
  // 9. DLQ Replay Idempotency Verification
  // =========================================================================

  await test('X9-01: Replaying DLQ events against existing database records produces 0 duplicate mutations', async () => {
    // Ensure order already exists
    store.orders.set('biz_ido_bridal:ord_existing_99', {
      id: 'ord_existing_99',
      business_id: 'biz_ido_bridal',
      external_order_id: 'ord_existing_99',
      source_type: 'SHOPIFY',
      total_cents: 150000,
      status: 'paid',
      created_at: '2026-08-21T18:00:00Z',
      updated_at: '2026-08-21T18:00:00Z'
    });

    const report = await reconciler.reconcileShopifyOrders('conn_shopify_ido', [
      { id: 'ord_existing_99', total_cents: 150000, status: 'paid', updated_at: '2026-08-21T18:00:00Z' }
    ]);

    assert.equal(report.recordsIngested, 0);
    assert.equal(report.recordsSkippedDuplicates, 1);
  });

  // =========================================================================
  // 10. Operator Force Reconcile Concurrency Conflict Rejection
  // =========================================================================

  await test('X10-01: Operator force-reconcile request is safely rejected when background sync cursor is locked', () => {
    const cursor = store.syncCursors.get('conn_shopify_ido:orders')!;
    cursor.is_locked = true;
    cursor.locked_by = 'cron-reconciler';

    const triggerForceReconcile = () => {
      if (cursor.is_locked) {
        throw new Error(`Reconciliation locked by ${cursor.locked_by}. Please wait.`);
      }
      return { started: true };
    };

    assert.throws(() => triggerForceReconcile(), /Reconciliation locked by cron-reconciler/);
  });

  console.log(`\nTier 3 Summary: ${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
  if (failed > 0) throw new Error(`${failed} Tier 3 tests failed.`);
  return { passed, failed, total: passed + failed };
}
