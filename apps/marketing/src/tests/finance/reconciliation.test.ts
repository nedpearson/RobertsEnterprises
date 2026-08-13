import { describe, it, expect } from 'vitest';
import {
  calculatePlatformMRR,
  calculateOrderTotal,
  calculateOutstandingBalance,
  calculateInventoryLedger,
  SubRecord
} from '../../lib/finance/reconciliationEngine';

describe('VowOS Phase 11: Reconciliation Engine', () => {

  describe('MRR Calculations', () => {
    it('calculates correct MRR for active monthly and annual plans', () => {
      const subs: SubRecord[] = [
        { tenantId: 't1', planId: 'pro', status: 'ACTIVE', interval: 'MONTHLY', monthlyPriceCents: 49900 },
        { tenantId: 't2', planId: 'growth', status: 'ACTIVE', interval: 'ANNUAL', monthlyPriceCents: 19900 },
        { tenantId: 't3', planId: 'pro', status: 'PAST_DUE', interval: 'MONTHLY', monthlyPriceCents: 49900 },
      ];
      // 49900 + 19900 + 49900 = 119700
      expect(calculatePlatformMRR(subs)).toBe(119700);
    });

    it('excludes trials, canceled, comped, and internal accounts from MRR', () => {
      const subs: SubRecord[] = [
        { tenantId: 't1', planId: 'pro', status: 'TRIAL', interval: 'MONTHLY', monthlyPriceCents: 49900 },
        { tenantId: 't2', planId: 'growth', status: 'CANCELED', interval: 'MONTHLY', monthlyPriceCents: 19900 },
        { tenantId: 'roberts-ent', planId: 'elite', status: 'INTERNAL', interval: 'MONTHLY', monthlyPriceCents: 99900 },
        { tenantId: 't3', planId: 'essentials', status: 'COMPED', interval: 'MONTHLY', monthlyPriceCents: 4900 },
      ];
      // Phase 11 Rule 39: Roberts Enterprises contributes $0 MRR / ARR
      expect(calculatePlatformMRR(subs)).toBe(0);
    });
  });

  describe('Order Total Reconciliation', () => {
    it('correctly calculates order total with discounts and taxes', () => {
      const subtotalCents = 150000; // $1,500
      const discountsCents = 20000; // $200
      const taxCents = 10400;       // $104
      const shippingCents = 5000;   // $50
      const otherCents = 0;
      
      const total = calculateOrderTotal(subtotalCents, discountsCents, taxCents, shippingCents, otherCents);
      // 150000 - 20000 + 10400 + 5000 = 145400
      expect(total).toBe(145400);
    });

    it('prevents negative order totals', () => {
      const total = calculateOrderTotal(5000, 10000, 0, 0, 0); // Discount larger than subtotal
      expect(total).toBe(0);
    });
  });

  describe('Outstanding Balance Reconciliation', () => {
    it('calculates correct balance for partial payments', () => {
      const totalCents = 145400;
      const successfulPayments = 50000;
      const credits = 0;
      const refundAdjustments = 0;
      
      const balance = calculateOutstandingBalance(totalCents, successfulPayments, credits, refundAdjustments);
      expect(balance).toBe(95400);
    });

    it('calculates 0 balance for fully paid orders', () => {
      const balance = calculateOutstandingBalance(10000, 10000, 0, 0);
      expect(balance).toBe(0);
    });

    it('accounts for credits', () => {
      const balance = calculateOutstandingBalance(10000, 5000, 5000, 0);
      expect(balance).toBe(0);
    });
  });

  describe('Inventory Ledger Reconciliation', () => {
    it('calculates correct inventory from ledger movements', () => {
      const balance = calculateInventoryLedger(
        10, // Beginning
        5,  // Receipts
        2,  // Returns
        0,  // Transfers in
        8,  // Sales
        1,  // Transfers out
        -1  // Adjustments (damage)
      );
      // 10 + 5 + 2 + 0 - 8 - 1 - 1 = 7
      expect(balance).toBe(7);
    });
  });
});
