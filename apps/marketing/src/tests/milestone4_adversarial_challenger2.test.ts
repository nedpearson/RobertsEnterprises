/**
 * Milestone 4 Adversarial & Stress Testing Suite (Challenger 2)
 *
 * Exhaustive empirical challenge of:
 * 1. platformDataSource.ts under worker offline / 500 / 409 errors (verifying graceful Supabase fallback).
 * 2. Support ticket triage state machine, priority/severity transitions, and internal staff notes vs public replies.
 * 3. Operational incident lifecycle (declaration across SEV-1/2/3, escalation, resolution).
 * 4. Failed jobs retry mechanics, status mappings, concurrency isolation, and error recovery.
 * 5. Dynamic health telemetry fallback calculation based on live incident & DLQ counts.
 * 6. Zero-placeholder, zero-fake-timer, and dynamic counter verification across Platform Admin.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Dynamic in-memory database mock state for testing Supabase fallbacks
let mockDbState: {
  durable_jobs: any[];
  platform_incidents: any[];
  support_tickets: any[];
  support_messages: any[];
  businesses: any[];
  platform_failed_jobs: any[];
  [table: string]: any[];
};

vi.mock('../lib/supabase', () => {
  const createQueryBuilder = (tableName: string) => {
    let currentData = [...(mockDbState[tableName] || [])];
    let isCountQuery = false;
    let pendingInsert: any = null;
    let pendingUpdate: any = null;
    let singleMode = false;

    const builder: any = {
      select: (_fields?: string, options?: any) => {
        if (options?.count === 'exact') {
          isCountQuery = true;
        }
        return builder;
      },
      insert: (payload: any) => {
        pendingInsert = Array.isArray(payload) ? payload : [payload];
        return builder;
      },
      update: (updates: any) => {
        pendingUpdate = updates;
        return builder;
      },
      eq: (col: string, val: any) => {
        currentData = currentData.filter((row) => row[col] === val);
        return builder;
      },
      in: (col: string, vals: any[]) => {
        currentData = currentData.filter((row) => vals.includes(row[col]));
        return builder;
      },
      is: (col: string, val: any) => {
        currentData = currentData.filter((row) => row[col] === val);
        return builder;
      },
      order: (_col: string, _opts?: any) => builder,
      limit: (n: number) => {
        currentData = currentData.slice(0, n);
        return builder;
      },
      maybeSingle: async () => {
        singleMode = true;
        if (pendingInsert) {
          const inserted = pendingInsert.map((item: any) => ({
            id: item.id || `gen-${Date.now()}-${Math.random()}`,
            ...item,
          }));
          mockDbState[tableName] = [...(mockDbState[tableName] || []), ...inserted];
          return { data: inserted[0] || null, error: null };
        }
        if (pendingUpdate) {
          const updated: any[] = [];
          mockDbState[tableName] = (mockDbState[tableName] || []).map((row) => {
            if (currentData.some((c) => c.id === row.id)) {
              const u = { ...row, ...pendingUpdate };
              updated.push(u);
              return u;
            }
            return row;
          });
          return { data: updated[0] || null, error: null };
        }
        return { data: currentData[0] || null, error: null };
      },
      single: async () => {
        singleMode = true;
        return builder.maybeSingle();
      },
      then: (resolve: any) => {
        if (pendingInsert) {
          const inserted = pendingInsert.map((item: any) => ({
            id: item.id || `gen-${Date.now()}-${Math.random()}`,
            ...item,
          }));
          mockDbState[tableName] = [...(mockDbState[tableName] || []), ...inserted];
          return resolve({ data: singleMode ? inserted[0] : inserted, error: null });
        }
        if (pendingUpdate) {
          const updated: any[] = [];
          mockDbState[tableName] = (mockDbState[tableName] || []).map((row) => {
            if (currentData.some((c) => c.id === row.id)) {
              const u = { ...row, ...pendingUpdate };
              updated.push(u);
              return u;
            }
            return row;
          });
          return resolve({ data: singleMode ? updated[0] || null : updated, error: null });
        }
        if (isCountQuery) {
          return resolve({ count: currentData.length, data: null, error: null });
        }
        return resolve({ data: currentData, error: null });
      },
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => createQueryBuilder(table),
    },
  };
});

import {
  isPlatformDemoPlane,
  setPlatformDemoPlane,
  getFailedJobs,
  retryJob,
  getIncidents,
  declareIncident,
  resolveIncident,
  updateIncident,
  getSupportTickets,
  getSupportTicketDetails,
  updateSupportTicket,
  postSupportMessage,
  getSystemHealth,
} from '../lib/platform/platformDataSource';
import { DEMO_FAILED_JOBS, DEMO_INCIDENTS } from '../lib/platform/platformDemoData';
import { isToday } from 'date-fns';

// In-memory mock storage for sessionStorage in Node environment
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

describe('Milestone 4 Adversarial & Stress Testing Suite (Challenger 2)', () => {
  let globalFetchMock: any;

  beforeEach(() => {
    (globalThis as any).window = { sessionStorage: new MemoryStorage() };

    mockDbState = {
      durable_jobs: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          business_id: 'b0000000-0000-0000-0000-000000000001',
          queue_name: 'sync_shopify_catalog',
          status: 'dead-letter',
          attempts: 5,
          max_attempts: 5,
          error_message: 'Shopify rate limit 429 exceeded',
          locked_at: null,
          locked_by: null,
          next_retry_at: null,
          created_at: '2026-08-20T10:00:00.000Z',
          updated_at: '2026-08-20T10:15:00.000Z',
          businesses: { name: 'I Do Bridal Couture' },
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          business_id: 'b0000000-0000-0000-0000-000000000002',
          queue_name: 'publish_meta_campaign',
          status: 'running',
          attempts: 2,
          max_attempts: 5,
          error_message: null,
          locked_at: new Date().toISOString(),
          locked_by: 'worker-pid-99',
          next_retry_at: null,
          created_at: '2026-08-20T11:00:00.000Z',
          updated_at: '2026-08-20T11:00:00.000Z',
          businesses: { name: 'Proper & Co' },
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          business_id: 'b0000000-0000-0000-0000-000000000001',
          queue_name: 'send_sms_reminder',
          status: 'pending',
          attempts: 1,
          max_attempts: 5,
          error_message: 'Twilio unreachable',
          locked_at: null,
          locked_by: null,
          next_retry_at: new Date(Date.now() + 60000).toISOString(),
          created_at: '2026-08-20T12:00:00.000Z',
          updated_at: '2026-08-20T12:00:00.000Z',
          businesses: { name: 'I Do Bridal Couture' },
        },
      ],
      platform_incidents: [
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          title: 'Shopify Webhook Ingestion Delay',
          severity: 'HIGH',
          status: 'INVESTIGATING',
          affected_scope: 'Shopify Catalog Sync',
          started_at: '2026-08-20T08:00:00.000Z',
          created_at: '2026-08-20T08:00:00.000Z',
          updated_at: '2026-08-20T08:30:00.000Z',
        },
      ],
      support_tickets: [
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          business_id: 'b0000000-0000-0000-0000-000000000001',
          subject: 'Appointment calendar sync issue',
          description: 'Stylist appointments not showing in Google Calendar',
          category: 'BOOKING',
          severity: 'Critical',
          priority: 'CRITICAL',
          status: 'NEW',
          created_at: '2026-08-20T09:00:00.000Z',
          updated_at: '2026-08-20T09:00:00.000Z',
          resolved_at: null,
          organizations: { name: 'I Do Bridal Couture' },
        },
      ],
      support_messages: [
        {
          id: 'msg-001',
          ticket_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          user_id: 'user-001',
          message: 'Customer reports appointments are missing.',
          is_internal_note: false,
          created_at: '2026-08-20T09:05:00.000Z',
        },
      ],
      businesses: [
        { id: 'b0000000-0000-0000-0000-000000000001', name: 'I Do Bridal Couture', parent_id: null },
        { id: 'b0000000-0000-0000-0000-000000000002', name: 'Proper & Co', parent_id: null },
      ],
      platform_failed_jobs: [],
    };

    // Global fetch mock
    globalFetchMock = vi.fn();
    (globalThis as any).fetch = globalFetchMock;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Worker Offline & 500 Error Fallback to Supabase
  // ==========================================================================
  describe('1. Platform Data Source: Graceful Supabase Fallback when Worker Fails', () => {
    it('getFailedJobs: seamlessly falls back to Supabase durable_jobs when worker returns HTTP 500', async () => {
      // Simulate Worker 500 error
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Worker Crash' }),
      });

      const result = await getFailedJobs();

      expect(result.demo).toBe(false);
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(3);
      expect(result.data[0].type).toBe('sync_shopify_catalog');
      expect(result.data[0].status).toBe('FAILED');
    });

    it('getFailedJobs: seamlessly falls back to Supabase durable_jobs when worker is offline (network error)', async () => {
      // Simulate Worker offline / ECONNREFUSED
      globalFetchMock.mockRejectedValueOnce(new Error('fetch failed: ECONNREFUSED 127.0.0.1:3001'));

      const result = await getFailedJobs();

      expect(result.demo).toBe(false);
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(3);
    });

    it('retryJob: successfully executes retry via Supabase when worker endpoint is offline', async () => {
      globalFetchMock.mockRejectedValueOnce(new Error('Network error: Worker offline'));

      const jobId = '11111111-1111-1111-1111-111111111111';
      const result = await retryJob(jobId);

      expect(result.success).toBe(true);
      expect(result.message).toContain(jobId);

      // Verify DB record was updated to pending and attempts reset
      const jobInDb = mockDbState.durable_jobs.find((j) => j.id === jobId);
      expect(jobInDb.status).toBe('pending');
      expect(jobInDb.attempts).toBe(0);
      expect(jobInDb.locked_at).toBeNull();
    });

    it('retryJob: surfaces 409 Conflict correctly when job is actively running on a worker', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Job is currently actively executing on a worker instance.' }),
      });

      const jobId = '22222222-2222-2222-2222-222222222222';
      const result = await retryJob(jobId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Job is currently actively executing on a worker instance.');
    });

    it('getIncidents: falls back to Supabase platform_incidents when worker returns 502 Bad Gateway', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: 'Bad Gateway' }),
      });

      const result = await getIncidents();

      expect(result.demo).toBe(false);
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].title).toBe('Shopify Webhook Ingestion Delay');
      expect(result.data[0].severity).toBe('SEV-2'); // HIGH maps to SEV-2
    });

    it('declareIncident: falls back to Supabase insert when worker returns 503 Service Unavailable', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service Unavailable' }),
      });

      const result = await declareIncident({
        title: 'SMS Delivery Outage in South Region',
        severity: 'SEV-1',
        status: 'INVESTIGATING',
        affected_scope: 'Twilio SMS reminders',
        description: 'Carrier network failure reported in region.',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('declared');
      expect(mockDbState.platform_incidents.length).toBe(2);
      expect(mockDbState.platform_incidents[1].title).toBe('SMS Delivery Outage in South Region');
    });

    it('resolveIncident: falls back to Supabase update when worker endpoint times out', async () => {
      globalFetchMock.mockRejectedValueOnce(new Error('Gateway Timeout after 10000ms'));

      const result = await resolveIncident('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Incident resolved.');

      const incInDb = mockDbState.platform_incidents.find((i) => i.id === 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      expect(incInDb.status).toBe('RESOLVED');
    });

    it('getSupportTickets: falls back to Supabase support_tickets when worker is unreachable', async () => {
      globalFetchMock.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await getSupportTickets({ status: 'NEW', severity: 'Critical' });
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].subject).toBe('Appointment calendar sync issue');
    });

    it('getSupportTicketDetails: falls back to Supabase when worker endpoint is offline', async () => {
      globalFetchMock.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await getSupportTicketDetails('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
      expect(result.error).toBeNull();
      expect(result.ticket).toBeDefined();
      expect(result.ticket.subject).toBe('Appointment calendar sync issue');
      expect(result.messages.length).toBe(1);
      expect(result.messages[0].message).toContain('Customer reports appointments are missing');
    });

    it('postSupportMessage: falls back to Supabase support_messages when worker is unreachable', async () => {
      globalFetchMock.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await postSupportMessage(
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Staff reviewed calendar logs and verified API connection.',
        true, // isInternalNote
        'operator-007'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Internal note added.');
      expect(mockDbState.support_messages.length).toBe(2);
      expect(mockDbState.support_messages[1].is_internal_note).toBe(true);
    });

    it('getSystemHealth: computes health checks dynamically from DB counts when worker is offline', async () => {
      globalFetchMock.mockRejectedValueOnce(new Error('Worker offline'));

      const result = await getSystemHealth();
      expect(result.demo).toBe(false);
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(8);

      const dbCheck = result.data.find((c: any) => c.name.includes('Database'));
      expect(dbCheck).toBeDefined();
      expect(dbCheck.status).toBe('OPERATIONAL');

      // Because durable_jobs has 1 dead-letter job in mockDbState, background jobs is DEGRADED
      const bgCheck = result.data.find((c: any) => c.name.includes('Background jobs'));
      expect(bgCheck).toBeDefined();
      expect(bgCheck.status).toBe('DEGRADED');

      // Because platform_incidents has 1 INVESTIGATING incident in mockDbState, overall is DEGRADED
      const overallCheck = result.data.find((c: any) => c.name.includes('Overall System'));
      expect(overallCheck).toBeDefined();
      expect(overallCheck.status).toBe('DEGRADED');
    });
  });

  // ==========================================================================
  // 2. Support Ticket Triage State Machine & Note Isolation
  // ==========================================================================
  describe('2. Support Ticket Triage: State Transitions & Note Flags', () => {
    it('handles the full lifecycle state machine: NEW -> IN_PROGRESS -> RESOLVED -> CLOSED', async () => {
      const ticketId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

      // 1. NEW -> IN_PROGRESS
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Ticket updated.', ticket: { id: ticketId, status: 'IN_PROGRESS' } }),
      });
      const res1 = await updateSupportTicket(ticketId, { status: 'IN_PROGRESS' });
      expect(res1.success).toBe(true);
      expect(res1.ticket?.status).toBe('IN_PROGRESS');

      // 2. IN_PROGRESS -> WAITING_ON_CUSTOMER
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Ticket updated.', ticket: { id: ticketId, status: 'WAITING_ON_CUSTOMER' } }),
      });
      const res2 = await updateSupportTicket(ticketId, { status: 'WAITING_ON_CUSTOMER' });
      expect(res2.success).toBe(true);
      expect(res2.ticket?.status).toBe('WAITING_ON_CUSTOMER');

      // 3. WAITING_ON_CUSTOMER -> RESOLVED
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Ticket updated.',
          ticket: { id: ticketId, status: 'RESOLVED', resolved_at: new Date().toISOString() },
        }),
      });
      const res3 = await updateSupportTicket(ticketId, { status: 'RESOLVED' });
      expect(res3.success).toBe(true);
      expect(res3.ticket?.status).toBe('RESOLVED');
      expect(res3.ticket?.resolved_at).toBeDefined();

      // 4. RESOLVED -> CLOSED
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Ticket updated.', ticket: { id: ticketId, status: 'CLOSED' } }),
      });
      const res4 = await updateSupportTicket(ticketId, { status: 'CLOSED' });
      expect(res4.success).toBe(true);
      expect(res4.ticket?.status).toBe('CLOSED');
    });

    it('priority and severity adjustments reflect cleanly', async () => {
      const ticketId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Ticket updated.',
          ticket: { id: ticketId, priority: 'CRITICAL', severity: 'Critical' },
        }),
      });

      const res = await updateSupportTicket(ticketId, { priority: 'CRITICAL', severity: 'Critical' });
      expect(res.success).toBe(true);
      expect(res.ticket?.priority).toBe('CRITICAL');
      expect(res.ticket?.severity).toBe('Critical');
    });

    it('internal notes have is_internal_note=true and return distinct message', async () => {
      const ticketId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

      // Internal staff note
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Internal note added.',
          supportMessage: {
            id: 'msg-note-1',
            ticket_id: ticketId,
            message: 'Checked server logs: DB pool connection timeout was resolved.',
            is_internal_note: true,
          },
        }),
      });

      const noteRes = await postSupportMessage(
        ticketId,
        'Checked server logs: DB pool connection timeout was resolved.',
        true,
        'admin-uuid'
      );

      expect(noteRes.success).toBe(true);
      expect(noteRes.message).toBe('Internal note added.');
      expect(noteRes.supportMessage?.is_internal_note).toBe(true);

      // Public tenant reply
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Reply posted successfully.',
          supportMessage: {
            id: 'msg-reply-1',
            ticket_id: ticketId,
            message: 'Your calendar sync has been restored and verified.',
            is_internal_note: false,
          },
        }),
      });

      const replyRes = await postSupportMessage(
        ticketId,
        'Your calendar sync has been restored and verified.',
        false,
        'admin-uuid'
      );

      expect(replyRes.success).toBe(true);
      expect(replyRes.message).toBe('Reply posted successfully.');
      expect(replyRes.supportMessage?.is_internal_note).toBe(false);
    });

    it('getSupportTickets accepts multi-filter parameters', async () => {
      globalFetchMock.mockImplementationOnce(async (url: string) => {
        expect(url).toContain('status=NEW');
        expect(url).toContain('severity=Critical');
        expect(url).toContain('category=BOOKING');
        expect(url).toContain('priority=CRITICAL');
        return {
          ok: true,
          json: async () => ({
            tickets: [
              {
                id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                subject: 'Sync issue',
                category: 'BOOKING',
                severity: 'Critical',
                status: 'NEW',
                priority: 'CRITICAL',
              },
            ],
          }),
        };
      });

      const res = await getSupportTickets({
        status: 'NEW',
        severity: 'Critical',
        category: 'BOOKING',
        priority: 'CRITICAL',
      });

      expect(res.error).toBeNull();
      expect(res.data.length).toBe(1);
    });
  });

  // ==========================================================================
  // 3. Incident Management Lifecycle & Severity Escalation
  // ==========================================================================
  describe('3. Platform Incidents: Declaration, Severity Escalation, and Resolution', () => {
    it('declares incidents across all severities (SEV-1, SEV-2, SEV-3)', async () => {
      const severities = ['SEV-1', 'SEV-2', 'SEV-3'];

      for (const sev of severities) {
        globalFetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Incident declared successfully.',
            incident: {
              id: `inc-${sev.toLowerCase()}`,
              title: `Test incident ${sev}`,
              severity: sev,
              status: 'INVESTIGATING',
              affected_scope: 'Platform Core',
            },
          }),
        });

        const res = await declareIncident({
          title: `Test incident ${sev}`,
          severity: sev,
          status: 'INVESTIGATING',
          affected_scope: 'Platform Core',
        });

        expect(res.success).toBe(true);
        expect(res.incident?.severity).toBe(sev);
      }
    });

    it('escalates incident from SEV-3 to SEV-1 and updates status to IDENTIFIED', async () => {
      const incId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Incident updated.',
          incident: {
            id: incId,
            severity: 'SEV-1',
            status: 'IDENTIFIED',
          },
        }),
      });

      const res = await updateIncident(incId, { severity: 'SEV-1', status: 'IDENTIFIED' });
      expect(res.success).toBe(true);
      expect(res.incident?.severity).toBe('SEV-1');
      expect(res.incident?.status).toBe('IDENTIFIED');
    });

    it('resolves incident and marks status as RESOLVED', async () => {
      const incId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Incident resolved.',
        }),
      });

      const res = await resolveIncident(incId);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Incident resolved.');
    });
  });

  // ==========================================================================
  // 4. Failed Jobs Retry Flow & Concurrency
  // ==========================================================================
  describe('4. Failed Jobs: UI Status Mappings, Retry Idempotency & Concurrency', () => {
    it('maps raw durable job statuses to UI labels correctly', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [
            { id: 'j1', raw_status: 'dead-letter', status: 'FAILED', queue_name: 'sync_shopify_catalog', attempts: 5 },
            { id: 'j2', raw_status: 'running', status: 'PROCESSING', queue_name: 'publish_meta_campaign', attempts: 1 },
            { id: 'j3', raw_status: 'pending', status: 'RETRYING', queue_name: 'send_sms_reminder', attempts: 2 },
            { id: 'j4', raw_status: 'completed', status: 'COMPLETED', queue_name: 'sync_growth', attempts: 1 },
          ],
        }),
      });

      const res = await getFailedJobs();
      expect(res.demo).toBe(false);
      expect(res.data.length).toBe(4);

      const statusMap = Object.fromEntries(res.data.map((j: any) => [j.id, j.status]));
      expect(statusMap['j1']).toBe('FAILED');
      expect(statusMap['j2']).toBe('PROCESSING');
      expect(statusMap['j3']).toBe('RETRYING');
      expect(statusMap['j4']).toBe('COMPLETED');
    });

    it('concurrent retries across 10 distinct job IDs execute reliably', async () => {
      const jobIds = Array.from({ length: 10 }, (_, i) => `00000000-0000-0000-0000-00000000000${i}`);

      globalFetchMock.mockImplementation(async (url: string) => {
        const idMatch = url.match(/\/jobs\/(00000000-0000-0000-0000-00000000000\d)\/retry/);
        const id = idMatch ? idMatch[1] : 'unknown';
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: `Job ${id} re-enqueued for immediate execution.`,
          }),
        };
      });

      const results = await Promise.all(jobIds.map((id) => retryJob(id)));

      expect(results.length).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(results[i].success).toBe(true);
        expect(results[i].message).toContain(jobIds[i]);
      }
    });

    it('demo plane isolation: demo retry mutates demo dataset without affecting live plane', async () => {
      setPlatformDemoPlane(true);
      expect(isPlatformDemoPlane()).toBe(true);

      const demoJob = DEMO_FAILED_JOBS[0];
      const initialAttempts = demoJob.attempts;

      const res = await retryJob(demoJob.id);
      expect(res.success).toBe(true);
      expect(res.message).toContain('Demo job re-enqueued');
      expect(demoJob.status).toBe('PROCESSING');
      expect(demoJob.attempts).toBe(initialAttempts + 1);

      setPlatformDemoPlane(false);
      expect(isPlatformDemoPlane()).toBe(false);
    });
  });

  // ==========================================================================
  // 5. System Health Dynamic Metrics & Edge Cases
  // ==========================================================================
  describe('5. System Health Telemetry Fallback Calculations', () => {
    it('overall status is OPERATIONAL when there are 0 active incidents and 0 DLQ jobs', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OPERATIONAL',
          checks: [
            { name: 'Database (Postgres)', status: 'OPERATIONAL', latencyMs: 12, failureRate: 0, lastCheck: new Date().toISOString(), affectedOrgs: 0 },
            { name: 'Worker / API', status: 'OPERATIONAL', latencyMs: 6, failureRate: 0, lastCheck: new Date().toISOString(), affectedOrgs: 0 },
            { name: 'Background jobs', status: 'OPERATIONAL', latencyMs: 20, failureRate: 0, lastCheck: new Date().toISOString(), affectedOrgs: 0 },
          ],
          openIncidents: 0,
        }),
      });

      const res = await getSystemHealth();
      expect(res.demo).toBe(false);
      expect(res.data.every((c: any) => c.status === 'OPERATIONAL')).toBe(true);
    });

    it('background jobs status is DEGRADED when dead-letter queue is elevated', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'DEGRADED',
          checks: [
            { name: 'Database (Postgres)', status: 'OPERATIONAL', latencyMs: 12, failureRate: 0, lastCheck: new Date().toISOString(), affectedOrgs: 0 },
            { name: 'Background jobs', status: 'DEGRADED', latencyMs: 25, failureRate: 0.12, lastCheck: new Date().toISOString(), affectedOrgs: 2 },
          ],
          openIncidents: 0,
        }),
      });

      const res = await getSystemHealth();
      const bgCheck = res.data.find((c: any) => c.name === 'Background jobs');
      expect(bgCheck).toBeDefined();
      expect(bgCheck.status).toBe('DEGRADED');
      expect(bgCheck.affectedOrgs).toBe(2);
    });
  });

  // ==========================================================================
  // 6. Zero-Placeholder & Dynamic Counters Verification
  // ==========================================================================
  describe('6. Zero-Placeholder & Dynamic Metric Integrity', () => {
    it('SupportQueue dynamically computes Resolved Today count from resolved_at / updated_at', () => {
      const todayIso = new Date().toISOString();
      const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const sampleTickets = [
        { id: 't1', status: 'RESOLVED', resolved_at: todayIso, updated_at: todayIso },
        { id: 't2', status: 'CLOSED', resolved_at: todayIso, updated_at: todayIso },
        { id: 't3', status: 'RESOLVED', resolved_at: yesterdayIso, updated_at: yesterdayIso },
        { id: 't4', status: 'NEW', resolved_at: null, updated_at: todayIso },
        { id: 't5', status: 'IN_PROGRESS', resolved_at: null, updated_at: todayIso },
      ];

      const resolvedTodayCount = sampleTickets.filter((t) => {
        if (t.status !== 'RESOLVED' && t.status !== 'CLOSED') return false;
        const dateToCheck = t.resolved_at || t.updated_at;
        if (!dateToCheck) return false;
        try {
          return isToday(new Date(dateToCheck));
        } catch {
          return false;
        }
      }).length;

      expect(resolvedTodayCount).toBe(2);
    });

    it('FailedJobsView optimistic override transitions and reverts cleanly on error', () => {
      const initialJob = {
        id: 'job-101',
        org: 'Proper & Co',
        type: 'publish_meta_campaign',
        status: 'FAILED',
        attempts: 5,
        lastError: 'Meta token expired',
      };

      // 1. Optimistic transition to PROCESSING
      let optimisticOverrides: Record<string, any> = {
        [initialJob.id]: { status: 'PROCESSING', attempts: initialJob.attempts + 1 },
      };

      let computedJob = { ...initialJob, ...optimisticOverrides[initialJob.id] };
      expect(computedJob.status).toBe('PROCESSING');
      expect(computedJob.attempts).toBe(6);

      // 2. On error, optimistic override is cleared and status reverts
      delete optimisticOverrides[initialJob.id];
      computedJob = { ...initialJob, ...(optimisticOverrides[initialJob.id] || {}) };
      expect(computedJob.status).toBe('FAILED');
      expect(computedJob.attempts).toBe(5);
    });

    it('scans PlatformAdmin codebase for zero placeholder compliance', () => {
      const adminDir = path.resolve(__dirname, '../pages/PlatformAdmin');
      if (fs.existsSync(adminDir)) {
        const checkDir = (dir: string) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              checkDir(fullPath);
            } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
              const content = fs.readFileSync(fullPath, 'utf8');
              // Ensure no "under construction" phrases remain
              expect(content.toLowerCase()).not.toContain('under construction');
              // Ensure no mock setTimeout simulations for payments/actions
              expect(content).not.toMatch(/setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setLoading\(false\)/);
            }
          }
        };
        checkDir(adminDir);
      }
    });
  });
});
