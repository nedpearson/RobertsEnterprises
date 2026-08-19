export type OnboardingLevelId = 'self_service' | 'guided' | 'vip' | 'custom';

export interface OnboardingLevel {
  id: OnboardingLevelId;
  name: string;
  description: string;
  includesImplementationOwner: boolean;
}

export const ONBOARDING_LEVELS: Record<OnboardingLevelId, OnboardingLevel> = {
  self_service: {
    id: 'self_service',
    name: 'Self-Service',
    description: 'Customer completes most setup using guided checklists and automated validation.',
    includesImplementationOwner: false
  },
  guided: {
    id: 'guided',
    name: 'Guided',
    description: 'Customer completes setup with structured VowOS assistance and milestone reviews.',
    includesImplementationOwner: false
  },
  vip: {
    id: 'vip',
    name: 'VIP / White Glove',
    description: 'Dedicated Implementation Owner handles configuration, connections, and migration.',
    includesImplementationOwner: true
  },
  custom: {
    id: 'custom',
    name: 'Custom Implementation',
    description: 'Tailored enterprise implementation project.',
    includesImplementationOwner: true
  }
};

export type PlanId = 'essentials' | 'growth' | 'pro' | 'enterprise' | 'custom' | 'internal';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  includedLocations: number;
  includedBusinesses: number;
  baselineModules: string[];
}

export const PLAN_REGISTRY: Record<PlanId, Plan> = {
  essentials: {
    id: 'essentials',
    name: 'Essentials',
    description: 'Core boutique management for a single location.',
    monthlyPrice: 199,
    includedLocations: 1,
    includedBusinesses: 1,
    baselineModules: ['appointments', 'customers', 'sales', 'inventory', 'reports']
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'Advanced marketing, multi-location support, and automated follow-ups.',
    monthlyPrice: 399,
    includedLocations: 2,
    includedBusinesses: 1,
    baselineModules: ['appointments', 'customers', 'sales', 'inventory', 'reports', 'growth', 'communications']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Full operational control, team commissions, and API access.',
    monthlyPrice: 799,
    includedLocations: 5,
    includedBusinesses: 1,
    baselineModules: ['appointments', 'customers', 'sales', 'inventory', 'reports', 'growth', 'communications', 'team', 'commissions', 'integrations']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale for national brands and franchises.',
    monthlyPrice: 1999,
    includedLocations: 999,
    includedBusinesses: 999,
    baselineModules: ['appointments', 'customers', 'sales', 'inventory', 'reports', 'growth', 'communications', 'team', 'commissions', 'integrations', 'custom_reporting', 'sso']
  },
  custom: {
    id: 'custom',
    name: 'Custom Contract',
    description: 'Custom negotiated terms and entitlements.',
    monthlyPrice: 0,
    includedLocations: 1,
    includedBusinesses: 1,
    baselineModules: []
  },
  internal: {
    id: 'internal',
    name: 'Internal / Comped',
    description: 'Free lifetime access for Roberts Enterprises owned brands.',
    monthlyPrice: 0,
    includedLocations: 999,
    includedBusinesses: 999,
    baselineModules: ['all']
  }
};
