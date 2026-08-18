import { generateRobustDemoData } from './demoDataGenerator';
import { growthDemoSeed, buildDemoTouchpoints } from './growthDemoSeed';

type TableName = string;
type Row = Record<string, any>;
type Filter = (row: Row) => boolean;

type DemoResult<T = any> = {
  error: null | { message: string };
  data: T;
};

const DAY = 86_400_000;
const robustData = generateRobustDemoData(12345);
const nowIso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
const todayIso = (offsetDays = 0) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

const defaultSeedData: Record<TableName, any[]> = {
  customers: [
    ...robustData.customers,
    {
      id: 'C-3001',
      name: 'Emma Carter',
      email: 'emma.carter@example.com',
      phone: '(555) 123-4567',
      wedding_date: '2027-04-15',
      stylist: 'Dana Robichaux',
      status: 'Active',
      spend_cents: 120000,
      location: 'demo-store-downtown',
      portal_token: 'demo-token-1',
      created_at: nowIso(-5 * DAY),
    },
    {
      id: 'C-3002',
      name: 'Sophia Taylor',
      email: 'sophia.t@example.com',
      phone: '(555) 987-6543',
      wedding_date: '2027-09-10',
      stylist: 'Dana Robichaux',
      status: 'Active',
      spend_cents: 0,
      location: 'demo-store-downtown',
      portal_token: 'demo-token-2',
      created_at: nowIso(-2 * DAY),
    },
    {
      id: 'C-3003',
      name: 'Olivia Martinez',
      email: 'olivia.m@example.com',
      phone: '(555) 456-7890',
      wedding_date: '2027-11-20',
      stylist: 'Eleanor Vance',
      status: 'Active',
      spend_cents: 450000,
      location: 'demo-store-northshore',
      portal_token: 'demo-token-3',
      created_at: nowIso(-15 * DAY),
    },
  ],
  leads: [
    ...robustData.leads,
    {
      id: 'L-1001',
      name: 'Isabella Scott',
      email: 'iscott@example.com',
      source: 'Instagram',
      budget_cents: 300000,
      wedding_date: '2028-02-14',
      stage: 'New Inquiry',
      ai_score: 95,
      ai_insight: 'High engagement. Interacted with 3 posts.',
      created_at: nowIso(-DAY),
    },
    {
      id: 'L-1002',
      name: 'Mia Nelson',
      email: 'mia.nelson@example.com',
      source: 'Website',
      budget_cents: 250000,
      wedding_date: '2027-10-05',
      stage: 'Contacted',
      ai_score: 75,
      ai_insight: 'Replied to automated SMS.',
      created_at: nowIso(-3 * DAY),
    },
  ],
  appointments: [
    ...robustData.appointments,
    {
      id: 'A-5001',
      customer: 'Emma Carter',
      type: 'First Fitting',
      date: todayIso(),
      time: '1:00 PM',
      stylist: 'Dana Robichaux',
      status: 'Confirmed',
      location: 'demo-store-downtown',
      looking_for: 'A-Line',
      budget_cents: 200000,
      fee_paid: true,
    },
    {
      id: 'A-5002',
      customer: 'Sophia Taylor',
      type: 'Bridal Consultation',
      date: todayIso(),
      time: '3:30 PM',
      stylist: 'Dana Robichaux',
      status: 'Pending',
      location: 'demo-store-downtown',
      looking_for: 'Ballgown',
      budget_cents: 350000,
      fee_paid: false,
    },
    {
      id: 'A-5003',
      customer: 'Olivia Martinez',
      type: 'Accessory Styling',
      date: todayIso(1),
      time: '10:00 AM',
      stylist: 'Eleanor Vance',
      status: 'Confirmed',
      location: 'demo-store-northshore',
      looking_for: 'Veil',
      budget_cents: 50000,
      fee_paid: true,
    },
  ],
  invoices: [
    {
      id: 'INV-8001',
      customer: 'Emma Carter',
      description: 'Vera Wang Katherine Gown (Deposit)',
      amount_cents: 240000,
      paid_cents: 120000,
      due_date: todayIso(14),
      status: 'Partial',
      location: 'demo-store-downtown',
      pay_token: 'tok-demo-1',
    },
    {
      id: 'INV-8002',
      customer: 'Olivia Martinez',
      description: 'Monique Lhuillier Bliss Gown (Paid in Full)',
      amount_cents: 450000,
      paid_cents: 450000,
      due_date: todayIso(-2),
      status: 'Paid',
      location: 'demo-store-northshore',
      pay_token: 'tok-demo-2',
    },
  ],
  purchase_orders: [
    {
      id: 'PO-1001',
      vendor: 'Maggie Sottero',
      items: '3x Style 521',
      amount_cents: 150000,
      ordered: todayIso(-30),
      expected_delivery: todayIso(5),
      status: 'In Production',
      location: 'demo-store-downtown',
      assigned_staff: 'Priya Kulkarni',
      assigned_customer: '',
      notes: '',
    },
  ],
  gowns: [
    {
      id: 'G-2001',
      name: 'Katherine',
      designer: 'Vera Wang',
      style: 'VW-100',
      size: '10',
      color: 'Ivory',
      price_cents: 350000,
      stock: 2,
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1594552072238-18e6e5f8f828?auto=format&fit=crop&w=400&q=80',
      location: 'demo-store-downtown',
      sku: 'VW-100-10-IV',
      cost_cents: 175000,
      msrp_cents: 350000,
      category: 'Bridal Gown',
      condition: 'New',
      vendor: 'Vera Wang',
      reorder_point: 1,
      notes: '',
    },
    {
      id: 'G-2002',
      name: 'Bliss',
      designer: 'Monique Lhuillier',
      style: 'ML-200',
      size: '12',
      color: 'White',
      price_cents: 450000,
      stock: 1,
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1595995252062-8408a0d0d8ac?auto=format&fit=crop&w=400&q=80',
      location: 'demo-store-northshore',
      sku: 'ML-200-12-WH',
      cost_cents: 225000,
      msrp_cents: 450000,
      category: 'Bridal Gown',
      condition: 'New',
      vendor: 'Monique Lhuillier',
      reorder_point: 1,
      notes: '',
    },
  ],
  transfers: [
    {
      id: 'TR-9001',
      gown_id: 'G-2002',
      gown_name: 'Bliss (Monique Lhuillier)',
      from_location: 'demo-store-northshore',
      to_location: 'demo-store-downtown',
      qty: 1,
      status: 'In Transit',
      requested: nowIso(-DAY),
      received: null,
      note: 'Transfer for Emma Carter fitting',
    },
  ],
  messages: [
    {
      id: 'MSG-DEMO-001',
      customer: 'Emma Carter',
      channel: 'sms',
      to_address: '(555) 123-4567',
      subject: null,
      body: 'Hi Emma! Your first fitting is confirmed for today at 1:00 PM. We cannot wait to see you.',
      kind: 'confirmation',
      status: 'sent',
      error: null,
      created_at: nowIso(-26 * 60 * 60 * 1000),
      direction: 'outbound',
      sentiment: 'positive',
    },
    {
      id: 'MSG-DEMO-002',
      customer: 'Emma Carter',
      channel: 'sms',
      to_address: '(555) 123-4567',
      subject: null,
      body: 'Perfect, thank you! I am bringing the shoes I plan to wear.',
      kind: 'general',
      status: 'sent',
      error: null,
      created_at: nowIso(-25 * 60 * 60 * 1000),
      direction: 'inbound',
      sentiment: 'positive',
    },
    {
      id: 'MSG-DEMO-003',
      customer: 'Sophia Taylor',
      channel: 'ig',
      to_address: '@sophia_t_wedding',
      subject: null,
      body: 'Hi! I saw the new ballgowns on Instagram. Do you have anything around my $3,500 budget?',
      kind: 'general',
      status: 'sent',
      error: null,
      created_at: nowIso(-6 * 60 * 60 * 1000),
      direction: 'inbound',
      sentiment: 'anxious',
    },
    {
      id: 'MSG-DEMO-004',
      customer: 'Sophia Taylor',
      channel: 'ig',
      to_address: '@sophia_t_wedding',
      subject: null,
      body: 'Absolutely. We have several options in that range and can have them ready for your consultation this afternoon.',
      kind: 'general',
      status: 'sent',
      error: null,
      created_at: nowIso(-5.5 * 60 * 60 * 1000),
      direction: 'outbound',
      sentiment: 'positive',
    },
    {
      id: 'MSG-DEMO-005',
      customer: 'Olivia Martinez',
      channel: 'email',
      to_address: 'olivia.m@example.com',
      subject: 'Your accessories appointment',
      body: 'Olivia, your accessory styling appointment is tomorrow at 10:00 AM. Your veil options are ready.',
      kind: 'reminder',
      status: 'sent',
      error: null,
      created_at: nowIso(-3 * 60 * 60 * 1000),
      direction: 'outbound',
      sentiment: 'neutral',
    },
    {
      id: 'MSG-DEMO-006',
      customer: 'Olivia Martinez',
      channel: 'email',
      to_address: 'olivia.m@example.com',
      subject: 'Re: Your accessories appointment',
      body: 'Thank you. I would also love to see earrings that work with the veil.',
      kind: 'general',
      status: 'sent',
      error: null,
      created_at: nowIso(-2.5 * 60 * 60 * 1000),
      direction: 'inbound',
      sentiment: 'positive',
    },
  ],
  measurements: [
    {
      id: 'MEAS-DEMO-001',
      bride_id: 'C-3001',
      customer: 'Emma Carter',
      taken_on: todayIso(-21),
      bust: '36"',
      waist: '28"',
      hips: '38"',
      hollow_to_hem: '58"',
      height: `5'6"`,
      heel_height: '2.5"',
      street_size: '8',
      gown_size: '12',
      notes: 'Final shoe height confirmed. Hem allowance preserved.',
      taken_by: 'Dana Robichaux',
      created_at: nowIso(-21 * DAY),
    },
    {
      id: 'MEAS-DEMO-002',
      bride_id: 'C-3003',
      customer: 'Olivia Martinez',
      taken_on: todayIso(-45),
      bust: '34"',
      waist: '27"',
      hips: '37"',
      hollow_to_hem: '57"',
      height: `5'5"`,
      heel_height: '3"',
      street_size: '6',
      gown_size: '10',
      notes: 'Paid-in-full gown ready for accessory styling.',
      taken_by: 'Eleanor Vance',
      created_at: nowIso(-45 * DAY),
    },
  ],
  try_on_notes: [
    {
      id: 'TRY-DEMO-001',
      bride_id: 'C-3001',
      customer: 'Emma Carter',
      gown_name: 'Katherine',
      designer: 'Vera Wang',
      price_cents: 350000,
      rating: 'Loved',
      notes: 'Loved the neckline and movement. Wants to compare one fitted silhouette before final decision.',
      stylist: 'Dana Robichaux',
      tried_on: todayIso(-28),
      created_at: nowIso(-28 * DAY),
    },
    {
      id: 'TRY-DEMO-002',
      bride_id: 'C-3003',
      customer: 'Olivia Martinez',
      gown_name: 'Bliss',
      designer: 'Monique Lhuillier',
      price_cents: 450000,
      rating: 'Said Yes',
      notes: 'Chose Bliss after comparing three silhouettes. Deposit converted to paid in full.',
      stylist: 'Eleanor Vance',
      tried_on: todayIso(-60),
      created_at: nowIso(-60 * DAY),
    },
  ],
  app_settings: [
    { key: 'digest_email', value: 'owner@magnoliabridal.example', updated_at: nowIso(-DAY) },
    { key: 'digest_enabled', value: 'on', updated_at: nowIso(-DAY) },
  ],
  automation_runs: [
    { id: 'AUTO-DEMO-001', kind: 'reminder', ref_id: 'A-5001', customer: 'Emma Carter', created_at: nowIso(-26 * 60 * 60 * 1000) },
    { id: 'AUTO-DEMO-002', kind: 'reminder', ref_id: 'A-5003', customer: 'Olivia Martinez', created_at: nowIso(-3 * 60 * 60 * 1000) },
  ],
  action_center_records: [],

  // Growth & Marketing. Seeded from the same shapes as the growth_* Postgres
  // tables so /demoapp exercises the identical queries a live tenant runs.
  ...growthDemoSeed,
};

// Attribution only rolls up when touchpoints reference real seeded lead ids, so
// they are generated after the leads exist rather than hardcoded.

// --- BEGIN ROBUST DEMO DATA GENERATION ---
const locations = ['demo-store-downtown', 'demo-store-northshore', 'demo-store-westside'];
const gownsList = ['Vera Wang Katherine', 'Monique Lhuillier Bliss', 'Berta 20-101', 'Maggie Sottero Rebecca'];
const seamstresses = ['Rosa M.', 'Linh P.', 'Odette B.'];
const tasks = [
  [{ label: 'Hem to floor length', done: true }, { label: 'Take in bust', done: false }],
  [{ label: 'Add bustle', done: false }, { label: 'Final steam & press', done: false }],
  [{ label: 'Hem to floor length', done: true }, { label: 'Take in bust', done: true }, { label: 'Add bustle', done: true }]
];

defaultSeedData.alterations = defaultSeedData.alterations || [];
defaultSeedData.contracts = defaultSeedData.contracts || [];
defaultSeedData.transfers = defaultSeedData.transfers || [];
defaultSeedData.invoices = defaultSeedData.invoices || [];
defaultSeedData.purchase_orders = defaultSeedData.purchase_orders || [];
defaultSeedData.measurements = defaultSeedData.measurements || [];
defaultSeedData.try_on_notes = defaultSeedData.try_on_notes || [];

let altCounter = 1;
let contractCounter = 1;

// Only seed if we don't already have dozens of alterations
if (defaultSeedData.alterations.length < 10) {
  for (const customer of defaultSeedData.customers) {
    if (customer.spend_cents > 0 || customer.status === 'Completed' || customer.status === 'Active') {
      const r = Math.random();
      if (r < 0.2) continue; // Skip some

      const gown = gownsList[Math.floor(r * gownsList.length)];
      const loc = locations[Math.floor(r * locations.length)];
      
      // Contracts
      const status = r > 0.3 ? 'Signed' : (r > 0.1 ? 'Sent' : 'Draft');
      defaultSeedData.contracts.push({
        id: `CON-${contractCounter++}`,
        customer: customer.name,
        location: loc,
        gown: gown,
        amount_cents: customer.spend_cents || 250000,
        deposit_cents: Math.floor((customer.spend_cents || 250000) / 2),
        special_terms: r > 0.8 ? 'Rush order required.' : '',
        status: status,
        sign_token: `tok-${contractCounter}`,
        signed_name: status === 'Signed' ? customer.name : null,
        signed_initials: status === 'Signed' ? customer.name.split(' ').map(n=>n[0]).join('') : null,
        signed_at: status === 'Signed' ? nowIso(-Math.floor(r*10)*DAY) : null,
        sent_at: status !== 'Draft' ? nowIso(-Math.floor(r*15)*DAY) : null,
        created_at: nowIso(-Math.floor(r*20)*DAY),
      });

      // Alterations
      if (r > 0.3) {
        const altStatus = r > 0.8 ? 'Picked Up' : (r > 0.6 ? 'Ready for Pickup' : (r > 0.4 ? 'Final Fitting' : 'In Progress'));
        defaultSeedData.alterations.push({
          id: `ALT-${altCounter++}`,
          customer: customer.name,
          gown: gown,
          seamstress: seamstresses[Math.floor(r * seamstresses.length)],
          status: altStatus,
          tasks: tasks[Math.floor(r * tasks.length)],
          next_fitting: altStatus !== 'Picked Up' ? todayIso(Math.floor(r*14)) : null,
          due_date: todayIso(Math.floor(r*21) + 7),
          price_cents: Math.floor(r * 50000) + 15000,
          notes: r > 0.7 ? 'Bride requested lace sleeves added.' : '',
          location: loc,
          created_at: nowIso(-Math.floor(r*30)*DAY),
        });
      }

      // Invoices
      if (defaultSeedData.invoices.length < 150) {
         defaultSeedData.invoices.push({
            id: `INV-${Math.floor(Math.random()*10000)}`,
            customer: customer.name,
            description: `${gown} (Deposit)`,
            amount_cents: customer.spend_cents || 250000,
            paid_cents: status === 'Signed' ? Math.floor((customer.spend_cents || 250000)/2) : 0,
            due_date: todayIso(Math.floor(r*14)),
            status: status === 'Signed' ? 'Partial' : 'Unpaid',
            location: loc,
            pay_token: `tok-inv-${Math.floor(Math.random()*10000)}`,
            created_at: nowIso(-Math.floor(r*30)*DAY),
         });
      }
      
      // Purchase Orders
      if (defaultSeedData.purchase_orders.length < 150) {
         const poStatuses = ['Draft', 'Submitted', 'Confirmed', 'Shipped', 'Delivered'];
         defaultSeedData.purchase_orders.push({
            id: `PO-${Math.floor(Math.random()*10000)}`,
            vendor: 'Vera Wang',
            customer_for: customer.name,
            style_number: 'VW-' + Math.floor(r*100),
            size: '10',
            color: 'Ivory',
            cost_cents: Math.floor((customer.spend_cents || 250000) * 0.4),
            status: poStatuses[Math.floor(r*poStatuses.length)],
            expected_delivery: todayIso(Math.floor(r*60)),
            tracking_number: r > 0.5 ? '1Z9999999999999999' : null,
            location: loc,
            created_at: nowIso(-Math.floor(r*30)*DAY),
         });
      }

      // Measurements
      defaultSeedData.measurements.push({
          id: `MEAS-${Math.floor(Math.random()*10000)}`,
          bride_id: customer.id,
          customer: customer.name,
          taken_on: todayIso(-Math.floor(r*10)),
          taken_by: 'Dana Robichaux',
          bust_inches: 34 + (r * 6),
          waist_inches: 26 + (r * 6),
          hips_inches: 36 + (r * 6),
          hollow_to_hem_inches: 58,
          notes: '',
      });

      
    // Transfers
    if (defaultSeedData.transfers.length < 50) {
      if (r > 0.6) {
        const trStatuses = ['Pending', 'In Transit', 'Completed'];
        const fromLoc = loc === 'demo-store-downtown' ? 'demo-store-northshore' : 'demo-store-downtown';
        defaultSeedData.transfers.push({
          id: `TR-${Math.floor(Math.random()*10000)}`,
          gown_id: 'G-' + Math.floor(Math.random()*1000+2000),
          gown_name: gown,
          from_location: fromLoc,
          to_location: loc,
          qty: 1,
          status: trStatuses[Math.floor(r * trStatuses.length)],
          requested: nowIso(-Math.floor(r*14)*DAY),
          received: r > 0.8 ? nowIso(-Math.floor(r*5)*DAY) : null,
          note: 'Requested for try-on',
        });
      }
    }

    // Messages
    if (!defaultSeedData.messages) defaultSeedData.messages = [];
    if (defaultSeedData.messages.length < 200) {
      defaultSeedData.messages.push({
        id: `MSG-${Math.floor(Math.random()*10000)}`,
        customer: customer.name,
        channel: r > 0.5 ? 'sms' : 'email',
        to_address: r > 0.5 ? customer.phone : customer.email,
        subject: r > 0.5 ? null : 'Your appointment is confirmed!',
        body: `Hi ${customer.name}! We are excited to see you!`,
        kind: 'confirmation',
        status: r > 0.1 ? 'sent' : 'failed',
        error: null,
        created_at: nowIso(-Math.floor(r*10)*DAY),
        direction: 'outbound',
        sentiment: 'positive',
      });
      // customer reply
      if (r > 0.3) {
        defaultSeedData.messages.push({
          id: `MSG-${Math.floor(Math.random()*10000)}`,
          customer: customer.name,
          channel: r > 0.5 ? 'sms' : 'email',
          to_address: r > 0.5 ? customer.phone : customer.email,
          subject: null,
          body: `Thank you, see you then!`,
          kind: 'reply',
          status: 'received',
          error: null,
          created_at: nowIso(-Math.floor(r*10)*DAY + 3600000),
          direction: 'inbound',
          sentiment: 'positive',
        });
      }
    }

      
    // Gowns
    if (defaultSeedData.gowns.length < 50) {
      for (let i = 0; i < 50; i++) {
        const r = Math.random();
        const designers = ['Vera Wang', 'Monique Lhuillier', 'Berta', 'Maggie Sottero', 'Pronovias'];
        const designer = designers[Math.floor(r * designers.length)];
        const styles = ['A-Line', 'Mermaid', 'Ballgown', 'Sheath', 'Fit and Flare'];
        const colors = ['Ivory', 'White', 'Champagne', 'Blush'];
        const sizes = ['4', '6', '8', '10', '12', '14', '16'];
        
        defaultSeedData.gowns.push({
          id: `G-${3000 + i}`,
          name: `${designer} ${styles[Math.floor(Math.random() * styles.length)]}`,
          designer: designer,
          style: `STY-${Math.floor(Math.random() * 900) + 100}`,
          size: sizes[Math.floor(Math.random() * sizes.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
          price_cents: Math.floor(Math.random() * 300000) + 150000,
          stock: Math.floor(Math.random() * 5),
          status: Math.random() > 0.1 ? 'Active' : 'Retired',
          image: `https://images.unsplash.com/photo-1594552072238-18e6e5f8f828?auto=format&fit=crop&w=400&q=80`,
          location: locations[Math.floor(Math.random() * locations.length)],
          sku: `SKU-${Math.floor(Math.random() * 10000)}`,
          cost_cents: Math.floor(Math.random() * 150000) + 50000,
          msrp_cents: Math.floor(Math.random() * 300000) + 150000,
          category: 'Bridal Gown',
          condition: 'New',
          vendor: designer,
          reorder_point: 1,
          notes: '',
        });
      }
    }

      // Try-on notes
      defaultSeedData.try_on_notes.push({
          id: `TRY-${Math.floor(Math.random()*10000)}`,
          bride_id: customer.id,
          customer: customer.name,
          gown_name: gown,
          rating: Math.floor(r * 5) + 1,
          liked: r > 0.5 ? 'Lace detail, neckline' : 'Train length',
          disliked: r > 0.5 ? 'Too heavy' : '',
          created_at: nowIso(-Math.floor(r*10)*DAY),
      });
    }
  }
}
// --- END ROBUST DEMO DATA GENERATION ---

  defaultSeedData.growth_attribution_touchpoints = buildDemoTouchpoints(
  (defaultSeedData.leads ?? []).map((lead: any) => lead.id).filter(Boolean),
);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function valueMatchesLike(value: any, pattern: any, caseInsensitive = false): boolean {
  const source = String(value ?? '');
  const needle = String(pattern ?? '').replace(/^%|%$/g, '');
  return caseInsensitive
    ? source.toLowerCase().includes(needle.toLowerCase())
    : source.includes(needle);
}

class DemoSelectQuery implements PromiseLike<DemoResult<any[]>> {
  private filters: Filter[] = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private maxRows: number | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;

  constructor(private db: DemoDatabase, private table: TableName) {}

  eq(column: string, value: any) { this.filters.push((row) => row[column] === value); return this; }
  neq(column: string, value: any) { this.filters.push((row) => row[column] !== value); return this; }
  in(column: string, values: any[]) { this.filters.push((row) => values.includes(row[column])); return this; }
  is(column: string, value: any) { this.filters.push((row) => row[column] === value); return this; }
  gt(column: string, value: any) { this.filters.push((row) => row[column] > value); return this; }
  gte(column: string, value: any) { this.filters.push((row) => row[column] >= value); return this; }
  lt(column: string, value: any) { this.filters.push((row) => row[column] < value); return this; }
  lte(column: string, value: any) { this.filters.push((row) => row[column] <= value); return this; }
  like(column: string, pattern: string) { this.filters.push((row) => valueMatchesLike(row[column], pattern)); return this; }
  ilike(column: string, pattern: string) { this.filters.push((row) => valueMatchesLike(row[column], pattern, true)); return this; }
  contains(column: string, value: any) {
    this.filters.push((row) => Array.isArray(row[column]) && (Array.isArray(value) ? value.every((v) => row[column].includes(v)) : row[column].includes(value)));
    return this;
  }
  match(values: Row) {
    Object.entries(values).forEach(([column, value]) => this.eq(column, value));
    return this;
  }
  not(column: string, operator: string, value: any) {
    if (operator === 'is') return this.neq(column, value);
    if (operator === 'eq') return this.neq(column, value);
    return this;
  }
  filter(column: string, operator: string, value: any) {
    const fn = (this as any)[operator];
    return typeof fn === 'function' ? fn.call(this, column, value) : this;
  }
  order(column: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.orders.push({ column, ascending });
    return this;
  }
  limit(count: number) { this.maxRows = Math.max(0, count); return this; }
  range(from: number, to: number) { this.rangeStart = from; this.rangeEnd = to; return this; }
  abortSignal() { return this; }
  throwOnError() { return this; }

  private compute(): Row[] {
    let rows = clone(this.db.getRows(this.table));
    for (const filter of this.filters) rows = rows.filter(filter);
    if (this.orders.length > 0) {
      rows.sort((a, b) => {
        for (const { column, ascending } of this.orders) {
          const left = a[column];
          const right = b[column];
          if (left < right) return ascending ? -1 : 1;
          if (left > right) return ascending ? 1 : -1;
        }
        return 0;
      });
    }
    if (this.rangeStart !== null && this.rangeEnd !== null) {
      rows = rows.slice(this.rangeStart, this.rangeEnd + 1);
    }
    if (this.maxRows !== null) rows = rows.slice(0, this.maxRows);
    return rows;
  }

  private execute(): Promise<DemoResult<any[]>> {
    return Promise.resolve({ error: null, data: this.compute() });
  }

  single(): Promise<DemoResult<any>> {
    const rows = this.compute();
    return Promise.resolve({ error: null, data: rows[0] ?? null });
  }

  maybeSingle(): Promise<DemoResult<any>> {
    return this.single();
  }

  then<TResult1 = DemoResult<any[]>, TResult2 = never>(
    onfulfilled?: ((value: DemoResult<any[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

type MutationKind = 'insert' | 'update' | 'delete' | 'upsert';

class DemoMutationQuery implements PromiseLike<DemoResult<any>> {
  private filters: Filter[] = [];
  private returnRows = false;
  private executed: Promise<DemoResult<any>> | null = null;

  constructor(
    private db: DemoDatabase,
    private table: TableName,
    private kind: MutationKind,
    private payload?: any,
    private options?: any,
  ) {}

  eq(column: string, value: any) { this.filters.push((row) => row[column] === value); return this; }
  neq(column: string, value: any) { this.filters.push((row) => row[column] !== value); return this; }
  in(column: string, values: any[]) { this.filters.push((row) => values.includes(row[column])); return this; }
  match(values: Row) { Object.entries(values).forEach(([column, value]) => this.eq(column, value)); return this; }
  select() { this.returnRows = true; return this; }
  throwOnError() { return this; }

  private matches(row: Row): boolean {
    return this.filters.length === 0 || this.filters.every((filter) => filter(row));
  }

  private generatedRow(row: Row): Row {
    const result = { ...row };
    if (!result.id && this.table !== 'app_settings') {
      result.id = `demo-${this.table}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    if (!result.created_at) result.created_at = new Date().toISOString();
    return result;
  }

  private run(): DemoResult<any> {
    const current = clone(this.db.getRows(this.table));
    let changed: Row[] = [];

    if (this.kind === 'insert') {
      changed = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((row) => this.generatedRow(row));
      this.db.setRows(this.table, [...current, ...changed]);
    } else if (this.kind === 'update') {
      const next = current.map((row) => {
        if (!this.matches(row)) return row;
        const updated = { ...row, ...this.payload };
        changed.push(updated);
        return updated;
      });
      this.db.setRows(this.table, next);
    } else if (this.kind === 'delete') {
      changed = current.filter((row) => this.matches(row));
      this.db.setRows(this.table, current.filter((row) => !this.matches(row)));
    } else if (this.kind === 'upsert') {
      const incoming = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((row) => this.generatedRow(row));
      const conflictColumns = String(this.options?.onConflict || '').split(',').map((x) => x.trim()).filter(Boolean);
      const next = [...current];
      for (const row of incoming) {
        const keys = conflictColumns.length > 0
          ? conflictColumns
          : row.id ? ['id'] : row.key ? ['key'] : [];
        const index = keys.length > 0
          ? next.findIndex((existing) => keys.every((key) => existing[key] === row[key]))
          : -1;
        if (index >= 0) next[index] = { ...next[index], ...row };
        else next.push(row);
        changed.push(row);
      }
      this.db.setRows(this.table, next);
    }

    return { error: null, data: this.returnRows ? changed : null };
  }

  private execute(): Promise<DemoResult<any>> {
    if (!this.executed) this.executed = Promise.resolve(this.run());
    return this.executed;
  }

  async single(): Promise<DemoResult<any>> {
    this.returnRows = true;
    const result = await this.execute();
    const rows = Array.isArray(result.data) ? result.data : [];
    return { error: null, data: rows[0] ?? null };
  }

  maybeSingle(): Promise<DemoResult<any>> { return this.single(); }

  then<TResult1 = DemoResult<any>, TResult2 = never>(
    onfulfilled?: ((value: DemoResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class DemoDatabase {
  private data: Record<TableName, any[]>;
  private readonly storageKey = 'vowos_demo_db_v2';

  constructor() {
    this.data = this.loadFromStorage();
  }

  private loadFromStorage(): Record<TableName, any[]> {
    // Session storage intentionally isolates simultaneous prospects/tabs while
    // still allowing refreshes inside one demo session. Never reuse the old
    // localStorage database because that leaked mutations across tabs.
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(this.storageKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (error) {
          console.warn('Failed to parse isolated demo database; resetting.', error);
        }
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('vowos_demo_db');
    }
    return clone(defaultSeedData);
  }

  private saveToStorage() {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }
  }

  public getRows(table: TableName): any[] {
    return this.data[table] || [];
  }

  public setRows(table: TableName, rows: any[]) {
    this.data[table] = rows;
    this.saveToStorage();
  }

  public reset() {
    this.data = clone(defaultSeedData);
    this.saveToStorage();
  }

  public from(table: TableName) {
    return {
      select: (_columns: string = '*') => new DemoSelectQuery(this, table),
      insert: (rows: any | any[]) => new DemoMutationQuery(this, table, 'insert', rows),
      update: (updates: any) => new DemoMutationQuery(this, table, 'update', updates),
      delete: () => new DemoMutationQuery(this, table, 'delete'),
      upsert: (rows: any | any[], options?: any) => new DemoMutationQuery(this, table, 'upsert', rows, options),
    };
  }
}

export const demoDb = new DemoDatabase();
