import type { NextFunction, Request, Response } from 'express';
import { hasPermission, type Permission } from './authorization';

interface TenantRequestContext {
  userId?: string;
  businessId?: string;
  role?: string;
}

function contextOf(req: Request): TenantRequestContext {
  return ((req as unknown as { context?: TenantRequestContext }).context ?? {});
}

/** Require an authenticated, active tenant membership with an explicit RBAC permission. */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = contextOf(req);
    if (!context.userId) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    if (!context.businessId) {
      return res.status(409).json({
        error: 'Select an active business workspace and try again.',
        code: 'BUSINESS_CONTEXT_REQUIRED',
      });
    }
    if (!hasPermission(context.role, permission)) {
      return res.status(403).json({
        error: 'Your role does not have permission to perform this action.',
        permission,
      });
    }
    return next();
  };
}

/** Reject client-supplied tenant ids that disagree with the verified membership context. */
export function rejectTenantSpoofing(req: Request, res: Response, next: NextFunction) {
  const context = contextOf(req);
  if (!context.businessId) return next();

  const claims = [
    req.params?.businessId,
    typeof req.query.businessId === 'string' ? req.query.businessId : undefined,
    typeof req.body?.businessId === 'string' ? req.body.businessId : undefined,
    typeof req.body?.organizationId === 'string' ? req.body.organizationId : undefined,
  ].filter((value): value is string => Boolean(value));

  if (claims.some((value) => value !== context.businessId)) {
    return res.status(403).json({ error: 'Requested organization does not match your active membership.' });
  }
  return next();
}
