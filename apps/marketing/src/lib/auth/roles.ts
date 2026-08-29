import { WorkspaceRole, normalizeLegacyRole } from './authorization';

export enum PlatformRole {
  PLATFORM_OWNER = 'PLATFORM_OWNER',
  SUPER_ADMIN = 'SUPER_ADMIN', // Internal super admin (VowOS staff)
  USER = 'USER'
}

export enum OrganizationRole {
  ORG_SUPER_ADMIN = 'ORG_SUPER_ADMIN', // Maps to OWNER
  ORG_ADMIN = 'ORG_ADMIN',             // Maps to STORE_MANAGER
  MANAGER = 'MANAGER',                 // Maps to STORE_MANAGER
  EMPLOYEE = 'EMPLOYEE',               // Maps to BRIDAL_CONSULTANT
  OTHER_AUTHORIZED_ROLE = 'OTHER_AUTHORIZED_ROLE'
}

export const STAFF_ROLES: OrganizationRole[] = [
  OrganizationRole.ORG_SUPER_ADMIN,
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.MANAGER,
  OrganizationRole.EMPLOYEE
];

export const ROLE_BADGE_CLASSES: Record<string, string> = {
  OWNER: 'bg-amber-100 text-amber-800 border-amber-300',
  STORE_MANAGER: 'bg-blue-100 text-blue-800 border-blue-300',
  BRIDAL_CONSULTANT: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  ALTERATIONS_SPECIALIST: 'bg-purple-100 text-purple-800 border-purple-300',
  Owner: 'bg-amber-100 text-amber-800 border-amber-300',
  Manager: 'bg-blue-100 text-blue-800 border-blue-300',
  Stylist: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Front Desk': 'bg-stone-100 text-stone-800 border-stone-300'
};

/**
 * Normalizes any database role into canonical OrganizationRole.
 * Fail closed: unknown role = null/OTHER_AUTHORIZED_ROLE
 */
export function normalizeOrganizationRole(dbRole: string | null | undefined): OrganizationRole {
  const canonical = normalizeLegacyRole(dbRole);
  if (!canonical) return OrganizationRole.OTHER_AUTHORIZED_ROLE;

  switch (canonical) {
    case WorkspaceRole.OWNER:
      return OrganizationRole.ORG_SUPER_ADMIN;
    case WorkspaceRole.STORE_MANAGER:
      return OrganizationRole.ORG_ADMIN;
    case WorkspaceRole.BRIDAL_CONSULTANT:
      return OrganizationRole.EMPLOYEE;
    case WorkspaceRole.ALTERATIONS_SPECIALIST:
      return OrganizationRole.EMPLOYEE;
    default:
      return OrganizationRole.OTHER_AUTHORIZED_ROLE;
  }
}

export const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  [OrganizationRole.ORG_SUPER_ADMIN]: 100,
  [OrganizationRole.ORG_ADMIN]: 80,
  [OrganizationRole.MANAGER]: 50,
  [OrganizationRole.EMPLOYEE]: 20,
  [OrganizationRole.OTHER_AUTHORIZED_ROLE]: 10
};

export function hasMinimumRole(userRole: OrganizationRole, minimumRequiredRole: OrganizationRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRequiredRole] || 0;
  return userLevel >= requiredLevel;
}

export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  [OrganizationRole.ORG_SUPER_ADMIN]: 'Full access — financial ledgers, reports, and staff role management.',
  [OrganizationRole.ORG_ADMIN]: 'Runs the stores — everything except managing super admin accounts.',
  [OrganizationRole.MANAGER]: 'Managerial oversight of boutique staff and appointments.',
  [OrganizationRole.EMPLOYEE]: 'Brides, leads, appointments, gown inventory, and transfers.',
  [OrganizationRole.OTHER_AUTHORIZED_ROLE]: 'Limited front-of-house access.',
};
