/**
 * Milestone 3 Challenger 4 Adversarial Stress Test Suite
 *
 * Empirical verification of:
 * 1. Meta 60-day token auto-refresh lifecycle across all time windows (>7d, <=7d, expired, degraded, failure).
 * 2. Google vs Meta token refresh non-interference & isolation in store.ts:getAccessToken.
 * 3. Worker endpoint authentication & RBAC middleware (/api/communications/send-sms and /api/marketing-ai/*).
 * 4. Phone number candidate normalization across all valid/invalid formats.
 * 5. Multi-tenant boundary enforcement and cross-tenant attack rejection.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as clientModule from '../client';
import { getAccessToken, saveTokens } from '../store';
import {
  resolveCustomerAndBusiness,
  requireCommunicationsAuth,
  validateTwilioWebhookSignature
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
        if (token === 'jwt_owner_token') {
          return Promise.resolve({ data: { user: { id: 'usr_owner_001' } }, error: null });
        }
        if (token === 'jwt_admin_token') {
          return Promise.resolve({ data: { user: { id: 'usr_admin_002' } }, error: null });
        }
        if (token === 'jwt_manager_token') {
          return Promise.resolve({ data: { user: { id: 'usr_mgr_003' } }, error: null });
        }
        if (token === 'jwt_staff_token') {
          return Promise.resolve({ data: { user: { id: 'usr_staff_004' } }, error: null });
        }
        if (token === 'jwt_guest_token') {
          return Promise.resolve({ data: { user: { id: 'usr_guest_005' } }, error: null });
        }
        if (token === 'jwt_inactive_token') {
          return Promise.resolve({ data: { user: { id: 'usr_inactive_006' } }, error: null });
        }
        return Promise.resolve({ data: { user: null }, error: new Error('Invalid JWT signature') });
      }
    }
  } as any;
}

// -----------------------------------------------------------------------------
// 1. Meta 60-day Token Auto-Refresh Lifecycle Across Time Windows
// -----------------------------------------------------------------------------

test('Meta Token Refresh: > 7 days remaining returns cached token without calling Meta Graph API', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;
  global.fetch = async () => {
    fetchCount++;
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'meta_c1_45d',
        access_token: 'meta_access_token_45d_remaining',
        refresh_token: null,
        expires_at: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString()
      }
    ],
    growth_provider_connections: [
      { id: 'meta_c1_45d', provider: 'meta_ads', status: 'connected' }
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
    const token = await getAccessToken('meta_c1_45d');
    assert.equal(token, 'meta_access_token_45d_remaining');
    assert.equal(fetchCount, 0, 'No HTTP request should be made when token has 45 days remaining');
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

test('Meta Token Refresh: <= 7 days remaining triggers fb_exchange_token and updates secret record', async () => {
  process.env.META_APP_ID = 'test_meta_app_123';
  process.env.META_APP_SECRET = 'test_meta_secret_456';
  process.env.META_OAUTH_REDIRECT_URI = 'https://vowos.bridgebox.ai/api/growth/meta/callback';

  const originalFetch = global.fetch;
  let calledUrl = '';
  global.fetch = async (input: any) => {
    calledUrl = String(input);
    return new Response(
      JSON.stringify({
        access_token: 'meta_token_refreshed_60d',
        token_type: 'bearer',
        expires_in: 5184000
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'meta_c2_3d',
        access_token: 'meta_token_expiring_in_3d',
        refresh_token: null,
        expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
      }
    ],
    growth_provider_connections: [
      { id: 'meta_c2_3d', provider: 'meta_social', status: 'connected' }
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
    const token = await getAccessToken('meta_c2_3d');
    assert.equal(token, 'meta_token_refreshed_60d');
    assert.ok(calledUrl.includes('grant_type=fb_exchange_token'));
    assert.ok(calledUrl.includes('test_meta_app_123'));
    assert.ok(calledUrl.includes('meta_token_expiring_in_3d'));

    const secretRow = tables.growth_provider_secrets.find((s) => s.connection_id === 'meta_c2_3d');
    assert.equal(secretRow.access_token, 'meta_token_refreshed_60d');
    assert.ok(new Date(secretRow.expires_at).getTime() > Date.now() + 50 * 24 * 3600 * 1000);
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

test('Meta Token Refresh: proactive exchange failure with > 2m remaining falls back to current token without throwing', async () => {
  process.env.META_APP_ID = 'test_meta_app_123';
  process.env.META_APP_SECRET = 'test_meta_secret_456';
  process.env.META_OAUTH_REDIRECT_URI = 'https://vowos.bridgebox.ai/api/growth/meta/callback';

  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(
      JSON.stringify({ error: { message: 'Meta Graph API temporarily overloaded (503)' } }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'meta_c3_fallback',
        access_token: 'meta_valid_fallback_token',
        refresh_token: null,
        expires_at: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString() // 2 days remaining
      }
    ],
    growth_provider_connections: [
      { id: 'meta_c3_fallback', provider: 'meta_ads', status: 'connected' }
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
    const token = await getAccessToken('meta_c3_fallback');
    assert.equal(token, 'meta_valid_fallback_token', 'Should return valid existing token when proactive refresh encounters temporary upstream failure');
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

test('Meta Token Refresh: expired token with exchange failure updates status=error and throws descriptive error', async () => {
  process.env.META_APP_ID = 'test_meta_app_123';
  process.env.META_APP_SECRET = 'test_meta_secret_456';
  process.env.META_OAUTH_REDIRECT_URI = 'https://vowos.bridgebox.ai/api/growth/meta/callback';

  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(
      JSON.stringify({ error: { message: 'OAuthException: User changed password', code: 190 } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'meta_c4_expired_revoked',
        access_token: 'meta_revoked_token',
        refresh_token: null,
        expires_at: new Date(Date.now() - 3600 * 1000).toISOString() // Expired 1 hr ago
      }
    ],
    growth_provider_connections: [
      { id: 'meta_c4_expired_revoked', provider: 'meta', status: 'connected' }
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
        await getAccessToken('meta_c4_expired_revoked');
      },
      /Meta access token expired and could not be refreshed/
    );

    const conn = tables.growth_provider_connections.find((c) => c.id === 'meta_c4_expired_revoked');
    assert.equal(conn.status, 'error');
    assert.ok(conn.last_error.includes('OAuthException: User changed password'));
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

// -----------------------------------------------------------------------------
// 2. Google vs Meta Token Refresh Isolation & Non-Interference
// -----------------------------------------------------------------------------

test('Isolation: Google token refresh only calls Google token endpoint and preserves refresh_token', async () => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'goog_client_id_abc';
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'goog_client_secret_xyz';
  process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://vowos.bridgebox.ai/api/growth/google/callback';

  const originalFetch = global.fetch;
  let googleCalled = false;
  let metaCalled = false;

  global.fetch = async (input: any) => {
    const url = String(input);
    if (url.includes('googleapis.com')) {
      googleCalled = true;
      return new Response(
        JSON.stringify({
          access_token: 'goog_fresh_access_token_777',
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
        connection_id: 'goog_conn_99',
        access_token: 'goog_expired_access_token',
        refresh_token: 'goog_vital_refresh_token_never_lose',
        expires_at: new Date(Date.now() - 5000).toISOString()
      }
    ],
    growth_provider_connections: [
      { id: 'goog_conn_99', provider: 'google_analytics', status: 'connected' }
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
    const token = await getAccessToken('goog_conn_99');
    assert.equal(token, 'goog_fresh_access_token_777');
    assert.equal(googleCalled, true);
    assert.equal(metaCalled, false, 'Google token refresh must never invoke Meta Graph API');

    const secretRow = tables.growth_provider_secrets.find((s) => s.connection_id === 'goog_conn_99');
    assert.equal(secretRow.refresh_token, 'goog_vital_refresh_token_never_lose', 'Google refresh token must remain intact in secrets table');
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

test('Isolation: Google token with > 2 mins remaining returns cached access token without network call', async () => {
  const originalFetch = global.fetch;
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const tables: MockTableState = {
    growth_provider_secrets: [
      {
        connection_id: 'goog_conn_valid',
        access_token: 'goog_valid_cached_token',
        refresh_token: 'goog_refresh_token',
        expires_at: new Date(Date.now() + 1800 * 1000).toISOString() // 30 mins remaining
      }
    ],
    growth_provider_connections: [
      { id: 'goog_conn_valid', provider: 'google_search_console', status: 'connected' }
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
    const token = await getAccessToken('goog_conn_valid');
    assert.equal(token, 'goog_valid_cached_token');
    assert.equal(fetchCalled, false);
  } finally {
    global.fetch = originalFetch;
    (clientModule as any).growthDb = origGrowthDb;
  }
});

// -----------------------------------------------------------------------------
// 3. Endpoint Auth & RBAC Security Verification
// -----------------------------------------------------------------------------

test('Endpoint Security: requireCommunicationsAuth rejects unauthenticated, invalid, inactive, and unauthorized roles', async () => {
  const db = createMockSupabase({
    growth_provider_secrets: [],
    growth_provider_connections: [],
    customers: [],
    businesses: [{ id: 'biz_tenant_alpha', name: 'Alpha Tenant' }],
    business_memberships: [
      { user_id: 'usr_owner_001', business_id: 'biz_tenant_alpha', role: 'OWNER', status: 'ACTIVE' },
      { user_id: 'usr_admin_002', business_id: 'biz_tenant_alpha', role: 'ADMIN', status: 'ACTIVE' },
      { user_id: 'usr_mgr_003', business_id: 'biz_tenant_alpha', role: 'MANAGER', status: 'ACTIVE' },
      { user_id: 'usr_staff_004', business_id: 'biz_tenant_alpha', role: 'STAFF', status: 'ACTIVE' },
      { user_id: 'usr_guest_005', business_id: 'biz_tenant_alpha', role: 'GUEST', status: 'ACTIVE' },
      { user_id: 'usr_inactive_006', business_id: 'biz_tenant_alpha', role: 'MANAGER', status: 'REVOKED' }
    ],
    messages: []
  });

  const execAuth = async (authHeader?: string, body?: any) => {
    const req: any = { headers: authHeader ? { authorization: authHeader } : {}, body, context: { db } };
    let statusResult: number | null = null;
    let jsonResult: any = null;
    const res: any = {
      status(code: number) {
        statusResult = code;
        return { json(d: any) { jsonResult = d; } };
      }
    };
    let nextCalled = false;
    await requireCommunicationsAuth(req, res, () => { nextCalled = true; });
    return { statusResult, jsonResult, nextCalled, authContext: req.authContext };
  };

  // Case 1: Missing auth header -> 401
  const c1 = await execAuth();
  assert.equal(c1.statusResult, 401);
  assert.equal(c1.nextCalled, false);

  // Case 2: Invalid Bearer token -> 401
  const c2 = await execAuth('Bearer non_existent_token');
  assert.equal(c2.statusResult, 401);
  assert.equal(c2.nextCalled, false);

  // Case 3: Inactive membership -> 403
  const c3 = await execAuth('Bearer jwt_inactive_token');
  assert.equal(c3.statusResult, 403);
  assert.match(c3.jsonResult.error, /Select an organization before sending communications/);
  assert.equal(c3.nextCalled, false);

  // Case 4: Unauthorized role (GUEST) -> 403
  const c4 = await execAuth('Bearer jwt_guest_token');
  assert.equal(c4.statusResult, 403);
  assert.match(c4.jsonResult.error, /Insufficient permissions/);
  assert.equal(c4.nextCalled, false);

  // Case 5: Cross-tenant attack (claiming different business ID than membership) -> 403
  const c5 = await execAuth('Bearer jwt_staff_token', { businessId: 'biz_victim_other' });
  assert.equal(c5.statusResult, 403);
  assert.match(c5.jsonResult.error, /Requested organization does not match an active membership/);
  assert.equal(c5.nextCalled, false);

  // Case 6: Authorized roles (OWNER, ADMIN, MANAGER, STAFF) -> 200 / next()
  for (const roleToken of ['jwt_owner_token', 'jwt_admin_token', 'jwt_manager_token', 'jwt_staff_token']) {
    const successResult = await execAuth(`Bearer ${roleToken}`, { businessId: 'biz_tenant_alpha' });
    assert.equal(successResult.statusResult, null);
    assert.equal(successResult.nextCalled, true);
    assert.equal(successResult.authContext.businessId, 'biz_tenant_alpha');
  }
});

test('Endpoint Security: requireMarketingAIAuth & requireAIRole RBAC enforcement', async () => {
  const db = createMockSupabase({
    growth_provider_secrets: [],
    growth_provider_connections: [],
    customers: [],
    businesses: [{ id: 'biz_ai_tenant', name: 'AI Tenant' }],
    business_memberships: [
      { user_id: 'usr_owner_001', business_id: 'biz_ai_tenant', role: 'OWNER', status: 'ACTIVE' },
      { user_id: 'usr_staff_004', business_id: 'biz_ai_tenant', role: 'STAFF', status: 'ACTIVE' }
    ],
    messages: []
  });

  // Auth middleware checks
  const reqUnauth: any = { headers: {}, context: { db } };
  let statusUnauth: number | null = null;
  const resUnauth: any = { status(c: number) { statusUnauth = c; return { json() {} }; } };
  await requireMarketingAIAuth(reqUnauth, resUnauth, () => {});
  assert.equal(statusUnauth, 401);

  // RBAC guard checks
  const rbacGuard = requireAIRole(['OWNER', 'ADMIN', 'MANAGER']);

  // OWNER is allowed
  const reqOwner: any = { aiContext: { userId: 'usr_owner_001', businessId: 'biz_ai_tenant', role: 'OWNER' } };
  let nextOwner = false;
  rbacGuard(reqOwner, {} as any, () => { nextOwner = true; });
  assert.equal(nextOwner, true);

  // STAFF is rejected from OWNER/ADMIN/MANAGER operations
  const reqStaff: any = { aiContext: { userId: 'usr_staff_004', businessId: 'biz_ai_tenant', role: 'STAFF' } };
  let statusStaff: number | null = null;
  const resStaff: any = { status(c: number) { statusStaff = c; return { json() {} }; } };
  let nextStaff = false;
  rbacGuard(reqStaff, resStaff, () => { nextStaff = true; });
  assert.equal(statusStaff, 403);
  assert.equal(nextStaff, false);
});

// -----------------------------------------------------------------------------
// 4. Phone Candidate Normalization Across Formats & Multi-Tenant Ingestion
// -----------------------------------------------------------------------------

test('Phone Normalization: matches customers across all standard US and international formats', async () => {
  const db = createMockSupabase({
    growth_provider_secrets: [],
    growth_provider_connections: [],
    customers: [
      { id: 'c_e164', name: 'Customer E164', phone: '+12255550001', business_id: 'biz_1', location_id: 'loc_1' },
      { id: 'c_parens', name: 'Customer Parens', phone: '(225) 555-0002', business_id: 'biz_1', location_id: 'loc_1' },
      { id: 'c_dashes', name: 'Customer Dashes', phone: '225-555-0003', business_id: 'biz_1', location_id: 'loc_1' },
      { id: 'c_dots', name: 'Customer Dots', phone: '225.555.0004', business_id: 'biz_1', location_id: 'loc_1' },
      { id: 'c_plain', name: 'Customer Plain', phone: '2255550005', business_id: 'biz_1', location_id: 'loc_1' }
    ],
    businesses: [{ id: 'biz_1', name: 'Proper & Company' }],
    business_memberships: [],
    messages: []
  });

  // Query 1: plain 10-digit incoming -> matches E.164 record
  const q1 = await resolveCustomerAndBusiness(db, '2255550001');
  assert.equal(q1.customerId, 'c_e164');

  // Query 2: E.164 incoming -> matches Parens record
  const q2 = await resolveCustomerAndBusiness(db, '+12255550002');
  assert.equal(q2.customerId, 'c_parens');

  // Query 3: Formatted (225) 555-0003 incoming -> matches Dashes record
  const q3 = await resolveCustomerAndBusiness(db, '(225) 555-0003');
  assert.equal(q3.customerId, 'c_dashes');

  // Query 4: Formatted 225-555-0004 incoming -> matches Dots record
  const q4 = await resolveCustomerAndBusiness(db, '225-555-0004');
  assert.equal(q4.customerId, 'c_dots');

  // Query 5: 11-digit 12255550005 incoming -> matches Plain record
  const q5 = await resolveCustomerAndBusiness(db, '12255550005');
  assert.equal(q5.customerId, 'c_plain');

  // Query 6: Unknown phone number remains tenantless rather than leaking to a business.
  const q6 = await resolveCustomerAndBusiness(db, '+19855559999');
  assert.equal(q6.customerId, null);
  assert.equal(q6.customerName, '+19855559999');
  assert.equal(q6.businessId, null);
  assert.equal(q6.routing, 'UNRESOLVED');

  // Query 7: Garbage / empty input handles safely without crash
  const q7 = await resolveCustomerAndBusiness(db, '');
  assert.equal(q7.customerId, null);
  assert.equal(q7.businessId, null);
  assert.equal(q7.routing, 'UNRESOLVED');
});
