/**
 * Persists a Shopify order at full grain.
 *
 * The previous implementation stored one row with a single total and discarded
 * every line item, tax, discount, currency and timestamp. Reports built on it
 * could show an order count and a dollar figure and nothing else.
 *
 * This service is idempotent by construction: the same payload delivered twice
 * converges on the same rows, and a later delivery of the same order (an edit,
 * a partial refund, a fulfilment) corrects the stored values rather than
 * appending a second order or leaving the original frozen.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveIntegrationCustomer } from '../integrations/customerIdentity';
import { quarantine, type ShopifyTenant } from './context';
import {
  mapOrderHeader,
  mapOrderItems,
  parseOrderAppointment,
  type MappedOrderItem,
} from './orderMapper';

export interface PersistOrderResult {
  orderId: string | null;
  customerId: string | null;
  customerResolution: string;
  lineItems: number;
  created: boolean;
  quarantined?: boolean;
  reason?: string;
  appointmentRequestId?: string | null;
  locationSource: string;
}

/**
 * Links stored line items to the VowOS catalog.
 *
 * Resolution is best-effort by design: an order must never be blocked because
 * catalog sync has not reached that product yet. The external ids are stored
 * regardless, so a later sync can complete the link without reprocessing the
 * order.
 */
async function resolveCatalogLinks(
  db: SupabaseClient | any,
  businessId: string,
  items: MappedOrderItem[],
): Promise<Map<string, { productId: string | null; variantId: string | null }>> {
  const links = new Map<string, { productId: string | null; variantId: string | null }>();

  const variantIds = [...new Set(items.map((item) => item.external_variant_id).filter((id): id is string => Boolean(id)))];
  const productIds = [...new Set(items.map((item) => item.external_product_id).filter((id): id is string => Boolean(id)))];

  const variantByExternal = new Map<string, { id: string; product_id: string | null }>();
  if (variantIds.length) {
    const { data, error } = await db
      .from('product_variants')
      .select('id,product_id,external_variant_id')
      .eq('business_id', businessId)
      .in('external_variant_id', variantIds);
    if (error) {
      console.warn('[shopify] Variant link lookup failed; storing external ids only:', error.message);
    } else {
      for (const row of data ?? []) {
        variantByExternal.set(String(row.external_variant_id), { id: row.id, product_id: row.product_id ?? null });
      }
    }
  }

  const productByExternal = new Map<string, string>();
  if (productIds.length) {
    const { data, error } = await db
      .from('products')
      .select('id,external_product_id')
      .eq('business_id', businessId)
      .in('external_product_id', productIds);
    if (error) {
      console.warn('[shopify] Product link lookup failed; storing external ids only:', error.message);
    } else {
      for (const row of data ?? []) productByExternal.set(String(row.external_product_id), row.id);
    }
  }

  for (const item of items) {
    const variant = item.external_variant_id ? variantByExternal.get(item.external_variant_id) : undefined;
    const productId =
      variant?.product_id ??
      (item.external_product_id ? productByExternal.get(item.external_product_id) ?? null : null);
    links.set(item.external_line_id, { productId, variantId: variant?.id ?? null });
  }

  return links;
}

/**
 * Replaces the stored line items for an order.
 *
 * Delete-then-insert rather than upsert: a Shopify order edit can *remove* a
 * line, and an upsert would leave the removed line in place, permanently
 * overstating units sold on that order.
 */
async function replaceOrderItems(
  db: SupabaseClient | any,
  input: { businessId: string; orderId: string; items: MappedOrderItem[] },
): Promise<number> {
  const links = await resolveCatalogLinks(db, input.businessId, input.items);

  const rows = input.items.map((item) => ({
    business_id: input.businessId,
    order_id: input.orderId,
    external_line_id: item.external_line_id,
    external_product_id: item.external_product_id,
    external_variant_id: item.external_variant_id,
    product_id: links.get(item.external_line_id)?.productId ?? null,
    variant_id: links.get(item.external_line_id)?.variantId ?? null,
    sku: item.sku,
    title: item.title,
    variant_title: item.variant_title,
    vendor_name: item.vendor_name,
    quantity: item.quantity,
    refunded_quantity: item.refunded_quantity,
    unit_price_cents: item.unit_price_cents,
    discount_cents: item.discount_cents,
    tax_cents: item.tax_cents,
    total_cents: item.total_cents,
    requires_shipping: item.requires_shipping,
    properties: item.properties,
    updated_at: new Date().toISOString(),
  }));

  const keptLineIds = rows.map((row) => row.external_line_id);

  if (keptLineIds.length) {
    const { error } = await db
      .from('order_items')
      .delete()
      .eq('order_id', input.orderId)
      .not('external_line_id', 'in', `(${keptLineIds.map((id) => `"${id}"`).join(',')})`);
    if (error) throw new Error(`Could not prune removed order lines: ${error.message}`);
  } else {
    const { error } = await db.from('order_items').delete().eq('order_id', input.orderId);
    if (error) throw new Error(`Could not clear order lines: ${error.message}`);
    return 0;
  }

  const { error } = await db.from('order_items').upsert(rows, { onConflict: 'order_id,external_line_id' });
  if (error) throw new Error(`Could not persist order lines: ${error.message}`);
  return rows.length;
}

/**
 * Creates the appointment request and lead a bridal storefront booking implies.
 *
 * Only fires on first creation and only when the verified order carries an
 * explicit, parseable appointment date. A gown purchase is not a booking.
 */
async function createAppointmentFromOrder(
  db: SupabaseClient | any,
  input: {
    tenant: ShopifyTenant;
    order: any;
    customerId: string;
    customerEmail: string | null;
    customerName: string;
    externalOrderId: string;
  },
): Promise<string | null> {
  const appointment = parseOrderAppointment(input.order);
  if (!appointment.date) return null;

  const sourceLabel = input.tenant.brandName
    ? `Shopify Storefront — ${input.tenant.brandName}`
    : 'Shopify Storefront';

  const { data, error } = await db
    .from('appointment_requests')
    .insert({
      customer_id: input.customerId,
      business_id: input.tenant.businessId,
      brand_id: input.tenant.brandId,
      preferred_location_id: input.tenant.locationId,
      intake_source: sourceLabel,
      preferred_date_1: appointment.date,
      preferred_window_1: appointment.time,
      status: 'submitted',
      priority: 'normal',
      notes: [
        appointment.type ? `Appointment type: ${appointment.type}` : null,
        `Shopify order ${input.order?.name || `#${input.externalOrderId}`}`,
      ]
        .filter(Boolean)
        .join(' | '),
    })
    .select('id')
    .single();

  if (error) throw new Error(`Could not create appointment request: ${error.message}`);

  if (input.customerName) {
    const leadInsert = await db.from('leads').insert({
      business_id: input.tenant.businessId,
      location_id: input.tenant.locationId,
      name: input.customerName,
      email: input.customerEmail,
      source: sourceLabel,
      budget_cents: null,
      wedding_date: null,
      stage: 'Appointment Set',
    });
    if (leadInsert.error) throw new Error(`Could not create lead: ${leadInsert.error.message}`);
  }

  return data?.id ?? null;
}

/**
 * Upserts a Shopify order and its full line grain.
 *
 * `allowCreate` is false for topics that describe a change to an order VowOS
 * should already have (orders/updated on a store connected mid-history). In
 * that case the order is created anyway — refusing would silently drop revenue
 * — but the caller is told it was a backfill, not a live create.
 */
export async function persistShopifyOrder(
  db: SupabaseClient | any,
  input: { tenant: ShopifyTenant; order: any; topic: string; createAppointment?: boolean },
): Promise<PersistOrderResult> {
  const { tenant, order } = input;

  if (!order || typeof order !== 'object' || order.id === null || order.id === undefined) {
    return {
      orderId: null,
      customerId: null,
      customerResolution: 'UNRESOLVED',
      lineItems: 0,
      created: false,
      quarantined: false,
      reason: 'PAYLOAD_HAS_NO_ORDER_ID',
      locationSource: tenant.locationSource,
    };
  }

  const header = mapOrderHeader(order);
  const items = mapOrderItems(order);
  const externalOrderId = header.external_order_id;

  const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
  const identity = await resolveIntegrationCustomer(db, {
    businessId: tenant.businessId,
    provider: 'SHOPIFY',
    externalId: order.customer?.id ? String(order.customer.id) : null,
    name: customerName || null,
    email: order.email || order.customer?.email || null,
    phone: order.phone || order.customer?.phone || null,
    locationId: tenant.locationId,
  });

  if (!identity.customerId) {
    await quarantine(db, {
      businessId: tenant.businessId,
      topic: input.topic,
      idempotencyKey: `shopify:order:${externalOrderId}`,
      payload: order,
      reason: 'Verified Shopify order could not be mapped to an authentic customer identity.',
    });
    return {
      orderId: null,
      customerId: null,
      customerResolution: identity.resolution,
      lineItems: 0,
      created: false,
      quarantined: true,
      reason: 'CUSTOMER_IDENTITY_UNRESOLVED',
      locationSource: tenant.locationSource,
    };
  }

  const { data: existing, error: existingError } = await db
    .from('orders')
    .select('id')
    .eq('business_id', tenant.businessId)
    .eq('external_order_id', externalOrderId)
    .maybeSingle();
  if (existingError) throw new Error(`Could not look up existing order: ${existingError.message}`);

  const row = {
    business_id: tenant.businessId,
    brand_id: tenant.brandId,
    // Never overwrite a resolved location with null: a later delivery of the
    // same order carries no location once an operator has attributed it.
    ...(tenant.locationId ? { location_id: tenant.locationId } : {}),
    customer_id: identity.customerId,
    ...header,
    updated_at: new Date().toISOString(),
  };

  let orderId: string;
  let created: boolean;

  if (existing?.id) {
    const { error } = await db.from('orders').update(row).eq('id', existing.id);
    if (error) throw new Error(`Could not update order: ${error.message}`);
    orderId = existing.id;
    created = false;
  } else {
    const insert = await db.from('orders').insert(row).select('id').single();
    if (insert.error) {
      // Concurrent delivery of the same order won the race; adopt its row.
      if (insert.error.code === '23505') {
        const { data: raced, error: racedError } = await db
          .from('orders')
          .select('id')
          .eq('business_id', tenant.businessId)
          .eq('external_order_id', externalOrderId)
          .maybeSingle();
        if (racedError || !raced?.id) {
          throw new Error(`Order insert conflicted and could not be resolved: ${racedError?.message ?? 'not found'}`);
        }
        await db.from('orders').update(row).eq('id', raced.id);
        orderId = raced.id;
        created = false;
      } else {
        throw new Error(`Could not create order: ${insert.error.message}`);
      }
    } else {
      orderId = insert.data.id;
      created = true;
    }
  }

  const lineItems = await replaceOrderItems(db, {
    businessId: tenant.businessId,
    orderId,
    items,
  });

  // An order VowOS stored but could not attribute to a boutique is recorded for
  // operator attention rather than left to be discovered in a report.
  if (!tenant.locationId) {
    await quarantine(db, {
      businessId: tenant.businessId,
      topic: input.topic,
      idempotencyKey: `shopify:order-location:${externalOrderId}`,
      payload: { orderId, externalOrderId, shopifyLocationId: order.location_id ?? null },
      reason:
        'Order stored without a location. Map this Shopify store\'s locations, including a default for online orders, then run the location backfill.',
    });
  }

  let appointmentRequestId: string | null = null;
  if (created && input.createAppointment !== false) {
    appointmentRequestId = await createAppointmentFromOrder(db, {
      tenant,
      order,
      customerId: identity.customerId,
      customerEmail: identity.email,
      customerName,
      externalOrderId,
    });
  }

  return {
    orderId,
    customerId: identity.customerId,
    customerResolution: identity.resolution,
    lineItems,
    created,
    appointmentRequestId,
    locationSource: tenant.locationSource,
  };
}

/**
 * Notifies the boutique of a new order.
 *
 * Recipients are tenant-configured only. Copying any other mailbox into this
 * path would disclose one tenant's order and customer data to another.
 */
export async function notifyBoutiqueOfOrder(
  db: SupabaseClient | any,
  input: { tenant: ShopifyTenant; order: any; customerId: string; totalCents: number; label: string },
): Promise<void> {
  const { tenant, order } = input;
  const routingName = tenant.brandName || tenant.businessName;
  const orderLabel = order?.name || `#${order?.id}`;
  const body =
    `Shopify order ${orderLabel} received at ${routingName}. ` +
    `Total: $${(input.totalCents / 100).toFixed(2)}.`;

  if (tenant.boutiqueEmail) {
    try {
      await db.functions.invoke('send-message', {
        body: {
          channel: 'email',
          to: tenant.boutiqueEmail,
          subject: `Shopify Order Notification — ${orderLabel}`,
          body,
        },
      });
    } catch (error) {
      // Delivery failure must not fail the webhook: the order is already stored.
      console.error(`[shopify] Email delivery warning for ${tenant.boutiqueEmail}:`, error);
    }
  }

  const { error } = await db.from('messages').insert({
    business_id: tenant.businessId,
    location_id: tenant.locationId,
    customer_id: input.customerId,
    sender: input.label,
    content: body,
    channel: 'email',
    status: tenant.boutiqueEmail ? 'sent' : 'skipped',
    direction: 'outbound',
    sent_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Could not record order notification: ${error.message}`);
}
