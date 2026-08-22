import type { FeatureTier } from './features';
import { PLANS as COMMERCIAL_PLANS } from '@/config/commercialCatalog';

export interface PlanDefinition {
  id: string;
  name: string;
  price: number; // monthly list price in cents
  billingPeriod: 'monthly' | 'yearly';
  userLimit: number | 'unlimited';
  locationLimit: number | 'unlimited';
  description: string;
  tier: FeatureTier;
  legacy?: boolean;
}

function fromCommercialPlan(
  id: 'essentials' | 'growth' | 'pro' | 'enterprise',
  tier: FeatureTier,
): PlanDefinition {
  const plan = COMMERCIAL_PLANS[id];
  return {
    id,
    name: plan.label,
    price: Math.round(plan.monthly * 100),
    billingPeriod: 'monthly',
    userLimit: plan.includedUsers,
    locationLimit: plan.includedLocations,
    description: plan.description,
    tier,
  };
}

/**
 * Runtime compatibility registry. Commercial price, user and location limits are
 * projected from config/commercialCatalog so platform admin, MRR and public
 * pricing cannot maintain different price books.
 */
export const PLAN_REGISTRY: Record<string, PlanDefinition> = {
  comped: {
    id: 'comped',
    name: 'Comped / Internal',
    price: 0,
    billingPeriod: 'monthly',
    userLimit: 'unlimited',
    locationLimit: 'unlimited',
    description: 'Internal or contractually complimentary VowOS access.',
    tier: 'ENTERPRISE',
  },
  essentials: fromCommercialPlan('essentials', 'CORE'),
  growth: fromCommercialPlan('growth', 'STANDARD'),
  pro: fromCommercialPlan('pro', 'ADVANCED'),
  enterprise: fromCommercialPlan('enterprise', 'ENTERPRISE'),

  // Compatibility-only IDs. New provisioning must use canonical plan IDs.
  starter: {
    ...fromCommercialPlan('essentials', 'CORE'),
    id: 'starter',
    name: 'Starter (Legacy)',
    legacy: true,
  },
  elite: {
    ...fromCommercialPlan('enterprise', 'ENTERPRISE'),
    id: 'elite',
    name: 'Elite (Legacy)',
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
