/**
 * Adversarial Data & Ingestion Verification
 *
 * Covers high-volume idempotency, cursor safety, tenant/provider isolation and
 * the recovery boundary that forbids caller-supplied credentials from becoming
 * connection health.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ReconciliationEngine,
  type IngestAppointmentPayload,
  type IngestMessagePayload,
  type IngestOrderPayload,
} from '../reconciliationEngine';
import { IntegrationCircuitBreaker } from '../circuitBreaker';
import { calculateBackoff, classifyError } from '../failureClassifier';
import { IntegrationRecoveryService } from '../integrationRecoveryService';

process.env.PUBLIC_APP_URL ??= 'https://vowos.example.test';

class MemoryDb {
  readonly tables = new Map<string, Map<string, any>>();
  private nextGeneratedId = 1;

  table(name: string): Map<string, any> {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }

  reset() {
    this.tables.clear();
    this.nextGeneratedId = 1;
  }

  private generatedId(tableName: string): string {
    return `generated-${tableName}-${this.nextGeneratedId++}`;
  }

  client(): SupabaseClient {
    const db = this;
    return {
      from(tableName: string) {
        let rows = Array.from(db.table(tableName).values());
        const filters: Array<(row: any) => boolean> = [];
        let orderField: string | null = null;
        let ascending = true;

        const current = () => rows.filter((row) => filters.every((filter) => filter(row)));
        const builder: any = {
          select() { return builder; },
          eq(column: string, value: any) {
            filters.push((row) => row[column] === value);
            return builder;
          },
          lte(column: string, value: any) {
            filters.push((row) => row[column] <= value);
            return builder;
          },
          or() { return builder; },
          order(column: string, options?: { ascending?: boolean }) {
            orderField = column;
            ascending = options?.ascending !== false;
            return builder;
          },
          limit(count: number) {
            rows = rows.slice(0, count);
            return builder;
          },
          async maybeSingle() {
            return { data: current()[0] || null, error: null };
          },
          async single() {
            const row = current()[0];
            return row ? { data: row, error: null } : { data: null, error: new Error('Row not found') };
          },
          insert(payload: any) {
            const items = Array.isArray(payload) ? payload : [payload];
            const inserted = items.map((item) => ({
              id: item.id || db.generatedId(tableName),
              ...item,
            }));
            for (const item of inserted) db.table(tableName).set(item.id, item);
            const result: any = {
              data: inserted,
              error: null,
              select() {
                return {
                  async single() {
                    return { data: inserted[0], error: null };
                  },
                };
              },
              then(resolve: any) { return Promise.resolve(resolve({ data: inserted, error: null })); },
            };
            return result;
          },
          update(patch: any) {
            const updateBuilder: any = {
              eq(column: string, value: any) {
                filters.push((row) => row[column] === value);
                for (const row of current()) {
                  db.table(tableName).set(row.id, { ...row, ...patch });
                }
                return updateBuilder;
              },
              then(resolve: any) { return Promise.resolve(resolve({ data: null, error: null })); },
            };
            return updateBuilder;
          },
          async upsert(payload: any, options?: { onConflict?: string }) {
            const keys = (options?.onConflict || 'id').split(',').map((key) => key.trim());
            const candidate = Array.isArray(payload) ? payload[0] : payload;
            const existing = Array.from(db.table(tableName).values()).find((row) =>
              keys.every((key) => row[key] === candidate[key]),
            );
            const id = existing?.id || candidate.id || db.generatedId(tableName);
            db.table(tableName).set(id, { ...(existing || {}), ...candidate, id });
            return { data: candidate, error: null };
          },
          then(resolve: any) {
            let result = current();
            if (orderField) {
              result = [...result].sort((a, b) => {
                if (a[orderField!] === b[orderField!]) return 0;
                const direction = a[orderField!] < b[orderField!] ? -1 : 1;
                return ascending ? direction : -direction;
              });
            }
            return Promise.resolve(resolve({ data: result, error: null }));
          },
        };
        return builder;
      },
    } as unknown as SupabaseClient;
  }
}

const memory = new MemoryDb();
const db = memory.client();

function seedConnection(id: string, provider: string, businessId: string, extra: Record<string, unknown> = {}) {
  memory.table('provider_connections').set(id, {
    id,
    provider,
    business_id: businessId,
    health_status: 'HEALTHY',
    auth_state: 'AUTHORIZED',
    circuit_breaker_state: 'CLOSED',
    ...extra,
  });
}

test('1000-order replay burst produces exactly 100 tenant-scoped order rows', async () => {
  memory.reset();
  seedConnection('conn-orders', 'shopify', 'biz-a');

  const burst: IngestOrderPayload[] = [];
  const base = Date.now() - 3600_000;
  for (let order = 0; order < 100; order += 1) {
    for (let copy = 0; copy < 10; copy += 1) {
      burst.push({
        id: `ORDER-${order}`,
        external_order_id: `ORDER-${order}`,
        total_cents: 10000 + order,
        status: copy === 9 ? 'FULFILLED' : 'PAID',
        updated_at: new Date(base + order * 1000 + copy).toISOString(),
      });
    }
  }

  const report = await ReconciliationEngine.reconcileConnection('conn-orders', {
    resourceType: 'orders',
    ordersToIngest: burst,
    db,
  });

  assert.equal(report.recordsIngested, 100);
  assert.equal(report.recordsSkippedDuplicates, 900);
  assert.equal(memory.table('orders').size, 100);
  for (const order of memory.table('orders').values()) assert.equal(order.business_id, 'biz-a');
});

test('message and appointment replay deduplicate independently by provider identity', async () => {
  memory.reset();
  seedConnection('conn-meta', 'instagram', 'biz-a', { provider_account_id: 'ig-a' });
  seedConnection('conn-calendar', 'google_calendar', 'biz-a');

  const messages: IngestMessagePayload[] = Array.from({ length: 20 }, (_, index) => ({
    id: `MSG-${Math.floor(index / 2)}`,
    external_message_id: `MSG-${Math.floor(index / 2)}`,
    sender_id: `sender-${index}`,
    text: 'synthetic test message',
    created_at: new Date(Date.now() - index * 1000).toISOString(),
  }));

  const appointments: IngestAppointmentPayload[] = [
    { id: 'APT-1', external_id: 'APT-1', status: 'REQUESTED' },
    { id: 'APT-1', external_id: 'APT-1', status: 'CONFIRMED' },
    { id: 'APT-2', external_id: 'APT-2', status: 'CONFIRMED' },
  ];

  const messageReport = await ReconciliationEngine.reconcileConnection('conn-meta', {
    resourceType: 'messages',
    messagesToIngest: messages,
    db,
  });
  const appointmentReport = await ReconciliationEngine.reconcileConnection('conn-calendar', {
    resourceType: 'appointments',
    appointmentsToIngest: appointments,
    db,
  });

  assert.equal(messageReport.recordsIngested, 10);
  assert.equal(messageReport.recordsSkippedDuplicates, 10);
  assert.equal(appointmentReport.recordsIngested, 2);
  assert.equal(appointmentReport.recordsSkippedDuplicates, 1);
});

test('historical and far-future timestamps cannot regress or poison the cursor', async () => {
  memory.reset();
  seedConnection('conn-time', 'shopify', 'biz-a');
  const initial = new Date(Date.now() - 3600_000).toISOString();
  memory.table('integration_sync_cursors').set('cursor-time', {
    id: 'cursor-time',
    provider_connection_id: 'conn-time',
    resource_type: 'orders',
    last_cursor: initial,
    last_sync_timestamp: initial,
    buffer_seconds: 300,
    sync_status: 'IDLE',
    records_synced_total: 0,
    records_synced_last_run: 0,
    lock_acquired_at: null,
    lock_expires_at: null,
    locked_by: null,
    last_error: null,
    metadata: {},
  });

  const report = await ReconciliationEngine.reconcileConnection('conn-time', {
    resourceType: 'orders',
    ordersToIngest: [
      { id: 'past', total_cents: 1, status: 'paid', updated_at: new Date(Date.now() - 60 * 86400000).toISOString() },
      { id: 'future', total_cents: 1, status: 'paid', updated_at: new Date(Date.now() + 30 * 86400000).toISOString() },
    ],
    db,
  });

  assert.ok(Date.parse(report.newCursor) >= Date.parse(initial));
  assert.ok(Date.parse(report.newCursor) <= Date.now() + 5000);
});

test('provider outage on Shopify does not contaminate Meta circuit state', async () => {
  IntegrationCircuitBreaker.clearMemoryState();
  for (const connection of ['shop-1', 'shop-2', 'shop-3']) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await IntegrationCircuitBreaker.recordFailure(
        'shopify-isolation',
        'ACCOUNT',
        connection,
        new Error('503'),
        { failureThreshold: 3 },
      );
    }
  }

  const shopify = await IntegrationCircuitBreaker.checkCircuit('shopify-isolation', 'ACCOUNT', 'shop-1');
  const meta = await IntegrationCircuitBreaker.checkCircuit('meta-isolation', 'ACCOUNT', 'meta-1');
  assert.equal(shopify.isProviderOutage, true);
  assert.equal(meta.isProviderOutage, false);
  assert.equal(meta.allowExecution, true);
});

test('malformed payload classification is non-auto-repairable and suitable for DLQ', () => {
  const classified = classifyError(
    new SyntaxError('Unexpected token < in JSON at position 0'),
    'shopify',
    'biz-a',
  );
  assert.equal(classified.category, 'SCHEMA_DRIFT');
  assert.equal(classified.isAutoRepairable, false);
  assert.match(classified.suggestedAction, /Dead Letter Queue/i);
});

test('backoff is bounded under extreme retry counts', () => {
  assert.equal(calculateBackoff(0), 5);
  assert.equal(calculateBackoff(5), 160);
  assert.equal(calculateBackoff(6), 300);
  assert.equal(calculateBackoff(1000), 300);
});

test('generic recovery callback rejects every caller-supplied credential', async () => {
  await assert.rejects(
    () => IntegrationRecoveryService.handleReconnectCallback(
      'any-state',
      { access_token: 'synthetic-attacker-token' },
      { db },
    ),
    /retired/i,
  );
});

test('degraded stored state without a provider error is never promoted by local diagnostics', async () => {
  memory.reset();
  seedConnection('conn-degraded', 'shopify', 'biz-a', {
    health_status: 'DEGRADED',
    last_error_message: null,
  });

  const result = await IntegrationRecoveryService.diagnoseAndRepair(
    'conn-degraded',
    'OPERATOR_MANUAL',
    { db },
  );

  assert.equal(result.success, false);
  assert.equal(result.status, 'DEGRADED');
  assert.equal(result.details?.providerProbePerformed, false);
  assert.equal(memory.table('provider_connections').get('conn-degraded').health_status, 'DEGRADED');
});
