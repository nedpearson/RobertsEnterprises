import { describe, expect, it } from 'vitest';
import { resolveAccess } from '@/lib/entitlements/engine';
import { getPlan, getPlanTier, isLegacyPlan } from '@/lib/registry/plans';
import { OrganizationRole, PlatformRole } from '@/lib/auth/roles';

const ACTIVE_ORG_ID = '00000000-0000-0000-0000-000000000001';

describe('VowOS entitlement regression coverage', () => {
  it('uses the canonical plan registry for tier resolution', () => {
    expect(getPlanTier('essentials')).toBe('CORE');
    expect(getPlanTier('growth')).toBe('STANDARD');
    expect(getPlanTier('pro')).toBe('ADVANCED');
    expect(getPlanTier('enterprise')).toBe('ENTERPRISE');
    expect(getPlanTier('comped')).toBe('ENTERPRISE');
  });

  it('keeps legacy plan IDs compatible without making them canonical defaults', () => {
    expect(getPlanTier('starter')).toBe('STANDARD');
    expect(getPlanTier('elite')).toBe('ENTERPRISE');
    expect(isLegacyPlan('starter')).toBe(true);
    expect(isLegacyPlan('elite')).toBe(true);
    expect(getPlan('not-a-plan').id).toBe('essentials');
  });

  it('blocks tenant features for past-due subscriptions', () => {
    expect(resolveAccess('dashboard', {
      platformUserRole: PlatformRole.USER,
      organizationId: ACTIVE_ORG_ID,
      organizationPlan: 'enterprise',
      subscriptionStatus: 'PAST_DUE',
      userStatus: 'ACTIVE',
      userOrganizationRole: OrganizationRole.EMPLOYEE,
    })).toBe(false);
  });

  it('blocks tenant features for canceled subscriptions', () => {
    expect(resolveAccess('dashboard', {
      platformUserRole: PlatformRole.USER,
      organizationId: ACTIVE_ORG_ID,
      organizationPlan: 'enterprise',
      subscriptionStatus: 'CANCELED',
      userStatus: 'ACTIVE',
      userOrganizationRole: OrganizationRole.EMPLOYEE,
    })).toBe(false);
  });

  it('allows an explicit platform-controlled feature override to bypass billing status for an active tenant', () => {
    expect(resolveAccess('dashboard', {
      platformUserRole: PlatformRole.USER,
      organizationId: ACTIVE_ORG_ID,
      organizationPlan: 'essentials',
      subscriptionStatus: 'PAST_DUE',
      userStatus: 'ACTIVE',
      userOrganizationRole: OrganizationRole.EMPLOYEE,
      organizationFeatureOverrides: { dashboard: 'FORCED_ON' },
    })).toBe(true);
  });

  it('allows the documented all-features override for an active Enterprise organization', () => {
    expect(resolveAccess('dashboard', {
      platformUserRole: PlatformRole.USER,
      organizationId: ACTIVE_ORG_ID,
      organizationPlan: 'enterprise',
      subscriptionStatus: 'ACTIVE',
      userStatus: 'ACTIVE',
      userOrganizationRole: OrganizationRole.ORG_SUPER_ADMIN,
      organizationFeatureOverrides: { ALL_CURRENT_AND_FUTURE_FEATURES: 'FORCED_ON' },
    })).toBe(true);
  });

  it('blocks suspended users independently of subscription state', () => {
    expect(resolveAccess('dashboard', {
      platformUserRole: PlatformRole.USER,
      organizationId: ACTIVE_ORG_ID,
      organizationPlan: 'enterprise',
      subscriptionStatus: 'ACTIVE',
      userStatus: 'SUSPENDED',
      userOrganizationRole: OrganizationRole.EMPLOYEE,
    })).toBe(false);
  });
});
