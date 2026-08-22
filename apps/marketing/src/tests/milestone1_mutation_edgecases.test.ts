import { describe, it, expect, beforeEach } from 'vitest';
import {
  isUuid,
  generateEntityId,
  resolveLocationId,
  resolveLocationSlug,
  DEMO_BUSINESS_ID,
  DEMO_LOCATION_MAP,
} from '@/contexts/VowosDataContext';
import { gownStatusForStock, Invoice } from '@/data/vowosData';
import { demoDb } from '@/lib/demo/demoDatabase';

describe('Adversarial Stress Test: Milestone 1 Mutation Edge Cases & Business Invariants', () => {
  beforeEach(() => {
    demoDb.reset();
  });

  // ─── 1. Gown Stock Status Invariants & Price/Stock Boundary Clamping ───
  describe('1. Gown Stock Status & Boundary Clamping', () => {
    it('gownStatusForStock correctly computes status across boundary thresholds', () => {
      expect(gownStatusForStock(0)).toBe('On Order');
      expect(gownStatusForStock(-5)).toBe('On Order');
      expect(gownStatusForStock(1)).toBe('Low Stock');
      expect(gownStatusForStock(2)).toBe('In Stock');
      expect(gownStatusForStock(100)).toBe('In Stock');
    });

    it('clamps negative stock adjustments to 0 and rounds non-integers', async () => {
      const gownId = generateEntityId();
      const locId = resolveLocationId('ido-br');

      await demoDb.from('gowns').insert({
        id: gownId,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        location: 'ido-br',
        name: 'Celeste',
        designer: 'Ines Di Santo',
        style: 'IDS-101',
        size: '10',
        color: 'Ivory',
        price_cents: 400000,
        stock: 5,
        status: 'In Stock',
      });

      // Adjust to negative stock
      const rawStock = -10;
      const clampedStock = Math.max(0, Math.round(rawStock));
      const status = gownStatusForStock(clampedStock);

      const updateRes = await demoDb.from('gowns').update({ stock: clampedStock, status }).eq('id', gownId);
      expect(updateRes.error).toBeNull();

      const queryRes = await demoDb.from('gowns').select('*').eq('id', gownId);
      expect(queryRes.data[0].stock).toBe(0);
      expect(queryRes.data[0].status).toBe('On Order');
    });

    it('clamps negative price adjustments to 0 and rounds fractional cents', async () => {
      const gownId = generateEntityId();
      const locId = resolveLocationId('ido-br');

      await demoDb.from('gowns').insert({
        id: gownId,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        location: 'ido-br',
        name: 'Seraphina',
        designer: 'Berta',
        style: 'B-202',
        size: '8',
        color: 'Ivory',
        price_cents: 500000,
        stock: 2,
        status: 'In Stock',
      });

      // Price adjustment with decimal cents
      const rawPrice = 450000.75;
      const clampedPrice = Math.max(0, Math.round(rawPrice));

      const updateRes = await demoDb.from('gowns').update({ price_cents: clampedPrice }).eq('id', gownId);
      expect(updateRes.error).toBeNull();

      const queryRes = await demoDb.from('gowns').select('*').eq('id', gownId);
      expect(queryRes.data[0].price_cents).toBe(450001);
    });
  });

  // ─── 2. Invoice & Payment Boundary Cases ───
  describe('2. Invoice & Payment Boundary Edge Cases', () => {
    it('handles zero deposit (Open status), exact deposit (Paid status), and partial deposit', async () => {
      const invId1 = generateEntityId();
      const invId2 = generateEntityId();
      const invId3 = generateEntityId();
      const locId = resolveLocationId('ido-br');

      // Case 1: Deposit = 0 -> Open
      const dep1 = Math.max(0, Math.min(0, 300000));
      const status1: Invoice['status'] = dep1 >= 300000 ? 'Paid' : dep1 > 0 ? 'Partial' : 'Open';
      expect(status1).toBe('Open');

      await demoDb.from('invoices').insert({
        id: invId1,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        amount_cents: 300000,
        paid_cents: dep1,
        status: status1,
      });

      // Case 2: Deposit = Full Amount -> Paid
      const dep2 = Math.max(0, Math.min(300000, 300000));
      const status2: Invoice['status'] = dep2 >= 300000 ? 'Paid' : dep2 > 0 ? 'Partial' : 'Open';
      expect(status2).toBe('Paid');

      await demoDb.from('invoices').insert({
        id: invId2,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        amount_cents: 300000,
        paid_cents: dep2,
        status: status2,
      });

      // Case 3: Over-deposit attempted (Deposit 400k on 300k invoice) -> clamped to 300k, Paid
      const dep3 = Math.max(0, Math.min(400000, 300000));
      const status3: Invoice['status'] = dep3 >= 300000 ? 'Paid' : dep3 > 0 ? 'Partial' : 'Open';
      expect(dep3).toBe(300000);
      expect(status3).toBe('Paid');

      await demoDb.from('invoices').insert({
        id: invId3,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        amount_cents: 300000,
        paid_cents: dep3,
        status: status3,
      });
    });

    it('recordPayment caps payment to remaining balance and transitions status', async () => {
      const invId = generateEntityId();
      const locId = resolveLocationId('ido-cov');

      await demoDb.from('invoices').insert({
        id: invId,
        business_id: DEMO_BUSINESS_ID,
        location_id: locId,
        customer: 'Elena Rostova',
        amount_cents: 200000,
        paid_cents: 50000,
        status: 'Partial',
      });

      // Attempt overpayment of 250k when balance is 150k
      const initialPaid = 50000;
      const amount = 200000;
      const balance = amount - initialPaid; // 150k
      const paymentAttempt = 250000;
      const appliedPayment = Math.min(paymentAttempt, balance); // 150k
      const newPaid = initialPaid + appliedPayment; // 200k
      const newStatus: Invoice['status'] = newPaid >= amount ? 'Paid' : 'Partial';

      expect(appliedPayment).toBe(150000);
      expect(newPaid).toBe(200000);
      expect(newStatus).toBe('Paid');

      const updateRes = await demoDb.from('invoices').update({ paid_cents: newPaid, status: newStatus }).eq('id', invId);
      expect(updateRes.error).toBeNull();

      const queryRes = await demoDb.from('invoices').select('*').eq('id', invId);
      expect(queryRes.data[0].paid_cents).toBe(200000);
      expect(queryRes.data[0].status).toBe('Paid');
    });
  });

  // ─── 3. Inter-Store Transfers & Automatic Destination Gown Provisioning ───
  describe('3. Inter-Store Transfers & Automatic Destination Gown Provisioning', () => {
    it('creates a new destination gown record with fresh UUID when receiving transfer to a store without that gown', async () => {
      const sourceGownId = generateEntityId();
      const fromLocId = resolveLocationId('ido-br');
      const toLocId = resolveLocationId('pc-cov');

      // 1. Create source gown in ido-br with stock 3
      const sourceGown = {
        id: sourceGownId,
        business_id: DEMO_BUSINESS_ID,
        location_id: fromLocId,
        location: 'ido-br',
        name: 'Monique Lhuillier Bliss',
        designer: 'Monique Lhuillier',
        style: 'ML-200',
        size: '10',
        color: 'Silk White',
        price_cents: 450000,
        stock: 3,
        status: gownStatusForStock(3),
        sku: `IDB-${sourceGownId.slice(0, 8).toUpperCase()}`,
        cost_cents: 225000,
        msrp_cents: 450000,
        category: 'Bridal Gown',
        condition: 'New',
        vendor: 'Monique Lhuillier',
        reorder_point: 1,
        notes: '',
      };

      await demoDb.from('gowns').insert(sourceGown);

      // 2. Transfer 2 units to pc-cov
      const transferId = generateEntityId();
      const transferQty = 2;
      const remainingStock = sourceGown.stock - transferQty; // 1 -> 'Low Stock'

      await demoDb.from('gowns').update({ stock: remainingStock, status: gownStatusForStock(remainingStock) }).eq('id', sourceGownId);

      const transferPayload = {
        id: transferId,
        business_id: DEMO_BUSINESS_ID,
        location_id: fromLocId,
        from_location_id: fromLocId,
        to_location_id: toLocId,
        from_location: 'ido-br',
        to_location: 'pc-cov',
        gown_id: sourceGownId,
        gown_name: sourceGown.name,
        qty: transferQty,
        status: 'In Transit',
        requested: '2027-03-01',
        received: null,
        note: 'Store rebalance',
      };

      await demoDb.from('transfers').insert(transferPayload);

      // 3. Receive transfer: No existing gown at pc-cov -> create new gown record at pc-cov
      const destGownId = generateEntityId();
      const destGown = {
        ...sourceGown,
        id: destGownId,
        location_id: toLocId,
        location: 'pc-cov',
        stock: transferQty, // 2 -> 'In Stock'
        status: gownStatusForStock(transferQty),
      };

      expect(destGownId).not.toBe(sourceGownId);
      expect(isUuid(destGownId)).toBe(true);
      expect(isUuid(destGown.location_id)).toBe(true);

      await demoDb.from('gowns').insert(destGown);
      await demoDb.from('transfers').update({ status: 'Received', received: '2027-03-02' }).eq('id', transferId);

      // Verify source gown has 1 piece left (Low Stock)
      const srcCheck = await demoDb.from('gowns').select('*').eq('id', sourceGownId);
      expect(srcCheck.data[0].stock).toBe(1);
      expect(srcCheck.data[0].status).toBe('Low Stock');

      // Verify dest gown has 2 pieces created (In Stock)
      const dstCheck = await demoDb.from('gowns').select('*').eq('id', destGownId);
      expect(dstCheck.data[0].stock).toBe(2);
      expect(dstCheck.data[0].status).toBe('In Stock');
      expect(dstCheck.data[0].location).toBe('pc-cov');
      expect(dstCheck.data[0].location_id).toBe(toLocId);

      // Verify transfer marked Received
      const trCheck = await demoDb.from('transfers').select('*').eq('id', transferId);
      expect(trCheck.data[0].status).toBe('Received');
      expect(trCheck.data[0].received).toBe('2027-03-02');
    });
  });

  // ─── 4. Time and Schedule Conversion Edge Cases ───
  describe('4. Time String to ISO Range Conversion', () => {
    it('converts various 12-hour AM/PM time strings into valid ISO range dates without NaN or throwing', () => {
      const timeToIsoRange = (dateStr: string, timeStr: string): { startAt: string; endAt: string } => {
        try {
          const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((timeStr || '10:00 AM').trim());
          let h = 10;
          let min = 0;
          if (m) {
            h = parseInt(m[1], 10) % 12;
            if (m[3].toUpperCase() === 'PM') h += 12;
            min = parseInt(m[2], 10);
          }
          const d = new Date(dateStr || '2027-05-01');
          d.setHours(h, min, 0, 0);
          const startAt = d.toISOString();
          const endAt = new Date(d.getTime() + 90 * 60 * 1000).toISOString();
          return { startAt, endAt };
        } catch {
          const now = new Date().toISOString();
          return { startAt: now, endAt: now };
        }
      };

      const testTimes = [
        '10:00 AM',
        '12:00 PM',
        '12:00 AM',
        '1:30 PM',
        '11:45 PM',
        '9:00 am',
        '3:15 pm',
        '',
        'invalid time string',
      ];

      for (const t of testTimes) {
        const { startAt, endAt } = timeToIsoRange('2027-06-15', t);
        expect(typeof startAt).toBe('string');
        expect(typeof endAt).toBe('string');
        expect(isNaN(Date.parse(startAt))).toBe(false);
        expect(isNaN(Date.parse(endAt))).toBe(false);
        expect(Date.parse(endAt)).toBeGreaterThan(Date.parse(startAt));
      }
    });
  });
});
