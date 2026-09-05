/**
 * Shopify webhook subscription lifecycle.
 *
 * Before this module existed nothing in VowOS ever called Shopify's webhooks
 * endpoint. OAuth completed, a token was stored, the UI said "connected" — and
 * Shopify had no subscription to deliver to, so no order ever arrived.
 *
 * Registration is reconciled, not blindly created: Shopify happily accepts the
 * same topic twice and then delivers twice. Every reconnect converges on
 * exactly one subscription per topic pointing at the current callback URL.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ShopifyAdminError, type ShopifyAdminClient } from './admin';

/**
 * Topics VowOS maps. Order matters only for readability.
 *
 * The three compliance topics are mandatory for any app Shopify distributes and
 * are configured in the Partner dashboard rather than the Admin API, so they
 * are listed separately below.
 */
export const SHOPIFY_WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'orders/fulfilled',
  'refunds/create',
  'fulfillments/create',
  'fulfillments/update',
  'products/create',
  'products/update',
  'products/delete',
  'inventory_levels/update',
  'customers/create',
  'customers/update',
  'app/uninstalled',
] as const;

export type ShopifyWebhookTopic = (typeof SHOPIFY_WEBHOOK_TOPICS)[number];

/** Configured in the Shopify Partner dashboard, not via the Admin API. */
export const SHOPIFY_COMPLIANCE_TOPICS = [
  'customers/data_request',
  'customers/redact',
  'shop/redact',
] as const;

const TOPIC_PATHS: Record<string, string> = {
  'orders/create': '/webhooks/orders/create',
  'orders/updated': '/webhooks/orders/updated',
  'orders/cancelled': '/webhooks/orders/cancelled',
  'orders/fulfilled': '/webhooks/orders/fulfilled',
  'refunds/create': '/webhooks/refunds/create',
  'fulfillments/create': '/webhooks/fulfillments/create',
  'fulfillments/update': '/webhooks/fulfillments/update',
  'products/create': '/webhooks/products/update',
  'products/update': '/webhooks/products/update',
  'products/delete': '/webhooks/products/delete',
  'inventory_levels/update': '/webhooks/inventory-levels/update',
  'customers/create': '/webhooks/customers/update',
  'customers/update': '/webhooks/customers/update',
  'app/uninstalled': '/webhooks/app/uninstalled',
  'customers/data_request': '/webhooks/compliance/customers-data-request',
  'customers/redact': '/webhooks/compliance/customers-redact',
  'shop/redact': '/webhooks/compliance/shop-redact',
};

export interface ShopifyWebhookRecord {
  id: string;
  topic: string;
  address: string;
}

export interface ReconcileResult {
  created: string[];
  updated: string[];
  removed: string[];
  failed: Array<{ topic: string; error: string }>;
  callbackBase: string;
}

/**
 * Derives the public webhook base from the configured OAuth redirect URI, which
 * is already validated to end in /api/shopify/callback. Deriving rather than
 * introducing a second env var means the callback and the webhooks can never
 * point at different hosts.
 */
export function webhookCallbackBase(): string | null {
  const explicit = process.env.SHOPIFY_WEBHOOK_CALLBACK_BASE?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI?.trim();
  if (!redirectUri) return null;
  try {
    const url = new URL(redirectUri);
    if (!/\/api\/shopify\/callback\/?$/.test(url.pathname)) return null;
    return `${url.origin}/api/shopify`;
  } catch {
    return null;
  }
}

export function callbackUrlForTopic(topic: string, base?: string | null): string | null {
  const resolvedBase = base ?? webhookCallbackBase();
  const path = TOPIC_PATHS[topic];
  if (!resolvedBase || !path) return null;
  return `${resolvedBase}${path}`;
}

/** Shopify will not deliver to a non-HTTPS address outside of local dev. */
function isDeliverable(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !/^(localhost|127\.|0\.0\.0\.0)/.test(parsed.hostname);
  } catch {
    return false;
  }
}

export async function listShopifyWebhooks(admin: ShopifyAdminClient): Promise<ShopifyWebhookRecord[]> {
  const rows = await admin.paginate<any>('/webhooks.json', 'webhooks', { limit: 250 }, 10);
  return rows.map((row) => ({
    id: String(row.id),
    topic: String(row.topic),
    address: String(row.address ?? ''),
  }));
}

/**
 * Converge Shopify's subscriptions on exactly the topics VowOS handles.
 *
 * - a topic we handle with a stale address is updated in place
 * - a topic we handle with no subscription is created
 * - a duplicate subscription for a handled topic is deleted
 *
 * Subscriptions pointing at an unrelated address are left alone: another app,
 * or the merchant's own integration, may legitimately own them.
 */
export async function reconcileShopifyWebhooks(
  db: SupabaseClient | any,
  admin: ShopifyAdminClient,
  input: { businessId: string; connectionId: string },
): Promise<ReconcileResult> {
  const base = webhookCallbackBase();
  const result: ReconcileResult = { created: [], updated: [], removed: [], failed: [], callbackBase: base ?? '' };

  if (!base) {
    result.failed.push({
      topic: '*',
      error: 'SHOPIFY_OAUTH_REDIRECT_URI is missing or does not end in /api/shopify/callback, so no webhook callback URL can be derived.',
    });
    return result;
  }

  let existing: ShopifyWebhookRecord[];
  try {
    existing = await listShopifyWebhooks(admin);
  } catch (error) {
    result.failed.push({
      topic: '*',
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }

  const persisted: Array<Record<string, unknown>> = [];

  for (const topic of SHOPIFY_WEBHOOK_TOPICS) {
    const desiredAddress = callbackUrlForTopic(topic, base);
    if (!desiredAddress) {
      result.failed.push({ topic, error: 'No callback path is registered for this topic.' });
      continue;
    }
    if (!isDeliverable(desiredAddress)) {
      result.failed.push({
        topic,
        error: `Shopify cannot deliver to "${desiredAddress}" — a public HTTPS host is required.`,
      });
      continue;
    }

    // Ours = same topic and an address on our own callback base. A subscription
    // for this topic owned by a different host belongs to someone else.
    const ours = existing.filter((row) => row.topic === topic && row.address.startsWith(base));
    const [keep, ...duplicates] = ours;

    try {
      let externalId: string;

      if (!keep) {
        const created = await admin.post<any>('/webhooks.json', {
          webhook: { topic, address: desiredAddress, format: 'json' },
        });
        externalId = String(created?.webhook?.id ?? '');
        if (!externalId) throw new Error('Shopify accepted the subscription but returned no webhook id.');
        result.created.push(topic);
      } else if (keep.address !== desiredAddress) {
        const updated = await admin.post<any>(`/webhooks/${keep.id}.json`, {
          webhook: { id: Number(keep.id), address: desiredAddress },
        });
        externalId = String(updated?.webhook?.id ?? keep.id);
        result.updated.push(topic);
      } else {
        externalId = keep.id;
      }

      for (const duplicate of duplicates) {
        try {
          await admin.del(`/webhooks/${duplicate.id}.json`);
          result.removed.push(topic);
        } catch (error) {
          // A duplicate we could not delete causes double delivery, which the
          // per-delivery idempotency guard absorbs. Report, do not fail.
          result.failed.push({
            topic,
            error: `Duplicate subscription ${duplicate.id} could not be removed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }

      persisted.push({
        business_id: input.businessId,
        connection_id: input.connectionId,
        topic,
        external_webhook_id: externalId,
        callback_url: desiredAddress,
        status: 'ACTIVE',
        last_error: null,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed.push({ topic, error: message });

      // A scope-denied topic is expected on a store that has not reauthorized;
      // record it so the ops view shows precisely which topics are dark.
      persisted.push({
        business_id: input.businessId,
        connection_id: input.connectionId,
        topic,
        external_webhook_id: null,
        callback_url: desiredAddress,
        status: error instanceof ShopifyAdminError && error.requiresReauth ? 'SCOPE_DENIED' : 'FAILED',
        last_error: message,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (persisted.length) {
    const { error } = await db
      .from('shopify_webhook_subscriptions')
      .upsert(persisted, { onConflict: 'connection_id,topic' });
    if (error) {
      result.failed.push({ topic: '*', error: `Could not record webhook subscriptions: ${error.message}` });
    }
  }

  return result;
}

/**
 * Best-effort removal on disconnect. If the merchant already uninstalled the
 * app, Shopify has deleted the subscriptions and revoked the token, so failures
 * here are expected and must never block the local disconnect.
 */
export async function removeShopifyWebhooks(
  db: SupabaseClient | any,
  admin: ShopifyAdminClient | null,
  connectionId: string,
): Promise<void> {
  if (admin) {
    try {
      const base = webhookCallbackBase();
      const existing = await listShopifyWebhooks(admin);
      for (const row of existing) {
        if (base && !row.address.startsWith(base)) continue;
        await admin.del(`/webhooks/${row.id}.json`).catch(() => undefined);
      }
    } catch {
      // Token already revoked — nothing to clean up on Shopify's side.
    }
  }

  await db
    .from('shopify_webhook_subscriptions')
    .update({ status: 'REMOVED', updated_at: new Date().toISOString() })
    .eq('connection_id', connectionId);
}

/**
 * True health: a connection is only delivering if every order-critical topic is
 * ACTIVE. Token validity alone is not health, which is why the OAuth callback
 * parks provider_connections at RECOVERING until this says otherwise.
 */
export const ORDER_CRITICAL_TOPICS: readonly string[] = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'refunds/create',
];

export async function connectionDeliveryHealth(
  db: SupabaseClient | any,
  connectionId: string,
): Promise<{ healthy: boolean; active: string[]; missing: string[] }> {
  const { data, error } = await db
    .from('shopify_webhook_subscriptions')
    .select('topic,status')
    .eq('connection_id', connectionId);
  if (error) throw new Error(`Could not read webhook subscriptions: ${error.message}`);

  const active = (data ?? [])
    .filter((row: any) => String(row.status).toUpperCase() === 'ACTIVE')
    .map((row: any) => String(row.topic));

  const missing = ORDER_CRITICAL_TOPICS.filter((topic) => !active.includes(topic));
  return { healthy: missing.length === 0, active, missing };
}
