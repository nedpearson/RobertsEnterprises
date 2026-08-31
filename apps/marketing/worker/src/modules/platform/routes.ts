import { Router, Request, Response } from 'express';
import { controlPlaneDb, privilegedDataPlaneDb, supabase as fallbackSupabase } from '../../shared';

export const platformRouter = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PlatformHealthStatus = 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'UNKNOWN';

function getParamId(req: Request): string {
  const raw = req.params?.id;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0] || '';
  return '';
}

function getDb(req: Request) {
  return (req as any).context?.db || privilegedDataPlaneDb || controlPlaneDb || fallbackSupabase;
}

function mapDurableStatusToUI(status: string): string {
  switch (status) {
    case 'dead-letter':
      return 'FAILED';
    case 'running':
      return 'PROCESSING';
    case 'pending':
      return 'RETRYING';
    case 'completed':
      return 'COMPLETED';
    default:
      return status.toUpperCase();
  }
}

function providerHealthToPlatformStatus(value: unknown): PlatformHealthStatus {
  switch (String(value ?? '').trim().toUpperCase()) {
    case 'HEALTHY':
      return 'OPERATIONAL';
    case 'RECOVERING':
    case 'DEGRADED':
      return 'DEGRADED';
    case 'ACTION_REQUIRED':
      return 'PARTIAL_OUTAGE';
    default:
      return 'UNKNOWN';
  }
}

function worstPlatformStatus(statuses: PlatformHealthStatus[]): PlatformHealthStatus {
  if (statuses.includes('PARTIAL_OUTAGE')) return 'PARTIAL_OUTAGE';
  if (statuses.includes('DEGRADED')) return 'DEGRADED';
  if (statuses.includes('UNKNOWN')) return 'UNKNOWN';
  return statuses.length ? 'OPERATIONAL' : 'UNKNOWN';
}

function providerDisplayName(provider: unknown): string {
  const normalized = String(provider ?? '').trim().toLowerCase();
  const labels: Record<string, string> = {
    shopify: 'Shopify sync',
    twilio: 'SMS (Twilio)',
    stripe: 'Payments (Stripe)',
    google: 'Google APIs',
    google_ads: 'Google Ads',
    google_drive: 'Google Drive',
    meta: 'Meta',
    facebook: 'Meta / Facebook',
    instagram: 'Instagram',
  };
  if (labels[normalized]) return labels[normalized];
  if (!normalized) return 'Unidentified provider connection';
  return normalized
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function latestTimestamp(rows: any[]): string | null {
  let latest = 0;
  let result: string | null = null;
  for (const row of rows) {
    for (const candidate of [row.last_health_check_at, row.updated_at]) {
      if (!candidate) continue;
      const millis = new Date(candidate).getTime();
      if (Number.isFinite(millis) && millis > latest) {
        latest = millis;
        result = new Date(millis).toISOString();
      }
    }
  }
  return result;
}

// ============================================================================
// Durable Background Jobs / DLQ Endpoints
// ============================================================================

/**
 * GET /api/platform/jobs
 * Lists durable jobs with optional filtering by status and business_id.
 */
platformRouter.get('/jobs', async (req: Request, res: Response) => {
  const db = getDb(req);
  const { status, business_id, limit = '50', offset = '0' } = req.query;

  try {
    let query = db.from('durable_jobs').select('*, businesses:business_id(name)');

    if (business_id && typeof business_id === 'string') {
      query = query.eq('business_id', business_id);
    }

    if (status && typeof status === 'string') {
      const statuses = status.split(',').map((s) => s.trim());
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else {
        query = query.in('status', statuses);
      }
    } else {
      query = query.in('status', ['dead-letter', 'failed', 'running', 'pending', 'completed']);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const jobs = (data || []).map((job: any) => ({
      id: job.id,
      business_id: job.business_id,
      org: job.businesses?.name || job.business_id || 'Platform Wide',
      orgId: job.business_id,
      type: job.queue_name,
      queue_name: job.queue_name,
      status: mapDurableStatusToUI(job.status),
      raw_status: job.status,
      attempts: job.attempts,
      max_attempts: job.max_attempts,
      last_error: job.error_message || 'Unknown error',
      lastError: job.error_message || 'Unknown error',
      error_message: job.error_message,
      error_code: job.error_code,
      error_details: job.error_details,
      payload: job.payload,
      next_retry_at: job.next_retry_at,
      nextRetry: job.next_retry_at ? new Date(job.next_retry_at).toLocaleTimeString() : '—',
      locked_at: job.locked_at,
      locked_by: job.locked_by,
      created_at: job.created_at,
      updated_at: job.updated_at,
      impact: 'Background task stalled',
      retrySafe: true,
      correlationId: job.id ? job.id.substring(0, 8) : '',
    }));

    return res.json({ jobs, total: jobs.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch platform jobs' });
  }
});

/**
 * POST /api/platform/jobs/:id/retry
 * Transitions a job from 'dead-letter' / 'failed' back to 'pending', resets attempts,
 * clears locks and error state, and schedules immediate execution.
 */
platformRouter.post('/jobs/:id/retry', async (req: Request, res: Response) => {
  const db = getDb(req);
  const id = getParamId(req);

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'A valid UUID job identifier is required.' });
  }

  try {
    // 1. Fetch current job
    const { data: job, error: fetchError } = await db
      .from('durable_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!job) {
      return res.status(404).json({ error: `Job with ID ${id} not found.` });
    }

    // 2. Prevent concurrent retry if actively running and locked within last 5 minutes
    if (job.status === 'running' && job.locked_at) {
      const lockAgeMs = Date.now() - new Date(job.locked_at).getTime();
      if (lockAgeMs < 5 * 60 * 1000) {
        return res.status(409).json({
          error: 'Job is currently actively executing on a worker instance.',
          job,
        });
      }
    }

    // 3. Reset job state to pending for immediate pickup
    const nowIso = new Date().toISOString();
    const updatePayload = {
      status: 'pending',
      attempts: 0,
      next_retry_at: nowIso,
      locked_at: null,
      locked_by: null,
      error_message: null,
      error_code: null,
      error_details: null,
      updated_at: nowIso,
    };

    const { data: updated, error: updateError } = await db
      .from('durable_jobs')
      .update(updatePayload)
      .eq('id', id)
      .select('*, businesses:business_id(name)')
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({
      success: true,
      message: `Job ${id} re-enqueued for immediate execution.`,
      job: updated || { ...job, ...updatePayload },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retry job' });
  }
});

/**
 * POST /api/platform/jobs/:id/cancel
 * Cancels a pending or dead-letter job
 */
platformRouter.post('/jobs/:id/cancel', async (req: Request, res: Response) => {
  const db = getDb(req);
  const id = getParamId(req);

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'A valid UUID job identifier is required.' });
  }

  try {
    const nowIso = new Date().toISOString();
    const { data: updated, error } = await db
      .from('durable_jobs')
      .update({
        status: 'cancelled',
        locked_at: null,
        locked_by: null,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, message: `Job ${id} cancelled.`, job: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to cancel job' });
  }
});

// ============================================================================
// System Health & Telemetry Endpoints
// ============================================================================

/**
 * GET /api/platform/health
 * Returns only telemetry this worker can actually observe. It deliberately does
 * not invent web/provider latency or mark a provider operational when no live or
 * persisted health observation exists.
 */
platformRouter.get('/health', async (req: Request, res: Response) => {
  const db = getDb(req);
  const nowIso = new Date().toISOString();
  const checks: any[] = [];

  // A response from this handler is itself an observation that this worker/API
  // process is alive. We expose uptime/memory, but not a fabricated latency rate.
  const memoryUsage = process.memoryUsage();
  checks.push({
    name: 'Worker / API',
    status: 'OPERATIONAL',
    latencyMs: null,
    failureRate: null,
    lastCheck: nowIso,
    affectedOrgs: 0,
    uptimeSeconds: process.uptime(),
    memoryMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
  });

  // Database query is a real round-trip, so its measured duration is valid.
  const dbStart = Date.now();
  let dbStatus: PlatformHealthStatus = 'UNKNOWN';
  let dbError: string | null = null;
  try {
    const { error } = await db.from('businesses').select('id').limit(1);
    dbStatus = error ? 'PARTIAL_OUTAGE' : 'OPERATIONAL';
    dbError = error?.message ?? null;
  } catch (error: any) {
    dbStatus = 'PARTIAL_OUTAGE';
    dbError = error?.message || 'Database probe failed.';
  }
  checks.push({
    name: 'Database (Postgres)',
    status: dbStatus,
    latencyMs: Math.max(0, Date.now() - dbStart),
    failureRate: dbStatus === 'OPERATIONAL' ? 0 : 1,
    lastCheck: nowIso,
    affectedOrgs: dbStatus === 'OPERATIONAL' ? 0 : null,
    error: dbError,
  });

  // Durable job telemetry comes from actual rows, not assumed queue health.
  const queueStart = Date.now();
  let queueRows: any[] = [];
  let queueError: string | null = null;
  try {
    const { data, error } = await db
      .from('durable_jobs')
      .select('business_id,status')
      .in('status', ['dead-letter', 'failed', 'running', 'pending']);
    if (error) throw error;
    queueRows = data || [];
  } catch (error: any) {
    queueError = error?.message || 'Durable job telemetry unavailable.';
  }

  const deadRows = queueRows.filter((row) => row.status === 'dead-letter' || row.status === 'failed');
  const runningRows = queueRows.filter((row) => row.status === 'running');
  const pendingRows = queueRows.filter((row) => row.status === 'pending');
  const queueStatus: PlatformHealthStatus = queueError
    ? 'UNKNOWN'
    : deadRows.length > 0
      ? 'DEGRADED'
      : 'OPERATIONAL';
  const queueTotal = queueRows.length;
  checks.push({
    name: 'Background jobs',
    status: queueStatus,
    latencyMs: Math.max(0, Date.now() - queueStart),
    failureRate: queueError ? null : (queueTotal ? deadRows.length / queueTotal : 0),
    lastCheck: nowIso,
    affectedOrgs: queueError
      ? null
      : new Set(deadRows.map((row) => row.business_id).filter(Boolean)).size,
    metrics: {
      pending: pendingRows.length,
      running: runningRows.length,
      deadLetter: deadRows.length,
    },
    error: queueError,
  });

  // Open incidents are a real control-plane observation. Surface an unknown state
  // if the incident table cannot be queried instead of assuming zero incidents.
  const incidentStart = Date.now();
  let openIncidentsCount: number | null = null;
  let incidentError: string | null = null;
  try {
    const { count, error } = await db
      .from('platform_incidents')
      .select('*', { count: 'exact', head: true })
      .in('status', ['OPEN', 'INVESTIGATING', 'MONITORING']);
    if (error) throw error;
    openIncidentsCount = count ?? 0;
  } catch (error: any) {
    incidentError = error?.message || 'Incident telemetry unavailable.';
  }
  checks.push({
    name: 'Platform incidents',
    status: incidentError ? 'UNKNOWN' : (openIncidentsCount && openIncidentsCount > 0 ? 'DEGRADED' : 'OPERATIONAL'),
    latencyMs: Math.max(0, Date.now() - incidentStart),
    failureRate: null,
    lastCheck: nowIso,
    affectedOrgs: null,
    metrics: { open: openIncidentsCount },
    error: incidentError,
  });

  // Integration checks are aggregates of persisted provider observations. We do
  // not claim provider reachability or latency here because this endpoint does not
  // contact Shopify/Twilio/Stripe/Google/Meta directly.
  let degradedIntegrations = 0;
  let providerReadError: string | null = null;
  try {
    const { data, error } = await db
      .from('provider_connections')
      .select('provider,business_id,health_status,last_health_check_at,updated_at');
    if (error) throw error;

    const rows = data || [];
    const grouped = new Map<string, any[]>();
    for (const row of rows) {
      const provider = String(row.provider ?? '').trim().toLowerCase() || 'unknown';
      const existing = grouped.get(provider) || [];
      existing.push(row);
      grouped.set(provider, existing);
    }

    for (const [provider, providerRows] of grouped) {
      const connectionStatuses = providerRows.map((row) => providerHealthToPlatformStatus(row.health_status));
      const status = worstPlatformStatus(connectionStatuses);
      const nonHealthy = providerRows.filter((row) => String(row.health_status ?? '').trim().toUpperCase() !== 'HEALTHY');
      degradedIntegrations += nonHealthy.length;

      checks.push({
        name: providerDisplayName(provider),
        provider,
        status,
        latencyMs: null,
        failureRate: providerRows.length ? nonHealthy.length / providerRows.length : null,
        lastCheck: latestTimestamp(providerRows),
        affectedOrgs: new Set(nonHealthy.map((row) => row.business_id).filter(Boolean)).size,
        metrics: {
          connections: providerRows.length,
          healthy: providerRows.filter((row) => String(row.health_status ?? '').toUpperCase() === 'HEALTHY').length,
          recovering: providerRows.filter((row) => String(row.health_status ?? '').toUpperCase() === 'RECOVERING').length,
          degraded: providerRows.filter((row) => String(row.health_status ?? '').toUpperCase() === 'DEGRADED').length,
          actionRequired: providerRows.filter((row) => String(row.health_status ?? '').toUpperCase() === 'ACTION_REQUIRED').length,
          unverified: providerRows.filter((row) => !['HEALTHY', 'RECOVERING', 'DEGRADED', 'ACTION_REQUIRED'].includes(String(row.health_status ?? '').toUpperCase())).length,
        },
      });
    }
  } catch (error: any) {
    providerReadError = error?.message || 'Provider health telemetry unavailable.';
    checks.push({
      name: 'Provider integrations',
      status: 'UNKNOWN',
      latencyMs: null,
      failureRate: null,
      lastCheck: nowIso,
      affectedOrgs: null,
      error: providerReadError,
    });
  }

  const statuses = checks.map((check) => check.status as PlatformHealthStatus);
  const overallStatus = worstPlatformStatus(statuses);

  return res.json({
    status: overallStatus,
    timestamp: nowIso,
    checks,
    queue: {
      pending: pendingRows.length,
      running: runningRows.length,
      deadLetter: deadRows.length,
      telemetryAvailable: !queueError,
    },
    openIncidents: openIncidentsCount,
    degradedIntegrations,
    providerTelemetryAvailable: !providerReadError,
  });
});

// ============================================================================
// Incident Management Endpoints
// ============================================================================

/**
 * GET /api/platform/incidents
 * List platform incidents
 */
platformRouter.get('/incidents', async (req: Request, res: Response) => {
  const db = getDb(req);
  try {
    const { data, error } = await db
      .from('platform_incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const mapped = (data || []).map((inc: any) => ({
      full_id: inc.id,
      id: inc.id ? inc.id.substring(0, 8).toUpperCase() : '',
      severity: inc.severity === 'CRITICAL' ? 'SEV-1' : inc.severity === 'HIGH' ? 'SEV-2' : inc.severity || 'SEV-3',
      status: inc.status === 'OPEN' ? 'INVESTIGATING' : inc.status,
      title: inc.title,
      affected: inc.affected_scope || 'Platform Wide',
      started: inc.started_at || inc.created_at || new Date().toISOString(),
      summary: inc.affected_scope || 'No description provided.',
      created_at: inc.created_at,
      updated_at: inc.updated_at,
    }));

    return res.json({ incidents: mapped });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch incidents' });
  }
});

/**
 * POST /api/platform/incidents
 * Declare a new incident
 */
platformRouter.post('/incidents', async (req: Request, res: Response) => {
  const db = getDb(req);
  const { title, severity = 'SEV-3', status = 'INVESTIGATING', affected_scope = 'Platform Wide', description } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Incident title is required.' });
  }

  try {
    const nowIso = new Date().toISOString();
    const payload = {
      title: title.trim(),
      severity: severity.toUpperCase(),
      status: status.toUpperCase(),
      affected_scope: (description || affected_scope || 'Platform Wide').trim(),
      started_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await db
      .from('platform_incidents')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Incident declared successfully.',
      incident: data || payload,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to declare incident' });
  }
});

/**
 * PATCH /api/platform/incidents/:id
 * Update an existing incident
 */
platformRouter.patch('/incidents/:id', async (req: Request, res: Response) => {
  const db = getDb(req);
  const id = getParamId(req);
  const { status, severity, title, affected_scope } = req.body;

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Valid UUID incident ID required.' });
  }

  try {
    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = { updated_at: nowIso };
    if (status) updates.status = status.toUpperCase();
    if (severity) updates.severity = severity.toUpperCase();
    if (title) updates.title = title.trim();
    if (affected_scope) updates.affected_scope = affected_scope.trim();

    const { data, error } = await db
      .from('platform_incidents')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, message: 'Incident updated successfully.', incident: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update incident' });
  }
});

/**
 * POST /api/platform/incidents/:id/resolve
 * Mark incident resolved
 */
platformRouter.post('/incidents/:id/resolve', async (req: Request, res: Response) => {
  const db = getDb(req);
  const id = getParamId(req);

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Valid UUID incident ID required.' });
  }

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await db
      .from('platform_incidents')
      .update({ status: 'RESOLVED', updated_at: nowIso })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, message: 'Incident resolved.', incident: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to resolve incident' });
  }
});

// ============================================================================
// Support Queue & Ticket Management Endpoints
// ============================================================================

/**
 * GET /api/platform/support/tickets
 * List support tickets
 */
platformRouter.get('/support/tickets', async (req: Request, res: Response) => {
  const db = getDb(req);
  const { status, category, severity, priority, limit = '50' } = req.query;

  try {
    let query = db
      .from('support_tickets')
      .select('*, organizations:businesses(name)')
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status && typeof status === 'string') {
      query = query.eq('status', status.toUpperCase());
    }
    if (category && typeof category === 'string') {
      query = query.eq('category', category.toUpperCase());
    }
    if (severity && typeof severity === 'string') {
      query = query.eq('severity', severity);
    }
    if (priority && typeof priority === 'string') {
      query = query.eq('priority', priority.toUpperCase());
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ tickets: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch tickets' });
  }
});

/**
 * GET /api/platform/support/tickets/:id
 * Get single ticket details and conversation history
 */
platformRouter.get('/support/tickets/:id', async (req: Request, res: Response) => {
  const db = getDb(req);
  const id = getParamId(req);

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Valid UUID ticket ID required.' });
  }

  try {
    const { data: ticket, error: ticketErr } = await db
      .from('support_tickets')
      .select('*, organizations:businesses(name)')
      .eq('id', id)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { data: messages } = await db
      .from('support_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    return res.json({ ticket, messages: messages || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch ticket' });
  }
});

/**
 * PATCH /api/platform/support/tickets/:id
 * Update ticket status, priority, severity
 */
platformRouter.patch('/support/tickets/:id', async (req: Request, res: Response) => {
  const db = getDb(req);
  const id = getParamId(req);
  const { status, priority, severity, category } = req.body;

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Valid UUID ticket ID required.' });
  }

  try {
    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = { updated_at: nowIso };

    if (status) {
      updates.status = status.toUpperCase();
      if (updates.status === 'RESOLVED' || updates.status === 'CLOSED') {
        updates.resolved_at = nowIso;
      }
    }
    if (priority) updates.priority = priority.toUpperCase();
    if (severity) updates.severity = severity;
    if (category) updates.category = category.toUpperCase();

    const { data, error } = await db
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select('*, organizations:businesses(name)')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, message: 'Ticket updated successfully.', ticket: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update ticket' });
  }
});

/**
 * GET /api/platform/support/tickets/:id/messages
 * List messages for ticket
 */
platformRouter.get('/support/tickets/:id/messages', async (req: Request, res: Response) => {
  const db = getDb(req);
  const id = getParamId(req);

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Valid UUID ticket ID required.' });
  }

  try {
    const { data, error } = await db
      .from('support_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ messages: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch ticket messages' });
  }
});

/**
 * POST /api/platform/support/tickets/:id/messages
 * Post reply or internal staff note
 */
platformRouter.post('/support/tickets/:id/messages', async (req: Request, res: Response) => {
  const db = getDb(req);
  const id = getParamId(req);
  const { message, is_internal_note = false, user_id } = req.body;

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Valid UUID ticket ID required.' });
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  try {
    const nowIso = new Date().toISOString();
    const payload = {
      ticket_id: id,
      user_id: user_id || null,
      message: message.trim(),
      is_internal_note: Boolean(is_internal_note),
      created_at: nowIso,
    };

    const { data, error } = await db
      .from('support_messages')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Touch support ticket updated_at
    await db
      .from('support_tickets')
      .update({ updated_at: nowIso })
      .eq('id', id);

    return res.status(201).json({
      success: true,
      message: is_internal_note ? 'Internal note added.' : 'Reply posted successfully.',
      supportMessage: data || payload,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to post message' });
  }
});
