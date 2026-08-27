import { SupabaseClient } from '@supabase/supabase-js';
import { controlPlaneDb, privilegedDataPlaneDb, supabase as fallbackSupabase } from '../shared';
import { dispatchJob, DurableJob } from './registry';

const DEFAULT_POLL_INTERVAL_MS = 10000;
const DEFAULT_STALE_LOCK_MINUTES = 5;

let pollerInterval: NodeJS.Timeout | null = null;
let watchdogInterval: NodeJS.Timeout | null = null;
let isPolling = false;

export function getWorkerDb(customDb?: SupabaseClient): SupabaseClient {
  return customDb || privilegedDataPlaneDb || controlPlaneDb || fallbackSupabase;
}

/**
 * Reclaim stale locks where worker died or crashed while executing
 */
export async function reclaimStaleLocks(
  db: SupabaseClient,
  staleMinutes = DEFAULT_STALE_LOCK_MINUTES,
): Promise<number> {
  try {
    const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    const { data: reclaimed, error } = await db
      .from('durable_jobs')
      .update({
        status: 'pending',
        locked_at: null,
        locked_by: null,
        error_message: 'Worker timeout: Stale lock reclaimed. Re-enqueued.',
        updated_at: nowIso,
      })
      .eq('status', 'running')
      .lt('locked_at', staleCutoff)
      .select('id');

    if (error) {
      console.warn('[Job Runner Watchdog] Stale lock recovery error:', error.message);
      return 0;
    }

    const count = reclaimed?.length || 0;
    if (count > 0) {
      console.log(`[Job Runner Watchdog] Reclaimed ${count} stale running job(s) locked before ${staleCutoff}`);
    }
    return count;
  } catch (err: any) {
    console.warn('[Job Runner Watchdog] Stale lock recovery exception:', err.message);
    return 0;
  }
}

/**
 * Atomically claims the next pending durable job across all tenants.
 */
export async function claimNextJob(
  db: SupabaseClient,
  workerId = `worker-${process.pid}`,
): Promise<DurableJob | null> {
  const nowIso = new Date().toISOString();

  // 1. Query next pending candidate ready for execution
  const { data: candidates, error: fetchErr } = await db
    .from('durable_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(1);

  if (fetchErr || !candidates || candidates.length === 0) {
    return null;
  }

  const candidate = candidates[0] as DurableJob;
  const nextAttempts = (candidate.attempts || 0) + 1;

  // 2. Atomic lock with conditional update on status = 'pending'
  const { data: locked, error: lockErr } = await db
    .from('durable_jobs')
    .update({
      status: 'running',
      locked_at: nowIso,
      locked_by: workerId,
      attempts: nextAttempts,
      updated_at: nowIso,
    })
    .eq('id', candidate.id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (lockErr || !locked) {
    // Another worker claimed this job concurrently
    return null;
  }

  return locked as DurableJob;
}

/**
 * Executes a single locked durable job through the modular registry with exponential backoff on failure.
 */
export async function processDurableJob(
  job: DurableJob,
  db: SupabaseClient,
): Promise<{ success: boolean; result?: any; error?: string }> {
  console.log(`[Job Runner] Processing job ${job.id} (queue: ${job.queue_name}, attempt: ${job.attempts}/${job.max_attempts || 5})`);
  const nowIso = new Date().toISOString();

  try {
    const result = await dispatchJob(job, db);

    // Mark completed upon successful handler execution
    await db
      .from('durable_jobs')
      .update({
        status: 'completed',
        locked_at: null,
        locked_by: null,
        error_message: null,
        error_details: null,
        updated_at: nowIso,
      })
      .eq('id', job.id);

    console.log(`[Job Runner] Successfully completed job ${job.id} (${job.queue_name})`);
    return { success: true, result };
  } catch (jobError: any) {
    const errorMessage = jobError?.message || 'Unknown execution failure';
    console.error(`[Job Runner] Error processing job ${job.id} (${job.queue_name}):`, errorMessage);

    const attempts = job.attempts || 1;
    const maxAttempts = job.max_attempts || 5;

    if (attempts >= maxAttempts) {
      // Transition to dead-letter queue (DLQ)
      await db
        .from('durable_jobs')
        .update({
          status: 'dead-letter',
          error_message: errorMessage,
          error_details: {
            name: jobError?.name || 'Error',
            message: errorMessage,
            stack: jobError?.stack || null,
          },
          locked_at: null,
          locked_by: null,
          updated_at: nowIso,
        })
        .eq('id', job.id);

      console.warn(`[Job Runner] Job ${job.id} exhausted max attempts (${attempts}/${maxAttempts}). Moved to dead-letter queue.`);
    } else {
      // Exponential backoff with jitter: 5s, 10s, 20s, 40s... capped at 300s
      const baseDelay = Math.min(300, Math.pow(2, attempts) * 5);
      const jitter = Math.floor(Math.random() * 3);
      const delaySeconds = baseDelay + jitter;
      const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

      await db
        .from('durable_jobs')
        .update({
          status: 'pending',
          error_message: errorMessage,
          error_details: {
            name: jobError?.name || 'Error',
            message: errorMessage,
            stack: jobError?.stack || null,
          },
          next_retry_at: nextRetryAt,
          locked_at: null,
          locked_by: null,
          updated_at: nowIso,
        })
        .eq('id', job.id);

      console.log(`[Job Runner] Job ${job.id} scheduled for retry #${attempts + 1} at ${nextRetryAt} (delay: ${delaySeconds}s)`);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Execute a single poll cycle: reclaims stale locks and processes any pending jobs.
 */
export async function pollOnce(
  customDb?: SupabaseClient,
  workerId = `worker-${process.pid}`,
): Promise<{ processed: number; reclaimed: number }> {
  const db = getWorkerDb(customDb);
  const reclaimed = await reclaimStaleLocks(db);

  let processed = 0;
  let job: DurableJob | null = null;

  // Process available pending jobs in this tick (up to 10 per tick to avoid starving other tasks)
  do {
    job = await claimNextJob(db, workerId);
    if (job) {
      await processDurableJob(job, db);
      processed++;
    }
  } while (job && processed < 10);

  return { processed, reclaimed };
}

/**
 * Starts the continuous background job poller and watchdog.
 */
export async function runJobPoller(options?: {
  db?: SupabaseClient;
  intervalMs?: number;
  staleMinutes?: number;
  workerId?: string;
}) {
  const db = getWorkerDb(options?.db);
  const intervalMs = options?.intervalMs || DEFAULT_POLL_INTERVAL_MS;
  const staleMinutes = options?.staleMinutes || DEFAULT_STALE_LOCK_MINUTES;
  const workerId = options?.workerId || `worker-${process.pid}-${Date.now()}`;

  console.log(`[Job Runner] Background job poller active (interval: ${intervalMs}ms, worker: ${workerId})`);

  // Run initial tick immediately
  void pollOnce(db, workerId);

  // Poller loop
  pollerInterval = setInterval(async () => {
    if (isPolling) return;
    isPolling = true;
    try {
      await pollOnce(db, workerId);
    } catch (err: any) {
      console.error('[Job Runner] Poller loop encountered error:', err.message);
    } finally {
      isPolling = false;
    }
  }, intervalMs);

  // Stale lock watchdog runs every 2 minutes
  watchdogInterval = setInterval(async () => {
    try {
      await reclaimStaleLocks(db, staleMinutes);
    } catch (err: any) {
      console.error('[Job Runner Watchdog] Watchdog encountered error:', err.message);
    }
  }, 120000);
}

/**
 * Stops the background poller and watchdog.
 */
export function stopJobPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
  }
  isPolling = false;
  console.log('[Job Runner] Background job poller stopped.');
}
