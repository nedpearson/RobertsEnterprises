import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  validateTwilioWebhookSignature,
  resolveCustomerAndBusiness,
  requireCommunicationsAuth
} from '../routes';
import { requireAIRole, requireMarketingAIAuth } from '../../marketing-ai/routes';

function computeTwilioSignature(authToken: string, url: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) {
    data += k + (params[k] !== undefined && params[k] !== null ? String(params[k]) : '');
  }
  return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
}

function stubDb(tables: Record<string, any[]>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const chain: any = {
        _rows: rows,
        select() { return chain; },
        eq(col: string, val: any) {
          chain._rows = chain._rows.filter((r: any) => r[col] === val);
          return chain;
        },
        in(col: string, vals: any[]) {
          chain._rows = chain._rows.filter((r: any) => vals.includes(r[col]));
          return chain;
        },
        ilike(col: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          chain._rows = chain._rows.filter((r: any) => String(r[col] ?? '').toLowerCase().includes(needle));
          return chain;
        },
        order() { return chain; },
        limit(n: number) {
          chain._rows = chain._rows.slice(0, n);
          return chain;
        },
        maybeSingle() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        single() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        insert(payload: any) {
          tables[table] = tables[table] || [];
          const inserted = Array.isArray(payload) ? payload : [{ id: `gen-${Date.now()}-${Math.random()}`, ...payload }];
          tables[table].push(...inserted);
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
        then(resolve: any) { resolve({ data: chain._rows, error: null }); }
      };
      return chain;
    },
    auth: {
      getUser(token: string) {
        if (token === 'valid_jwt_token') {
          return Promise.resolve({ data: { user: { id: 'user_uuid_123' } }, error: null });
        }
        return Promise.resolve({ data: { user: null }, error: new Error('Invalid token') });
      }
    }
  } as any;
}

test('Twilio Signature Verification: accepts valid HMAC-SHA1 signature', () => {
  const token = 'auth_token_secret_123';
  const url = 'https://vowos.bridgebox.ai/api/communications/twilio-webhook';
  const params = { From: '+12255550101', To: '+12255550199', Body: 'Confirming appointment', MessageSid: 'SM100' };
  const validSig = computeTwilioSignature(token, url, params);

  const result = validateTwilioWebhookSignature(token, validSig, url, params);
  assert.equal(result, true);
});

test('Twilio Signature Verification: rejects tampered body or invalid signature', () => {
  const token = 'auth_token_secret_123';
  const url = 'https://vowos.bridgebox.ai/api/communications/twilio-webhook';
  const params = { From: '+12255550101', To: '+12255550199', Body: 'Confirming appointment', MessageSid: 'SM100' };
  const validSig = computeTwilioSignature(token, url, params);

  const tamperedParams = { ...params, Body: 'Spoofed message!' };
  assert.equal(validateTwilioWebhookSignature(token, validSig, url, tamperedParams), false);
  assert.equal(validateTwilioWebhookSignature(token, 'invalid_sig_base64', url, params), false);
  assert.equal(validateTwilioWebhookSignature(token, undefined, url, params), false);
  assert.equal(validateTwilioWebhookSignature('', validSig, url, params), false);
});

test('Customer Phone Matching: matches E.164 and formatted phone numbers', async () => {
  const db = stubDb({
    customers: [
      { id: 'cust-uuid-1', name: 'Madeline Miller', phone: '(225) 555-0101', business_id: 'biz-uuid-1', location_id: 'loc-uuid-1' }
    ],
    businesses: [{ id: 'biz-uuid-1', name: 'Proper & Company' }]
  });

  const res = await resolveCustomerAndBusiness(db, '+12255550101', '+12255550199');
  assert.equal(res.customerId, 'cust-uuid-1');
  assert.equal(res.customerName, 'Madeline Miller');
  assert.equal(res.businessId, 'biz-uuid-1');
  assert.equal(res.locationId, 'loc-uuid-1');
});

test('Customer Phone Matching: quarantines an unknown customer instead of guessing a business', async () => {
  const db = stubDb({
    customers: [],
    businesses: [{ id: 'biz-real-uuid', name: 'Proper & Company' }]
  });

  const res = await resolveCustomerAndBusiness(db, '+19999999999', '+12255550199');
  assert.equal(res.customerId, null);
  assert.equal(res.customerName, '+19999999999');
  assert.equal(res.businessId, null);
  assert.equal(res.routing, 'UNRESOLVED');
});

test('requireCommunicationsAuth: returns 401 on missing Authorization header', async () => {
  const req: any = { headers: {} };
  let statusResult: number | null = null;
  let jsonResult: any = null;
  const res: any = {
    status(code: number) {
      statusResult = code;
      return {
        json(data: any) {
          jsonResult = data;
        }
      };
    }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await requireCommunicationsAuth(req, res, next);
  assert.equal(statusResult, 401);
  assert.equal(nextCalled, false);
});

test('requireCommunicationsAuth: returns 403 when user has no active business membership', async () => {
  const db = stubDb({
    business_memberships: []
  });
  const req: any = {
    headers: { authorization: 'Bearer valid_jwt_token' },
    context: { db }
  };
  let statusResult: number | null = null;
  let jsonResult: any = null;
  const res: any = {
    status(code: number) {
      statusResult = code;
      return {
        json(data: any) {
          jsonResult = data;
        }
      };
    }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await requireCommunicationsAuth(req, res, next);
  assert.equal(statusResult, 403);
  assert.equal(nextCalled, false);
});

test('requireCommunicationsAuth: succeeds and attaches authContext for active member', async () => {
  const db = stubDb({
    business_memberships: [
      { user_id: 'user_uuid_123', business_id: 'biz_active_uuid', role: 'MANAGER', status: 'ACTIVE' }
    ]
  });
  const req: any = {
    headers: { authorization: 'Bearer valid_jwt_token' },
    body: { businessId: 'biz_active_uuid' },
    context: { db }
  };
  let statusResult: number | null = null;
  const res: any = {
    status(code: number) {
      statusResult = code;
      return { json() {} };
    }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  await requireCommunicationsAuth(req, res, next);
  assert.equal(statusResult, null);
  assert.equal(nextCalled, true);
  assert.equal(req.authContext.userId, 'user_uuid_123');
  assert.equal(req.authContext.businessId, 'biz_active_uuid');
  assert.equal(req.authContext.role, 'MANAGER');
});

test('requireAIRole: enforces role-based access control for governance mutations', () => {
  const guard = requireAIRole(['OWNER', 'ADMIN', 'MANAGER']);

  // Test authorized role
  const reqAuth: any = { aiContext: { userId: 'u1', businessId: 'b1', role: 'ADMIN' } };
  let nextCalled1 = false;
  guard(reqAuth, {} as any, () => { nextCalled1 = true; });
  assert.equal(nextCalled1, true);

  // Test unauthorized role
  let statusResult2: number | null = null;
  const res2: any = { status(c: number) { statusResult2 = c; return { json() {} }; } };
  const reqUnauth: any = { aiContext: { userId: 'u2', businessId: 'b1', role: 'GUEST' } };
  let nextCalled2 = false;
  guard(reqUnauth, res2, () => { nextCalled2 = true; });
  assert.equal(statusResult2, 403);
  assert.equal(nextCalled2, false);
});
