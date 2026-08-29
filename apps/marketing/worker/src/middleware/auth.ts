import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { WorkspaceRole, normalizeLegacyRole, hasPermission, Permission, validateScopeAccess } from '../../../../src/lib/auth/authorization';

export interface RequestAuthorizationContext {
  userId: string;
  role: WorkspaceRole;
  organizationId: string; // maps to business_id
  brandId?: string;
  locationIds?: string[];
}

export interface AuthenticatedRequest extends Request {
  context?: {
    db: SupabaseClient;
    dataPlane: 'production' | 'demo';
    userId?: string;
    businessId?: string;
    role?: string;
  };
  authContext?: RequestAuthorizationContext;
}

/**
 * Server-Side Fail-Closed Authorization Middleware for Production Worker.
 *
 * 1. Extracts Bearer token & verifies identity through Supabase Auth.
 * 2. Loads active memberships & resolves organization ID.
 * 3. Normalizes role using canonical WorkspaceRole enum.
 * 4. Rejects unknown or unassigned roles with 403 (Fail Closed).
 * 5. Rejects mismatched body/query/path tenant identifiers.
 * 6. Checks explicit permission if specified.
 */
export function requireAuthorization(requiredPermission?: Permission) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const db = req.context?.db;
      if (!db) {
        return res.status(500).json({ error: 'Database context unavailable.' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Bearer token required.' });
      }

      const token = authHeader.slice('Bearer '.length).trim();
      const { data: { user }, error: authError } = await db.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
      }

      // Extract requested organization/business ID from header, query, or path params
      const requestedHeader = req.headers['x-business-id'] || req.headers['x-organization-id'];
      const requestedOrgId = (
        typeof requestedHeader === 'string' && requestedHeader.trim() ? requestedHeader.trim() :
        typeof req.query.business_id === 'string' && req.query.business_id.trim() ? req.query.business_id.trim() :
        typeof req.query.organization_id === 'string' && req.query.organization_id.trim() ? req.query.organization_id.trim() :
        req.params.organizationId || req.params.businessId || null
      );

      // Verify path or body mismatch if explicitly supplied
      if (req.body && typeof req.body === 'object') {
        const bodyOrgId = req.body.business_id || req.body.organization_id || req.body.organizationId;
        if (bodyOrgId && requestedOrgId && bodyOrgId !== requestedOrgId) {
          return res.status(403).json({ error: 'Forbidden: Tenant identifier mismatch between body and request headers.' });
        }
      }

      // Load active user memberships
      let membershipQuery = db
        .from('business_memberships')
        .select('business_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');

      if (requestedOrgId) {
        membershipQuery = membershipQuery.eq('business_id', requestedOrgId);
      }

      const { data: memberships, error: membershipError } = await membershipQuery;

      if (membershipError || !memberships || memberships.length === 0) {
        return res.status(403).json({ error: 'Forbidden: No active membership in the requested organization.' });
      }

      // Target membership
      const targetMembership = memberships[0];
      const normalizedRole = normalizeLegacyRole(targetMembership.role);

      // FAIL CLOSED: Unknown or empty role MUST be rejected
      if (!normalizedRole) {
        return res.status(403).json({ error: 'Forbidden: Unknown or unassigned role. Access denied.' });
      }

      // Permission check if specified
      if (requiredPermission && !hasPermission(normalizedRole, requiredPermission)) {
        return res.status(403).json({ error: `Forbidden: Permission '${requiredPermission}' required.` });
      }

      // Attach immutable authorization context
      req.authContext = {
        userId: user.id,
        role: normalizedRole,
        organizationId: targetMembership.business_id,
      };

      if (req.context) {
        req.context.userId = user.id;
        req.context.businessId = targetMembership.business_id;
        req.context.role = normalizedRole;
      }

      next();
    } catch (err: any) {
      console.error('[auth-middleware] Authorization error:', err);
      return res.status(500).json({ error: 'Internal authorization error.' });
    }
  };
}
