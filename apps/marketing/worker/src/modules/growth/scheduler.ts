/**
 * Background sync scheduler and health reporting.
 *
 * Without this every sync is a button someone has to remember to press, so the
 * data is stale the moment attention moves elsewhere — which is most of the time
 * for a boutique owner. The whole point of the growth stack is that it maintains
 * itself.
 *
 * Deliberately a plain interval rather than a cron dependency: Railway runs one
 * replica, the cadence is hours not seconds, and an extra dependency to express
 * "every 6 hours" would be worse than the problem. If this ever scales past one
 * replica, move the claim into a durable_jobs row.
 */
import { db } from './store';
import {
  NotConnectedError,
  syncBusinessProfile,
  syncMetaAds,
  syncSearchConsole,
  syncSeoAudit,
  syncSocial,
} from './syncJobs';

const DEFAULT_INTERVAL_MINUTES = 360; // 6 hours

/** A sync older than this is treated as stale in health reporting. */
export const STALE_AFTER_HOURS = 26;

export interface SyncOutcome {
  businessId: string;
  provider: string;
  ok: boolean;
  detail: string;
}

/** One provider is one failure domain: a broken Meta token must not stop GBP. */
async function runOne(
  businessId: string,
  provider: string,
  job: () => Promise<unknown>,
): Promise<SyncOutcome> {
  try {
    const result = (await job()) as Record<string, unknown>;
    const written =
      (result?.recordsWritten as number) ?? (result?.rowsWritten as number) ?? (result?.pagesCrawled as number) ?? 0;
    return { businessId, provider, ok: true, detail: `${written} records` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof NotConnectedError || message.includes('reconnect the provider') || message.includes('not connected')) {
      return { businessId, provider, ok: true, detail: 'not connected — skipped' };
    }
    console.error(`[growth-sync] ${provider} failed for ${businessId}:`, message);
    return { businessId, provider, ok: false, detail: message };
  }
}

/**
 * Sync every provider connected for one business. Errors are captured per
 * provider rather than thrown, because a scheduled run has no caller to catch
 * them and one bad token should not skip the other four jobs.
 */
export async function syncBusiness(businessId: string, siteUrl?: string | null): Promise<SyncOutcome[]> {
  const outcomes: SyncOutcome[] = [];

  outcomes.push(await runOne(businessId, 'google_search_console', () => syncSearchConsole(businessId)));
  outcomes.push(await runOne(businessId, 'google_business_profile', () => syncBusinessProfile(businessId)));
  outcomes.push(await runOne(businessId, 'meta_ads', () => syncMetaAds(businessId)));
  outcomes.push(await runOne(businessId, 'meta_social', () => syncSocial(businessId)));

  // PageSpeed has no connection row to key off, so it only runs when we know a
  // site to audit and an API key exists.
  if (siteUrl && process.env.PAGESPEED_API_KEY) {
    outcomes.push(await runOne(businessId, 'pagespeed', () => syncSeoAudit(businessId, siteUrl)));
  }

  return outcomes;
}

/** Businesses that have at least one connected provider. */
export async function businessesWithConnections(): Promise<string[]> {
  const { data, error } = await db()
    .from('growth_provider_connections')
    .select('business_id')
    .eq('status', 'connected');
  if (error) {
    console.error('[growth-sync] could not list connected businesses:', error.message);
    return [];
  }
  return [...new Set((data as Array<{ business_id: string }>).map((r) => r.business_id))];
}

/** Best-effort site URL for the SEO audit, taken from the tenant's GBP listing. */
async function siteUrlFor(businessId: string): Promise<string | null> {
  const { data } = await db()
    .from('growth_local_listings')
    .select('website_url')
    .eq('business_id', businessId)
    .not('website_url', 'is', null)
    .limit(1)
    .maybeSingle();
  return (data as { website_url: string } | null)?.website_url ?? null;
}

export async function runScheduledSync(): Promise<SyncOutcome[]> {
  const businesses = await businessesWithConnections();
  if (!businesses.length) return [];

  const all: SyncOutcome[] = [];
  // Sequential on purpose: these hit rate-limited third-party APIs, and running
  // every tenant in parallel is the fastest way to get throttled by all of them.
  for (const businessId of businesses) {
    all.push(...(await syncBusiness(businessId, await siteUrlFor(businessId))));
  }

  const failed = all.filter((o) => !o.ok);
  console.log(
    `[growth-sync] ${businesses.length} business(es), ${all.length} job(s), ${failed.length} failure(s)`,
  );
  return all;
}

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startGrowthScheduler(): void {
  if (process.env.GROWTH_SYNC_ENABLED !== 'true') {
    console.log('[growth-sync] scheduler disabled (set GROWTH_SYNC_ENABLED=true to enable)');
    return;
  }
  const minutes = Number(process.env.GROWTH_SYNC_INTERVAL_MINUTES ?? DEFAULT_INTERVAL_MINUTES);
  const intervalMs = Math.max(15, minutes) * 60_000;

  const tick = async () => {
    // A slow run must never overlap the next tick — third-party syncs can take
    // minutes, and two concurrent runs would double-write and double-throttle.
    if (running) {
      console.warn('[growth-sync] previous run still in progress, skipping this tick');
      return;
    }
    running = true;
    try {
      await runScheduledSync();
    } catch (err) {
      console.error('[growth-sync] scheduled run threw:', err instanceof Error ? err.message : err);
    } finally {
      running = false;
    }
  };

  console.log(`[growth-sync] scheduler enabled, every ${minutes} minutes`);
  // Delay the first run so a deploy does not immediately hammer every provider
  // while the service is still warming up.
  timer = setTimeout(() => {
    void tick();
    timer = setInterval(() => void tick(), intervalMs);
  }, 60_000);
  timer.unref?.();
}

export function stopGrowthScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    clearInterval(timer);
    timer = null;
  }
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export interface ConnectionHealth {
  provider: string;
  status: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  stale: boolean;
  healthy: boolean;
}

/**
 * Why this exists: growth_sync_runs already recorded every failure, and nobody
 * was ever going to read that table. A revoked token would have meant weeks of
 * silently stale numbers that still looked like fresh numbers.
 */
export async function connectionHealth(businessId: string): Promise<{
  healthy: boolean;
  problems: string[];
  connections: ConnectionHealth[];
}> {
  const { data, error } = await db()
    .from('growth_provider_connections')
    .select('provider,status,last_sync_at,last_sync_status,last_error')
    .eq('business_id', businessId);

  if (error) return { healthy: false, problems: [error.message], connections: [] };

  const rows = (data ?? []) as Array<{
    provider: string;
    status: string;
    last_sync_at: string | null;
    last_sync_status: string | null;
    last_error: string | null;
  }>;

  const staleCutoff = Date.now() - STALE_AFTER_HOURS * 3600_000;
  const connections: ConnectionHealth[] = rows.map((r) => {
    const connected = r.status === 'connected';
    // A connection that has never synced is not stale — it is new.
    const stale = connected && Boolean(r.last_sync_at) && new Date(r.last_sync_at as string).getTime() < staleCutoff;
    return {
      provider: r.provider,
      status: r.status,
      lastSyncAt: r.last_sync_at,
      lastSyncStatus: r.last_sync_status,
      lastError: r.last_error,
      stale,
      healthy: connected && !stale && r.last_sync_status !== 'failed',
    };
  });

  const problems: string[] = [];
  for (const c of connections) {
    if (c.status === 'error' || c.status === 'revoked') {
      problems.push(`${c.provider} needs reconnecting${c.lastError ? `: ${c.lastError}` : '.'}`);
    } else if (c.lastSyncStatus === 'failed') {
      problems.push(`${c.provider} last sync failed${c.lastError ? `: ${c.lastError}` : '.'}`);
    } else if (c.stale) {
      problems.push(`${c.provider} has not synced in over ${STALE_AFTER_HOURS} hours.`);
    }
  }

  return { healthy: problems.length === 0, problems, connections };
}
