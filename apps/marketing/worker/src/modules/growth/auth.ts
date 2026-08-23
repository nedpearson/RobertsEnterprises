/**
 * Tenant authorisation for Growth/Marketing service-role routes.
 *
 * Service-role database calls bypass RLS, so business_id is never trusted from
 * request data until membership is verified. Multi-business users must provide
 * an explicit tenant context; single-business users remain backward compatible.
 */
import type { NextFunction, Request, Response } from 'express';
import { growthDb } from './client';

export interface GrowthContext {
  userId: string;
  businessId: string;
  role: string;
}

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

export function hasGrowthAccessRole(role: string): boolean {
  return ALLOWED_ROLES.includes(role.trim().toUpperCase());
}

export function growthContextOf(req: Request): GrowthContext {
  const ctx = (req as unknown as { growth?: GrowthContext }).growth;
  if (!ctx) throw new Error('requireGrowthAccess middleware did not run for this route.');
  return ctx;
}

/**
 * Resolve the tenant the browser is actively operating in.
 *
 * Header is canonical because OAuth/bootstrap GET requests do not have a body.
 * Body/query are retained for existing callers and are verified against the
 * authenticated user's memberships before the service-role client is used.
 */
export function requestedBusinessId(req: Request): string | null {
  const header = req.headers['x-business-id'];
  if (typeof header === 'string' && header.trim()) return header.trim();

  const bodyId = typeof req.body?.businessId === 'string' ? req.body.businessId.trim() : '';
  if (bodyId) return bodyId;

  const queryId = typeof req.query.businessId === 'string' ? req.query.businessId.trim() : '';
  return queryId || null;
}

export async function requireGrowthAccess(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in required.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const { data, error } = await growthDb().auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  const selectedBusinessId = requestedBusinessId(req);
  let membershipQuery = growthDb()
    .from('business_memberships')
    .select('business_id, role, status')
    .eq('user_id', data.user.id)
    .eq('status', 'ACTIVE');

  if (selectedBusinessId) {
    membershipQuery = membershipQuery.eq('business_id', selectedBusinessId);
  }

  // Fetch at most two rows. Two rows without an explicit tenant is enough to
  // prove the request is ambiguous while avoiding an unnecessary full scan.
  const { data: memberships, error: membershipError } = await membershipQuery.limit(selectedBusinessId ? 1 : 2);

  if (membershipError) {
    return res.status(500).json({ error: `Could not resolve membership: ${membershipError.message}` });
  }
  if (!memberships?.length) {
    return res.status(403).json({ error: 'No active business membership for the requested tenant.' });
  }
  if (!selectedBusinessId && memberships.length > 1) {
    return res.status(409).json({
      error: 'This account belongs to multiple businesses. Select the active workspace and try again.',
      code: 'BUSINESS_CONTEXT_REQUIRED',
    });
  }

  const row = memberships[0] as { business_id: string; role: string };
  const normalizedRole = row.role.trim().toUpperCase();
  if (!hasGrowthAccessRole(row.role)) {
    return res.status(403).json({ error: 'Growth tools require an Owner, Admin, or Manager role.' });
  }

  (req as unknown as { growth: GrowthContext }).growth = {
    userId: data.user.id,
    businessId: row.business_id,
    role: normalizedRole,
  };
  next();
}
