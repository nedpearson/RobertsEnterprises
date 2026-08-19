import { OrganizationRole } from '@/lib/auth/roles';;

export type PermissionKey =
  | 'settings.view'
  | 'settings.manage'
  | 'settings.organization.manage'
  | 'settings.locations.manage'
  | 'settings.security.manage'
  | 'settings.integrations.manage'
  | 'settings.payroll.manage'
  | 'staff.view'
  | 'staff.invite'
  | 'staff.edit'
  | 'staff.suspend'
  | 'staff.terminate'
  | 'staff.manage_locations'
  | 'staff.manage_roles'
  | 'staff.view_compensation'
  | 'staff.edit_compensation'
  | 'staff.view_security'
  | 'timeclock.use'
  | 'timeclock.kiosk_use'
  | 'timeclock.view_own'
  | 'timeclock.view_team'
  | 'timeclock.manager_punch'
  | 'timeclock.override_location'
  | 'timeclock.request_correction'
  | 'timeclock.edit_directly'
  | 'timecards.view_own'
  | 'timecards.submit_own'
  | 'timecards.view_team'
  | 'timecards.edit'
  | 'timecards.approve'
  | 'timecards.reject'
  | 'timecards.reopen'
  | 'timecards.lock'
  | 'payroll.view_summary'
  | 'payroll.view_employee_detail'
  | 'payroll.view_compensation'
  | 'payroll.view_taxes'
  | 'payroll.view_deductions'
  | 'payroll.create_run'
  | 'payroll.import_time'
  | 'payroll.calculate'
  | 'payroll.approve'
  | 'payroll.post'
  | 'payroll.submit_provider'
  | 'payroll.void'
  | 'payroll.correct'
  | 'payroll.reconcile'
  | 'payroll.export'
  | 'payroll.manage_settings'
  | 'bonuses.view'
  | 'bonuses.create'
  | 'bonuses.approve'
  | 'bonuses.import'
  | 'commissions.view'
  | 'commissions.calculate'
  | 'commissions.approve'
  | 'commissions.adjust'
  | 'leave.request'
  | 'leave.view_team'
  | 'leave.approve'
  | 'leave.adjust_balance'
  | 'leave.manage_policies'
  | 'compensation.view'
  | 'compensation.edit'
  | 'banking.view_masked'
  | 'banking.manage'
  | 'tax_profile.view'
  | 'tax_profile.manage'
  | 'payroll_audit.view';

// ─── Default Permission Matrix ───
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  Owner: [
    'settings.view', 'settings.manage', 'settings.organization.manage', 'settings.locations.manage', 'settings.security.manage', 'settings.integrations.manage', 'settings.payroll.manage',
    'staff.view', 'staff.invite', 'staff.edit', 'staff.suspend', 'staff.terminate', 'staff.manage_locations', 'staff.manage_roles', 'staff.view_compensation', 'staff.edit_compensation', 'staff.view_security',
    'timeclock.use', 'timeclock.kiosk_use', 'timeclock.view_own', 'timeclock.view_team', 'timeclock.manager_punch', 'timeclock.override_location', 'timeclock.request_correction', 'timeclock.edit_directly',
    'timecards.view_own', 'timecards.submit_own', 'timecards.view_team', 'timecards.edit', 'timecards.approve', 'timecards.reject', 'timecards.reopen', 'timecards.lock',
    'payroll.view_summary', 'payroll.view_employee_detail', 'payroll.view_compensation', 'payroll.view_taxes', 'payroll.view_deductions', 'payroll.create_run', 'payroll.import_time', 'payroll.calculate', 'payroll.approve', 'payroll.post', 'payroll.submit_provider', 'payroll.void', 'payroll.correct', 'payroll.reconcile', 'payroll.export', 'payroll.manage_settings',
    'bonuses.view', 'bonuses.create', 'bonuses.approve', 'bonuses.import',
    'commissions.view', 'commissions.calculate', 'commissions.approve', 'commissions.adjust',
    'leave.request', 'leave.view_team', 'leave.approve', 'leave.adjust_balance', 'leave.manage_policies',
    'compensation.view', 'compensation.edit', 'banking.view_masked', 'banking.manage', 'tax_profile.view', 'tax_profile.manage', 'payroll_audit.view'
  ],
  Manager: [
    'settings.view', 'settings.locations.manage',
    'staff.view',
    'timeclock.use', 'timeclock.kiosk_use', 'timeclock.view_own', 'timeclock.view_team', 'timeclock.manager_punch', 'timeclock.override_location', 'timeclock.request_correction',
    'timecards.view_own', 'timecards.submit_own', 'timecards.view_team', 'timecards.edit', 'timecards.approve', 'timecards.reject', 'timecards.reopen',
    'bonuses.view', 'bonuses.create',
    'commissions.view',
    'leave.request', 'leave.view_team', 'leave.approve'
  ],
  Stylist: [
    'timeclock.use', 'timeclock.kiosk_use', 'timeclock.view_own', 'timeclock.request_correction',
    'timecards.view_own', 'timecards.submit_own',
    'leave.request'
  ],
  'Front Desk': [
    'timeclock.use', 'timeclock.kiosk_use', 'timeclock.view_own', 'timeclock.request_correction',
    'timecards.view_own', 'timecards.submit_own',
    'leave.request'
  ]
};

export function hasPermission(role: OrganizationRole | null | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  const list = ROLE_PERMISSIONS[role];
  return list ? list.includes(permission) : false;
}

export interface AuthorizeParams {
  userId: string;
  userRole: OrganizationRole;
  permission: PermissionKey;
  locationId?: string;
  assignedLocations?: string[];
  entityOwnerId?: string;
  amountCents?: number;
}

export interface AuthorizationResult {
  allowed: boolean;
  reasonCode: 'AUTHORIZED' | 'ROLE_DENIED' | 'LOCATION_MISMATCH' | 'SELF_APPROVAL_BLOCKED' | 'AMOUNT_LIMIT_EXCEEDED' | 'NO_ROLE' | 'USER_ACTION_DENIED';
  reason: string;
}

export function authorizeAction(params: AuthorizeParams): AuthorizationResult {
  if (!params.userRole) {
    return { allowed: false, reasonCode: 'NO_ROLE', reason: 'User access role is not configured.' };
  }

  // Custom user action overrides checks
  if (params.userId && params.userRole !== OrganizationRole.ORG_SUPER_ADMIN && typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem('vowos_action_permissions');
      if (cached) {
        const map = JSON.parse(cached);
        if (map && map[params.userId] !== undefined) {
          const userActions: string[] = map[params.userId];
          if (!userActions.includes(params.permission)) {
            return {
              allowed: false,
              reasonCode: 'USER_ACTION_DENIED',
              reason: `Individual Privilege Denied: Account lacks granular '${params.permission}' authorization.`
            };
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 1. RBAC Check
  if (params.userRole !== OrganizationRole.ORG_SUPER_ADMIN) {
    const hasOverride = (() => {
      if (!params.userId || typeof localStorage === 'undefined') return false;
      try {
        const cached = localStorage.getItem('vowos_action_permissions');
        if (cached) {
          const map = JSON.parse(cached);
          return map && map[params.userId] !== undefined;
        }
      } catch (e) {
        // ignore
      }
      return false;
    })();

    if (!hasOverride && !hasPermission(params.userRole, params.permission)) {
      return {
        allowed: false,
        reasonCode: 'ROLE_DENIED',
        reason: `Access Role '${params.userRole}' lacks the required '${params.permission}' privilege.`
      };
    }
  }

  // 2. Self-Approval Lockout Safeguard
  if (
    params.entityOwnerId &&
    params.userId === params.entityOwnerId &&
    ['timecards.approve', 'leave.approve', 'bonuses.approve', 'staff.edit_compensation'].includes(params.permission)
  ) {
    return {
      allowed: false,
      reasonCode: 'SELF_APPROVAL_BLOCKED',
      reason: 'Separation of Duties Safeguard: You cannot self-approve your own records or compensation.'
    };
  }

  // 3. Location Boundary Isolation
  if (params.locationId && params.userRole !== OrganizationRole.ORG_SUPER_ADMIN) {
    const isAssigned = params.assignedLocations?.includes(params.locationId) ?? false;
    if (!isAssigned) {
      return {
        allowed: false,
        reasonCode: 'LOCATION_MISMATCH',
        reason: 'Location Scope Guard: Your account is not authorized to edit records for this location.'
      };
    }
  }

  // 4. Amount thresholds check (e.g. Managers capped at $500 bonus approval limit)
  if (params.amountCents && params.userRole === 'Manager' && params.amountCents > 50000) {
    return {
      allowed: false,
      reasonCode: 'AMOUNT_LIMIT_EXCEEDED',
      reason: 'Approval Threshold Guard: Manager approval authority is limited to $500.00.'
    };
  }

  return { allowed: true, reasonCode: 'AUTHORIZED', reason: 'Action authorized.' };
}


