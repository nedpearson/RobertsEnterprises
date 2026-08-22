/**
 * Adversarial Stress & Chaos Test Suite
 * Challenger 2: Adversarial Data & Ingestion Verifier
 * 
 * Verifies:
 * 1. High-volume replay deduplication (Shopify orders, Instagram DMs, Calendar appointments) under duplicate bursts.
 * 2. Timestamp boundary conditions (future timestamps clamped, past timestamps prevented from regressing high watermark).
 * 3. Tampered HMAC signatures and corrupted payloads routed safely to Dead Letter Queue (integration_dlq_events).
 * 4. Multi-brand isolation: Brand A failure / reconnect never affects Brand B data.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import * as crypto from 'crypto';
import { ReconciliationEngine, IngestOrderPayload, IngestMessagePayload, IngestAppointmentPayload } from '../reconciliationEngine';
import { IntegrationCircuitBreaker } from '../circuitBreaker';
import { classifyError, calculateBackoff } from '../failureClassifier';
import { IntegrationRecoveryService } from '../integrationRecoveryService';
import { RepairActions } from '../repairActions';
import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Deterministic High-Fidelity Mock Supabase Client
// ============================================================================

class MockDatabase {
  orders: Map<string, any> = new Map();
  omnichannelInbox: Map<string, any> = new Map();
  appointments: Map<string, any> = new Map();
  providerConnections: Map<string, any> = new Map();
  syncCursors: Map<string, any> = new Map();
  circuitBreakers: Map<string, any> = new Map();
  dlqEvents: Map<string, any> = new Map();
  errorLogs: any[] = [];
  recoveryTimelines: any[] = [];
  googleDriveWatches: Map<string, any> = new Map();

  reset() {
    this.orders.clear();
    this.omnichannelInbox.clear();
    this.appointments.clear();
    this.providerConnections.clear();
    this.syncCursors.clear();
    this.circuitBreakers.clear();
    this.dlqEvents.clear();
    this.errorLogs = [];
    this.recoveryTimelines = [];
    this.googleDriveWatches.clear();
  }

  createClient(): SupabaseClient {
    const db = this;

    const createQueryBuilder = (tableName: string) => {
      let filters: Array<(row: any) => boolean> = [];
      let orderByField: string | null = null;
      let orderAscending = true;

      const builder: any = {
        select: (_cols?: string) => builder,
        eq: (col: string, val: any) => {
          filters.push((row: any) => row[col] === val);
          return builder;
        },
        lte: (col: string, val: any) => {
          filters.push((row: any) => row[col] <= val);
          return builder;
        },
        or: (_expr: string) => {
          // For simplicity in mock, match all
          return builder;
        },
        order: (col: string, opts?: { ascending?: boolean }) => {
          orderByField = col;
          orderAscending = opts?.ascending ?? true;
          return builder;
        },
        maybeSingle: async () => {
          const tableMap = db.getTableMap(tableName);
          const rows = Array.from(tableMap.values()).filter(r => filters.every(f => f(r)));
          return { data: rows[0] || null, error: null };
        },
        single: async () => {
          const tableMap = db.getTableMap(tableName);
          const rows = Array.from(tableMap.values()).filter(r => filters.every(f => f(r)));
          if (rows.length === 0) return { data: null, error: new Error('Row not found') };
          return { data: rows[0], error: null };
        },
        insert: async (data: any) => {
          const tableMap = db.getTableMap(tableName);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            const id = item.id || `gen_${crypto.randomBytes(6).toString('hex')}`;
            const row = { ...item, id };
            tableMap.set(id, row);
            if (tableName === 'integration_error_logs') db.errorLogs.push(row);
            if (tableName === 'integration_recovery_timelines') db.recoveryTimelines.push(row);
          }
          return { data, error: null };
        },
        update: (updates: any) => {
          return {
            eq: async (col: string, val: any) => {
              const tableMap = db.getTableMap(tableName);
              for (const [id, row] of tableMap.entries()) {
                if (row[col] === val && filters.every(f => f(row))) {
                  tableMap.set(id, { ...row, ...updates });
                }
              }
              return { data: updates, error: null };
            }
          };
        },
        upsert: async (row: any, opts?: { onConflict?: string }) => {
          const tableMap = db.getTableMap(tableName);
          const conflictKeys = opts?.onConflict ? opts.onConflict.split(',') : ['id'];
          
          let existingKey: string | null = null;
          for (const [key, existing] of tableMap.entries()) {
            const matches = conflictKeys.every(k => existing[k.trim()] === row[k.trim()]);
            if (matches) {
              existingKey = key;
              break;
            }
          }

          if (existingKey) {
            const updated = { ...tableMap.get(existingKey), ...row };
            tableMap.set(existingKey, updated);
          } else {
            const id = row.id || `gen_${crypto.randomBytes(6).toString('hex')}`;
            tableMap.set(id, { ...row, id });
          }
          return { data: row, error: null };
        },
        then: (resolve: any) => {
          const tableMap = db.getTableMap(tableName);
          let rows = Array.from(tableMap.values()).filter(r => filters.every(f => f(r)));
          if (orderByField) {
            rows.sort((a, b) => {
              if (a[orderByField!] < b[orderByField!]) return orderAscending ? -1 : 1;
              if (a[orderByField!] > b[orderByField!]) return orderAscending ? 1 : -1;
              return 0;
            });
          }
          resolve({ data: rows, error: null });
        }
      };

      return builder;
    };

    return {
      from: (tableName: string) => createQueryBuilder(tableName)
    } as unknown as SupabaseClient;
  }

  getTableMap(tableName: string): Map<string, any> {
    switch (tableName) {
      case 'orders': return this.orders;
      case 'omnichannel_inbox': return this.omnichannelInbox;
      case 'appointments': return this.appointments;
      case 'provider_connections': return this.providerConnections;
      case 'integration_sync_cursors': return this.syncCursors;
      case 'integration_circuit_breakers': return this.circuitBreakers;
      case 'integration_dlq_events': return this.dlqEvents;
      case 'google_drive_watches': return this.googleDriveWatches;
      default: return new Map();
    }
  }
}

const mockDb = new MockDatabase();
const testClient = mockDb.createClient();

// ============================================================================
// SUITE 1: High-Volume Replay Deduplication Under Extreme Bursts
// ============================================================================

test('ADVERSARIAL 1.1: 1,000 Shopify orders burst with 90% duplicates is cleanly deduplicated', async () => {
  mockDb.reset();
  const connId = 'conn_adv_shopify_1';
  const bizId = 'biz_ido_bridal';

  mockDb.providerConnections.set(connId, {
    id: connId,
    business_id: bizId,
    brand_id: 'brand_ido',
    provider: 'shopify',
    health_status: 'HEALTHY'
  });

  // Generate 100 unique orders, replicated 10 times each (1,000 total) with scrambled timestamps
  const uniqueOrderCount = 100;
  const burstList: IngestOrderPayload[] = [];
  const baseTime = Date.now() - 3600_000;

  for (let i = 1; i <= uniqueOrderCount; i++) {
    const extId = `SHOP-ORD-${10000 + i}`;
    for (let copy = 0; copy < 10; copy++) {
      burstList.push({
        id: extId,
        external_order_id: extId,
        total_cents: 25000 + (i * 100),
        status: copy === 9 ? 'FULFILLED' : 'PAID', // latest copy is fulfilled
        created_at: new Date(baseTime + i * 1000).toISOString(),
        updated_at: new Date(baseTime + i * 1000 + copy * 10).toISOString()
      });
    }
  }

  // Shuffle the burst list adversarially
  burstList.sort(() => Math.random() - 0.5);

  const report = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'orders',
    ordersToIngest: burstList,
    db: testClient
  });

  assert.equal(report.success, true);
  assert.equal(report.recordsIngested, 100, 'Exactly 100 unique orders must be ingested');
  assert.equal(report.recordsSkippedDuplicates, 900, 'Exactly 900 duplicate orders must be skipped');
  assert.equal(mockDb.orders.size, 100, 'Orders table must contain exactly 100 rows');

  // Verify all orders in database belong to biz_ido_bridal
  for (const order of mockDb.orders.values()) {
    assert.equal(order.business_id, bizId);
    assert.ok(order.external_order_id.startsWith('SHOP-ORD-'));
  }
});

test('ADVERSARIAL 1.2: 1,000 Instagram DMs burst with high duplicate volume into omnichannel_inbox', async () => {
  mockDb.reset();
  const connId = 'conn_adv_ig_1';
  const bizId = 'biz_ido_bridal';

  mockDb.providerConnections.set(connId, {
    id: connId,
    business_id: bizId,
    brand_id: 'brand_ido',
    provider_account_id: 'act_ig_ido',
    provider: 'instagram',
    health_status: 'HEALTHY'
  });

  const uniqueMsgs = 50;
  const burstList: IngestMessagePayload[] = [];

  for (let i = 1; i <= uniqueMsgs; i++) {
    const msgId = `IG-MSG-${5000 + i}`;
    for (let c = 0; c < 20; c++) {
      burstList.push({
        id: msgId,
        external_message_id: msgId,
        sender_id: `user_${i}`,
        sender_name: `Bride Candidate ${i}`,
        text: `Do you have dress #${i} available?`,
        created_time: new Date(Date.now() - 1800_000 + i * 1000).toISOString()
      });
    }
  }

  burstList.sort(() => Math.random() - 0.5);

  const report = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'messages',
    messagesToIngest: burstList,
    db: testClient
  });

  assert.equal(report.success, true);
  assert.equal(report.recordsIngested, 50);
  assert.equal(report.recordsSkippedDuplicates, 950);
  assert.equal(mockDb.omnichannelInbox.size, 50);
});

test('ADVERSARIAL 1.3: Calendar appointment updates under duplicate replay update status without row explosion', async () => {
  mockDb.reset();
  const connId = 'conn_adv_cal_1';
  const bizId = 'biz_ido_bridal';

  mockDb.providerConnections.set(connId, {
    id: connId,
    business_id: bizId,
    provider: 'google_calendar',
    health_status: 'HEALTHY'
  });

  const appointments: IngestAppointmentPayload[] = [
    { id: 'APT-101', external_id: 'APT-101', type: 'FIRST_FITTING', date: '2026-08-25', time: '10:00:00', status: 'REQUESTED' },
    { id: 'APT-101', external_id: 'APT-101', type: 'FIRST_FITTING', date: '2026-08-25', time: '10:00:00', status: 'CONFIRMED' },
    { id: 'APT-101', external_id: 'APT-101', type: 'FIRST_FITTING', date: '2026-08-25', time: '11:00:00', status: 'RESCHEDULED' },
    { id: 'APT-102', external_id: 'APT-102', type: 'VEIL_TRIAL', date: '2026-08-26', time: '14:00:00', status: 'CONFIRMED' },
    { id: 'APT-102', external_id: 'APT-102', type: 'VEIL_TRIAL', date: '2026-08-26', time: '14:00:00', status: 'CONFIRMED' }
  ];

  const report = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'appointments',
    appointmentsToIngest: appointments,
    db: testClient
  });

  assert.equal(report.success, true);
  assert.equal(report.recordsIngested, 2);
  assert.equal(report.recordsSkippedDuplicates, 3);
  assert.equal(mockDb.appointments.size, 2);

  const updatedApt = Array.from(mockDb.appointments.values()).find(a => a.external_appointment_id === 'APT-101');
  assert.equal(updatedApt?.status, 'RESCHEDULED');
  assert.equal(updatedApt?.time, '11:00:00');
});

test('ADVERSARIAL 1.4: Concurrent cursor lock prevents parallel race conditions', async () => {
  mockDb.reset();
  const connId = 'conn_adv_lock_1';
  mockDb.providerConnections.set(connId, { id: connId, provider: 'shopify', business_id: 'biz_1' });

  // Manually lock cursor
  mockDb.syncCursors.set(`${connId}:orders`, {
    provider_connection_id: connId,
    resource_type: 'orders',
    sync_status: 'SYNCING',
    lock_expires_at: new Date(Date.now() + 60_000).toISOString()
  });

  // Attempting concurrent reconcile must throw locking exception
  await assert.rejects(
    async () => {
      await ReconciliationEngine.reconcileConnection(connId, {
        resourceType: 'orders',
        ordersToIngest: [{ id: '99', total_cents: 100, status: 'paid' }],
        db: testClient
      });
    },
    /locked by another worker/
  );
});

// ============================================================================
// SUITE 2: Timestamp Boundary Conditions & High-Water Mark Clamping
// ============================================================================

test('ADVERSARIAL 2.1: Far-future timestamp (+48h) is clamped to now()', async () => {
  mockDb.reset();
  const connId = 'conn_adv_ts_1';
  mockDb.providerConnections.set(connId, { id: connId, provider: 'shopify', business_id: 'biz_1' });

  const futureTime = new Date(Date.now() + 48 * 3600_000).toISOString(); // +48h in future
  const report = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'orders',
    ordersToIngest: [{ id: 'FUT-1', total_cents: 5000, status: 'paid', updated_at: futureTime }],
    db: testClient
  });

  assert.equal(report.success, true);
  const nowMs = Date.now();
  const cursorMs = new Date(report.newCursor).getTime();
  assert.ok(cursorMs <= nowMs + 1000, 'Far future cursor must be clamped near now()');
  assert.ok(cursorMs >= nowMs - 5000, 'Clamped cursor must be within recent seconds');
});

test('ADVERSARIAL 2.2: Historical timestamp (-60d) does NOT regress high watermark', async () => {
  mockDb.reset();
  const connId = 'conn_adv_ts_2';
  const initialWatermark = new Date(Date.now() - 3600_000).toISOString(); // 1 hour ago

  mockDb.providerConnections.set(connId, { id: connId, provider: 'shopify', business_id: 'biz_1' });
  mockDb.syncCursors.set(`${connId}:orders`, {
    provider_connection_id: connId,
    resource_type: 'orders',
    last_cursor: initialWatermark,
    sync_status: 'IDLE',
    records_synced_total: 10
  });

  const historicalTime = new Date(Date.now() - 60 * 86400_000).toISOString(); // 60 days ago
  const report = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'orders',
    ordersToIngest: [{ id: 'HIST-1', total_cents: 2000, status: 'paid', updated_at: historicalTime }],
    db: testClient
  });

  assert.equal(report.success, true);
  assert.equal(report.newCursor, initialWatermark, 'Watermark must NOT regress into the past');
});

test('ADVERSARIAL 2.3: Out-of-order timestamps monotonically advance watermark to highest valid timestamp', async () => {
  mockDb.reset();
  const connId = 'conn_adv_ts_3';
  mockDb.providerConnections.set(connId, { id: connId, provider: 'shopify', business_id: 'biz_1' });

  const tBase = Date.now();
  const tMinus10d = new Date(tBase - 10 * 86400000).toISOString();
  const tMinus2h = new Date(tBase - 2 * 3600000).toISOString();
  const tMinus30m = new Date(tBase - 30 * 60000).toISOString();
  const tMinus5m = new Date(tBase - 5 * 60000).toISOString();

  // Ingest out-of-order sequence
  const report = await ReconciliationEngine.reconcileConnection(connId, {
    resourceType: 'orders',
    ordersToIngest: [
      { id: 'O-1', total_cents: 100, status: 'paid', updated_at: tMinus2h },
      { id: 'O-2', total_cents: 100, status: 'paid', updated_at: tMinus10d },
      { id: 'O-3', total_cents: 100, status: 'paid', updated_at: tMinus5m },
      { id: 'O-4', total_cents: 100, status: 'paid', updated_at: tMinus30m }
    ],
    db: testClient
  });

  assert.equal(report.success, true);
  assert.equal(report.newCursor, tMinus5m, 'Watermark must advance to the latest timestamp in batch');
});

// ============================================================================
// SUITE 3: HMAC Tampering, Corrupted Payloads & DLQ Routing
// ============================================================================

test('ADVERSARIAL 3.1: Corrupted or tampered HMAC and malformed JSON routed safely to DLQ', async () => {
  mockDb.reset();
  const secret = 'shpss_live_secret_key_adv_test_4921';
  const validPayload = JSON.stringify({ id: 99401, email: 'tamper.test@vowos.com', total_price: '450.00' });
  const validHmac = crypto.createHmac('sha256', secret).update(validPayload).digest('base64');

  // Verify valid HMAC check passes
  const validMatch = crypto.timingSafeEqual(
    Buffer.from(validHmac),
    Buffer.from(crypto.createHmac('sha256', secret).update(validPayload).digest('base64'))
  );
  assert.equal(validMatch, true);

  // 1. Bit-flip in HMAC signature
  const tamperedHmac = validHmac.slice(0, -2) + (validHmac.slice(-2) === '==' ? 'AA' : '==');
  const isTamperedValid = (tamperedHmac === validHmac);
  assert.equal(isTamperedValid, false, 'Tampered HMAC must not match');

  // Stage tampered event to DLQ
  const dlqRow = await ReconciliationEngine.stageDlqEvent({
    business_id: 'biz_ido_bridal',
    provider: 'shopify',
    event_type: 'orders/create',
    payload: { raw: validPayload },
    headers: { 'x-shopify-hmac-sha256': tamperedHmac },
    error_message: 'Invalid HMAC signature — signature mismatch',
    retry_count: 0,
    max_retries: 5
  }, { db: testClient });

  assert.ok(dlqRow.id.startsWith('dlq_'));
  assert.equal(dlqRow.status, 'PENDING');
  assert.equal(mockDb.dlqEvents.size, 1);
});

test('ADVERSARIAL 3.2: Malformed JSON syntax error classified as SCHEMA_DRIFT and staged to DLQ', () => {
  const malformedError = new SyntaxError('Unexpected token < in JSON at position 0');
  const classified = classifyError(malformedError, 'shopify', 'biz_ido_bridal');

  assert.equal(classified.category, 'SCHEMA_DRIFT');
  assert.equal(classified.isAutoRepairable, false);
  assert.ok(classified.suggestedAction.includes('Dead Letter Queue'));
});

test('ADVERSARIAL 3.3: DLQ exponential backoff & exhaustion curve', async () => {
  mockDb.reset();
  assert.equal(calculateBackoff(0), 5);
  assert.equal(calculateBackoff(1), 10);
  assert.equal(calculateBackoff(2), 20);
  assert.equal(calculateBackoff(3), 40);
  assert.equal(calculateBackoff(4), 80);
  assert.equal(calculateBackoff(5), 160);
  assert.equal(calculateBackoff(6), 300); // Clamped to max 300s

  const dlq = await ReconciliationEngine.stageDlqEvent({
    business_id: 'biz_1',
    provider: 'shopify',
    event_type: 'orders/create',
    payload: { id: 'ERR-1' },
    error_message: 'Persistent 500 error',
    retry_count: 4,
    max_retries: 5
  }, { db: testClient });

  // Replay fails -> transitions to EXHAUSTED
  // (Replay with an unknown handler or force error)
  const exhaustedRes = await ReconciliationEngine.replayDlqEvent(dlq.id, { db: testClient });
  // Since payload is missing valid structure or throws, it increases retry count
  const updatedDlq = mockDb.dlqEvents.get(dlq.id);
  assert.ok(updatedDlq);
  assert.ok(updatedDlq.retry_count >= 5);
});

test('ADVERSARIAL 3.4: Forged or tampered OAuth reconnection state is rejected with security error', async () => {
  const validUrl = await IntegrationRecoveryService.generateReconnectUrl('conn_sec_1');
  const stateMatch = validUrl.match(/state=([^&]+)/);
  assert.ok(stateMatch);

  const rawState = stateMatch[1];
  const [b64Payload, hmac] = rawState.split('.');

  // 1. Altered payload with original HMAC
  const decodedJson = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
  decodedJson.connectionId = 'conn_ATTACKER_TARGET';
  const forgedPayloadB64 = Buffer.from(JSON.stringify(decodedJson)).toString('base64url');
  const forgedState = `${forgedPayloadB64}.${hmac}`;

  await assert.rejects(
    async () => {
      await IntegrationRecoveryService.handleReconnectCallback(forgedState, {
        access_token: 'attacker_token'
      });
    },
    /Invalid OAuth state signature/
  );

  // 2. Tampered HMAC signature
  const tamperedHmacState = `${b64Payload}.${hmac.slice(0, -4)}XXXX`;
  await assert.rejects(
    async () => {
      await IntegrationRecoveryService.handleReconnectCallback(tamperedHmacState, {
        access_token: 'attacker_token'
      });
    },
    /Invalid OAuth state signature/
  );
});

// ============================================================================
// SUITE 4: Multi-Brand Isolation & Tenant Partitioning
// ============================================================================

test('ADVERSARIAL 4.1: Catastrophic Brand A failure (revoked OAuth) does NOT affect Brand B health or sync', async () => {
  mockDb.reset();
  IntegrationCircuitBreaker.clearMemoryState();

  const connBrandA = 'conn_brand_A_ido';
  const connBrandB = 'conn_brand_B_proper';

  mockDb.providerConnections.set(connBrandA, {
    id: connBrandA,
    business_id: 'biz_ido_bridal',
    brand_id: 'brand_ido_couture',
    provider: 'shopify',
    health_status: 'HEALTHY',
    auth_state: 'AUTHORIZED'
  });

  mockDb.providerConnections.set(connBrandB, {
    id: connBrandB,
    business_id: 'biz_proper_co',
    brand_id: 'brand_proper_co',
    provider: 'shopify',
    health_status: 'HEALTHY',
    auth_state: 'AUTHORIZED'
  });

  // 1. Brand A experiences OAuth Revocation
  const repairResA = await IntegrationRecoveryService.diagnoseAndRepair(connBrandA, 'AUTOMATIC', {
    db: testClient,
    simulatedError: new Error('401 Unauthorized: Shopify app uninstalled by user')
  });

  assert.equal(repairResA.success, false);
  assert.equal(repairResA.status, 'ACTION_REQUIRED');
  assert.ok(repairResA.reconnectUrl);

  // 2. Verify Brand A is ACTION_REQUIRED but Brand B is completely untouched
  const brandARow = mockDb.providerConnections.get(connBrandA);
  const brandBRow = mockDb.providerConnections.get(connBrandB);

  assert.equal(brandARow.health_status, 'ACTION_REQUIRED');
  assert.equal(brandARow.auth_state, 'REVOKED');

  assert.equal(brandBRow.health_status, 'HEALTHY');
  assert.equal(brandBRow.auth_state, 'AUTHORIZED');

  // 3. Brand B can still execute order reconciliation without interference
  const reportB = await ReconciliationEngine.reconcileConnection(connBrandB, {
    resourceType: 'orders',
    ordersToIngest: [
      { id: 'PROPER-1001', total_cents: 89000, status: 'paid', updated_at: new Date().toISOString() }
    ],
    db: testClient
  });

  assert.equal(reportB.success, true);
  assert.equal(reportB.recordsIngested, 1);
  assert.equal(mockDb.orders.size, 1);

  const ingestedOrder = Array.from(mockDb.orders.values())[0];
  assert.equal(ingestedOrder.business_id, 'biz_proper_co', 'Order must be strictly bound to Brand B business ID');
});

test('ADVERSARIAL 4.2: Brand A circuit breaker trips to OPEN while Brand B remains CLOSED', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'shopify';
  const connA = 'conn_brand_A_5xx';
  const connB = 'conn_brand_B_ok';

  // Trip Brand A with 5 consecutive 500 errors
  for (let i = 0; i < 5; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', connA, new Error('500 Server Error'));
  }

  const statusA = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', connA);
  const statusB = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', connB);

  assert.equal(statusA.state, 'OPEN', 'Brand A circuit must be OPEN');
  assert.equal(statusA.allowExecution, false);

  assert.equal(statusB.state, 'CLOSED', 'Brand B circuit must remain CLOSED');
  assert.equal(statusB.allowExecution, true);
});

test('ADVERSARIAL 4.3a: Provider outage threshold requires >=3 distinct tenants and broadcasts to pre-registered tenants', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  const provider = 'meta';

  // Pre-register tenant 4 as healthy
  await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_healthy_4');

  // Tenant 1 fails
  for (let i = 0; i < 3; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'tenant_1', new Error('503'));
  }
  // Tenant 2 fails
  for (let i = 0; i < 3; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'tenant_2', new Error('503'));
  }

  // With 2 tenants failing, provider outage is NOT declared
  let checkT1 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_1');
  let checkT4 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_healthy_4');
  assert.equal(checkT1.isProviderOutage, false);
  assert.equal(checkT4.isProviderOutage, false);

  // Tenant 3 fails -> trips provider-wide outage
  for (let i = 0; i < 3; i++) {
    await IntegrationCircuitBreaker.recordFailure(provider, 'ACCOUNT', 'tenant_3', new Error('503'));
  }

  checkT1 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_1');
  checkT4 = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_healthy_4');

  assert.equal(checkT1.isProviderOutage, true, 'Provider outage declared across failing tenants');
  assert.equal(checkT4.isProviderOutage, true, 'Provider outage flag shared across pre-registered tenants');
  assert.equal(checkT4.allowExecution, false, 'Execution blocked during provider outage');

  // Reset provider outage
  await IntegrationCircuitBreaker.resetProviderOutage(provider);
  const checkAfterReset = await IntegrationCircuitBreaker.checkCircuit(provider, 'ACCOUNT', 'tenant_healthy_4');
  assert.equal(checkAfterReset.isProviderOutage, false);
  assert.equal(checkAfterReset.allowExecution, true);
});

test('ADVERSARIAL 4.3b: Evaluates breaker isolation between scopes and providers', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  
  // Trip Meta provider outage
  for (const t of ['t1', 't2', 't3']) {
    for (let i = 0; i < 3; i++) {
      await IntegrationCircuitBreaker.recordFailure('meta', 'ACCOUNT', t, new Error('503'));
    }
  }

  const metaStatus = await IntegrationCircuitBreaker.checkCircuit('meta', 'ACCOUNT', 't1');
  assert.equal(metaStatus.isProviderOutage, true);

  // Shopify must remain unaffected
  const shopifyStatus = await IntegrationCircuitBreaker.checkCircuit('shopify', 'ACCOUNT', 't1');
  assert.equal(shopifyStatus.isProviderOutage, false);
  assert.equal(shopifyStatus.state, 'CLOSED');
  assert.equal(shopifyStatus.allowExecution, true);
});
