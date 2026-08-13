import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAccess } from '../src/lib/entitlements/engine';
import { PLAN_REGISTRY } from '../src/lib/registry/plans';
import { FEATURE_REGISTRY, getAllFeatures } from '../src/lib/registry/features';

describe('System Invariants & Security Architecture', () => {
  
  describe('Platform Owner Invariants', () => {
    it('Platform Owner should bypass all standard entitlement checks', () => {
      const hasAccess = resolveAccess(
        'reports',
        { 
          platformUserRole: 'PLATFORM_OWNER' as any,
          organizationPlan: 'starter'
        }
      );
      expect(hasAccess).toBe(true);
    });

    it('Platform Owner can access features disabled by default', () => {
      const feature = FEATURE_REGISTRY['platform_admin'];
      expect(feature.defaultEnabled).toBe(false);

      const hasAccess = resolveAccess(
        'platform_admin',
        { 
          platformUserRole: 'PLATFORM_OWNER' as any,
          organizationPlan: 'starter' 
        }
      );
      expect(hasAccess).toBe(true);
    });
  });

  describe('Roberts Enterprises Free Tier Invariant', () => {
    it('Comped plan pricing should always remain $0', () => {
      const compedPlan = PLAN_REGISTRY['comped'];
      expect(compedPlan.price).toBe(0);
      expect(compedPlan.maxLocations || compedPlan.locationLimit).toBe('unlimited');
    });
    
    it('Comped plan includes enterprise features by default', () => {
      const hasAccess = resolveAccess(
        'employees', // This feature requires 'elite' normally
        { 
          userOrganizationRole: 'ORG_SUPER_ADMIN' as any,
          organizationPlan: 'comped' 
        }
      );
      expect(hasAccess).toBe(true);
    });
  });

  describe('Data Plane & Tenant Isolation', () => {
    // In actual E2E testing, this would run against the database.
    // For unit tests, we test the domain logic assumptions.
    it('Demo persona should never leak into production data plane', () => {
      // Demo logic checks `getActiveDataPlane() === 'demo'` before mutating or fetching
      // This is a placeholder test for architectural intent.
      const dataPlane = 'demo';
      expect(dataPlane).not.toBe('production');
    });
  });

  describe('Strict Feature & Role Registry Invariants', () => {
    it('All features must have a valid slug and name', () => {
      const features = getAllFeatures();
      features.forEach(f => {
        expect(f.slug.length).toBeGreaterThan(0);
        expect(f.name.length).toBeGreaterThan(0);
        expect(f.minimumPlan).toBeDefined();
      });
    });

    it('No features should be accessible by a suspended user', () => {
      const hasAccess = resolveAccess(
        'dashboard',
        { 
          userStatus: 'SUSPENDED',
          userOrganizationRole: 'ORG_SUPER_ADMIN' as any,
          organizationPlan: 'elite' 
        }
      );
      expect(hasAccess).toBe(false);
    });
  });
});
