export type CommercialPlan = 'essentials' | 'growth' | 'pro' | 'enterprise';

export type FeatureCapability = 
  | 'CORE_OPERATING_REQUIREMENT'
  | 'ADVANCED_OPERATIONS'
  | 'GROWTH'
  | 'INTELLIGENCE'
  | 'ENTERPRISE'
  | 'INTEGRATION';

export interface VowosFeature {
  id: string;
  label: string;
  capability: FeatureCapability;
  planRecommendation: CommercialPlan;
  dependencies?: string[];
  addOnEligible?: boolean;
  usageCost?: boolean;
}

export interface VowosModule {
  id: string;
  label: string;
  features: Record<string, VowosFeature>;
}

export const VOWOS_CATALOG = {
  modules: {
    customers: {
      id: 'customers',
      label: 'Customers & Sales',
      features: {
        'crm.core': { id: 'crm.core', label: 'Basic CRM', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: [] },
        'crm.customer360': { id: 'crm.customer360', label: 'Customer 360', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'essentials', dependencies: ['crm.core'] },
        'sales.contracts': { id: 'sales.contracts', label: 'Contracts', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: ['crm.core'] },
        'sales.invoicing': { id: 'sales.invoicing', label: 'Invoicing & Payments', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: ['crm.core'] },
        'communications.core': { id: 'communications.core', label: 'Communications History', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: ['crm.core'] },
        'communications.advanced': { id: 'communications.advanced', label: 'Advanced Communications', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'growth', dependencies: ['communications.core'] }
      }
    },
    scheduling: {
      id: 'scheduling',
      label: 'Scheduling',
      features: {
        'scheduling.core': { id: 'scheduling.core', label: 'Basic Appointments', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: [] },
        'scheduling.requests': { id: 'scheduling.requests', label: 'Booking Requests', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: ['scheduling.core'] },
        'scheduling.advanced': { id: 'scheduling.advanced', label: 'Advanced Booking Workflows', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'growth', dependencies: ['scheduling.core'] },
        'scheduling.smart': { id: 'scheduling.smart', label: 'Smart Scheduling', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'growth', dependencies: ['scheduling.advanced'] },
        'scheduling.ai': { id: 'scheduling.ai', label: 'AI Planner', capability: 'INTELLIGENCE', planRecommendation: 'pro', dependencies: ['scheduling.smart', 'ai.core'], addOnEligible: true },
        'workforce.core': { id: 'workforce.core', label: 'Basic Employee Scheduling', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: [] },
        'workforce.advanced': { id: 'workforce.advanced', label: 'Advanced Workforce & Capacity', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'growth', dependencies: ['workforce.core'] }
      }
    },
    operations: {
      id: 'operations',
      label: 'Operations',
      features: {
        'inventory.core': { id: 'inventory.core', label: 'Basic Inventory & Designers', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: [] },
        'inventory.advanced': { id: 'inventory.advanced', label: 'Advanced Inventory', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'growth', dependencies: ['inventory.core'] },
        'inventory.optimization': { id: 'inventory.optimization', label: 'Inventory Optimization', capability: 'INTELLIGENCE', planRecommendation: 'pro', dependencies: ['inventory.advanced', 'ai.core'] },
        'purchasing.core': { id: 'purchasing.core', label: 'Basic Purchase Orders', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: ['inventory.core'] },
        'purchasing.advanced': { id: 'purchasing.advanced', label: 'Advanced POs & Vendor Automation', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'growth', dependencies: ['purchasing.core'] },
        'purchasing.central': { id: 'purchasing.central', label: 'Centralized Purchasing', capability: 'ENTERPRISE', planRecommendation: 'pro', dependencies: ['purchasing.advanced'] },
        'alterations.core': { id: 'alterations.core', label: 'Basic Alterations Tracking', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: ['inventory.core', 'crm.core'] },
        'alterations.advanced': { id: 'alterations.advanced', label: 'Alterations Workflows', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'growth', dependencies: ['alterations.core'] },
        'transfers.core': { id: 'transfers.core', label: 'Basic Transfers', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'growth', dependencies: ['inventory.core'] },
        'transfers.advanced': { id: 'transfers.advanced', label: 'Advanced Store Transfers', capability: 'ENTERPRISE', planRecommendation: 'pro', dependencies: ['transfers.core'] }
      }
    },
    growth: {
      id: 'growth',
      label: 'Growth',
      features: {
        'marketing.leads': { id: 'marketing.leads', label: 'Lead Management', capability: 'GROWTH', planRecommendation: 'growth', dependencies: ['crm.core'], addOnEligible: true },
        'marketing.automation': { id: 'marketing.automation', label: 'Customer Follow-up Automation', capability: 'GROWTH', planRecommendation: 'growth', dependencies: ['crm.core'] },
        'marketing.campaigns': { id: 'marketing.campaigns', label: 'Campaigns', capability: 'GROWTH', planRecommendation: 'pro', dependencies: ['marketing.leads'], addOnEligible: true },
        'marketing.attribution': { id: 'marketing.attribution', label: 'Advanced Attribution', capability: 'GROWTH', planRecommendation: 'pro', dependencies: ['marketing.leads'], addOnEligible: true }
      }
    },
    finance: {
      id: 'finance',
      label: 'Finance & Workforce',
      features: {
        'payroll.core': { id: 'payroll.core', label: 'Basic Payroll & Timeclock', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: [] },
        'payroll.advanced': { id: 'payroll.advanced', label: 'Advanced Payroll & Commission', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'pro', dependencies: ['payroll.core'], addOnEligible: true },
        'payroll.analytics': { id: 'payroll.analytics', label: 'Labor Analytics', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'pro', dependencies: ['payroll.advanced'], addOnEligible: true }
      }
    },
    intelligence: {
      id: 'intelligence',
      label: 'Intelligence',
      features: {
        'ai.core': { id: 'ai.core', label: 'Basic AI Recommendations', capability: 'INTELLIGENCE', planRecommendation: 'essentials', usageCost: true, dependencies: [] },
        'ai.advanced': { id: 'ai.advanced', label: 'Advanced VowOS Intelligence', capability: 'INTELLIGENCE', planRecommendation: 'growth', usageCost: true, dependencies: ['ai.core'] },
        'ai.executive': { id: 'ai.executive', label: 'Executive AI Consultant', capability: 'INTELLIGENCE', planRecommendation: 'pro', usageCost: true, dependencies: ['ai.advanced'], addOnEligible: true },
        'ai.forecasting': { id: 'ai.forecasting', label: 'Demand Forecasting', capability: 'INTELLIGENCE', planRecommendation: 'pro', dependencies: ['ai.advanced'], addOnEligible: true },
        'reports.core': { id: 'reports.core', label: 'Basic Reporting', capability: 'CORE_OPERATING_REQUIREMENT', planRecommendation: 'essentials', dependencies: [] },
        'reports.advanced': { id: 'reports.advanced', label: 'Advanced Analytics', capability: 'ADVANCED_OPERATIONS', planRecommendation: 'growth', dependencies: ['reports.core'] },
        'reports.enterprise': { id: 'reports.enterprise', label: 'Enterprise Reporting', capability: 'ENTERPRISE', planRecommendation: 'enterprise', dependencies: ['reports.advanced'] }
      }
    },
    integrations: {
      id: 'integrations',
      label: 'Integrations',
      features: {
        'integrations.shopify': { id: 'integrations.shopify', label: 'Shopify Connection', capability: 'INTEGRATION', planRecommendation: 'pro', dependencies: ['inventory.core'], addOnEligible: true },
        'integrations.google': { id: 'integrations.google', label: 'Google', capability: 'INTEGRATION', planRecommendation: 'growth', dependencies: [] },
        'integrations.meta': { id: 'integrations.meta', label: 'Meta', capability: 'INTEGRATION', planRecommendation: 'growth', dependencies: [] },
        'integrations.api': { id: 'integrations.api', label: 'API Access', capability: 'ENTERPRISE', planRecommendation: 'enterprise', dependencies: [], addOnEligible: true }
      }
    },
    platform: {
      id: 'platform',
      label: 'Platform & Scale',
      features: {
        'scale.multi_location': { id: 'scale.multi_location', label: 'Multi-location Operations', capability: 'ENTERPRISE', planRecommendation: 'pro', dependencies: [] },
        'branding.custom_domain': { id: 'branding.custom_domain', label: 'Custom Domain', capability: 'ENTERPRISE', planRecommendation: 'enterprise', dependencies: [], addOnEligible: true },
        'branding.white_label': { id: 'branding.white_label', label: 'White Labeling', capability: 'ENTERPRISE', planRecommendation: 'enterprise', dependencies: ['branding.custom_domain'], addOnEligible: true },
        'security.sso': { id: 'security.sso', label: 'Single Sign-On (SSO)', capability: 'ENTERPRISE', planRecommendation: 'enterprise', dependencies: [] },
        'security.audit': { id: 'security.audit', label: 'Advanced Audit Logs', capability: 'ENTERPRISE', planRecommendation: 'enterprise', dependencies: [] }
      }
    }
  }
} as const;

export const PLANS: Record<CommercialPlan, { label: string; includedFeatures: string[] }> = {
  essentials: {
    label: 'VowOS Essentials',
    includedFeatures: [
      'crm.core', 'crm.customer360', 'sales.contracts', 'sales.invoicing', 'communications.core',
      'scheduling.core', 'scheduling.requests', 'workforce.core',
      'inventory.core', 'purchasing.core', 'alterations.core',
      'payroll.core',
      'ai.core', 'reports.core'
    ]
  },
  growth: {
    label: 'VowOS Growth',
    includedFeatures: [
      // All Essentials
      'crm.core', 'crm.customer360', 'sales.contracts', 'sales.invoicing', 'communications.core',
      'scheduling.core', 'scheduling.requests', 'workforce.core',
      'inventory.core', 'purchasing.core', 'alterations.core',
      'payroll.core',
      'ai.core', 'reports.core',
      // Plus Growth
      'communications.advanced',
      'scheduling.advanced', 'scheduling.smart', 'workforce.advanced',
      'inventory.advanced', 'purchasing.advanced', 'alterations.advanced', 'transfers.core',
      'marketing.leads', 'marketing.automation',
      'ai.advanced', 'reports.advanced',
      'integrations.google', 'integrations.meta'
    ]
  },
  pro: {
    label: 'VowOS Pro',
    includedFeatures: [
      // All Growth
      'crm.core', 'crm.customer360', 'sales.contracts', 'sales.invoicing', 'communications.core',
      'scheduling.core', 'scheduling.requests', 'workforce.core',
      'inventory.core', 'purchasing.core', 'alterations.core',
      'payroll.core',
      'ai.core', 'reports.core',
      'communications.advanced',
      'scheduling.advanced', 'scheduling.smart', 'workforce.advanced',
      'inventory.advanced', 'purchasing.advanced', 'alterations.advanced', 'transfers.core',
      'marketing.leads', 'marketing.automation',
      'ai.advanced', 'reports.advanced',
      'integrations.google', 'integrations.meta',
      // Plus Pro
      'scheduling.ai',
      'inventory.optimization', 'purchasing.central', 'transfers.advanced',
      'marketing.campaigns', 'marketing.attribution',
      'payroll.advanced', 'payroll.analytics',
      'ai.executive', 'ai.forecasting',
      'integrations.shopify',
      'scale.multi_location'
    ]
  },
  enterprise: {
    label: 'VowOS Enterprise',
    includedFeatures: [
      // All Pro (which includes all lower)
      'crm.core', 'crm.customer360', 'sales.contracts', 'sales.invoicing', 'communications.core',
      'scheduling.core', 'scheduling.requests', 'workforce.core',
      'inventory.core', 'purchasing.core', 'alterations.core',
      'payroll.core',
      'ai.core', 'reports.core',
      'communications.advanced',
      'scheduling.advanced', 'scheduling.smart', 'workforce.advanced',
      'inventory.advanced', 'purchasing.advanced', 'alterations.advanced', 'transfers.core',
      'marketing.leads', 'marketing.automation',
      'ai.advanced', 'reports.advanced',
      'integrations.google', 'integrations.meta',
      'scheduling.ai',
      'inventory.optimization', 'purchasing.central', 'transfers.advanced',
      'marketing.campaigns', 'marketing.attribution',
      'payroll.advanced', 'payroll.analytics',
      'ai.executive', 'ai.forecasting',
      'integrations.shopify',
      'scale.multi_location',
      // Plus Enterprise
      'reports.enterprise',
      'integrations.api',
      'branding.custom_domain', 'branding.white_label',
      'security.sso', 'security.audit'
    ]
  }
};
