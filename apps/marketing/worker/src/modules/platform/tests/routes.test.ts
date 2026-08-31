import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { platformRouter } from '../routes';

function createMockDb() {
  const jobs: any[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      business_id: 'biz_001',
      queue_name: 'sync_shopify_catalog',
      status: 'dead-letter',
      attempts: 5,
      max_attempts: 5,
      error_message: 'Shopify rate limit exceeded',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      business_id: 'biz_002',
      queue_name: 'publish_meta_campaign',
      status: 'running',
      attempts: 1,
      max_attempts: 5,
      locked_at: new Date().toISOString(),
      locked_by: 'worker-pid-1',
      created_at: new Date(Date.now() - 60000).toISOString(),
      updated_at: new Date(Date.now() - 60000).toISOString(),
    },
  ];

  const incidents: any[] = [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      severity: 'SEV-2',
      status: 'INVESTIGATING',
      title: 'Meta Graph API Latency Spike',
      affected_scope: 'Omnichannel Publishing',
      started_at: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
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
      created_at: new Date(Date.now() - 1800000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  const messages: any[] = [
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      ticket_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      message: 'Looking into the cursor state right now.',
      is_internal_note: true,
      created_at: new Date().toISOString(),
    },
  ];

  const providerConnections: any[] = [
    {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      business_id: 'biz_001',
      provider: 'shopify',
      health_status: 'RECOVERING',
      last_health_check_at: new Date(Date.now() - 30000).toISOString(),
      last_successful_sync_at: null,
      updated_at: new Date(Date.now() - 30000).toISOString(),
    },
  ];

  const mockDb: any = {
    jobs,
    incidents,
    tickets,
    messages,
    providerConnections,
    from: (table: string) => {
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
            const row = { id: '33333333-3333-4333-8333-333333333333', ...newRow };
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
            const row = { id: '44444444-4444-4444-8444-444444444444', ...newRow };
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

test('Platform API: GET /api/platform/jobs returns durable jobs list', async () => {
  const mockDb = createMockDb();
  const app = makeApp(mockDb);

  const res = await request(app, 'GET', '/api/platform/jobs');
  assert.equal(res.status, 200);
  assert.equal(res.body.jobs.length, 2);
  assert.equal(res.body.jobs[0].status, 'FAILED');
  assert.equal(res.body.jobs[0].retrySafe, true);
});

test('Platform API: POST /api/platform/jobs/:id/retry re-enqueues dead-letter job', async () => {
  const mockDb = createMockDb();
  const app = makeApp(mockDb);

  const res = await request(app, 'POST', '/api/platform/jobs/11111111-1111-4111-8111-111111111111/retry');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.job.status, 'pending');
  assert.equal(res.body.job.attempts, 0);
  assert.equal(res.body.job.error_message, null);
});

test('Platform API: POST /api/platform/jobs/:id/retry rejects actively locked job with 409 Conflict', async () => {
  const mockDb = createMockDb();
  const app = makeApp(mockDb);

  const res = await request(app, 'POST', '/api/platform/jobs/22222222-2222-4222-8222-222222222222/retry');
  assert.equal(res.status, 409);
  assert.match(res.body.error, /actively executing/);
});

test('Platform API: POST /api/platform/jobs/:id/retry rejects invalid UUID with 400 Bad Request', async () => {
  const mockDb = createMockDb();
  const app = makeApp(mockDb);

  const res = await request(app, 'POST', '/api/platform/jobs/invalid-id/retry');
  assert.equal(res.status, 400);
  assert.match(res.body.error, /valid UUID/);
});

test('Platform API: GET /api/platform/health reports only observed subsystem/provider state', async () => {
  const mockDb = createMockDb();
  const app = makeApp(mockDb);

  const res = await request(app, 'GET', '/api/platform/health');
  assert.equal(res.status, 200);
  assert.ok(res.body.status);
  assert.ok(Array.isArray(res.body.checks));

  const dbCheck = res.body.checks.find((c: any) => c.name === 'Database (Postgres)');
  assert.ok(dbCheck);
  assert.equal(dbCheck.status, 'OPERATIONAL');
  assert.equal(typeof dbCheck.latencyMs, 'number');

  const workerCheck = res.body.checks.find((c: any) => c.name === 'Worker / API');
  assert.ok(workerCheck);
  assert.equal(workerCheck.status, 'OPERATIONAL');
  assert.equal(workerCheck.latencyMs, null);

  const queueCheck = res.body.checks.find((c: any) => c.name === 'Background jobs');
  assert.ok(queueCheck);
  assert.equal(queueCheck.latencyMs, null);

  const shopifyCheck = res.body.checks.find((c: any) => c.name === 'Shopify sync');
  assert.ok(shopifyCheck);
  assert.equal(shopifyCheck.status, 'DEGRADED');
  assert.equal(shopifyCheck.latencyMs, null);

  assert.equal(res.body.checks.some((c: any) => c.name === 'SMS (Twilio)'), false);
  assert.equal(res.body.checks.some((c: any) => c.name === 'Payments (Stripe)'), false);
  assert.equal(res.body.checks.some((c: any) => c.name === 'Google APIs'), false);
});

test('Platform API: Incidents CRUD lifecycle', async () => {
  const mockDb = createMockDb();
  const app = makeApp(mockDb);

  const listRes = await request(app, 'GET', '/api/platform/incidents');
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.incidents.length, 1);

  const declareRes = await request(app, 'POST', '/api/platform/incidents', {
    title: 'Shopify Webhook Ingestion Delay',
    severity: 'SEV-1',
    status: 'INVESTIGATING',
    affected_scope: 'Shopify Webhooks',
  });
  assert.equal(declareRes.status, 201);
  assert.equal(declareRes.body.success, true);

  const resolveRes = await request(app, 'POST', '/api/platform/incidents/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/resolve');
  assert.equal(resolveRes.status, 200);
  assert.equal(resolveRes.body.incident.status, 'RESOLVED');
});

test('Platform API: Support Tickets and Messages lifecycle', async () => {
  const mockDb = createMockDb();
  const app = makeApp(mockDb);

  const ticketsRes = await request(app, 'GET', '/api/platform/support/tickets');
  assert.equal(ticketsRes.status, 200);
  assert.equal(ticketsRes.body.tickets.length, 1);

  const singleTicketRes = await request(app, 'GET', '/api/platform/support/tickets/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  assert.equal(singleTicketRes.status, 200);
  assert.equal(singleTicketRes.body.ticket.subject, 'Shopify order sync discrepancy');
  assert.equal(singleTicketRes.body.messages.length, 1);

  const updateTicketRes = await request(app, 'PATCH', '/api/platform/support/tickets/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', {
    status: 'IN_PROGRESS',
    priority: 'CRITICAL',
  });
  assert.equal(updateTicketRes.status, 200);
  assert.equal(updateTicketRes.body.ticket.status, 'IN_PROGRESS');

  const postMsgRes = await request(app, 'POST', '/api/platform/support/tickets/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/messages', {
    message: 'Reconciliation run scheduled.',
    is_internal_note: false,
  });
  assert.equal(postMsgRes.status, 201);
  assert.equal(postMsgRes.body.supportMessage.message, 'Reconciliation run scheduled.');
});