/**
 * Platform Admin adversarial tests.
 *
 * The browser is not a privileged fallback data plane. These tests challenge the
 * production boundary by forcing worker failures, authorization errors and
 * missing telemetry, and assert that Platform Admin fails closed instead of
 * mutating/querying privileged tables directly or manufacturing health state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('../lib/supabase', () => {
  const chain: any = {
    select: () => chain,
    is: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: { access_token: 'platform-adversarial-token' } } }),
      },
      from: () => chain,
    },
  };
});

import {
  declareIncident,
  generateReconnectUrl,
  getFailedJobs,
  getIncidents,
  getIntegrations,
  getSupportTicketDetails,
  getSupportTickets,
  getSystemHealth,
  isPlatformDemoPlane,
  postSupportMessage,
  resolveIncident,
  retryJob,
  setPlatformDemoPlane,
  testConnection,
  triggerAutoRepair,
  updateIncident,
  updateSupportTicket,
} from '../lib/platform/platformDataSource';
import { DEMO_FAILED_JOBS } from '../lib/platform/platformDemoData';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.has(key) ? this.values.get(key)! : null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function response(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('Platform Admin fail-closed adversarial boundary', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    (globalThis as any).window = { sessionStorage: new MemoryStorage() };
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete (globalThis as any).window;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not fall back to privileged browser reads when failed-jobs API is offline', async () => {
    fetchMock.mockRejectedValueOnce(new Error('worker offline'));
    const result = await getFailedJobs();
    expect(result.demo).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toMatch(/worker offline/i);
  });

  it('does not perform a direct browser retry mutation when the platform API fails', async () => {
    fetchMock.mockResolvedValueOnce(response({ error: 'worker unavailable' }, 503));
    const result = await retryJob('11111111-1111-4111-8111-111111111111');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/worker unavailable/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces authorization failures instead of reading incidents directly', async () => {
    fetchMock.mockResolvedValueOnce(response({ error: 'Platform administrator access required.' }, 403));
    const result = await getIncidents();
    expect(result.data).toEqual([]);
    expect(result.error).toMatch(/platform administrator/i);
  });

  it('does not write incidents directly when the worker rejects the request', async () => {
    fetchMock.mockResolvedValueOnce(response({ error: 'Service unavailable' }, 503));
    const result = await declareIncident({ title: 'Observed outage', severity: 'SEV-1' });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/service unavailable/i);
  });

  it('does not resolve incidents directly when the worker is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('gateway timeout'));
    const result = await resolveIncident('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/gateway timeout/i);
  });

  it('does not read or write support data through a browser fallback', async () => {
    fetchMock.mockResolvedValueOnce(response({ error: 'forbidden' }, 403));
    expect((await getSupportTickets()).error).toMatch(/forbidden/i);

    fetchMock.mockResolvedValueOnce(response({ error: 'forbidden' }, 403));
    const details = await getSupportTicketDetails('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(details.ticket).toBeNull();
    expect(details.messages).toEqual([]);
    expect(details.error).toMatch(/forbidden/i);

    fetchMock.mockResolvedValueOnce(response({ error: 'forbidden' }, 403));
    expect((await updateSupportTicket('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', { status: 'RESOLVED' })).success).toBe(false);

    fetchMock.mockResolvedValueOnce(response({ error: 'forbidden' }, 403));
    expect((await postSupportMessage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'test', true)).success).toBe(false);
  });

  it('uses the bearer token on platform API calls', async () => {
    fetchMock.mockResolvedValueOnce(response({ jobs: [] }));
    await getFailedJobs();
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer platform-adversarial-token');
  });

  it('keeps successful support and incident lifecycle responses server-authoritative', async () => {
    fetchMock.mockResolvedValueOnce(response({ success: true, incident: { id: 'inc-1', severity: 'SEV-1', status: 'INVESTIGATING' }, message: 'Incident declared successfully.' }, 201));
    const declared = await declareIncident({ title: 'Provider outage', severity: 'SEV-1' });
    expect(declared.success).toBe(true);
    expect(declared.incident?.severity).toBe('SEV-1');

    fetchMock.mockResolvedValueOnce(response({ success: true, incident: { id: 'inc-1', status: 'IDENTIFIED' }, message: 'Incident updated.' }));
    const updated = await updateIncident('inc-1', { status: 'IDENTIFIED' });
    expect(updated.success).toBe(true);
    expect(updated.incident?.status).toBe('IDENTIFIED');

    fetchMock.mockResolvedValueOnce(response({ success: true, ticket: { id: 'ticket-1', status: 'IN_PROGRESS' }, message: 'Ticket updated.' }));
    const ticket = await updateSupportTicket('ticket-1', { status: 'IN_PROGRESS' });
    expect(ticket.success).toBe(true);
    expect(ticket.ticket?.status).toBe('IN_PROGRESS');
  });

  it('does not manufacture system health when telemetry is unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('telemetry offline'));
    const result = await getSystemHealth();
    expect(result.demo).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toMatch(/telemetry offline/i);
  });

  it('returns only health observations supplied by the authoritative API', async () => {
    const observed = [
      { name: 'Database (Postgres)', status: 'OPERATIONAL', latencyMs: 11, failureRate: 0, lastCheck: '2026-08-31T19:00:00.000Z', affectedOrgs: 0 },
      { name: 'Shopify sync', status: 'DEGRADED', latencyMs: null, failureRate: null, lastCheck: '2026-08-31T19:00:00.000Z', affectedOrgs: 1 },
    ];
    fetchMock.mockResolvedValueOnce(response({ checks: observed }));
    const result = await getSystemHealth();
    expect(result.data).toEqual(observed);
    expect(result.data.some((check: any) => check.name === 'SMS (Twilio)')).toBe(false);
  });

  it('global integration reads go through the platform-admin API', async () => {
    fetchMock.mockResolvedValueOnce(response({ connections: [] }));
    const result = await getIntegrations();
    expect(result.data).toEqual([]);
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/platform/integrations');
  });

  it('provider verification and repair do not claim success on unimplemented/failed operations', async () => {
    fetchMock.mockResolvedValueOnce(response({ error: 'Live provider verification is not implemented.' }, 501));
    const tested = await testConnection('conn-1');
    expect(tested.success).toBe(false);

    fetchMock.mockResolvedValueOnce(response({ message: 'No verified provider repair was completed.' }, 503));
    const repaired = await triggerAutoRepair('conn-1');
    expect(repaired.success).toBe(false);
  });

  it('never fabricates a reconnect destination when the backend cannot generate one', async () => {
    fetchMock.mockResolvedValueOnce(response({ error: 'Reconnect unavailable' }, 503));
    const result = await generateReconnectUrl('conn-1');
    expect(result).toEqual({ success: false, url: '' });
  });

  it('keeps synthetic mutations confined to the explicit demo plane', async () => {
    setPlatformDemoPlane(true);
    expect(isPlatformDemoPlane()).toBe(true);
    const demoJob = DEMO_FAILED_JOBS[0];
    const originalStatus = demoJob.status;
    const originalAttempts = demoJob.attempts;
    const result = await retryJob(demoJob.id);
    expect(result.success).toBe(true);
    expect(demoJob.status).toBe('PROCESSING');
    expect(demoJob.attempts).toBe(originalAttempts + 1);

    // Restore shared demo fixture so this adversarial assertion cannot pollute
    // other suites that intentionally inspect the demo dataset.
    demoJob.status = originalStatus;
    demoJob.attempts = originalAttempts;
    setPlatformDemoPlane(false);
  });

  it('keeps Platform Admin free of under-construction and fake loading timer placeholders', () => {
    const adminDir = path.resolve(__dirname, '../pages/PlatformAdmin');
    if (!fs.existsSync(adminDir)) return;

    const checkDir = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          expect(content.toLowerCase()).not.toContain('under construction');
          expect(content).not.toMatch(/setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setLoading\(false\)/);
        }
      }
    };
    checkDir(adminDir);
  });
});
