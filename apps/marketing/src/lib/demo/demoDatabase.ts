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
