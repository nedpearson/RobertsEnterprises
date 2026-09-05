/**
 * Order mapping tests.
 *
 * These assert against realistic Shopify payload shapes rather than against
 * injected internal state. The audit that produced this work found a test that
 * proved location mapping worked by writing connection metadata no production
 * code path ever wrote — the feature was dead and the test was green. Every
 * assertion here is on data Shopify actually sends.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  headerReconciles,
  mapOrderHeader,
  mapOrderItems,
  mapRefund,
  orderLocationId,
  parseOrderAppointment,
  parseTags,
  refundedQuantitiesByLine,
  sumRefundAmountCents,
  toCents,
} from '../orderMapper';

/** A two-line bridal order with tax, a line discount, and shipping. */
function bridalOrder(overrides: Record<string, any> = {}) {
  return {
    id: 5001234567890,
    name: '#1042',
    order_number: 1042,
    created_at: '2026-08-30T14:02:11-05:00',
    processed_at: '2026-08-30T14:05:00-05:00',
    currency: 'USD',
    financial_status: 'paid',
    fulfillment_status: null,
    location_id: null,
    note: 'Bride prefers a Saturday fitting.',
    tags: 'bridal, vip , ',
    subtotal_price: '2450.00',
    total_tax: '220.50',
    total_discounts: '150.00',
    // Shopify's subtotal_price is already net of discounts, so the identity is
    // total = subtotal + tax + shipping: 2450.00 + 220.50 + 25.00 = 2695.50.
    total_price: '2695.50',
    current_subtotal_price: '2450.00',
    current_total_tax: '220.50',
    current_total_discounts: '150.00',
    current_total_price: '2695.50',
    shipping_lines: [{ price: '25.00', discounted_price: '25.00' }],
    email: 'bride@example.com',
    customer: { id: 88991122, first_name: 'Ada', last_name: 'Winters', email: 'bride@example.com' },
    shipping_address: { address1: '4 Rue Ave', city: 'Covington', province: 'LA', zip: '70433' },
    line_items: [
      {
        id: 111,
        product_id: 900,
        variant_id: 9001,
        sku: 'MARCHESA-8821-IVORY-10',
        title: 'Marchesa 8821',
        variant_title: 'Ivory / 10',
        vendor: 'Marchesa',
        quantity: 1,
        price: '2200.00',
        total_discount: '0.00',
        requires_shipping: true,
        tax_lines: [{ price: '198.00', rate: 0.09 }],
        properties: [
          { name: 'Appointment Date', value: '2026-09-19' },
          { name: 'Preferred Time', value: '11:00 AM' },
          { name: 'Store', value: 'pc-cov' },
        ],
      },
      {
        id: 112,
        product_id: 901,
        variant_id: 9011,
        sku: 'VEIL-CATHEDRAL-IVORY',
        title: 'Cathedral Veil',
        variant_title: 'Ivory',
        vendor: 'Proper & Co.',
        quantity: 1,
        price: '400.00',
        requires_shipping: true,
        discount_allocations: [{ amount: '150.00' }],
        tax_lines: [{ price: '22.50', rate: 0.09 }],
      },
    ],
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// Money
// -----------------------------------------------------------------------------

test('toCents parses Shopify decimal strings without float drift', () => {
  assert.equal(toCents('1234.56'), 123456);
  assert.equal(toCents('0.99'), 99);
  assert.equal(toCents('5'), 500);
  assert.equal(toCents('.50'), 50);
  assert.equal(toCents('2200.00'), 220000);
  assert.equal(toCents('-45.25'), -4525);
  assert.equal(toCents(''), 0);
  assert.equal(toCents(null), 0);
  assert.equal(toCents(undefined), 0);
});

test('toCents rounds the third decimal rather than truncating it', () => {
  // Shopify emits three-decimal tax amounts on some multi-currency orders.
  assert.equal(toCents('10.005'), 1001);
  assert.equal(toCents('10.004'), 1000);
});

test('toCents never silently produces a wrong integer from float multiplication', () => {
  // The previous implementation was Math.round(parseFloat(x) * 100).
  // These are the values where that approach is most fragile.
  for (const value of ['1.005', '1.015', '8.165', '1234.565']) {
    const mapped = toCents(value);
    assert.ok(Number.isInteger(mapped), `${value} must map to an integer number of cents`);
  }
});

// -----------------------------------------------------------------------------
// Header
// -----------------------------------------------------------------------------

test('mapOrderHeader captures the full financial breakdown, not just a total', () => {
  const header = mapOrderHeader(bridalOrder());

  assert.equal(header.external_order_id, '5001234567890');
  assert.equal(header.order_number, '#1042');
  assert.equal(header.currency, 'USD');
  assert.equal(header.subtotal_cents, 245000);
  assert.equal(header.tax_cents, 22050);
  assert.equal(header.discount_cents, 15000);
  assert.equal(header.shipping_cents, 2500);
  assert.equal(header.total_cents, 269550);
  assert.equal(header.financial_status, 'paid');
  assert.equal(header.customer_note, 'Bride prefers a Saturday fitting.');
  assert.deepEqual(header.source_tags, ['bridal', 'vip']);
  assert.ok(header.shipping_address, 'shipping address must be preserved');
});

test('mapOrderHeader dates the order by processed_at, not by database insert time', () => {
  const header = mapOrderHeader(bridalOrder());
  assert.equal(header.ordered_at, new Date('2026-08-30T14:05:00-05:00').toISOString());
});

test('mapOrderHeader falls back to created_at when processed_at is absent', () => {
  const header = mapOrderHeader(bridalOrder({ processed_at: null }));
  assert.equal(header.ordered_at, new Date('2026-08-30T14:02:11-05:00').toISOString());
});

test('mapOrderHeader prefers current_* totals so edits and partial refunds are reflected', () => {
  // Shopify freezes total_price at creation. An edited order reports the true
  // figure only in current_total_price; reading the original overstates revenue.
  const edited = bridalOrder({
    total_price: '2695.50',
    current_total_price: '2145.50',
    current_subtotal_price: '2050.00',
  });
  const header = mapOrderHeader(edited);
  assert.equal(header.total_cents, 214550);
  assert.equal(header.subtotal_cents, 205000);
});

test('mapOrderHeader components reconcile to the mapped total', () => {
  const header = mapOrderHeader(bridalOrder());
  assert.equal(headerReconciles(header), true);
});

test('mapOrderHeader survives a payload with nothing in it', () => {
  const header = mapOrderHeader({});
  assert.equal(header.total_cents, 0);
  assert.equal(header.currency, 'USD');
  assert.equal(header.ordered_at, null);
  assert.deepEqual(header.source_tags, []);
});

test('parseTags splits Shopify comma-delimited tags and drops blanks', () => {
  assert.deepEqual(parseTags('a, b ,, c'), ['a', 'b', 'c']);
  assert.deepEqual(parseTags(''), []);
  assert.deepEqual(parseTags(null), []);
});

// -----------------------------------------------------------------------------
// Line items — the sales grain
// -----------------------------------------------------------------------------

test('mapOrderItems produces one row per line with SKU, vendor and money', () => {
  const items = mapOrderItems(bridalOrder());
  assert.equal(items.length, 2, 'both line items must be persisted, not discarded');

  const gown = items.find((item) => item.external_line_id === '111');
  assert.ok(gown);
  assert.equal(gown.sku, 'MARCHESA-8821-IVORY-10');
  assert.equal(gown.vendor_name, 'Marchesa');
  assert.equal(gown.external_product_id, '900');
  assert.equal(gown.external_variant_id, '9001');
  assert.equal(gown.quantity, 1);
  assert.equal(gown.unit_price_cents, 220000);
  assert.equal(gown.tax_cents, 19800);
  assert.equal(gown.total_cents, 220000);
});

test('mapOrderItems prefers discount_allocations over the legacy total_discount field', () => {
  // total_discount misses order-level discounts apportioned across lines.
  const veil = mapOrderItems(bridalOrder()).find((item) => item.external_line_id === '112');
  assert.ok(veil);
  assert.equal(veil.discount_cents, 15000);
  assert.equal(veil.total_cents, 40000 - 15000);
});

test('mapOrderItems reports refunded quantity so a returned gown stops counting as sold', () => {
  const withRefund = bridalOrder({
    refunds: [
      {
        id: 777,
        refund_line_items: [{ line_item_id: 111, quantity: 1, subtotal: '2200.00', total_tax: '198.00' }],
        transactions: [{ kind: 'refund', status: 'success', amount: '2398.00' }],
      },
    ],
  });

  const quantities = refundedQuantitiesByLine(withRefund);
  assert.equal(quantities.get('111'), 1);

  const gown = mapOrderItems(withRefund).find((item) => item.external_line_id === '111');
  assert.ok(gown);
  assert.equal(gown.refunded_quantity, 1);
  assert.equal(gown.quantity - gown.refunded_quantity, 0, 'net units sold must be zero after a full line refund');
});

test('mapOrderItems never reports a refunded quantity above the quantity sold', () => {
  const overRefunded = bridalOrder({
    refunds: [{ refund_line_items: [{ line_item_id: 111, quantity: 9 }] }],
  });
  const gown = mapOrderItems(overRefunded).find((item) => item.external_line_id === '111');
  assert.ok(gown);
  assert.equal(gown.refunded_quantity, 1);
});

test('mapOrderItems returns an empty grain rather than throwing on a malformed payload', () => {
  assert.deepEqual(mapOrderItems({}), []);
  assert.deepEqual(mapOrderItems({ line_items: null }), []);
  assert.deepEqual(mapOrderItems({ line_items: [{ title: 'no id' }] }), []);
});

// -----------------------------------------------------------------------------
// Refunds
// -----------------------------------------------------------------------------

test('sumRefundAmountCents uses successful refund transactions as the cash value', () => {
  const amount = sumRefundAmountCents({
    transactions: [
      { kind: 'refund', status: 'success', amount: '500.00' },
      { kind: 'refund', status: 'failure', amount: '900.00' },
      { kind: 'sale', status: 'success', amount: '100.00' },
    ],
  });
  assert.equal(amount, 50000, 'only successful refund transactions count');
});

test('sumRefundAmountCents falls back to line items plus adjustments when no transactions exist', () => {
  const amount = sumRefundAmountCents({
    refund_line_items: [{ subtotal: '400.00', total_tax: '36.00' }],
    order_adjustments: [{ amount: '-25.00', tax_amount: '-2.25' }],
  });
  assert.equal(amount, 40000 + 3600 + 2500 + 225);
});

test('mapRefund carries the order link needed to attach it in VowOS', () => {
  const refund = mapRefund(
    {
      id: 4242,
      order_id: 5001234567890,
      note: 'Sizing exchange',
      processed_at: '2026-09-01T10:00:00Z',
      transactions: [{ kind: 'refund', status: 'success', amount: '2398.00' }],
    },
    'usd',
  );

  assert.equal(refund.external_refund_id, '4242');
  assert.equal(refund.external_order_id, '5001234567890');
  assert.equal(refund.amount_cents, 239800);
  assert.equal(refund.currency, 'USD');
  assert.equal(refund.reason, 'Sizing exchange');
});

// -----------------------------------------------------------------------------
// Appointments and location
// -----------------------------------------------------------------------------

test('parseOrderAppointment extracts a booking only from an explicit ISO date property', () => {
  const appointment = parseOrderAppointment(bridalOrder());
  assert.equal(appointment.date, '2026-09-19');
  assert.equal(appointment.time, '11:00 AM');
  assert.equal(appointment.storeKey, 'pc-cov');
});

test('parseOrderAppointment does not invent a booking from a plain gown sale', () => {
  const plainSale = bridalOrder({
    line_items: [{ id: 111, title: 'Marchesa 8821', quantity: 1, price: '2200.00' }],
  });
  assert.equal(parseOrderAppointment(plainSale).date, null);
});

test('parseOrderAppointment ignores a non-ISO date value rather than guessing a format', () => {
  const ambiguous = bridalOrder({
    line_items: [
      { id: 111, title: 'Fitting', quantity: 1, price: '0.00', properties: [{ name: 'Date', value: '09/19/2026' }] },
    ],
  });
  assert.equal(parseOrderAppointment(ambiguous).date, null);
});

test('orderLocationId is null for an online order, which is why a default mapping is required', () => {
  assert.equal(orderLocationId(bridalOrder()), null);
  assert.equal(orderLocationId(bridalOrder({ location_id: 7788 })), '7788');
});

test('orderLocationId falls back to a fulfillment location when the order carries none', () => {
  const fulfilled = bridalOrder({ location_id: null, fulfillments: [{ location_id: 9911 }] });
  assert.equal(orderLocationId(fulfilled), '9911');
});
