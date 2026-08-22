import {
  MASTER_FEATURE_CATALOG,
  type FeatureCatalogEntry,
} from '@/lib/features/featureCatalog';

export interface VowOSFeature {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: 'core' | 'operations' | 'growth' | 'intelligence' | 'integration' | 'platform';
  icon: string;
  routes: string[];
  minimumPlan: 'essentials' | 'growth' | 'pro' | 'enterprise';
  defaultEnabled: boolean;
  configurable: boolean;
  beta: boolean;
}

const modulePresentation: Record<string, { icon: string; route: string; category: VowOSFeature['category'] }> = {
  appointments: { icon: 'calendar', route: '/appointments', category: 'core' },
  customers: { icon: 'users', route: '/customers', category: 'core' },
  sales: { icon: 'receipt', route: '/sales', category: 'operations' },
  inventory: { icon: 'package', route: '/inventory', category: 'operations' },
  team: { icon: 'users-cog', route: '/team', category: 'operations' },
  growth: { icon: 'megaphone', route: '/growth', category: 'growth' },
  reports: { icon: 'bar-chart-2', route: '/reports', category: 'intelligence' },
  integrations: { icon: 'plug', route: '/settings?tab=integrations', category: 'integration' },
};

function presentationFor(feature: FeatureCatalogEntry) {
  if (feature.platform_only) {
    return { icon: 'shield', route: '/platform', category: 'platform' as const };
  }
  const base = modulePresentation[feature.module] || { icon: 'box', route: '/', category: 'operations' as const };
  if (feature.category === 'AI') return { ...base, icon: 'sparkles', category: 'intelligence' as const };
  return base;
}

/**
 * Presentation-only projection of MASTER_FEATURE_CATALOG.
 *
 * This registry used to maintain an independent list of features, plans and
 * marketing claims. That caused the demo, command palette and pricing pages to
 * advertise capabilities differently from runtime entitlement enforcement.
 */
export const featureList: VowOSFeature[] = Object.values(MASTER_FEATURE_CATALOG)
  .filter((feature) => !feature.platform_only)
  .sort((a, b) => a.sort_order - b.sort_order)
  .map((feature) => {
    const presentation = presentationFor(feature);
    return {
      id: feature.feature_key,
      slug: feature.feature_key,
      name: feature.display_name,
      shortDescription: feature.description,
      longDescription: feature.description,
      category: presentation.category,
      icon: presentation.icon,
      routes: [presentation.route],
      minimumPlan: feature.minimum_plan,
      defaultEnabled: feature.default_enabled,
      configurable: feature.customer_configurable,
      beta: feature.beta,
    };
  });

export const featureRegistry: Record<string, VowOSFeature> = Object.fromEntries(
  featureList.map((feature) => [feature.id, feature]),
);
