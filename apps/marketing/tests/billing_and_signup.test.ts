import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAccess, EntitlementContext } from '../src/lib/entitlements/engine';
import { PlatformRole, OrganizationRole } from '../src/lib/auth/roles';

describe('VowOS Production Gate: Billing & Entitlements', () => {
  const baseContext: EntitlementContext = {
    organizationId: 'test-org-123',
    organizationPlan: 'starter',
    userOrganizationRole: OrganizationRole.ORG_SUPER_ADMIN,
    userStatus: 'ACTIVE',
    subscriptionStatus: 'ACTIVE'
  };

  describe('Subscription Status Enforcement', () => {
    it('should block all non-free features when subscription is PAST_DUE', () => {
      const ctx: EntitlementContext = {
        ...baseContext,
        subscriptionStatus: 'PAST_DUE',
        organizationPlan: 'elite', // Even if Elite, if they are past due it blocks
      };

      // 'communications' requires 'pro' or higher. But since PAST_DUE, it should be false.
      const access = resolveAccess('communications', ctx);
      expect(access).toBe(false);
    });

    it('should block all non-free features when subscription is CANCELED', () => {
      const ctx: EntitlementContext = {
        ...baseContext,
        subscriptionStatus: 'CANCELED',
        organizationPlan: 'pro',
      };
      
      const access = resolveAccess('communications', ctx);
      expect(access).toBe(false);
    });

    it('should allow access when subscription is TRIALING', () => {
      const ctx: EntitlementContext = {
        ...baseContext,
        subscriptionStatus: 'TRIALING',
        organizationPlan: 'elite',
      };
      
      const access = resolveAccess('communications', ctx);
      expect(access).toBe(true);
    });

    it('should allow access when subscription is COMPED (Roberts Enterprises)', () => {
      const ctx: EntitlementContext = {
        ...baseContext,
        subscriptionStatus: 'COMPED',
        organizationPlan: 'comped',
      };
      
      const access = resolveAccess('communications', ctx);
      expect(access).toBe(true);
    });
  });

  describe('Role Assignments', () => {
    it('should grant ORG_SUPER_ADMIN full access to platform features on their tier', () => {
      const ctx: EntitlementContext = {
        ...baseContext,
        organizationPlan: 'elite',
      };
      
      // Enterprise tier feature
      const access = resolveAccess('employees', ctx);
      expect(access).toBe(true);
    });
  });

  describe('Feature Overrides', () => {
    it('should allow FORCED_ON overrides to bypass canceled subscriptions', () => {
      const ctx: EntitlementContext = {
        ...baseContext,
        subscriptionStatus: 'CANCELED',
        organizationPlan: 'starter',
        organizationFeatureOverrides: {
          'communications': 'FORCED_ON'
        }
      };
      
      const access = resolveAccess('communications', ctx);
      expect(access).toBe(true); // Explicit Platform Admin override wins
    });
  });
});
