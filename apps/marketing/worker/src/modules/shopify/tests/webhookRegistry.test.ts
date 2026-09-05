/**
 * Webhook subscription tests.
 *
 * The audit's highest-severity finding was that nothing in VowOS ever called
 * Shopify's webhooks endpoint: OAuth completed, a token was stored, the UI said
 * "connected", and no order was ever delivered. These tests assert that the
 * registration actually happens, converges, and reports honestly when it fails.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  callbackUrlForTopic,
  connectionDeliveryHealth,
  ORDER_CRITICAL_TOPICS,
  reconcileShopifyWebhooks,
  SHOPIFY_WEBHOOK_TOPICS,
  webhookCallbackBase,
} from '../webhookRegistry';

const REDIRECT_URI = 'https://api.vowos.bridgebox.ai/api/shopify/callback';

function withEnv<T>(vars: Record<string, string | undefined>, run: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/** Minimal Admin client double that records what was asked of Shopify. */
function fakeAdmin(existing: Array<{ id: string; topic: string; address: string }>) {
  const calls = { created: [] as any[], updated: [] as any[], deleted: [] as string[] };
  let nextId = 900;

  return {
    calls,
    client: {
      shopDomain: 'properandcompany.myshopify.com',
      async get() {
        return {};
      },
      async post(path: string, body: any) {
        if (path === '/webhooks.json') {
          calls.created.push(body.webhook);
          nextId += 1;
          return { webhook: { id: nextId, topic: body.webhook.topic, address: body.webhook.address } };
        }
        calls.updated.push({ path, webhook: body.webhook });
        return { webhook: { id: body.webhook.id, address: body.webhook.address } };
      },
      async del(path: string) {
        calls.deleted.push(path);
      },
      async paginate() {
        return existing;
      },
    } as any,
  };
}

/** Captures upserted subscription rows so health can be asserted from them. */
function subscriptionDb() {
  const rows: any[] = [];
  return {
    rows,
    db: {
      from(table: string) {
        if (table !== 'shopify_webhook_subscriptions') {
          throw new Error(`Unexpected table in this test: ${table}`);
        }
        const chain: any = {
          _rows: rows,
          upsert(payload: any[]) {
            for (const row of payload) {
              const index = rows.findIndex(
                (existing) => existing.connection_id === row.connection_id && existing.topic === row.topic,
              );
              if (index >= 0) rows[index] = { ...rows[index], ...row };
              else rows.push({ ...row });
            }
            return Promise.resolve({ error: null });
          },
          select() {
            return chain;
          },
          eq(column: string, value: any) {
            chain._rows = chain._rows.filter((row: any) => row[column] === value);
            return chain;
          },
          then(resolve: any) {
            resolve({ data: chain._rows, error: null });
          },
        };
        chain._rows = [...rows];
        return chain;
      },
    } as any,
  };
}

// -----------------------------------------------------------------------------
// Callback derivation
// -----------------------------------------------------------------------------

test('webhook callback base is derived from the OAuth redirect URI so hosts cannot diverge', () => {
  withEnv({ SHOPIFY_OAUTH_REDIRECT_URI: REDIRECT_URI, SHOPIFY_WEBHOOK_CALLBACK_BASE: undefined }, () => {
    assert.equal(webhookCallbackBase(), 'https://api.vowos.bridgebox.ai/api/shopify');
    assert.equal(
      callbackUrlForTopic('orders/create'),
      'https://api.vowos.bridgebox.ai/api/shopify/webhooks/orders/create',
    );
  });
});

test('a redirect URI that is not the Shopify callback yields no webhook base', () => {
  withEnv({ SHOPIFY_OAUTH_REDIRECT_URI: 'https://api.vowos.bridgebox.ai/oauth/done', SHOPIFY_WEBHOOK_CALLBACK_BASE: undefined }, () => {
    assert.equal(webhookCallbackBase(), null);
  });
});

test('every registered topic has a callback path — no topic is subscribed with nowhere to land', () => {
  withEnv({ SHOPIFY_OAUTH_REDIRECT_URI: REDIRECT_URI, SHOPIFY_WEBHOOK_CALLBACK_BASE: undefined }, () => {
    for (const topic of SHOPIFY_WEBHOOK_TOPICS) {
      assert.ok(callbackUrlForTopic(topic), `topic ${topic} must resolve to a callback URL`);
    }
  });
});

// -----------------------------------------------------------------------------
// Reconciliation
// -----------------------------------------------------------------------------

test('a fresh connection subscribes every topic with Shopify', async () => {
  await withEnv({ SHOPIFY_OAUTH_REDIRECT_URI: REDIRECT_URI, SHOPIFY_WEBHOOK_CALLBACK_BASE: undefined }, async () => {
    const admin = fakeAdmin([]);
    const store = subscriptionDb();

    const result = await reconcileShopifyWebhooks(store.db, admin.client, {
      businessId: 'biz-1',
      connectionId: 'conn-1',
    });

    assert.equal(result.failed.length, 0, `no topic should fail: ${JSON.stringify(result.failed)}`);
    assert.equal(result.created.length, SHOPIFY_WEBHOOK_TOPICS.length);
    assert.equal(admin.calls.created.length, SHOPIFY_WEBHOOK_TOPICS.length);
    assert.equal(store.rows.length, SHOPIFY_WEBHOOK_TOPICS.length);
    assert.ok(store.rows.every((row) => row.status === 'ACTIVE' && row.external_webhook_id));
  });
});

test('reconnecting an already-subscribed store creates nothing and duplicates nothing', async () => {
  await withEnv({ SHOPIFY_OAUTH_REDIRECT_URI: REDIRECT_URI, SHOPIFY_WEBHOOK_CALLBACK_BASE: undefined }, async () => {
    const existing = SHOPIFY_WEBHOOK_TOPICS.map((topic, index) => ({
      id: String(100 + index),
      topic,
      address: callbackUrlForTopic(topic) as string,
    }));

    const admin = fakeAdmin(existing);
    const store = subscriptionDb();

    const result = await reconcileShopifyWebhooks(store.db, admin.client, {
      businessId: 'biz-1',
      connectionId: 'conn-1',
    });

    assert.equal(result.created.length, 0);
    assert.equal(result.updated.length, 0);
    assert.equal(admin.calls.created.length, 0, 'a second connect must not create duplicate subscriptions');
  });
});

test('a subscription pointing at a stale host is repointed, not duplicated', async () => {
  await withEnv({ SHOPIFY_OAUTH_REDIRECT_URI: REDIRECT_URI, SHOPIFY_WEBHOOK_CALLBACK_BASE: undefined }, async () => {
    const admin = fakeAdmin([
      {
        id: '500',
        topic: 'orders/create',
        // Same base, old path — this is ours and must be corrected in place.
        address: 'https://api.vowos.bridgebox.ai/api/shopify/webhooks/orders/legacy',
      },
    ]);
    const store = subscriptionDb();

    const result = await reconcileShopifyWebhooks(store.db, admin.client, {
      businessId: 'biz-1',
      connectionId: 'conn-1',
    });

    assert.ok(result.updated.includes('orders/create'));
    assert.equal(admin.calls.updated.length, 1);
    assert.equal(
      admin.calls.updated[0].webhook.address,
      'https://api.vowos.bridgebox.ai/api/shopify/webhooks/orders/create',
    );
  });
});

test('duplicate subscriptions for one topic are removed so Shopify stops double-delivering', async () => {
  await withEnv({ SHOPIFY_OAUTH_REDIRECT_URI: REDIRECT_URI, SHOPIFY_WEBHOOK_CALLBACK_BASE: undefined }, async () => {
    const address = callbackUrlForTopic('orders/create') as string;
    const admin = fakeAdmin([
      { id: '601', topic: 'orders/create', address },
      { id: '602', topic: 'orders/create', address },
    ]);
    const store = subscriptionDb();

    const result = await reconcileShopifyWebhooks(store.db, admin.client, {
      businessId: 'biz-1',
      connectionId: 'conn-1',
    });

    assert.ok(result.removed.includes('orders/create'));
    assert.deepEqual(admin.calls.deleted, ['/webhooks/602.json']);
  });
});

test('another app\'s subscription for the same topic is left alone', async () => {
  await withEnv({ SHOPIFY_OAUTH_REDIRECT_URI: REDIRECT_URI, SHOPIFY_WEBHOOK_CALLBACK_BASE: undefined }, async () => {
    const admin = fakeAdmin([
      { id: '700', topic: 'orders/create', address: 'https://someone-elses-app.example.com/hooks/orders' },
    ]);
    const store = subscriptionDb();

    await reconcileShopifyWebhooks(store.db, admin.client, { businessId: 'biz-1', connectionId: 'conn-1' });

    assert.equal(admin.calls.deleted.length, 0, 'a third-party subscription must never be deleted');
    assert.ok(admin.calls.created.some((webhook: any) => webhook.topic === 'orders/create'));
  });
});

test('a missing callback base fails loudly instead of silently subscribing nothing', async () => {
  await withEnv({ SHOPIFY_OAUTH_REDIRECT_URI: undefined, SHOPIFY_WEBHOOK_CALLBACK_BASE: undefined }, async () => {
    const admin = fakeAdmin([]);
    const store = subscriptionDb();

    const result = await reconcileShopifyWebhooks(store.db, admin.client, {
      businessId: 'biz-1',
      connectionId: 'conn-1',
    });

    assert.equal(result.created.length, 0);
    assert.equal(result.failed.length, 1);
    assert.match(result.failed[0].error, /no webhook callback URL can be derived/i);
  });
});

test('Shopify will not be asked to deliver to a non-HTTPS or localhost address', async () => {
  await withEnv({ SHOPIFY_WEBHOOK_CALLBACK_BASE: 'http://localhost:8787/api/shopify' }, async () => {
    const admin = fakeAdmin([]);
    const store = subscriptionDb();

    const result = await reconcileShopifyWebhooks(store.db, admin.client, {
      businessId: 'biz-1',
      connectionId: 'conn-1',
    });

    assert.equal(admin.calls.created.length, 0);
    assert.equal(result.failed.length, SHOPIFY_WEBHOOK_TOPICS.length);
    assert.match(result.failed[0].error, /public HTTPS host is required/i);
  });
});

// -----------------------------------------------------------------------------
// Health
// -----------------------------------------------------------------------------

test('a valid token alone is not health — delivery health requires the order-critical topics', async () => {
  const store = subscriptionDb();
  store.rows.push(
    { connection_id: 'conn-1', topic: 'orders/create', status: 'ACTIVE' },
    { connection_id: 'conn-1', topic: 'orders/updated', status: 'ACTIVE' },
  );

  const health = await connectionDeliveryHealth(store.db, 'conn-1');
  assert.equal(health.healthy, false);
  assert.deepEqual(health.missing, ['orders/cancelled', 'refunds/create']);
});

test('delivery health is true only when every order-critical topic is ACTIVE', async () => {
  const store = subscriptionDb();
  for (const topic of ORDER_CRITICAL_TOPICS) {
    store.rows.push({ connection_id: 'conn-1', topic, status: 'ACTIVE' });
  }

  const health = await connectionDeliveryHealth(store.db, 'conn-1');
  assert.equal(health.healthy, true);
  assert.deepEqual(health.missing, []);
});

test('a scope-denied topic is not counted as active', async () => {
  const store = subscriptionDb();
  for (const topic of ORDER_CRITICAL_TOPICS) {
    store.rows.push({
      connection_id: 'conn-1',
      topic,
      status: topic === 'refunds/create' ? 'SCOPE_DENIED' : 'ACTIVE',
    });
  }

  const health = await connectionDeliveryHealth(store.db, 'conn-1');
  assert.equal(health.healthy, false);
  assert.deepEqual(health.missing, ['refunds/create']);
});
