import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyShopifyWebhookHmac, resolveShopifyTenant } from '../routes';
import { validateTwilioWebhookSignature, resolveCustomerAndBusiness } from '../../communications/routes';

// ============================================================================
// STUB DB IMPLEMENTATION FOR ADVERSARIAL TESTING
// ============================================================================
function createStubDb(initialTables: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = {};
  for (const [k, v] of Object.entries(initialTables)) {
    tables[k] = JSON.parse(JSON.stringify(v));
  }

  const db: any = {
    _tables: tables,
    from(tableName: string) {
      if (!tables[tableName]) {
        tables[tableName] = [];
      }

      let currentRows = [...tables[tableName]];
      let selectedFields: string[] | null = null;
      let orderField: string | null = null;
      let orderAsc: boolean = true;
      let limitCount: number | null = null;

      const chain: any = {
        select(fields = '*') {
          if (fields !== '*') {
            selectedFields = fields.split(',').map((f: string) => f.trim());
          }
          return chain;
        },
        eq(col: string, val: any) {
          currentRows = currentRows.filter((r: any) => r[col] === val);
          return chain;
        },
        in(col: string, vals: any[]) {
          currentRows = currentRows.filter((r: any) => vals.includes(r[col]));
          return chain;
        },
        ilike(col: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          currentRows = currentRows.filter((r: any) => String(r[col] ?? '').toLowerCase().includes(needle));
          return chain;
        },
        order(field: string, opts?: { ascending?: boolean }) {
          orderField = field;
          orderAsc = opts?.ascending !== false;
          currentRows.sort((a: any, b: any) => {
            if (a[field] < b[field]) return orderAsc ? -1 : 1;
            if (a[field] > b[field]) return orderAsc ? 1 : -1;
            return 0;
          });
          return chain;
        },
        limit(n: number) {
          limitCount = n;
          currentRows = currentRows.slice(0, n);
          return chain;
        },
        async maybeSingle() {
          const item = currentRows[0] ?? null;
          return { data: item ? { ...item } : null, error: null };
        },
        async single() {
          const item = currentRows[0] ?? null;
          return { data: item ? { ...item } : null, error: item ? null : new Error('Row not found') };
        },
        insert(payload: any) {
          const items = Array.isArray(payload) ? payload : [payload];
          const inserted: any[] = [];
          for (const item of items) {
            const row = { id: `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...item };
            tables[tableName].push(row);
            inserted.push(row);
          }
          return {
            select() {
              return {
                async single() {
                  return { data: { ...inserted[0] }, error: null };
                }
              };
            },
            async then(resolve: any) {
              return resolve({ data: inserted, error: null });
            }
          };
        },
        update(patch: any) {
          return {
            eq(col: string, val: any) {
              tables[tableName] = tables[tableName].map((r: any) => {
                if (r[col] === val) {
                  return { ...r, ...patch };
                }
                return r;
              });
              return Promise.resolve({ data: null, error: null });
            }
          };
        },
        async then(resolve: any) {
          return resolve({ data: currentRows, error: null });
        }
      };
      return chain;
    },
    functions: {
      async invoke(_name: string, _opts: any) {
        return { data: { ok: true }, error: null };
      }
    }
  };

  return db;
}

// ============================================================================
// SECTION 1: SHOPIFY HMAC-SHA256 RAW BUFFER VS STRINGIFIED JSON
// ============================================================================

test('HMAC-SHA256: preserves byte fidelity over raw buffer with custom formatting & whitespace', () => {
  const secret = 'shpss_adversarial_test_secret_9988';
  // Formatted JSON with 2-space indentation and trailing newline as sent over the wire by webhooks
  const rawWirePayload = Buffer.from(
    '{\n  "id": 987654321,\n  "email": "bride.jane@example.com",\n  "total_price": "2950.00",\n  "line_items": [\n    {\n      "title": "Bridal VIP Consultation",\n      "properties": [\n        {"name": "Date", "value": "2026-09-15"},\n        {"name": "Time", "value": "2:00 PM"},\n        {"name": "Store", "value": "ido-br"}\n      ]\n    }\n  ]\n}\n',
    'utf8'
  );

  // Correct HMAC computed by Shopify over exact raw bytes
  const wireHmac = crypto.createHmac('sha256', secret).update(rawWirePayload).digest('base64');

  // 1. Raw buffer passes verification
  const rawResult = verifyShopifyWebhookHmac(rawWirePayload, wireHmac, secret);
  assert.equal(rawResult, true, 'Raw buffer must pass HMAC verification');

  // 2. Re-stringified JSON loses indentation/formatting; signature computed against re-stringified payload diverges
  const parsed = JSON.parse(rawWirePayload.toString('utf8'));
  const restringified = JSON.stringify(parsed);
  const restringifiedHmac = crypto.createHmac('sha256', secret).update(restringified).digest('base64');

  assert.notEqual(restringifiedHmac, wireHmac, 'Re-stringified JSON produces different digest than raw formatted buffer');

  // 3. Passing re-stringified JSON to verify with original wireHmac MUST FAIL
  const failResult = verifyShopifyWebhookHmac(restringified, wireHmac, secret);
  assert.equal(failResult, false, 'Re-stringified JSON must fail verification against wire signature');
});

test('HMAC-SHA256: key reordering differences cause verification failure if not using raw buffer', () => {
  const secret = 'shpss_reorder_test_secret_1122';
  const originalJson = '{"z_order": 1, "a_customer": "Alice", "m_price": 500}';
  const reorderedJson = '{"a_customer": "Alice", "m_price": 500, "z_order": 1}';

  const originalHmac = crypto.createHmac('sha256', secret).update(originalJson).digest('base64');

  assert.equal(verifyShopifyWebhookHmac(Buffer.from(originalJson, 'utf8'), originalHmac, secret), true);
  assert.equal(verifyShopifyWebhookHmac(Buffer.from(reorderedJson, 'utf8'), originalHmac, secret), false);
});

test('HMAC-SHA256: multi-byte UTF-8 characters and emojis compute accurately', () => {
  const secret = 'shpss_utf8_secret_5566';
  const unicodePayload = Buffer.from(
    JSON.stringify({
      customer: 'Renée Noémie François 👰💍',
      notes: 'Mariée célébration — €5,000.00'
    }),
    'utf8'
  );

  const validHmac = crypto.createHmac('sha256', secret).update(unicodePayload).digest('base64');
  assert.equal(verifyShopifyWebhookHmac(unicodePayload, validHmac, secret), true);

  // Single UTF-8 char corruption (e.g. replace é with e)
  const corruptedPayload = Buffer.from(
    JSON.stringify({
      customer: 'Renee Noemie Francois 👰💍',
      notes: 'Mariée célébration — €5,000.00'
    }),
    'utf8'
  );
  assert.equal(verifyShopifyWebhookHmac(corruptedPayload, validHmac, secret), false);
});

// ============================================================================
// SECTION 2: CONSTANT-TIME TIMING-SAFE VERIFICATION & MALFORMED SIGNATURES
// ============================================================================

test('Constant-Time Comparison: rejects forged, truncated, and single-bit altered signatures safely', () => {
  const secret = 'shpss_constant_time_secret_7788';
  const payload = Buffer.from('{"order_id": 445566, "status": "paid"}', 'utf8');
  const validHmac = crypto.createHmac('sha256', secret).update(payload).digest('base64');

  // 1. Truncated signature (shorter length)
  const truncatedSig = validHmac.slice(0, 16);
  assert.equal(verifyShopifyWebhookHmac(payload, truncatedSig, secret), false, 'Truncated signature rejected without throwing');

  // 2. Single character alteration (tampered HMAC)
  const chars = validHmac.split('');
  chars[0] = chars[0] === 'A' ? 'B' : 'A';
  const tamperedSig = chars.join('');
  assert.equal(verifyShopifyWebhookHmac(payload, tamperedSig, secret), false, 'Single char flip rejected');

  // 3. Non-base64 characters / invalid format
  assert.equal(verifyShopifyWebhookHmac(payload, '!!!@@@###$$$%%%^^^&&&***', secret), false, 'Invalid chars rejected');
  assert.equal(verifyShopifyWebhookHmac(payload, '', secret), false, 'Empty signature rejected');
  assert.equal(verifyShopifyWebhookHmac(payload, undefined, secret), false, 'Undefined signature rejected');
  assert.equal(verifyShopifyWebhookHmac(undefined, validHmac, secret), false, 'Undefined payload rejected');
  assert.equal(verifyShopifyWebhookHmac(payload, validHmac, undefined), false, 'Undefined secret rejected');
  assert.equal(verifyShopifyWebhookHmac(payload, validHmac, ''), false, 'Empty secret rejected');
});

test('Constant-Time Comparison: rejects extended base64 signatures with trailing characters', () => {
  const secret = 'shpss_vuln_secret_1234';
  const payload = Buffer.from('{"test": true}', 'utf8');
  const validHmac = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  const extendedSig = validHmac + '==extra_trailing_data';

  // Hardened implementation in shopify/routes.ts compares UTF-8 buffers of the base64 digests
  // which strictly rejects extended signatures with trailing data
  const currentResult = verifyShopifyWebhookHmac(payload, extendedSig, secret);
  assert.equal(currentResult, false, 'Hardened implementation strictly rejects extended signatures with trailing data');
});

// ============================================================================
// SECTION 3: TWILIO SIGNATURE CALCULATION, PARAM SORTING & URL PERMUTATIONS
// ============================================================================

function generateTwilioHmac(authToken: string, url: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) {
    data += k + (params[k] !== undefined && params[k] !== null ? String(params[k]) : '');
  }
  return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
}

test('Twilio Signature: verifies alphabetical key sorting invariant with arbitrary param order', () => {
  const authToken = 'tw_secret_token_abcdef123456';
  const url = 'https://vowos.bridgebox.ai/api/communications/twilio-webhook';

  // Intentionally unsorted keys
  const unsortedParams = {
    Zebra: 'last',
    From: '+12255550101',
    Body: 'Testing Twilio Sorting',
    AccountSid: 'AC1234567890abcdef',
    MessageSid: 'SM998877',
    Apple: 'first',
    To: '+12255550199'
  };

  const expectedSig = generateTwilioHmac(authToken, url, unsortedParams);
  const isValid = validateTwilioWebhookSignature(authToken, expectedSig, url, unsortedParams);
  assert.equal(isValid, true, 'Must correctly validate with unsorted parameters');

  // Verify that parameter value tampering is rejected
  const tamperedParams = { ...unsortedParams, Body: 'Tampered Body Content' };
  assert.equal(validateTwilioWebhookSignature(authToken, expectedSig, url, tamperedParams), false);
});

test('Twilio Signature: handles URL query params, trailing slashes, and port permutations', () => {
  const authToken = 'tw_secret_token_abcdef123456';
  const baseUrlWithQuery = 'https://vowos.bridgebox.ai/api/communications/twilio-webhook?store_id=ido-br&env=production';
  const params = { From: '+12255550101', Body: 'Appointment confirmed', MessageSid: 'SM1122' };

  const validSig = generateTwilioHmac(authToken, baseUrlWithQuery, params);
  assert.equal(validateTwilioWebhookSignature(authToken, validSig, baseUrlWithQuery, params), true);

  // Altered protocol (http vs https)
  const httpUrl = 'http://vowos.bridgebox.ai/api/communications/twilio-webhook?store_id=ido-br&env=production';
  assert.equal(validateTwilioWebhookSignature(authToken, validSig, httpUrl, params), false, 'HTTP vs HTTPS mismatch rejected');

  // Altered path
  const alteredPath = 'https://vowos.bridgebox.ai/api/communications/twilio-webhook-alt';
  assert.equal(validateTwilioWebhookSignature(authToken, validSig, alteredPath, params), false, 'Path mismatch rejected');
});

test('Twilio Signature: handles empty strings, null, undefined in parameters', () => {
  const authToken = 'tw_secret_token_abcdef123456';
  const url = 'https://vowos.bridgebox.ai/api/communications/twilio-webhook';
  const paramsWithNulls = {
    From: '+12255550101',
    Body: 'Hello',
    OptionalField: null,
    EmptyField: '',
    UndefinedField: undefined
  };

  const validSig = generateTwilioHmac(authToken, url, paramsWithNulls);
  assert.equal(validateTwilioWebhookSignature(authToken, validSig, url, paramsWithNulls), true);
});

// ============================================================================
// SECTION 4: IDEMPOTENCY HANDLING & DATABASE DEDUPLICATION STRESS HARNESS
// ============================================================================

async function simulateShopifyWebhookDelivery(db: any, orderPayload: any, shopDomain: string) {
  const externalOrderId = String(orderPayload.id);

  // 1. Resolve tenant
  const tenant = await resolveShopifyTenant(db, shopDomain, orderPayload.storeKey);
  const { businessId, locationId, businessName, boutiqueEmail } = tenant;

  // 2. IDEMPOTENCY CHECK
  const { data: existingOrder } = await db
    .from('orders')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('external_order_id', externalOrderId)
    .maybeSingle();

  if (existingOrder) {
    await db
      .from('orders')
      .update({
        status: orderPayload.financial_status || existingOrder.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingOrder.id);

    return {
      status: 200,
      body: { success: true, duplicate: true, orderId: existingOrder.id }
    };
  }

  // 3. Customer upsert
  const email = (orderPayload.email || orderPayload.customer?.email || '').trim().toLowerCase();
  const phone = orderPayload.phone || orderPayload.customer?.phone;
  const name = `${orderPayload.customer?.first_name || ''} ${orderPayload.customer?.last_name || ''}`.trim() || 'Shopify Customer';
  const totalCents = Math.round(parseFloat(orderPayload.total_price || '0') * 100);

  let customerId = '';
  const { data: existingCust } = await db
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .ilike('email', email)
    .maybeSingle();

  if (existingCust) {
    customerId = existingCust.id;
  } else {
    const { data: newCust } = await db
      .from('customers')
      .insert({ name, email, phone, business_id: businessId, location_id: locationId })
      .select('id')
      .single();
    customerId = newCust.id;
  }

  // 4. Record order
  const { data: newOrder } = await db
    .from('orders')
    .insert({
      business_id: businessId,
      location_id: locationId,
      customer_id: customerId,
      external_order_id: externalOrderId,
      source_type: 'SHOPIFY',
      total_cents: totalCents,
      status: orderPayload.financial_status || 'paid'
    })
    .select('id')
    .single();

  // 5. Create appointment request
  const { data: apptData } = await db
    .from('appointment_requests')
    .insert({
      customer_id: customerId,
      business_id: businessId,
      preferred_location_id: locationId,
      intake_source: 'Shopify Storefront',
      preferred_date_1: '2026-09-20',
      preferred_window_1: '2:00 PM',
      status: 'submitted',
      priority: 'normal',
      notes: `Bridal Appointment | Shopify Order #${externalOrderId}`
    })
    .select('id')
    .single();

  // 6. Create lead
  await db.from('leads').insert({
    business_id: businessId,
    location_id: locationId,
    name,
    email,
    source: 'Shopify Storefront',
    budget_cents: 300000,
    wedding_date: '2026-09-20',
    stage: 'Appointment Set'
  });

  // 7. Message record
  await db.from('messages').insert({
    business_id: businessId,
    location_id: locationId,
    customer_id: customerId,
    sender: 'Shopify Storefront',
    content: `New appointment booked by ${name}`,
    channel: 'email',
    status: 'sent',
    direction: 'outbound',
    sent_at: new Date().toISOString()
  });

  return {
    status: 200,
    body: { success: true, orderId: newOrder?.id || externalOrderId, customerId, appointmentRequestId: apptData?.id }
  };
}

async function simulateTwilioWebhookDelivery(db: any, twilioBody: any) {
  const { From, To, Body, MessageSid } = twilioBody;

  // 1. Idempotency Check
  if (MessageSid) {
    const { data: existing } = await db
      .from('messages')
      .select('id')
      .eq('external_id', MessageSid)
      .maybeSingle();

    if (existing) {
      return { status: 200, duplicate: true, xml: '<Response></Response>' };
    }
  }

  // 2. Resolve customer & business
  const { customerId, customerName, businessId, locationId } = await resolveCustomerAndBusiness(db, From, To);

  // 3. Insert inbound message
  await db.from('messages').insert({
    business_id: businessId,
    location_id: locationId,
    customer_id: customerId,
    customer: customerName,
    sender: customerName || 'Customer',
    content: Body,
    body: Body,
    channel: 'sms',
    direction: 'inbound',
    status: 'received',
    external_id: MessageSid || null,
    to_address: To || null,
    sent_at: new Date().toISOString()
  });

  return { status: 200, duplicate: false, xml: '<Response></Response>' };
}

test('Idempotency Stress: 50 duplicate Shopify order deliveries produce exactly 1 record in each table', async () => {
  const db = createStubDb({
    business_sites: [{ business_id: 'biz-proper-001', domain: 'properandcompany.myshopify.com' }],
    businesses: [{ id: 'biz-proper-001', name: 'Proper & Company' }],
    locations: [{ id: 'loc-proper-001', business_id: 'biz-proper-001', name: 'Proper Baton Rouge' }],
    customers: [],
    orders: [],
    appointment_requests: [],
    leads: [],
    messages: []
  });

  const orderPayload = {
    id: 700101,
    order_number: 1001,
    email: 'chloe.dupont@example.com',
    total_price: '3500.00',
    financial_status: 'paid',
    customer: {
      first_name: 'Chloe',
      last_name: 'Dupont',
      email: 'chloe.dupont@example.com',
      phone: '+12255551234'
    },
    line_items: [
      {
        title: 'Couture Fitting Appointment',
        properties: [{ name: 'Store', value: 'pc-cov' }]
      }
    ]
  };

  // First delivery
  const firstRes = await simulateShopifyWebhookDelivery(db, orderPayload, 'properandcompany.myshopify.com');
  assert.equal(firstRes.status, 200);
  assert.equal(firstRes.body.success, true);
  assert.equal(firstRes.body.duplicate, undefined);

  // Subsequent 49 duplicate deliveries (including status update)
  for (let i = 2; i <= 50; i++) {
    const updatedPayload = { ...orderPayload, financial_status: i % 2 === 0 ? 'paid' : 'authorized' };
    const dupRes = await simulateShopifyWebhookDelivery(db, updatedPayload, 'properandcompany.myshopify.com');
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.success, true);
    assert.equal(dupRes.body.duplicate, true);
  }

  // Strict Invariant Assertions:
  assert.equal(db._tables.customers.length, 1, 'Exactly 1 customer record created');
  assert.equal(db._tables.orders.length, 1, 'Exactly 1 order record created');
  assert.equal(db._tables.appointment_requests.length, 1, 'Exactly 1 appointment_request created');
  assert.equal(db._tables.leads.length, 1, 'Exactly 1 lead created');
  assert.equal(db._tables.messages.length, 1, 'Exactly 1 email notification message created');
});

test('Idempotency Stress: 50 duplicate Twilio MessageSid deliveries produce exactly 1 record in messages table', async () => {
  const db = createStubDb({
    businesses: [{ id: 'biz-ido-001', name: 'I Do Bridal Couture' }],
    locations: [{ id: 'loc-ido-001', business_id: 'biz-ido-001', name: 'Baton Rouge Boutique' }],
    customers: [
      {
        id: 'cust-sarah-001',
        name: 'Sarah Connor',
        phone: '+12255559876',
        business_id: 'biz-ido-001',
        location_id: 'loc-ido-001'
      }
    ],
    messages: []
  });

  const twilioPayload = {
    From: '+12255559876',
    To: '+12255550000',
    Body: 'I will be there at 2 PM!',
    MessageSid: 'SM_unique_sid_555444333222'
  };

  // First delivery
  const firstRes = await simulateTwilioWebhookDelivery(db, twilioPayload);
  assert.equal(firstRes.status, 200);
  assert.equal(firstRes.duplicate, false);

  // 49 duplicate replays
  for (let i = 2; i <= 50; i++) {
    const dupRes = await simulateTwilioWebhookDelivery(db, twilioPayload);
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.duplicate, true);
  }

  // Strict Invariant: Exactly 1 message record in messages table
  assert.equal(db._tables.messages.length, 1, 'Exactly 1 inbound message created in messages table');
  const storedMsg = db._tables.messages[0];
  assert.equal(storedMsg.external_id, 'SM_unique_sid_555444333222');
  assert.equal(storedMsg.customer_id, 'cust-sarah-001');
  assert.equal(storedMsg.business_id, 'biz-ido-001');
  assert.equal(storedMsg.direction, 'inbound');
  assert.equal(storedMsg.status, 'received');
});

test('Multi-Tenant Isolation: Same external_order_id across different businesses creates distinct records', async () => {
  const db = createStubDb({
    business_sites: [
      { business_id: 'biz-ido-uuid', domain: 'idobridal.myshopify.com' },
      { business_id: 'biz-proper-uuid', domain: 'properandcompany.myshopify.com' }
    ],
    businesses: [
      { id: 'biz-ido-uuid', name: 'I Do Bridal Couture' },
      { id: 'biz-proper-uuid', name: 'Proper & Company' }
    ],
    locations: [
      { id: 'loc-ido-uuid', business_id: 'biz-ido-uuid', name: 'I Do BR' },
      { id: 'loc-proper-uuid', business_id: 'biz-proper-uuid', name: 'Proper BR' }
    ],
    customers: [],
    orders: [],
    appointment_requests: [],
    leads: [],
    messages: []
  });

  const sharedOrderIdPayload = {
    id: 99999,
    email: 'cross.tenant@example.com',
    total_price: '1500.00',
    customer: { first_name: 'Cross', last_name: 'Tenant', email: 'cross.tenant@example.com' }
  };

  // Delivery to Store 1 (I Do Bridal)
  const res1 = await simulateShopifyWebhookDelivery(db, sharedOrderIdPayload, 'idobridal.myshopify.com');
  assert.equal(res1.status, 200);

  // Delivery to Store 2 (Proper & Co) with same Shopify order ID #99999
  const res2 = await simulateShopifyWebhookDelivery(db, sharedOrderIdPayload, 'properandcompany.myshopify.com');
  assert.equal(res2.status, 200);

  // Invariant: Both tenants must have their own order record isolated by business_id
  assert.equal(db._tables.orders.length, 2, '2 distinct orders created across 2 tenants');
  assert.equal(db._tables.orders[0].business_id, 'biz-ido-uuid');
  assert.equal(db._tables.orders[1].business_id, 'biz-proper-uuid');
});
