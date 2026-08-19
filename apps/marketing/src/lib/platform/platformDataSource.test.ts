import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isPlatformDemoPlane, setPlatformDemoPlane,
  getOrganizations, getFailedJobs, getIncidents, getIntegrations,
  getSystemHealth, getOrganizationSummary,
} from './platformDataSource';
import { DEMO_ORGANIZATIONS, summarizeOrganizations } from './platformDemoData';

// vitest runs in the 'node' environment here, so stub the storage the module uses.
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

beforeEach(() => {
  (globalThis as any).window = { sessionStorage: new MemoryStorage() };
});
afterEach(() => {
  delete (globalThis as any).window;
});

describe('platform demo plane isolation', () => {
  it('is off by default', () => {
    expect(isPlatformDemoPlane()).toBe(false);
  });

  it('never serves synthetic rows while the plane is off', () => {
    // This is the load-bearing assertion. Silently substituting demo rows for an
    // empty or failed live query is the fake metric this console exists to kill.
    for (const get of [getOrganizations, getFailedJobs, getIncidents, getIntegrations, getSystemHealth]) {
      const res = get();
      expect(res.data).toEqual([]);
      expect(res.demo).toBe(false);
      expect(res.error).toBeTruthy();
    }
  });

  it('serves the synthetic fleet, flagged as demo, once explicitly enabled', () => {
    setPlatformDemoPlane(true);
    const orgs = getOrganizations();
    expect(orgs.demo).toBe(true);
    expect(orgs.error).toBeNull();
    expect(orgs.data.length).toBeGreaterThan(10);
    expect(getFailedJobs().data.length).toBeGreaterThan(0);
    expect(getIncidents().data.length).toBeGreaterThan(0);
    expect(getIntegrations().data.length).toBeGreaterThan(0);
    expect(getSystemHealth().data.length).toBeGreaterThan(0);
  });

  it('reverts to the live plane when switched off', () => {
    setPlatformDemoPlane(true);
    expect(getOrganizations().data.length).toBeGreaterThan(0);
    setPlatformDemoPlane(false);
    expect(getOrganizations().data).toEqual([]);
    expect(getOrganizations().demo).toBe(false);
  });
});

describe('financial isolation', () => {
  it('excludes internal and comped organizations from paying MRR', () => {
    const s = summarizeOrganizations(DEMO_ORGANIZATIONS);
    const internal = DEMO_ORGANIZATIONS.filter((o) => o.internal || o.comped);
    expect(internal.length).toBeGreaterThan(0);
    // Roberts Enterprises is internal/comped and must contribute zero.
    for (const o of internal) expect(o.mrrCents).toBe(0);
    const expected = DEMO_ORGANIZATIONS
      .filter((o) => !o.internal && !o.comped && o.mrrCents > 0)
      .reduce((sum, o) => sum + o.mrrCents, 0);
    expect(s.mrrCents).toBe(expected);
    expect(s.arrCents).toBe(expected * 12);
  });

  it('excludes trials from paying MRR', () => {
    for (const o of DEMO_ORGANIZATIONS.filter((x) => x.lifecycle === 'TRIAL')) {
      expect(o.mrrCents).toBe(0);
    }
  });

  it('reports Roberts Enterprises exactly once, with its two businesses', () => {
    const roberts = DEMO_ORGANIZATIONS.filter((o) => o.name === 'Roberts Enterprises');
    expect(roberts).toHaveLength(1);
    const names = roberts[0].businesses.map((b) => b.name).sort();
    expect(names).toEqual(['I Do Bridal Couture', 'Proper & Co.']);
    expect(roberts[0].internal).toBe(true);
  });

  it('summary counts stay internally consistent', () => {
    (globalThis as any).window.sessionStorage.setItem('vowos_platform_demo', '1');
    const { summary, demo } = getOrganizationSummary();
    expect(demo).toBe(true);
    expect(summary.total).toBe(DEMO_ORGANIZATIONS.length);
    expect(summary.inOnboarding + DEMO_ORGANIZATIONS.filter((o) => o.onboardingStatus === 'COMPLETE').length)
      .toBe(summary.total);
    expect(summary.payingCount).toBeLessThan(summary.total);
  });
});
