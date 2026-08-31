/**
 * Tenant authorization for Integration Recovery & Reconciliation.
 *
 * These routes use a service-role database client, so RLS does not protect them.
 * Authorization therefore comes exclusively from the request context established
 * by the worker's global JWT + ACTIVE membership resolver. Never resolve an
 * arbitrary membership a second time here: multi-organization users must select
 * the active workspace explicitly through the verified X-Business-Id flow.
 */
import type { NextFunction, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasPermission } from '../../lib/auth/authorization';

export interface RecoveryContext {
  userId: string;
  businessId: string;
  role: string;
}

interface WorkerRequestContext {
  db?: SupabaseClient;
  userId?: string;
  businessId?: string;
  role?: string;
}

function workerContextOf(req: Request): WorkerRequestContext {
  return (req as unknown as { context?: WorkerRequestContext }).context ?? {};
}

export function recoveryContextOf(req: Request): RecoveryContext {
  const ctx = (req as unknown as { recovery?: RecoveryContext }).recovery;
  if (!ctx) throw new Error('requireRecoveryAccess middleware did not run for this route.');
  return ctx;
}

function dbOf(req: Request): SupabaseClient | undefined {
  return workerContextOf(req).db;
}

export function requireRecoveryAccess(req: Request, res: Response, next: NextFunction) {
  const context = workerContextOf(req);
  if (!context.db) {
    return res.status(500).json({ error: 'Request context is not initialised.' });
  }
  if (!context.userId) {
    return res.status(401).json({ error: 'Sign in required.' });
  }
  if (!context.businessId) {
    return res.status(409).json({
      error: 'Select an active business workspace and try again.',
      code: 'BUSINESS_CONTEXT_REQUIRED',
    });
  }
  if (!hasPermission(context.role, 'integrations.manage')) {
    return res.status(403).json({ error: 'Integration operations permission is required.' });
  }

  const claimed = [
    typeof req.query.businessId === 'string' ? req.query.businessId : undefined,
    typeof req.body?.businessId === 'string' ? req.body.businessId : undefined,
    typeof req.body?.organizationId === 'string' ? req.body.organizationId : undefined,
  ].filter((value): value is string => Boolean(value));

  if (claimed.some((value) => value !== context.businessId)) {
    return res.status(403).json({ error: 'Requested business does not match your active membership.' });
  }

  (req as unknown as { recovery: RecoveryContext }).recovery = {
    userId: context.userId,
    businessId: context.businessId,
    role: context.role ?? '',
  };
  return next();
}

/** Validate routes that carry a businessId path segment after route matching. */
export function assertBusinessScope(req: Request, res: Response): boolean {
  const claimed = req.params?.businessId;
  if (!claimed) return true;

  const ctx = recoveryContextOf(req);
  if (claimed !== ctx.businessId) {
    res.status(403).json({ error: 'Requested business does not match your active membership.' });
    return false;
  }
  return true;
}

/**
 * Prove a provider connection belongs to the caller's active organization.
 * Cross-tenant and nonexistent IDs intentionally return the same 404 response.
 */
export async function assertConnectionAccess(
  req: Request,
  res: Response,
  connectionId: string,
): Promise<{ id: string; business_id: string | null; provider: string } | null> {
  const db = dbOf(req);
  const ctx = recoveryContextOf(req);

  if (!db) {
    res.status(500).json({ error: 'Request context is not initialised.' });
    return null;
  }

  const { data, error } = await db
    .from('provider_connections')
    .select('id, business_id, provider')
    .eq('id', connectionId)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: `Could not resolve connection: ${error.message}` });
    return null;
  }

  const row = data as { id: string; business_id: string | null; provider: string } | null;
  if (!row || row.business_id !== ctx.businessId) {
    res.status(404).json({ error: 'Connection not found.' });
    return null;
  }

  return row;
}
