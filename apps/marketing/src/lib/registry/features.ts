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

/**
 * Canonical runtime entitlement registry.
 *
 * Commercial packaging must use these slugs (or explicitly map to them) so the
 * website, billing, tenant settings and runtime navigation cannot silently drift.
 * Tier mapping: CORE=Essentials, STANDARD=Growth, ADVANCED=Pro,
 * ENTERPRISE=Enterprise, SYSTEM=platform-only.
 */
export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  // CORE — the bridal operating foundation.
  dashboard: {
    id: 'feat-dashboard', slug: 'dashboard', name: 'Dashboard', category: 'Core',
    description: 'Main operating dashboard.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  overview: {
    id: 'feat-overview', slug: 'overview', name: 'Executive Overview', category: 'Core',
    description: 'Owner-level business summary.', minimumTier: 'CORE', minimumRole: OrganizationRole.ORG_ADMIN,
    configurable: false, defaultEnabled: true,
  },
  schedule: {
    id: 'feat-schedule', slug: 'schedule', name: 'Schedule', category: 'Core',
    description: 'Calendar and scheduling.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  customers: {
    id: 'feat-customers', slug: 'customers', name: 'Customers & Brides', category: 'Core',
    description: 'Bridal CRM and customer journey.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  communications: {
    id: 'feat-communications', slug: 'communications', name: 'Communications', category: 'Core',
    description: 'Customer communication history and inbox.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  invoices: {
    id: 'feat-invoices', slug: 'invoices', name: 'Invoices & POS', category: 'Sales',
    description: 'Sales, payments and receipts.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  inventory: {
    id: 'feat-inventory', slug: 'inventory', name: 'Inventory', category: 'Operations',
    description: 'Gowns, products and stock management.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  catalog: {
    id: 'feat-catalog', slug: 'catalog', name: 'Vendor Catalog', category: 'Operations',
    description: 'Vendor and designer catalog tools.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  staff: {
    id: 'feat-staff', slug: 'staff', name: 'Team Directory', category: 'Admin',
    description: 'Staff directory and operating assignments.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  settings: {
    id: 'feat-settings', slug: 'settings', name: 'Settings', category: 'Admin',
    description: 'Organization, brand, location and feature configuration.', minimumTier: 'CORE', minimumRole: OrganizationRole.MANAGER,
    configurable: false, defaultEnabled: true,
  },
  training: {
    id: 'feat-training', slug: 'training', name: 'Training', category: 'Admin',
    description: 'Guided training and onboarding center.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },
  booking: {
    id: 'feat-booking', slug: 'booking', name: 'Online Booking', category: 'Core',
    description: 'Public appointment booking and intake.', minimumTier: 'CORE', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: false, defaultEnabled: true,
  },

  // STANDARD / Growth — automation, portal, purchasing and team operations.
  'sales.reports': {
    id: 'feat-sales', slug: 'sales.reports', name: 'Sales Reports', category: 'Sales',
    description: 'Sales dashboard and reporting.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: false, defaultEnabled: true,
  },
  'purchasing.core': {
    id: 'feat-purchasing', slug: 'purchasing.core', name: 'Purchase Orders', category: 'Operations',
    description: 'Vendor purchase orders and receiving workflows.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'sales.contracts': {
    id: 'feat-contracts', slug: 'sales.contracts', name: 'Contracts & E-Sign', category: 'Sales',
    description: 'Digital customer agreements and signatures.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'alterations.core': {
    id: 'feat-alterations', slug: 'alterations.core', name: 'Alterations', category: 'Operations',
    description: 'Fitting and alterations workflow tracking.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: true, defaultEnabled: true,
  },
  'transfers.core': {
    id: 'feat-transfers', slug: 'transfers.core', name: 'Store Transfers', category: 'Operations',
    description: 'Controlled inter-location inventory transfers.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: true, defaultEnabled: true,
  },
  'growth.leads': {
    id: 'feat-leads', slug: 'growth.leads', name: 'Leads & Pipeline', category: 'Growth',
    description: 'Lead intake, qualification and conversion pipeline.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.marketing': {
    id: 'feat-marketing', slug: 'growth.marketing', name: 'Growth Overview', category: 'Growth',
    description: 'Marketing performance and growth dashboard.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'reports.core': {
    id: 'feat-reports-core', slug: 'reports.core', name: 'Standard Analytics', category: 'Analytics',
    description: 'Operational and business reporting.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  timeclock: {
    id: 'feat-timeclock', slug: 'timeclock', name: 'Time Clock', category: 'Admin',
    description: 'Staff time tracking.', minimumTier: 'STANDARD', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: true, defaultEnabled: true,
  },
  'portal.bridal': {
    id: 'feat-bridal-portal', slug: 'portal.bridal', name: 'Bride Portal', category: 'Customer Experience',
    description: 'Private bride experience for appointments, balances, contracts, measurements and alterations progress.',
    minimumTier: 'STANDARD', minimumRole: OrganizationRole.EMPLOYEE,
    configurable: true, defaultEnabled: true,
  },
  'communications.sms': {
    id: 'feat-communications-sms', slug: 'communications.sms', name: 'Two-Way SMS', category: 'Communications',
    description: 'Consent-aware two-way SMS with customer history and webhook idempotency.',
    minimumTier: 'STANDARD', dependencies: ['communications'], minimumRole: OrganizationRole.EMPLOYEE,
    configurable: true, defaultEnabled: true,
  },
  'automation.rules': {
    id: 'feat-automation-rules', slug: 'automation.rules', name: 'Workflow Automations', category: 'Automation',
    description: 'Trigger, condition and action based operational automations.',
    minimumTier: 'STANDARD', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'payments.schedules': {
    id: 'feat-payment-schedules', slug: 'payments.schedules', name: 'Payment Schedules', category: 'Sales',
    description: 'Customer balance and scheduled-payment workflows.',
    minimumTier: 'STANDARD', dependencies: ['invoices'], minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },

  // ADVANCED / Pro — growth, ecommerce, AI-assisted operations and scale.
  'growth.social_content': {
    id: 'feat-growth-social', slug: 'growth.social_content', name: 'Social & Content', category: 'Growth',
    description: 'Content calendar and social operations.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.seo': {
    id: 'feat-growth-seo', slug: 'growth.seo', name: 'Technical SEO', category: 'Growth',
    description: 'Technical SEO and web health tools.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.local_seo': {
    id: 'feat-growth-local', slug: 'growth.local_seo', name: 'Local SEO', category: 'Growth',
    description: 'Google Business and local discovery tools.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.reputation': {
    id: 'feat-growth-reputation', slug: 'growth.reputation', name: 'Reputation', category: 'Growth',
    description: 'Review and reputation management.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'reports.advanced': {
    id: 'feat-reports-advanced', slug: 'reports.advanced', name: 'Advanced Analytics', category: 'Analytics',
    description: 'Deeper operational, financial and performance analytics.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'payroll.core': {
    id: 'feat-payroll', slug: 'payroll.core', name: 'Payroll & Commissions', category: 'Admin',
    description: 'Wage, timecard and commission tracking.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'integrations.shopify': {
    id: 'feat-shopify', slug: 'integrations.shopify', name: 'Shopify Connections', category: 'Integrations',
    description: 'Connected ecommerce orders, products and inventory.', minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'ai.assist': {
    id: 'feat-ai-assist', slug: 'ai.assist', name: 'VowOS Intelligence', category: 'Intelligence',
    description: 'AI-assisted operational recommendations and analysis using authorized tenant context.',
    minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'scale.multi_location': {
    id: 'feat-scale-multi-location', slug: 'scale.multi_location', name: 'Multi-Location Operations', category: 'Scale',
    description: 'Cross-location visibility, transfer and operating controls.',
    minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'scale.multi_brand': {
    id: 'feat-scale-multi-brand', slug: 'scale.multi_brand', name: 'Multi-Brand Operations', category: 'Scale',
    description: 'Operate multiple brands within one customer organization.',
    minimumTier: 'ADVANCED', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },

  // ENTERPRISE — portfolio intelligence and controlled extensibility.
  'growth.competitors': {
    id: 'feat-growth-competitors', slug: 'growth.competitors', name: 'Competitor Intel', category: 'Growth',
    description: 'Market gap and competitive intelligence.', minimumTier: 'ENTERPRISE', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.attribution': {
    id: 'feat-growth-attribution', slug: 'growth.attribution', name: 'Revenue Attribution', category: 'Growth',
    description: 'Connect campaign and lead activity to appointments and revenue.', minimumTier: 'ENTERPRISE', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'growth.website': {
    id: 'feat-growth-website', slug: 'growth.website', name: 'Website & Commerce Experience', category: 'Growth',
    description: 'Managed web/storefront experience and conversion tooling.', minimumTier: 'ENTERPRISE', minimumRole: OrganizationRole.MANAGER,
    configurable: true, defaultEnabled: true,
  },
  'integrations.api': {
    id: 'feat-api-access', slug: 'integrations.api', name: 'API Access', category: 'Integrations',
    description: 'Controlled API access for approved organization integrations.',
    minimumTier: 'ENTERPRISE', minimumRole: OrganizationRole.ORG_ADMIN,
    configurable: true, defaultEnabled: true,
  },
  'security.audit': {
    id: 'feat-security-audit', slug: 'security.audit', name: 'Advanced Audit Logs', category: 'Security',
    description: 'Administrative and sensitive-operation audit visibility.',
    minimumTier: 'ENTERPRISE', minimumRole: OrganizationRole.ORG_ADMIN,
    configurable: true, defaultEnabled: true,
  },

  // SYSTEM — never sold to tenant users.
  platform_admin: {
    id: 'feat-platform-admin', slug: 'platform_admin', name: 'Platform Admin', category: 'Platform',
    description: 'Global VowOS administration.', minimumTier: 'SYSTEM', minimumRole: OrganizationRole.ORG_SUPER_ADMIN,
    configurable: false, defaultEnabled: false,
  },
};

export function getFeature(slug: string): FeatureDefinition | null {
  return FEATURE_REGISTRY[slug] || null;
}

export function getAllFeatures(): FeatureDefinition[] {
  return Object.values(FEATURE_REGISTRY);
}
