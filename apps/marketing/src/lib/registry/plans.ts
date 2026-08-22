import type { FeatureTier } from './features';

export interface PlanDefinition {
  id: string;
  name: string;
  price: number; // in cents
  billingPeriod: 'monthly' | 'yearly';
  userLimit: number | 'unlimited';
  locationLimit: number | 'unlimited';
  description: string;
  tier: FeatureTier;
  legacy?: boolean;
}

/**
 * Canonical commercial plan registry.
 *
 * The database/billing layer uses essentials -> growth -> pro -> enterprise.
 * `starter` and `elite` are retained only as compatibility aliases for older
 * persisted rows/UI code and must not be used for new subscriptions.
 */
export const PLAN_REGISTRY: Record<string, PlanDefinition> = {
  comped: {
    id: 'comped',
    name: 'Comped / Internal',
    price: 0,
    billingPeriod: 'monthly',
    userLimit: 'unlimited',
    locationLimit: 'unlimited',
    description: 'Internal platform testing or special access.',
    tier: 'ENTERPRISE',
  },
  essentials: {
    id: 'essentials',
    name: 'Essentials',
    price: 4900,
    billingPeriod: 'monthly',
    userLimit: 3,
    locationLimit: 1,
    description: 'Essential tools for a single boutique.',
    tier: 'CORE',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 9900,
    billingPeriod: 'monthly',
    userLimit: 10,
    locationLimit: 3,
    description: 'Growth tools for expanding boutiques and teams.',
    tier: 'STANDARD',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 14900,
    billingPeriod: 'monthly',
    userLimit: 25,
    locationLimit: 10,
    description: 'Advanced features for multi-location operators.',
    tier: 'ADVANCED',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 24900,
    billingPeriod: 'monthly',
    userLimit: 'unlimited',
    locationLimit: 'unlimited',
    description: 'Full VowOS capability for large multi-location enterprises.',
    tier: 'ENTERPRISE',
  },

  // Compatibility-only legacy IDs. New provisioning must use the canonical IDs above.
  starter: {
    id: 'starter',
    name: 'Starter (Legacy)',
    price: 4900,
    billingPeriod: 'monthly',
    userLimit: 3,
    locationLimit: 1,
    description: 'Legacy Starter plan retained for existing persisted subscriptions.',
    tier: 'STANDARD',
    legacy: true,
  },
  elite: {
    id: 'elite',
    name: 'Elite (Legacy)',
    price: 24900,
    billingPeriod: 'monthly',
    userLimit: 'unlimited',
    locationLimit: 'unlimited',
    description: 'Legacy Elite plan retained for existing persisted subscriptions.',
    tier: 'ENTERPRISE',
    legacy: true,
  },
};

export function getPlan(planId: string | null | undefined): PlanDefinition {
  const normalized = (planId || '').trim().toLowerCase();
  return PLAN_REGISTRY[normalized] || PLAN_REGISTRY.essentials;
}

export function getPlanTier(planId: string | null | undefined): FeatureTier {
  return getPlan(planId).tier;
}

export function isLegacyPlan(planId: string | null | undefined): boolean {
  return Boolean(getPlan(planId).legacy);
}
