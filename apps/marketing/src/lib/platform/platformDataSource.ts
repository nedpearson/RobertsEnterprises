/**
 * Platform data source — one code path, two planes.
 *
 * The Platform console must never show a number the operator cannot trace. That
 * cuts both ways: a real-but-empty console is honest, and a synthetic console is
 * honest *only if it is labelled*. So the demo plane here is explicit opt-in,
 * session-scoped, and every consumer renders `PlatformDemoBanner` while it is on.
 *
 * It is deliberately NOT enabled by "the database looks empty" — silently
 * substituting synthetic rows for a failed or empty query is exactly the fake
 * metric this console exists to eliminate.
 */
import {
  DEMO_ORGANIZATIONS, DEMO_FAILED_JOBS, DEMO_INCIDENTS, DEMO_INTEGRATIONS,
  DEMO_SYSTEM_HEALTH, DEMO_RELEASES, summarizeOrganizations,
} from './platformDemoData';

const KEY = 'vowos_platform_demo';
const listeners = new Set<() => void>();

export function isPlatformDemoPlane(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setPlatformDemoPlane(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (on) window.sessionStorage.setItem(KEY, '1');
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — plane stays off */
  }
  listeners.forEach((l) => l());
}

export function subscribePlatformPlane(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Result envelope so views can distinguish loading / error / empty / data. */
export interface PlatformResult<T> {
  data: T;
  demo: boolean;
  error: string | null;
}

const ok = <T,>(data: T, demo: boolean): PlatformResult<T> => ({ data, demo, error: null });

/**
 * Real-plane loaders are intentionally not implemented in this slice. They must
 * go through server-side control-plane endpoints, not browser Supabase queries
 * (privileged reads from the client are the thing we are removing). Until those
 * endpoints exist, the real plane returns an explicit "not wired" error rather
 * than an empty array that would read as "you have no failed jobs".
 */
const NOT_WIRED = 'Live platform data requires the server-side control-plane API, which is not deployed yet. Switch on the demo plane to exercise this view.';

const notWired = <T,>(empty: T): PlatformResult<T> => ({ data: empty, demo: false, error: NOT_WIRED });

export function getOrganizations(): PlatformResult<typeof DEMO_ORGANIZATIONS> {
  return isPlatformDemoPlane() ? ok(DEMO_ORGANIZATIONS, true) : notWired([]);
}
export function getFailedJobs(): PlatformResult<typeof DEMO_FAILED_JOBS> {
  return isPlatformDemoPlane() ? ok(DEMO_FAILED_JOBS, true) : notWired([]);
}
export function getIncidents(): PlatformResult<typeof DEMO_INCIDENTS> {
  return isPlatformDemoPlane() ? ok(DEMO_INCIDENTS, true) : notWired([]);
}
export function getIntegrations(): PlatformResult<typeof DEMO_INTEGRATIONS> {
  return isPlatformDemoPlane() ? ok(DEMO_INTEGRATIONS, true) : notWired([]);
}
export function getSystemHealth(): PlatformResult<typeof DEMO_SYSTEM_HEALTH> {
  return isPlatformDemoPlane() ? ok(DEMO_SYSTEM_HEALTH, true) : notWired([]);
}
export function getReleases(): PlatformResult<typeof DEMO_RELEASES> {
  return isPlatformDemoPlane() ? ok(DEMO_RELEASES, true) : notWired([]);
}
export function getOrganizationSummary() {
  const { data, demo, error } = getOrganizations();
  return { summary: summarizeOrganizations(data), demo, error };
}
