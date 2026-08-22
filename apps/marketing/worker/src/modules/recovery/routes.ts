/**
 * Recovery & Reconciliation Engine REST API Routes
 * VowOS Integration Operations & Auto-Recovery System
 */

import { Router, Request, Response } from 'express';
import { IntegrationRecoveryService } from './integrationRecoveryService';
import { IntegrationCircuitBreaker } from './circuitBreaker';
import { ReconciliationEngine } from './reconciliationEngine';

export const recoveryRouter = Router();

/**
 * 1. GET /api/recovery/health/:businessId?
 * Returns comprehensive integration health status, counts by status, and circuit breaker states.
 */
recoveryRouter.get('/health/:businessId?', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const businessId = (req.params.businessId as string) || (req as any).context?.businessId;

  try {
    let connectionsQuery = db ? db.from('provider_connections').select('*') : null;
    if (connectionsQuery && businessId) {
      connectionsQuery = connectionsQuery.eq('business_id', businessId);
    }

    const { data: connections, error } = connectionsQuery ? await connectionsQuery : { data: [], error: null };

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
recoveryRouter.get('/reconnect-url/:connectionId', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const connectionId = req.params.connectionId as string;

  try {
    const url = await IntegrationRecoveryService.generateReconnectUrl(connectionId, { db });
    return res.json({ connectionId, reconnectUrl: url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

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
  const provider = req.params.provider as string;
  const scopeId = (req.query.scopeId as string) || 'global';
  const scope = (req.query.scope as any) || 'GLOBAL';

  try {
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
  const dlqId = req.params.dlqId as string | undefined;
  const { connectionId } = req.body || {};

  try {
    if (dlqId) {
      const result = await ReconciliationEngine.replayDlqEvent(dlqId, { db });
      return res.json(result);
    } else {
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

  try {
    const result = await IntegrationRecoveryService.renewDriveWatches({ db });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
