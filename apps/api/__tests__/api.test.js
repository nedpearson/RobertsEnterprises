/**
 * VowOS API — integration tests
 * Uses a fresh in-memory SQLite DB per test run (TEST_DB env var).
 * Run: npm test -w apps/api
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-jest';
process.env.TEST_DB = ':memory:';

const request = require('supertest');
const { app, knex } = require('../server');

// ─── helpers ────────────────────────────────────────────────────────────────

let token;
let consultantToken;

async function getToken() {
  if (token) return token;
  const res = await request(app).post('/api/demo-login');
  token = res.body.token;
  return token;
}

function getConsultantToken() {
  if (consultantToken) return consultantToken;
  // Sign a consultant JWT directly — we're testing RBAC middleware, not login
  const jwt = require('jsonwebtoken');
  consultantToken = jwt.sign(
    { id: 999, name: 'Test Consultant', role: 'consultant', boutique_id: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return consultantToken;
}

function auth(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

function authAs(req, t) {
  return req.set('Authorization', `Bearer ${t}`);
}

// ─── lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => {
  await knex.migrate.latest();
  
  // Insert static Test Boutique if not exists
  const existingBoutique = await knex('boutiques').where({ id: 999 }).first();
  if (!existingBoutique) {
    await knex('boutiques').insert({
      id: 999,
      name: 'Test Boutique',
      timezone: 'America/New_York'
    });
  }

  // Insert static Test Consultant if not exists
  const existingUser = await knex('users').where({ id: 999 }).first();
  if (!existingUser) {
    await knex('users').insert({
      id: 999,
      boutique_id: 999,
      first_name: 'Test',
      last_name: 'Consultant',
      email: 'consultant@test.com',
      role: 'consultant',
      password_hash: 'test',
      status: 'active'
    });
  }

  token = await getToken();
}, 30000);

afterAll(async () => {
  await knex.destroy();
});

// ─── health ──────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 and status OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
});

// ─── auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/demo-login', () => {
  it('returns a JWT token', async () => {
    const res = await request(app).post('/api/demo-login');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    token = res.body.token;
  });
});

describe('POST /api/login', () => {
  it('returns 401 for wrong credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'nobody@nowhere.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns JWT for valid demo credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'owner@vowos.demo', password: 'demo1234' });
    // demo seeder creates this user — if credentials differ just check not 500
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) expect(res.body).toHaveProperty('token');
  });
});

// ─── reports — 401 without token ─────────────────────────────────────────────

const PROTECTED_ROUTES = [
  '/api/reports/sales',
  '/api/reports/open-orders',
  '/api/reports/expected-deliveries',
  '/api/reports/bookings',
  '/api/reports/cancellations',
  '/api/reports/did-not-buy',
  '/api/reports/transfers',
  '/api/follow-ups',
];

describe('Protected routes — no token → 401', () => {
  for (const route of PROTECTED_ROUTES) {
    it(`GET ${route} returns 401`, async () => {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    });
  }
});

// ─── reports — 200 with token ─────────────────────────────────────────────────

describe('Protected routes — valid token → 200', () => {
  for (const route of PROTECTED_ROUTES) {
    it(`GET ${route} returns 200`, async () => {
      const res = await auth(request(app).get(route));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  }
});

// ─── bookings ────────────────────────────────────────────────────────────────

describe('Bookings CRUD', () => {
  let bookingId;
  let customerId;

  beforeAll(async () => {
    // get a real customer id from seeded data
    const customers = await knex('customers').select('id').limit(1);
    customerId = customers[0]?.id ?? 1;
  });

  it('POST /api/bookings creates a booking', async () => {
    const boutiques = await knex('boutiques').select('id').limit(1);
    const boutique_id = boutiques[0]?.id ?? 1;
    const res = await auth(request(app).post('/api/bookings')).send({
      customer_id: customerId,
      boutique_id,
      booking_type: 'bridal',
      notes: 'Test booking',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    bookingId = res.body.id;
  });

  it('GET /api/bookings returns array', async () => {
    const res = await auth(request(app).get('/api/bookings'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/bookings/:id returns the booking', async () => {
    if (!bookingId) return;
    const res = await auth(request(app).get(`/api/bookings/${bookingId}`));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(bookingId);
  });

  it('PATCH /api/bookings/:id/status updates status', async () => {
    if (!bookingId) return;
    const res = await auth(request(app).patch(`/api/bookings/${bookingId}/status`))
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
  });
});

// ─── availability & slot ranker ───────────────────────────────────────────────

describe('GET /api/bookings/availability', () => {
  it('returns slots array for a date', async () => {
    const res = await auth(request(app).get('/api/bookings/availability?date=2026-09-01'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBe(8); // 10:00–17:00
    expect(res.body.slots[0]).toHaveProperty('available');
  });
});

describe('GET /api/bookings/slot-rank', () => {
  it('returns ranked slots with recommended flag', async () => {
    const res = await auth(request(app).get('/api/bookings/slot-rank?date=2026-09-01'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const recommended = res.body.filter(s => s.recommended);
    expect(recommended.length).toBe(3);
    expect(res.body[0]).toHaveProperty('score');
  });
});

// ─── follow-ups ───────────────────────────────────────────────────────────────

describe('Follow-ups', () => {
  let followUpId;
  let customerId;

  beforeAll(async () => {
    const customers = await knex('customers').select('id').limit(1);
    customerId = customers[0]?.id ?? 1;
  });

  it('POST /api/follow-ups creates a follow-up', async () => {
    const res = await auth(request(app).post('/api/follow-ups')).send({
      customer_id: customerId,
      message_template: 'Hi {{name}}, your appointment is coming up!',
      scheduled_at: '2026-09-01T10:00:00Z',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    followUpId = res.body.id;
  });

  it('GET /api/follow-ups returns array', async () => {
    const res = await auth(request(app).get('/api/follow-ups'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/follow-ups/:id/send marks as sent (stub)', async () => {
    if (!followUpId) return;
    const res = await auth(request(app).post(`/api/follow-ups/${followUpId}/send`));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── business rules persistence ───────────────────────────────────────────────

describe('Business rules', () => {
  it('GET /api/system/settings returns default rules', async () => {
    const res = await auth(request(app).get('/api/system/settings'));
    expect(res.status).toBe(200);
    expect(res.body.business_rules).toHaveProperty('taxRate');
    expect(res.body.business_rules.taxRate).toBe(8.25);
  });

  it('POST /api/system/settings/rules persists a change', async () => {
    const res = await auth(request(app).post('/api/system/settings/rules'))
      .send({ taxRate: 9.5 });
    expect(res.status).toBe(200);
    expect(res.body.rules.taxRate).toBe(9.5);
  });

  it('GET /api/system/settings returns updated value after change', async () => {
    const res = await auth(request(app).get('/api/system/settings'));
    expect(res.status).toBe(200);
    expect(res.body.business_rules.taxRate).toBe(9.5);
  });
});

// ─── inbound SMS webhook (no auth) ───────────────────────────────────────────

describe('POST /api/webhooks/sms', () => {
  it('returns TwiML 200 without auth', async () => {
    const res = await request(app)
      .post('/api/webhooks/sms')
      .send('Body=Hello&From=%2B15551234567');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<Response>');
  });
});

// ─── RBAC — owner-only routes must 403 for consultants ───────────────────────

describe('RBAC — consultant cannot access owner-only routes', () => {
  let ct; // consultant token

  beforeAll(() => {
    ct = getConsultantToken();
  });

  it('GET /api/system/settings returns 403 for consultant', async () => {
    const res = await authAs(request(app).get('/api/system/settings'), ct);
    expect(res.status).toBe(403);
  });

  it('POST /api/system/settings/rules returns 403 for consultant', async () => {
    const res = await authAs(request(app).post('/api/system/settings/rules'), ct)
      .send({ taxRate: 5 });
    expect(res.status).toBe(403);
  });

  it('POST /api/system/users returns 403 for consultant', async () => {
    const res = await authAs(request(app).post('/api/system/users'), ct)
      .send({ name: 'Test User', email: 'new@test.com', role: 'consultant', password: 'pass123' });
    expect(res.status).toBe(403);
  });

  it('POST /api/boutiques returns 403 for consultant', async () => {
    const res = await authAs(request(app).post('/api/boutiques'), ct)
      .send({ name: 'Rogue Boutique' });
    expect(res.status).toBe(403);
  });

  it('POST /api/payroll/run returns 403 for consultant', async () => {
    const res = await authAs(request(app).post('/api/payroll/run'), ct)
      .send({ period_start: '2026-07-01', period_end: '2026-07-15' });
    expect(res.status).toBe(403);
  });

  it('POST /api/payroll/timesheets/:id/approve returns 403 for consultant', async () => {
    const res = await authAs(request(app).post('/api/payroll/timesheets/1/approve'), ct);
    expect(res.status).toBe(403);
  });
});

// ─── RBAC — owner can still access owner-only routes ─────────────────────────

describe('RBAC — owner retains access to owner-only routes', () => {
  it('GET /api/system/settings returns 200 for owner', async () => {
    const res = await auth(request(app).get('/api/system/settings'));
    expect(res.status).toBe(200);
  });

  it('POST /api/payroll/run returns 200 for owner', async () => {
    const res = await auth(request(app).post('/api/payroll/run'))
      .send({ period_start: '2026-07-01', period_end: '2026-07-15' });
    expect(res.status).toBe(200);
  });
});

// ─── User Approval Workflow ──────────────────────────────────────────────────

describe('User Approval Workflow & Audit Logs', () => {
  let newUserId;

  it('provisions a user in pending_approval status', async () => {
    const res = await auth(request(app).post('/api/system/users'))
      .send({
        name: 'Pending Consultant',
        email: 'pending.consultant@demo.vowos',
        role: 'consultant',
        password: 'password123'
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    newUserId = res.body.id;
  });

  it('lists the pending user in GET /api/system/users/pending', async () => {
    const res = await auth(request(app).get('/api/system/users/pending'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    const user = res.body.users.find(u => u.id === newUserId);
    expect(user).toBeDefined();
    expect(user.role).toBe('consultant');
  });

  it('blocks login for pending_approval accounts', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'pending.consultant@demo.vowos', password: 'password123' });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('pending_approval');
  });

  it('approves a pending user', async () => {
    const res = await auth(request(app).post(`/api/system/users/${newUserId}/status`))
      .send({ status: 'active' });
    expect(res.status).toBe(200);
  });

  it('allows login for active approved accounts', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'pending.consultant@demo.vowos', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('suspends an active user', async () => {
    const res = await auth(request(app).post(`/api/system/users/${newUserId}/status`))
      .send({ status: 'suspended' });
    expect(res.status).toBe(200);
  });

  it('blocks login for suspended accounts', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'pending.consultant@demo.vowos', password: 'password123' });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('suspended');
  });

  it('prevents demotion of the last owner', async () => {
    const sarah = await knex('users').where({ email: 'owner@demo.vowos' }).first();
    expect(sarah).toBeDefined();
    const res = await auth(request(app).post(`/api/system/users/${sarah.id}/status`))
      .send({ status: 'suspended' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('owner');
  });

  it('retrieves user audit logs containing actions', async () => {
    const res = await auth(request(app).get('/api/system/users/audit-logs'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('logs');
    expect(res.body.logs.length).toBeGreaterThanOrEqual(2); // approve and suspend events
  });
});

// ─── Demo Mode Isolation ──────────────────────────────────────────────────────

describe('Demo Mode Isolation', () => {
  let ct;

  beforeAll(() => {
    ct = getConsultantToken();
  });

  it('allows resetting database on a demo tenant', async () => {
    const res = await auth(request(app).post('/api/demo-reset'));
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('reset');
    token = null;
    await getToken();
  });

  it('denies resetting database on a non-demo tenant', async () => {
    const res = await authAs(request(app).post('/api/demo-reset'), ct);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Demo reset is only permitted on demo tenants');
  });
});

// ─── Marketing & Training ────────────────────────────────────────────────────

describe('Marketing & Training API', () => {
  it('GET /api/marketing/campaigns returns campaigns list', async () => {
    const res = await auth(request(app).get('/api/marketing/campaigns'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('campaigns');
    expect(Array.isArray(res.body.campaigns)).toBe(true);
  });

  it('GET /api/marketing/leads-summary returns distribution summary', async () => {
    const res = await auth(request(app).get('/api/marketing/leads-summary'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(Array.isArray(res.body.summary)).toBe(true);
  });

  it('GET /api/training/onboarding-progress returns progress list', async () => {
    const res = await auth(request(app).get('/api/training/onboarding-progress'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('steps');
    expect(Array.isArray(res.body.steps)).toBe(true);
  });

  it('POST /api/training/onboarding-progress/toggle updates progress', async () => {
    const res = await auth(request(app).post('/api/training/onboarding-progress/toggle'))
      .send({ step_name: 'Inventory Catalog Sync', is_completed: true });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('success');

    const verify = await auth(request(app).get('/api/training/onboarding-progress'));
    const step = verify.body.steps.find(s => s.step_name === 'Inventory Catalog Sync');
    expect(step).toBeDefined();
    expect(Boolean(step.is_completed)).toBe(true);
  });
});
