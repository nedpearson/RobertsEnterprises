import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import express from 'express';
import { shopifyOrdersRouter } from '../orders';

function readField(row: Record<string, any>, column: string): any {
  const jsonPath = column.match(/^([^>]+)->>(.+)$/);
  if (!jsonPath) return row[column];
  return row[jsonPath[1]]?.[jsonPath[2]];
}

function memoryDb(initial: Record<string, any[]>) {
  const tables = structuredClone(initial);
  let sequence = 0;
  const makeId = (table: string) => `${table}-${++sequence}`;

  const api: any = {
    _tables: tables,
    from(table: string) {
      tables[table] ||= [];
      const chain: any = {
        _rows: [...tables[table]],
        select() { return chain; },
        eq(column: string, value: any) {
          chain._rows = chain._rows.filter((row: any) => readField(row, column) === value);
          return chain;
        },
        ilike(column: string, pattern: string) {
          const needle = pattern.replace(/%/g, '').toLowerCase();
          chain._rows = chain._rows.filter((row: any) => String(readField(row, column) ?? '').toLowerCase().includes(needle));
          return chain;
        },
        in(column: string, values: any[]) {
          chain._rows = chain._rows.filter((row: any) => values.includes(readField(row, column)));
          return chain;
        },
        limit(count: number) {
          chain._rows = chain._rows.slice(0, count);
          return chain;
        },
        maybeSingle() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        single() { return Promise.resolve({ data: chain._rows[0] ?? null, error: null }); },
        insert(payload: any) {
          const rows = (Array.isArray(payload) ? payload : [payload]).map((row: any) => ({ id: row.id || makeId(table), ...row }));
          tables[table].push(...rows);
          const result: any = {
            select() {
              return {
                single() { return Promise.resolve({ data: rows[0], error: null }); },
              };
            },
            then(resolve: any) { resolve({ data: rows, error: null }); },
          };
          return result;
        },
        update(patch: any) {
          const updater: any = {
            eq(column: string, value: any) {
              tables[table] = tables[table].map((row: any) => readField(row, column) === value ? { ...row, ...patch } : row);
              return Promise.resolve({ data: null, error: null });
            },
          };
          return updater;
        },
        upsert(payload: any, options?: any) {
          const conflictColumns = String(options?.onConflict ?? '').split(',').filter(Boolean);
          const duplicate = tables[table].find((row: any) => conflictColumns.length && conflictColumns.every((column) => row[column] === payload[column]));
          if (!duplicate) tables[table].push({ id: payload.id || makeId(table), ...payload });
          return Promise.resolve({ data: null, error: null });
        },
        then(resolve: any) { resolve({ data: chain._rows, error: null }); },
      };
      return chain;
    },
  };
  return api;
}

function webhookSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(Buffer.from(body, 'utf8')).digest('base64');
}

function orderPayload(customerId: number, email: string) {
  return {
    id: 424242,
    order_number: 101,
    email,
    total_price: '125.00',
    financial_status: 'paid',
    customer: {
      id: customerId,
      first_name: 'Test',
      last_name: 'Customer',
      email,
      phone: `+1225000${customerId}`,
    },
    line_items: [{
      title: 'Appointment',
      properties: [
        { name: 'Date', value: '2026-09-15' },
        { name: 'Time', value: '2:00 PM' },
      ],
    }],
  };
}

async function postWebhook(baseUrl: string, shop: string, payload: any, webhookId: string, secret: string) {
  const body = JSON.stringify(payload);
  return fetch(`${baseUrl}/webhooks/orders/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Shop-Domain': shop,
      'X-Shopify-Webhook-Id': webhookId,
      'X-Shopify-Hmac-Sha256': webhookSignature(body, secret),
    },
    body,
  });
}

test('same Shopify order id in I Do and Proper remains isolated by permanent shop domain', async () => {
  const secret = 'shopify-order-isolation-secret';
  process.env.SHOPIFY_CLIENT_SECRET = secret;

  const database = memoryDb({
    growth_provider_connections: [
      {
        id: 'conn-ido', business_id: 'biz-roberts', provider: 'shopify', status: 'connected',
        metadata: { shopDomain: 'idobridalcouture.myshopify.com', brandId: 'brand-ido' },
      },
      {
        id: 'conn-proper', business_id: 'biz-roberts', provider: 'shopify', status: 'connected',
        metadata: { shopDomain: 'properandcompany.myshopify.com', brandId: 'brand-proper' },
      },
    ],
    businesses: [{ id: 'biz-roberts', name: 'Roberts Enterprises' }],
    business_brands: [
      { id: 'brand-ido', business_id: 'biz-roberts', name: 'I Do Bridal Couture' },
      { id: 'brand-proper', business_id: 'biz-roberts', name: 'Proper & Company' },
    ],
    business_sites: [
      { business_id: 'biz-roberts', brand_id: 'brand-ido', notification_email: 'ido@idobridalcouture.com' },
      { business_id: 'biz-roberts', brand_id: 'brand-proper', notification_email: 'hello@properandcompany.com' },
    ],
    locations: [], customers: [], orders: [], appointment_requests: [], leads: [],
    shopify_customer_links: [], shopify_webhook_events: [], appointment_intake_notification_outbox: [],
  });

  const app = express();
  app.use(express.json({
    verify(req, _res, buffer) { (req as any).rawBody = Buffer.from(buffer); },
  }));
  app.use((req, _res, next) => { (req as any).context = { db: database }; next(); });
  app.use(shopifyOrdersRouter);

  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const idoResponse = await postWebhook(
      baseUrl, 'idobridalcouture.myshopify.com', orderPayload(1001, 'ido-customer@example.com'), 'wh-ido', secret,
    );
    assert.equal(idoResponse.status, 200, await idoResponse.text());

    const properResponse = await postWebhook(
      baseUrl, 'properandcompany.myshopify.com', orderPayload(2002, 'proper-customer@example.com'), 'wh-proper', secret,
    );
    assert.equal(properResponse.status, 200, await properResponse.text());

    assert.equal(database._tables.orders.length, 2);
    assert.equal(database._tables.orders[0].external_order_id, '424242');
    assert.equal(database._tables.orders[1].external_order_id, '424242');
    assert.equal(database._tables.orders[0].shop_domain, 'idobridalcouture.myshopify.com');
    assert.equal(database._tables.orders[1].shop_domain, 'properandcompany.myshopify.com');
    assert.equal(database._tables.orders[0].brand_id, 'brand-ido');
    assert.equal(database._tables.orders[1].brand_id, 'brand-proper');

    assert.equal(database._tables.appointment_requests.length, 2);
    assert.notEqual(
      database._tables.appointment_requests[0].idempotency_key,
      database._tables.appointment_requests[1].idempotency_key,
    );
    assert.equal(database._tables.leads.length, 2);
    assert.notEqual(database._tables.leads[0].external_reference, database._tables.leads[1].external_reference);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
