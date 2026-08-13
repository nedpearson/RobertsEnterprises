/**
 * Deterministic synthetic demo-data generator.
 *
 * The seed controls record shape while the optional anchor date keeps the demo
 * feeling current in production and makes unit tests fully deterministic.
 */

export const PAID_MARKETING_SOURCES = ['Google', 'Facebook', 'Instagram'] as const;
export type PaidMarketingSource = (typeof PAID_MARKETING_SOURCES)[number];
export type DemoLeadSource = PaidMarketingSource | 'Organic' | 'Referral' | 'Website';
export type DemoOrderChannel = 'Shopify' | 'InStore';

export interface DemoCustomer {
  id: string;
  lead_id: string | null;
  name: string;
  email: string;
  phone: string;
  source: DemoLeadSource;
  wedding_date: string;
  stylist: string;
  status: 'Completed' | 'Active';
  spend_cents: number;
  location: string;
  portal_token: string;
  created_at: string;
}

export interface DemoLead {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  source: DemoLeadSource;
  budget_cents: number;
  wedding_date: string;
  stage: 'Appointment Booked' | 'New Inquiry';
  ai_score: number;
  ai_insight: string;
  created_at: string;
}

export interface DemoAppointment {
  id: string;
  customer_id: string;
  lead_id: string | null;
  customer: string;
  source: DemoLeadSource;
  type: string;
  date: string;
  time: string;
  stylist: string;
  status: 'Upcoming' | 'Show' | 'No-Show';
  location: string;
  looking_for: string;
  budget_cents: number;
  fee_paid: boolean;
}

export interface DemoOrder {
  id: string;
  customer_id: string;
  lead_id: string | null;
  source: DemoLeadSource;
  channel: DemoOrderChannel;
  total_cents: number;
  status: 'Paid';
  location: string;
  created_at: string;
}

export interface DemoMarketingChannelMetrics {
  /** Dollar amount retained for backward compatibility with existing UI consumers. */
  spend: number;
  spend_cents: number;
  leads: number;
  appointments: number;
  sales: number;
  revenue_cents: number;
}

export interface RobustDemoData {
  customers: DemoCustomer[];
  leads: DemoLead[];
  appointments: DemoAppointment[];
  orders: DemoOrder[];
  marketingData: Record<PaidMarketingSource, DemoMarketingChannelMetrics>;
  totals: {
    spendCents: number;
    paidLeads: number;
    paidAppointments: number;
    paidSales: number;
    attributedRevenueCents: number;
    shopifyRevenueCents: number;
    inStoreRevenueCents: number;
    cplCents: number;
    cacCents: number;
    roasMultiplier: number;
  };
}

function mulberry32(a: number) {
  return function random() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRobustDemoData(
  seed: number = 12345,
  anchorDate: Date = new Date(),
): RobustDemoData {
  const random = mulberry32(seed);
  const anchorMs = anchorDate.getTime();

  const randRange = (min: number, max: number) =>
    Math.floor(random() * (max - min + 1)) + min;
  const randItem = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const randDate = (startDaysAgo: number, endDaysAgo: number) => {
    const target = new Date(anchorMs - randRange(endDaysAgo, startDaysAgo) * 86_400_000);
    return target.toISOString();
  };

  const locations = ['demo-store-downtown', 'demo-store-northshore', 'demo-store-westside'] as const;
  const stylists = ['Dana Robichaux', 'Eleanor Vance', 'Sarah Jenkins', 'Michael Torres', 'Jessica Alba'] as const;
  const leadSources: readonly DemoLeadSource[] = [
    'Google',
    'Facebook',
    'Instagram',
    'Organic',
    'Referral',
    'Website',
  ];
  const lookingFor = ['A-Line', 'Ballgown', 'Mermaid', 'Sheath', 'Fit and Flare', 'Accessories'] as const;
  const firstNames = ['Emma', 'Avery', 'Mia', 'Sophie', 'Olivia', 'Camille', 'Grace', 'Nora', 'Amelia', 'Claire'] as const;
  const lastNames = ['Carter', 'Landry', 'Bennett', 'Duval', 'Monroe', 'Parker', 'Reed', 'Sullivan', 'Hayes', 'Morgan'] as const;

  const customers: DemoCustomer[] = [];
  const leads: DemoLead[] = [];
  const appointments: DemoAppointment[] = [];
  const orders: DemoOrder[] = [];

  // Generate 500 coherent, cross-linked synthetic customer journeys.
  for (let i = 0; i < 500; i += 1) {
    const idNum = 3000 + i;
    const isLead = random() > 0.4;
    const hasAppt = random() > 0.3;
    const hasSale = hasAppt && random() > 0.4;

    const source = randItem(leadSources);
    const location = randItem(locations);
    const stylist = randItem(stylists);
    const createdDaysAgo = randRange(1, 365);
    const customerId = `C-${idNum}`;
    const leadId = isLead ? `L-${1000 + i}` : null;
    const fullName = `${randItem(firstNames)} ${randItem(lastNames)} ${idNum}`;
    const email = `customer-${idNum}@demo.invalid`;
    const weddingDate = randDate(-30, -400);

    if (leadId) {
      leads.push({
        id: leadId,
        customer_id: customerId,
        name: fullName,
        email,
        source,
        budget_cents: randRange(1500, 5000) * 100,
        wedding_date: weddingDate,
        stage: hasAppt ? 'Appointment Booked' : 'New Inquiry',
        ai_score: randRange(50, 99),
        ai_insight: `Engaged via ${source}.`,
        created_at: randDate(createdDaysAgo, createdDaysAgo),
      });
    }

    customers.push({
      id: customerId,
      lead_id: leadId,
      name: fullName,
      email,
      phone: `(555) ${randRange(100, 999)}-${randRange(1000, 9999)}`,
      source,
      wedding_date: weddingDate,
      stylist,
      status: hasSale ? 'Completed' : 'Active',
      spend_cents: 0,
      location,
      portal_token: `demo-token-${i}`,
      created_at: randDate(createdDaysAgo, createdDaysAgo),
    });

    if (hasAppt) {
      const apptDaysAgo = createdDaysAgo - randRange(1, 14);
      appointments.push({
        id: `A-${5000 + i}`,
        customer_id: customerId,
        lead_id: leadId,
        customer: fullName,
        source,
        type: randItem(['First Fitting', 'Bridal Consultation', 'Accessories']),
        date: randDate(apptDaysAgo, apptDaysAgo).slice(0, 10),
        time: `${randRange(9, 16)}:00`,
        stylist,
        status: apptDaysAgo < 0 ? 'Upcoming' : random() > 0.1 ? 'Show' : 'No-Show',
        location,
        looking_for: randItem(lookingFor),
        budget_cents: randRange(1500, 5000) * 100,
        fee_paid: random() > 0.5,
      });
    }

    if (hasSale) {
      const totalCents = randRange(2000, 8000) * 100;
      const channel: DemoOrderChannel = random() > 0.3 ? 'InStore' : 'Shopify';
      orders.push({
        id: `O-${8000 + i}`,
        customer_id: customerId,
        lead_id: leadId,
        source,
        channel,
        total_cents: totalCents,
        status: 'Paid',
        location,
        created_at: randDate(createdDaysAgo - 15, createdDaysAgo - 15),
      });

      const customer = customers[customers.length - 1];
      customer.spend_cents = totalCents;
    }
  }

  const paidSpendDollars: Record<PaidMarketingSource, number> = {
    Google: 4500,
    Facebook: 3200,
    Instagram: 6000,
  };

  const marketingData = Object.fromEntries(
    PAID_MARKETING_SOURCES.map((source) => {
      const sourceLeads = leads.filter((lead) => lead.source === source);
      const sourceAppointments = appointments.filter((appointment) => appointment.source === source);
      const sourceOrders = orders.filter((order) => order.source === source);
      const spend = paidSpendDollars[source];

      return [
        source,
        {
          spend,
          spend_cents: spend * 100,
          leads: sourceLeads.length,
          appointments: sourceAppointments.length,
          sales: sourceOrders.length,
          revenue_cents: sourceOrders.reduce((sum, order) => sum + order.total_cents, 0),
        },
      ];
    }),
  ) as Record<PaidMarketingSource, DemoMarketingChannelMetrics>;

  const paidSourceSet = new Set<DemoLeadSource>(PAID_MARKETING_SOURCES);
  const paidLeads = leads.filter((lead) => paidSourceSet.has(lead.source));
  const paidAppointments = appointments.filter((appointment) => paidSourceSet.has(appointment.source));
  const paidOrders = orders.filter((order) => paidSourceSet.has(order.source));
  const spendCents = PAID_MARKETING_SOURCES.reduce(
    (sum, source) => sum + marketingData[source].spend_cents,
    0,
  );
  const attributedRevenueCents = paidOrders.reduce((sum, order) => sum + order.total_cents, 0);
  const shopifyRevenueCents = paidOrders
    .filter((order) => order.channel === 'Shopify')
    .reduce((sum, order) => sum + order.total_cents, 0);
  const inStoreRevenueCents = paidOrders
    .filter((order) => order.channel === 'InStore')
    .reduce((sum, order) => sum + order.total_cents, 0);

  return {
    customers,
    leads,
    appointments,
    orders,
    marketingData,
    totals: {
      spendCents,
      paidLeads: paidLeads.length,
      paidAppointments: paidAppointments.length,
      paidSales: paidOrders.length,
      attributedRevenueCents,
      shopifyRevenueCents,
      inStoreRevenueCents,
      cplCents: paidLeads.length > 0 ? Math.round(spendCents / paidLeads.length) : 0,
      cacCents: paidOrders.length > 0 ? Math.round(spendCents / paidOrders.length) : 0,
      roasMultiplier: spendCents > 0 ? Number((attributedRevenueCents / spendCents).toFixed(2)) : 0,
    },
  };
}
