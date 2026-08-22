import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import {
  buildShopifyAuthorizationUrl,
  normalizeShopDomain,
  signShopifyState,
  verifyShopifyCallbackHmac,
  verifyShopifyState,
} from '../oauth';

process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'shopify-oauth-test-secret';

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
