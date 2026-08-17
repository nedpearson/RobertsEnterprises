/**
 * Tenant authorisation for the Growth routes.
 *
 * WHY THIS EXISTS: every growth route runs against the SERVICE ROLE Supabase
 * client, which bypasses RLS entirely. The original implementation took
 * `businessId` from the request body/query, so any caller could name any
 * tenant — trigger their syncs, poison their connection status, or publish a
 * reply to their Google listing. RLS could not save us because the service role
 * ignores it.
 *
 * The rule is therefore: business_id is DERIVED from the caller's verified JWT
 * membership and never read from client input. A request that names a different
 * tenant is rejected rather than silently re-scoped, so a bug in the frontend
 * surfaces as a 403 instead of writing to the wrong tenant.
 */
import type { NextFunction, Request, Response } from 'express';
import { productionSupabase } from '../../index';

export interface GrowthContext {
  userId: string;
  businessId: string;
  role: string;
}

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

export function growthContextOf(req: Request): GrowthContext {
  const ctx = (req as unknown as { growth?: GrowthContext }).growth;
  if (!ctx) throw new Error('requireGrowthAccess middleware did not run for this route.');
  return ctx;
}

export async function requireGrowthAccess(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in required.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const { data, error } = await productionSupabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  const { data: membership, error: membershipError } = await productionSupabase
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
    return res.status(403).json({ error: 'Growth tools require an Owner, Admin, or Manager role.' });
  }

  // Reject rather than silently re-scope: a mismatch means the client is
  // confused, and quietly writing to the caller's own tenant would hide it.
  const claimed =
    (typeof req.body?.businessId === 'string' && req.body.businessId) ||
    (typeof req.query.businessId === 'string' && req.query.businessId) ||
    null;
  if (claimed && claimed !== row.business_id) {
    return res.status(403).json({ error: 'Requested business does not match your membership.' });
  }

  (req as unknown as { growth: GrowthContext }).growth = {
    userId: data.user.id,
    businessId: row.business_id,
    role: row.role,
  };
  next();
}
