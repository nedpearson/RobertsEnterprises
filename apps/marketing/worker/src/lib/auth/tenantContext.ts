import type { NextFunction, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasPermission, type Permission } from './authorization';

export interface TenantContext {
  db: SupabaseClient;
  dataPlane: 'production' | 'demo';
  userId: string;
  businessId: string;
  role: string;
}

interface ContextCarrier {
  context?: Partial<TenantContext> & { db?: SupabaseClient; dataPlane?: 'production' | 'demo' };
}

export function tenantContextOf(req: Request): TenantContext {
  const context = (req as Request & ContextCarrier).context;
  if (!context?.db || !context.userId || !context.businessId || !context.role) {
    throw new Error('Tenant context middleware did not establish an authenticated business context.');
  }
  return context as TenantContext;
}

export function requireTenantMember(req: Request, res: Response, next: NextFunction) {
  const context = (req as Request & ContextCarrier).context;
  if (!context?.userId) return res.status(401).json({ error: 'Sign in required.' });
  if (!context.businessId || !context.role) {
    const selected = req.headers['x-business-id'];
    return res.status(typeof selected === 'string' && selected.trim() ? 403 : 409).json({
      error: typeof selected === 'string' && selected.trim()
        ? 'You do not have an active authorized membership for the selected business.'
        : 'Select an active business workspace and try again.',
      code: 'BUSINESS_CONTEXT_REQUIRED',
    });
  }
  next();
}

function permissionGuard(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = (req as Request & ContextCarrier).context;
    if (!context?.userId) return res.status(401).json({ error: 'Sign in required.' });
    if (!context.businessId || !context.role) {
      return res.status(409).json({ error: 'Select an active business workspace and try again.', code: 'BUSINESS_CONTEXT_REQUIRED' });
    }
    if (!permissions.some((permission) => hasPermission(context.role, permission))) {
      return res.status(403).json({ error: `One of these permissions is required: ${permissions.join(', ')}` });
    }
    next();
  };
}

export function requirePermission(permission: Permission) {
  return permissionGuard([permission]);
}

export function requireAnyPermission(...permissions: Permission[]) {
  return permissionGuard(permissions);
}
