import { Router, Request, Response } from 'express';
import { IntegrationRecoveryService } from '../recovery/integrationRecoveryService';

export const platformIntegrationsRouter = Router();

function dbOf(req: Request): any {
  return (req as any).context?.db;
}

function connectionIdOf(req: Request): string {
  return typeof req.params.connectionId === 'string' ? req.params.connectionId.trim() : '';
}

async function loadConnection(req: Request, res: Response): Promise<any | null> {
  const db = dbOf(req);
  const connectionId = connectionIdOf(req);
  if (!db) {
    res.status(500).json({ error: 'Platform request context is not initialized.' });
    return null;
  }
  if (!connectionId) {
    res.status(400).json({ error: 'A provider connection identifier is required.' });
    return null;
  }

  const { data, error } = await db
    .from('provider_connections')
    .select('*')
    .eq('id', connectionId)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return null;
  }
  if (!data) {
    res.status(404).json({ error: 'Provider connection not found.' });
    return null;
  }
  return data;
}

platformIntegrationsRouter.get('/', async (req: Request, res: Response) => {
  const db = dbOf(req);
  if (!db) return res.status(500).json({ error: 'Platform request context is not initialized.' });

  try {
    const { data, error } = await db
      .from('provider_connections')
      .select(`
        *,
        businesses:business_id(name),
        brands:brand_id(name),
        locations:location_id(name, city)
      `)
      .order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ connections: data || [] });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to load provider connections.' });
  }
});

platformIntegrationsRouter.get('/:connectionId/diagnostics', async (req: Request, res: Response) => {
  const db = dbOf(req);
  const connection = await loadConnection(req, res);
  if (!connection) return;
  const connectionId = connection.id as string;

  try {
    const [circuitBreaker, latestError, timeline, cursors, dlqEvents, driveWatch] = await Promise.all([
      db.from('integration_circuit_breakers').select('*').eq('scope_id', connectionId).maybeSingle(),
      db.from('integration_error_logs').select('*').eq('provider_connection_id', connectionId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('integration_recovery_timelines').select('*').eq('provider_connection_id', connectionId).order('created_at', { ascending: false }).limit(50),
      db.from('integration_sync_cursors').select('*').eq('provider_connection_id', connectionId),
      db.from('integration_dlq_events').select('*').eq('provider_connection_id', connectionId).order('created_at', { ascending: false }).limit(25),
      db.from('google_drive_watches').select('*').eq('provider_connection_id', connectionId).maybeSingle(),
    ]);

    const firstError = [circuitBreaker.error, latestError.error, timeline.error, cursors.error, dlqEvents.error, driveWatch.error].find(Boolean);
    if (firstError) return res.status(500).json({ error: firstError.message });

    return res.json({
      connection,
      circuitBreaker: circuitBreaker.data || null,
      latestError: latestError.data || null,
      timeline: timeline.data || [],
      cursors: cursors.data || [],
      dlqEvents: dlqEvents.data || [],
      driveWatch: driveWatch.data || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to load integration diagnostics.' });
  }
});

platformIntegrationsRouter.post('/:connectionId/repair', async (req: Request, res: Response) => {
  const db = dbOf(req);
  const connection = await loadConnection(req, res);
  if (!connection) return;

  try {
    const result = await IntegrationRecoveryService.diagnoseAndRepair(
      connection.id,
      'OPERATOR_MANUAL',
      { db },
    );
    const message =
      (typeof result.details?.suggestedAction === 'string' && result.details.suggestedAction) ||
      (typeof result.details?.rootCause === 'string' && result.details.rootCause) ||
      (result.success
        ? 'A verified recovery action completed; connection state remains evidence-based.'
        : 'No verified provider repair was completed.');
    return res.status(result.success ? (result.status === 'HEALTHY' ? 200 : 202) : (result.status === 'ACTION_REQUIRED' ? 409 : 503)).json({
      ...result,
      message,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Integration repair failed.' });
  }
});

platformIntegrationsRouter.post('/:connectionId/reconcile', async (req: Request, res: Response) => {
  const connection = await loadConnection(req, res);
  if (!connection) return;
  const message = 'Provider-side pull reconciliation is not configured for this connection. No data or health state was changed.';
  return res.status(501).json({
    code: 'PROVIDER_RECONCILIATION_ADAPTER_REQUIRED',
    error: message,
    message,
    connectionId: connection.id,
    resourceType: typeof req.body?.resourceType === 'string' ? req.body.resourceType : null,
  });
});

platformIntegrationsRouter.post('/:connectionId/test', async (req: Request, res: Response) => {
  const connection = await loadConnection(req, res);
  if (!connection) return;
  const message = 'Live provider verification is not implemented by this platform endpoint. Stored provider state is shown without claiming reachability.';
  return res.status(501).json({
    connectionId: connection.id,
    provider: connection.provider,
    providerVerified: false,
    reachable: null,
    healthStatus: connection.health_status ?? null,
    authState: connection.auth_state ?? null,
    circuitBreakerState: connection.circuit_breaker_state ?? null,
    lastSuccessfulSyncAt: connection.last_successful_sync_at ?? null,
    lastHealthCheckAt: connection.last_health_check_at ?? null,
    lastErrorMessage: connection.last_error_message ?? null,
    checkedAt: new Date().toISOString(),
    message,
    error: message,
  });
});

platformIntegrationsRouter.post('/:connectionId/reconnect-url', async (req: Request, res: Response) => {
  const db = dbOf(req);
  const connection = await loadConnection(req, res);
  if (!connection) return;

  try {
    const reconnectUrl = await IntegrationRecoveryService.generateReconnectUrl(connection.id, { db });
    return res.json({ connectionId: connection.id, reconnectUrl });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Could not generate reconnect route.' });
  }
});
