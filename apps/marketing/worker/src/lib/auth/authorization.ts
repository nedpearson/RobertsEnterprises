/**
 * Canonical Authorization & RBAC Model for VowOS Platform.
 *
 * Strict fail-closed multi-tenant authorization engine enforcing canonical
 * roles, permissions, scopes, and workspace access control.
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

/** Unknown/empty roles are never upgraded to an authenticated role. */
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
      return null;
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

const ROLE_PERMISSIONS: Record<WorkspaceRole, ReadonlySet<Permission>> = {
  [WorkspaceRole.OWNER]: new Set<Permission>([
    'appointments.read', 'appointments.manage',
    'customers.read', 'customers.manage',
    'sales.read', 'sales.manage',
    'inventory.read', 'inventory.manage',
    'alterations.read', 'alterations.manage',
    'team.read', 'team.manage',
    'growth.read', 'growth.manage',
    'reports.read',
    'settings.read', 'settings.manage',
    'billing.manage', 'integrations.manage',
  ]),
  [WorkspaceRole.STORE_MANAGER]: new Set<Permission>([
    'appointments.read', 'appointments.manage',
    'customers.read', 'customers.manage',
    'sales.read', 'sales.manage',
    'inventory.read', 'inventory.manage',
    'alterations.read', 'alterations.manage',
    'team.read', 'team.manage',
    'growth.read',
    'reports.read',
    'settings.read', 'settings.manage',
  ]),
  [WorkspaceRole.BRIDAL_CONSULTANT]: new Set<Permission>([
    'appointments.read', 'appointments.manage',
    'customers.read', 'customers.manage',
    'sales.read',
    'inventory.read',
    'reports.read',
  ]),
  [WorkspaceRole.ALTERATIONS_SPECIALIST]: new Set<Permission>([
    'appointments.read',
    'customers.read',
    'sales.read',
    'inventory.read',
    'alterations.read', 'alterations.manage',
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
  'today', 'appointments', 'customers', 'sales', 'inventory',
  'team', 'growth', 'reports', 'settings',
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

const MODULE_WORKSPACE_PREFIX: Readonly<Record<string, CoreWorkspaceId>> = {
  core: 'today',
  scheduling: 'appointments',
  customers: 'customers',
  communications: 'customers',
  sales: 'sales',
  alterations: 'sales',
  inventory: 'inventory',
  purchasing: 'inventory',
  transfers: 'inventory',
  team: 'team',
  growth: 'growth',
  reports: 'reports',
  settings: 'settings',
};

export function hasPermission(
  roleInput: WorkspaceRole | string | null | undefined,
  permission: Permission,
): boolean {
  const role = typeof roleInput === 'string' ? normalizeLegacyRole(roleInput) : roleInput;
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function canAccessWorkspace(
  roleInput: WorkspaceRole | string | null | undefined,
  workspace: string,
): boolean {
  const normalizedWorkspace = workspace.toLowerCase().trim() as CoreWorkspaceId;
  const requiredPermission = WORKSPACE_PERMISSIONS[normalizedWorkspace];
  return Boolean(requiredPermission && hasPermission(roleInput, requiredPermission));
}

export function canAccessModule(
  roleInput: WorkspaceRole | string | null | undefined,
  moduleId: string,
): boolean {
  const normalized = String(moduleId ?? '').trim().toLowerCase();
  if (!normalized) return false;
  if ((CORE_WORKSPACES as string[]).includes(normalized)) {
    return canAccessWorkspace(roleInput, normalized);
  }
  const prefix = normalized.split('.')[0];
  const workspace = MODULE_WORKSPACE_PREFIX[prefix];
  return workspace ? canAccessWorkspace(roleInput, workspace) : false;
}

/**
 * Strict organization / brand / location boundary validation.
 *
 * Every requested brand must be covered by the caller's brand scope. Every
 * requested location must be covered by the caller's location scope. A partial
 * overlap is not sufficient for a multi-location request.
 */
export function validateScopeAccess(
  userScope: AuthorizationScope,
  targetScope: Partial<AuthorizationScope>,
): boolean {
  if (!userScope.organizationId || !targetScope.organizationId) return false;
  if (userScope.organizationId !== targetScope.organizationId) return false;

  if (targetScope.brandId) {
    if (!userScope.brandId) return false;
    if (userScope.brandId !== 'ALL' && userScope.brandId !== targetScope.brandId) return false;
  }

  if (targetScope.locationIds && targetScope.locationIds.length > 0) {
    if (!userScope.locationIds.length) return false;
    const allLocationsAllowed = targetScope.locationIds.every((locationId) =>
      userScope.locationIds.includes('ALL') || userScope.locationIds.includes(locationId),
    );
    if (!allLocationsAllowed) return false;
  }

  return true;
}
