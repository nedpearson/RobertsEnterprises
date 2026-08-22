/**
 * Authorisation for Recovery & Reconciliation routes.
 *
 * Tenant operators may act only on connections owned by their active business.
 * Platform Owner / Super Admin operators may inspect and repair any connection,
 * which is required by the central VowOS Platform Integrations console. Every
 * connection-keyed route still resolves the connection server-side before acting;
 * client-supplied tenant identifiers are never trusted as proof of ownership.
 */
import type { NextFunction, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RecoveryContext {
  userId: string;
  businessId: string | null;
  role: string;
  isPlatformAdmin: boolean;
}

const ALLOWED_TENANT_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];
const ALLOWED_PLATFORM_ROLES = ['PLATFORM_OWNER', 'SUPER_ADMIN'];

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
  if (!db) return res.status(500).json({ error: 'Request context is not initialised.' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in required.' });

  const token = authHeader.slice('Bearer '.length).trim();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired session.' });

  const userId = data.user.id;

  // Platform operators are resolved first. This is deliberately server-side;
  // a client header can never promote a tenant user to platform access.
  const { data: platformUser, error: platformError } = await db
    .from('platform_users')
    .select('platform_role, active')
    .eq('auth_user_id', userId)
    .eq('active', true)
    .maybeSingle();
  if (platformError) return res.status(500).json({ error: `Could not resolve platform role: ${platformError.message}` });

  const platformRole = (platformUser as { platform_role?: string } | null)?.platform_role;
  if (platformRole && ALLOWED_PLATFORM_ROLES.includes(platformRole)) {
    (req as unknown as { recovery: RecoveryContext }).recovery = {
      userId,
      businessId: null,
      role: platformRole,
      isPlatformAdmin: true,
    };
    return next();
  }

  const { data: membership, error: membershipError } = await db
    .from('business_memberships')
    .select('business_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (membershipError) return res.status(500).json({ error: `Could not resolve membership: ${membershipError.message}` });
  if (!membership) return res.status(403).json({ error: 'No active business membership for this account.' });

  const row = membership as { business_id: string; role: string };
  if (!ALLOWED_TENANT_ROLES.includes(String(row.role).toUpperCase())) {
    return res.status(403).json({ error: 'Integration operations require an Owner, Admin, or Manager role.' });
  }

  const claimed =
    (typeof (req.body as { businessId?: unknown })?.businessId === 'string' && (req.body as { businessId: string }).businessId) ||
    (typeof req.query.businessId === 'string' && req.query.businessId) ||
    null;
  if (claimed && claimed !== row.business_id) {
    return res.status(403).json({ error: 'Requested business does not match your membership.' });
  }

  (req as unknown as { recovery: RecoveryContext }).recovery = {
    userId,
    businessId: row.business_id,
    role: row.role,
    isPlatformAdmin: false,
  };
  next();
}

export function assertBusinessScope(req: Request, res: Response): boolean {
  const claimed = req.params?.businessId;
  if (!claimed) return true;

  const ctx = recoveryContextOf(req);
  if (ctx.isPlatformAdmin) return true;
  if (claimed !== ctx.businessId) {
    res.status(403).json({ error: 'Requested business does not match your membership.' });
    return false;
  }
  return true;
}

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
  if (!row || (!ctx.isPlatformAdmin && row.business_id !== ctx.businessId)) {
    res.status(404).json({ error: 'Connection not found.' });
    return null;
  }

  return row;
}
