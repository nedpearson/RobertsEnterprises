import { describe, expect, it } from 'vitest';
import { generateRobustDemoData, PAID_MARKETING_SOURCES } from './demoDataGenerator';

describe('generateRobustDemoData', () => {
  const anchor = new Date('2026-08-13T12:00:00.000Z');

  it('is deterministic for a fixed seed and anchor date', () => {
    const first = generateRobustDemoData(12345, anchor);
    const second = generateRobustDemoData(12345, anchor);

    expect(second).toEqual(first);
  });

  it('keeps lead, appointment, order, and customer lineage connected', () => {
    const data = generateRobustDemoData(12345, anchor);
    const customerIds = new Set(data.customers.map((customer) => customer.id));
    const leadIds = new Set(data.leads.map((lead) => lead.id));

    for (const lead of data.leads) {
      expect(customerIds.has(lead.customer_id)).toBe(true);
    }

    for (const appointment of data.appointments) {
      expect(customerIds.has(appointment.customer_id)).toBe(true);
      if (appointment.lead_id) expect(leadIds.has(appointment.lead_id)).toBe(true);
    }

    for (const order of data.orders) {
      expect(customerIds.has(order.customer_id)).toBe(true);
      if (order.lead_id) expect(leadIds.has(order.lead_id)).toBe(true);
    }
  });

  it('reconciles paid marketing totals to underlying source records', () => {
    const data = generateRobustDemoData(12345, anchor);
    const paidSources = new Set(PAID_MARKETING_SOURCES);
    const paidLeads = data.leads.filter((lead) => paidSources.has(lead.source as (typeof PAID_MARKETING_SOURCES)[number]));
    const paidAppointments = data.appointments.filter((appointment) =>
      paidSources.has(appointment.source as (typeof PAID_MARKETING_SOURCES)[number]),
    );
    const paidOrders = data.orders.filter((order) =>
      paidSources.has(order.source as (typeof PAID_MARKETING_SOURCES)[number]),
    );

    const spendCents = PAID_MARKETING_SOURCES.reduce(
      (sum, source) => sum + data.marketingData[source].spend_cents,
      0,
    );
    const revenueCents = paidOrders.reduce((sum, order) => sum + order.total_cents, 0);
    const shopifyRevenueCents = paidOrders
      .filter((order) => order.channel === 'Shopify')
      .reduce((sum, order) => sum + order.total_cents, 0);
    const inStoreRevenueCents = paidOrders
      .filter((order) => order.channel === 'InStore')
      .reduce((sum, order) => sum + order.total_cents, 0);

    expect(data.totals.spendCents).toBe(spendCents);
    expect(data.totals.paidLeads).toBe(paidLeads.length);
    expect(data.totals.paidAppointments).toBe(paidAppointments.length);
    expect(data.totals.paidSales).toBe(paidOrders.length);
    expect(data.totals.attributedRevenueCents).toBe(revenueCents);
    expect(data.totals.shopifyRevenueCents).toBe(shopifyRevenueCents);
    expect(data.totals.inStoreRevenueCents).toBe(inStoreRevenueCents);
    expect(shopifyRevenueCents + inStoreRevenueCents).toBe(revenueCents);
    expect(data.totals.cplCents).toBe(Math.round(spendCents / paidLeads.length));
    expect(data.totals.cacCents).toBe(Math.round(spendCents / paidOrders.length));
    expect(data.totals.roasMultiplier).toBe(Number((revenueCents / spendCents).toFixed(2)));
  });

  it('keeps synthetic records clearly non-production', () => {
    const data = generateRobustDemoData(12345, anchor);

    expect(data.customers).toHaveLength(500);
    expect(data.customers.every((customer) => customer.email.endsWith('@demo.invalid'))).toBe(true);
    expect(data.customers.every((customer) => customer.portal_token.startsWith('demo-token-'))).toBe(true);
  });
});
