import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => {
  const chainable: any = {
    select: () => chainable,
    is: () => chainable,
    order: () => chainable,
    eq: () => chainable,
    in: () => chainable,
    limit: () => chainable,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (cb: any) => cb({ data: [], error: null }),
  };
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: { access_token: 'platform-test-token' } } }),
      },
      from: () => chainable,
    },
  };
});

import {
  generateReconnectUrl,
  getFailedJobs,
  getIncidents,
  getIntegrations,
  getOrganizationSummary,
  getOrganizations,
  getSystemHealth,
  isPlatformDemoPlane,
  setPlatformDemoPlane,
} from './platformDataSource';
import { DEMO_ORGANIZATIONS, summarizeOrganizations } from './platformDemoData';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(key: string) { return this.m.has(key) ? this.m.get(key)! : null; }
  setItem(key: string, value: string) { this.m.set(key, value); }
  removeItem(key: string) { this.m.delete(key); }
}

function jsonResponse(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  (globalThis as any).window = { sessionStorage: new MemoryStorage() };
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path.includes('/api/platform/jobs')) return jsonResponse({ jobs: [] });
    if (path.includes('/api/platform/incidents')) return jsonResponse({ incidents: [] });
    if (path.includes('/api/platform/health')) return jsonResponse({ checks: [] });
    if (path.includes('/api/recovery/reconnect-url/')) return jsonResponse({ reconnectUrl: '/settings?tab=integrations&reconnect=1' });
    return jsonResponse({});
  }));
});

afterEach(() => {
  delete (globalThis as any).window;
  vi.unstubAllGlobals();
});

describe('platform demo plane isolation', () => {
  it('is off by default', () => {
    expect(isPlatformDemoPlane()).toBe(false);
  });

  it('never serves synthetic rows while the production plane is active', async () => {
    for (const get of [getOrganizations, getFailedJobs, getIncidents, getIntegrations, getSystemHealth]) {
      const result = await get();
      expect(result.demo).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    }
  });

  it('authenticates platform API requests with the signed-in bearer token', async () => {
    await getFailedJobs();
    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls.find(([input]) => String(input).includes('/api/platform/jobs'))!;
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer platform-test-token');
  });

  it('does not fabricate health cards when the authoritative health API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'telemetry offline' }, 503)));
    const result = await getSystemHealth();
    expect(result.demo).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toMatch(/telemetry offline/i);
  });

  it('does not fabricate a reconnect destination when generation fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'reconnect unavailable' }, 503)));
    const result = await generateReconnectUrl('connection-1');
    expect(result.success).toBe(false);
    expect(result.url).toBe('');
  });

  it('serves the synthetic fleet, flagged as demo, only after explicit enablement', async () => {
    setPlatformDemoPlane(true);
    const orgs = await getOrganizations();
    expect(orgs.demo).toBe(true);
    expect(orgs.error).toBeNull();
    expect(orgs.data.length).toBeGreaterThan(10);
    expect((await getFailedJobs()).data.length).toBeGreaterThan(0);
    expect((await getIncidents()).data.length).toBeGreaterThan(0);
    expect((await getIntegrations()).data.length).toBeGreaterThan(0);
    expect((await getSystemHealth()).data.length).toBeGreaterThan(0);
  });

  it('reverts to the live plane when switched off', async () => {
    setPlatformDemoPlane(true);
    expect((await getOrganizations()).data.length).toBeGreaterThan(0);
    setPlatformDemoPlane(false);
    expect((await getOrganizations()).data).toEqual([]);
    expect((await getOrganizations()).demo).toBe(false);
  });
});

describe('financial isolation', () => {
  it('excludes internal and comped organizations from paying MRR', () => {
    const summary = summarizeOrganizations(DEMO_ORGANIZATIONS);
    const internal = DEMO_ORGANIZATIONS.filter((org) => org.internal || org.comped);
    expect(internal.length).toBeGreaterThan(0);
    for (const org of internal) expect(org.mrrCents).toBe(0);
    const expected = DEMO_ORGANIZATIONS
      .filter((org) => !org.internal && !org.comped && org.mrrCents > 0)
      .reduce((sum, org) => sum + org.mrrCents, 0);
    expect(summary.mrrCents).toBe(expected);
    expect(summary.arrCents).toBe(expected * 12);
  });

  it('excludes trials from paying MRR', () => {
    for (const org of DEMO_ORGANIZATIONS.filter((candidate) => candidate.lifecycle === 'TRIAL')) {
      expect(org.mrrCents).toBe(0);
    }
  });

  it('reports Roberts Enterprises exactly once, with its two businesses', () => {
    const roberts = DEMO_ORGANIZATIONS.filter((org) => org.name === 'Roberts Enterprises');
    expect(roberts).toHaveLength(1);
    expect(roberts[0].businesses.map((business) => business.name).sort()).toEqual(['I Do Bridal Couture', 'Proper & Co.']);
    expect(roberts[0].internal).toBe(true);
  });

  it('summary counts stay internally consistent', async () => {
    (globalThis as any).window.sessionStorage.setItem('vowos_platform_demo', '1');
    const { summary, demo } = await getOrganizationSummary();
    expect(demo).toBe(true);
    expect(summary.total).toBe(DEMO_ORGANIZATIONS.length);
    expect(summary.inOnboarding + DEMO_ORGANIZATIONS.filter((org) => org.onboardingStatus === 'COMPLETE').length).toBe(summary.total);
    expect(summary.payingCount).toBeLessThan(summary.total);
  });
});
