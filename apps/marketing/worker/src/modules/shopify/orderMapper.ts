/**
 * Pure Shopify order payload → VowOS row mapping.
 *
 * Deliberately free of database and network access so the mapping itself can be
 * tested against real Shopify payload shapes without a fixture harness. Every
 * function here is total: a malformed field yields a defensible default, never
 * a throw and never a silently wrong number.
 */

// -----------------------------------------------------------------------------
// Money
// -----------------------------------------------------------------------------

/**
 * Shopify sends money as a decimal *string* ("1234.56"). Converting with
 * parseFloat(x) * 100 is not safe: 1234.56 * 100 evaluates to 123455.99999999999
 * in IEEE-754, which rounds to the right answer here and the wrong one for other
 * values. Parsing the string directly avoids the float entirely.
 */
export function toCents(value: unknown): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100);
  }

  const raw = String(value).trim();
  if (!raw) return 0;

  const match = raw.match(/^(-?)(\d*)(?:\.(\d*))?$/);
  if (!match) {
    const fallback = Number.parseFloat(raw);
    return Number.isFinite(fallback) ? Math.round(fallback * 100) : 0;
  }

  const [, sign, wholePart, fractionPart = ''] = match;
  const whole = wholePart || '0';
  // Round at the third decimal rather than truncating: Shopify occasionally
  // emits three-decimal tax amounts on multi-currency orders.
  const cents = fractionPart.padEnd(3, '0').slice(0, 3);
  const base = Number(whole) * 100 + Number(cents.slice(0, 2));
  const rounded = Number(cents[2]) >= 5 ? base + 1 : base;
  return sign === '-' ? -rounded : rounded;
}

/** Shopify money-bag fields: { shop_money: { amount, currency_code } }. */
export function moneyBagToCents(bag: unknown): number {
  if (!bag || typeof bag !== 'object') return 0;
  const record = bag as Record<string, any>;
  const amount = record.shop_money?.amount ?? record.presentment_money?.amount ?? record.amount;
  return toCents(amount);
}

function sumTaxLines(taxLines: unknown): number {
  if (!Array.isArray(taxLines)) return 0;
  return taxLines.reduce((total, line: any) => total + toCents(line?.price), 0);
}

// -----------------------------------------------------------------------------
// Scalars
// -----------------------------------------------------------------------------

const text = (value: unknown, max = 512): string | null => {
  if (typeof value !== 'string') return value === null || value === undefined ? null : String(value).slice(0, max);
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const timestamp = (value: unknown): string | null => {
  const raw = text(value, 64);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const integer = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

/** Shopify tags arrive as a single comma-delimited string. */
export function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 50);
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 50);
}

// -----------------------------------------------------------------------------
// Order header
// -----------------------------------------------------------------------------

export interface MappedOrderHeader {
  external_order_id: string;
  order_number: string | null;
  source_type: 'SHOPIFY';
  currency: string;
  ordered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  status: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  shipping_cents: number;
  refunded_cents: number;
  total_cents: number;
  customer_note: string | null;
  shipping_address: Record<string, unknown> | null;
  source_tags: string[];
  raw_payload: unknown;
  last_synced_at: string;
}

/**
 * Maps the order header.
 *
 * Uses Shopify's `current_*` totals in preference to the originals. The
 * originals are frozen at order creation; after an edit, a partial refund or a
 * removed item they no longer describe the order, and reporting on them
 * overstates revenue indefinitely.
 */
export function mapOrderHeader(order: any): MappedOrderHeader {
  const refundedCents = Array.isArray(order?.refunds)
    ? order.refunds.reduce((total: number, refund: any) => total + sumRefundAmountCents(refund), 0)
    : 0;

  const shippingCents = Array.isArray(order?.shipping_lines) && order.shipping_lines.length
    ? order.shipping_lines.reduce(
        (total: number, line: any) => total + toCents(line?.discounted_price ?? line?.price),
        0,
      )
    : moneyBagToCents(order?.current_total_shipping_price_set ?? order?.total_shipping_price_set);

  return {
    external_order_id: String(order?.id ?? ''),
    order_number: text(order?.name ?? order?.order_number, 64),
    source_type: 'SHOPIFY',
    currency: (text(order?.currency, 8) ?? 'USD').toUpperCase(),
    // processed_at is when the merchant considers the order placed; created_at
    // is when Shopify recorded it. Financial reporting wants the former.
    ordered_at: timestamp(order?.processed_at) ?? timestamp(order?.created_at),
    cancelled_at: timestamp(order?.cancelled_at),
    cancel_reason: text(order?.cancel_reason, 128),
    status: text(order?.financial_status, 64) ?? 'pending',
    financial_status: text(order?.financial_status, 64),
    fulfillment_status: text(order?.fulfillment_status, 64),
    subtotal_cents: toCents(order?.current_subtotal_price ?? order?.subtotal_price),
    tax_cents: toCents(order?.current_total_tax ?? order?.total_tax),
    discount_cents: toCents(order?.current_total_discounts ?? order?.total_discounts),
    shipping_cents: shippingCents,
    refunded_cents: refundedCents,
    total_cents: toCents(order?.current_total_price ?? order?.total_price),
    customer_note: text(order?.note, 2000),
    shipping_address:
      order?.shipping_address && typeof order.shipping_address === 'object' ? order.shipping_address : null,
    source_tags: parseTags(order?.tags),
    raw_payload: order ?? null,
    last_synced_at: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Line items — the sales grain
// -----------------------------------------------------------------------------

export interface MappedOrderItem {
  external_line_id: string;
  external_product_id: string | null;
  external_variant_id: string | null;
  sku: string | null;
  title: string;
  variant_title: string | null;
  vendor_name: string | null;
  quantity: number;
  refunded_quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  requires_shipping: boolean;
  properties: unknown;
}

/**
 * Quantities refunded per line, derived from the order's refund_line_items.
 * Without this a refunded gown still counts as a unit sold forever.
 */
export function refundedQuantitiesByLine(order: any): Map<string, number> {
  const byLine = new Map<string, number>();
  if (!Array.isArray(order?.refunds)) return byLine;

  for (const refund of order.refunds) {
    if (!Array.isArray(refund?.refund_line_items)) continue;
    for (const entry of refund.refund_line_items) {
      const lineId = entry?.line_item_id ?? entry?.line_item?.id;
      if (lineId === null || lineId === undefined) continue;
      const key = String(lineId);
      byLine.set(key, (byLine.get(key) ?? 0) + integer(entry?.quantity, 0));
    }
  }
  return byLine;
}

export function mapOrderItems(order: any): MappedOrderItem[] {
  if (!Array.isArray(order?.line_items)) return [];
  const refunded = refundedQuantitiesByLine(order);

  return order.line_items
    .filter((item: any) => item?.id !== null && item?.id !== undefined)
    .map((item: any): MappedOrderItem => {
      const quantity = Math.max(integer(item?.quantity, 1), 0);
      const unitPriceCents = toCents(item?.price);

      // discount_allocations is authoritative when present; total_discount is
      // the legacy field and misses order-level discounts apportioned to lines.
      const discountCents = Array.isArray(item?.discount_allocations) && item.discount_allocations.length
        ? item.discount_allocations.reduce(
            (total: number, allocation: any) => total + toCents(allocation?.amount),
            0,
          )
        : toCents(item?.total_discount);

      const taxCents = sumTaxLines(item?.tax_lines);

      return {
        external_line_id: String(item.id),
        external_product_id: item?.product_id === null || item?.product_id === undefined ? null : String(item.product_id),
        external_variant_id: item?.variant_id === null || item?.variant_id === undefined ? null : String(item.variant_id),
        sku: text(item?.sku, 128),
        title: text(item?.title, 512) ?? 'Untitled item',
        variant_title: text(item?.variant_title, 512),
        vendor_name: text(item?.vendor, 256),
        quantity,
        refunded_quantity: Math.min(refunded.get(String(item.id)) ?? 0, quantity),
        unit_price_cents: unitPriceCents,
        discount_cents: discountCents,
        tax_cents: taxCents,
        // Line total net of line discounts, exclusive of tax — the figure a
        // merchant recognises as that line's revenue.
        total_cents: unitPriceCents * quantity - discountCents,
        requires_shipping: item?.requires_shipping !== false,
        properties: Array.isArray(item?.properties) ? item.properties : null,
      };
    });
}

// -----------------------------------------------------------------------------
// Refunds
// -----------------------------------------------------------------------------

/**
 * A refund's cash value is the sum of its transactions, not the sum of its line
 * items: a merchant can refund shipping, issue a partial discount, or refund
 * without restocking. Falls back to line items plus adjustments when a refund
 * payload arrives without transactions.
 */
export function sumRefundAmountCents(refund: any): number {
  if (Array.isArray(refund?.transactions) && refund.transactions.length) {
    return refund.transactions
      .filter((transaction: any) => {
        const status = String(transaction?.status ?? '').toLowerCase();
        const kind = String(transaction?.kind ?? '').toLowerCase();
        return kind === 'refund' && (status === 'success' || status === '');
      })
      .reduce((total: number, transaction: any) => total + toCents(transaction?.amount), 0);
  }

  const lineTotal = Array.isArray(refund?.refund_line_items)
    ? refund.refund_line_items.reduce(
        (total: number, entry: any) => total + toCents(entry?.subtotal) + toCents(entry?.total_tax),
        0,
      )
    : 0;

  const adjustments = Array.isArray(refund?.order_adjustments)
    ? refund.order_adjustments.reduce(
        (total: number, adjustment: any) => total + Math.abs(toCents(adjustment?.amount)) + Math.abs(toCents(adjustment?.tax_amount)),
        0,
      )
    : 0;

  return lineTotal + adjustments;
}

export interface MappedRefund {
  external_refund_id: string;
  amount_cents: number;
  currency: string;
  reason: string | null;
  processed_at: string | null;
  external_order_id: string | null;
  raw_payload: unknown;
}

export function mapRefund(refund: any, currency = 'USD'): MappedRefund {
  return {
    external_refund_id: String(refund?.id ?? ''),
    amount_cents: Math.abs(sumRefundAmountCents(refund)),
    currency: currency.toUpperCase(),
    reason: text(refund?.note, 512),
    processed_at: timestamp(refund?.processed_at) ?? timestamp(refund?.created_at),
    external_order_id:
      refund?.order_id === null || refund?.order_id === undefined ? null : String(refund.order_id),
    raw_payload: refund ?? null,
  };
}

// -----------------------------------------------------------------------------
// Appointment extraction
// -----------------------------------------------------------------------------

export interface OrderAppointment {
  date: string | null;
  time: string | null;
  storeKey: string | null;
  type: string | null;
}

/**
 * Bridal storefronts carry appointment intent in line-item properties. A
 * purchase is only an appointment when an explicit, parseable date is present —
 * inferring one from a gown sale would put phantom bookings on the calendar.
 */
export function parseOrderAppointment(order: any): OrderAppointment {
  const result: OrderAppointment = { date: null, time: null, storeKey: null, type: null };
  if (!Array.isArray(order?.line_items)) return result;

  for (const item of order.line_items) {
    if (!result.type && typeof item?.title === 'string' && item.title.trim()) {
      result.type = item.title.trim().slice(0, 256);
    }
    if (!Array.isArray(item?.properties)) continue;

    for (const property of item.properties) {
      const name = String(property?.name ?? '').trim().toLowerCase();
      const value = String(property?.value ?? '').trim();
      if (!value) continue;

      if (!result.date && name.includes('date') && /^20\d{2}-\d{2}-\d{2}$/.test(value)) result.date = value;
      if (!result.time && name.includes('time')) result.time = value.slice(0, 64);
      if (!result.storeKey && (name.includes('store') || name.includes('location'))) {
        result.storeKey = value.slice(0, 128);
      }
    }
  }

  return result;
}

/** Shopify's POS location for the order; null on every online order. */
export function orderLocationId(order: any): string | null {
  if (order?.location_id !== null && order?.location_id !== undefined) return String(order.location_id);
  const fulfillmentLocation = Array.isArray(order?.fulfillments)
    ? order.fulfillments.find((fulfillment: any) => fulfillment?.location_id)
    : null;
  return fulfillmentLocation?.location_id ? String(fulfillmentLocation.location_id) : null;
}

/**
 * Reconciliation check surfaced by the verification query.
 *
 * Shopify's subtotal_price is already net of discounts, so the identity is
 * total = subtotal + tax + shipping. Discounts are stored separately for
 * reporting and must NOT be subtracted again here. A failure means the mapping
 * has drifted from Shopify's arithmetic.
 */
export function headerReconciles(header: MappedOrderHeader, toleranceCents = 1): boolean {
  const computed = header.subtotal_cents + header.tax_cents + header.shipping_cents;
  return Math.abs(computed - header.total_cents) <= toleranceCents;
}
