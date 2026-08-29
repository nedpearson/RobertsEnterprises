import { describe, it, expect } from 'vitest';
import { 
  normalizeLegacyRole, 
  WorkspaceRole, 
  hasPermission, 
  canAccessWorkspace, 
  canAccessModule,
  validateScopeAccess,
  AuthorizationScope
} from '@/lib/auth/authorization';

describe('VowOS Security & Canonical RBAC Specification Tests', () => {
  describe('Role Normalization & Fail-Closed Behavior', () => {
    it('normalizes canonical roles correctly', () => {
      expect(normalizeLegacyRole('OWNER')).toBe(WorkspaceRole.OWNER);
      expect(normalizeLegacyRole('STORE_MANAGER')).toBe(WorkspaceRole.STORE_MANAGER);
      expect(normalizeLegacyRole('BRIDAL_CONSULTANT')).toBe(WorkspaceRole.BRIDAL_CONSULTANT);
      expect(normalizeLegacyRole('ALTERATIONS_SPECIALIST')).toBe(WorkspaceRole.ALTERATIONS_SPECIALIST);
    });

    it('normalizes legacy roles correctly', () => {
      expect(normalizeLegacyRole('ORG_SUPER_ADMIN')).toBe(WorkspaceRole.OWNER);
      expect(normalizeLegacyRole('ADMIN')).toBe(WorkspaceRole.STORE_MANAGER);
      expect(normalizeLegacyRole('ORG_ADMIN')).toBe(WorkspaceRole.STORE_MANAGER);
      expect(normalizeLegacyRole('MANAGER')).toBe(WorkspaceRole.STORE_MANAGER);
      expect(normalizeLegacyRole('STYLIST')).toBe(WorkspaceRole.BRIDAL_CONSULTANT);
      expect(normalizeLegacyRole('EMPLOYEE')).toBe(WorkspaceRole.BRIDAL_CONSULTANT);
      expect(normalizeLegacyRole('FRONT DESK')).toBe(WorkspaceRole.BRIDAL_CONSULTANT);
      expect(normalizeLegacyRole('SEAMSTRESS')).toBe(WorkspaceRole.ALTERATIONS_SPECIALIST);
    });

    it('fails closed on unknown or empty roles (Unknown role = deny)', () => {
      expect(normalizeLegacyRole('')).toBeNull();
      expect(normalizeLegacyRole(null)).toBeNull();
      expect(normalizeLegacyRole(undefined)).toBeNull();
      expect(normalizeLegacyRole('GUEST')).toBeNull();
      expect(normalizeLegacyRole('HACKER')).toBeNull();
      expect(normalizeLegacyRole('INVALID_ROLE')).toBeNull();

      expect(hasPermission('UNKNOWN', 'appointments.read')).toBe(false);
      expect(canAccessWorkspace('UNKNOWN', 'today')).toBe(false);
      expect(canAccessModule('UNKNOWN', 'growth.core')).toBe(false);
    });
  });

  describe('Explicit Permission Matrix', () => {
    it('grants OWNER all tenant permissions', () => {
      expect(hasPermission(WorkspaceRole.OWNER, 'appointments.manage')).toBe(true);
      expect(hasPermission(WorkspaceRole.OWNER, 'growth.manage')).toBe(true);
      expect(hasPermission(WorkspaceRole.OWNER, 'billing.manage')).toBe(true);
      expect(hasPermission(WorkspaceRole.OWNER, 'integrations.manage')).toBe(true);
    });

    it('prevents STORE_MANAGER from billing, integrations, and platform ownership changes', () => {
      expect(hasPermission(WorkspaceRole.STORE_MANAGER, 'appointments.manage')).toBe(true);
      expect(hasPermission(WorkspaceRole.STORE_MANAGER, 'customers.manage')).toBe(true);
      expect(hasPermission(WorkspaceRole.STORE_MANAGER, 'billing.manage')).toBe(false);
      expect(hasPermission(WorkspaceRole.STORE_MANAGER, 'integrations.manage')).toBe(false);
      expect(hasPermission(WorkspaceRole.STORE_MANAGER, 'growth.manage')).toBe(false);
    });

    it('restricts BRIDAL_CONSULTANT to operational customer/sales/appointments', () => {
      expect(hasPermission(WorkspaceRole.BRIDAL_CONSULTANT, 'appointments.read')).toBe(true);
      expect(hasPermission(WorkspaceRole.BRIDAL_CONSULTANT, 'appointments.manage')).toBe(true);
      expect(hasPermission(WorkspaceRole.BRIDAL_CONSULTANT, 'customers.read')).toBe(true);
      expect(hasPermission(WorkspaceRole.BRIDAL_CONSULTANT, 'growth.manage')).toBe(false);
      expect(hasPermission(WorkspaceRole.BRIDAL_CONSULTANT, 'team.manage')).toBe(false);
      expect(hasPermission(WorkspaceRole.BRIDAL_CONSULTANT, 'billing.manage')).toBe(false);
    });

    it('restricts ALTERATIONS_SPECIALIST to alterations and relevant fittings', () => {
      expect(hasPermission(WorkspaceRole.ALTERATIONS_SPECIALIST, 'alterations.read')).toBe(true);
      expect(hasPermission(WorkspaceRole.ALTERATIONS_SPECIALIST, 'alterations.manage')).toBe(true);
      expect(hasPermission(WorkspaceRole.ALTERATIONS_SPECIALIST, 'appointments.read')).toBe(true);
      expect(hasPermission(WorkspaceRole.ALTERATIONS_SPECIALIST, 'growth.read')).toBe(false);
      expect(hasPermission(WorkspaceRole.ALTERATIONS_SPECIALIST, 'team.manage')).toBe(false);
      expect(hasPermission(WorkspaceRole.ALTERATIONS_SPECIALIST, 'billing.manage')).toBe(false);
    });
  });

  describe('Nine Core Workspaces Access Matrix', () => {
    it('allows OWNER and STORE_MANAGER to access Growth, Team, and Settings', () => {
      expect(canAccessWorkspace(WorkspaceRole.OWNER, 'growth')).toBe(true);
      expect(canAccessWorkspace(WorkspaceRole.STORE_MANAGER, 'growth')).toBe(true);

      expect(canAccessWorkspace(WorkspaceRole.OWNER, 'team')).toBe(true);
      expect(canAccessWorkspace(WorkspaceRole.STORE_MANAGER, 'team')).toBe(true);

      expect(canAccessWorkspace(WorkspaceRole.OWNER, 'settings')).toBe(true);
      expect(canAccessWorkspace(WorkspaceRole.STORE_MANAGER, 'settings')).toBe(true);
    });

    it('denies BRIDAL_CONSULTANT access to Growth, Team, and Settings', () => {
      expect(canAccessWorkspace(WorkspaceRole.BRIDAL_CONSULTANT, 'growth')).toBe(false);
      expect(canAccessWorkspace(WorkspaceRole.BRIDAL_CONSULTANT, 'team')).toBe(false);
      expect(canAccessWorkspace(WorkspaceRole.BRIDAL_CONSULTANT, 'settings')).toBe(false);

      expect(canAccessWorkspace(WorkspaceRole.BRIDAL_CONSULTANT, 'today')).toBe(true);
      expect(canAccessWorkspace(WorkspaceRole.BRIDAL_CONSULTANT, 'appointments')).toBe(true);
      expect(canAccessWorkspace(WorkspaceRole.BRIDAL_CONSULTANT, 'customers')).toBe(true);
      expect(canAccessWorkspace(WorkspaceRole.BRIDAL_CONSULTANT, 'sales')).toBe(true);
      expect(canAccessWorkspace(WorkspaceRole.BRIDAL_CONSULTANT, 'inventory')).toBe(true);
    });

    it('denies ALTERATIONS_SPECIALIST access to Growth, Team, and Settings', () => {
      expect(canAccessWorkspace(WorkspaceRole.ALTERATIONS_SPECIALIST, 'growth')).toBe(false);
      expect(canAccessWorkspace(WorkspaceRole.ALTERATIONS_SPECIALIST, 'team')).toBe(false);
      expect(canAccessWorkspace(WorkspaceRole.ALTERATIONS_SPECIALIST, 'settings')).toBe(false);

      expect(canAccessWorkspace(WorkspaceRole.ALTERATIONS_SPECIALIST, 'today')).toBe(true);
      expect(canAccessWorkspace(WorkspaceRole.ALTERATIONS_SPECIALIST, 'appointments')).toBe(true);
    });
  });

  describe('Strict Multi-Tenant & Multi-Brand Isolation Scoping', () => {
    const callerScope: AuthorizationScope = {
      organizationId: 'org-100',
      brandId: 'brand-ido',
      locationIds: ['loc-br', 'loc-cov']
    };

    it('allows requests matching caller scope', () => {
      expect(validateScopeAccess(callerScope, { organizationId: 'org-100', brandId: 'brand-ido', locationIds: ['loc-br'] })).toBe(true);
    });

    it('rejects cross-organization spoofing attempts (Organization A -> Organization B)', () => {
      expect(validateScopeAccess(callerScope, { organizationId: 'org-200' })).toBe(false);
    });

    it('rejects cross-brand spoofing attempts (Brand A -> Brand B)', () => {
      expect(validateScopeAccess(callerScope, { organizationId: 'org-100', brandId: 'brand-proper' })).toBe(false);
    });

    it('rejects unauthorized location requests', () => {
      expect(validateScopeAccess(callerScope, { organizationId: 'org-100', locationIds: ['loc-unauthorized'] })).toBe(false);
    });

    it('fails closed when caller scope is incomplete or unauthenticated', () => {
      expect(validateScopeAccess({ organizationId: '', brandId: '', locationIds: [] }, { organizationId: 'org-100' })).toBe(false);
    });
  });
});
