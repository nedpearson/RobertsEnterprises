import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import {
  buildShopifyAuthorizationUrl,
  exchangeShopifyCode,
  normalizeShopDomain,
  signShopifyState,
  verifyShopifyCallbackHmac,
  verifyShopifyState,
} from '../oauth';

process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'shopify-oauth-test-secret';
process.env.SHOPIFY_STATE_SECRET ??= 'shopify-dedicated-state-secret';

test('normalizes Shopify store handles and permanent myshopify domains', () => {
  assert.equal(normalizeShopDomain('HTTPS://My-Bridal-Shop.myshopify.com/'), 'my-bridal-shop.myshopify.com');
  assert.equal(normalizeShopDomain('my-bridal-shop'), 'my-bridal-shop.myshopify.com');
  assert.equal(normalizeShopDomain('my-bridal-shop.com'), null);
  assert.equal(normalizeShopDomain('my-bridal-shop.myshopify.com.evil.test'), null);
});

test('Shopify state is tenant-bound, signed, and expires', () => {
  const state = signShopifyState({
    businessId: 'business-a', userId: 'user-a', shop: 'bridal.myshopify.com', issuedAt: Date.now(), purpose: 'shopify_connect',
  });
  assert.equal(verifyShopifyState(state)?.businessId, 'business-a');
  assert.equal(verifyShopifyState(`${state}tampered`), null);

  const expired = signShopifyState({
    businessId: 'business-a', userId: 'user-a', shop: 'bridal.myshopify.com', issuedAt: Date.now() - 11 * 60_000, purpose: 'shopify_connect',
  });
  assert.equal(verifyShopifyState(expired), null);
});

test('Shopify state survives URL and Shopify Admin store-selection round trips as one URL-safe token', () => {
  const state = signShopifyState({
    businessId: 'business-a',
    userId: 'user-a',
    shop: 'idobridalcouture.myshopify.com',
    issuedAt: Date.now(),
    purpose: 'shopify_connect',
  });

  // V2 deliberately avoids the legacy body.signature separator so intermediaries
  // that split or normalize punctuation cannot corrupt the signed state.
  assert.doesNotMatch(state, /[.+/=]/);

  const authUrl = new URL(buildShopifyAuthorizationUrl(
    { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://api.robertsenterprises.bridgebox.ai/api/shopify/callback' },
    'idobridalcouture.myshopify.com',
    state,
  ));
  const roundTripped = authUrl.searchParams.get('state');
  assert.equal(roundTripped, state);
  assert.equal(verifyShopifyState(roundTripped || '')?.shop, 'idobridalcouture.myshopify.com');
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
  // AbortSignal.timeout() intentionally uses an unref'd timer in Node. Keep one
  // referenced timer alive so the test process waits long enough to observe it.
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
