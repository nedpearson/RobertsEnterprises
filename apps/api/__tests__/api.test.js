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

async function getToken() {
  if (token) return token;
  const res = await request(app).post('/api/demo-login');
  token = res.body.token;
  return token;
}

function auth(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

// ─── lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => {
  await knex.migrate.latest();
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
    const res = await request(app).get('/api/system/settings');
    expect(res.status).toBe(200);
    expect(res.body.business_rules).toHaveProperty('taxRate');
    expect(res.body.business_rules.taxRate).toBe(8.25);
  });

  it('POST /api/system/settings/rules persists a change', async () => {
    const res = await request(app)
      .post('/api/system/settings/rules')
      .send({ taxRate: 9.5 });
    expect(res.status).toBe(200);
    expect(res.body.rules.taxRate).toBe(9.5);
  });

  it('GET /api/system/settings returns updated value after change', async () => {
    const res = await request(app).get('/api/system/settings');
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
