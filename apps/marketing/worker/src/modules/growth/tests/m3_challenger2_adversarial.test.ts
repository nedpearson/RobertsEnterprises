/**
 * Milestone 3 Adversarial Challenge Suite 2
 *
 * Empirical verification of:
 * 1. Meta 60-day token auto-refresh lifecycle across time windows (>7d, <=7d, expired, failure handling).
 * 2. Google vs Meta token refresh non-interference in store.ts:getAccessToken.
 * 3. Worker endpoint authentication & RBAC middleware (/api/communications/send-sms and /api/marketing-ai/*).
 * 4. Phone number candidate normalization across all valid/invalid formats.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as clientModule from '../client';
import { getAccessToken, saveTokens } from '../store';
import {
  resolveCustomerAndBusiness,
  requireCommunicationsAuth
} from '../../communications/routes';
import {
  requireMarketingAIAuth,
  requireAIRole
} from '../../marketing-ai/routes';

interface MockTableState {
  growth_provider_secrets: any[];
  growth_provider_connections: any[];
  customers: any[];
  businesses: any[];
  business_memberships: any[];
  messages: any[];
}

function createMockSupabase(tables: MockTableState) {
  return {
    from(tableName: keyof MockTableState | string) {
      const tableData = (tables as any)[tableName] ?? [];
      let currentRows = [...tableData];

      const queryBuilder: any = {
        _rows: currentRows,
        select(cols?: string) {
          return queryBuilder;
        },
        eq(col: string, val: any) {
          queryBuilder._rows = queryBuilder._rows.filter((r: any) => r[col] === val);
          return queryBuilder;
        },
        in(col: string, vals: any[]) {
          queryBuilder._rows = queryBuilder._rows.filter((r: any) => vals.includes(r[col]));
          return queryBuilder;
        },
        ilike(col: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          queryBuilder._rows = queryBuilder._rows.filter((r: any) =>
            String(r[col] ?? '').toLowerCase().includes(needle)
          );
          return queryBuilder;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          return queryBuilder;
        },
        limit(n: number) {
          queryBuilder._rows = queryBuilder._rows.slice(0, n);
          return queryBuilder;
        },
        maybeSingle() {
          return Promise.resolve({ data: queryBuilder._rows[0] ?? null, error: null });
        },
        single() {
          if (queryBuilder._rows.length === 0) {
            return Promise.resolve({ data: null, error: new Error('Row not found') });
          }
          return Promise.resolve({ data: queryBuilder._rows[0], error: null });
        },
        insert(payload: any) {
          (tables as any)[tableName] = (tables as any)[tableName] || [];
          const inserted = Array.isArray(payload)
            ? payload
            : [{ id: payload.id || `gen-${Date.now()}-${Math.random()}`, ...payload }];
          (tables as any)[tableName].push(...inserted);
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: inserted[0], error: null });
                }
              };
            },
            then(resolve: any) {
              resolve({ data: inserted, error: null });
            }
          };
        },
        update(patch: any) {
          const matchedIds = queryBuilder._rows.map((r: any) => r.id || r.connection_id);
          const list = (tables as any)[tableName] || [];
          for (let i = 0; i < list.length; i++) {
            const key = list[i].id || list[i].connection_id;
            if (matchedIds.includes(key)) {
              list[i] = { ...list[i], ...patch };
            }
          }
          return {
            eq(col: string, val: any) {
              for (let i = 0; i < list.length; i++) {
                if (list[i][col] === val) {
                  list[i] = { ...list[i], ...patch };
                }
              }
              return queryBuilder;
            },
            select() {
              return {
                single() {
                  return Promise.resolve({ data: patch, error: null });
                }
              };
            },
            then(resolve: any) {
              resolve({ data: patch, error: null });
            }
          };
        },
        upsert(payload: any, opts?: { onConflict?: string }) {
          (tables as any)[tableName] = (tables as any)[tableName] || [];
          const list = (tables as any)[tableName];
          const conflictCol = opts?.onConflict || 'id';
          const items = Array.isArray(payload) ? payload : [payload];
          for (const item of items) {
            const idx = list.findIndex((r: any) => r[conflictCol] === item[conflictCol]);
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...item };
            } else {
              list.push({ ...item });
            }
          }
          return Promise.resolve({ data: payload, error: null });
        },
        then(resolve: any) {
          resolve({ data: queryBuilder._rows, error: null });
        }
      };
      return queryBuilder;
    },
    auth: {
      getUser(token: string) {
        if (token === 'valid_user_jwt') {
          return Promise.resolve({ data: { user: { id: 'usr_valid_001' } }, error: null });
        }
        if (token === 'staff_user_jwt') {
          return Promise.resolve({ data: { user: { id: 'usr_staff_002' } }, error: null });
        }
        if (token === 'guest_user_jwt') {
          return Promise.resolve({ data: { user: { id: 'usr_guest_003' } }, error: null });
        }
        return Promise.resolve({ data: { user: null }, error: new Error('Invalid JWT session') });
      }
    }
  } as any;
}

// -----------------------------------------------------------------------------
// Test Section 1: Meta 60-day Token Auto-Refresh Lifecycle Across Time Windows
// -----------------------------------------------------------------------------

test('Meta Token Refresh: > 7 days remaining returns cached token without calling API', async () => {
  const originalFetch = global.fetch;
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'meta_conn_30d',
        access_token: 'meta_token_cached_30d',
        refresh_token: null,
        expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
      }
    ],
    growth_provider_connections: [
      { id: 'meta_conn_30d', provider: 'meta_ads', status: 'connected' }
    ],
    customers: [],
    businesses: [],
    business_memberships: [],
    messages: []
  };

  const mockDb = createMockSupabase(tables);
  const origGrowthDb = clientModule.growthDb;
  (clientModule as any).growthDb = () => mockDb;

  try {
    const token = await getAccessToken('meta_conn_30d');
    assert.equal(token, 'meta_token_cached_30d');
    assert.equal(fetchCalled, false, 'Fetch must not be invoked when > 7 days lifetime remains');
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

test('Meta Token Refresh: <= 7 days remaining triggers proactive exchange and updates DB', async () => {
  process.env.META_APP_ID = 'test_meta_app_id';
  process.env.META_APP_SECRET = 'test_meta_app_secret';
  process.env.META_OAUTH_REDIRECT_URI = 'https://vowos.bridgebox.ai/api/growth/callback';

  const originalFetch = global.fetch;
  let calledUrl = '';
  global.fetch = async (input: any) => {
    calledUrl = String(input);
    return new Response(
      JSON.stringify({
        access_token: 'meta_token_renewed_60d',
        token_type: 'bearer',
        expires_in: 5184000
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'meta_conn_5d',
        access_token: 'meta_token_expiring_5d',
        refresh_token: null,
        expires_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
      }
    ],
    growth_provider_connections: [
      { id: 'meta_conn_5d', provider: 'meta_social', status: 'connected' }
    ],
    customers: [],
    businesses: [],
    business_memberships: [],
    messages: []
  };

  const mockDb = createMockSupabase(tables);
  const origGrowthDb = clientModule.growthDb;
  (clientModule as any).growthDb = () => mockDb;

  try {
    const token = await getAccessToken('meta_conn_5d');
    assert.equal(token, 'meta_token_renewed_60d');
    assert.ok(calledUrl.includes('fb_exchange_token'), 'Graph API call must use fb_exchange_token grant');
    assert.ok(calledUrl.includes('test_meta_app_id'));

    // Check secrets table was updated
    const secretRow = tables.growth_provider_secrets.find((s) => s.connection_id === 'meta_conn_5d');
    assert.equal(secretRow.access_token, 'meta_token_renewed_60d');
    const newExpiresAt = new Date(secretRow.expires_at).getTime();
    assert.ok(newExpiresAt > Date.now() + 50 * 24 * 3600 * 1000, 'New expiration must be ~60 days out');
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

test('Meta Token Refresh: expired token is proactively refreshed and returned', async () => {
  process.env.META_APP_ID = 'test_meta_app_id';
  process.env.META_APP_SECRET = 'test_meta_app_secret';
  process.env.META_OAUTH_REDIRECT_URI = 'https://vowos.bridgebox.ai/api/growth/callback';

  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(
      JSON.stringify({
        access_token: 'meta_token_resurrected',
        token_type: 'bearer',
        expires_in: 5184000
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'meta_conn_expired',
        access_token: 'meta_token_was_expired',
        refresh_token: null,
        expires_at: new Date(Date.now() - 3600 * 1000).toISOString() // Expired 1 hour ago
      }
    ],
    growth_provider_connections: [
      { id: 'meta_conn_expired', provider: 'meta', status: 'connected' }
    ],
    customers: [],
    businesses: [],
    business_memberships: [],
    messages: []
  };

  const mockDb = createMockSupabase(tables);
  const origGrowthDb = clientModule.growthDb;
  (clientModule as any).growthDb = () => mockDb;

  try {
    const token = await getAccessToken('meta_conn_expired');
    assert.equal(token, 'meta_token_resurrected');
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

test('Meta Token Refresh: expired token with exchange failure updates connection status to error and throws', async () => {
  process.env.META_APP_ID = 'test_meta_app_id';
  process.env.META_APP_SECRET = 'test_meta_app_secret';
  process.env.META_OAUTH_REDIRECT_URI = 'https://vowos.bridgebox.ai/api/growth/callback';

  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: { message: 'Session has expired or user revoked access', code: 190 }
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'meta_conn_fail',
        access_token: 'meta_dead_token',
        refresh_token: null,
        expires_at: new Date(Date.now() - 3600 * 1000).toISOString()
      }
    ],
    growth_provider_connections: [
      { id: 'meta_conn_fail', provider: 'meta', status: 'connected' }
    ],
    customers: [],
    businesses: [],
    business_memberships: [],
    messages: []
  };

  const mockDb = createMockSupabase(tables);
  const origGrowthDb = clientModule.growthDb;
  (clientModule as any).growthDb = () => mockDb;

  try {
    await assert.rejects(
      async () => {
        await getAccessToken('meta_conn_fail');
      },
      /reconnect the provider/
    );

    const connRow = tables.growth_provider_connections.find((c) => c.id === 'meta_conn_fail');
    assert.equal(connRow.status, 'error');
    assert.ok(connRow.last_error.includes('Session has expired'));
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

test('Meta Token Refresh: proactive exchange failure with > 2 mins remaining gracefully falls back to valid token', async () => {
  process.env.META_APP_ID = 'test_meta_app_id';
  process.env.META_APP_SECRET = 'test_meta_app_secret';
  process.env.META_OAUTH_REDIRECT_URI = 'https://vowos.bridgebox.ai/api/growth/callback';

  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(
      JSON.stringify({ error: { message: 'Temporary Meta API 500 server error' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'meta_conn_degraded',
        access_token: 'meta_token_valid_for_3days',
        refresh_token: null,
        expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
      }
    ],
    growth_provider_connections: [
      { id: 'meta_conn_degraded', provider: 'meta_ads', status: 'connected' }
    ],
    customers: [],
    businesses: [],
    business_memberships: [],
    messages: []
  };

  const mockDb = createMockSupabase(tables);
  const origGrowthDb = clientModule.growthDb;
  (clientModule as any).growthDb = () => mockDb;

  try {
    const token = await getAccessToken('meta_conn_degraded');
    assert.equal(token, 'meta_token_valid_for_3days', 'Should fall back to still-valid token despite refresh failure');
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

// -----------------------------------------------------------------------------
// Test Section 2: Google vs Meta Token Refresh Non-Interference
// -----------------------------------------------------------------------------

test('Non-Interference: Google connection uses refresh_token flow and does NOT touch Meta exchange', async () => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'google_client_id_123';
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'google_client_sec_123';
  process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://vowos.bridgebox.ai/api/growth/google/callback';

  const originalFetch = global.fetch;
  let googleCalled = false;
  let metaCalled = false;

  global.fetch = async (input: any, init?: any) => {
    const url = String(input);
    if (url.includes('googleapis.com')) {
      googleCalled = true;
      return new Response(
        JSON.stringify({
          access_token: 'google_new_access_token',
          expires_in: 3600,
          token_type: 'Bearer'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.includes('graph.facebook.com')) {
      metaCalled = true;
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'google_conn_1',
        access_token: 'google_expired_access_token',
        refresh_token: 'google_persistent_refresh_token_xyz',
        expires_at: new Date(Date.now() - 60 * 1000).toISOString()
      }
    ],
    growth_provider_connections: [
      { id: 'google_conn_1', provider: 'google_search_console', status: 'connected' }
    ],
    customers: [],
    businesses: [],
    business_memberships: [],
    messages: []
  };

  const mockDb = createMockSupabase(tables);
  const origGrowthDb = clientModule.growthDb;
  (clientModule as any).growthDb = () => mockDb;

  try {
    const token = await getAccessToken('google_conn_1');
    assert.equal(token, 'google_new_access_token');
    assert.equal(googleCalled, true, 'Google token refresh endpoint must be called');
    assert.equal(metaCalled, false, 'Meta Graph API must NEVER be called for a Google connection');

    // Verify refresh token was preserved and not overwritten
    const secretRow = tables.growth_provider_secrets.find((s) => s.connection_id === 'google_conn_1');
    assert.equal(secretRow.refresh_token, 'google_persistent_refresh_token_xyz');
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

test('Non-Interference: Expired Google connection with missing refresh_token throws clean error', async () => {
  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'google_conn_no_refresh',
        access_token: 'google_expired_no_refresh',
        refresh_token: null,
        expires_at: new Date(Date.now() - 60 * 1000).toISOString()
      }
    ],
    growth_provider_connections: [
      { id: 'google_conn_no_refresh', provider: 'google_business_profile', status: 'connected' }
    ],
    customers: [],
    businesses: [],
    business_memberships: [],
    messages: []
  };

  const mockDb = createMockSupabase(tables);
  const origGrowthDb = clientModule.growthDb;
  (clientModule as any).growthDb = () => mockDb;

  try {
    await assert.rejects(
      async () => {
        await getAccessToken('google_conn_no_refresh');
      },
      /Access token expired and no refresh token is stored/
    );
  } finally {
    (clientModule as any).growthDb = origGrowthDb;
  }
});

// -----------------------------------------------------------------------------
// Test Section 3: Endpoint Auth & RBAC Middleware Verification
// -----------------------------------------------------------------------------

test('Endpoint Security: requireCommunicationsAuth enforces authentication, roles, and tenant boundaries', async () => {
  const db = createMockSupabase({
    growth_provider_secrets: [],
    growth_provider_connections: [],
    customers: [],
    businesses: [{ id: 'biz_alpha_123', name: 'Alpha Bridal' }],
    business_memberships: [
      { user_id: 'usr_valid_001', business_id: 'biz_alpha_123', role: 'ADMIN', status: 'ACTIVE' },
      { user_id: 'usr_staff_002', business_id: 'biz_alpha_123', role: 'STAFF', status: 'ACTIVE' },
      { user_id: 'usr_guest_003', business_id: 'biz_alpha_123', role: 'GUEST', status: 'ACTIVE' }
    ],
    messages: []
  });

  const runAuth = async (headers: any, body?: any) => {
    const req: any = { headers, body, context: { db } };
    let statusResult: number | null = null;
    let jsonResult: any = null;
    const res: any = {
      status(c: number) {
        statusResult = c;
        return {
          json(data: any) {
            jsonResult = data;
          }
        };
      }
    };
    let nextCalled = false;
    await requireCommunicationsAuth(req, res, () => {
      nextCalled = true;
    });
    return { statusResult, jsonResult, nextCalled, authContext: req.authContext };
  };

  // Case 1: Missing header
  const r1 = await runAuth({});
  assert.equal(r1.statusResult, 401);
  assert.equal(r1.nextCalled, false);

  // Case 2: Invalid JWT
  const r2 = await runAuth({ authorization: 'Bearer invalid_garbage_token' });
  assert.equal(r2.statusResult, 401);
  assert.equal(r2.nextCalled, false);

  // Case 3: Unauthorized role (GUEST)
  const r3 = await runAuth({ authorization: 'Bearer guest_user_jwt' });
  assert.equal(r3.statusResult, 403);
  assert.match(r3.jsonResult.error, /Insufficient permissions/);
  assert.equal(r3.nextCalled, false);

  // Case 4: Cross-tenant impersonation attempt (claimed business does not match active membership)
  const r4 = await runAuth(
    { authorization: 'Bearer valid_user_jwt' },
    { businessId: 'victim_business_999' }
  );
  assert.equal(r4.statusResult, 403);
  assert.match(r4.jsonResult.error, /does not match your membership/);
  assert.equal(r4.nextCalled, false);

  // Case 5: Valid STAFF user matching business
  const r5 = await runAuth(
    { authorization: 'Bearer staff_user_jwt' },
    { businessId: 'biz_alpha_123' }
  );
  assert.equal(r5.statusResult, null);
  assert.equal(r5.nextCalled, true);
  assert.equal(r5.authContext.userId, 'usr_staff_002');
  assert.equal(r5.authContext.businessId, 'biz_alpha_123');
  assert.equal(r5.authContext.role, 'STAFF');
});

test('Endpoint Security: requireMarketingAIAuth & requireAIRole RBAC enforcement', async () => {
  const db = createMockSupabase({
    growth_provider_secrets: [],
    growth_provider_connections: [],
    customers: [],
    businesses: [{ id: 'biz_ai_100', name: 'AI Bridal' }],
    business_memberships: [
      { user_id: 'usr_valid_001', business_id: 'biz_ai_100', role: 'ADMIN', status: 'ACTIVE' },
      { user_id: 'usr_staff_002', business_id: 'biz_ai_100', role: 'STAFF', status: 'ACTIVE' }
    ],
    messages: []
  });

  // Test requireMarketingAIAuth with unauthenticated
  const reqUnauth: any = { headers: {}, context: { db } };
  let status1: number | null = null;
  const res1: any = { status(c: number) { status1 = c; return { json() {} }; } };
  await requireMarketingAIAuth(reqUnauth, res1, () => {});
  assert.equal(status1, 401);

  // Test requireAIRole: MANAGER/ADMIN only
  const adminGuard = requireAIRole(['OWNER', 'ADMIN', 'MANAGER']);

  // Admin allowed
  const reqAdmin: any = { aiContext: { userId: 'usr_valid_001', businessId: 'biz_ai_100', role: 'ADMIN' } };
  let nextAdmin = false;
  adminGuard(reqAdmin, {} as any, () => { nextAdmin = true; });
  assert.equal(nextAdmin, true);

  // Staff forbidden from admin action
  const reqStaff: any = { aiContext: { userId: 'usr_staff_002', businessId: 'biz_ai_100', role: 'STAFF' } };
  let statusStaff: number | null = null;
  const resStaff: any = { status(c: number) { statusStaff = c; return { json() {} }; } };
  let nextStaff = false;
  adminGuard(reqStaff, resStaff, () => { nextStaff = true; });
  assert.equal(statusStaff, 403);
  assert.equal(nextStaff, false);
});

// -----------------------------------------------------------------------------
// Test Section 4: Phone Candidate Normalization Across Formats
// -----------------------------------------------------------------------------

test('Phone Normalization: correctly resolves customer across varied phone input formats', async () => {
  const db = createMockSupabase({
    growth_provider_secrets: [],
    growth_provider_connections: [],
    customers: [
      {
        id: 'cust_e164_1',
        name: 'Sarah E164',
        phone: '+12255550111',
        business_id: 'biz_main_1',
        location_id: 'loc_br_1'
      },
      {
        id: 'cust_parens_2',
        name: 'Emily Parens',
        phone: '(225) 555-0222',
        business_id: 'biz_main_1',
        location_id: 'loc_cov_1'
      },
      {
        id: 'cust_dashes_3',
        name: 'Jessica Dashes',
        phone: '225-555-0333',
        business_id: 'biz_main_1',
        location_id: null
      },
      {
        id: 'cust_dots_4',
        name: 'Amanda Dots',
        phone: '225.555.0444',
        business_id: 'biz_main_1',
        location_id: null
      }
    ],
    businesses: [{ id: 'biz_main_1', name: 'Proper & Company' }],
    business_memberships: [],
    messages: []
  });

  // Test 1: Inbound E.164 matches customer stored as (225) 555-0222
  const r1 = await resolveCustomerAndBusiness(db, '+12255550222');
  assert.equal(r1.customerId, 'cust_parens_2');
  assert.equal(r1.customerName, 'Emily Parens');

  // Test 2: Inbound 10-digit raw matches customer stored as 225-555-0333
  const r2 = await resolveCustomerAndBusiness(db, '2255550333');
  assert.equal(r2.customerId, 'cust_dashes_3');

  // Test 3: Inbound 11-digit 1XXXXXXXXXX matches customer stored as 225.555.0444
  const r3 = await resolveCustomerAndBusiness(db, '12255550444');
  assert.equal(r3.customerId, 'cust_dots_4');

  // Test 4: Inbound formatted string matches customer stored as +12255550111
  const r4 = await resolveCustomerAndBusiness(db, '(225) 555-0111');
  assert.equal(r4.customerId, 'cust_e164_1');

  // Test 5: Unknown phone number returns null customerId and resolves real business UUID (NEVER dummy b0000000...)
  const r5 = await resolveCustomerAndBusiness(db, '+15045559999');
  assert.equal(r5.customerId, null);
  assert.equal(r5.customerName, '+15045559999');
  assert.equal(r5.businessId, 'biz_main_1');
  assert.notEqual(r5.businessId, 'b0000000-0000-0000-0000-000000000000');

  // Test 6: Non-numeric invalid phone string handles safely without crash
  const r6 = await resolveCustomerAndBusiness(db, 'INVALID_PHONE');
  assert.equal(r6.customerId, null);
  assert.equal(r6.businessId, 'biz_main_1');
});
