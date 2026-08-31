import { describe, expect, it } from 'vitest';
import { resolveAccess } from '@/lib/entitlements/engine';
import { OrganizationRole, PlatformRole } from '@/lib/auth/roles';

const activeEmployee = {
  platformUserRole: PlatformRole.USER,
  organizationId: 'org-1',
  organizationPlan: 'essentials',
  userOrganizationRole: OrganizationRole.EMPLOYEE,
  userStatus: 'ACTIVE' as const,
  subscriptionStatus: 'ACTIVE' as const,
};

describe('entitlement engine fail-closed behavior', () => {
  it('allows a normal active tenant user to use an entitled core feature', () => {
    expect(resolveAccess('dashboard', activeEmployee)).toBe(true);
  });

  it('denies PENDING_VERIFICATION users even when their plan would otherwise allow the feature', () => {
    expect(resolveAccess('dashboard', {
      ...activeEmployee,
      userStatus: 'PENDING_VERIFICATION',
    })).toBe(false);
  });

  it('denies tenant features when no organization was unambiguously resolved', () => {
    const { organizationId: _organizationId, ...withoutOrganization } = activeEmployee;
    expect(resolveAccess('dashboard', withoutOrganization)).toBe(false);
  });

  it('denies the unknown-role sentinel instead of treating it as a low-level employee', () => {
    expect(resolveAccess('dashboard', {
      ...activeEmployee,
      userOrganizationRole: OrganizationRole.OTHER_AUTHORIZED_ROLE,
    })).toBe(false);
  });

  it('denies workspace module checks for pending or unscoped users', () => {
    expect(resolveAccess('workspace:today', {
      ...activeEmployee,
      userStatus: 'PENDING_VERIFICATION',
    })).toBe(false);

    const { organizationId: _organizationId, ...withoutOrganization } = activeEmployee;
    expect(resolveAccess('workspace:today', withoutOrganization)).toBe(false);
  });

  it('keeps platform administration tied only to verified platform role', () => {
    expect(resolveAccess('platform_admin', {
      platformUserRole: PlatformRole.PLATFORM_OWNER,
      userStatus: 'PENDING_VERIFICATION',
    })).toBe(true);
    expect(resolveAccess('platform_admin', {
      platformUserRole: PlatformRole.USER,
      organizationId: 'org-1',
      userOrganizationRole: OrganizationRole.ORG_SUPER_ADMIN,
      userStatus: 'ACTIVE',
      subscriptionStatus: 'ACTIVE',
      organizationPlan: 'enterprise',
    })).toBe(false);
  });
});
