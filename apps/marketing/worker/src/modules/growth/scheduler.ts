/**
 * Background sync scheduler and health reporting.
 *
 * Provider refreshes run sequentially because advertising/search APIs are rate
 * limited. If this service ever scales past one scheduler replica, move the
 * claim into the existing durable job infrastructure before enabling multiple
 * concurrent schedulers.
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
import { syncGoogleAdsForBusiness } from './googleAdsSync';
import { reconcileMarketingOutcomes } from './reconciliation';

const DEFAULT_INTERVAL_MINUTES = 360;
export const STALE_AFTER_HOURS = 26;

export interface SyncOutcome {
  businessId: string;
  provider: string;
  ok: boolean;
  detail: string;
}

async function runOne(
  businessId: string,
  provider: string,
  job: () => Promise<unknown>,
): Promise<SyncOutcome> {
  try {
    const result = (await job()) as Record<string, unknown>;
    const written =
      (result?.recordsWritten as number) ??
      (result?.rowsWritten as number) ??
      (result?.pagesCrawled as number) ??
      (result?.verifiedConversions as number) ??
      0;
    return { businessId, provider, ok: true, detail: `${written} records` };
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return { businessId, provider, ok: true, detail: 'not connected — skipped' };
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[growth-sync] ${provider} failed for ${businessId}:`, message);
    return { businessId, provider, ok: false, detail: message };
  }
}

async function connectedProviderSet(businessId: string): Promise<Set<string>> {
  const { data, error } = await db()
    .from('growth_provider_connections')
    .select('provider')
    .eq('business_id', businessId)
    .eq('status', 'connected');
  if (error) throw new Error(`Could not read connected providers: ${error.message}`);
  return new Set((data ?? []).map((row) => String((row as { provider: string }).provider)));
}

/**
 * Sync every connected provider for one business, then reconcile the provider
 * facts against VowOS operational truth. Reconciliation runs after all source
 * refreshes so dashboard/AI rows never briefly mix yesterday's spend with
 * today's sales outcomes.
 */
export async function syncBusiness(businessId: string, siteUrl?: string | null): Promise<SyncOutcome[]> {
  const outcomes: SyncOutcome[] = [];
  const connected = await connectedProviderSet(businessId);

  if (connected.has('google_ads')) {
    outcomes.push(await runOne(businessId, 'google_ads', () => syncGoogleAdsForBusiness(businessId, { days: 30 })));
  }
  if (connected.has('google_search_console')) {
    outcomes.push(await runOne(businessId, 'google_search_console', () => syncSearchConsole(businessId)));
  }
  if (connected.has('google_business_profile')) {
    outcomes.push(await runOne(businessId, 'google_business_profile', () => syncBusinessProfile(businessId)));
  }
  if (connected.has('meta_ads')) {
    outcomes.push(await runOne(businessId, 'meta_ads', () => syncMetaAds(businessId)));
  }
  if (connected.has('meta_social')) {
    outcomes.push(await runOne(businessId, 'meta_social', () => syncSocial(businessId)));
  }

  if (siteUrl && process.env.PAGESPEED_API_KEY) {
    outcomes.push(await runOne(businessId, 'pagespeed', () => syncSeoAudit(businessId, siteUrl)));
  }

  outcomes.push(await runOne(businessId, 'vowos_reconciliation', () => reconcileMarketingOutcomes(businessId, { windowDays: 90 })));
  return outcomes;
}

export async function businessesWithConnections(): Promise<string[]> {
  const { data, error } = await db()
    .from('growth_provider_connections')
    .select('business_id')
    .eq('status', 'connected');
  if (error) {
    console.error('[growth-sync] could not list connected businesses:', error.message);
    return [];
  }
  return [...new Set((data as Array<{ business_id: string }>).map((row) => row.business_id))];
}

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
  for (const businessId of businesses) {
    try {
      all.push(...(await syncBusiness(businessId, await siteUrlFor(businessId))));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      all.push({ businessId, provider: 'scheduler', ok: false, detail });
    }
  }

  const failed = all.filter((outcome) => !outcome.ok);
  console.log(`[growth-sync] ${businesses.length} business(es), ${all.length} job(s), ${failed.length} failure(s)`);
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

export interface ConnectionHealth {
  provider: string;
  status: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  stale: boolean;
  healthy: boolean;
}

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
  const connections: ConnectionHealth[] = rows.map((row) => {
    const connected = row.status === 'connected';
    const stale = connected && Boolean(row.last_sync_at) && new Date(row.last_sync_at as string).getTime() < staleCutoff;
    return {
      provider: row.provider,
      status: row.status,
      lastSyncAt: row.last_sync_at,
      lastSyncStatus: row.last_sync_status,
      lastError: row.last_error,
      stale,
      healthy: connected && !stale && row.last_sync_status !== 'failed',
    };
  });

  const problems: string[] = [];
  for (const connection of connections) {
    if (connection.status === 'error' || connection.status === 'revoked') {
      problems.push(`${connection.provider} needs reconnecting${connection.lastError ? `: ${connection.lastError}` : '.'}`);
    } else if (connection.lastSyncStatus === 'failed') {
      problems.push(`${connection.provider} last sync failed${connection.lastError ? `: ${connection.lastError}` : '.'}`);
    } else if (connection.stale) {
      problems.push(`${connection.provider} has not synced in over ${STALE_AFTER_HOURS} hours.`);
    }
  }

  return { healthy: problems.length === 0, problems, connections };
}
