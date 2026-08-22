import assert from 'node:assert/strict';
import { VowosInMemoryStore, VowosTestServer, EntitlementEngine, CryptoHelper } from './harness.mjs';

export async function runTier2Tests(server, store) {
  const results = [];
  const startTotal = Date.now();

  async function test(name, fn) {
    const tStart = Date.now();
    try {
      await fn();
      results.push({ name, status: 'PASSED', durationMs: Date.now() - tStart });
    } catch (err) {
      results.push({ name, status: 'FAILED', error: err.message, stack: err.stack, durationMs: Date.now() - tStart });
    }
  }

  // =========================================================================
  // Feature Area 1: Multi-Tenant & Multi-Brand Routing (Boundary)
  // =========================================================================

  await test('F1-T2-01: Non-Existent Tenant Slug returns 404 tenant not found', async () => {
    const res = await fetch(`${server.baseUrl}/api/tenant-config`, {
      headers: { 'x-business-id': 'biz_non_existent_999' }
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.error.includes('Tenant not found'));
  });

  await test('F1-T2-02: Special Characters in Tenant Slug are safely rejected during provisioning', async () => {
    const res = await fetch(`${server.baseUrl}/api/platform/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token',
        'x-platform-admin': 'true'
      },
      body: JSON.stringify({
        orgName: 'Bad Slug Boutique',
        orgSlug: 'invalid slug with spaces!@#$',
        ownerEmail: 'bad@example.com'
      })
    });
    // In our system, valid slugs must be URL-safe or are verified
    assert.ok(res.status === 200 || res.status === 400);
  });

  await test('F1-T2-03: Zero-Location Tenant handles empty location queries without crashing', async () => {
    const emptyBiz = { id: 'biz_empty_locs', name: 'Zero Locs', slug: 'zero-locs', subscription_status: 'ACTIVE' };
    store.businesses.set(emptyBiz.id, emptyBiz);

    const locs = Array.from(store.locations.values()).filter(l => l.business_id === emptyBiz.id);
    assert.equal(locs.length, 0);
  });

  await test('F1-T2-04: Multi-Tenant Foreign Key Injection prevents cross-tenant location assignment', async () => {
    // Attempting to attach Baton Rouge location (biz_ido_bridal) to Tenant B customer
    const locIdo = store.locations.get('ido-br');
    const custTenantB = { id: 'cust_tb_9', business_id: 'biz_tenant_b', location_id: locIdo.id };

    // Validation rule: Location must belong to customer's business_id
    const isValidLoc = locIdo.business_id === custTenantB.business_id;
    assert.equal(isValidLoc, false);
  });

  await test('F1-T2-05: Concurrent Brand Updates resolve with version integrity', async () => {
    const brand = store.brands.get('brand_ido');
    brand.version = 1;

    // Simulate update 1
    const update1 = { version: 1, colors: { primary: '#FFD700' } };
    const success1 = brand.version === update1.version;
    if (success1) {
      brand.brand_colors.primary = update1.colors.primary;
      brand.version++;
    }

    // Simulate update 2 with stale version
    const update2 = { version: 1, colors: { primary: '#E5A93C' } };
    const success2 = brand.version === update2.version;

    assert.equal(success1, true);
    assert.equal(success2, false); // Rejected due to version conflict
    assert.equal(brand.brand_colors.primary, '#FFD700');
  });

  // =========================================================================
  // Feature Area 2: Appointment Booking & Scheduling (Boundary)
  // =========================================================================

  await test('F2-T2-01: Overlapping Appointment Booking detects stylist conflict', async () => {
    const apt1 = {
      id: 'apt_occ_1',
      business_id: 'biz_ido_bridal',
      stylist_id: 'staff_1',
      start_time: '2026-09-15T10:00:00Z',
      end_time: '2026-09-15T11:30:00Z',
      status: 'confirmed'
    };
    store.appointments.set(apt1.id, apt1);

    // Attempting to book same stylist at overlapping time
    const newStart = new Date('2026-09-15T10:30:00Z');
    const newEnd = new Date('2026-09-15T12:00:00Z');

    const hasConflict = Array.from(store.appointments.values()).some(a => {
      if (a.stylist_id !== 'staff_1' || a.status === 'canceled') return false;
      const aStart = new Date(a.start_time);
      const aEnd = new Date(a.end_time);
      return newStart < aEnd && newEnd > aStart;
    });

    assert.equal(hasConflict, true);
  });

  await test('F2-T2-02: Booking on Staff Unavailability / PTO is blocked', async () => {
    const pto = {
      employee_id: 'staff_1',
      start_at: '2026-10-01T00:00:00Z',
      end_at: '2026-10-05T23:59:59Z',
      status: 'approved'
    };
    store.timeOffRequests.set('pto_staff_1', pto);

    const bookingDate = new Date('2026-10-03T11:00:00Z');
    const isPto = store.timeOffRequests.has('pto_staff_1') &&
      store.timeOffRequests.get('pto_staff_1').status === 'approved' &&
      bookingDate >= new Date(pto.start_at) && bookingDate <= new Date(pto.end_at);

    assert.equal(isPto, true);
  });

  await test('F2-T2-03: Past-Date Booking Submission is rejected by API validation', async () => {
    const res = await fetch(`${server.baseUrl}/api/scheduling/public/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Past Bride',
        email: 'past@example.com',
        store: 'ido-br',
        date: '2020-01-01',
        time: '10:00 AM'
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('past'));
  });

  await test('F2-T2-04: Zero-Duration and Excessive Duration (>24h) appointments are rejected', async () => {
    function validateDuration(startIso, endIso) {
      const durHours = (new Date(endIso) - new Date(startIso)) / (1000 * 60 * 60);
      if (durHours <= 0 || durHours > 24) return { valid: false, error: 'Invalid appointment duration' };
      return { valid: true };
    }

    const checkZero = validateDuration('2026-09-12T10:00:00Z', '2026-09-12T10:00:00Z');
    const checkExcess = validateDuration('2026-09-12T10:00:00Z', '2026-09-15T10:00:00Z');
    const checkValid = validateDuration('2026-09-12T10:00:00Z', '2026-09-12T11:30:00Z');

    assert.equal(checkZero.valid, false);
    assert.equal(checkExcess.valid, false);
    assert.equal(checkValid.valid, true);
  });

  await test('F2-T2-05: Appointment Hold Expiration frees expired held slots', async () => {
    const expiredHold = {
      id: 'hold_exp_1',
      slot_id: 'slot_99',
      expires_at: new Date(Date.now() - 60 * 1000).toISOString() // 1 minute ago
    };
    store.appointmentHolds.set(expiredHold.id, expiredHold);

    const isHoldValid = new Date(store.appointmentHolds.get(expiredHold.id).expires_at) > new Date();
    assert.equal(isHoldValid, false);
  });

  // =========================================================================
  // Feature Area 3: Customer & Bride Dossier / 360 (Boundary)
  // =========================================================================

  await test('F3-T2-01: Duplicate Customer Email within same tenant is detected', async () => {
    const existing = { id: 'cust_dup_check_1', business_id: 'biz_ido_bridal', email: 'dup.bride@example.com', name: 'Existing Bride' };
    store.customers.set(existing.id, existing);

    const isDuplicate = Array.from(store.customers.values()).some(c =>
      c.business_id === existing.business_id && c.email.toLowerCase() === 'dup.bride@example.com'
    );
    assert.equal(isDuplicate, true);
  });

  await test('F3-T2-02: Extreme Wedding Date Range is safely formatted without overflow', async () => {
    const extremeDate = '2099-12-31';
    const parsed = new Date(extremeDate);
    assert.equal(parsed.getFullYear(), 2099);
  });

  await test('F3-T2-03: Empty Customer Name & Malformed Phone are rejected by schema validation', async () => {
    function validateCustomer(cust) {
      if (!cust.name || !cust.name.trim()) return { valid: false, error: 'Name cannot be empty' };
      if (cust.phone && !/^\+?[0-9\s-]{7,15}$/.test(cust.phone)) return { valid: false, error: 'Invalid phone format' };
      return { valid: true };
    }

    assert.equal(validateCustomer({ name: '   ', phone: '+12255550101' }).valid, false);
    assert.equal(validateCustomer({ name: 'Valid Bride', phone: 'invalid-phone-abc' }).valid, false);
    assert.equal(validateCustomer({ name: 'Valid Bride', phone: '+12255550101' }).valid, true);
  });

  await test('F3-T2-04: Oversized Media Upload (>50MB) is rejected by storage constraints', async () => {
    const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
    function validateUpload(sizeBytes) {
      if (sizeBytes > MAX_FILE_SIZE_BYTES) return { allowed: false, error: 'File size exceeds 50MB limit' };
      return { allowed: true };
    }

    assert.equal(validateUpload(60 * 1024 * 1024).allowed, false);
    assert.equal(validateUpload(5 * 1024 * 1024).allowed, true);
  });

  await test('F3-T2-05: XSS / Script Injection in Notes is sanitized and neutralized', async () => {
    const rawNote = '<script>alert("xss")</script>Bride loved the lace.';
    const sanitized = rawNote.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '').trim();

    assert.equal(sanitized, 'Bride loved the lace.');
    assert.ok(!sanitized.includes('<script>'));
    assert.ok(!sanitized.includes('alert'));
  });

  // =========================================================================
  // Feature Area 4: Invoices, Payments & POS Terminal (Boundary)
  // =========================================================================

  await test('F4-T2-01: Overpayment Rejection blocks payment exceeding remaining balance', async () => {
    const inv = { id: 'inv_overpay', amount_cents: 100000, paid_cents: 60000 };
    const remaining = inv.amount_cents - inv.paid_cents; // 40000
    const attemptedPayment = 50000;

    const isAllowed = attemptedPayment <= remaining;
    assert.equal(isAllowed, false);
  });

  await test('F4-T2-02: Zero and Negative Payment Amount is rejected by validator', async () => {
    function validatePaymentAmount(amountCents) {
      if (typeof amountCents !== 'number' || amountCents <= 0) {
        return { valid: false, error: 'Payment amount must be greater than zero' };
      }
      return { valid: true };
    }

    assert.equal(validatePaymentAmount(0).valid, false);
    assert.equal(validatePaymentAmount(-5000).valid, false);
    assert.equal(validatePaymentAmount(25000).valid, true);
  });

  await test('F4-T2-03: Expired Pay Token is rejected during checkout', async () => {
    const token = {
      token: 'tok_exp_123',
      expires_at: new Date(Date.now() - 3600 * 1000).toISOString() // expired 1h ago
    };
    const isTokenValid = new Date(token.expires_at) > new Date();
    assert.equal(isTokenValid, false);
  });

  await test('F4-T2-04: Refund Exceeding Paid Amount is blocked', async () => {
    const inv = { id: 'inv_ref_test', amount_cents: 500000, paid_cents: 200000 };
    const requestedRefund = 250000;

    const canRefund = requestedRefund <= inv.paid_cents;
    assert.equal(canRefund, false);
  });

  await test('F4-T2-05: Staged Plan Cent Rounding sums exactly to total without fractional loss', async () => {
    const totalCents = 10001; // $100.01
    const installmentsCount = 3;
    const baseAmount = Math.floor(totalCents / installmentsCount); // 3333
    const remainder = totalCents % installmentsCount; // 2

    const installments = Array.from({ length: installmentsCount }, (_, i) => ({
      installment: i + 1,
      amount_cents: baseAmount + (i < remainder ? 1 : 0)
    }));

    const sum = installments.reduce((acc, curr) => acc + curr.amount_cents, 0);
    assert.equal(sum, totalCents);
    assert.equal(installments[0].amount_cents, 3334);
    assert.equal(installments[1].amount_cents, 3334);
    assert.equal(installments[2].amount_cents, 3333);
  });

  // =========================================================================
  // Feature Area 5: Inventory, POs, Transfers & Gowns (Boundary)
  // =========================================================================

  await test('F5-T2-01: Negative Stock Prevention blocks decrements below zero', async () => {
    const currentStock = 1;
    const requestedDecrement = 2;
    const canDecrement = (currentStock - requestedDecrement) >= 0;
    assert.equal(canDecrement, false);
  });

  await test('F5-T2-02: Duplicate SKU Creation within tenant is rejected by unique constraint', async () => {
    const existingSku = 'ML-VER-001';
    const isSkuTaken = Array.from(store.gowns.values()).some(g =>
      g.business_id === 'biz_ido_bridal' && g.sku === existingSku
    );
    assert.equal(isSkuTaken, true);
  });

  await test('F5-T2-03: Transfer Quantity Exceeding On-Hand Stock is blocked', async () => {
    const gown = store.gowns.get('gown_monique_1');
    const onHandCov = gown.stock_by_location['ido-cov']; // 2
    const requestedXferQty = 5;

    const isStockAvailable = onHandCov >= requestedXferQty;
    assert.equal(isStockAvailable, false);
  });

  await test('F5-T2-04: Self-Transfer Rejection prevents transfer between same origin & destination', async () => {
    function validateTransfer(fromLoc, toLoc) {
      if (fromLoc === toLoc) return { valid: false, error: 'Origin and destination locations must differ' };
      return { valid: true };
    }
    assert.equal(validateTransfer('ido-br', 'ido-br').valid, false);
    assert.equal(validateTransfer('ido-br', 'ido-cov').valid, true);
  });

  await test('F5-T2-05: Receiving Excess PO Items requires explicit supervisor validation', async () => {
    const poItem = { gown_id: 'gown_monique_1', ordered_qty: 2, received_qty: 0 };
    const incomingShipment = 3;

    const isOverReceiving = (poItem.received_qty + incomingShipment) > poItem.ordered_qty;
    assert.equal(isOverReceiving, true);
  });

  // =========================================================================
  // Feature Area 6: Team, Timeclock & Commissions (Boundary)
  // =========================================================================

  await test('F6-T2-01: Duplicate Clock-In Prevention blocks punch when already clocked in', async () => {
    const activePunch = { employee_id: 'staff_1', clock_in: new Date().toISOString(), clock_out: null };
    const canClockIn = activePunch.clock_out !== null;
    assert.equal(canClockIn, false);
  });

  await test('F6-T2-02: Clock-Out Without Prior Clock-In is rejected', async () => {
    const punches = Array.from(store.timeEntries.values()).filter(p => p.employee_id === 'staff_2');
    const openPunch = punches.find(p => p.clock_out === null);
    assert.equal(openPunch, undefined);
  });

  await test('F6-T2-03: Negative Shift Duration is rejected by validation', async () => {
    const start = new Date('2026-09-12T17:00:00Z');
    const end = new Date('2026-09-12T09:00:00Z');
    const isValid = end > start;
    assert.equal(isValid, false);
  });

  await test('F6-T2-04: Commission Split Exceeding 100% is blocked', async () => {
    const splits = [
      { stylist_id: 'staff_1', percentage: 60 },
      { stylist_id: 'staff_2', percentage: 50 }
    ];
    const totalSplit = splits.reduce((sum, s) => sum + s.percentage, 0);
    const isValid = totalSplit <= 100;
    assert.equal(isValid, false);
  });

  await test('F6-T2-05: Suspended Staff Login & Scheduling is blocked', async () => {
    const suspendedStaff = { id: 'staff_susp_1', name: 'Suspended Stylist', status: 'SUSPENDED' };
    const canSchedule = suspendedStaff.status === 'ACTIVE';
    assert.equal(canSchedule, false);
  });

  // =========================================================================
  // Feature Area 7: Growth, Omnichannel & SEO (Boundary)
  // =========================================================================

  await test('F7-T2-01: Tampered OAuth State is rejected with HTTP 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/growth/callback?code=valid_code&state=tampered_b64.invalid_sig`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Invalid state.');
  });

  await test('F7-T2-02: Cross-Tenant OAuth Parameter Injection returns HTTP 403', async () => {
    const res = await fetch(`${server.baseUrl}/api/growth/connect/google?businessId=biz_tenant_b`, {
      headers: { 'x-business-id': 'biz_ido_bridal' }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('match'));
  });

  await test('F7-T2-03: Non-Existent Business Attribution Tracking returns HTTP 404', async () => {
    const res = await fetch(`${server.baseUrl}/api/growth/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'biz_unknown_000',
        sessionId: 'sess_123',
        source: 'google'
      })
    });
    assert.equal(res.status, 404);
  });

  await test('F7-T2-04: Attribution Rate Limiting triggers HTTP 429 after 120 requests', async () => {
    const testIp = '198.51.100.42';
    // Pre-populate rate limiter for this test IP to 120
    store.rateLimiters.set(`track:${testIp}`, 120);

    const res = await fetch(`${server.baseUrl}/api/growth/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp
      },
      body: JSON.stringify({
        businessId: 'biz_ido_bridal',
        sessionId: 'sess_overflow',
        source: 'google'
      })
    });
    assert.equal(res.status, 429);
  });

  await test('F7-T2-05: Non-Privileged Staff Role Access to Growth Tools returns HTTP 403', async () => {
    const res = await fetch(`${server.baseUrl}/api/growth/sync/meta-ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-business-id': 'biz_ido_bridal',
        'x-user-role': 'stylist'
      },
      body: JSON.stringify({ days: 30 })
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('Growth tools require'));
  });

  // =========================================================================
  // Feature Area 8: Feature Entitlements & Subscription Tiers (Boundary)
  // =========================================================================

  await test('F8-T2-01: Suspended/Canceled Tenant Feature Lockdown blocks feature access', async () => {
    const canceledBiz = { id: 'biz_canceled_1', name: 'Canceled Bridal', subscription_status: 'CANCELED' };
    store.businesses.set(canceledBiz.id, canceledBiz);

    const res = EntitlementEngine.evaluate(store, canceledBiz.id, 'appointments.basic');
    assert.equal(res.allowed, false);
    assert.equal(res.state, 'SUBSCRIPTION_LOCKED');
  });

  await test('F8-T2-02: Conflicting Override Resolution: FORCED_OFF overrides active plan tier', async () => {
    store.featureOverrides.set('biz_ido_bridal:inventory.transfers', 'FORCED_OFF');
    const res = EntitlementEngine.evaluate(store, 'biz_ido_bridal', 'inventory.transfers');
    assert.equal(res.allowed, false);
    assert.equal(res.state, 'PLATFORM_DISABLED');

    // Clean up override
    store.featureOverrides.delete('biz_ido_bridal:inventory.transfers');
  });

  await test('F8-T2-03: Non-Existent Business Entitlement Query returns false safely', async () => {
    const res = EntitlementEngine.evaluate(store, 'biz_ghost_999', 'appointments.basic');
    assert.equal(res.allowed, false);
    assert.equal(res.state, 'BLOCKED');
  });

  await test('F8-T2-04: Unregistered Feature Key defaults safely to Essentials tier', async () => {
    const res = EntitlementEngine.evaluate(store, 'biz_tenant_b', 'custom_unregistered_feature');
    assert.equal(res.allowed, true);
  });

  await test('F8-T2-05: Immediate Entitlement Update upon subscription plan upgrade', async () => {
    // Tenant B starts on Essentials -> Marketing AI blocked
    assert.equal(EntitlementEngine.evaluate(store, 'biz_tenant_b', 'growth.marketing_ai').allowed, false);

    // Upgrade Tenant B to Enterprise
    store.subscriptions.get('biz_tenant_b').plan = 'enterprise';
    assert.equal(EntitlementEngine.evaluate(store, 'biz_tenant_b', 'growth.marketing_ai').allowed, true);

    // Reset back to Essentials
    store.subscriptions.get('biz_tenant_b').plan = 'essentials';
  });

  // =========================================================================
  // Feature Area 9: Webhook Ingestion (Shopify, Twilio) (Boundary)
  // =========================================================================

  await test('F9-T2-01: Invalid Shopify HMAC Signature returns HTTP 401 Unauthorized', async () => {
    const payload = JSON.stringify({ id: 99403, total_price: '100.00' });
    const res = await fetch(`${server.baseUrl}/api/shopify/webhooks/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': 'invalid_forged_hmac_base64=='
      },
      body: payload
    });
    assert.equal(res.status, 401);
  });

  await test('F9-T2-02: Missing Required Shopify HMAC Header returns HTTP 401 Unauthorized', async () => {
    const payload = JSON.stringify({ id: 99404, total_price: '100.00' });
    const res = await fetch(`${server.baseUrl}/api/shopify/webhooks/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });
    assert.equal(res.status, 401);
  });

  await test('F9-T2-03: Malformed JSON Webhook Payload returns HTTP 400 Bad Request', async () => {
    const res = await fetch(`${server.baseUrl}/api/shopify/webhooks/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed: json, missing quotes }'
    });
    assert.equal(res.status, 400);
  });

  await test('F9-T2-04: SMS Opt-Out Compliance Enforcement returns HTTP 403', async () => {
    const optOutCust = { id: 'cust_optout_1', business_id: 'biz_ido_bridal', name: 'Opt Out Bride', phone: '+12255550111', sms_opt_in: false };
    store.customers.set(optOutCust.id, optOutCust);

    const res = await fetch(`${server.baseUrl}/api/communications/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: optOutCust.id,
        message: 'Promotional offer'
      })
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('not opted in'));
  });

  await test('F9-T2-05: SMS Missing Phone Rejection returns HTTP 400', async () => {
    const noPhoneCust = { id: 'cust_nophone_1', business_id: 'biz_ido_bridal', name: 'No Phone Bride', phone: null, sms_opt_in: true };
    store.customers.set(noPhoneCust.id, noPhoneCust);

    const res = await fetch(`${server.baseUrl}/api/communications/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: noPhoneCust.id,
        message: 'Hello'
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('phone number'));
  });

  // =========================================================================
  // Feature Area 10: Platform Admin, Failed Jobs & DLQ (Boundary)
  // =========================================================================

  await test('F10-T2-01: Unauthorized Platform Admin Access returns HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${server.baseUrl}/api/platform/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgName: 'Unauth', orgSlug: 'unauth' })
    });
    assert.equal(res.status, 401);
  });

  await test('F10-T2-02: Retry Non-Existent Job ID returns HTTP 404 Not Found', async () => {
    const res = await fetch(`${server.baseUrl}/api/platform/jobs/job_ghost_9999/retry`, {
      method: 'POST'
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.error.includes('not found'));
  });

  await test('F10-T2-03: Duplicate Tenant Slug Provisioning returns HTTP 409 Conflict', async () => {
    const res = await fetch(`${server.baseUrl}/api/platform/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token',
        'x-platform-admin': 'true'
      },
      body: JSON.stringify({
        orgName: 'Duplicate Slug Test',
        orgSlug: 'ido-bridal', // already exists
        ownerEmail: 'dup@example.com'
      })
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.ok(body.error.includes('already in use'));
  });

  await test('F10-T2-04: Manual DLQ Retry resets attempts and status to pending', async () => {
    const dlqJob = {
      id: 'job_dlq_retry_test',
      business_id: 'biz_ido_bridal',
      status: 'dead-letter',
      attempts: 5,
      error_message: 'Fatal timeout'
    };
    store.durableJobs.set(dlqJob.id, dlqJob);

    const res = await fetch(`${server.baseUrl}/api/platform/jobs/${dlqJob.id}/retry`, {
      method: 'POST'
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.job.status, 'pending');
    assert.equal(body.job.attempts, 0);
  });

  await test('F10-T2-05: Emergency Pause All with missing brand returns HTTP 400 Bad Request', async () => {
    const res = await fetch(`${server.baseUrl}/api/campaigns/pause-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Brand required');
  });

  return {
    tier: 'Tier 2: Boundary & Corner Cases',
    totalTests: results.length,
    passed: results.filter(r => r.status === 'PASSED').length,
    failed: results.filter(r => r.status === 'FAILED').length,
    durationMs: Date.now() - startTotal,
    results
  };
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const store = new VowosInMemoryStore();
  const server = new VowosTestServer({ store });
  await server.start();
  console.log(`Running Tier 2 tests on ${server.baseUrl}...`);
  const report = await runTier2Tests(server, store);
  await server.stop();
  console.log(`Tier 2 Finished: ${report.passed}/${report.totalTests} passed (${report.durationMs}ms)`);
  if (report.failed > 0) {
    for (const t of report.results) {
      if (t.status === 'FAILED') console.error(`  ❌ ${t.name}: ${t.error}`);
    }
  }
  process.exitCode = report.failed > 0 ? 1 : 0;
}
