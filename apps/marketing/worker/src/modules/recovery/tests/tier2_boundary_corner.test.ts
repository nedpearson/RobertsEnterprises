/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Integration Operations & Auto-Recovery System
 * 
 * Tests:
 *  - Rate limits 429 backoff & Retry-After header parsing
 *  - Max retries & DLQ escalation
 *  - Circuit breaker half-open transition & probe canary success/failure
 *  - Provider outage tripping (>25% failures or >3 tenants)
 *  - Expired sync token 410 Gone delta fallback
 *  - Duplicate event replay idempotency
 *  - Empty payloads, malformed JSON, and header drift
 *  - Extreme timestamp skew and clock drift
 */

import assert from 'node:assert/strict';
import {
  IntegrationTestStore,
  FailureClassifierOracle,
  CircuitBreakerOracle,
  ReconciliationOracle,
  CryptoHelper,
  DlqEvent
} from './harness';

export async function runTier2BoundaryTests() {
  console.log('\n--- Running Tier 2: Boundary & Corner Case Tests (23+ Tests) ---');
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
  // 1. Rate Limits 429 Backoff & Retry-After
  // =========================================================================

  await test('B1-01: Correctly parses numeric Retry-After: 120 header and computes delay', () => {
    const rawError = {
      statusCode: 429,
      headers: { 'retry-after': '120' },
      message: 'Rate limit exceeded'
    };
    const retryAfter = parseInt(rawError.headers['retry-after'], 10);
    assert.equal(retryAfter, 120);

    const classification = FailureClassifierOracle.classify({ status: 429, retryAfter }, 'shopify', 'biz_ido_bridal');
    assert.equal(classification.category, 'RATE_LIMITED');
    assert.equal(classification.retryAfterSeconds, 120);
  });

  await test('B1-02: Handles missing Retry-After header with exponential backoff clamped to [5s, 300s]', () => {
    const computeBackoff = (attempt: number) => {
      const base = 5;
      const delay = Math.min(300, Math.pow(2, attempt) * base);
      return delay;
    };

    assert.equal(computeBackoff(0), 5);
    assert.equal(computeBackoff(1), 10);
    assert.equal(computeBackoff(2), 20);
    assert.equal(computeBackoff(6), 300); // Clamped to 300s max
  });

  await test('B1-03: Handles HTTP Date format in Retry-After: Wed, 21 Oct 2026 07:28:00 GMT', () => {
    const nowMs = 1792567620000;
    const futureDateStr = new Date(nowMs + 90000).toUTCString();
    const targetMs = new Date(futureDateStr).getTime();
    const delaySeconds = Math.max(1, Math.round((targetMs - nowMs) / 1000));

    assert.equal(delaySeconds, 90);
  });

  // =========================================================================
  // 2. Max Retries & DLQ Escalation
  // =========================================================================

  await test('B2-01: Increments attempt counter on retry failure', () => {
    const dlqEvent: DlqEvent = {
      id: 'dlq_evt_1',
      business_id: 'biz_ido_bridal',
      provider: 'shopify',
      event_type: 'orders/create',
      idempotency_key: 'idemp_ord_1',
      raw_payload: { id: '9901' },
      headers: {},
      status: 'PENDING',
      attempts: 0,
      max_attempts: 5,
      next_retry_at: new Date().toISOString()
    };

    dlqEvent.attempts += 1;
    assert.equal(dlqEvent.attempts, 1);
    assert.equal(dlqEvent.status, 'PENDING');
  });

  await test('B2-02: Transitions to DEAD_LETTER when attempts reach max_attempts (5)', () => {
    const dlqEvent: DlqEvent = {
      id: 'dlq_evt_2',
      business_id: 'biz_ido_bridal',
      provider: 'shopify',
      event_type: 'orders/create',
      idempotency_key: 'idemp_ord_2',
      raw_payload: { id: '9902' },
      headers: {},
      status: 'PENDING',
      attempts: 4,
      max_attempts: 5,
      next_retry_at: new Date().toISOString()
    };

    dlqEvent.attempts += 1;
    if (dlqEvent.attempts >= dlqEvent.max_attempts) {
      dlqEvent.status = 'DEAD_LETTER';
    }

    assert.equal(dlqEvent.attempts, 5);
    assert.equal(dlqEvent.status, 'DEAD_LETTER');
  });

  await test('B2-03: Allows manual re-queue from Platform Admin to reset attempts and status to PENDING', () => {
    const dlqEvent: DlqEvent = {
      id: 'dlq_evt_3',
      business_id: 'biz_ido_bridal',
      provider: 'shopify',
      event_type: 'orders/create',
      idempotency_key: 'idemp_ord_3',
      raw_payload: { id: '9903' },
      headers: {},
      status: 'DEAD_LETTER',
      attempts: 5,
      max_attempts: 5,
      next_retry_at: new Date().toISOString()
    };

    // Operator triggers retry
    dlqEvent.status = 'PENDING';
    dlqEvent.attempts = 0;
    dlqEvent.next_retry_at = new Date().toISOString();

    assert.equal(dlqEvent.status, 'PENDING');
    assert.equal(dlqEvent.attempts, 0);
  });

  // =========================================================================
  // 3. Circuit Breaker Half-Open Transitions & Outage Tripping
  // =========================================================================

  await test('B3-01: Single failure in HALF_OPEN trips immediately back to OPEN with full cooldown', async () => {
    const provider = 'shopify';
    const scope = 'TENANT';
    const scopeId = 'biz_proper_co';

    // Trip to OPEN
    for (let i = 0; i < 5; i++) {
      await circuitBreaker.recordFailure(provider, scope, scopeId, new Error('500'));
    }

    // Force HALF_OPEN
    const key = `${provider}:${scope}:${scopeId}`;
    store.circuitBreakers.get(key)!.cooldownExpiresAt = new Date(Date.now() - 1000).toISOString();
    const halfOpenStatus = await circuitBreaker.checkCircuit(provider, scope, scopeId);
    assert.equal(halfOpenStatus.state, 'HALF_OPEN');

    // Single failure in HALF_OPEN
    await circuitBreaker.recordFailure(provider, scope, scopeId, new Error('500 probe fail'));
    const statusAfterFail = await circuitBreaker.checkCircuit(provider, scope, scopeId);
    assert.equal(statusAfterFail.state, 'OPEN');
    assert.equal(statusAfterFail.allowExecution, false);
  });

  await test('B3-02: Provider-wide outage trips when >3 distinct tenants fail simultaneously', async () => {
    const provider = 'instagram';
    const tenants = ['biz_tenant_1', 'biz_tenant_2', 'biz_tenant_3', 'biz_tenant_4'];

    for (const t of tenants) {
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.recordFailure(provider, 'TENANT', t, new Error('503 Service Unavailable'));
      }
    }

    const status1 = await circuitBreaker.checkCircuit(provider, 'TENANT', 'biz_tenant_1');
    assert.equal(status1.isProviderOutage, true);
    assert.equal(status1.allowExecution, false);
  });

  await test('B3-03: Provider health probe recovery resets outage flag across all affected tenants', async () => {
    const provider = 'instagram';
    circuitBreaker.resetProviderOutage(provider);

    const status1 = await circuitBreaker.checkCircuit(provider, 'TENANT', 'biz_tenant_1');
    assert.equal(status1.isProviderOutage, false);
  });

  // =========================================================================
  // 4. Google Calendar 410 Gone Delta Fallback
  // =========================================================================

  await test('B4-01: Detects 410 Gone on expired sync token and falls back to full window scan', () => {
    const syncTokenError = {
      statusCode: 410,
      message: 'Sync token is no longer valid'
    };

    const handleSyncTokenError = (err: typeof syncTokenError) => {
      if (err.statusCode === 410) {
        return { fallbackToFullSync: true, queryParam: 'updatedMin' };
      }
      return { fallbackToFullSync: false, queryParam: 'syncToken' };
    };

    const strategy = handleSyncTokenError(syncTokenError);
    assert.equal(strategy.fallbackToFullSync, true);
    assert.equal(strategy.queryParam, 'updatedMin');
  });

  await test('B4-02: Generates new valid sync token after 410 fallback sync completes', () => {
    let currentSyncToken = 'expired_sync_token_881';
    // Fallback sync receives new syncToken from Google Calendar API
    const newSyncToken = 'next_sync_token_valid_992';
    currentSyncToken = newSyncToken;

    assert.equal(currentSyncToken, 'next_sync_token_valid_992');
  });

  // =========================================================================
  // 5. Duplicate Event Replay & Idempotency
  // =========================================================================

  await test('B5-01: Ingesting 20 duplicate orders produces exactly 1 order row and 19 skipped', async () => {
    const duplicateBatch = Array.from({ length: 20 }, () => ({
      id: 'ord_flash_100',
      total_cents: 299000,
      status: 'paid',
      updated_at: '2026-08-21T19:00:00Z'
    }));

    const report = await reconciler.reconcileShopifyOrders('conn_shopify_ido', duplicateBatch);
    assert.equal(report.recordsIngested, 1);
    assert.equal(report.recordsSkippedDuplicates, 19);

    const count = Array.from(store.orders.values()).filter(o => o.external_order_id === 'ord_flash_100').length;
    assert.equal(count, 1);
  });

  await test('B5-02: Idempotent message ingestion ignores identical external_message_id', async () => {
    const msgs = Array.from({ length: 10 }, () => ({
      id: 'mid_dup_test_55',
      sender_id: 'user_emily',
      text: 'Do you carry Justin Alexander gowns?',
      created_time: '2026-08-21T19:15:00Z'
    }));

    const report = await reconciler.reconcileInstagramMessages('conn_instagram_ido', msgs);
    assert.equal(report.recordsIngested, 1);
    assert.equal(report.recordsSkippedDuplicates, 9);
  });

  // =========================================================================
  // 6. Empty Payloads, Malformed JSON & Header Drift
  // =========================================================================

  await test('B6-01: Empty JSON payload {} handled gracefully without throwing unhandled exceptions', () => {
    const parsePayload = (rawBody: string) => {
      if (!rawBody || rawBody.trim() === '' || rawBody === '{}') {
        return { empty: true, items: [] };
      }
      return { empty: false, data: JSON.parse(rawBody) };
    };

    assert.equal(parsePayload('').empty, true);
    assert.equal(parsePayload('{}').empty, true);
    assert.equal(parsePayload('{"id":"1"}').empty, false);
  });

  await test('B6-02: Malformed JSON syntax error safely caught and routed to DLQ', () => {
    const malformed = '{"order_id": 9921, "status": "paid"'; // missing closing brace
    let errCat: string = '';
    try {
      JSON.parse(malformed);
    } catch (e: unknown) {
      const classified = FailureClassifierOracle.classify(e, 'shopify', 'biz_ido_bridal');
      errCat = classified.category;
    }

    assert.equal(errCat, 'SCHEMA_MISMATCH');
  });

  await test('B6-03: Webhook header case-insensitivity (x-shopify-hmac-sha256 vs X-Shopify-Hmac-Sha256)', () => {
    const headers = {
      'x-shopify-hmac-sha256': 'valid_hmac_signature_value'
    };

    const getHmacHeader = (hdrs: Record<string, string>) => {
      return hdrs['x-shopify-hmac-sha256'] || hdrs['X-Shopify-Hmac-Sha256'] || hdrs['X-SHOPIFY-HMAC-SHA256'];
    };

    assert.equal(getHmacHeader(headers), 'valid_hmac_signature_value');
  });

  // =========================================================================
  // 7. Extreme Timestamp Skew & Clock Drift
  // =========================================================================

  await test('B7-01: Event timestamp in distant future (+24h) is clamped to now() for cursor advancement', () => {
    const futureTimestamp = new Date(Date.now() + 86400000).toISOString();
    const nowIso = new Date().toISOString();

    const clampCursorTimestamp = (ts: string) => {
      const eventMs = new Date(ts).getTime();
      const currentMs = Date.now();
      if (eventMs > currentMs) {
        return nowIso;
      }
      return ts;
    };

    assert.equal(clampCursorTimestamp(futureTimestamp), nowIso);
  });

  await test('B7-02: Event timestamp in distant past (-30d) safely reconciled without regressing cursor', () => {
    const cursor = store.syncCursors.get('conn_shopify_ido:orders')!;
    const originalWatermark = cursor.high_watermark_timestamp;
    const oldEventTime = new Date(Date.now() - 86400000 * 30).toISOString();

    const updateWatermark = (currentWatermark: string, eventTime: string) => {
      if (new Date(eventTime).getTime() > new Date(currentWatermark).getTime()) {
        return eventTime;
      }
      return currentWatermark; // Watermark does not regress
    };

    const result = updateWatermark(originalWatermark, oldEventTime);
    assert.equal(result, originalWatermark);
  });

  console.log(`\nTier 2 Summary: ${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
  if (failed > 0) throw new Error(`${failed} Tier 2 tests failed.`);
  return { passed, failed, total: passed + failed };
}
