import { OrganizationRole } from '../auth/roles';

export interface FeatureDefinition {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  route?: string;
  minimumPlan?: string; // e.g., 'starter', 'pro', 'elite'
  dependencies?: string[];
  minimumRole?: OrganizationRole;
  configurable: boolean;
  defaultEnabled: boolean;
}

export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  // Core Modules
  dashboard: {
    id: 'feat-dashboard',
    slug: 'dashboard',
    name: 'Dashboard',
    category: 'Core',
    description: 'Main overview dashboard.',
    minimumPlan: 'starter',
    minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false,
    defaultEnabled: true,
  },
  customers: {
    id: 'feat-customers',
    slug: 'customers',
    name: 'Customers & Brides',
    category: 'Core',
    description: 'CRM for managing brides and leads.',
    minimumPlan: 'starter',
    minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false,
    defaultEnabled: true,
  },
  calendar: {
    id: 'feat-calendar',
    slug: 'calendar',
    name: 'Calendar & Scheduling',
    category: 'Core',
    description: 'Appointment booking and management.',
    minimumPlan: 'starter',
    minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false,
    defaultEnabled: true,
  },
  communications: {
    id: 'feat-communications',
    slug: 'communications',
    name: 'Communications',
    category: 'Core',
    description: 'SMS and Email messaging.',
    minimumPlan: 'pro',
    minimumRole: OrganizationRole.EMPLOYEE,
    configurable: true,
    defaultEnabled: true,
  },
  reports: {
    id: 'feat-reports',
    slug: 'reports',
    name: 'Advanced Reporting',
    category: 'Analytics',
    description: 'Financial and operational reports.',
    minimumPlan: 'pro',
    minimumRole: OrganizationRole.MANAGER,
    configurable: true,
    defaultEnabled: true,
  },
  inventory: {
    id: 'feat-inventory',
    slug: 'inventory',
    name: 'Inventory Management',
    category: 'Operations',
    description: 'Track gowns, accessories, and stock.',
    minimumPlan: 'starter',
    minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false,
    defaultEnabled: true,
  },
  employees: {
    id: 'feat-employees',
    slug: 'employees',
    name: 'Employee Management',
    category: 'Workforce',
    description: 'Manage staff, schedules, and payroll.',
    minimumPlan: 'elite',
    minimumRole: OrganizationRole.ORG_ADMIN,
    configurable: true,
    defaultEnabled: true,
  },
  platform_admin: {
    id: 'feat-platform-admin',
    slug: 'platform_admin',
    name: 'Platform Command Center',
    category: 'Platform',
    description: 'Global VowOS Administration.',
    minimumPlan: 'comped', // N/A, overridden by PlatformRole
    minimumRole: OrganizationRole.ORG_SUPER_ADMIN,
    configurable: false,
    defaultEnabled: false,
  }
};

export function getFeature(slug: string): FeatureDefinition | null {
  return FEATURE_REGISTRY[slug] || null;
}

export function getAllFeatures(): FeatureDefinition[] {
  return Object.values(FEATURE_REGISTRY);
}
