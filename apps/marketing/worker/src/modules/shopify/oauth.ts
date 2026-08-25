import crypto from 'node:crypto';

const SHOPIFY_API_VERSION = '2026-07';
const STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SHOPIFY_HTTP_TIMEOUT_MS = 12_000;
const REQUIRED_SCOPES = ['read_orders', 'read_customers', 'read_products'];
const SHOPIFY_STATE_VERSION = 2;

export interface ShopifyOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webhookSecret?: string;
}

export interface ShopifyState {
  businessId: string;
  userId: string;
  shop: string;
  brandId?: string;
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

type ShopifyStateEnvelope = {
  v: number;
  b: string;
  s: string;
};

type ShopifyStoreOverride = {
  clientId?: unknown;
  clientSecret?: unknown;
  redirectUri?: unknown;
  webhookSecret?: unknown;
};

type ShopifyStoreOverrideParse = {
  stores: Record<string, ShopifyStoreOverride>;
  invalid: boolean;
};

const nonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/**
 * Accept the forms a merchant is likely to paste, but normalize them to the
 * permanent `*.myshopify.com` identity before they are signed, configured, or
 * sent to Shopify.
 */
export function normalizeShopDomain(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const adminMatch = raw.match(
    /^(?:https?:\/\/)?admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)(?:[/?#].*)?$/,
  );
  if (adminMatch) return `${adminMatch[1]}.myshopify.com`;

  const withoutScheme = raw.replace(/^https?:\/\//, '');
  const host = withoutScheme.split(/[/?#]/, 1)[0];
  const shop = /^[a-z0-9][a-z0-9-]*$/.test(host)
    ? `${host}.myshopify.com`
    : host;

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return null;
  return shop;
}

/**
 * Optional per-store Shopify app credentials.
 *
 * Roberts Enterprises currently operates independent Shopify stores. Shopify
 * custom-distribution apps cannot span unrelated non-Plus stores, so VowOS can
 * bind a dedicated Shopify app to an exact permanent shop domain while keeping
 * the original global app as the default. This also provides a safe bridge to a
 * future public-distribution app without disturbing existing installed tokens.
 *
 * Environment format (secrets remain server-side):
 * SHOPIFY_STORE_CONFIGS_JSON={
 *   "proper-and-co.myshopify.com": {
 *     "clientId": "...",
 *     "clientSecret": "...",
 *     "redirectUri": "https://api.../api/shopify/callback",
 *     "webhookSecret": "..."
 *   }
 * }
 */
function parseShopifyStoreOverrides(): ShopifyStoreOverrideParse {
  const raw = process.env.SHOPIFY_STORE_CONFIGS_JSON?.trim();
  if (!raw) return { stores: {}, invalid: false };

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { stores: {}, invalid: true };
    }

    const stores: Record<string, ShopifyStoreOverride> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const shop = normalizeShopDomain(key);
      if (!shop || !value || typeof value !== 'object' || Array.isArray(value)) {
        return { stores: {}, invalid: true };
      }
      stores[shop] = value as ShopifyStoreOverride;
    }
    return { stores, invalid: false };
  } catch {
    return { stores: {}, invalid: true };
  }
}

export function shopifyStoreOverrideStatus(): { configuredStores: string[]; invalid: boolean } {
  const parsed = parseShopifyStoreOverrides();
  return { configuredStores: Object.keys(parsed.stores).sort(), invalid: parsed.invalid };
}

function overrideForShop(shopDomain?: string): ShopifyStoreOverride | null {
  if (!shopDomain) return null;
  const normalized = normalizeShopDomain(shopDomain);
  if (!normalized) return null;
  const parsed = parseShopifyStoreOverrides();
  if (parsed.invalid) return null;
  return parsed.stores[normalized] ?? null;
}

/**
 * Resolve Shopify OAuth credentials for an exact store when an override exists,
 * otherwise fall back to the original default VowOS Shopify app.
 *
 * An explicitly configured but incomplete store override fails closed instead
 * of silently authorizing that store with the wrong Shopify app.
 */
export function readShopifyOAuthConfig(shopDomain?: string): ShopifyOAuthConfig | null {
  const shopOverride = overrideForShop(shopDomain);
  if (shopOverride) {
    const clientId = nonEmptyString(shopOverride.clientId);
    const clientSecret = nonEmptyString(shopOverride.clientSecret);
    const redirectUri = nonEmptyString(shopOverride.redirectUri) || nonEmptyString(process.env.SHOPIFY_OAUTH_REDIRECT_URI);
    const webhookSecret = nonEmptyString(shopOverride.webhookSecret) || clientSecret;
    if (!clientId || !clientSecret || !redirectUri) return null;
    return { clientId, clientSecret, redirectUri, webhookSecret: webhookSecret || undefined };
  }

  const clientId = nonEmptyString(process.env.SHOPIFY_CLIENT_ID);
  const clientSecret = nonEmptyString(process.env.SHOPIFY_CLIENT_SECRET);
  const redirectUri = nonEmptyString(process.env.SHOPIFY_OAUTH_REDIRECT_URI);
  if (!clientId || !clientSecret || !redirectUri) return null;
  return {
    clientId,
    clientSecret,
    redirectUri,
    webhookSecret: nonEmptyString(process.env.SHOPIFY_WEBHOOK_SECRET) || clientSecret,
  };
}

/** Resolve the correct Shopify webhook signing secret for the emitting store. */
export function readShopifyWebhookSecret(shopDomain?: string): string | undefined {
  const shopOverride = overrideForShop(shopDomain);
  if (shopOverride) {
    return nonEmptyString(shopOverride.webhookSecret)
      || nonEmptyString(shopOverride.clientSecret)
      || undefined;
  }
  return nonEmptyString(process.env.SHOPIFY_WEBHOOK_SECRET)
    || nonEmptyString(process.env.SHOPIFY_CLIENT_SECRET)
    || undefined;
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

function signStateBody(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

function timingSafeStringEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function decodeStateParts(state: string): { body: string; signature: string } | null {
  // V2 is a single URL-safe token. Keeping the signature inside the base64url
  // envelope avoids punctuation-sensitive round trips through Shopify Admin's
  // store-selection/install screens while remaining stateless and HMAC-bound.
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as Partial<ShopifyStateEnvelope>;
    if (
      decoded.v === SHOPIFY_STATE_VERSION &&
      typeof decoded.b === 'string' && decoded.b &&
      typeof decoded.s === 'string' && decoded.s
    ) {
      return { body: decoded.b, signature: decoded.s };
    }
  } catch {
    // Fall through to the legacy body.signature format for in-flight attempts.
  }

  const separator = state.indexOf('.');
  if (separator <= 0 || separator === state.length - 1 || state.indexOf('.', separator + 1) !== -1) return null;
  return { body: state.slice(0, separator), signature: state.slice(separator + 1) };
}

export function signShopifyState(payload: ShopifyState): string {
  const secret = stateSigningSecret();
  if (!secret) throw new Error('Shopify state signing is not configured.');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signStateBody(body, secret);
  const envelope: ShopifyStateEnvelope = { v: SHOPIFY_STATE_VERSION, b: body, s: signature };
  return Buffer.from(JSON.stringify(envelope)).toString('base64url');
}

export function verifyShopifyState(state: string): ShopifyState | null {
  const parts = decodeStateParts(state.trim());
  const secrets = stateSecrets();
  if (!secrets.length || !parts) return null;

  const signatureValid = secrets.some((secret) => timingSafeStringEqual(parts.signature, signStateBody(parts.body, secret)));
  if (!signatureValid) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts.body, 'base64url').toString('utf8')) as ShopifyState;
    if (
      payload.purpose !== 'shopify_connect' || !payload.businessId || !payload.userId ||
      !normalizeShopDomain(payload.shop) ||
      (payload.brandId !== undefined && (typeof payload.brandId !== 'string' || !payload.brandId.trim())) ||
      !Number.isFinite(payload.issuedAt) ||
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

function shopifyHttpTimeoutMs(): number {
  const configured = Number(process.env.SHOPIFY_HTTP_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 25 && configured <= 60_000
    ? Math.floor(configured)
    : DEFAULT_SHOPIFY_HTTP_TIMEOUT_MS;
}

async function shopifyFetch(url: string, init: RequestInit, context: string): Promise<globalThis.Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(shopifyHttpTimeoutMs()),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error(`${context} timed out. Please retry the Shopify connection.`);
    }
    throw error;
  }
}

async function readJson(response: globalThis.Response, context: string): Promise<Record<string, unknown>> {
  const text = await response.text();
  let json: Record<string, unknown>;
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { throw new Error(`${context} returned an invalid response (${response.status}).`); }
  if (!response.ok) throw new Error(`${context} failed (${response.status}): ${String(json.error_description ?? json.error ?? 'unknown error')}`);
  return json;
}

export async function exchangeShopifyCode(config: ShopifyOAuthConfig, shop: string, code: string): Promise<ShopifyTokenSet> {
  const response = await shopifyFetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code }),
  }, 'Shopify token exchange');
  const json = await readJson(response, 'Shopify token exchange');
  if (!json.access_token) throw new Error('Shopify token exchange returned no access token.');
  return { accessToken: String(json.access_token), scope: String(json.scope ?? '').split(',').map((scope) => scope.trim()).filter(Boolean) };
}

export async function verifyShopifyShop(shop: string, accessToken: string): Promise<ShopifyShop> {
  const response = await shopifyFetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken, Accept: 'application/json' },
  }, 'Shopify shop verification');
  const json = await readJson(response, 'Shopify shop verification');
  const record = json.shop as Partial<ShopifyShop> | undefined;
  if (!record?.id || !record.name || !record.myshopify_domain) throw new Error('Shopify verification returned an incomplete shop record.');
  return { id: String(record.id), name: String(record.name), myshopify_domain: String(record.myshopify_domain) };
}

export const SHOPIFY_SCOPES = REQUIRED_SCOPES;
