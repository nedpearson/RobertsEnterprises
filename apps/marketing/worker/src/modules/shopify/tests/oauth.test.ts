import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import {
  buildShopifyAuthorizationUrl,
  deleteShopifyWebhookSubscriptions,
  ensureShopifyWebhookSubscriptions,
  exchangeShopifyCode,
  normalizeShopDomain,
  signShopifyState,
  verifyShopifyCallbackHmac,
  verifyShopifyShop,
  verifyShopifyState,
} from '../oauth';

process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'shopify-oauth-test-secret';
process.env.SHOPIFY_STATE_SECRET ??= 'shopify-dedicated-state-secret';

test('normalizes Shopify store handles, admin URLs, and permanent myshopify domains', () => {
  assert.equal(normalizeShopDomain('HTTPS://My-Bridal-Shop.myshopify.com/'), 'my-bridal-shop.myshopify.com');
  assert.equal(normalizeShopDomain('https://my-bridal-shop.myshopify.com/admin/settings'), 'my-bridal-shop.myshopify.com');
  assert.equal(normalizeShopDomain('my-bridal-shop'), 'my-bridal-shop.myshopify.com');
  assert.equal(normalizeShopDomain('https://admin.shopify.com/store/my-bridal-shop/settings/domains'), 'my-bridal-shop.myshopify.com');
  assert.equal(normalizeShopDomain('my-bridal-shop.com'), null);
  assert.equal(normalizeShopDomain('my-bridal-shop.myshopify.com.evil.test'), null);
  assert.equal(normalizeShopDomain('https://admin.shopify.com.evil.test/store/my-bridal-shop'), null);
});

test('Shopify state is tenant and brand bound, signed, and expires', () => {
  const state = signShopifyState({
    businessId: 'business-a',
    userId: 'user-a',
    brandId: 'brand-a',
    shop: 'bridal.myshopify.com',
    issuedAt: Date.now(),
    purpose: 'shopify_connect',
  });
  const verified = verifyShopifyState(state);
  assert.equal(verified?.businessId, 'business-a');
  assert.equal(verified?.brandId, 'brand-a');
  assert.equal(verifyShopifyState(`${state}tampered`), null);

  const expired = signShopifyState({
    businessId: 'business-a', userId: 'user-a', brandId: 'brand-a', shop: 'bridal.myshopify.com', issuedAt: Date.now() - 11 * 60_000, purpose: 'shopify_connect',
  });
  assert.equal(verifyShopifyState(expired), null);
});

test('Shopify state survives URL and Shopify Admin store-selection round trips as one URL-safe token', () => {
  const state = signShopifyState({
    businessId: 'business-a',
    userId: 'user-a',
    brandId: 'ido-brand',
    shop: 'idobridalcouture.myshopify.com',
    issuedAt: Date.now(),
    purpose: 'shopify_connect',
  });
  assert.doesNotMatch(state, /[.+/=]/);

  const authUrl = new URL(buildShopifyAuthorizationUrl(
    { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://api.robertsenterprises.bridgebox.ai/api/shopify/callback' },
    'idobridalcouture.myshopify.com',
    state,
  ));
  const roundTripped = authUrl.searchParams.get('state');
  assert.equal(roundTripped, state);
  const verified = verifyShopifyState(roundTripped || '');
  assert.equal(verified?.shop, 'idobridalcouture.myshopify.com');
  assert.equal(verified?.brandId, 'ido-brand');
});

test('Shopify state started before dedicated-secret rollout can finish after rotation', () => {
  const payload = {
    businessId: 'business-a',
    userId: 'user-a',
    shop: 'bridal.myshopify.com',
    issuedAt: Date.now(),
    purpose: 'shopify_connect' as const,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const legacySignature = crypto
    .createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY as string)
    .update(body)
    .digest('base64url');
  const legacyState = `${body}.${legacySignature}`;
  assert.equal(verifyShopifyState(legacyState)?.businessId, 'business-a');
});

test('Shopify callback HMAC covers every signed query value', () => {
  const secret = 'shopify-client-secret';
  const query: Record<string, string> = { code: 'code-1', shop: 'bridal.myshopify.com', state: 'state-1', timestamp: '123' };
  const message = Object.entries(query).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  query.hmac = crypto.createHmac('sha256', secret).update(message).digest('hex');
  assert.equal(verifyShopifyCallbackHmac(query, secret), true);
  query.shop = 'attacker.myshopify.com';
  assert.equal(verifyShopifyCallbackHmac(query, secret), false);
});

test('authorization URL preserves callback and least-privilege scopes', () => {
  const url = new URL(buildShopifyAuthorizationUrl(
    { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://api.example.com/api/shopify/callback' },
    'bridal.myshopify.com',
    'signed-state',
  ));
  assert.equal(url.hostname, 'bridal.myshopify.com');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://api.example.com/api/shopify/callback');
  assert.equal(url.searchParams.get('scope'), 'read_orders,read_customers,read_products');
});

test('Shopify shop verification uses GraphQL Admin API and preserves stable numeric shop identity', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: any }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? '{}'));
    calls.push({ url, body });
    return new Response(JSON.stringify({
      data: {
        shop: {
          id: 'gid://shopify/Shop/987654321',
          name: 'Proper & Company',
          myshopifyDomain: 'properandcompany.myshopify.com',
        },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    const shop = await verifyShopifyShop('properandcompany.myshopify.com', 'token-1');
    assert.equal(shop.id, '987654321');
    assert.equal(shop.name, 'Proper & Company');
    assert.equal(shop.myshopify_domain, 'properandcompany.myshopify.com');
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/admin\/api\/2026-07\/graphql\.json$/);
    assert.match(calls[0].body.query, /myshopifyDomain/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Shopify verification rejects a GraphQL identity that returns a different permanent domain', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: { shop: { id: 'gid://shopify/Shop/1', name: 'Wrong', myshopifyDomain: 'other.myshopify.com' } },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
  try {
    await assert.rejects(
      () => verifyShopifyShop('expected.myshopify.com', 'token-1'),
      /different permanent shop domain/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('managed Shopify webhook provisioning is idempotent and creates only missing VowOS subscriptions', async () => {
  const originalFetch = globalThis.fetch;
  const originalRedirect = process.env.SHOPIFY_OAUTH_REDIRECT_URI;
  process.env.SHOPIFY_OAUTH_REDIRECT_URI = 'https://api.robertsenterprises.bridgebox.ai/api/shopify/callback';
  const createdTopics: string[] = [];

  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}'));
    if (String(body.query).includes('query VowOSWebhookSubscriptions')) {
      return new Response(JSON.stringify({ data: { webhookSubscriptions: { nodes: [
        {
          id: 'gid://shopify/WebhookSubscription/existing',
          topic: 'ORDERS_CREATE',
          uri: 'https://api.robertsenterprises.bridgebox.ai/api/shopify/webhooks/orders/create',
        },
      ] } } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(body.query).includes('mutation VowOSCreateWebhook')) {
      createdTopics.push(body.variables.topic);
      return new Response(JSON.stringify({ data: { webhookSubscriptionCreate: {
        webhookSubscription: { id: `gid://shopify/WebhookSubscription/${body.variables.topic}`, topic: body.variables.topic, uri: body.variables.webhookSubscription.uri },
        userErrors: [],
      } } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected GraphQL operation in test: ${body.query}`);
  }) as typeof fetch;

  try {
    await ensureShopifyWebhookSubscriptions('properandcompany.myshopify.com', 'token-1');
    assert.deepEqual(createdTopics, ['APP_UNINSTALLED']);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalRedirect === undefined) delete process.env.SHOPIFY_OAUTH_REDIRECT_URI;
    else process.env.SHOPIFY_OAUTH_REDIRECT_URI = originalRedirect;
  }
});

test('disconnect webhook cleanup deletes only VowOS-owned canonical subscription URIs', async () => {
  const originalFetch = globalThis.fetch;
  const originalRedirect = process.env.SHOPIFY_OAUTH_REDIRECT_URI;
  process.env.SHOPIFY_OAUTH_REDIRECT_URI = 'https://api.robertsenterprises.bridgebox.ai/api/shopify/callback';
  const deletedIds: string[] = [];

  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}'));
    if (String(body.query).includes('query VowOSWebhookSubscriptions')) {
      return new Response(JSON.stringify({ data: { webhookSubscriptions: { nodes: [
        { id: 'order-id', topic: 'ORDERS_CREATE', uri: 'https://api.robertsenterprises.bridgebox.ai/api/shopify/webhooks/orders/create' },
        { id: 'uninstall-id', topic: 'APP_UNINSTALLED', uri: 'https://api.robertsenterprises.bridgebox.ai/api/shopify/webhooks/app/uninstalled' },
        { id: 'other-app-id', topic: 'ORDERS_UPDATED', uri: 'https://other.example.com/hooks/orders' },
      ] } } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(body.query).includes('mutation VowOSDeleteWebhook')) {
      deletedIds.push(body.variables.id);
      return new Response(JSON.stringify({ data: { webhookSubscriptionDelete: {
        deletedWebhookSubscriptionId: body.variables.id,
        userErrors: [],
      } } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected GraphQL operation in test: ${body.query}`);
  }) as typeof fetch;

  try {
    await deleteShopifyWebhookSubscriptions('properandcompany.myshopify.com', 'token-1');
    assert.deepEqual(deletedIds.sort(), ['order-id', 'uninstall-id']);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalRedirect === undefined) delete process.env.SHOPIFY_OAUTH_REDIRECT_URI;
    else process.env.SHOPIFY_OAUTH_REDIRECT_URI = originalRedirect;
  }
});

test('Shopify token exchange fails in bounded time instead of hanging the callback page', async () => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = process.env.SHOPIFY_HTTP_TIMEOUT_MS;
  process.env.SHOPIFY_HTTP_TIMEOUT_MS = '25';
  const keepAlive = setInterval(() => undefined, 1000);

  globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) => new Promise((_resolve, reject) => {
    const signal = init?.signal;
    const abort = () => {
      const error = new Error('request aborted');
      error.name = 'TimeoutError';
      reject(error);
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  })) as typeof fetch;

  try {
    await assert.rejects(
      () => exchangeShopifyCode(
        { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://api.example.com/api/shopify/callback' },
        'bridal.myshopify.com',
        'one-time-code',
      ),
      /Shopify token exchange timed out/i,
    );
  } finally {
    clearInterval(keepAlive);
    globalThis.fetch = originalFetch;
    if (originalTimeout === undefined) delete process.env.SHOPIFY_HTTP_TIMEOUT_MS;
    else process.env.SHOPIFY_HTTP_TIMEOUT_MS = originalTimeout;
  }
});
