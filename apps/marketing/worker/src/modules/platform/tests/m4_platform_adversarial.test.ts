import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { platformRouter } from '../routes';

function createAdversarialPlatformMockDb() {
  const now = Date.now();

  const jobs: any[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      business_id: 'biz_001',
      queue_name: 'sync_shopify_catalog',
      status: 'dead-letter',
      attempts: 5,
      max_attempts: 5,
      error_message: 'Shopify rate limit exceeded (429)',
      created_at: new Date(now - 3600000).toISOString(),
      updated_at: new Date(now - 3600000).toISOString(),
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      business_id: 'biz_002',
      queue_name: 'publish_meta_campaign',
      status: 'running',
      attempts: 1,
      max_attempts: 5,
      locked_at: new Date(now - 10000).toISOString(), // 10s ago (actively locked)
      locked_by: 'worker-live-1',
      created_at: new Date(now - 60000).toISOString(),
      updated_at: new Date(now - 60000).toISOString(),
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      business_id: 'biz_003',
      queue_name: 'sync_growth',
      status: 'running',
      attempts: 2,
      max_attempts: 5,
      locked_at: new Date(now - 10 * 60 * 1000).toISOString(), // 10m ago (stale lock)
      locked_by: 'worker-dead-999',
      created_at: new Date(now - 600000).toISOString(),
      updated_at: new Date(now - 600000).toISOString(),
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      business_id: 'biz_001',
      queue_name: 'generate_outreach',
      status: 'completed',
      attempts: 1,
      max_attempts: 5,
      locked_at: null,
      locked_by: null,
      created_at: new Date(now - 120000).toISOString(),
      updated_at: new Date(now - 10000).toISOString(),
    },
  ];

  const incidents: any[] = [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      severity: 'SEV-2',
      status: 'INVESTIGATING',
      title: 'Meta Graph API Latency Spike',
      affected_scope: 'Omnichannel Publishing',
      started_at: new Date(now - 7200000).toISOString(),
      created_at: new Date(now - 7200000).toISOString(),
      updated_at: new Date(now - 7200000).toISOString(),
    },
  ];

  const tickets: any[] = [
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      business_id: 'biz_001',
      category: 'ORDERS',
      subject: 'Shopify order sync discrepancy',
      description: 'Order #1042 was not pulled automatically',
      status: 'NEW',
      severity: 'High',
      priority: 'HIGH',
      created_at: new Date(now - 1800000).toISOString(),
      updated_at: new Date(now - 1800000).toISOString(),
    },
  ];

  const messages: any[] = [];
  const providerConnections: any[] = [
    { provider: 'shopify', health_status: 'HEALTHY' },
    { provider: 'meta', health_status: 'DEGRADED' },
  ];

  let simulateDbFail = false;

  const mockDb: any = {
    jobs,
    incidents,
    tickets,
    messages,
    providerConnections,
    setDbFail: (f: boolean) => {
      simulateDbFail = f;
    },
    from: (table: string) => {
      if (simulateDbFail) {
        return {
          select: () => Promise.resolve({ data: null, error: new Error('Postgres simulated connection refused') }),
          update: () => Promise.resolve({ data: null, error: new Error('Postgres simulated write timeout') }),
          insert: () => Promise.resolve({ data: null, error: new Error('Postgres simulated insert error') }),
        };
      }

      if (table === 'durable_jobs') {
        return {
          select: (_cols?: string, opts?: any) => {
            if (opts?.head && opts?.count === 'exact') {
              return {
                eq: (field: string, val: any) => {
                  const count = jobs.filter((j) => j[field] === val).length;
                  return Promise.resolve({ count, error: null });
                },
                in: (field: string, vals: any[]) => {
                  const count = jobs.filter((j) => vals.includes(j[field])).length;
                  return Promise.resolve({ count, error: null });
                },
              };
            }
            let list = [...jobs];
            const builder: any = {
              eq: (field: string, val: any) => {
                list = list.filter((j) => j[field] === val);
                return builder;
              },
              in: (field: string, vals: any[]) => {
                list = list.filter((j) => vals.includes(j[field]));
                return builder;
              },
              order: () => builder,
              range: (from: number, to: number) => {
                return Promise.resolve({ data: list.slice(from, to + 1), error: null });
              },
              maybeSingle: () => {
                return Promise.resolve({ data: list[0] || null, error: null });
              },
              single: () => {
                return Promise.resolve({ data: list[0] || null, error: list[0] ? null : new Error('Not found') });
              },
              then: (resolve: any) => resolve({ data: list, error: null }),
            };
            return builder;
          },
          update: (updates: any) => ({
            eq: (field: string, val: any) => {
              const idx = jobs.findIndex((j) => j[field] === val);
              if (idx !== -1) {
                jobs[idx] = { ...jobs[idx], ...updates };
              }
              const updatedRow = idx !== -1 ? jobs[idx] : null;
              return {
                select: () => ({
                  maybeSingle: () => Promise.resolve({ data: updatedRow, error: null }),
                  single: () => Promise.resolve({ data: updatedRow, error: updatedRow ? null : new Error('Not found') }),
                  then: (resolve: any) => resolve({ data: updatedRow ? [updatedRow] : [], error: null }),
                }),
                then: (resolve: any) => resolve({ data: updatedRow ? [updatedRow] : [], error: null }),
              };
            },
          }),
        };
      }

      if (table === 'platform_incidents') {
        return {
          select: (_cols?: string, opts?: any) => {
            if (opts?.head && opts?.count === 'exact') {
              return {
                in: (field: string, vals: any[]) => {
                  const count = incidents.filter((inc) => vals.includes(inc[field])).length;
                  return Promise.resolve({ count, error: null });
                },
              };
            }
            return {
              order: () => Promise.resolve({ data: incidents, error: null }),
              then: (resolve: any) => resolve({ data: incidents, error: null }),
            };
          },
          insert: (newRow: any) => {
            const row = { id: `55555555-5555-4555-8555-555555555555`, ...newRow };
            incidents.push(row);
            return {
              select: () => ({
                maybeSingle: () => Promise.resolve({ data: row, error: null }),
                then: (resolve: any) => resolve({ data: [row], error: null }),
              }),
              then: (resolve: any) => resolve({ data: [row], error: null }),
            };
          },
          update: (updates: any) => ({
            eq: (field: string, val: any) => {
              const idx = incidents.findIndex((inc) => inc[field] === val);
              if (idx !== -1) {
                incidents[idx] = { ...incidents[idx], ...updates };
              }
              const updated = idx !== -1 ? incidents[idx] : null;
              return {
                select: () => ({
                  maybeSingle: () => Promise.resolve({ data: updated, error: null }),
                  then: (resolve: any) => resolve({ data: updated ? [updated] : [], error: null }),
                }),
                then: (resolve: any) => resolve({ data: updated ? [updated] : [], error: null }),
              };
            },
          }),
        };
      }

      if (table === 'support_tickets') {
        return {
          select: () => {
            let list = [...tickets];
            const builder: any = {
              eq: (field: string, val: any) => {
                list = list.filter((t) => t[field] === val);
                return builder;
              },
              order: () => builder,
              limit: (lim: number) => Promise.resolve({ data: list.slice(0, lim), error: null }),
              maybeSingle: () => Promise.resolve({ data: list[0] || null, error: null }),
              then: (resolve: any) => resolve({ data: list, error: null }),
            };
            return builder;
          },
          update: (updates: any) => ({
            eq: (field: string, val: any) => {
              const idx = tickets.findIndex((t) => t[field] === val);
              if (idx !== -1) {
                tickets[idx] = { ...tickets[idx], ...updates };
              }
              const updated = idx !== -1 ? tickets[idx] : null;
              return {
                select: () => ({
                  maybeSingle: () => Promise.resolve({ data: updated, error: null }),
                  then: (resolve: any) => resolve({ data: updated ? [updated] : [], error: null }),
                }),
                then: (resolve: any) => resolve({ data: updated ? [updated] : [], error: null }),
              };
            },
          }),
        };
      }

      if (table === 'support_messages') {
        return {
          select: () => ({
            eq: (field: string, val: any) => ({
              order: () => {
                const matched = messages.filter((m) => m[field] === val);
                return Promise.resolve({ data: matched, error: null });
              },
              then: (resolve: any) => {
                const matched = messages.filter((m) => m[field] === val);
                return resolve({ data: matched, error: null });
              },
            }),
          }),
          insert: (newRow: any) => {
            const row = { id: `66666666-6666-4666-8666-666666666666`, ...newRow };
            messages.push(row);
            return {
              select: () => ({
                maybeSingle: () => Promise.resolve({ data: row, error: null }),
                then: (resolve: any) => resolve({ data: [row], error: null }),
              }),
              then: (resolve: any) => resolve({ data: [row], error: null }),
            };
          },
        };
      }

      if (table === 'businesses') {
        return {
          select: () => ({
            limit: () => Promise.resolve({ data: [{ id: 'biz_001', name: 'Proper & Co' }], error: null }),
            then: (resolve: any) => resolve({ data: [{ id: 'biz_001', name: 'Proper & Co' }], error: null }),
          }),
        };
      }

      if (table === 'provider_connections') {
        return {
          select: () => ({
            then: (resolve: any) => resolve({ data: providerConnections, error: null }),
          }),
        };
      }

      return {
        select: () => ({
          then: (resolve: any) => resolve({ data: [], error: null }),
        }),
      };
    },
  };

  return mockDb;
}

function makeApp(mockDb: any) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).context = { db: mockDb };
    next();
  });
  app.use('/api/platform', platformRouter);
  return app;
}

async function request(
  app: express.Express,
  method: string,
  path: string,
  body?: any,
): Promise<{ status: number; body: any }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  const url = `http://127.0.0.1:${port}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const resBody = await res.json();
    return { status: res.status, body: resBody };
  } finally {
    server.close();
  }
}

// ============================================================================
// ADVERSARIAL PLATFORM API TEST SUITES
// ============================================================================

test('ADV-API-01: Concurrency and Race Protection on POST /jobs/:id/retry', async () => {
  const mockDb = createAdversarialPlatformMockDb();
  const app = makeApp(mockDb);

  // 1. Actively locked job (< 5m) returns 409 Conflict
  const resActivelyLocked = await request(
    app,
    'POST',
    '/api/platform/jobs/22222222-2222-4222-8222-222222222222/retry'
  );
  assert.equal(resActivelyLocked.status, 409, 'Actively executing job must return 409 Conflict');
  assert.match(resActivelyLocked.body.error, /actively executing/);

  // 2. Stale locked job (> 5m) allows retry and re-enqueues to pending
  const resStale = await request(
    app,
    'POST',
    '/api/platform/jobs/33333333-3333-4333-8333-333333333333/retry'
  );
  assert.equal(resStale.status, 200, 'Stale locked job (>5m) must allow re-enqueue');
  assert.equal(resStale.body.success, true);
  assert.equal(resStale.body.job.status, 'pending');
  assert.equal(resStale.body.job.attempts, 0);
  assert.equal(resStale.body.job.locked_at, null);

  // 3. High Concurrency Race: 10 parallel retry calls to the same dead-letter job
  const parallelCalls = Array.from({ length: 10 }).map(() =>
    request(app, 'POST', '/api/platform/jobs/11111111-1111-4111-8111-111111111111/retry')
  );
  const results = await Promise.all(parallelCalls);
  for (const r of results) {
    assert.equal(r.status, 200, 'Parallel retries must all resolve cleanly without crashing');
    assert.equal(r.body.success, true);
  }
  const finalJob = mockDb.jobs.find((j: any) => j.id === '11111111-1111-4111-8111-111111111111');
  assert.equal(finalJob.status, 'pending');
  assert.equal(finalJob.attempts, 0);
});

test('ADV-API-02: Input sanitization, path traversal & UUID regex validation', async () => {
  const mockDb = createAdversarialPlatformMockDb();
  const app = makeApp(mockDb);

  const maliciousIds = [
    'not-a-uuid',
    '../../etc/passwd',
    '<script>alert(1)</script>',
    '11111111-1111-4111-8111-111111111111; DROP TABLE durable_jobs;--',
    '11111111-1111-4111-8111-111111111111-extra-tail',
  ];

  for (const badId of maliciousIds) {
    // Retry route
    const resRetry = await request(app, 'POST', `/api/platform/jobs/${encodeURIComponent(badId)}/retry`);
    assert.equal(resRetry.status, 400, `Retry ID ${badId} must be rejected with 400`);

    // Cancel route
    const resCancel = await request(app, 'POST', `/api/platform/jobs/${encodeURIComponent(badId)}/cancel`);
    assert.equal(resCancel.status, 400, `Cancel ID ${badId} must be rejected with 400`);

    // Support ticket get route
    const resTicket = await request(app, 'GET', `/api/platform/support/tickets/${encodeURIComponent(badId)}`);
    assert.equal(resTicket.status, 400, `Ticket ID ${badId} must be rejected with 400`);
  }
});

test('ADV-API-03: System Health Telemetry Outage & Degraded State Propagation', async () => {
  const mockDb = createAdversarialPlatformMockDb();
  const app = makeApp(mockDb);

  // 1. Normal state with 1 incident -> overall status DEGRADED
  const resNormal = await request(app, 'GET', '/api/platform/health');
  assert.equal(resNormal.status, 200);
  assert.equal(resNormal.body.openIncidents, 1);
  assert.equal(resNormal.body.status, 'DEGRADED');

  // 2. Add 10 dead-letter jobs to force background queue degradation
  for (let i = 0; i < 10; i++) {
    mockDb.jobs.push({
      id: `dlq-overflow-${i}`,
      queue_name: 'sync_shopify_catalog',
      status: 'dead-letter',
    });
  }

  const resQueueDegraded = await request(app, 'GET', '/api/platform/health');
  assert.equal(resQueueDegraded.status, 200);
  const queueCheck = resQueueDegraded.body.checks.find((c: any) => c.name === 'Background jobs');
  assert.equal(queueCheck.status, 'DEGRADED');
  assert.ok(queueCheck.failureRate > 0);

  // 3. Simulate Database Outage
  mockDb.setDbFail(true);
  const resDbOutage = await request(app, 'GET', '/api/platform/health');
  assert.equal(resDbOutage.status, 200);
  assert.equal(resDbOutage.body.status, 'PARTIAL_OUTAGE');
  const dbCheck = resDbOutage.body.checks.find((c: any) => c.name === 'Database (Postgres)');
  assert.equal(dbCheck.status, 'PARTIAL_OUTAGE');
  assert.equal(dbCheck.failureRate, 1.0);
});

test('ADV-API-04: Support Ticket and Message validation boundaries', async () => {
  const mockDb = createAdversarialPlatformMockDb();
  const app = makeApp(mockDb);

  const ticketId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  // 1. Empty message content rejected with 400
  const emptyRes = await request(app, 'POST', `/api/platform/support/tickets/${ticketId}/messages`, {
    message: '   ',
  });
  assert.equal(emptyRes.status, 400);
  assert.match(emptyRes.body.error, /Message content is required/);

  // 2. Missing message payload rejected with 400
  const missingRes = await request(app, 'POST', `/api/platform/support/tickets/${ticketId}/messages`, {});
  assert.equal(missingRes.status, 400);

  // 3. Internal staff note posted successfully
  const internalNoteRes = await request(app, 'POST', `/api/platform/support/tickets/${ticketId}/messages`, {
    message: 'Staff diagnosis: verified token refresh failure in provider_connections',
    is_internal_note: true,
  });
  assert.equal(internalNoteRes.status, 201);
  assert.equal(internalNoteRes.body.supportMessage.is_internal_note, true);
  assert.equal(internalNoteRes.body.message, 'Internal note added.');

  // 4. Ticket resolution updates resolved_at timestamp
  const resolveTicketRes = await request(app, 'PATCH', `/api/platform/support/tickets/${ticketId}`, {
    status: 'RESOLVED',
  });
  assert.equal(resolveTicketRes.status, 200);
  assert.equal(resolveTicketRes.body.ticket.status, 'RESOLVED');
  assert.ok(resolveTicketRes.body.ticket.resolved_at);
});

test('ADV-API-05: Incident Declaration and Resolution boundary cases', async () => {
  const mockDb = createAdversarialPlatformMockDb();
  const app = makeApp(mockDb);

  // 1. Missing title rejected with 400
  const noTitleRes = await request(app, 'POST', '/api/platform/incidents', {
    severity: 'SEV-1',
  });
  assert.equal(noTitleRes.status, 400);
  assert.match(noTitleRes.body.error, /Incident title is required/);

  // 2. Valid incident creation
  const createRes = await request(app, 'POST', '/api/platform/incidents', {
    title: 'Shopify Webhook Circuit Trip',
    severity: 'SEV-1',
    status: 'OPEN',
    description: 'High 500 error rate on incoming order webhooks',
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.success, true);
  assert.equal(createRes.body.incident.severity, 'SEV-1');

  // 3. Resolve incident
  const resolveRes = await request(
    app,
    'POST',
    '/api/platform/incidents/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/resolve'
  );
  assert.equal(resolveRes.status, 200);
  assert.equal(resolveRes.body.incident.status, 'RESOLVED');
});
