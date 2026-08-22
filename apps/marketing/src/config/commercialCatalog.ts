import {
  MASTER_FEATURE_CATALOG,
  type FeatureKey,
  type FeatureCatalogEntry,
} from '@/lib/features/featureCatalog';

export type CommercialPlan = 'essentials' | 'growth' | 'pro' | 'enterprise';

export type FeatureCapability =
  | 'CORE_OPERATING_REQUIREMENT'
  | 'ADVANCED_OPERATIONS'
  | 'GROWTH'
  | 'INTELLIGENCE'
  | 'ENTERPRISE'
  | 'INTEGRATION';

export interface VowosFeature {
  id: FeatureKey;
  label: string;
  description: string;
  capability: FeatureCapability;
  planRecommendation: CommercialPlan;
  dependencies?: FeatureKey[];
  addOnEligible?: boolean;
  usageCost?: boolean;
  defaultEnabled: boolean;
  beta: boolean;
}

export interface VowosModule {
  id: string;
  label: string;
  features: Record<string, VowosFeature>;
}

export interface PlanDefinition {
  label: string;
  monthly: number;
  annual: number;
  tagline: string;
  description: string;
  bestFor: string;
  highlights: string[];
  includedFeatures: FeatureKey[];
  includedUsers: number | 'unlimited';
  includedLocations: number | 'unlimited';
}

export const PLAN_ORDER: CommercialPlan[] = ['essentials', 'growth', 'pro', 'enterprise'];
const PLAN_RANK = Object.fromEntries(PLAN_ORDER.map((plan, index) => [plan, index])) as Record<CommercialPlan, number>;

const MODULE_LABELS: Record<string, string> = {
  appointments: 'Appointments & Booking',
  customers: 'Customers & Bridal CRM',
  sales: 'Sales, Payments & Contracts',
  inventory: 'Inventory & Purchasing',
  team: 'Team & Workforce',
  growth: 'Growth & Marketing',
  reports: 'Reports & Intelligence',
  integrations: 'Integrations & Commerce',
};

const ADD_ON_ELIGIBLE = new Set<FeatureKey>([
  'appointments.ai_assignment',
  'customers.ai_insights',
  'inventory.ai_rebalancer',
  'inventory.otb_forecast',
  'growth.campaigns',
  'growth.google',
  'growth.meta',
  'growth.ai_advisor',
  'growth.competitor_intelligence',
  'reports.ai_insights',
  'reports.custom_builder',
  'integrations.shopify',
  'integrations.accounting',
  'integrations.api',
]);

function capabilityFor(feature: FeatureCatalogEntry): FeatureCapability {
  if (feature.module === 'integrations') return 'INTEGRATION';
  if (feature.category === 'AI') return 'INTELLIGENCE';
  if (feature.module === 'growth') return 'GROWTH';
  if (feature.minimum_plan === 'enterprise') return 'ENTERPRISE';
  if (feature.minimum_plan === 'essentials') return 'CORE_OPERATING_REQUIREMENT';
  return 'ADVANCED_OPERATIONS';
}

function includedFeaturesForPlan(plan: CommercialPlan): FeatureKey[] {
  const rank = PLAN_RANK[plan];
  return Object.values(MASTER_FEATURE_CATALOG)
    .filter((feature) => !feature.platform_only && PLAN_RANK[feature.minimum_plan] <= rank)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((feature) => feature.feature_key);
}

/**
 * Commercial catalog is now a projection of MASTER_FEATURE_CATALOG rather than
 * a second hand-maintained feature registry. Billing, pricing UI and tenant
 * feature settings therefore reference the same feature keys as runtime access.
 */
export const VOWOS_CATALOG: { modules: Record<string, VowosModule> } = {
  modules: Object.values(MASTER_FEATURE_CATALOG)
    .filter((feature) => !feature.platform_only)
    .sort((a, b) => a.sort_order - b.sort_order)
    .reduce<Record<string, VowosModule>>((modules, feature) => {
      if (!modules[feature.module]) {
        modules[feature.module] = {
          id: feature.module,
          label: MODULE_LABELS[feature.module] || feature.module.replace(/(^|_)(\w)/g, (_, __, c) => ` ${c.toUpperCase()}`).trim(),
          features: {},
        };
      }
      modules[feature.module].features[feature.feature_key] = {
        id: feature.feature_key,
        label: feature.display_name,
        description: feature.description,
        capability: capabilityFor(feature),
        planRecommendation: feature.minimum_plan,
        dependencies: feature.dependencies,
        addOnEligible: ADD_ON_ELIGIBLE.has(feature.feature_key),
        usageCost: feature.category === 'AI' || feature.feature_key === 'integrations.api',
        defaultEnabled: feature.default_enabled,
        beta: feature.beta,
      };
      return modules;
    }, {}),
};

/**
 * Public list prices. `annual` is the monthly-equivalent price when billed on an
 * annual agreement. Enterprise remains configurable through effective pricing
 * in organization_subscriptions for negotiated agreements.
 */
export const PLANS: Record<CommercialPlan, PlanDefinition> = {
  essentials: {
    label: 'VowOS Essentials',
    monthly: 149,
    annual: 119,
    tagline: 'Run the Boutique',
    description: 'The bridal operating foundation for one store: customers, appointments, sales, payments, inventory and core team workflows.',
    bestFor: 'Independent bridal and formalwear retailers replacing disconnected point tools.',
    highlights: [
      'Bridal CRM, appointments and reminders',
      'POS, orders, invoices, payments and refunds',
      'Inventory, designers and vendors',
      'Team directory and core reporting',
    ],
    includedFeatures: includedFeaturesForPlan('essentials'),
    includedUsers: 5,
    includedLocations: 1,
  },
  growth: {
    label: 'VowOS Growth',
    monthly: 249,
    annual: 199,
    tagline: 'Automate the Journey',
    description: 'Adds the workflows that reduce follow-up work and operational friction as appointment volume and staff grow.',
    bestFor: 'Growing boutiques that need stronger booking, purchasing, follow-up and workforce operations.',
    highlights: [
      'Everything in Essentials',
      'Online booking, deposits, waitlist and fitting-room resources',
      'Customer tasks, follow-up and workflow automation',
      'Purchase orders, receiving and inter-location transfers',
      'Quotes, commissions, timeclock and deeper reports',
    ],
    includedFeatures: includedFeaturesForPlan('growth'),
    includedUsers: 15,
    includedLocations: 2,
  },
  pro: {
    label: 'VowOS Pro',
    monthly: 349,
    annual: 279,
    tagline: 'Connect Commerce & Growth',
    description: 'Connects ecommerce, marketing, finance and multi-location intelligence to the same operating data used in the boutique.',
    bestFor: 'Multi-location or omnichannel retailers that want growth analytics without a disconnected marketing stack.',
    highlights: [
      'Everything in Growth',
      'Shopify and connected-commerce workflows',
      'Google/Meta, attribution and cost-per-lead analytics',
      'Customer segmentation, lifetime value and advanced reports',
      'Payroll/commission operations and accounting integration entitlement',
    ],
    includedFeatures: includedFeaturesForPlan('pro'),
    includedUsers: 35,
    includedLocations: 5,
  },
  enterprise: {
    label: 'VowOS Enterprise',
    monthly: 499,
    annual: 399,
    tagline: 'Operate the Portfolio',
    description: 'Full-platform controls for organizations running multiple brands, locations and high-volume operations with advanced intelligence and extensibility.',
    bestFor: 'Regional groups, multi-brand operators and retailers that need API access, portfolio reporting and advanced AI capabilities.',
    highlights: [
      'Everything in Pro',
      'Unlimited users and locations under the contracted organization',
      'Developer API entitlement and custom report builder',
      'AI advisor, forecasting and competitor intelligence',
      'Enterprise marketing, ROAS and organization-wide reporting',
    ],
    includedFeatures: includedFeaturesForPlan('enterprise'),
    includedUsers: 'unlimited',
    includedLocations: 'unlimited',
  },
};

export function monthlyPriceCentsForPlan(planId: string): number | null {
  const normalized = planId.trim().toLowerCase();
  if (normalized === 'comped') return 0;
  if (normalized === 'starter') return PLANS.essentials.monthly * 100;
  if (normalized === 'elite') return PLANS.enterprise.monthly * 100;
  const plan = PLANS[normalized as CommercialPlan];
  return plan ? Math.round(plan.monthly * 100) : null;
}

export function isFeatureIncluded(plan: CommercialPlan, featureKey: FeatureKey): boolean {
  return PLANS[plan].includedFeatures.includes(featureKey);
}
