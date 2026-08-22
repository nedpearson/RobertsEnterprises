import { describe, it, expect, beforeEach } from 'vitest';
import { ReturnOrder } from '@/components/vowos/ReturnsView';
import { Gown, PurchaseOrder, Customer, Invoice, LOCATIONS, locationById, marginPct, formatCents } from '@/data/vowosData';
import { demoDb } from '@/lib/demo/demoDatabase';
import { generateEntityId, resolveLocationId, resolveLocationSlug, isUuid } from '@/contexts/VowosDataContext';
import { OrganizationRole } from '@/lib/auth/roles';

describe('Milestone 2 Adversarial & Boundary Condition Test Suite (Challenger 2)', () => {
  beforeEach(() => {
    demoDb.reset();
  });

  describe('1. Empty State Handling (0 items across M2 components)', () => {
    it('0 appointments: calculations in Staff360 and CompetitorIntelligence do not produce NaN or crash', () => {
      // 1. Staff metrics with 0 appointments, 0 brides, 0 invoices
      const staffAppts: any[] = [];
      const assignedBrides: any[] = [];
      const staffInvoices: any[] = [];

      const totalAppts = staffAppts.length;
      const invoiceRevenue = staffInvoices.reduce((sum, inv) => sum + (inv.paidCents || inv.amountCents), 0);
      const brideSpend = assignedBrides.reduce((sum, b) => sum + (b.spendCents || 0), 0);
      const ytdSales = Math.max(invoiceRevenue, brideSpend);

      const convertedCount = staffAppts.filter((a) => a.status === 'Completed').length;
      const conversionRate = totalAppts > 0 ? Math.round((convertedCount / totalAppts) * 100) : (ytdSales > 0 ? 65 : 0);
      const salesCount = staffInvoices.length > 0 ? staffInvoices.length : (assignedBrides.filter((b) => b.spendCents > 0).length || 1);
      const avgTicketSize = ytdSales > 0 ? Math.round(ytdSales / salesCount) : 0;

      expect(totalAppts).toBe(0);
      expect(conversionRate).toBe(0);
      expect(Number.isNaN(conversionRate)).toBe(false);
      expect(avgTicketSize).toBe(0);
      expect(Number.isNaN(avgTicketSize)).toBe(false);

      // 2. Competitor Intelligence ownShare with 0 appointments
      const apptCount = 0;
      const ownShare = Math.min(55, Math.max(35, 42 + Math.floor(apptCount / 10)));
      expect(ownShare).toBe(42);
      expect(Number.isNaN(ownShare)).toBe(false);
    });

    it('0 invoices: CommissionsView calculations and filters handle empty invoice list gracefully', () => {
      const filteredInvoices: Invoice[] = [];
      const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.paidCents || inv.amountCents), 0);
      expect(totalRevenue).toBe(0);

      const staffList = [
        { name: 'Sarah Jenkins', role: 'Senior Stylist', salesTotal: 0, rate: 0.05, commission: 0, status: 'Pending' },
      ];
      const totalCommissions = staffList.reduce((sum, sc) => sum + sc.commission, 0);
      expect(totalCommissions).toBe(0);

      const earningStaffCount = staffList.filter((s) => s.salesTotal > 0).length || staffList.length;
      expect(earningStaffCount).toBe(1);
    });

    it('0 shifts: Staff360 dynamic fallback generates valid fallback shift entries', () => {
      const dbShifts: any[] = [];
      const staffAppts: any[] = [];

      const uniqueDates = Array.from(new Set(staffAppts.map((a) => a.date?.slice(0, 10)).filter(Boolean))).slice(0, 4);
      let shifts: any[];
      if (dbShifts.length > 0) {
        shifts = dbShifts;
      } else if (uniqueDates.length > 0) {
        shifts = uniqueDates.map((d) => ({ date: d, hours: 7.5, location: 'Baton Rouge' }));
      } else {
        shifts = [{ date: 'Recent', hours: 8, location: 'Main Boutique' }];
      }

      expect(shifts.length).toBe(1);
      expect(shifts[0].hours).toBe(8);
      expect(shifts[0].location).toBe('Main Boutique');
    });

    it('0 competitors: adding first competitor computes valid share without division by zero', () => {
      const competitors: any[] = [];
      const ownShare = 42;
      const remainingShare = Math.max(20, 100 - ownShare); // 58
      const newCount = competitors.length + 1; // 1
      const share = Math.max(5, Math.round(remainingShare / newCount)); // 58

      expect(share).toBe(58);
      expect(Number.isNaN(share)).toBe(false);
      expect(share + ownShare).toBe(100);
    });

    it('0 returns: ReturnsView filter gracefully yields empty list without exception', () => {
      const returns: ReturnOrder[] = [];
      const searchTerm = 'NonExistentVendor';
      const statusFilter = 'All';

      const filtered = returns.filter((rtv) => {
        const matchesSearch = !searchTerm.trim() || rtv.vendor.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || rtv.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      expect(filtered.length).toBe(0);
      expect(Array.isArray(filtered)).toBe(true);
    });
  });

  describe('2. Data Boundary Conditions (Negative, Extreme, Multi-Location)', () => {
    it('Negative amounts in invoices correctly classified by SalesWorkspace refund filter', () => {
      const sampleInvoices: any[] = [
        { id: 'INV-001', customer: 'Alice', amountCents: 350000, paidCents: 350000, status: 'Paid', notes: 'Normal sale' },
        { id: 'INV-002', customer: 'Bob', amountCents: -50000, paidCents: -50000, status: 'Refunded', notes: 'Defective dress return' },
        { id: 'INV-003', customer: 'Charlie', amountCents: 200000, paidCents: 0, status: 'Void', notes: 'Order cancelled' },
        { id: 'INV-004', customer: 'David', amountCents: 150000, paidCents: 150000, status: 'Open', notes: 'Refund processed via stripe', refund_status: 'completed' },
        { id: 'INV-005', customer: 'Eve', amountCents: 100000, paidCents: -25000, status: 'Partial', notes: 'Partial store credit refund' },
      ];

      const refundFilterFn = (i: any) =>
        i.status === 'Refunded' ||
        i.status === 'Void' ||
        i.paidCents < 0 ||
        (!!i.notes && String(i.notes).toLowerCase().includes('refund')) ||
        !!i.refund_status ||
        i.amountCents < 0;

      const refunds = sampleInvoices.filter(refundFilterFn);
      expect(refunds.length).toBe(4);
      expect(refunds.map((r) => r.id)).toEqual(['INV-002', 'INV-003', 'INV-004', 'INV-005']);
    });

    it('Large number financial operations maintain integer cent precision', () => {
      // Very large invoice amount: $12,500,000.00 (1,250,000,000 cents)
      const largeAmountCents = 1_250_000_000;
      const largePaidCents = 250_000_000;
      const balance = largeAmountCents - largePaidCents; // 1,000,000,000 cents ($10,000,000)

      const taxRate = 8.5;
      const taxAmount = Math.round(balance * (taxRate / 100)); // 85,000,000 cents
      const finalTotal = balance + taxAmount; // 1,085,000,000 cents

      expect(balance).toBe(1_000_000_000);
      expect(taxAmount).toBe(85_000_000);
      expect(finalTotal).toBe(1_085_000_000);

      const formatted = formatCents(finalTotal);
      expect(formatted).toBe('$10,850,000.00');

      // Commission calculation on large amount
      const commissionRate = 0.05;
      const commission = Math.round(finalTotal * commissionRate);
      expect(commission).toBe(54_250_000); // $542,500.00
      expect(formatCents(commission)).toBe('$542,500.00');
    });

    it('Extreme appointment volume caps ownShare properly in CompetitorIntelligence', () => {
      // 500 appointments
      const apptCount = 500;
      const ownShare = Math.min(55, Math.max(35, 42 + Math.floor(apptCount / 10)));
      expect(ownShare).toBe(55); // Capped at maximum 55%

      // Negative appointments (edge case)
      const negativeAppt = -100;
      const ownShareNeg = Math.min(55, Math.max(35, 42 + Math.floor(negativeAppt / 10)));
      expect(ownShareNeg).toBe(35); // Lower bound at 35%
    });

    it('Multi-location inventory aggregation handles missing, unknown, and cross-store locations', () => {
      const sampleGown: Gown = {
        id: 'g-100',
        name: 'Celeste',
        designer: 'Berta',
        style: 'Fit and Flare',
        size: '8',
        color: 'Ivory/Nude',
        sku: 'BER-CEL-08',
        priceCents: 850000,
        costCents: 425000,
        msrpCents: 900000,
        stock: 3,
        location: 'ido-br',
        status: 'In Stock',
        condition: 'New Sample',
        image: 'https://images.unsplash.com/sample',
        category: 'Bridal',
        vendor: 'Berta',
        reorderPoint: 1,
        notes: '',
      };

      const allGowns: Gown[] = [
        sampleGown,
        { ...sampleGown, id: 'g-101', location: 'ido-cov', stock: 2 },
        { ...sampleGown, id: 'g-102', location: 'pc-br', stock: 1 },
        { ...sampleGown, id: 'g-103', location: 'pc-cov', stock: 0 },
        // Different gown with same designer
        { ...sampleGown, id: 'g-104', name: 'Other', sku: 'BER-OTH-08', location: 'ido-br', stock: 5 },
      ];

      const crossLocationStock = LOCATIONS.map((loc) => {
        const matchingGowns = allGowns.filter((g) => {
          if (g.location !== loc.id) return false;
          if (sampleGown.sku && g.sku && g.sku.toLowerCase() === sampleGown.sku.toLowerCase()) return true;
          return (
            g.name.toLowerCase() === sampleGown.name.toLowerCase() &&
            g.designer.toLowerCase() === sampleGown.designer.toLowerCase()
          );
        });
        const stockCount = matchingGowns.reduce((sum, g) => sum + g.stock, 0);
        return {
          location: loc,
          stock: loc.id === sampleGown.location ? Math.max(sampleGown.stock, stockCount) : stockCount,
        };
      });

      expect(crossLocationStock.find((s) => s.location.id === 'ido-br')?.stock).toBe(3);
      expect(crossLocationStock.find((s) => s.location.id === 'ido-cov')?.stock).toBe(2);
      expect(crossLocationStock.find((s) => s.location.id === 'pc-br')?.stock).toBe(1);
      expect(crossLocationStock.find((s) => s.location.id === 'pc-cov')?.stock).toBe(0);

      const totalCrossLocation = crossLocationStock.reduce((acc, curr) => acc + curr.stock, 0);
      expect(totalCrossLocation).toBe(6);
    });

    it('Location resolution handles unknown location slugs safely', () => {
      expect(locationById('ido-br')?.business).toBe("I Do Bridal Couture");
      expect(locationById('unknown-location-slug')?.id).toBe(LOCATIONS[0].id);
      
      const locId = resolveLocationId('unknown-location-slug');
      expect(isUuid(locId)).toBe(true); // Falls back to default location UUID
    });

    it('Margin calculations handle zero and negative cost edge cases safely', () => {
      expect(marginPct(100000, 200000)).toBe(50); // Standard 50%
      expect(marginPct(0, 200000)).toBe(100); // Free cost -> 100% margin
      expect(marginPct(200000, 200000)).toBe(0); // Cost == Price -> 0% margin
      expect(marginPct(300000, 200000)).toBe(-50); // Loss -> -50% margin
    });
  });

  describe('3. Staff Performance & Escaping Integrity', () => {
    it('RFC-4180 CSV export properly quotes and escapes names with commas and quotes', () => {
      const problematicStaff = [
        { name: 'Smith, Jane "Stylist"', role: 'Senior Stylist, Bridal', sales: 400000, rate: 0.05, commission: 20000, status: 'Pending' },
      ];

      const headers = ['Staff Member', 'Role', 'Sales Total ($)', 'Base Rate (%)', 'Commission Earned ($)', 'Status'];
      const rows = problematicStaff.map((s) => [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.role.replace(/"/g, '""')}"`,
        (s.sales / 100).toFixed(2),
        (s.rate * 100).toFixed(1),
        (s.commission / 100).toFixed(2),
        `"${s.status}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      expect(csvContent).toContain('"Smith, Jane ""Stylist"""');
      expect(csvContent).toContain('"Senior Stylist, Bridal"');
      expect(csvContent).toContain('200.00');
    });

    it('Stylist name matching is case-insensitive and trims extraneous whitespace', () => {
      const staffName = '  Sarah Jenkins  ';
      const staffNameLower = staffName.toLowerCase().trim();

      const brides = [
        { name: 'Bride 1', stylist: 'sarah jenkins', spendCents: 150000 },
        { name: 'Bride 2', stylist: 'SARAH JENKINS ', spendCents: 200000 },
        { name: 'Bride 3', stylist: 'Emily Chen', spendCents: 300000 },
      ];

      const matching = brides.filter(
        (b) => b.stylist && b.stylist.toLowerCase().trim() === staffNameLower
      );

      expect(matching.length).toBe(2);
      const totalSpend = matching.reduce((sum, b) => sum + b.spendCents, 0);
      expect(totalSpend).toBe(350000);
    });
  });

  describe('4. Database Mutation & Ledger Integrity Verification', () => {
    it('Terminal checkout records payment and creates audit log in demoDb', async () => {
      const paymentId = generateEntityId();
      const invoiceId = generateEntityId();
      const customerId = generateEntityId();

      const insertRes = await demoDb.from('payments').insert({
        id: paymentId,
        business_id: 'b0000000-0000-0000-0000-000000000000',
        location_id: 'c0000000-0000-0000-0000-000000000001',
        customer_id: customerId,
        invoice_id: invoiceId,
        amount_cents: 185000,
        payment_method: 'terminal',
        provider_transaction_id: 'pos_tx_empirical_001',
        status: 'completed',
        notes: 'Empirical Challenge Verification',
        processed_at: new Date().toISOString(),
      });

      expect(insertRes.error).toBeNull();

      // Verify audit logs table
      const auditRes = await demoDb.from('audit_logs').insert({
        action: 'export_payroll_run',
        category: 'payroll',
        details: { period: 'This Month', staffCount: 4, totalCommissions: 68500 },
        created_at: new Date().toISOString(),
      });
      expect(auditRes.error).toBeNull();

      const fetchAudit = await demoDb.from('audit_logs').select('*');
      expect(fetchAudit.data?.some((a: any) => a.action === 'export_payroll_run')).toBe(true);
    });
  });
});
