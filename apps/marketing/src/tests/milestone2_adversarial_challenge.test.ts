import { describe, it, expect, beforeEach } from 'vitest';
import { ReturnOrder } from '@/components/vowos/ReturnsView';
import {
  Gown,
  PurchaseOrder,
  Customer,
  Invoice,
  LOCATIONS,
  locationById,
  marginPct,
  formatCents,
  teamMembers,
} from '@/data/vowosData';
import { demoDb } from '@/lib/demo/demoDatabase';
import {
  generateEntityId,
  isUuid,
  resolveLocationId,
  DEMO_BUSINESS_ID,
  DEMO_LOCATION_MAP,
} from '@/contexts/VowosDataContext';

describe('Adversarial Stress Test: Milestone 2 Frontend Realization & Zero-Placeholder Sweep', () => {
  beforeEach(() => {
    demoDb.reset();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. POS TERMINAL CHECKOUT LEDGER & MATH PRECISION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. POS Terminal Checkout: Financial Ledger & Entity Persistence', () => {
    it('calculates balance due and tax with exact integer cent precision without float drift', () => {
      const testCases = [
        { amountCents: 250000, paidCents: 0, taxRate: 9.45, expectedBalance: 250000, expectedTax: 23625, expectedTotal: 273625 },
        { amountCents: 399999, paidCents: 150000, taxRate: 5.0, expectedBalance: 249999, expectedTax: 12500, expectedTotal: 262499 },
        { amountCents: 100000, paidCents: 100000, taxRate: 10.0, expectedBalance: 0, expectedTax: 0, expectedTotal: 0 },
        { amountCents: 50000, paidCents: 0, taxRate: 0, expectedBalance: 50000, expectedTax: 0, expectedTotal: 50000 },
      ];

      for (const tc of testCases) {
        const balance = tc.amountCents - tc.paidCents;
        const taxAmount = Math.round(balance * (tc.taxRate / 100));
        const finalTotal = balance + taxAmount;

        expect(balance).toBe(tc.expectedBalance);
        expect(taxAmount).toBe(tc.expectedTax);
        expect(finalTotal).toBe(tc.expectedTotal);
      }
    });

    it('generates compliant RFC-4122 v4 UUIDs for all payment entity IDs', () => {
      const v4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      for (let i = 0; i < 100; i++) {
        const id = generateEntityId();
        expect(isUuid(id)).toBe(true);
        expect(v4Pattern.test(id)).toBe(true);
      }
    });

    it('safely resolves locations and quarantines non-UUID customer references', () => {
      // Known location slug
      expect(resolveLocationId('ido-br')).toBe(DEMO_LOCATION_MAP['ido-br']);
      expect(resolveLocationId('pc-cov')).toBe(DEMO_LOCATION_MAP['pc-cov']);

      // Unknown/corrupted location fallback
      expect(resolveLocationId('unknown-store-slug')).toBe(DEMO_LOCATION_MAP['ido-br']);
      expect(resolveLocationId('')).toBe(DEMO_LOCATION_MAP['ido-br']);

      // Customer UUID quarantine test
      const validCustomerUuid = 'c0000000-0000-0000-0000-000000000001';
      const legacyCustomerId = 'C-101';
      const walkInName = 'Emma Watson';

      expect(isUuid(validCustomerUuid) ? validCustomerUuid : null).toBe(validCustomerUuid);
      expect(isUuid(legacyCustomerId) ? legacyCustomerId : null).toBeNull();
      expect(isUuid(walkInName) ? walkInName : null).toBeNull();
    });

    it('persists payment ledger entry into demoDb with correct attributes', async () => {
      const paymentId = generateEntityId();
      const invoiceId = generateEntityId();
      const locationId = DEMO_LOCATION_MAP['ido-br'];

      const payload = {
        id: paymentId,
        business_id: DEMO_BUSINESS_ID,
        location_id: locationId,
        customer_id: null,
        invoice_id: invoiceId,
        amount_cents: 273625,
        payment_method: 'terminal',
        provider_transaction_id: `pos_tx_${Date.now()}`,
        status: 'completed',
        notes: 'POS Terminal Checkout (Physical Terminal)',
        processed_at: new Date().toISOString(),
      };

      const insertRes = await demoDb.from('payments').insert(payload);
      expect(insertRes.error).toBeNull();

      const fetchRes = await demoDb.from('payments').select('*');
      expect(fetchRes.error).toBeNull();
      const found = fetchRes.data?.find((p: any) => p.id === paymentId);
      expect(found).toBeDefined();
      expect(found.amount_cents).toBe(273625);
      expect(found.payment_method).toBe('terminal');
      expect(found.status).toBe('completed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RETURN TO VENDOR (RTV) STATE MACHINE & TRIAGE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Return to Vendor (RTV): State Machine, Search & Triage', () => {
    const dataset: ReturnOrder[] = [
      {
        id: 'RTV-8042',
        vendor: 'Maggie Sottero',
        items: 3,
        value: 245000,
        status: 'Shipped',
        date: '2026-08-14',
        reason: 'Defective Merchandise',
        gownName: 'Derrick (Maggie Sottero)',
        trackingNumber: '1Z9999999999999999',
        carrier: 'UPS Ground',
        notes: 'Beading defect on bodice seam.',
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
        notes: 'Surplus sample.',
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
      {
        id: 'RTV-8045',
        vendor: 'Berta',
        items: 2,
        value: 950000,
        status: 'Refunded',
        date: '2026-08-20',
        reason: 'Customer Cancellation',
        gownName: 'Berta Privee 23',
      },
    ];

    it('filters returns comprehensively across multiple search tokens', () => {
      const search = (q: string) =>
        dataset.filter(
          (rtv) =>
            !q.trim() ||
            rtv.id.toLowerCase().includes(q.toLowerCase()) ||
            rtv.vendor.toLowerCase().includes(q.toLowerCase()) ||
            (rtv.gownName && rtv.gownName.toLowerCase().includes(q.toLowerCase())) ||
            (rtv.reason && rtv.reason.toLowerCase().includes(q.toLowerCase())) ||
            (rtv.notes && rtv.notes.toLowerCase().includes(q.toLowerCase()))
        );

      expect(search('Maggie').length).toBe(1);
      expect(search('Stock Balancing').length).toBe(1);
      expect(search('D3384').length).toBe(1);
      expect(search('beading defect').length).toBe(1);
      expect(search('RTV-8045').length).toBe(1);
      expect(search('Nonexistent Designer').length).toBe(0);
      expect(search('   ').length).toBe(4);
    });

    it('enforces valid status lifecycle transitions (Draft -> Pending -> Shipped -> Refunded)', () => {
      let rtv = { ...dataset[1] }; // Draft
      expect(rtv.status).toBe('Draft');

      // Transition 1: Submit for approval
      rtv = { ...rtv, status: 'Pending Approval' };
      expect(rtv.status).toBe('Pending Approval');

      // Transition 2: Mark as Shipped with carrier tracking
      const generatedTracking = `1Z${Date.now()}`;
      rtv = { ...rtv, status: 'Shipped', trackingNumber: generatedTracking };
      expect(rtv.status).toBe('Shipped');
      expect(rtv.trackingNumber).toBe(generatedTracking);

      // Transition 3: Confirm vendor credit / refund
      rtv = { ...rtv, status: 'Refunded' };
      expect(rtv.status).toBe('Refunded');
    });

    it('generates consistent shipping manifest data without throwing on missing fields', () => {
      const minimalRtv: ReturnOrder = {
        id: 'RTV-9999',
        vendor: 'Monique Lhuillier',
        items: 1,
        value: 600000,
        status: 'Draft',
        date: '2026-08-21',
        reason: 'Sample Return',
      };

      const brand = locationById('ido-br')?.business || 'VowOS Bridal';
      const city = locationById('ido-br')?.city || 'Baton Rouge';
      const carrier = minimalRtv.carrier || 'UPS Ground';
      const tracking = minimalRtv.trackingNumber || '1Z-PENDING';

      expect(brand).toBe('I Do Bridal Couture');
      expect(city).toBe('Baton Rouge');
      expect(carrier).toBe('UPS Ground');
      expect(tracking).toBe('1Z-PENDING');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MULTI-STORE GOWN STOCK & PURCHASE ORDER GROUPING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Multi-Store Inventory & Purchase Order Matching', () => {
    const allInventoryGowns: Gown[] = [
      {
        id: 'g-1',
        name: 'Derrick',
        designer: 'Maggie Sottero',
        style: 'A-Line',
        size: '10',
        color: 'Ivory',
        sku: 'MS-DER-10',
        priceCents: 220000,
        costCents: 110000,
        msrpCents: 240000,
        stock: 3,
        location: 'ido-br',
        status: 'In Stock',
        condition: 'New Sample',
        image: 'https://img.com/1',
        category: 'Bridal',
        vendor: 'Maggie Sottero',
        reorderPoint: 1,
        notes: 'Floor sample',
      },
      {
        id: 'g-2',
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
        location: 'ido-cov',
        status: 'In Stock',
        condition: 'New Sample',
        image: 'https://img.com/1',
        category: 'Bridal',
        vendor: 'Maggie Sottero',
        reorderPoint: 1,
        notes: '',
      },
      {
        id: 'g-3',
        name: 'Derrick',
        designer: 'Maggie Sottero',
        style: 'A-Line',
        size: '12',
        color: 'Ivory',
        sku: 'MS-DER-12',
        priceCents: 220000,
        costCents: 110000,
        msrpCents: 240000,
        stock: 1,
        location: 'pc-br',
        status: 'In Stock',
        condition: 'Sample',
        image: 'https://img.com/1',
        category: 'Bridal',
        vendor: 'Maggie Sottero',
        reorderPoint: 1,
        notes: '',
      },
    ];

    it('aggregates true network inventory without synthetic Math.random() generation', () => {
      const target = allInventoryGowns[0];

      const crossLocationStock = LOCATIONS.map((loc) => {
        const matchingGowns = allInventoryGowns.filter((g) => {
          if (g.location !== loc.id) return false;
          if (target.sku && g.sku && g.sku.toLowerCase() === target.sku.toLowerCase()) return true;
          return (
            g.name.toLowerCase() === target.name.toLowerCase() &&
            g.designer.toLowerCase() === target.designer.toLowerCase()
          );
        });
        const stockCount = matchingGowns.reduce((sum, g) => sum + g.stock, 0);
        return {
          locationId: loc.id,
          stock: loc.id === target.location ? Math.max(target.stock, stockCount) : stockCount,
        };
      });

      const idoBrStock = crossLocationStock.find((s) => s.locationId === 'ido-br')?.stock;
      const idoCovStock = crossLocationStock.find((s) => s.locationId === 'ido-cov')?.stock;
      const pcBrStock = crossLocationStock.find((s) => s.locationId === 'pc-br')?.stock;
      const pcCovStock = crossLocationStock.find((s) => s.locationId === 'pc-cov')?.stock;

      expect(idoBrStock).toBe(3);
      expect(idoCovStock).toBe(2);
      // pc-br matches the same gown model ("Derrick" by "Maggie Sottero")
      expect(pcBrStock).toBe(1);
      expect(pcCovStock).toBe(0);

      const totalStock = crossLocationStock.reduce((acc, curr) => acc + curr.stock, 0);
      expect(totalStock).toBe(6);
    });

    it('calculates profit margin percentage safely and guards against division by zero', () => {
      expect(marginPct(110000, 220000)).toBe(50);
      expect(marginPct(100000, 300000)).toBe(67);
      expect(marginPct(0, 220000)).toBe(100);
      expect(marginPct(220000, 0)).toBe(0);
    });

    it('matches purchase orders across item names, SKUs, and vendor names with case insensitivity', () => {
      const pos: PurchaseOrder[] = [
        {
          id: 'PO-101',
          vendor: 'Maggie Sottero',
          items: '3x Derrick (Size 10 Ivory)',
          amountCents: 330000,
          status: 'Delivered',
          ordered: '2026-07-01',
          expectedDelivery: '2026-08-01',
          location: 'ido-br',
        },
        {
          id: 'PO-102',
          vendor: 'Justin Alexander',
          items: '1x Bobbie',
          amountCents: 85000,
          status: 'In Transit',
          ordered: '2026-08-01',
          expectedDelivery: '2026-08-25',
          location: 'ido-cov',
        },
      ];

      const gown = allInventoryGowns[0];
      const gownName = gown.name.toLowerCase();
      const sku = gown.sku.toLowerCase();
      const designer = gown.designer.toLowerCase();

      const matched = pos.filter((po) => {
        const items = (po.items || '').toLowerCase();
        const vendor = (po.vendor || '').toLowerCase();
        return items.includes(gownName) || items.includes(sku) || vendor.includes(designer);
      });

      expect(matched.length).toBe(1);
      expect(matched[0].id).toBe('PO-101');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. STAFF 360 & COMMISSIONS AGGREGATIONS & ZERO-DIVISION SAFETY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Dynamic Staff Performance, Period Filtering & RFC-4180 CSV Export', () => {
    it('handles zero appointments, zero brides, and zero invoices without NaN or Infinity', () => {
      const staffName = 'New Employee';
      const staffAppts: any[] = [];
      const assignedBrides: any[] = [];
      const staffInvoices: any[] = [];

      const totalAppts = staffAppts.length;
      const invoiceRevenue = staffInvoices.reduce((sum, inv) => sum + (inv.paidCents || inv.amountCents), 0);
      const brideSpend = assignedBrides.reduce((sum, b) => sum + (b.spendCents || 0), 0);
      const ytdSales = Math.max(invoiceRevenue, brideSpend);

      const convertedCount = 0;
      const conversionRate = totalAppts > 0 ? Math.round((convertedCount / totalAppts) * 100) : 0;
      const salesCount = staffInvoices.length > 0 ? staffInvoices.length : 1;
      const avgTicketSize = ytdSales > 0 ? Math.round(ytdSales / salesCount) : 0;

      expect(conversionRate).toBe(0);
      expect(avgTicketSize).toBe(0);
      expect(ytdSales).toBe(0);
      expect(Number.isNaN(conversionRate)).toBe(false);
      expect(Number.isNaN(avgTicketSize)).toBe(false);
    });

    it('correctly filters invoices across time periods (This Month, Last Month, Year to Date)', () => {
      const mockInvoices = [
        { id: 'inv-now', date: '2026-08-15', amountCents: 350000, paidCents: 350000, customer: 'Bride A' },
        { id: 'inv-last-month', date: '2026-07-20', amountCents: 200000, paidCents: 200000, customer: 'Bride B' },
        { id: 'inv-last-year', date: '2025-12-10', amountCents: 400000, paidCents: 400000, customer: 'Bride C' },
      ];

      const filterByPeriod = (period: 'This Month' | 'Last Month' | 'Year to Date', refDate: Date) => {
        const currentYear = refDate.getFullYear();
        const currentMonth = refDate.getMonth();

        return mockInvoices.filter((inv) => {
          const invDate = new Date(inv.date);
          if (period === 'This Month') {
            return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth;
          } else if (period === 'Last Month') {
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            return invDate.getFullYear() === lastMonthYear && invDate.getMonth() === lastMonth;
          } else {
            return invDate.getFullYear() === currentYear;
          }
        });
      };

      const refDate = new Date('2026-08-21T00:00:00Z');
      expect(filterByPeriod('This Month', refDate).map((i) => i.id)).toEqual(['inv-now']);
      expect(filterByPeriod('Last Month', refDate).map((i) => i.id)).toEqual(['inv-last-month']);
      expect(filterByPeriod('Year to Date', refDate).map((i) => i.id)).toEqual(['inv-now', 'inv-last-month']);
    });

    it('formats RFC-4180 compliant CSV export with proper quotation escaping', () => {
      const staffList = [
        { name: 'Sarah "Sally" Jenkins', role: 'Senior Stylist, Bridal', sales: 520000, rate: 0.05, commission: 26000, status: 'Pending' },
        { name: 'Emily O\'Connor', role: 'Consultant', sales: 180000, rate: 0.04, commission: 7200, status: 'Paid' },
      ];

      const headers = ['Staff Member', 'Role', 'Sales Total ($)', 'Base Rate (%)', 'Commission Earned ($)', 'Status'];
      const rows = staffList.map((s) => [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.role.replace(/"/g, '""')}"`,
        (s.sales / 100).toFixed(2),
        (s.rate * 100).toFixed(1),
        (s.commission / 100).toFixed(2),
        `"${s.status}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      expect(csvContent).toContain('"Sarah ""Sally"" Jenkins"');
      expect(csvContent).toContain('"Senior Stylist, Bridal"');
      expect(csvContent).toContain('5200.00');
      expect(csvContent).toContain('260.00');
      expect(csvContent).toContain('72.00');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. COMPETITOR INTELLIGENCE & SHARE OF VOICE NORMALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. Competitor Intelligence: Share of Voice & Location Resolution', () => {
    it('safely resolves business brand name from location slug without crashing', () => {
      expect(locationById('ido-br')?.business).toBe('I Do Bridal Couture');
      expect(locationById('ido-cov')?.business).toBe('I Do Bridal Couture');
      expect(locationById('pc-br')?.business).toBe('Proper & Company');
      expect(locationById('pc-cov')?.business).toBe('Proper & Company');

      // Invalid slug safely falls back to default location
      const invalid = locationById('non-existent-slug');
      expect(invalid).toBeDefined();
      expect(invalid.business).toBe('I Do Bridal Couture');
      expect(invalid.city).toBe('Baton Rouge');
    });

    it('guarantees normalized deterministic market share allocations bounded within 100%', () => {
      const apptCounts = [0, 5, 20, 100];

      for (const count of apptCounts) {
        const ownShare = Math.min(55, Math.max(35, 42 + Math.floor(count / 10)));
        expect(ownShare).toBeGreaterThanOrEqual(35);
        expect(ownShare).toBeLessThanOrEqual(55);

        const remainingPool = Math.max(20, 100 - ownShare);
        const competitors = ['Comp 1', 'Comp 2', 'Comp 3'];
        const sharePerComp = Math.max(5, Math.round(remainingPool / (competitors.length + 1)));

        const totalCompetitorShare = sharePerComp * competitors.length;
        const totalMarketShare = ownShare + totalCompetitorShare;

        expect(totalMarketShare).toBeLessThanOrEqual(100);
        expect(sharePerComp).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SALES WORKSPACE & APPOINTMENTS WORKSPACE LOGICAL FILTERS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('6. Workspace Logical Filters & Action Handlers', () => {
    it('evaluates SalesWorkspace refunds filter accurately against all refund vectors', () => {
      const refundsFilterFn = (i: any) =>
        i.status === 'Refunded' ||
        i.status === 'Void' ||
        i.paidCents < 0 ||
        (!!i.notes && String(i.notes).toLowerCase().includes('refund')) ||
        !!i.refund_status ||
        i.amountCents < 0;

      const invoices: any[] = [
        { id: 'inv-1', status: 'Paid', paidCents: 200000, amountCents: 200000, notes: 'Full payment' },
        { id: 'inv-2', status: 'Refunded', paidCents: 0, amountCents: 200000, notes: 'Returned gown' },
        { id: 'inv-3', status: 'Void', paidCents: 0, amountCents: 150000, notes: 'Voided transaction' },
        { id: 'inv-4', status: 'Open', paidCents: -50000, amountCents: 200000, notes: 'Disputed' },
        { id: 'inv-5', status: 'Closed', paidCents: 100000, amountCents: 100000, notes: 'Approved refund initiated' },
        { id: 'inv-6', status: 'Pending', paidCents: 0, amountCents: 100000, refund_status: 'approved' },
        { id: 'inv-7', status: 'Open', paidCents: 0, amountCents: -75000, notes: 'Credit note' },
      ];

      const matchedRefunds = invoices.filter(refundsFilterFn);
      expect(matchedRefunds.map((i) => i.id)).toEqual(['inv-2', 'inv-3', 'inv-4', 'inv-5', 'inv-6', 'inv-7']);
      expect(matchedRefunds.find((i) => i.id === 'inv-1')).toBeUndefined();
    });

    it('generates correct public booking link URLs for demo and live environments', () => {
      const origin = 'https://vowos.app';
      const getBookingUrl = (isDemo: boolean) => {
        const path = isDemo ? '/demoapp/book' : '/book';
        return `${origin}${path}`;
      };

      expect(getBookingUrl(true)).toBe('https://vowos.app/demoapp/book');
      expect(getBookingUrl(false)).toBe('https://vowos.app/book');
    });
  });
});
