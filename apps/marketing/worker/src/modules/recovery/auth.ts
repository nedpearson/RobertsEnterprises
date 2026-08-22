/**
 * Tenant authorisation for the Recovery & Reconciliation routes.
 *
 * WHY THIS EXISTS: every recovery route runs against a SERVICE ROLE Supabase
 * client (`req.context.db`), which bypasses RLS entirely. As originally merged,
 * `recoveryRouter` was mounted with no guard at all, so an unauthenticated
 * caller could:
 *
 *   - GET /api/recovery/health              -> every provider_connections row
 *                                              for EVERY tenant, including
 *                                              provider_account_id and
 *                                              reconnect_url
 *   - GET /api/recovery/reconnect-url/:id   -> mint a signed OAuth reconnect
 *                                              URL for any tenant's connection
 *   - POST /api/recovery/reconnect-callback -> bind attacker-supplied tokens to
 *                                              that connection
 *
 * which composes into provider-account takeover. RLS could not save us because
 * the service role ignores it.
 *
 * The rule is therefore the same one `requireGrowthAccess` established:
 * business_id is DERIVED from the caller's verified JWT membership and never
 * read from client input, and a request naming a different tenant is REJECTED
 * rather than silently re-scoped so a frontend bug surfaces as a 403 instead of
 * reading the wrong tenant.
 */
import type { NextFunction, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RecoveryContext {
  userId: string;
  businessId: string;
  role: string;
}

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

export function recoveryContextOf(req: Request): RecoveryContext {
  const ctx = (req as unknown as { recovery?: RecoveryContext }).recovery;
  if (!ctx) throw new Error('requireRecoveryAccess middleware did not run for this route.');
  return ctx;
}

function dbOf(req: Request): SupabaseClient | undefined {
  return (req as unknown as { context?: { db?: SupabaseClient } }).context?.db;
}

export async function requireRecoveryAccess(req: Request, res: Response, next: NextFunction) {
  const db = dbOf(req);
  if (!db) {
    return res.status(500).json({ error: 'Request context is not initialised.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in required.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  const { data: membership, error: membershipError } = await db
    .from('business_memberships')
    .select('business_id, role, status')
    .eq('user_id', data.user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (membershipError) {
    return res.status(500).json({ error: `Could not resolve membership: ${membershipError.message}` });
  }
  if (!membership) {
    return res.status(403).json({ error: 'No active business membership for this account.' });
  }

  const row = membership as { business_id: string; role: string };
  if (!ALLOWED_ROLES.includes(row.role)) {
    return res.status(403).json({ error: 'Integration operations require an Owner, Admin, or Manager role.' });
  }

  // Reject rather than silently re-scope.
  //
  // NOTE: req.params is EMPTY here — router-level middleware runs before route
  // matching, so a `:businessId` path segment is not yet populated. Routes that
  // accept a tenant in the path must additionally call `assertBusinessScope`.
  const claimed =
    (typeof (req.body as { businessId?: unknown })?.businessId === 'string' &&
      (req.body as { businessId: string }).businessId) ||
    (typeof req.query.businessId === 'string' && req.query.businessId) ||
    null;
  if (claimed && claimed !== row.business_id) {
    return res.status(403).json({ error: 'Requested business does not match your membership.' });
  }

  (req as unknown as { recovery: RecoveryContext }).recovery = {
    userId: data.user.id,
    businessId: row.business_id,
    role: row.role,
  };
  next();
}

/**
 * Route-level tenant check for routes that carry a `:businessId` PATH segment.
 *
 * `requireRecoveryAccess` cannot do this: as router-level middleware it runs
 * before Express populates `req.params`, so the segment is invisible to it.
 * Returns true when the caller may proceed; on false it has already written the
 * response.
 *
 * Rejecting (rather than quietly serving the caller's own tenant) is the point:
 * a frontend that requests the wrong tenant should surface as a 403, not as
 * silently-correct-looking data.
 */
export function assertBusinessScope(req: Request, res: Response): boolean {
  const claimed = req.params?.businessId;
  if (!claimed) return true;

  const ctx = recoveryContextOf(req);
  if (claimed !== ctx.businessId) {
    res.status(403).json({ error: 'Requested business does not match your membership.' });
    return false;
  }
  return true;
}

/**
 * Every route keyed by `:connectionId` must prove the connection belongs to the
 * caller's tenant before acting on it. Without this the membership check above
 * is worthless: any signed-in Manager of tenant A could pass tenant B's
 * connection id and repair, reconcile, or mint a reconnect URL against it.
 *
 * Returns the connection row on success. On failure it has already written the
 * response, and the caller must return immediately.
 *
 * A connection that does not exist and one that belongs to another tenant both
 * return 404 with the same body, so this cannot be used to enumerate which
 * connection ids are real.
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

  // Same response for "absent" and "not yours" — no enumeration oracle.
  if (!row || row.business_id !== ctx.businessId) {
    res.status(404).json({ error: 'Connection not found.' });
    return null;
  }

  return row;
}
