import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import {
  buildShopifyAuthorizationUrl,
  exchangeShopifyCode,
  normalizeShopDomain,
  readShopifyOAuthConfig,
  readShopifyWebhookSecret,
  shopifyDefaultStoreStatus,
  shopifyStoreOverrideStatus,
  signShopifyState,
  verifyShopifyCallbackHmac,
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

test('resolves a dedicated Shopify app and webhook secret for an exact store without affecting the allowed default app', () => {
  const keys = [
    'SHOPIFY_CLIENT_ID',
    'SHOPIFY_CLIENT_SECRET',
    'SHOPIFY_OAUTH_REDIRECT_URI',
    'SHOPIFY_WEBHOOK_SECRET',
    'SHOPIFY_STORE_CONFIGS_JSON',
    'SHOPIFY_DEFAULT_STORE_DOMAINS',
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  process.env.SHOPIFY_CLIENT_ID = 'default-client';
  process.env.SHOPIFY_CLIENT_SECRET = 'default-secret';
  process.env.SHOPIFY_OAUTH_REDIRECT_URI = 'https://api.example.com/api/shopify/callback';
  process.env.SHOPIFY_WEBHOOK_SECRET = 'default-webhook';
  process.env.SHOPIFY_DEFAULT_STORE_DOMAINS = 'idobridalcouture.myshopify.com';
  process.env.SHOPIFY_STORE_CONFIGS_JSON = JSON.stringify({
    'proper-and-co.myshopify.com': {
      clientId: 'proper-client',
      clientSecret: 'proper-secret',
      webhookSecret: 'proper-webhook',
    },
  });

  try {
    assert.deepEqual(readShopifyOAuthConfig('proper-and-co.myshopify.com'), {
      clientId: 'proper-client',
      clientSecret: 'proper-secret',
      redirectUri: 'https://api.example.com/api/shopify/callback',
      webhookSecret: 'proper-webhook',
    });
    assert.deepEqual(readShopifyOAuthConfig('idobridalcouture.myshopify.com'), {
      clientId: 'default-client',
      clientSecret: 'default-secret',
      redirectUri: 'https://api.example.com/api/shopify/callback',
      webhookSecret: 'default-webhook',
    });
    assert.equal(readShopifyWebhookSecret('proper-and-co.myshopify.com'), 'proper-webhook');
    assert.equal(readShopifyWebhookSecret('idobridalcouture.myshopify.com'), 'default-webhook');
    assert.deepEqual(shopifyStoreOverrideStatus(), {
      configuredStores: ['proper-and-co.myshopify.com'],
      invalid: false,
    });
    assert.deepEqual(shopifyDefaultStoreStatus(), {
      restricted: true,
      configuredStores: ['idobridalcouture.myshopify.com'],
      invalid: false,
    });
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('default Shopify app policy fails closed for a store that needs a dedicated app', () => {
  const keys = [
    'SHOPIFY_CLIENT_ID',
    'SHOPIFY_CLIENT_SECRET',
    'SHOPIFY_OAUTH_REDIRECT_URI',
    'SHOPIFY_WEBHOOK_SECRET',
    'SHOPIFY_STORE_CONFIGS_JSON',
    'SHOPIFY_DEFAULT_STORE_DOMAINS',
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  process.env.SHOPIFY_CLIENT_ID = 'ido-client';
  process.env.SHOPIFY_CLIENT_SECRET = 'ido-secret';
  process.env.SHOPIFY_OAUTH_REDIRECT_URI = 'https://api.example.com/api/shopify/callback';
  process.env.SHOPIFY_WEBHOOK_SECRET = 'ido-webhook';
  process.env.SHOPIFY_DEFAULT_STORE_DOMAINS = 'idobridalcouture.myshopify.com';
  delete process.env.SHOPIFY_STORE_CONFIGS_JSON;

  try {
    assert.ok(readShopifyOAuthConfig('idobridalcouture.myshopify.com'));
    assert.equal(readShopifyOAuthConfig('proper-and-co.myshopify.com'), null);
    assert.equal(readShopifyWebhookSecret('proper-and-co.myshopify.com'), undefined);
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('absence of a default-store policy preserves public/default-app behavior', () => {
  const keys = ['SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'SHOPIFY_OAUTH_REDIRECT_URI', 'SHOPIFY_DEFAULT_STORE_DOMAINS'] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.SHOPIFY_CLIENT_ID = 'public-client';
  process.env.SHOPIFY_CLIENT_SECRET = 'public-secret';
  process.env.SHOPIFY_OAUTH_REDIRECT_URI = 'https://api.example.com/api/shopify/callback';
  delete process.env.SHOPIFY_DEFAULT_STORE_DOMAINS;

  try {
    assert.ok(readShopifyOAuthConfig('any-valid-store.myshopify.com'));
    assert.deepEqual(shopifyDefaultStoreStatus(), { restricted: false, configuredStores: [], invalid: false });
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('invalid Shopify store override JSON fails diagnostics closed', () => {
  const previous = process.env.SHOPIFY_STORE_CONFIGS_JSON;
  process.env.SHOPIFY_STORE_CONFIGS_JSON = '{not-valid-json';
  try {
    assert.deepEqual(shopifyStoreOverrideStatus(), { configuredStores: [], invalid: true });
  } finally {
    if (previous === undefined) delete process.env.SHOPIFY_STORE_CONFIGS_JSON;
    else process.env.SHOPIFY_STORE_CONFIGS_JSON = previous;
  }
});

test('invalid default Shopify store policy fails closed', () => {
  const previous = process.env.SHOPIFY_DEFAULT_STORE_DOMAINS;
  process.env.SHOPIFY_DEFAULT_STORE_DOMAINS = 'https://not-shopify.example.com';
  try {
    assert.deepEqual(shopifyDefaultStoreStatus(), { restricted: true, configuredStores: [], invalid: true });
  } finally {
    if (previous === undefined) delete process.env.SHOPIFY_DEFAULT_STORE_DOMAINS;
    else process.env.SHOPIFY_DEFAULT_STORE_DOMAINS = previous;
  }
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

test('authorization URL preserves the configured callback and least privilege scopes', () => {
  const url = new URL(buildShopifyAuthorizationUrl(
    { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://api.example.com/api/shopify/callback' },
    'bridal.myshopify.com',
    'signed-state',
  ));
  assert.equal(url.hostname, 'bridal.myshopify.com');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://api.example.com/api/shopify/callback');
  assert.equal(url.searchParams.get('scope'), 'read_orders,read_customers,read_products');
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
