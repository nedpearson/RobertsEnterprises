import crypto from 'node:crypto';

export const SHOPIFY_API_VERSION = '2026-07';
const STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SHOPIFY_HTTP_TIMEOUT_MS = 12_000;
const REQUIRED_SCOPES = ['read_orders', 'read_customers', 'read_products'];
const SHOPIFY_STATE_VERSION = 2;

export interface ShopifyOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
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

type ShopifyGraphqlEnvelope<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type WebhookNode = {
  id: string;
  topic: string;
  uri: string;
};

const MANAGED_WEBHOOKS = [
  { topic: 'ORDERS_CREATE', path: '/api/shopify/webhooks/orders/create' },
  { topic: 'APP_UNINSTALLED', path: '/api/shopify/webhooks/app/uninstalled' },
] as const;

export function readShopifyOAuthConfig(): ShopifyOAuthConfig | null {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

/**
 * Shopify OAuth is ultimately bound to the permanent `*.myshopify.com` domain.
 * Accept the forms a merchant is likely to paste, but normalize them to that
 * permanent domain before anything is signed or sent to Shopify.
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
    client_id: config.clientId,
    scope: REQUIRED_SCOPES.join(','),
    redirect_uri: config.redirectUri,
    state,
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
      throw new Error(`${context} timed out. Please retry the Shopify operation.`);
    }
    throw error;
  }
}

async function readJson(response: globalThis.Response, context: string): Promise<Record<string, unknown>> {
  const text = await response.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${context} returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`${context} failed (${response.status}): ${String(json.error_description ?? json.error ?? 'unknown error')}`);
  }
  return json;
}

export async function exchangeShopifyCode(config: ShopifyOAuthConfig, shop: string, code: string): Promise<ShopifyTokenSet> {
  const response = await shopifyFetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code }),
  }, 'Shopify token exchange');
  const json = await readJson(response, 'Shopify token exchange');
  if (!json.access_token) throw new Error('Shopify token exchange returned no access token.');
  return {
    accessToken: String(json.access_token),
    scope: String(json.scope ?? '').split(',').map((scope) => scope.trim()).filter(Boolean),
  };
}

/**
 * GraphQL Admin API transport. Shopify's REST Admin API is legacy; every
 * post-OAuth Admin API operation in VowOS goes through this function.
 */
export async function shopifyGraphql<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
  context = 'Shopify GraphQL request',
): Promise<T> {
  const canonical = normalizeShopDomain(shop);
  if (!canonical) throw new Error('Shopify GraphQL request received an invalid permanent shop domain.');
  if (!accessToken) throw new Error('Shopify GraphQL request has no access token.');

  const response = await shopifyFetch(`https://${canonical}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  }, context);
  const envelope = await readJson(response, context) as ShopifyGraphqlEnvelope<T>;
  const graphqlErrors = envelope.errors?.map((error) => error.message).filter(Boolean) ?? [];
  if (graphqlErrors.length) throw new Error(`${context} failed: ${graphqlErrors.join('; ')}`);
  if (!envelope.data) throw new Error(`${context} returned no data.`);
  return envelope.data;
}

/** Verifies the permanent shop identity using GraphQL Admin API only. */
export async function verifyShopifyShop(shop: string, accessToken: string): Promise<ShopifyShop> {
  const canonical = normalizeShopDomain(shop);
  if (!canonical) throw new Error('Shopify shop verification received an invalid shop domain.');
  const data = await shopifyGraphql<{
    shop: { id: string; name: string; myshopifyDomain: string } | null;
  }>(canonical, accessToken, `query VowOSShopIdentity { shop { id name myshopifyDomain } }`, {}, 'Shopify shop verification');

  const record = data.shop;
  if (!record?.id || !record.name || !record.myshopifyDomain) {
    throw new Error('Shopify verification returned an incomplete shop record.');
  }
  const verifiedDomain = normalizeShopDomain(record.myshopifyDomain);
  if (!verifiedDomain || verifiedDomain !== canonical) {
    throw new Error('Shopify verification returned a different permanent shop domain than the OAuth request.');
  }

  // Preserve the numeric legacy resource id used by existing VowOS connection
  // rows rather than changing identity when REST shop.json is retired.
  const id = String(record.id).split('/').filter(Boolean).pop() || String(record.id);
  return { id, name: String(record.name), myshopify_domain: verifiedDomain };
}

function webhookBaseUrl(): string {
  const redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI;
  if (!redirectUri) throw new Error('SHOPIFY_OAUTH_REDIRECT_URI is not configured.');
  const url = new URL(redirectUri);
  if (url.protocol !== 'https:') throw new Error('Shopify webhook base URL must use HTTPS.');
  return url.origin;
}

async function listShopifyWebhookSubscriptions(shop: string, accessToken: string): Promise<WebhookNode[]> {
  const data = await shopifyGraphql<{
    webhookSubscriptions: { nodes: WebhookNode[] };
  }>(shop, accessToken, `
    query VowOSWebhookSubscriptions {
      webhookSubscriptions(first: 100) {
        nodes { id topic uri }
      }
    }
  `, {}, 'Shopify webhook subscription lookup');
  return data.webhookSubscriptions?.nodes ?? [];
}

async function deleteWebhookById(shop: string, accessToken: string, id: string): Promise<void> {
  const data = await shopifyGraphql<{
    webhookSubscriptionDelete: {
      deletedWebhookSubscriptionId: string | null;
      userErrors: Array<{ message: string }>;
    };
  }>(shop, accessToken, `
    mutation VowOSDeleteWebhook($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors { message }
      }
    }
  `, { id }, 'Shopify webhook subscription removal');
  const errors = data.webhookSubscriptionDelete?.userErrors ?? [];
  if (errors.length) throw new Error(`Shopify webhook removal failed: ${errors.map((error) => error.message).join('; ')}`);
}

async function createWebhook(
  shop: string,
  accessToken: string,
  topic: string,
  uri: string,
): Promise<void> {
  const data = await shopifyGraphql<{
    webhookSubscriptionCreate: {
      webhookSubscription: WebhookNode | null;
      userErrors: Array<{ message: string }>;
    };
  }>(shop, accessToken, `
    mutation VowOSCreateWebhook(
      $topic: WebhookSubscriptionTopic!,
      $webhookSubscription: WebhookSubscriptionInput!
    ) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id topic uri }
        userErrors { message }
      }
    }
  `, {
    topic,
    webhookSubscription: { uri, format: 'JSON' },
  }, 'Shopify webhook subscription creation');
  const errors = data.webhookSubscriptionCreate?.userErrors ?? [];
  if (errors.length) throw new Error(`Shopify webhook creation failed: ${errors.map((error) => error.message).join('; ')}`);
  if (!data.webhookSubscriptionCreate?.webhookSubscription?.id) {
    throw new Error(`Shopify webhook creation returned no subscription for ${topic}.`);
  }
}

/**
 * Idempotently provisions the two shop-specific webhooks VowOS owns. Mandatory
 * privacy/compliance topics are app-specific in Shopify and are handled by
 * dedicated VowOS endpoints but must be subscribed in the Shopify app config.
 */
export async function ensureShopifyWebhookSubscriptions(shop: string, accessToken: string): Promise<void> {
  const baseUrl = webhookBaseUrl();
  const existing = await listShopifyWebhookSubscriptions(shop, accessToken);

  for (const desired of MANAGED_WEBHOOKS) {
    const uri = `${baseUrl}${desired.path}`;
    const exact = existing.find((subscription) => subscription.topic === desired.topic && subscription.uri === uri);
    if (exact) continue;

    // Remove stale VowOS-owned subscriptions for the same topic before creating
    // the canonical URI. Never delete a merchant/app webhook outside our path.
    const stale = existing.filter((subscription) => {
      if (subscription.topic !== desired.topic) return false;
      try {
        return new URL(subscription.uri).pathname.startsWith('/api/shopify/webhooks/');
      } catch {
        return false;
      }
    });
    for (const subscription of stale) {
      await deleteWebhookById(shop, accessToken, subscription.id);
    }
    await createWebhook(shop, accessToken, desired.topic, uri);
  }
}

/** Removes only the shop-specific webhook subscriptions owned by VowOS. */
export async function deleteShopifyWebhookSubscriptions(shop: string, accessToken: string): Promise<void> {
  const baseUrl = webhookBaseUrl();
  const existing = await listShopifyWebhookSubscriptions(shop, accessToken);
  const managedUris = new Set(MANAGED_WEBHOOKS.map((webhook) => `${baseUrl}${webhook.path}`));
  for (const subscription of existing) {
    if (managedUris.has(subscription.uri)) {
      await deleteWebhookById(shop, accessToken, subscription.id);
    }
  }
}

export const SHOPIFY_SCOPES = REQUIRED_SCOPES;
