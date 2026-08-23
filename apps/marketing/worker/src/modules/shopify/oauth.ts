import crypto from 'node:crypto';

const SHOPIFY_API_VERSION = '2026-07';
const STATE_TTL_MS = 10 * 60 * 1000;
const REQUIRED_SCOPES = ['read_orders', 'read_customers', 'read_products'];

export interface ShopifyOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface ShopifyState {
  businessId: string;
  userId: string;
  shop: string;
  issuedAt: number;
  purpose: 'shopify_connect';
}

export interface ShopifyTokenSet {
  accessToken: string;
  scope: string[];
}

export interface ShopifyShop {
  id: string;
  name: string;
  myshopify_domain: string;
}

export function readShopifyOAuthConfig(): ShopifyOAuthConfig | null {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

/** Shopify OAuth only accepts a shop's permanent myshopify domain. */
export function normalizeShopDomain(value: string): string | null {
  const candidate = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const shop = /^[a-z0-9][a-z0-9-]*$/.test(candidate)
    ? `${candidate}.myshopify.com`
    : candidate;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return null;
  return shop;
}

/**
 * Dedicated state signing is preferred. The service-role key remains a valid
 * verification key for one state TTL so OAuth attempts started immediately
 * before SHOPIFY_STATE_SECRET was introduced/rotated can still finish.
 */
function stateSecrets(): string[] {
  const candidates = [
    process.env.SHOPIFY_STATE_SECRET?.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(candidates)];
}

function stateSigningSecret(): string {
  return stateSecrets()[0] || '';
}

export function signShopifyState(payload: ShopifyState): string {
  const secret = stateSigningSecret();
  if (!secret) throw new Error('Shopify state signing is not configured.');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyShopifyState(state: string): ShopifyState | null {
  const [body, signature] = state.split('.');
  const secrets = stateSecrets();
  if (!secrets.length || !body || !signature) return null;

  const actualBuffer = Buffer.from(signature);
  const signatureValid = secrets.some((secret) => {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  });
  if (!signatureValid) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ShopifyState;
    if (
      payload.purpose !== 'shopify_connect' || !payload.businessId || !payload.userId ||
      !normalizeShopDomain(payload.shop) || !Number.isFinite(payload.issuedAt) ||
      Date.now() - payload.issuedAt > STATE_TTL_MS || payload.issuedAt > Date.now() + 60_000
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildShopifyAuthorizationUrl(config: ShopifyOAuthConfig, shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId, scope: REQUIRED_SCOPES.join(','), redirect_uri: config.redirectUri, state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/** Validates Shopify's callback HMAC over all callback query values except hmac. */
export function verifyShopifyCallbackHmac(query: Record<string, unknown>, secret: string): boolean {
  const supplied = typeof query.hmac === 'string' ? query.hmac : '';
  if (!supplied || !secret) return false;
  const message = Object.entries(query)
    .filter(([key, value]) => key !== 'hmac' && typeof value === 'string')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const actualBuffer = Buffer.from(supplied, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

async function readJson(response: globalThis.Response, context: string): Promise<Record<string, unknown>> {
  const text = await response.text();
  let json: Record<string, unknown>;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { throw new Error(`${context} returned an invalid response (${response.status}).`); }
  if (!response.ok) throw new Error(`${context} failed (${response.status}): ${String(json.error_description ?? json.error ?? 'unknown error')}`);
  return json;
}

export async function exchangeShopifyCode(config: ShopifyOAuthConfig, shop: string, code: string): Promise<ShopifyTokenSet> {
  const json = await readJson(await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code }),
  }), 'Shopify token exchange');
  if (!json.access_token) throw new Error('Shopify token exchange returned no access token.');
  return { accessToken: String(json.access_token), scope: String(json.scope ?? '').split(',').map((scope) => scope.trim()).filter(Boolean) };
}

export async function verifyShopifyShop(shop: string, accessToken: string): Promise<ShopifyShop> {
  const json = await readJson(await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken, Accept: 'application/json' },
  }), 'Shopify shop verification');
  const record = json.shop as Partial<ShopifyShop> | undefined;
  if (!record?.id || !record.name || !record.myshopify_domain) throw new Error('Shopify verification returned an incomplete shop record.');
  return { id: String(record.id), name: String(record.name), myshopify_domain: String(record.myshopify_domain) };
}

export const SHOPIFY_SCOPES = REQUIRED_SCOPES;
