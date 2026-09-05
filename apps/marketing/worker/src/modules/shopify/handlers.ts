/**
 * Topic handlers.
 *
 * Each handler receives an already-authenticated, already-tenant-resolved,
 * already-deduplicated request from shopifyWebhook() in context.ts and does
 * nothing but map data. No handler re-implements HMAC or tenant routing.
 *
 * Throwing from a handler returns 500 and Shopify retries. Returning normally
 * returns 200 and Shopify stops. Handlers therefore throw only for transient
 * failures and return for anything a retry cannot fix.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveIntegrationCustomer } from '../integrations/customerIdentity';
import { quarantine, type ShopifyWebhookRequest } from './context';
import { mapOrderHeader, mapRefund, orderLocationId, toCents } from './orderMapper';
import { notifyBoutiqueOfOrder, persistShopifyOrder } from './orderService';
import { upsertShopifyProduct, applyInventoryLevel, deleteShopifyProduct } from './catalogSync';

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------

export async function handleOrderCreate(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const result = await persistShopifyOrder(ctx.db, {
    tenant: ctx.tenant,
    order: ctx.payload,
    topic: ctx.topic,
    createAppointment: true,
  });

  if (result.quarantined || !result.orderId) {
    return { quarantined: result.quarantined ?? false, reason: result.reason };
  }

  const header = mapOrderHeader(ctx.payload);
  await notifyBoutiqueOfOrder(ctx.db, {
    tenant: ctx.tenant,
    order: ctx.payload,
    customerId: result.customerId as string,
    totalCents: header.total_cents,
    label: ctx.tenant.brandName ? `Shopify Storefront — ${ctx.tenant.brandName}` : 'Shopify Storefront',
  });

  return {
    orderId: result.orderId,
    customerId: result.customerId,
    customerResolution: result.customerResolution,
    lineItems: result.lineItems,
    appointmentRequestId: result.appointmentRequestId ?? null,
    locationSource: result.locationSource,
    businessId: ctx.tenant.businessId,
    brandId: ctx.tenant.brandId,
    locationId: ctx.tenant.locationId,
  };
}

/**
 * orders/updated fires on edits, payment capture, fulfilment and partial
 * refunds. It re-persists the whole order rather than patching fields, so the
 * stored grain always matches Shopify exactly. No appointment or lead is
 * created — those belong to the original booking, not to every later change.
 */
export async function handleOrderUpdated(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const result = await persistShopifyOrder(ctx.db, {
    tenant: ctx.tenant,
    order: ctx.payload,
    topic: ctx.topic,
    createAppointment: false,
  });

  return {
    orderId: result.orderId,
    lineItems: result.lineItems,
    created: result.created,
    quarantined: result.quarantined ?? false,
    reason: result.reason,
  };
}

export async function handleOrderCancelled(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const result = await persistShopifyOrder(ctx.db, {
    tenant: ctx.tenant,
    order: ctx.payload,
    topic: ctx.topic,
    createAppointment: false,
  });

  if (!result.orderId) return { quarantined: result.quarantined ?? false, reason: result.reason };

  const header = mapOrderHeader(ctx.payload);
  const { error } = await ctx.db
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: header.cancelled_at ?? new Date().toISOString(),
      cancel_reason: header.cancel_reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', result.orderId);
  if (error) throw new Error(`Could not mark order cancelled: ${error.message}`);

  return { orderId: result.orderId, cancelled: true };
}

// -----------------------------------------------------------------------------
// Refunds
// -----------------------------------------------------------------------------

/**
 * Records a Shopify refund against its order.
 *
 * refunds.payment_id was NOT NULL and Shopify orders never produce a payments
 * row, so before the accompanying migration a Shopify refund could not be
 * recorded at all. The refund now targets the order directly.
 */
export async function handleRefundCreate(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const refundPayload = ctx.payload;
  const externalOrderId = refundPayload?.order_id ? String(refundPayload.order_id) : null;

  if (!externalOrderId || !refundPayload?.id) {
    return { ignored: true, reason: 'REFUND_PAYLOAD_INCOMPLETE' };
  }

  const { data: order, error: orderError } = await ctx.db
    .from('orders')
    .select('id,currency,refunded_cents')
    .eq('business_id', ctx.tenant.businessId)
    .eq('external_order_id', externalOrderId)
    .maybeSingle();
  if (orderError) throw new Error(`Could not resolve refunded order: ${orderError.message}`);

  if (!order?.id) {
    // The order predates the connection or was never delivered. Park the refund
    // so it can be applied once the order is backfilled.
    await quarantine(ctx.db, {
      businessId: ctx.tenant.businessId,
      topic: ctx.topic,
      idempotencyKey: `shopify:refund:${refundPayload.id}`,
      payload: refundPayload,
      reason: `Refund received for order ${externalOrderId}, which is not present in VowOS. Backfill the order, then replay.`,
    });
    return { quarantined: true, reason: 'ORDER_NOT_FOUND', externalOrderId };
  }

  const refund = mapRefund(refundPayload, order.currency ?? 'USD');

  const { error: refundError } = await ctx.db.from('refunds').upsert(
    {
      business_id: ctx.tenant.businessId,
      order_id: order.id,
      payment_id: null,
      external_refund_id: refund.external_refund_id,
      amount_cents: refund.amount_cents,
      currency: refund.currency,
      reason: refund.reason,
      status: 'completed',
      processed_at: refund.processed_at ?? new Date().toISOString(),
      raw_payload: refund.raw_payload,
    },
    { onConflict: 'business_id,external_refund_id' },
  );
  if (refundError) throw new Error(`Could not record refund: ${refundError.message}`);

  // Recompute the order's refunded total from stored refunds rather than
  // incrementing: increments double-count on a redelivered webhook.
  const { data: allRefunds, error: sumError } = await ctx.db
    .from('refunds')
    .select('amount_cents')
    .eq('business_id', ctx.tenant.businessId)
    .eq('order_id', order.id);
  if (sumError) throw new Error(`Could not total refunds for order: ${sumError.message}`);

  const refundedCents = (allRefunds ?? []).reduce(
    (total: number, row: any) => total + Math.abs(Number(row.amount_cents) || 0),
    0,
  );

  const { error: updateError } = await ctx.db
    .from('orders')
    .update({ refunded_cents: refundedCents, updated_at: new Date().toISOString() })
    .eq('id', order.id);
  if (updateError) throw new Error(`Could not update order refund total: ${updateError.message}`);

  // Refunded quantities live on the order payload, so the line grain is only
  // corrected when orders/updated follows. Shopify always sends it.
  return {
    orderId: order.id,
    refundId: refund.external_refund_id,
    amountCents: refund.amount_cents,
    orderRefundedCents: refundedCents,
  };
}

// -----------------------------------------------------------------------------
// Fulfilment
// -----------------------------------------------------------------------------

export async function handleFulfillment(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const fulfillment = ctx.payload;
  const externalOrderId = fulfillment?.order_id ? String(fulfillment.order_id) : null;
  if (!externalOrderId) return { ignored: true, reason: 'FULFILLMENT_HAS_NO_ORDER' };

  const { data: order, error } = await ctx.db
    .from('orders')
    .select('id')
    .eq('business_id', ctx.tenant.businessId)
    .eq('external_order_id', externalOrderId)
    .maybeSingle();
  if (error) throw new Error(`Could not resolve fulfilled order: ${error.message}`);
  if (!order?.id) return { ignored: true, reason: 'ORDER_NOT_FOUND', externalOrderId };

  const status =
    typeof fulfillment?.status === 'string' && fulfillment.status.trim()
      ? fulfillment.status.trim().toLowerCase()
      : 'fulfilled';

  const { error: updateError } = await ctx.db
    .from('orders')
    .update({ fulfillment_status: status, updated_at: new Date().toISOString() })
    .eq('id', order.id);
  if (updateError) throw new Error(`Could not update fulfillment status: ${updateError.message}`);

  return { orderId: order.id, fulfillmentStatus: status };
}

/** orders/fulfilled carries the whole order, so re-persist the grain. */
export async function handleOrderFulfilled(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const result = await persistShopifyOrder(ctx.db, {
    tenant: ctx.tenant,
    order: ctx.payload,
    topic: ctx.topic,
    createAppointment: false,
  });
  return { orderId: result.orderId, lineItems: result.lineItems };
}

// -----------------------------------------------------------------------------
// Customers
// -----------------------------------------------------------------------------

/**
 * Keeps the VowOS customer record current with Shopify.
 *
 * Runs through the same identity resolver the order path uses, so a customer
 * created here and a customer created by an order converge on one record rather
 * than producing a duplicate.
 */
export async function handleCustomerUpsert(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const customer = ctx.payload;
  if (!customer?.id) return { ignored: true, reason: 'CUSTOMER_PAYLOAD_INCOMPLETE' };

  const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  const identity = await resolveIntegrationCustomer(ctx.db, {
    businessId: ctx.tenant.businessId,
    provider: 'SHOPIFY',
    externalId: String(customer.id),
    name: name || null,
    email: customer.email || null,
    phone: customer.phone || customer.default_address?.phone || null,
    locationId: ctx.tenant.locationId,
  });

  if (!identity.customerId) {
    // A Shopify customer with neither email nor phone cannot be identified.
    // Creating a placeholder record would corrupt the customer list.
    return { ignored: true, reason: 'CUSTOMER_IDENTITY_UNRESOLVED' };
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (identity.email) patch.email = identity.email;
  if (identity.phone) patch.phone = identity.phone;
  if (name) patch.name = name.slice(0, 256);

  const { error } = await ctx.db
    .from('customers')
    .update(patch)
    .eq('id', identity.customerId)
    .eq('business_id', ctx.tenant.businessId);
  if (error) throw new Error(`Could not update customer: ${error.message}`);

  return { customerId: identity.customerId, resolution: identity.resolution };
}

// -----------------------------------------------------------------------------
// Catalog and inventory
// -----------------------------------------------------------------------------

export async function handleProductUpsert(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const summary = await upsertShopifyProduct(ctx.db, ctx.tenant, ctx.payload);
  return summary as unknown as Record<string, unknown>;
}

export async function handleProductDelete(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const externalProductId = ctx.payload?.id ? String(ctx.payload.id) : null;
  if (!externalProductId) return { ignored: true, reason: 'PRODUCT_PAYLOAD_INCOMPLETE' };
  const archived = await deleteShopifyProduct(ctx.db, ctx.tenant.businessId, externalProductId);
  return { externalProductId, archived };
}

/**
 * inventory_levels/update carries inventory_item_id + location_id + available.
 * It does not carry a variant, so the variant is resolved through the stored
 * external_inventory_item_id that catalog sync recorded.
 */
export async function handleInventoryLevelUpdate(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const level = ctx.payload;
  const inventoryItemId = level?.inventory_item_id ? String(level.inventory_item_id) : null;
  const shopifyLocationId = level?.location_id ? String(level.location_id) : null;

  if (!inventoryItemId || !shopifyLocationId) {
    return { ignored: true, reason: 'INVENTORY_PAYLOAD_INCOMPLETE' };
  }

  const applied = await applyInventoryLevel(ctx.db, ctx.tenant, {
    inventoryItemId,
    shopifyLocationId,
    available: Number.isFinite(Number(level?.available)) ? Math.trunc(Number(level.available)) : 0,
  });

  return applied as unknown as Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// App lifecycle
// -----------------------------------------------------------------------------

/**
 * The merchant uninstalled the app. Shopify has already revoked the token and
 * deleted every webhook, so the only correct action is to stop claiming the
 * store is connected and to destroy the dead credential.
 */
export async function handleAppUninstalled(ctx: ShopifyWebhookRequest): Promise<Record<string, unknown>> {
  const now = new Date().toISOString();

  const { data: connections, error } = await ctx.db
    .from('growth_provider_connections')
    .select('id,external_account_id')
    .eq('business_id', ctx.tenant.businessId)
    .eq('provider', 'shopify')
    .ilike('metadata->>shopDomain', ctx.shopDomain);
  if (error) throw new Error(`Could not resolve connection for uninstall: ${error.message}`);

  for (const connection of (connections ?? []) as Array<{ id: string; external_account_id: string | null }>) {
    await ctx.db.from('growth_provider_secrets').delete().eq('connection_id', connection.id);

    await ctx.db
      .from('growth_provider_connections')
      .update({
        status: 'disconnected',
        last_error: 'The Shopify app was uninstalled from this store.',
        last_sync_status: null,
      })
      .eq('id', connection.id);

    await ctx.db
      .from('shopify_webhook_subscriptions')
      .update({ status: 'REMOVED', updated_at: now })
      .eq('connection_id', connection.id);

    if (connection.external_account_id) {
      await ctx.db
        .from('provider_connections')
        .update({
          status: 'disconnected',
          auth_state: 'REAUTH_REQUIRED',
          health_status: 'ACTION_REQUIRED',
          last_error_message: 'The Shopify app was uninstalled from this store.',
        })
        .eq('business_id', ctx.tenant.businessId)
        .eq('provider', 'shopify')
        .eq('provider_account_id', connection.external_account_id);
    }
  }

  return { disconnected: (connections ?? []).length };
}

// -----------------------------------------------------------------------------
// Compliance (GDPR/CCPA) — mandatory for any distributed Shopify app
// -----------------------------------------------------------------------------

/**
 * These three topics are HMAC-verified like any other but must respond 200 even
 * for a shop VowOS has no connection to: Shopify treats a non-2xx as a
 * compliance failure. Each request is recorded so a human can act on it inside
 * the statutory window; nothing is silently auto-deleted.
 */
export async function handleComplianceRequest(
  db: SupabaseClient | any,
  input: { topic: string; shopDomain: string; payload: any },
): Promise<Record<string, unknown>> {
  const { data: connection } = await db
    .from('growth_provider_connections')
    .select('id,business_id')
    .eq('provider', 'shopify')
    .ilike('metadata->>shopDomain', input.shopDomain)
    .limit(1)
    .maybeSingle();

  const businessId = connection?.business_id ?? null;
  const subjectId =
    input.payload?.customer?.id !== undefined && input.payload?.customer?.id !== null
      ? String(input.payload.customer.id)
      : input.payload?.shop_id !== undefined && input.payload?.shop_id !== null
        ? String(input.payload.shop_id)
        : String(Date.now());

  const { error } = await db.from('integration_dlq_events').insert({
    business_id: businessId,
    provider: 'shopify',
    event_type: input.topic,
    idempotency_key: `shopify:compliance:${input.topic}:${input.shopDomain}:${subjectId}`,
    payload: input.payload ?? {},
    headers: {},
    error_message:
      `Shopify compliance request "${input.topic}" for ${input.shopDomain}. ` +
      'Requires operator action within the statutory window; VowOS does not action data requests automatically.',
    status: 'PENDING',
  });

  if (error && error.code !== '23505') {
    console.error(`[shopify:${input.topic}] Could not record compliance request:`, error.message);
  }

  return { recorded: true, topic: input.topic, businessId, subjectId };
}

/** Money helper re-exported for the reconciliation endpoint. */
export { toCents, orderLocationId };
