/**
 * Guard tests for the recovery router.
 *
 * These exist because the router shipped with NO authorisation at all: mounted
 * bare in index.ts, running on the service-role client, reachable from the
 * internet. Each test below fails against that original code, so this file is a
 * regression fence rather than a description of current behaviour.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { recoveryRouter } from '../routes';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const CONN_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONN_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const CONNECTIONS: Record<string, { id: string; business_id: string; provider: string }> = {
  [CONN_A]: { id: CONN_A, business_id: TENANT_A, provider: 'shopify' },
  [CONN_B]: { id: CONN_B, business_id: TENANT_B, provider: 'meta' },
};

/** Minimal stand-in for the service-role Supabase client. */
function fakeDb() {
  const builder = (table: string) => {
    const filters: Record<string, unknown> = {};
    const api: any = {
      select: () => api,
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return api;
      },
      or: () => api,
      maybeSingle: async () => {
        if (table === 'business_memberships') {
          const token = filters['user_id'];
          if (token === 'user-a') {
            return { data: { business_id: TENANT_A, role: 'OWNER', status: 'ACTIVE' }, error: null };
          }
          if (token === 'user-viewer') {
            return { data: { business_id: TENANT_A, role: 'EMPLOYEE', status: 'ACTIVE' }, error: null };
          }
          return { data: null, error: null };
        }
        if (table === 'provider_connections') {
          const row = CONNECTIONS[filters['id'] as string] ?? null;
          return { data: row, error: null };
        }
        return { data: null, error: null };
      },
      then: (resolve: (v: unknown) => unknown) => {
        if (table === 'provider_connections') {
          const rows = Object.values(CONNECTIONS).filter(
            (c) => filters['business_id'] === undefined || c.business_id === filters['business_id'],
          );
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return api;
  };

  return {
    from: builder,
    auth: {
      getUser: async (token: string) => {
        if (token === 'token-a') return { data: { user: { id: 'user-a' } }, error: null };
        if (token === 'token-viewer') return { data: { user: { id: 'user-viewer' } }, error: null };
        return { data: { user: null }, error: { message: 'bad token' } };
      },
    },
  } as any;
}

function authorizationContext(token: string | undefined) {
  if (token === 'token-a') {
    return { userId: 'user-a', businessId: TENANT_A, role: 'OWNER' };
  }
  if (token === 'token-viewer') {
    return { userId: 'user-viewer', businessId: TENANT_A, role: 'EMPLOYEE' };
  }
  return {};
}

async function withServer(fn: (base: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    (req as any).context = {
      db: fakeDb(),
      dataPlane: 'production',
      ...authorizationContext(token),
    };
    next();
  });
  app.use('/api/recovery', recoveryRouter);

  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

test('recovery: anonymous callers are rejected on every route', async () => {
  await withServer(async (base) => {
    const routes: Array<[string, string]> = [
      ['GET', '/api/recovery/health'],
      ['GET', `/api/recovery/health/${TENANT_A}`],
      ['GET', `/api/recovery/timeline/${CONN_A}`],
      ['POST', `/api/recovery/repair/${CONN_A}`],
      ['POST', `/api/recovery/reconcile/${CONN_A}`],
      ['GET', `/api/recovery/reconnect-url/${CONN_A}`],
      ['POST', '/api/recovery/reconnect-callback'],
      ['GET', '/api/recovery/circuit-status/shopify'],
      ['POST', '/api/recovery/dlq/replay'],
      ['POST', '/api/recovery/watches/renew'],
      ['GET', `/api/recovery/test/${CONN_A}`],
    ];

    for (const [method, path] of routes) {
      const res = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' } });
      assert.equal(res.status, 401, `${method} ${path} should be 401 without a token, got ${res.status}`);
    }
  });
});

test('recovery: an invalid bearer token is rejected', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/recovery/health`, { headers: auth('garbage') });
    assert.equal(res.status, 401);
  });
});

test('recovery: /health is scoped to the caller, never the whole table', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/recovery/health`, { headers: auth('token-a') });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 1, 'caller must see only their own tenant');
    assert.ok(
      body.connections.every((c: any) => c.businessId === TENANT_A),
      'no foreign tenant rows may appear',
    );
  });
});

test('recovery: naming another tenant in the path is rejected, not re-scoped', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/recovery/health/${TENANT_B}`, { headers: auth('token-a') });
    assert.equal(res.status, 403);
  });
});

test('recovery: a foreign connection id is not actionable', async () => {
  await withServer(async (base) => {
    const cases: Array<[string, string]> = [
      ['GET', `/api/recovery/timeline/${CONN_B}`],
      ['POST', `/api/recovery/repair/${CONN_B}`],
      ['POST', `/api/recovery/reconcile/${CONN_B}`],
      ['GET', `/api/recovery/reconnect-url/${CONN_B}`],
      ['GET', `/api/recovery/test/${CONN_B}`],
    ];
    for (const [method, path] of cases) {
      const res = await fetch(`${base}${path}`, { method, headers: auth('token-a'), body: method === 'POST' ? '{}' : undefined });
      assert.equal(res.status, 404, `${method} ${path} should be 404 for a foreign connection, got ${res.status}`);
    }
  });
});

test('recovery: absent and foreign connections are indistinguishable', async () => {
  await withServer(async (base) => {
    const foreign = await fetch(`${base}/api/recovery/timeline/${CONN_B}`, { headers: auth('token-a') });
    const absent = await fetch(`${base}/api/recovery/timeline/99999999-9999-4999-8999-999999999999`, {
      headers: auth('token-a'),
    });
    assert.equal(foreign.status, absent.status);
    assert.deepEqual(await foreign.json(), await absent.json());
  });
});

test('recovery: read-only roles cannot reach integration operations', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/recovery/health`, { headers: auth('token-viewer') });
    assert.equal(res.status, 403);
  });
});

test('recovery: batch DLQ replay requires an owned connection', async () => {
  await withServer(async (base) => {
    const noConn = await fetch(`${base}/api/recovery/dlq/replay`, {
      method: 'POST',
      headers: auth('token-a'),
      body: JSON.stringify({}),
    });
    assert.equal(noConn.status, 400, 'unscoped batch replay must be refused');

    const foreign = await fetch(`${base}/api/recovery/dlq/replay`, {
      method: 'POST',
      headers: auth('token-a'),
      body: JSON.stringify({ connectionId: CONN_B }),
    });
    assert.equal(foreign.status, 404);
  });
});

test('recovery: ACCOUNT-scope circuit lookups cannot name a foreign connection', async () => {
  await withServer(async (base) => {
    const res = await fetch(
      `${base}/api/recovery/circuit-status/meta?scope=ACCOUNT&scopeId=${CONN_B}`,
      { headers: auth('token-a') },
    );
    assert.equal(res.status, 404);
  });
});

test('recovery: /test/:connectionId exists (the Inspect drawer previously 404d)', async () => {
  await withServer(async (base) => {
    for (const method of ['GET', 'POST']) {
      const res = await fetch(`${base}/api/recovery/test/${CONN_A}`, { method, headers: auth('token-a') });
      assert.notEqual(res.status, 404, `${method} /test must be routed`);
    }
  });
});
