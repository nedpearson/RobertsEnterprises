export interface PlanDefinition {
  id: string;
  name: string;
  price: number; // in cents
  billingPeriod: 'monthly' | 'yearly';
  userLimit: number | 'unlimited';
  locationLimit: number | 'unlimited';
  description: string;
}

export const PLAN_REGISTRY: Record<string, PlanDefinition> = {
  comped: {
    id: 'comped',
    name: 'Comped / Internal',
    price: 0,
    billingPeriod: 'monthly',
    userLimit: 'unlimited',
    locationLimit: 'unlimited',
    description: 'Internal platform testing or special access.',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 4900,
    billingPeriod: 'monthly',
    userLimit: 3,
    locationLimit: 1,
    description: 'Essential tools for a single boutique.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9900,
    billingPeriod: 'monthly',
    userLimit: 10,
    locationLimit: 3,
    description: 'Advanced features for growing boutiques.',
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    price: 24900,
    billingPeriod: 'monthly',
    userLimit: 'unlimited',
    locationLimit: 'unlimited',
    description: 'The ultimate suite for large multi-location enterprises.',
  }
};

export function getPlan(planId: string): PlanDefinition {
  return PLAN_REGISTRY[planId] || PLAN_REGISTRY['starter'];
}
