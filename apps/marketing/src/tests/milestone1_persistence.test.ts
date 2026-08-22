import { describe, it, expect, beforeEach } from 'vitest';
import {
  isUuid,
  generateEntityId,
  resolveLocationId,
  resolveLocationSlug,
  DEMO_BUSINESS_ID,
  DEMO_LOCATION_MAP,
} from '@/contexts/VowosDataContext';
import { demoDb } from '@/lib/demo/demoDatabase';
import { sendAndLogMessage } from '@/lib/messaging';
import { setActiveDataPlane } from '@/lib/supabase';

describe('Milestone 1: Database Schema Alignment & Mutation Persistence', () => {
  describe('UUID & Location Resolution Utilities', () => {
    it('generates valid RFC-4122 v4 UUIDs', () => {
      const id1 = generateEntityId();
      const id2 = generateEntityId();
      expect(isUuid(id1)).toBe(true);
      expect(isUuid(id2)).toBe(true);
      expect(id1).not.toBe(id2);
    });

    it('correctly maps boutique location slugs to deterministic UUIDs', () => {
      expect(resolveLocationId('ido-br')).toBe(DEMO_LOCATION_MAP['ido-br']);
      expect(resolveLocationId('ido-cov')).toBe(DEMO_LOCATION_MAP['ido-cov']);
      expect(resolveLocationId('pc-br')).toBe(DEMO_LOCATION_MAP['pc-br']);
      expect(resolveLocationId('pc-cov')).toBe(DEMO_LOCATION_MAP['pc-cov']);
    });

    it('preserves existing valid UUIDs when resolving location ID', () => {
      const customUuid = '12345678-1234-4234-8234-123456789abc';
      expect(resolveLocationId(customUuid)).toBe(customUuid);
    });

    it('resolves location slugs inversely from deterministic UUIDs', () => {
      expect(resolveLocationSlug(DEMO_LOCATION_MAP['ido-br'])).toBe('ido-br');
      expect(resolveLocationSlug(DEMO_LOCATION_MAP['ido-cov'])).toBe('ido-cov');
      expect(resolveLocationSlug(DEMO_LOCATION_MAP['pc-br'])).toBe('pc-br');
      expect(resolveLocationSlug(DEMO_LOCATION_MAP['pc-cov'])).toBe('pc-cov');
      expect(resolveLocationSlug(null)).toBe('ido-br');
    });
  });

  describe('Demo Database Mock Schema & View Aliasing', () => {
    beforeEach(() => {
      demoDb.reset();
    });

    it('seeds and queries time_entries', async () => {
      const res = await demoDb.from('time_entries').select('*');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data.length).toBeGreaterThanOrEqual(2);
      expect(res.data[0]).toHaveProperty('staff_name');
      expect(res.data[0]).toHaveProperty('clock_in');
    });

    it('seeds and queries sales_goals', async () => {
      const res = await demoDb.from('sales_goals').select('*');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data.length).toBeGreaterThanOrEqual(2);
      expect(res.data[0]).toHaveProperty('goal_cents');
    });

    it('seeds and queries staff_schedules', async () => {
      const res = await demoDb.from('staff_schedules').select('*');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data.length).toBeGreaterThanOrEqual(2);
      expect(res.data[0]).toHaveProperty('weekday');
    });

    it('seeds and queries durable_jobs and automation_rules', async () => {
      const jobsRes = await demoDb.from('durable_jobs').select('*');
      expect(jobsRes.error).toBeNull();
      expect(jobsRes.data.length).toBeGreaterThanOrEqual(1);

      const rulesRes = await demoDb.from('automation_rules').select('*');
      expect(rulesRes.error).toBeNull();
      expect(rulesRes.data.length).toBeGreaterThanOrEqual(1);
    });

    it('seeds and queries marketing_budgets and pickups', async () => {
      const budgetRes = await demoDb.from('marketing_budgets').select('*');
      expect(budgetRes.error).toBeNull();
      expect(budgetRes.data.length).toBeGreaterThanOrEqual(1);

      const pickupsRes = await demoDb.from('pickups').select('*');
      expect(pickupsRes.error).toBeNull();
      expect(pickupsRes.data.length).toBeGreaterThanOrEqual(1);
    });

    it('provides view aliasing: brides -> customers', async () => {
      const bridesRes = await demoDb.from('brides').select('*');
      const custRes = await demoDb.from('customers').select('*');
      expect(bridesRes.error).toBeNull();
      expect(bridesRes.data.length).toBe(custRes.data.length);
      expect(bridesRes.data[0].name).toBe(custRes.data[0].name);
    });

    it('provides view aliasing: inventory_items -> gowns', async () => {
      const invRes = await demoDb.from('inventory_items').select('*');
      const gownsRes = await demoDb.from('gowns').select('*');
      expect(invRes.error).toBeNull();
      expect(invRes.data.length).toBe(gownsRes.data.length);
    });
  });

  describe('Messaging & Outbound Persistence Alignment', () => {
    beforeEach(() => {
      demoDb.reset();
    });

    it('persists message with business_id and content sync in demo database', async () => {
      const msgPayload = {
        id: generateEntityId(),
        business_id: DEMO_BUSINESS_ID,
        customer: 'Emma Carter',
        channel: 'email',
        to_address: 'bride@example.com',
        subject: 'Fitting Confirmation',
        body: 'Your fitting is scheduled for tomorrow at 10:00 AM.',
        content: 'Your fitting is scheduled for tomorrow at 10:00 AM.',
        kind: 'reminder',
        status: 'sent',
        direction: 'outbound',
        sent_at: new Date().toISOString(),
      };

      const insertRes = await demoDb.from('messages').insert(msgPayload);
      expect(insertRes.error).toBeNull();

      const messagesRes = await demoDb.from('messages').select('*').eq('customer', 'Emma Carter');
      expect(messagesRes.error).toBeNull();
      const lastMsg = messagesRes.data.find((m: any) => m.subject === 'Fitting Confirmation');
      expect(lastMsg).toBeDefined();
      expect(lastMsg.body).toBe('Your fitting is scheduled for tomorrow at 10:00 AM.');
      expect(lastMsg.content).toBe('Your fitting is scheduled for tomorrow at 10:00 AM.');
      expect(lastMsg.business_id).toBe(DEMO_BUSINESS_ID);
      expect(lastMsg.status).toBe('sent');
      expect(lastMsg.direction).toBe('outbound');
    });
  });
});
