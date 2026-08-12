import { StaffRole } from '@/contexts/AuthContext';

export type PlanId = 'starter' | 'essentials' | 'growth' | 'pro' | 'enterprise';

export type ModuleId = 
  // Core
  | 'dashboard' | 'customers' | 'calendar' | 'communications' | 'reports'
  // Sales & Revenue
  | 'leads' | 'marketing' | 'sales' | 'quotes' | 'payments'
  // Operations
  | 'inventory' | 'orders' | 'purchasing' | 'vendors' | 'logistics'
  // Workforce
  | 'employees' | 'scheduling' | 'time_tracking' | 'payroll'
  // Advanced
  | 'ai_analytics' | 'automations' | 'integrations' | 'multi_location' | 'advanced_reporting';

export const PLAN_MODULES: Record<PlanId, ModuleId[]> = {
  starter: [
    'dashboard', 'customers', 'calendar'
  ],
  essentials: [
    'dashboard', 'customers', 'calendar', 'communications', 'reports'
  ],
  growth: [
    'dashboard', 'customers', 'calendar', 'communications', 'reports',
    'leads', 'marketing', 'sales', 'quotes', 'payments'
  ],
  pro: [
    'dashboard', 'customers', 'calendar', 'communications', 'reports',
    'leads', 'marketing', 'sales', 'quotes', 'payments',
    'inventory', 'orders', 'purchasing', 'vendors', 'logistics'
  ],
  enterprise: [
    'dashboard', 'customers', 'calendar', 'communications', 'reports',
    'leads', 'marketing', 'sales', 'quotes', 'payments',
    'inventory', 'orders', 'purchasing', 'vendors', 'logistics',
    'employees', 'scheduling', 'time_tracking', 'payroll',
    'ai_analytics', 'automations', 'integrations', 'multi_location', 'advanced_reporting'
  ]
};

export interface TenantContext {
  id: string;
  plan_id: PlanId;
  status: string;
  enabled_modules: ModuleId[];
  overrides: Record<string, 'FORCED_ON' | 'FORCED_OFF'>;
}

export interface UserContext {
  id: string;
  role: StaffRole;
  platform_role: 'USER' | 'SUPPORT' | 'PLATFORM_ADMIN' | 'SUPER_ADMIN';
}

export function canAccessModule(user: UserContext, tenant: TenantContext, module: ModuleId): boolean {
  if (user.platform_role === 'SUPER_ADMIN' || user.platform_role === 'SUPPORT') return true;
  if (tenant.status !== 'ACTIVE' && tenant.status !== 'ONBOARDING') return false;

  if (tenant.overrides && tenant.overrides[module] === 'FORCED_OFF') return false;
  if (tenant.overrides && tenant.overrides[module] === 'FORCED_ON') return true;

  const planIncludes = PLAN_MODULES[tenant.plan_id]?.includes(module) ?? false;
  if (!planIncludes) return false;

  return tenant.enabled_modules ? tenant.enabled_modules.includes(module) : true; // Default true if enabled_modules not set
}

export type Capability = 
  | 'manage_billing'
  | 'manage_users'
  | 'manage_settings'
  | 'view_reports'
  | 'edit_inventory'
  | 'manage_appointments';

export function canPerformAction(user: UserContext, tenant: TenantContext, capability: Capability): boolean {
  if (user.platform_role === 'SUPER_ADMIN') return true;
  if (tenant.status !== 'ACTIVE' && tenant.status !== 'ONBOARDING') return false;

  switch (capability) {
    case 'manage_billing': return user.role === 'Owner';
    case 'manage_users': return user.role === 'Owner';
    case 'manage_settings': return user.role === 'Owner' || user.role === 'Manager';
    case 'view_reports': return user.role === 'Owner' || user.role === 'Manager';
    case 'edit_inventory': return user.role === 'Owner' || user.role === 'Manager' || user.role === 'Stylist';
    case 'manage_appointments': return ['Owner', 'Manager', 'Stylist', 'Front Desk'].includes(user.role);
    default: return false;
  }
}
