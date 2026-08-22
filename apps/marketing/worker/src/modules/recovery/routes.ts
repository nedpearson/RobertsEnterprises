/**
 * Recovery & Reconciliation Engine REST API Routes
 * VowOS Integration Operations & Auto-Recovery System
 *
 * SECURITY: every route here runs against the SERVICE ROLE client, which
 * bypasses RLS. The router is therefore gated by `requireRecoveryAccess`, and
 * routes keyed by :connectionId additionally call `assertConnectionAccess` —
 * membership alone must not grant access to another tenant's connection id.
 * See ./auth.ts for the full rationale.
 */

import { Router, Request, Response } from 'express';
import { IntegrationRecoveryService } from './integrationRecoveryService';
import { IntegrationCircuitBreaker } from './circuitBreaker';
import { ReconciliationEngine } from './reconciliationEngine';
import { requireRecoveryAccess, recoveryContextOf, assertConnectionAccess, assertBusinessScope } from './auth';

export const recoveryRouter = Router();

// Applied on the router itself rather than at the mount point, so the guard
// cannot be lost by a future re-mount in index.ts.
recoveryRouter.use(requireRecoveryAccess);

/**
 * 1. GET /api/recovery/health/:businessId?
 * Returns comprehensive integration health status, counts by status, and circuit breaker states.
 */
recoveryRouter.get('/health/:businessId?', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  // Scope is ALWAYS the caller's own membership. The optional :businessId
  // segment is validated against it by requireRecoveryAccess and never widens
  // the query — an unscoped select here previously returned every tenant's
  // connections, including provider_account_id and reconnect_url, to any caller.
  const { businessId } = recoveryContextOf(req);

  try {
    // Path-segment tenant check — see assertBusinessScope for why the router
    // middleware cannot do this one.
    if (!assertBusinessScope(req, res)) return;

    if (!db) {
      return res.status(500).json({ error: 'Request context is not initialised.' });
    }

    const { data: connections, error } = await db
      .from('provider_connections')
      .select('*')
      .eq('business_id', businessId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const summary = {
      total: connections?.length || 0,
      healthy: connections?.filter((c: any) => c.health_status === 'HEALTHY').length || 0,
      recovering: connections?.filter((c: any) => c.health_status === 'RECOVERING').length || 0,
      actionRequired: connections?.filter((c: any) => c.health_status === 'ACTION_REQUIRED').length || 0,
      degraded: connections?.filter((c: any) => c.health_status === 'DEGRADED').length || 0,
      connections: (connections || []).map((c: any) => ({
        id: c.id,
        businessId: c.business_id,
        brandId: c.brand_id,
        locationId: c.location_id,
        provider: c.provider,
        providerAccountId: c.provider_account_id,
        healthStatus: c.health_status,
        circuitBreakerState: c.circuit_breaker_state,
        authState: c.auth_state,
        lastSuccessfulSyncAt: c.last_successful_sync_at,
        lastHealthCheckAt: c.last_health_check_at,
        lastErrorMessage: c.last_error_message,
        syncErrors24h: c.sync_errors_24h,
        reconnectUrl: c.reconnect_url
      }))
    };

    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 2. GET /api/recovery/timeline/:connectionId
 * Returns chronological recovery audit timeline entries for the connection.
 */
recoveryRouter.get('/timeline/:connectionId', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const connectionId = req.params.connectionId as string;

  try {
    if (!(await assertConnectionAccess(req, res, connectionId))) return;
    const timeline = await IntegrationRecoveryService.getRecoveryTimeline(connectionId, { db });
    return res.json({ connectionId, timeline });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 3. POST /api/recovery/repair/:connectionId
 * Triggers manual / operator-invoked diagnostic and auto-repair pipeline.
 */
recoveryRouter.post('/repair/:connectionId', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const connectionId = req.params.connectionId as string;

  try {
    if (!(await assertConnectionAccess(req, res, connectionId))) return;
    const result = await IntegrationRecoveryService.diagnoseAndRepair(connectionId, 'OPERATOR_MANUAL', { db });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 4. POST /api/recovery/reconcile/:connectionId
 * Triggers missed data reconciliation for a provider connection.
 */
recoveryRouter.post('/reconcile/:connectionId', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const connectionId = req.params.connectionId as string;
  const { resourceType, lookbackBufferSeconds, ordersToIngest, messagesToIngest, appointmentsToIngest } = req.body;

  try {
    if (!(await assertConnectionAccess(req, res, connectionId))) return;
    const report = await ReconciliationEngine.reconcileConnection(connectionId, {
      resourceType,
      lookbackBufferSeconds,
      ordersToIngest,
      messagesToIngest,
      appointmentsToIngest,
      db
    });
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 5. GET /api/recovery/reconnect-url/:connectionId
 * Generates a signed, single-use OAuth reconnection URL.
 */
const handleReconnectUrl = async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const connectionId = req.params.connectionId as string;

  try {
    if (!(await assertConnectionAccess(req, res, connectionId))) return;
    const url = await IntegrationRecoveryService.generateReconnectUrl(connectionId, { db });
    return res.json({ connectionId, reconnectUrl: url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// The Inspect drawer issues POST; minting a single-use URL is a mutation, so
// POST is the honest verb. GET is kept for existing callers.
recoveryRouter.get('/reconnect-url/:connectionId', handleReconnectUrl);
recoveryRouter.post('/reconnect-url/:connectionId', handleReconnectUrl);

/**
 * 6. POST /api/recovery/reconnect-callback
 * Validates state HMAC and resumes recovery pipeline.
 */
recoveryRouter.post('/reconnect-callback', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const { state, access_token, refresh_token, expires_in } = req.body;

  if (!state || !access_token) {
    return res.status(400).json({ error: 'Missing required parameters: state and access_token required.' });
  }

  try {
    const result = await IntegrationRecoveryService.handleReconnectCallback(
      state,
      { access_token, refresh_token, expires_in },
      { db }
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * 7. GET /api/recovery/circuit-status/:provider
 * Checks circuit breaker and provider-wide outage status.
 */
recoveryRouter.get('/circuit-status/:provider', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const { businessId } = recoveryContextOf(req);
  const provider = req.params.provider as string;
  const scope = (req.query.scope as any) || 'GLOBAL';

  try {
    // scopeId is never taken from the query string except for GLOBAL, which is
    // provider-wide infrastructure state rather than tenant data and is
    // therefore readable by any authenticated member.
    let scopeId: string;
    if (scope === 'GLOBAL') {
      scopeId = 'global';
    } else if (scope === 'TENANT') {
      scopeId = businessId;
    } else if (scope === 'ACCOUNT') {
      const accountId = req.query.scopeId as string;
      if (!accountId) {
        return res.status(400).json({ error: 'scopeId is required for ACCOUNT scope.' });
      }
      if (!(await assertConnectionAccess(req, res, accountId))) return;
      scopeId = accountId;
    } else {
      return res.status(400).json({ error: 'scope must be one of GLOBAL, TENANT, ACCOUNT.' });
    }

    const status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId, { db });
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 8. POST /api/recovery/dlq/replay/:dlqId?
 * Replays single or batch DLQ events.
 */
recoveryRouter.post('/dlq/replay/:dlqId?', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const { businessId } = recoveryContextOf(req);
  const dlqId = req.params.dlqId as string | undefined;
  const { connectionId } = req.body || {};

  try {
    if (dlqId) {
      // Resolve the event's owner first — replaying another tenant's DLQ event
      // would re-ingest their data through our pipeline.
      const { data: event, error } = await db
        .from('integration_dlq_events')
        .select('id, business_id')
        .eq('id', dlqId)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!event || (event as any).business_id !== businessId) {
        return res.status(404).json({ error: 'DLQ event not found.' });
      }
      const result = await ReconciliationEngine.replayDlqEvent(dlqId, { db });
      return res.json(result);
    } else {
      // Batch replay must name a connection the caller owns. There is no safe
      // cross-tenant reading of an unscoped "replay everything".
      if (!connectionId) {
        return res.status(400).json({ error: 'connectionId is required for batch replay.' });
      }
      if (!(await assertConnectionAccess(req, res, connectionId))) return;
      const results = await ReconciliationEngine.replayAllPendingDlq(connectionId, { db });
      return res.json({ count: results.length, results });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 9. POST /api/recovery/watches/renew
 * Batch renews Google Drive push notification watches.
 */
recoveryRouter.post('/watches/renew', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const { businessId } = recoveryContextOf(req);

  try {
    // Scoped to the caller's tenant — this previously renewed every watch in
    // the database regardless of who asked.
    const result = await IntegrationRecoveryService.renewDriveWatches({ db, businessId });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 10. GET|POST /api/recovery/test/:connectionId
 * Read-only diagnostic probe. Mutates nothing.
 *
 * The Inspect drawer's "Test Connection" button has always called this path
 * (platformDataSource.ts). The route did not exist, so the button 404'd on the
 * production plane while appearing to work against demo fixtures.
 */
const handleTest = async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const connectionId = req.params.connectionId as string;

  try {
    const connection = await assertConnectionAccess(req, res, connectionId);
    if (!connection) return;

    const { data: row, error } = await db
      .from('provider_connections')
      .select('health_status, circuit_breaker_state, auth_state, last_successful_sync_at, last_error_at, last_error_code, last_error_message, last_error_category, sync_errors_24h')
      .eq('id', connectionId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    const circuit = await IntegrationCircuitBreaker.checkCircuit(
      connection.provider,
      'ACCOUNT',
      connectionId,
      { db },
    );

    const r = (row || {}) as any;
    const reachable = r.auth_state === 'AUTHORIZED' && circuit.allowExecution;

    return res.json({
      connectionId,
      provider: connection.provider,
      reachable,
      healthStatus: r.health_status ?? null,
      authState: r.auth_state ?? null,
      circuitBreakerState: r.circuit_breaker_state ?? null,
      circuitState: circuit.state,
      circuitAllowsExecution: circuit.allowExecution,
      providerOutage: circuit.isProviderOutage,
      lastSuccessfulSyncAt: r.last_successful_sync_at ?? null,
      lastError: r.last_error_message
        ? {
            at: r.last_error_at ?? null,
            code: r.last_error_code ?? null,
            category: r.last_error_category ?? null,
            message: r.last_error_message,
          }
        : null,
      syncErrors24h: r.sync_errors_24h ?? 0,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

recoveryRouter.get('/test/:connectionId', handleTest);
recoveryRouter.post('/test/:connectionId', handleTest);
