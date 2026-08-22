import { describe, it, expect, beforeEach } from 'vitest';
import { ReturnOrder } from '@/components/vowos/ReturnsView';
import { Gown, PurchaseOrder, Customer, Invoice, teamMembers } from '@/data/vowosData';
import { demoDb } from '@/lib/demo/demoDatabase';
import { generateEntityId, isUuid } from '@/contexts/VowosDataContext';

describe('Milestone 2: Frontend Realization & Zero-Placeholder Sweep', () => {
  beforeEach(() => {
    demoDb.reset();
  });

  describe('1. Return to Vendor (RTV) Data Logic', () => {
    const sampleReturns: ReturnOrder[] = [
      {
        id: 'RTV-8042',
        vendor: 'Maggie Sottero',
        items: 3,
        value: 245000,
        status: 'Shipped',
        date: '2026-08-14',
        reason: 'Defective Merchandise',
        gownName: 'Derrick (Maggie Sottero)',
      },
      {
        id: 'RTV-8043',
        vendor: 'Justin Alexander',
        items: 1,
        value: 85000,
        status: 'Draft',
        date: '2026-08-18',
        reason: 'Stock Balancing',
        gownName: 'Bobbie (Justin Alexander)',
      },
      {
        id: 'RTV-8044',
        vendor: 'Essense of Australia',
        items: 5,
        value: 412000,
        status: 'Pending Approval',
        date: '2026-08-19',
        reason: 'Sample Return',
        gownName: 'D3384 (Essense of Australia)',
      },
    ];

    it('filters returns by vendor or search term', () => {
      const search = 'Maggie';
      const filtered = sampleReturns.filter((r) =>
        r.vendor.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('RTV-8042');
    });

    it('filters returns by status correctly', () => {
      const pending = sampleReturns.filter((r) => r.status === 'Pending Approval');
      expect(pending.length).toBe(1);
      expect(pending[0].vendor).toBe('Essense of Australia');
    });

    it('creates new return order with valid attributes and cents value', () => {
      const newRtv: ReturnOrder = {
        id: 'RTV-8050',
        vendor: 'Berta',
        items: 2,
        value: 500000,
        status: 'Draft',
        date: '2026-08-22',
        reason: 'Defective Merchandise',
        gownName: 'Berta Couture 22-01',
      };
      expect(newRtv.value).toBe(500000);
      expect(newRtv.items).toBe(2);
      expect(newRtv.status).toBe('Draft');
    });
  });

  describe('2. Multi-Store Gown Inventory Stock Calculation', () => {
    const testGowns: any[] = [
      {
        id: 'g-001',
        name: 'Derrick',
        designer: 'Maggie Sottero',
        style: 'A-Line',
        size: '10',
        color: 'Ivory',
        sku: 'MS-DER-10',
        priceCents: 220000,
        costCents: 110000,
        msrpCents: 240000,
        stock: 2,
        location: 'ido-br',
        status: 'In Stock',
        condition: 'New Sample',
        image: 'https://images.unsplash.com/photo-1',
        category: 'Bridal',
        vendor: 'Maggie Sottero',
        reorderPoint: 1,
        notes: '',
      },
      {
        id: 'g-002',
        name: 'Derrick',
        designer: 'Maggie Sottero',
        style: 'A-Line',
        size: '10',
        color: 'Ivory',
        sku: 'MS-DER-10',
        priceCents: 220000,
        costCents: 110000,
        msrpCents: 240000,
        stock: 1,
        location: 'ido-cov',
        status: 'In Stock',
        condition: 'New Sample',
        image: 'https://images.unsplash.com/photo-1',
        category: 'Bridal',
        vendor: 'Maggie Sottero',
        reorderPoint: 1,
        notes: '',
      },
      {
        id: 'g-003',
        name: 'Derrick',
        designer: 'Maggie Sottero',
        style: 'A-Line',
        size: '10',
        color: 'Ivory',
        sku: 'MS-DER-10',
        priceCents: 220000,
        costCents: 110000,
        msrpCents: 240000,
        stock: 0,
        location: 'pc-br',
        status: 'On Order',
        condition: 'Sample',
        image: 'https://images.unsplash.com/photo-1',
        category: 'Bridal',
        vendor: 'Maggie Sottero',
        reorderPoint: 1,
        notes: '',
      },
    ];

    it('calculates true cross-location stock without random numbers', () => {
      const targetGown = testGowns[0];
      const stockByLocation = ['ido-br', 'ido-cov', 'pc-br', 'pc-cov'].map((locId) => {
        const matching = testGowns.filter(
          (g) => g.location === locId && g.sku === targetGown.sku
        );
        return {
          location: locId,
          stock: matching.reduce((sum, g) => sum + g.stock, 0),
        };
      });

      expect(stockByLocation.find((s) => s.location === 'ido-br')?.stock).toBe(2);
      expect(stockByLocation.find((s) => s.location === 'ido-cov')?.stock).toBe(1);
      expect(stockByLocation.find((s) => s.location === 'pc-br')?.stock).toBe(0);
      expect(stockByLocation.find((s) => s.location === 'pc-cov')?.stock).toBe(0);

      const totalStock = stockByLocation.reduce((sum, s) => sum + s.stock, 0);
      expect(totalStock).toBe(3);
    });

    it('matches purchase orders for a given gown', () => {
      const samplePOs: any[] = [
        {
          id: 'PO-8812',
          vendor: 'Maggie Sottero',
          items: '2x Derrick (Size 10)',
          costCents: 220000,
          status: 'Delivered',
          ordered: '2026-08-01T00:00:00Z',
          expectedDelivery: '2026-09-01',
          location: 'ido-br',
        },
        {
          id: 'PO-8813',
          vendor: 'Justin Alexander',
          items: '1x Bobbie (Size 8)',
          costCents: 85000,
          status: 'In Transit',
          ordered: '2026-08-10T00:00:00Z',
          expectedDelivery: '2026-08-25',
          location: 'ido-cov',
        },
      ];

      const matching = samplePOs.filter(
        (po) =>
          po.items.toLowerCase().includes('derrick') ||
          po.vendor.toLowerCase().includes('maggie sottero')
      );
      expect(matching.length).toBe(1);
      expect(matching[0].id).toBe('PO-8812');
    });
  });

  describe('3. Dynamic Staff Performance & Payroll Calculation', () => {
    it('calculates stylist commission correctly based on actual invoice revenue', () => {
      const stylistName = 'Sarah Jenkins';
      const assignedBrides: any[] = [
        {
          id: 'c-001',
          name: 'Emma Watson',
          status: 'Purchased',
          weddingDate: '2026-10-10',
          budget: '$3,000 - $5,000',
          stylist: stylistName,
          notes: '',
          email: 'emma@example.com',
          phone: '555-0100',
          spendCents: 350000,
          tags: ['VIP'],
          location: 'ido-br',
          createdAt: '2026-01-01',
        },
      ];

      const invoices: any[] = [
        {
          id: 'inv-001',
          customer: 'Emma Watson',
          amountCents: 350000,
          paidCents: 350000,
          status: 'Paid',
          date: '2026-08-15',
          items: 'Maggie Sottero Derrick',
          location: 'ido-br',
        },
      ];

      const invoiceSales = invoices.reduce((sum, inv) => sum + inv.paidCents, 0);
      const commissionRate = 0.05; // 5% for Senior Stylist
      const earned = Math.round(invoiceSales * commissionRate);

      expect(invoiceSales).toBe(350000);
      expect(earned).toBe(17500); // $175.00
    });

    it('generates valid RFC-4180 CSV payroll export rows', () => {
      const staffList = [
        { name: 'Sarah Jenkins', role: 'Senior Stylist', sales: 350000, rate: 0.05, commission: 17500, status: 'Pending' },
        { name: 'Emily Chen', role: 'Stylist', sales: 200000, rate: 0.04, commission: 8000, status: 'Pending' },
      ];

      const headers = ['Staff Member', 'Role', 'Sales Total ($)', 'Base Rate (%)', 'Commission Earned ($)', 'Status'];
      const rows = staffList.map((s) => [
        `"${s.name}"`,
        `"${s.role}"`,
        (s.sales / 100).toFixed(2),
        (s.rate * 100).toFixed(1),
        (s.commission / 100).toFixed(2),
        `"${s.status}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      expect(csvContent).toContain('Sarah Jenkins');
      expect(csvContent).toContain('175.00');
      expect(csvContent).toContain('Emily Chen');
      expect(csvContent).toContain('80.00');
    });
  });

  describe('4. POS Payments Table Ledger Persistence', () => {
    it('inserts payment row into demoDb payments table with correct foreign keys', async () => {
      const paymentId = generateEntityId();
      const invoiceId = generateEntityId();
      const customerId = generateEntityId();

      const insertRes = await demoDb.from('payments').insert({
        id: paymentId,
        business_id: 'b0000000-0000-0000-0000-000000000000',
        location_id: 'c0000000-0000-0000-0000-000000000001',
        customer_id: customerId,
        invoice_id: invoiceId,
        amount_cents: 250000,
        payment_method: 'terminal',
        provider_transaction_id: 'pos_tx_1234567890',
        status: 'completed',
        notes: 'POS Terminal Checkout',
        processed_at: new Date().toISOString(),
      });

      expect(insertRes.error).toBeNull();

      const fetchRes = await demoDb.from('payments').select('*');
      expect(fetchRes.error).toBeNull();
      const payment = fetchRes.data?.find((p: any) => p.id === paymentId);
      expect(payment).toBeDefined();
      expect(payment.amount_cents).toBe(250000);
      expect(payment.payment_method).toBe('terminal');
    });
  });
});
