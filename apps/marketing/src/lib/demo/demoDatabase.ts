import { getActiveDataPlane } from '@/lib/supabase';
import { DEMO_STORES, DEMO_PERSONAS } from './demoData';
import { generateRobustDemoData } from './demoDataGenerator';

type TableName = 'customers' | 'leads' | 'appointments' | 'invoices' | 'purchase_orders' | 'gowns' | 'transfers' | 'action_center_records';

const robustData = generateRobustDemoData(12345);

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
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
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
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
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
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    }
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
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
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
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    }
  ],
  appointments: [
    ...robustData.appointments,
    {
      id: 'A-5001',
      customer: 'Emma Carter',
      type: 'First Fitting',
      date: new Date().toISOString().slice(0, 10),
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
      date: new Date().toISOString().slice(0, 10),
      time: '3:30 PM',
      stylist: 'Dana Robichaux',
      status: 'Unconfirmed',
      location: 'demo-store-downtown',
      looking_for: 'Ballgown',
      budget_cents: 350000,
      fee_paid: false,
    },
    {
      id: 'A-5003',
      customer: 'Olivia Martinez',
      type: 'Accessory Styling',
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      time: '10:00 AM',
      stylist: 'Eleanor Vance',
      status: 'Confirmed',
      location: 'demo-store-northshore',
      looking_for: 'Veil',
      budget_cents: 50000,
      fee_paid: true,
    }
  ],
  invoices: [
    {
      id: 'INV-8001',
      customer: 'Emma Carter',
      description: 'Vera Wang Katherine Gown (Deposit)',
      amount_cents: 240000,
      paid_cents: 120000,
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: 'Partial',
      location: 'demo-store-downtown',
      pay_token: 'tok-1',
    },
    {
      id: 'INV-8002',
      customer: 'Olivia Martinez',
      description: 'Monique Lhuillier Bliss Gown (Paid in Full)',
      amount_cents: 450000,
      paid_cents: 450000,
      due_date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
      status: 'Paid',
      location: 'demo-store-northshore',
      pay_token: 'tok-2',
    }
  ],
  purchase_orders: [
    {
      id: 'PO-1001',
      vendor: 'Maggie Sottero',
      items: '3x Style 521',
      amount_cents: 150000,
      ordered: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      expected_delivery: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      status: 'In Production',
      location: 'demo-store-downtown',
      assigned_staff: 'Priya Kulkarni',
      assigned_customer: '',
      notes: '',
    }
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
    }
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
      requested: new Date(Date.now() - 1 * 86400000).toISOString(),
      received: null,
      note: 'Transfer for Emma Carter fitting',
    }
  ],
  action_center_records: []
};

class DemoDatabase {
  private data: Record<TableName, any[]>;

  constructor() {
    this.data = this.loadFromStorage();
  }

  private loadFromStorage(): Record<TableName, any[]> {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('vowos_demo_db');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse demo DB", e);
        }
      }
    }
    return JSON.parse(JSON.stringify(defaultSeedData)); // Deep copy
  }

  private saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('vowos_demo_db', JSON.stringify(this.data));
    }
  }

  public reset() {
    this.data = JSON.parse(JSON.stringify(defaultSeedData));
    this.saveToStorage();
  }

  public from(table: TableName) {
    return {
      select: (columns: string = '*') => {
        return {
          order: (column: string, { ascending = true }: { ascending?: boolean } = {}) => {
            const rows = [...(this.data[table] || [])];
            rows.sort((a, b) => {
              const valA = a[column];
              const valB = b[column];
              if (valA < valB) return ascending ? -1 : 1;
              if (valA > valB) return ascending ? 1 : -1;
              return 0;
            });
            return Promise.resolve({ error: null, data: rows });
          },
          then: (resolve: (res: any) => void) => {
            resolve({ error: null, data: [...(this.data[table] || [])] });
          }
        };
      },
      insert: (rows: any | any[]) => {
        const rowsToInsert = Array.isArray(rows) ? rows : [rows];
        this.data[table] = [...(this.data[table] || []), ...rowsToInsert];
        this.saveToStorage();
        return Promise.resolve({ error: null });
      },
      update: (updates: any) => {
        return {
          eq: (column: string, value: any) => {
            this.data[table] = (this.data[table] || []).map((row) => 
              row[column] === value ? { ...row, ...updates } : row
            );
            this.saveToStorage();
            return Promise.resolve({ error: null });
          }
        };
      },
      delete: () => {
        return {
          eq: (column: string, value: any) => {
            this.data[table] = (this.data[table] || []).filter((row) => row[column] !== value);
            this.saveToStorage();
            return Promise.resolve({ error: null });
          }
        };
      }
    };
  }
}

export const demoDb = new DemoDatabase();
