/**
 * Recovery & Reconciliation Engine REST API Routes
 *
 * Every route runs against the service-role client, so membership and
 * connection ownership are verified before any tenant data is read or mutated.
 */

import { Router, Request, Response } from 'express';
import { IntegrationRecoveryService } from './integrationRecoveryService';
import { IntegrationCircuitBreaker } from './circuitBreaker';
import { ReconciliationEngine } from './reconciliationEngine';
import {
  requireRecoveryAccess,
  recoveryContextOf,
  assertConnectionAccess,
  assertBusinessScope,
} from './auth';

export const recoveryRouter = Router();
recoveryRouter.use(requireRecoveryAccess);

recoveryRouter.get(['/health', '/health/:businessId'], async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const { businessId } = recoveryContextOf(req);

  try {
    if (!assertBusinessScope(req, res)) return;
    if (!db) return res.status(500).json({ error: 'Request context is not initialised.' });

    const { data: connections, error } = await db
      .from('provider_connections')
      .select('*')
      .eq('business_id', businessId);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({
      total: connections?.length || 0,
      healthy: connections?.filter((connection: any) => connection.health_status === 'HEALTHY').length || 0,
      recovering: connections?.filter((connection: any) => connection.health_status === 'RECOVERING').length || 0,
      actionRequired: connections?.filter((connection: any) => connection.health_status === 'ACTION_REQUIRED').length || 0,
      degraded: connections?.filter((connection: any) => connection.health_status === 'DEGRADED').length || 0,
      connections: (connections || []).map((connection: any) => ({
        id: connection.id,
        businessId: connection.business_id,
        brandId: connection.brand_id,
        locationId: connection.location_id,
        provider: connection.provider,
        providerAccountId: connection.provider_account_id,
        healthStatus: connection.health_status,
        circuitBreakerState: connection.circuit_breaker_state,
        authState: connection.auth_state,
        lastSuccessfulSyncAt: connection.last_successful_sync_at,
        lastHealthCheckAt: connection.last_health_check_at,
        lastErrorMessage: connection.last_error_message,
        syncErrors24h: connection.sync_errors_24h,
        reconnectUrl: connection.reconnect_url,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

recoveryRouter.get('/timeline/:connectionId', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const connectionId = req.params.connectionId as string;

  try {
    if (!(await assertConnectionAccess(req, res, connectionId))) return;
    const timeline = await IntegrationRecoveryService.getRecoveryTimeline(connectionId, { db });
    return res.json({ connectionId, timeline });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

recoveryRouter.post('/repair/:connectionId', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const connectionId = req.params.connectionId as string;

  try {
    if (!(await assertConnectionAccess(req, res, connectionId))) return;
    const result = await IntegrationRecoveryService.diagnoseAndRepair(
      connectionId,
      'OPERATOR_MANUAL',
      { db },
    );
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Provider reconciliation cannot accept records supplied by the browser. The
 * previous implementation allowed a tenant operator to submit arbitrary order,
 * message or appointment arrays to a service-role ingestion path and could then
 * mark the connection healthy. Until an official provider pull adapter is wired,
 * this endpoint reports that reconciliation is unavailable rather than faking a
 * zero-record successful sync.
 */
recoveryRouter.post('/reconcile/:connectionId', async (req: Request, res: Response) => {
  const connectionId = req.params.connectionId as string;

  try {
    if (!(await assertConnectionAccess(req, res, connectionId))) return;

    const forbiddenPayloadKeys = [
      'ordersToIngest',
      'messagesToIngest',
      'appointmentsToIngest',
    ].filter((key) => req.body?.[key] !== undefined);

    if (forbiddenPayloadKeys.length) {
      return res.status(400).json({
        code: 'INJECTED_RECONCILIATION_RECORDS_REJECTED',
        error: 'Reconciliation records must come from the verified provider adapter, not the request body.',
        rejectedFields: forbiddenPayloadKeys,
      });
    }

    return res.status(501).json({
      code: 'PROVIDER_RECONCILIATION_ADAPTER_REQUIRED',
      error: 'Provider-side pull reconciliation is not configured for this connection. No data or health state was changed.',
      connectionId,
      resourceType: typeof req.body?.resourceType === 'string' ? req.body.resourceType : null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

const handleReconnectUrl = async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const connectionId = req.params.connectionId as string;

  try {
    if (!(await assertConnectionAccess(req, res, connectionId))) return;
    const url = await IntegrationRecoveryService.generateReconnectUrl(connectionId, { db });
    return res.json({ connectionId, reconnectUrl: url });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

recoveryRouter.get('/reconnect-url/:connectionId', handleReconnectUrl);
recoveryRouter.post('/reconnect-url/:connectionId', handleReconnectUrl);

/**
 * Retired: this endpoint used to accept an arbitrary access_token from an
 * authenticated browser and mark a provider connection healthy. Real callbacks
 * are provider-owned routes that validate OAuth state/signatures before storing
 * credentials.
 */
recoveryRouter.post('/reconnect-callback', (_req: Request, res: Response) => {
  return res.status(410).json({
    code: 'GENERIC_RECOVERY_CALLBACK_RETIRED',
    error: 'Reconnect through the provider-specific OAuth flow in Integration Settings.',
  });
});

recoveryRouter.get('/circuit-status/:provider', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const { businessId } = recoveryContextOf(req);
  const provider = req.params.provider as string;
  const scope = (req.query.scope as any) || 'GLOBAL';

  try {
    let scopeId: string;
    if (scope === 'GLOBAL') {
      scopeId = 'global';
    } else if (scope === 'TENANT') {
      scopeId = businessId;
    } else if (scope === 'ACCOUNT') {
      const accountId = req.query.scopeId as string;
      if (!accountId) return res.status(400).json({ error: 'scopeId is required for ACCOUNT scope.' });
      if (!(await assertConnectionAccess(req, res, accountId))) return;
      scopeId = accountId;
    } else {
      return res.status(400).json({ error: 'scope must be one of GLOBAL, TENANT, ACCOUNT.' });
    }

    const status = await IntegrationCircuitBreaker.checkCircuit(provider, scope, scopeId, { db });
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

recoveryRouter.post(['/dlq/replay', '/dlq/replay/:dlqId'], async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const { businessId } = recoveryContextOf(req);
  const dlqId = req.params.dlqId as string | undefined;
  const { connectionId } = req.body || {};

  try {
    if (dlqId) {
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
    }

    if (!connectionId) {
      return res.status(400).json({ error: 'connectionId is required for batch replay.' });
    }
    if (!(await assertConnectionAccess(req, res, connectionId))) return;
    const results = await ReconciliationEngine.replayAllPendingDlq(connectionId, { db });
    return res.json({ count: results.length, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

recoveryRouter.post('/watches/renew', async (req: Request, res: Response) => {
  const db = (req as any).context?.db;
  const { businessId } = recoveryContextOf(req);

  try {
    const result = await IntegrationRecoveryService.renewDriveWatches({ db, businessId });
    return res.json({
      ...result,
      providerMutationPerformed: result.renewed > 0,
      message: result.failed > 0
        ? 'One or more Drive watches require the verified Google provider renewal flow.'
        : 'No expiring Drive watches require renewal.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Read-only local state probe. This does not contact the provider and therefore
 * never reports the provider as verified/reachable merely from stored flags.
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

    const stored = (row || {}) as any;
    const storedStateAllowsAttempt = stored.auth_state === 'AUTHORIZED' && circuit.allowExecution;

    return res.json({
      connectionId,
      provider: connection.provider,
      providerVerified: false,
      reachable: null,
      storedStateAllowsAttempt,
      healthStatus: stored.health_status ?? null,
      authState: stored.auth_state ?? null,
      circuitBreakerState: stored.circuit_breaker_state ?? null,
      circuitState: circuit.state,
      circuitAllowsExecution: circuit.allowExecution,
      providerOutage: circuit.isProviderOutage,
      lastSuccessfulSyncAt: stored.last_successful_sync_at ?? null,
      lastError: stored.last_error_message
        ? {
            at: stored.last_error_at ?? null,
            code: stored.last_error_code ?? null,
            category: stored.last_error_category ?? null,
            message: stored.last_error_message,
          }
        : null,
      syncErrors24h: stored.sync_errors_24h ?? 0,
      checkedAt: new Date().toISOString(),
      note: 'This endpoint verifies local recovery state only. It does not claim a live provider round-trip succeeded.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

recoveryRouter.get('/test/:connectionId', handleTest);
recoveryRouter.post('/test/:connectionId', handleTest);
