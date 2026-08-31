import { normalizeShopDomain } from './oauth';

const SHOPIFY_API_VERSION = '2026-07';
const SHOPIFY_TIMEOUT_MS = 12_000;

export type ShopifyWebhookSubscription = {
  id: string;
  topic: string;
  uri: string;
};

type ShopifyGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

function callbackUri(redirectUri: string): string {
  const parsed = new URL(redirectUri);
  if (parsed.protocol !== 'https:') {
    throw new Error('Shopify webhook delivery requires an HTTPS callback origin.');
  }
  return new URL('/api/shopify/webhooks/orders/create', parsed.origin).toString();
}
async function shopifyGraphql<T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<T> {
  const shop = normalizeShopDomain(shopDomain);
  if (!shop) throw new Error('Cannot configure webhooks for an invalid Shopify shop domain.');

  const response = await fetchImpl(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(SHOPIFY_TIMEOUT_MS),
  });
  const payload = await response.json() as ShopifyGraphqlResponse<T>;
  if (!response.ok || payload.errors?.length || !payload.data) {
    const detail = payload.errors?.map((error) => error.message).filter(Boolean).join('; ') || `HTTP ${response.status}`;
    throw new Error(`Shopify webhook configuration failed: ${detail}`);
  }
  return payload.data;
}

/**
 * Ensure the shop-specific order webhook exists before a connection can be
 * presented as healthy. Shopify owns delivery retries; VowOS owns idempotent
 * processing and tenant routing at the callback.
 */
export async function ensureShopifyOrderWebhook(
  shopDomain: string,
  accessToken: string,
  redirectUri: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyWebhookSubscription> {
  const uri = callbackUri(redirectUri);
  const listed = await shopifyGraphql<{
    webhookSubscriptions: { nodes: ShopifyWebhookSubscription[] };
  }>(shopDomain, accessToken, `
    query VowosWebhookSubscriptions {
      webhookSubscriptions(first: 100) {
        nodes { id topic uri }
      }
    }
  `, {}, fetchImpl);

  const existing = listed.webhookSubscriptions.nodes.find((subscription) =>
    subscription.topic === 'ORDERS_CREATE' && subscription.uri === uri,
  );
  if (existing) return existing;

  const created = await shopifyGraphql<{
    webhookSubscriptionCreate: {
      webhookSubscription: ShopifyWebhookSubscription | null;
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>(shopDomain, accessToken, `
    mutation CreateVowosOrderWebhook($topic: WebhookSubscriptionTopic!, $subscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $subscription) {
        webhookSubscription { id topic uri }
        userErrors { field message }
      }
    }
  `, {
    topic: 'ORDERS_CREATE',
    subscription: { uri },
  }, fetchImpl);

  const result = created.webhookSubscriptionCreate;
  if (result.userErrors.length || !result.webhookSubscription) {
    const detail = result.userErrors.map((error) => error.message).join('; ') || 'Shopify returned no subscription.';
    throw new Error(`Shopify rejected the VowOS order webhook: ${detail}`);
  }
  return result.webhookSubscription;
}
