import { Router, Request, Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveStore, isStoreKey } from '../scheduling/publicIntake';
import { requireGrowthAccess, growthContextOf } from '../growth/auth';
import { saveTokens } from '../growth/store';
import {
  buildShopifyAuthorizationUrl,
  exchangeShopifyCode,
  missingScopes,
  normalizeShopDomain,
  readShopifyOAuthConfig,
  readShopifyWebhookSecret,
  requestedScopes,
  shopifyStoreOverrideStatus,
  signShopifyState,
  verifyShopifyCallbackHmac,
  verifyShopifyShop,
  verifyShopifyState,
} from './oauth';
import { markShopifyConnectionError, upsertShopifyConnection } from './store';
import {
  resolveShopifyTenant,
  shopifyWebhook,
  verifyShopifyWebhookHmac,
  ShopifyConnectionInactiveError,
  ShopifyTenantUnresolvedError,
  normalizeHeaderDomain,
  type ShopifyTenant,
} from './context';
import { createLocationMappingRouter } from './locations';
import { adminClientForConnection } from './admin';
import {
  connectionDeliveryHealth,
  reconcileShopifyWebhooks,
  removeShopifyWebhooks,
  webhookCallbackBase,
  SHOPIFY_COMPLIANCE_TOPICS,
  SHOPIFY_WEBHOOK_TOPICS,
} from './webhookRegistry';
import { backfillShopifyOrders, syncShopifyCatalog } from './catalogSync';
import { persistShopifyOrder } from './orderService';
import {
  handleAppUninstalled,
  handleComplianceRequest,
  handleCustomerUpsert,
  handleFulfillment,
  handleInventoryLevelUpdate,
  handleOrderCancelled,
  handleOrderCreate,
  handleOrderFulfilled,
  handleOrderUpdated,
  handleProductDelete,
  handleProductUpsert,
  handleRefundCreate,
} from './handlers';
import { orderLocationId } from './orderMapper';

// -----------------------------------------------------------------------------
// Re-exports.
//
// These names were previously defined in this file. Keeping them exported here
// means existing imports and tests continue to resolve after the refactor.
// -----------------------------------------------------------------------------
export {
  resolveShopifyTenant,
  verifyShopifyWebhookHmac,
  ShopifyConnectionInactiveError,
  ShopifyTenantUnresolvedError,
};

let defaultDbClient: SupabaseClient | null = null;
function getShopifyDb(): SupabaseClient {
  if (defaultDbClient) return defaultDbClient;
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Shopify worker database configuration is incomplete.');
  defaultDbClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return defaultDbClient;
}

export const shopifyRouter = Router();

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const metadataBrandId = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).brandId;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

// =============================================================================
// Diagnostics
// =============================================================================

shopifyRouter.get('/setup/status', (_req, res) => {
  const redirectUri = process.env.SHOPIFY_OAUTH_REDIRECT_URI ?? null;
  const redirectUriValid = Boolean(redirectUri && /\/api\/shopify\/callback\/?$/.test(redirectUri));
  const overrideStatus = shopifyStoreOverrideStatus();
  const callbackBase = webhookCallbackBase();

  const checks = [
    { key: 'SHOPIFY_CLIENT_ID', ok: Boolean(process.env.SHOPIFY_CLIENT_ID) },
    { key: 'SHOPIFY_CLIENT_SECRET', ok: Boolean(process.env.SHOPIFY_CLIENT_SECRET) },
    { key: 'SHOPIFY_OAUTH_REDIRECT_URI', ok: Boolean(redirectUri) },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { key: 'SHOPIFY_STORE_CONFIGS_JSON', ok: !overrideStatus.invalid },
    { key: 'SHOPIFY_WEBHOOK_CALLBACK_BASE', ok: Boolean(callbackBase) },
  ];
  const missing = checks.filter((check) => !check.ok).map((check) => check.key);
  const ready = missing.length === 0 && redirectUriValid;

  return res.status(ready ? 200 : 503).json({
    ready,
    missing,
    redirectUri,
    redirectUriValid,
    expectedRedirectPath: '/api/shopify/callback',
    webhookCallbackBase: callbackBase,
    registeredTopics: SHOPIFY_WEBHOOK_TOPICS,
    complianceTopics: SHOPIFY_COMPLIANCE_TOPICS,
    requestedScopes: requestedScopes(),
    storeOverrides: overrideStatus.configuredStores,
    storeOverridesValid: !overrideStatus.invalid,
  });
});

/**
 * True integration health for the active tenant.
 *
 * A valid token is not health. This reports whether Shopify actually holds
 * subscriptions for the order-critical topics, whether the granted scopes cover
 * what VowOS needs, and whether locations are mapped — the three things that
 * silently disable the mapping.
 */
shopifyRouter.get('/health', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const db = getShopifyDb();

  try {
    const { data: connections, error } = await db
      .from('growth_provider_connections')
      .select('id,status,display_name,metadata,scopes,last_error,external_account_id')
      .eq('business_id', businessId)
      .eq('provider', 'shopify');
    if (error) throw new Error(error.message);

    const report: Array<Record<string, unknown>> = [];
    for (const connection of (connections ?? []) as any[]) {
      const shopDomain = typeof connection.metadata?.shopDomain === 'string' ? connection.metadata.shopDomain : null;
      const delivery = await connectionDeliveryHealth(db, connection.id);

      const { count: mappingCount } = await db
        .from('shopify_location_mappings')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('connection_id', connection.id);

      const { count: unattributedOrders } = await db
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('source_type', 'SHOPIFY')
        .is('location_id', null);

      const scopeGaps = missingScopes(connection.scopes);

      // Two tables describe one connection: growth_provider_connections is the
      // source of truth for webhook routing, provider_connections drives the
      // Integration Operations view. They are written separately and nothing
      // enforces agreement, so drift is reported rather than left to be
      // discovered as "webhooks work but the dashboard says broken".
      let mirrorDrift: string | null = null;
      if (connection.external_account_id) {
        const { data: mirror } = await db
          .from('provider_connections')
          .select('status,auth_state,health_status')
          .eq('business_id', businessId)
          .eq('provider', 'shopify')
          .eq('provider_account_id', connection.external_account_id)
          .maybeSingle();

        if (!mirror) {
          mirrorDrift = 'No Integration Operations record exists for this connection. Reconnect, or re-run webhook reconciliation, to recreate it.';
        } else {
          const mirrorActive = String(mirror.status ?? '').toLowerCase() === 'active';
          const primaryConnected = String(connection.status ?? '').toLowerCase() === 'connected';
          if (mirrorActive !== primaryConnected) {
            mirrorDrift = `Integration Operations reports "${mirror.status}" while the Shopify connection is "${connection.status}".`;
          } else if (primaryConnected && delivery.healthy && mirror.health_status === 'RECOVERING') {
            mirrorDrift = 'Integration Operations still reports RECOVERING although webhook delivery is confirmed. Re-run webhook reconciliation to refresh it.';
          }
        }
      }

      report.push({
        connectionId: connection.id,
        shop: shopDomain,
        displayName: connection.display_name,
        status: connection.status,
        lastError: connection.last_error,
        receivingWebhooks: delivery.healthy,
        activeTopics: delivery.active,
        missingTopics: delivery.missing,
        missingScopes: scopeGaps,
        locationsMapped: mappingCount ?? 0,
        unattributedOrders: unattributedOrders ?? 0,
        mirrorDrift,
        healthy:
          connection.status === 'connected' &&
          delivery.healthy &&
          scopeGaps.length === 0 &&
          (mappingCount ?? 0) > 0 &&
          !mirrorDrift,
      });
    }

    return res.json({ connections: report });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// =============================================================================
// OAuth
// =============================================================================

shopifyRouter.get('/connect', requireGrowthAccess, async (req, res) => {
  const shop = normalizeShopDomain(asString(req.query.shop) ?? '');
  if (!shop) {
    return res.status(400).json({
      code: 'INVALID_SHOP_DOMAIN',
      error: 'Enter the permanent .myshopify.com store domain or Shopify Admin store URL.',
    });
  }

  const config = readShopifyOAuthConfig(shop);
  if (!config) {
    return res.status(503).json({
      code: 'SHOPIFY_NOT_CONFIGURED',
      error: 'Shopify OAuth is not configured for this store.',
    });
  }

  const { businessId, userId } = growthContextOf(req);
  const requestedBrandId = asString(req.query.brandId);
  const db = getShopifyDb();

  try {
    const { data: brandData, error: brandError } = await db
      .from('business_brands')
      .select('id,name')
      .eq('business_id', businessId)
      .order('name');
    if (brandError) throw new Error(`Could not resolve brand context: ${brandError.message}`);

    const brands = (brandData ?? []) as Array<{ id: string; name: string }>;
    let brandId = requestedBrandId;
    let brandName: string | null = null;

    if (brandId) {
      const brand = brands.find((candidate) => candidate.id === brandId);
      if (!brand) {
        return res.status(403).json({
          code: 'INVALID_BRAND_CONTEXT',
          error: 'The selected brand does not belong to the active organization.',
        });
      }
      brandName = brand.name;
    } else if (brands.length === 1) {
      brandId = brands[0].id;
      brandName = brands[0].name;
    } else if (brands.length > 1) {
      return res.status(409).json({
        code: 'BRAND_CONTEXT_REQUIRED',
        error: 'Select the exact brand before connecting Shopify. VowOS will not guess among multiple brands.',
        brands,
      });
    }

    const { data: existingRows, error: existingError } = await db
      .from('growth_provider_connections')
      .select('id,business_id,display_name,metadata')
      .eq('provider', 'shopify')
      .ilike('metadata->>shopDomain', shop)
      .limit(2);
    if (existingError) throw new Error(`Could not verify existing Shopify binding: ${existingError.message}`);

    const otherTenant = (existingRows ?? []).find((row: any) => row.business_id && row.business_id !== businessId);
    if (otherTenant) {
      return res.status(409).json({
        code: 'SHOP_ALREADY_BOUND_TO_ANOTHER_ORGANIZATION',
        error: 'This Shopify store is already assigned to another VowOS organization.',
      });
    }

    const conflict = (existingRows ?? []).find((row: any) => {
      const existingBrandId = metadataBrandId(row.metadata);
      return existingBrandId && brandId && existingBrandId !== brandId;
    });
    if (conflict) {
      return res.status(409).json({
        code: 'SHOP_ALREADY_BOUND_TO_ANOTHER_BRAND',
        error: 'This Shopify store is already assigned to another VowOS brand.',
      });
    }

    const state = signShopifyState({
      businessId,
      userId,
      shop,
      brandId: brandId || undefined,
      issuedAt: Date.now(),
      purpose: 'shopify_connect',
    });

    return res.json({
      url: buildShopifyAuthorizationUrl(config, shop, state),
      shop,
      brandId: brandId || null,
      brandName,
      scopes: requestedScopes(),
    });
  } catch (error) {
    return res.status(500).json({
      code: 'SHOPIFY_CONNECT_FAILED',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

shopifyRouter.delete('/disconnect', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const requestedShop = normalizeShopDomain(asString(req.query.shop) ?? '');
  const db = getShopifyDb();

  let query = db
    .from('growth_provider_connections')
    .select('id,external_account_id,metadata')
    .eq('business_id', businessId)
    .eq('provider', 'shopify');
  if (requestedShop) query = query.ilike('metadata->>shopDomain', requestedShop);

  const { data: connections, error } = await query.limit(2);
  if (error) return res.status(500).json({ error: `Could not resolve Shopify connection: ${error.message}` });
  const matching = connections ?? [];
  if (!matching.length) return res.json({ success: true, alreadyDisconnected: true });
  if (matching.length > 1) {
    return res.status(409).json({ error: 'More than one Shopify store is connected. Specify the permanent shop domain.' });
  }

  const connection = matching[0];
  const shopDomain = typeof connection.metadata?.shopDomain === 'string' ? connection.metadata.shopDomain : null;

  // Remove Shopify's subscriptions before destroying the token, otherwise the
  // store keeps delivering to an endpoint that can no longer resolve it.
  if (shopDomain) {
    try {
      const admin = await adminClientForConnection(db, { id: connection.id, shopDomain });
      await removeShopifyWebhooks(db, admin, connection.id);
    } catch {
      await removeShopifyWebhooks(db, null, connection.id);
    }
  } else {
    await removeShopifyWebhooks(db, null, connection.id);
  }

  const secretDelete = await db.from('growth_provider_secrets').delete().eq('connection_id', connection.id);
  if (secretDelete.error) return res.status(500).json({ error: `Could not remove Shopify credentials: ${secretDelete.error.message}` });

  const connectionUpdate = await db
    .from('growth_provider_connections')
    .update({ status: 'disconnected', last_error: null, last_sync_status: null })
    .eq('id', connection.id);
  if (connectionUpdate.error) return res.status(500).json({ error: `Could not mark Shopify disconnected: ${connectionUpdate.error.message}` });

  if (connection.external_account_id) {
    await db
      .from('provider_connections')
      .update({ status: 'disconnected', auth_state: 'REAUTH_REQUIRED', health_status: 'ACTION_REQUIRED' })
      .eq('business_id', businessId)
      .eq('provider', 'shopify')
      .eq('provider_account_id', connection.external_account_id);
  }

  return res.json({ success: true });
});

async function syncRecoveryConnection(
  db: SupabaseClient | any,
  input: {
    businessId: string;
    brandId?: string;
    accountId: string;
    shopDomain: string;
    displayName?: string;
    receivingWebhooks: boolean;
  },
): Promise<void> {
  const { data: existing, error } = await db
    .from('provider_connections')
    .select('id')
    .eq('business_id', input.businessId)
    .eq('provider', 'shopify')
    .eq('provider_account_id', input.accountId)
    .limit(2);
  if (error) throw new Error(`Could not synchronize Integration Operations: ${error.message}`);
  if ((existing ?? []).length > 1) throw new Error('Duplicate Shopify provider_connections rows require repair before reconnecting.');

  const patch = {
    business_id: input.businessId,
    brand_id: input.brandId ?? null,
    provider: 'shopify',
    provider_account_id: input.accountId,
    status: 'active',
    // OAuth proves the credential is authorized. HEALTHY additionally requires
    // that Shopify holds live subscriptions for the order-critical topics —
    // reconcileShopifyWebhooks is what proves that, so it gates this value.
    health_status: input.receivingWebhooks ? 'HEALTHY' : 'RECOVERING',
    circuit_breaker_state: 'CLOSED',
    auth_state: 'AUTHORIZED',
    last_error_message: null,
    reconnect_url: null,
    metadata: { shopDomain: input.shopDomain, displayName: input.displayName ?? null },
  };

  if (existing?.[0]?.id) {
    const update = await db.from('provider_connections').update(patch).eq('id', existing[0].id);
    if (update.error) throw new Error(`Could not update Integration Operations: ${update.error.message}`);
  } else {
    const insert = await db.from('provider_connections').insert(patch);
    if (insert.error) throw new Error(`Could not create Integration Operations record: ${insert.error.message}`);
  }
}

shopifyRouter.get('/callback', async (req, res) => {
  const appUrl = process.env.PUBLIC_APP_URL || 'https://vowos.bridgebox.ai';
  const state = asString(req.query.state);
  const code = asString(req.query.code);
  const returnedShop = normalizeShopDomain(asString(req.query.shop) ?? '');
  const config = returnedShop ? readShopifyOAuthConfig(returnedShop) : null;

  const redirect = (ok: boolean, error?: string, brandId?: string, shop?: string, warning?: string) => {
    const destination = new URL('/settings', appUrl);
    destination.searchParams.set('tab', 'integrations');
    destination.searchParams.set('shopify', ok ? 'connected' : 'failed');
    if (error) destination.searchParams.set('error', error);
    if (warning) destination.searchParams.set('warning', warning);
    if (brandId) destination.searchParams.set('brandId', brandId);
    if (shop) destination.searchParams.set('shop', shop);
    return destination.toString();
  };

  if (!state || !code || !returnedShop || !config) {
    return res.redirect(redirect(false, 'Missing or invalid Shopify authorization details.'));
  }
  if (!verifyShopifyCallbackHmac(req.query as Record<string, unknown>, config.clientSecret)) {
    return res.redirect(redirect(false, 'Shopify callback signature validation failed.'));
  }

  const payload = verifyShopifyState(state);
  if (!payload || payload.shop !== returnedShop) {
    return res.redirect(redirect(false, 'The Shopify authorization state is invalid or expired.'));
  }

  try {
    const db = getShopifyDb();
    if (payload.brandId) {
      const { data: brand, error: brandError } = await db
        .from('business_brands')
        .select('id')
        .eq('id', payload.brandId)
        .eq('business_id', payload.businessId)
        .maybeSingle();
      if (brandError) throw new Error(`Could not verify Shopify brand ownership: ${brandError.message}`);
      if (!brand) throw new Error('The selected VowOS brand no longer belongs to this organization.');
    }

    const tokens = await exchangeShopifyCode(config, returnedShop, code);
    const shop = await verifyShopifyShop(returnedShop, tokens.accessToken);
    const canonicalShopDomain = normalizeHeaderDomain(shop.myshopify_domain);
    if (!canonicalShopDomain) throw new Error('Shopify returned an invalid permanent shop domain.');

    const { data: globalBindings, error: globalError } = await db
      .from('growth_provider_connections')
      .select('id,business_id,metadata')
      .eq('provider', 'shopify')
      .eq('external_account_id', shop.id)
      .limit(2);
    if (globalError) throw new Error(`Could not verify Shopify account binding: ${globalError.message}`);
    const foreignBinding = (globalBindings ?? []).find((row: any) => row.business_id !== payload.businessId);
    if (foreignBinding) throw new Error('This Shopify account is already bound to another VowOS organization.');

    const existing = (globalBindings ?? []).find((row: any) => row.business_id === payload.businessId);
    const existingBrandId = metadataBrandId(existing?.metadata);
    if (existingBrandId && payload.brandId && existingBrandId !== payload.brandId) {
      throw new Error('This Shopify account is already assigned to a different VowOS brand.');
    }

    const metadata: Record<string, unknown> = { shopDomain: canonicalShopDomain };
    if (payload.brandId) metadata.brandId = payload.brandId;

    const grantedScopes = tokens.scope.length ? tokens.scope : requestedScopes();

    const connection = await upsertShopifyConnection(payload.businessId, shop.id, {
      status: 'connected',
      external_account_id: shop.id,
      display_name: shop.name,
      connected_by: payload.userId,
      connected_at: new Date().toISOString(),
      last_error: null,
      scopes: grantedScopes,
      metadata,
    } as never);

    await saveTokens(connection.id, {
      accessToken: tokens.accessToken,
      refreshToken: null,
      tokenType: 'shopify-offline',
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      scope: grantedScopes.join(' '),
    });

    // Register webhooks. Without this step the store is authorized and silent —
    // which is exactly the state the integration was in before this existed.
    let receivingWebhooks = false;
    let warning: string | undefined;
    try {
      const admin = await adminClientForConnection(db, { id: connection.id, shopDomain: canonicalShopDomain });
      const reconciled = await reconcileShopifyWebhooks(db, admin, {
        businessId: payload.businessId,
        connectionId: connection.id,
      });
      const health = await connectionDeliveryHealth(db, connection.id);
      receivingWebhooks = health.healthy;
      if (!health.healthy) {
        warning = `Connected, but Shopify is not yet delivering: ${health.missing.join(', ')}. ${
          reconciled.failed.map((entry) => `${entry.topic}: ${entry.error}`).join(' | ')
        }`.trim();
      }
    } catch (error) {
      warning = `Connected, but webhook registration failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }

    await syncRecoveryConnection(db, {
      businessId: payload.businessId,
      brandId: payload.brandId,
      accountId: shop.id,
      shopDomain: canonicalShopDomain,
      displayName: shop.name,
      receivingWebhooks,
    });

    return res.redirect(redirect(true, undefined, payload.brandId, canonicalShopDomain, warning));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markShopifyConnectionError(payload.businessId, returnedShop, message).catch(() => undefined);
    return res.redirect(redirect(false, message, payload.brandId, returnedShop));
  }
});

// =============================================================================
// Operator actions
// =============================================================================

async function tenantForActiveBusiness(
  db: SupabaseClient,
  businessId: string,
  shop?: string | null,
): Promise<ShopifyTenant> {
  let query = db
    .from('growth_provider_connections')
    .select('metadata')
    .eq('business_id', businessId)
    .eq('provider', 'shopify')
    .eq('status', 'connected');
  const normalized = shop ? normalizeShopDomain(shop) : null;
  if (normalized) query = query.ilike('metadata->>shopDomain', normalized);

  const { data, error } = await query.limit(2);
  if (error) throw new Error(`Could not resolve Shopify connection: ${error.message}`);
  const rows = (data ?? []) as Array<{ metadata: any }>;
  if (rows.length === 0) throw new Error('No connected Shopify store for this organization.');
  if (rows.length > 1) throw new Error('More than one Shopify store is connected. Specify the permanent shop domain.');

  const shopDomain = typeof rows[0].metadata?.shopDomain === 'string' ? rows[0].metadata.shopDomain : '';
  if (!shopDomain) throw new Error('The Shopify connection has no stored shop domain.');

  return resolveShopifyTenant(db, shopDomain);
}

/** Re-registers webhooks for an existing connection without a full reconnect. */
shopifyRouter.post('/webhooks/reconcile', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const db = getShopifyDb();
  try {
    const tenant = await tenantForActiveBusiness(db, businessId, req.body?.shop);
    const admin = await adminClientForConnection(db, {
      id: tenant.connectionId,
      shopDomain: tenant.shopDomain,
    });
    const result = await reconcileShopifyWebhooks(db, admin, {
      businessId,
      connectionId: tenant.connectionId,
    });
    const health = await connectionDeliveryHealth(db, tenant.connectionId);
    return res.json({ ...result, receivingWebhooks: health.healthy, missingTopics: health.missing });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/** Real catalog + inventory sync. Reports the counts it actually wrote. */
shopifyRouter.post('/sync/catalog', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const db = getShopifyDb();
  try {
    const tenant = await tenantForActiveBusiness(db, businessId, req.body?.shop);
    const summary = await syncShopifyCatalog(db, tenant, {
      includeInventory: req.body?.includeInventory !== false,
    });
    return res.json(summary);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

/** Historical order backfill through the same persistence path as webhooks. */
shopifyRouter.post('/sync/orders', requireGrowthAccess, async (req, res) => {
  const { businessId } = growthContextOf(req);
  const db = getShopifyDb();
  try {
    const tenant = await tenantForActiveBusiness(db, businessId, req.body?.shop);
    const since = asString(req.body?.since) ?? undefined;

    const result = await backfillShopifyOrders(
      db,
      tenant,
      async (order) => {
        // Attribute each backfilled order to its own Shopify location where the
        // payload names one, exactly as the live webhook path does.
        const perOrderTenant = await resolveShopifyTenant(db, tenant.shopDomain, {
          shopifyLocationId: orderLocationId(order),
        });
        await persistShopifyOrder(db, {
          tenant: perOrderTenant,
          order,
          topic: 'backfill/orders',
          createAppointment: false,
        });
      },
      { since },
    );

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Location mapping surface (list, save, backfill).
shopifyRouter.use('/mappings', createLocationMappingRouter(getShopifyDb));

// =============================================================================
// Webhooks
//
// Every route below runs the same verification prologue from context.ts:
// HMAC over the raw body, tenant resolution from the verified shop domain,
// per-delivery idempotency, then the handler.
// =============================================================================

shopifyRouter.post(
  '/webhooks/orders/create',
  shopifyWebhook(getShopifyDb, 'orders/create', handleOrderCreate, { locationIdOf: orderLocationId }),
);

shopifyRouter.post(
  '/webhooks/orders/updated',
  shopifyWebhook(getShopifyDb, 'orders/updated', handleOrderUpdated, { locationIdOf: orderLocationId }),
);

shopifyRouter.post(
  '/webhooks/orders/cancelled',
  shopifyWebhook(getShopifyDb, 'orders/cancelled', handleOrderCancelled, { locationIdOf: orderLocationId }),
);

shopifyRouter.post(
  '/webhooks/orders/fulfilled',
  shopifyWebhook(getShopifyDb, 'orders/fulfilled', handleOrderFulfilled, { locationIdOf: orderLocationId }),
);

shopifyRouter.post('/webhooks/refunds/create', shopifyWebhook(getShopifyDb, 'refunds/create', handleRefundCreate));

shopifyRouter.post(
  '/webhooks/fulfillments/create',
  shopifyWebhook(getShopifyDb, 'fulfillments/create', handleFulfillment),
);

shopifyRouter.post(
  '/webhooks/fulfillments/update',
  shopifyWebhook(getShopifyDb, 'fulfillments/update', handleFulfillment),
);

shopifyRouter.post('/webhooks/products/update', shopifyWebhook(getShopifyDb, 'products/update', handleProductUpsert));
shopifyRouter.post('/webhooks/products/delete', shopifyWebhook(getShopifyDb, 'products/delete', handleProductDelete));

shopifyRouter.post(
  '/webhooks/inventory-levels/update',
  shopifyWebhook(getShopifyDb, 'inventory_levels/update', handleInventoryLevelUpdate),
);

shopifyRouter.post('/webhooks/customers/update', shopifyWebhook(getShopifyDb, 'customers/update', handleCustomerUpsert));

shopifyRouter.post('/webhooks/app/uninstalled', shopifyWebhook(getShopifyDb, 'app/uninstalled', handleAppUninstalled));

/**
 * Compliance topics.
 *
 * HMAC-verified like every other topic, but deliberately tenant-optional:
 * Shopify sends shop/redact up to 48 hours *after* uninstall, when the
 * connection is already gone, and treats any non-2xx as a compliance failure.
 */
function complianceRoute(topic: string) {
  return async (req: Request, res: Response): Promise<Response> => {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256') || req.get('x-shopify-hmac-sha256');
    const shopDomainHeader = req.get('X-Shopify-Shop-Domain') || req.get('x-shopify-shop-domain');
    if (!shopDomainHeader) return res.status(400).json({ error: 'Missing X-Shopify-Shop-Domain header.' });

    const secret = readShopifyWebhookSecret(shopDomainHeader);
    if (!verifyShopifyWebhookHmac((req as any).rawBody, hmacHeader, secret)) {
      return res.status(401).json({ error: 'Unauthorized: invalid or missing Shopify webhook signature.' });
    }

    const shopDomain = normalizeHeaderDomain(shopDomainHeader) ?? shopDomainHeader.trim().toLowerCase();
    try {
      const result = await handleComplianceRequest(getShopifyDb(), { topic, shopDomain, payload: req.body });
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error(`[shopify:${topic}] Compliance handling failed:`, error);
      // Still 200: Shopify records a non-2xx as a compliance failure, and the
      // request is preserved in the delivery log regardless.
      return res.status(200).json({ success: true, recorded: false });
    }
  };
}

shopifyRouter.post('/webhooks/compliance/customers-data-request', complianceRoute('customers/data_request'));
shopifyRouter.post('/webhooks/compliance/customers-redact', complianceRoute('customers/redact'));
shopifyRouter.post('/webhooks/compliance/shop-redact', complianceRoute('shop/redact'));

/**
 * Legacy store-key resolution, retained for the scheduling intake path.
 *
 * Store keys refine a location; they can never select an organization. Exported
 * so the scheduling module keeps its existing behaviour without reaching into
 * the webhook internals.
 */
export async function resolveStoreKeyLocation(
  db: SupabaseClient | any,
  businessId: string,
  brandId: string | null,
  storeKey?: string,
): Promise<string | null> {
  if (!storeKey || !isStoreKey(storeKey)) return null;
  const resolved = await resolveStore(db, storeKey);
  if (resolved.businessId !== businessId) {
    throw new Error('Shopify store/location mapping conflicts with the OAuth-bound organization.');
  }
  if (brandId && resolved.brandId && resolved.brandId !== brandId) {
    throw new Error('Shopify store/location mapping points to another brand.');
  }
  return resolved.locationId;
}
