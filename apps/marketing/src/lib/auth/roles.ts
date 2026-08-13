export enum PlatformRole {
  PLATFORM_OWNER = 'PLATFORM_OWNER',
  SUPER_ADMIN = 'SUPER_ADMIN', // Internal super admin (VowOS staff)
  USER = 'USER'
}

export enum OrganizationRole {
  ORG_SUPER_ADMIN = 'ORG_SUPER_ADMIN', // Often mapped from 'OWNER' in DB
  ORG_ADMIN = 'ORG_ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  OTHER_AUTHORIZED_ROLE = 'OTHER_AUTHORIZED_ROLE'
}

export const STAFF_ROLES: OrganizationRole[] = [
  OrganizationRole.ORG_SUPER_ADMIN,
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.MANAGER,
  OrganizationRole.EMPLOYEE
];

// In the database, the business_memberships table uses text for role (e.g., 'OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE').
// We will normalize those to our strict enums here.
export function normalizeOrganizationRole(dbRole: string): OrganizationRole {
  switch (dbRole?.toUpperCase()) {
    case 'OWNER':
    case 'ORG_SUPER_ADMIN':
      return OrganizationRole.ORG_SUPER_ADMIN;
    case 'ADMIN':
    case 'ORG_ADMIN':
      return OrganizationRole.ORG_ADMIN;
    case 'MANAGER':
      return OrganizationRole.MANAGER;
    case 'EMPLOYEE':
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

export const ROLE_BADGE_CLASSES: Record<OrganizationRole, string> = {
  [OrganizationRole.ORG_SUPER_ADMIN]: 'bg-brand-primary/20 text-brand-primary ring-1 ring-inset ring-focus-ring/30',
  [OrganizationRole.ORG_ADMIN]: 'bg-status-warning/20 text-status-warning ring-1 ring-inset ring-status-warning/30',
  [OrganizationRole.MANAGER]: 'bg-violet-500/20 text-violet-500 ring-1 ring-inset ring-violet-500/30',
  [OrganizationRole.EMPLOYEE]: 'bg-sky-500/20 text-sky-600 ring-1 ring-inset ring-sky-500/30',
  [OrganizationRole.OTHER_AUTHORIZED_ROLE]: 'bg-slate-500/20 text-slate-600 ring-1 ring-inset ring-slate-500/30',
};
