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
  let idSequence = 0;
  for (const [k, v] of Object.entries(initialTables)) {
    tables[k] = JSON.parse(JSON.stringify(v));
  }

  const readColumn = (row: any, column: string): unknown => {
    const jsonPath = column.match(/^([^>]+)->>(.+)$/);
    if (!jsonPath) return row[column];
    const [, root, key] = jsonPath;
    const value = row[root];
    return value && typeof value === 'object' ? value[key] : undefined;
  };

  const db: any = {
    _tables: tables,
    from(tableName: string) {
      if (!tables[tableName]) tables[tableName] = [];
      let currentRows = [...tables[tableName]];

      const chain: any = {
        select() {
          return chain;
        },
        eq(col: string, val: any) {
          currentRows = currentRows.filter((row: any) => readColumn(row, col) === val);
          return chain;
        },
        in(col: string, vals: any[]) {
          currentRows = currentRows.filter((row: any) => vals.includes(readColumn(row, col)));
          return chain;
        },
        ilike(col: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          currentRows = currentRows.filter((row: any) => String(readColumn(row, col) ?? '').toLowerCase().includes(needle));
          return chain;
        },
        order(field: string, opts?: { ascending?: boolean }) {
          const ascending = opts?.ascending !== false;
          currentRows.sort((a: any, b: any) => {
            const av = readColumn(a, field);
            const bv = readColumn(b, field);
            if (av === bv) return 0;
            if (av === undefined || av === null) return ascending ? -1 : 1;
            if (bv === undefined || bv === null) return ascending ? 1 : -1;
            return av < bv ? (ascending ? -1 : 1) : (ascending ? 1 : -1);
          });
          return chain;
        },
        limit(n: number) {
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
            idSequence += 1;
            const row = { id: `stub-id-${idSequence}`, ...item };
            tables[tableName].push(row);
            inserted.push(row);
          }
          return {
            select() {
              return {
                async single() {
                  return { data: { ...inserted[0] }, error: null };
                },
              };
            },
            async then(resolve: any) {
              return resolve({ data: inserted, error: null });
            },
          };
        },
        update(patch: any) {
          return {
            eq(col: string, val: any) {
              tables[tableName] = tables[tableName].map((row: any) =>
                readColumn(row, col) === val ? { ...row, ...patch } : row,
              );
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        async then(resolve: any) {
          return resolve({ data: currentRows, error: null });
        },
      };
      return chain;
    },
    functions: {
      async invoke() {
        return { data: { ok: true }, error: null };
      },
    },
  };

  return db;
}

function shopifyConnection(id: string, businessId: string, shopDomain: string) {
  return {
    id,
    business_id: businessId,
    provider: 'shopify',
    status: 'connected',
    external_account_id: `account-${id}`,
    display_name: shopDomain,
    metadata: { shopDomain },
  };
}

// ============================================================================
// SECTION 1: SHOPIFY HMAC-SHA256 RAW-BODY INTEGRITY
// ============================================================================
test('HMAC-SHA256: preserves byte fidelity over raw buffer with custom formatting and whitespace', () => {
  const secret = 'shpss_adversarial_test_secret_9988';
  const rawWirePayload = Buffer.from(
    '{\n  "id": 987654321,\n  "email": "bride.jane@example.com",\n  "total_price": "2950.00",\n  "line_items": [\n    {\n      "title": "Bridal VIP Consultation",\n      "properties": [\n        {"name": "Date", "value": "2026-09-15"},\n        {"name": "Time", "value": "2:00 PM"},\n        {"name": "Store", "value": "ido-br"}\n      ]\n    }\n  ]\n}\n',
    'utf8',
  );

  const wireHmac = crypto.createHmac('sha256', secret).update(rawWirePayload).digest('base64');
  assert.equal(verifyShopifyWebhookHmac(rawWirePayload, wireHmac, secret), true);

  const restringified = JSON.stringify(JSON.parse(rawWirePayload.toString('utf8')));
  assert.notEqual(crypto.createHmac('sha256', secret).update(restringified).digest('base64'), wireHmac);
  assert.equal(verifyShopifyWebhookHmac(restringified, wireHmac, secret), false);
});

test('HMAC-SHA256: key reordering differences fail against the original wire signature', () => {
  const secret = 'shpss_reorder_test_secret_1122';
  const original = '{"z_order": 1, "a_customer": "Alice", "m_price": 500}';
  const reordered = '{"a_customer": "Alice", "m_price": 500, "z_order": 1}';
  const signature = crypto.createHmac('sha256', secret).update(original).digest('base64');
  assert.equal(verifyShopifyWebhookHmac(Buffer.from(original), signature, secret), true);
  assert.equal(verifyShopifyWebhookHmac(Buffer.from(reordered), signature, secret), false);
});

test('HMAC-SHA256: multi-byte UTF-8 characters compute accurately', () => {
  const secret = 'shpss_utf8_secret_5566';
  const payload = Buffer.from(JSON.stringify({ customer: 'Renée Noémie François 👰💍', notes: 'Mariée célébration — €5,000.00' }));
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  assert.equal(verifyShopifyWebhookHmac(payload, signature, secret), true);
  const corrupted = Buffer.from(JSON.stringify({ customer: 'Renee Noemie Francois 👰💍', notes: 'Mariée célébration — €5,000.00' }));
  assert.equal(verifyShopifyWebhookHmac(corrupted, signature, secret), false);
});

test('Constant-Time Comparison: rejects malformed, truncated, altered, and extended signatures safely', () => {
  const secret = 'shpss_constant_time_secret_7788';
  const payload = Buffer.from('{"order_id":445566,"status":"paid"}');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  const altered = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;

  assert.equal(verifyShopifyWebhookHmac(payload, signature.slice(0, 16), secret), false);
  assert.equal(verifyShopifyWebhookHmac(payload, altered, secret), false);
  assert.equal(verifyShopifyWebhookHmac(payload, '!!!@@@###', secret), false);
  assert.equal(verifyShopifyWebhookHmac(payload, `${signature}==extra`, secret), false);
  assert.equal(verifyShopifyWebhookHmac(payload, '', secret), false);
  assert.equal(verifyShopifyWebhookHmac(payload, undefined, secret), false);
  assert.equal(verifyShopifyWebhookHmac(undefined, signature, secret), false);
  assert.equal(verifyShopifyWebhookHmac(payload, signature, undefined), false);
});

// ============================================================================
// SECTION 2: TWILIO SIGNATURE INTEGRITY
// ============================================================================
function generateTwilioHmac(authToken: string, url: string, params: Record<string, any>): string {
  let data = url;
  for (const key of Object.keys(params).sort()) {
    data += key + (params[key] !== undefined && params[key] !== null ? String(params[key]) : '');
  }
  return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf8')).digest('base64');
}

test('Twilio Signature: verifies sorted parameters and rejects body tampering', () => {
  const authToken = 'tw_secret_token_abcdef123456';
  const url = 'https://vowos.bridgebox.ai/api/communications/twilio-webhook';
  const params = {
    Zebra: 'last',
    From: '+12255550101',
    Body: 'Testing Twilio Sorting',
    AccountSid: 'AC1234567890abcdef',
    MessageSid: 'SM998877',
    Apple: 'first',
    To: '+12255550199',
  };
  const signature = generateTwilioHmac(authToken, url, params);
  assert.equal(validateTwilioWebhookSignature(authToken, signature, url, params), true);
  assert.equal(validateTwilioWebhookSignature(authToken, signature, url, { ...params, Body: 'Tampered' }), false);
});

test('Twilio Signature: URL permutations and null-like fields are handled exactly', () => {
  const authToken = 'tw_secret_token_abcdef123456';
  const url = 'https://vowos.bridgebox.ai/api/communications/twilio-webhook?store_id=ido-br&env=production';
  const params = { From: '+12255550101', Body: 'Appointment confirmed', OptionalField: null, EmptyField: '', UndefinedField: undefined };
  const signature = generateTwilioHmac(authToken, url, params);
  assert.equal(validateTwilioWebhookSignature(authToken, signature, url, params), true);
  assert.equal(validateTwilioWebhookSignature(authToken, signature, url.replace('https://', 'http://'), params), false);
});

// ============================================================================
// SECTION 3: IDEMPOTENCY AND TENANT ISOLATION STRESS HARNESS
// ============================================================================
async function simulateShopifyWebhookDelivery(db: any, orderPayload: any, shopDomain: string) {
  const externalOrderId = String(orderPayload.id);
  const tenant = await resolveShopifyTenant(db, shopDomain, orderPayload.storeKey);
  const { businessId, locationId } = tenant;

  const { data: existingOrder } = await db
    .from('orders')
    .select('id,status')
    .eq('business_id', businessId)
    .eq('external_order_id', externalOrderId)
    .maybeSingle();

  if (existingOrder) {
    await db.from('orders').update({ status: orderPayload.financial_status || existingOrder.status, updated_at: new Date().toISOString() }).eq('id', existingOrder.id);
    return { status: 200, body: { success: true, duplicate: true, orderId: existingOrder.id } };
  }

  const email = (orderPayload.email || orderPayload.customer?.email || '').trim().toLowerCase();
  const phone = orderPayload.phone || orderPayload.customer?.phone;
  const name = `${orderPayload.customer?.first_name || ''} ${orderPayload.customer?.last_name || ''}`.trim();
  const totalCents = Math.round(parseFloat(orderPayload.total_price || '0') * 100);

  let customerId = '';
  const { data: existingCustomer } = await db.from('customers').select('id').eq('business_id', businessId).ilike('email', email).maybeSingle();
  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer } = await db.from('customers').insert({ name, email, phone, business_id: businessId, location_id: locationId }).select('id').single();
    customerId = newCustomer.id;
  }

  const { data: newOrder } = await db.from('orders').insert({
    business_id: businessId,
    location_id: locationId,
    customer_id: customerId,
    external_order_id: externalOrderId,
    source_type: 'SHOPIFY',
    total_cents: totalCents,
    status: orderPayload.financial_status || 'paid',
  }).select('id').single();

  const { data: appointment } = await db.from('appointment_requests').insert({
    customer_id: customerId,
    business_id: businessId,
    preferred_location_id: locationId,
    intake_source: 'Shopify Storefront',
    preferred_date_1: '2026-09-20',
    preferred_window_1: '2:00 PM',
    status: 'submitted',
    priority: 'normal',
    notes: `Bridal Appointment | Shopify Order #${externalOrderId}`,
  }).select('id').single();

  await db.from('leads').insert({ business_id: businessId, location_id: locationId, name, email, source: 'Shopify Storefront', stage: 'Appointment Set' });
  await db.from('messages').insert({
    business_id: businessId,
    location_id: locationId,
    customer_id: customerId,
    sender: 'Shopify Storefront',
    content: `New appointment booked by ${name}`,
    channel: 'email',
    status: 'sent',
    direction: 'outbound',
    sent_at: new Date().toISOString(),
  });

  return { status: 200, body: { success: true, orderId: newOrder?.id || externalOrderId, customerId, appointmentRequestId: appointment?.id } };
}

async function simulateTwilioWebhookDelivery(db: any, twilioBody: any) {
  const { From, To, Body, MessageSid } = twilioBody;
  if (MessageSid) {
    const { data: existing } = await db.from('messages').select('id').eq('external_id', MessageSid).maybeSingle();
    if (existing) return { status: 200, duplicate: true, xml: '<Response></Response>' };
  }

  const { customerId, customerName, businessId, locationId } = await resolveCustomerAndBusiness(db, From, To);
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
    sent_at: new Date().toISOString(),
  });
  return { status: 200, duplicate: false, xml: '<Response></Response>' };
}

test('Idempotency Stress: 50 duplicate Shopify deliveries produce one record per downstream table', async () => {
  const db = createStubDb({
    growth_provider_connections: [shopifyConnection('proper', 'biz-proper-001', 'properandcompany.myshopify.com')],
    business_sites: [{ business_id: 'biz-proper-001', domain: 'properandcompany.myshopify.com', notification_email: 'proper@example.com' }],
    businesses: [{ id: 'biz-proper-001', name: 'Proper & Company' }],
    locations: [{ id: 'loc-proper-001', business_id: 'biz-proper-001', name: 'Proper Baton Rouge' }],
    customers: [], orders: [], appointment_requests: [], leads: [], messages: [],
  });

  const orderPayload = {
    id: 700101,
    order_number: 1001,
    email: 'chloe.dupont@example.com',
    total_price: '3500.00',
    financial_status: 'paid',
    customer: { first_name: 'Chloe', last_name: 'Dupont', email: 'chloe.dupont@example.com', phone: '+12255551234' },
  };

  const first = await simulateShopifyWebhookDelivery(db, orderPayload, 'properandcompany.myshopify.com');
  assert.equal(first.status, 200);
  assert.equal(first.body.duplicate, undefined);

  for (let i = 2; i <= 50; i += 1) {
    const duplicate = await simulateShopifyWebhookDelivery(db, { ...orderPayload, financial_status: i % 2 === 0 ? 'paid' : 'authorized' }, 'properandcompany.myshopify.com');
    assert.equal(duplicate.body.duplicate, true);
  }

  assert.equal(db._tables.customers.length, 1);
  assert.equal(db._tables.orders.length, 1);
  assert.equal(db._tables.appointment_requests.length, 1);
  assert.equal(db._tables.leads.length, 1);
  assert.equal(db._tables.messages.length, 1);
});

test('Idempotency Stress: 50 duplicate Twilio MessageSid deliveries produce one inbound message', async () => {
  const db = createStubDb({
    businesses: [{ id: 'biz-ido-001', name: 'I Do Bridal Couture' }],
    locations: [{ id: 'loc-ido-001', business_id: 'biz-ido-001', name: 'Baton Rouge Boutique' }],
    customers: [{ id: 'cust-sarah-001', name: 'Sarah Connor', phone: '+12255559876', business_id: 'biz-ido-001', location_id: 'loc-ido-001' }],
    messages: [],
  });
  const payload = { From: '+12255559876', To: '+12255550000', Body: 'I will be there at 2 PM!', MessageSid: 'SM_unique_sid_555444333222' };
  const first = await simulateTwilioWebhookDelivery(db, payload);
  assert.equal(first.duplicate, false);
  for (let i = 2; i <= 50; i += 1) assert.equal((await simulateTwilioWebhookDelivery(db, payload)).duplicate, true);
  assert.equal(db._tables.messages.length, 1);
  assert.equal(db._tables.messages[0].external_id, payload.MessageSid);
  assert.equal(db._tables.messages[0].business_id, 'biz-ido-001');
});

test('Multi-Tenant Isolation: identical external order IDs remain isolated by canonical OAuth binding', async () => {
  const db = createStubDb({
    growth_provider_connections: [
      shopifyConnection('ido', 'biz-ido-uuid', 'idobridal.myshopify.com'),
      shopifyConnection('proper', 'biz-proper-uuid', 'properandcompany.myshopify.com'),
    ],
    businesses: [
      { id: 'biz-ido-uuid', name: 'I Do Bridal Couture' },
      { id: 'biz-proper-uuid', name: 'Proper & Company' },
    ],
    business_sites: [],
    locations: [
      { id: 'loc-ido-uuid', business_id: 'biz-ido-uuid', name: 'I Do BR' },
      { id: 'loc-proper-uuid', business_id: 'biz-proper-uuid', name: 'Proper BR' },
    ],
    customers: [], orders: [], appointment_requests: [], leads: [], messages: [],
  });

  const payload = {
    id: 99999,
    email: 'cross.tenant@example.com',
    total_price: '1500.00',
    customer: { first_name: 'Cross', last_name: 'Tenant', email: 'cross.tenant@example.com' },
  };

  assert.equal((await simulateShopifyWebhookDelivery(db, payload, 'idobridal.myshopify.com')).status, 200);
  assert.equal((await simulateShopifyWebhookDelivery(db, payload, 'properandcompany.myshopify.com')).status, 200);
  assert.equal(db._tables.orders.length, 2);
  assert.equal(db._tables.orders[0].business_id, 'biz-ido-uuid');
  assert.equal(db._tables.orders[1].business_id, 'biz-proper-uuid');
});

test('Tenant Resolution: legacy business_sites domain alone cannot authenticate Shopify webhooks', async () => {
  const db = createStubDb({
    growth_provider_connections: [],
    business_sites: [{ business_id: 'biz-legacy', domain: 'legacy.myshopify.com' }],
    businesses: [{ id: 'biz-legacy', name: 'Legacy' }],
  });
  await assert.rejects(() => resolveShopifyTenant(db, 'legacy.myshopify.com'), /complete OAuth/i);
});
