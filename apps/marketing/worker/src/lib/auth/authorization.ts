/**
 * Canonical Authorization & RBAC Model for VowOS Platform
 * 
 * Strict fail-closed multi-tenant authorization engine enforcing
 * canonical roles, permissions, scopes, and workspace access control.
 */

export interface AuthorizationScope {
  organizationId: string; // maps to business_id where applicable
  brandId: string;
  locationIds: string[];
}

export enum WorkspaceRole {
  OWNER = 'OWNER',
  STORE_MANAGER = 'STORE_MANAGER',
  BRIDAL_CONSULTANT = 'BRIDAL_CONSULTANT',
  ALTERATIONS_SPECIALIST = 'ALTERATIONS_SPECIALIST',
}

/**
 * Normalizes any role string into a canonical WorkspaceRole.
 * UNKNOWN OR EMPTY ROLES MUST NOT DEFAULT TO ANY AUTHENTICATED ROLE.
 * Returns null if the role is unknown, empty, or unassigned -> Fail Closed.
 */
export function normalizeLegacyRole(role: string | null | undefined): WorkspaceRole | null {
  if (!role || typeof role !== 'string') return null;
  const normalized = role.trim().toUpperCase().replace(/[\s_-]+/g, '_');
  
  switch (normalized) {
    case 'OWNER':
    case 'ORG_SUPER_ADMIN':
      return WorkspaceRole.OWNER;

    case 'STORE_MANAGER':
    case 'ADMIN':
    case 'ORG_ADMIN':
    case 'MANAGER':
      return WorkspaceRole.STORE_MANAGER;

    case 'BRIDAL_CONSULTANT':
    case 'STYLIST':
    case 'EMPLOYEE':
    case 'FRONT_DESK':
      return WorkspaceRole.BRIDAL_CONSULTANT;

    case 'ALTERATIONS_SPECIALIST':
    case 'SEAMSTRESS':
      return WorkspaceRole.ALTERATIONS_SPECIALIST;

    default:
      return null; // Fail closed: Unknown role = deny
  }
}

export type Permission =
  | 'appointments.read'
  | 'appointments.manage'
  | 'customers.read'
  | 'customers.manage'
  | 'sales.read'
  | 'sales.manage'
  | 'inventory.read'
  | 'inventory.manage'
  | 'alterations.read'
  | 'alterations.manage'
  | 'team.read'
  | 'team.manage'
  | 'growth.read'
  | 'growth.manage'
  | 'reports.read'
  | 'settings.read'
  | 'settings.manage'
  | 'billing.manage'
  | 'integrations.manage';

const ROLE_PERMISSIONS: Record<WorkspaceRole, Set<Permission>> = {
  [WorkspaceRole.OWNER]: new Set<Permission>([
    'appointments.read',
    'appointments.manage',
    'customers.read',
    'customers.manage',
    'sales.read',
    'sales.manage',
    'inventory.read',
    'inventory.manage',
    'alterations.read',
    'alterations.manage',
    'team.read',
    'team.manage',
    'growth.read',
    'growth.manage',
    'reports.read',
    'settings.read',
    'settings.manage',
    'billing.manage',
    'integrations.manage',
  ]),

  [WorkspaceRole.STORE_MANAGER]: new Set<Permission>([
    'appointments.read',
    'appointments.manage',
    'customers.read',
    'customers.manage',
    'sales.read',
    'sales.manage',
    'inventory.read',
    'inventory.manage',
    'alterations.read',
    'alterations.manage',
    'team.read',
    'team.manage',
    'growth.read',
    'reports.read',
    'settings.read',
    'settings.manage',
    // STORE_MANAGER explicitly denied: billing.manage, integrations.manage, growth.manage
  ]),

  [WorkspaceRole.BRIDAL_CONSULTANT]: new Set<Permission>([
    'appointments.read',
    'appointments.manage',
    'customers.read',
    'customers.manage',
    'sales.read',
    'inventory.read',
    'reports.read',
  ]),

  [WorkspaceRole.ALTERATIONS_SPECIALIST]: new Set<Permission>([
    'appointments.read',
    'customers.read',
    'sales.read',
    'inventory.read',
    'alterations.read',
    'alterations.manage',
    'reports.read',
  ]),
};

export type CoreWorkspaceId =
  | 'today'
  | 'appointments'
  | 'customers'
  | 'sales'
  | 'inventory'
  | 'team'
  | 'growth'
  | 'reports'
  | 'settings';

export const CORE_WORKSPACES: CoreWorkspaceId[] = [
  'today',
  'appointments',
  'customers',
  'sales',
  'inventory',
  'team',
  'growth',
  'reports',
  'settings',
];

const WORKSPACE_PERMISSIONS: Record<CoreWorkspaceId, Permission> = {
  today: 'appointments.read',
  appointments: 'appointments.read',
  customers: 'customers.read',
  sales: 'sales.read',
  inventory: 'inventory.read',
  team: 'team.read',
  growth: 'growth.read',
  reports: 'reports.read',
  settings: 'settings.read',
};

/**
 * Checks if a given role possesses an explicit permission.
 * Fails closed if role is invalid/null.
 */
export function hasPermission(roleInput: WorkspaceRole | string | null | undefined, permission: Permission): boolean {
  const role = typeof roleInput === 'string' ? normalizeLegacyRole(roleInput) : roleInput;
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(permission) : false;
}

/**
 * Checks if a given role can access one of the 9 Core Workspaces.
 * Fails closed if role is invalid/null.
 */
export function canAccessWorkspace(roleInput: WorkspaceRole | string | null | undefined, workspace: string): boolean {
  const role = typeof roleInput === 'string' ? normalizeLegacyRole(roleInput) : roleInput;
  if (!role) return false;

  const normalizedWorkspace = workspace.toLowerCase().trim() as CoreWorkspaceId;
  const requiredPermission = WORKSPACE_PERMISSIONS[normalizedWorkspace];
  if (!requiredPermission) {
    // Non-core or custom route -> fallback to permission check
    return false;
  }
  return hasPermission(role, requiredPermission);
}

export const canAccessModule = canAccessWorkspace;

/**
 * Validates scope isolation between requested action and active context.
 * Strict fail-closed tenant boundary check.
 */
export function validateScopeAccess(
  userScope: AuthorizationScope,
  targetScope: Partial<AuthorizationScope>
): boolean {
  if (!userScope.organizationId || !targetScope.organizationId) return false;
  if (userScope.organizationId !== targetScope.organizationId) return false;

  if (targetScope.brandId && userScope.brandId && userScope.brandId !== 'ALL' && userScope.brandId !== targetScope.brandId) {
    return false;
  }

  if (targetScope.locationIds && targetScope.locationIds.length > 0) {
    const hasLocationMatch = targetScope.locationIds.some((locId) =>
      userScope.locationIds.includes(locId) || userScope.locationIds.includes('ALL')
    );
    if (!hasLocationMatch) return false;
  }

  return true;
}
