import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureShopifyOrderWebhook } from '../webhooks';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('ensureShopifyOrderWebhook reuses the exact existing subscription', async () => {
  const calls: Array<{ url: string; body: any }> = [];
  const fetchStub: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return response({
      data: {
        webhookSubscriptions: {
          nodes: [{ id: 'gid://shopify/WebhookSubscription/1', topic: 'ORDERS_CREATE', uri: 'https://api.example.com/api/shopify/webhooks/orders/create' }],
        },
      },
    });
  };

  const result = await ensureShopifyOrderWebhook(
    'sample.myshopify.com',
    'token',
    'https://api.example.com/api/shopify/callback',
    fetchStub,
  );

  assert.equal(result.id, 'gid://shopify/WebhookSubscription/1');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /sample\.myshopify\.com\/admin\/api\/2026-07\/graphql\.json$/);
});
test('ensureShopifyOrderWebhook creates a missing subscription with the API origin', async () => {
  const calls: any[] = [];
  const fetchStub: typeof fetch = async (_input, init) => {
    const request = JSON.parse(String(init?.body));
    calls.push(request);
    if (calls.length === 1) {
      return response({ data: { webhookSubscriptions: { nodes: [] } } });
    }
    return response({
      data: {
        webhookSubscriptionCreate: {
          webhookSubscription: {
            id: 'gid://shopify/WebhookSubscription/2',
            topic: 'ORDERS_CREATE',
            uri: request.variables.subscription.uri,
          },
          userErrors: [],
        },
      },
    });
  };

  const result = await ensureShopifyOrderWebhook(
    'sample.myshopify.com',
    'token',
    'https://api.example.com/api/shopify/callback?ignored=true',
    fetchStub,
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[1].variables.topic, 'ORDERS_CREATE');
  assert.equal(calls[1].variables.subscription.uri, 'https://api.example.com/api/shopify/webhooks/orders/create');
  assert.equal(result.uri, 'https://api.example.com/api/shopify/webhooks/orders/create');
});

test('ensureShopifyOrderWebhook fails closed on provider user errors', async () => {
  let call = 0;
  const fetchStub: typeof fetch = async () => {
    call += 1;
    return call === 1
      ? response({ data: { webhookSubscriptions: { nodes: [] } } })
      : response({ data: { webhookSubscriptionCreate: { webhookSubscription: null, userErrors: [{ message: 'Invalid URI' }] } } });
  };

  await assert.rejects(
    () => ensureShopifyOrderWebhook('sample.myshopify.com', 'token', 'https://api.example.com/api/shopify/callback', fetchStub),
    /Invalid URI/,
  );
});

test('ensureShopifyOrderWebhook refuses non-HTTPS callback origins', async () => {
  await assert.rejects(
    () => ensureShopifyOrderWebhook('sample.myshopify.com', 'token', 'http://localhost:3000/api/shopify/callback'),
    /requires an HTTPS callback origin/,
  );
});
