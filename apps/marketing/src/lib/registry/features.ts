import { OrganizationRole } from '../auth/roles';

export type FeatureTier = 'CORE' | 'STANDARD' | 'ADVANCED' | 'ENTERPRISE' | 'SYSTEM';

export interface FeatureDefinition {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  route?: string;
  minimumTier?: FeatureTier;
  dependencies?: string[];
  minimumRole?: OrganizationRole;
  configurable: boolean;
  defaultEnabled: boolean;
}

export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  // CORE (Available to all)
  'dashboard': {
    id: 'feat-dashboard', slug: 'dashboard', name: 'Dashboard', category: 'Core',
    description: 'Main overview dashboard.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  'overview': {
    id: 'feat-overview', slug: 'overview', name: 'Executive Overview', category: 'Core',
    description: 'Owner-level business summary.', minimumTier: 'CORE', minimumRole: OrganizationRole.ORG_ADMIN,
    configurable: false, defaultEnabled: true,
  },
  'schedule': {
    id: 'feat-schedule', slug: 'schedule', name: 'Schedule', category: 'Core',
    description: 'Calendar and scheduling.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  'customers': {
    id: 'feat-customers', slug: 'customers', name: 'Customers & Brides', category: 'Core',
    description: 'CRM for managing brides.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  'communications': {
    id: 'feat-communications', slug: 'communications', name: 'Communications', category: 'Core',
    description: 'Inbox and messaging.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  'invoices': {
    id: 'feat-invoices', slug: 'invoices', name: 'Invoices & POS', category: 'Sales',
    description: 'Payments and receipts.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  'inventory': {
    id: 'feat-inventory', slug: 'inventory', name: 'Inventory', category: 'Operations',
    description: 'Gowns and stock management.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  'catalog': {
    id: 'feat-catalog', slug: 'catalog', name: 'Vendor Catalog', category: 'Operations',
    description: 'Browse vendor catalogs.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  'staff': {
    id: 'feat-staff', slug: 'staff', name: 'Team Directory', category: 'Admin',
    description: 'Manage staff list.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  'settings': {
    id: 'feat-settings', slug: 'settings', name: 'Settings', category: 'Admin',
    description: 'Store setup.', minimumTier: 'CORE', minimumRole: OrganizationRole.MANAGER,
    configurable: false, defaultEnabled: true,
  },
  'training': {
    id: 'feat-training', slug: 'training', name: 'Training', category: 'Admin',
    description: 'Training center.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  'booking': {
    id: 'feat-booking', slug: 'booking', name: 'Online Booking', category: 'Core',
    description: 'Public booking page.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  
  // STANDARD Features
  'sales.reports': {
    id: 'feat-sales', slug: 'sales.reports', name: 'Sales Reports', category: 'Sales',
    description: 'Sales dashboard and reporting.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: false, defaultEnabled: true,
  },
  'purchasing.core': {
    id: 'feat-purchasing', slug: 'purchasing.core', name: 'Purchase Orders', category: 'Sales',
    description: 'Manage vendor POs.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'sales.contracts': {
    id: 'feat-contracts', slug: 'sales.contracts', name: 'Contracts', category: 'Sales',
    description: 'Digital agreements.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'alterations.core': {
    id: 'feat-alterations', slug: 'alterations.core', name: 'Alterations', category: 'Operations',
    description: 'Tailoring and seamstress management.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: true, defaultEnabled: true,
  },
  'transfers.core': {
    id: 'feat-transfers', slug: 'transfers.core', name: 'Store Transfers', category: 'Operations',
    description: 'Interstore location transfers.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: true, defaultEnabled: true,
  },
  'growth.leads': {
    id: 'feat-leads', slug: 'growth.leads', name: 'Leads & Pipeline', category: 'Growth',
    description: 'Intake and pipeline.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.marketing': {
    id: 'feat-marketing', slug: 'growth.marketing', name: 'Growth Overview', category: 'Growth',
    description: 'Marketing dashboard.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'reports.core': {
    id: 'feat-reports-core', slug: 'reports.core', name: 'Standard Analytics', category: 'Analytics',
    description: 'Basic business insights.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'timeclock': {
    id: 'feat-timeclock', slug: 'timeclock', name: 'Time Clock', category: 'Admin',
    description: 'Staff time tracking.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: true, defaultEnabled: true,
  },

  // ADVANCED Features
  'growth.seo': {
    id: 'feat-growth-seo', slug: 'growth.seo', name: 'Technical SEO', category: 'Growth',
    description: 'Core web vitals and SEO tools.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.local_seo': {
    id: 'feat-growth-local', slug: 'growth.local_seo', name: 'Local SEO', category: 'Growth',
    description: 'Google Business and Maps integration.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.reputation': {
    id: 'feat-growth-reputation', slug: 'growth.reputation', name: 'Reputation', category: 'Growth',
    description: 'Review management.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'reports.advanced': {
    id: 'feat-reports-advanced', slug: 'reports.advanced', name: 'Advanced Ledgers', category: 'Analytics',
    description: 'Double-entry ledgers.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'payroll.core': {
    id: 'feat-payroll', slug: 'payroll.core', name: 'Payroll & Commissions', category: 'Admin',
    description: 'Wage and commission tracking.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'integrations.shopify': {
    id: 'feat-shopify', slug: 'integrations.shopify', name: 'Shopify Connections', category: 'Admin',
    description: 'E-commerce sync.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },

  // ENTERPRISE Features
  'growth.competitors': {
    id: 'feat-growth-competitors', slug: 'growth.competitors', name: 'Competitor Intel', category: 'Growth',
    description: 'Market gap analysis.', minimumTier: 'ENTERPRISE', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.attribution': {
    id: 'feat-growth-attribution', slug: 'growth.attribution', name: 'Attribution', category: 'Growth',
    description: 'Marketing ROI attribution.', minimumTier: 'ENTERPRISE', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.website': {
    id: 'feat-growth-website', slug: 'growth.website', name: 'Website Builder', category: 'Growth',
    description: 'Storefront builder.', minimumTier: 'ENTERPRISE', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },

  // SYSTEM Features
  'platform_admin': {
    id: 'feat-platform-admin', slug: 'platform_admin', name: 'Platform Admin', category: 'Platform',
    description: 'Global Administration.', minimumTier: 'SYSTEM', minimumRole: OrganizationRole.ORG_SUPER_ADMIN,
    configurable: false, defaultEnabled: false,
  }
};

export function getFeature(slug: string): FeatureDefinition | null {
  return FEATURE_REGISTRY[slug] || null;
}

export function getAllFeatures(): FeatureDefinition[] {
  return Object.values(FEATURE_REGISTRY);
}
