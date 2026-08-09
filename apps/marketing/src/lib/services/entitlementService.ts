import { CommercialPlan, VOWOS_CATALOG, PLANS } from '@/config/commercialCatalog';
import { supabase } from '@/lib/supabase';

export type EntitlementStatus = 
  | 'ENABLED'
  | 'DISABLED'
  | 'TRIAL'
  | 'LIMIT_REACHED'
  | 'GRANDFATHERED'
  | 'ENTERPRISE_OVERRIDE'
  | 'SUSPENDED';

export interface EntitlementResult {
  status: EntitlementStatus;
  reason: string;
  plan?: CommercialPlan;
  addon?: string;
  usage?: number;
  limit?: number;
  upgradeRequired?: boolean;
}

export interface TenantSubscriptionState {
  plan: CommercialPlan;
  status: 'active' | 'past_due' | 'suspended' | 'canceled' | 'trialing';
  addons: string[];
  overrides: Record<string, boolean>; // featureKey -> is enabled via enterprise override
  grandfatheredFeatures: string[];
  activeTrials: Record<string, { endDate: string }>; // featureKey -> trial state
  usage: Record<string, { current: number; limit: number }>; // For limits like locations or AI
  industryPack: string;
}

let cachedSubscription: { state: TenantSubscriptionState; timestamp: number } | null = null;
const CACHE_TTL_MS = 60000; // 1 minute

export async function fetchTenantSubscription(businessId?: string): Promise<TenantSubscriptionState | null> {
  if (!businessId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: membership } = await supabase.from('business_memberships').select('business_id').eq('user_id', user.id).maybeSingle();
    if (!membership) return null;
    businessId = membership.business_id;
  }

  // Use cache if possible
  if (cachedSubscription && (Date.now() - cachedSubscription.timestamp < CACHE_TTL_MS)) {
    return cachedSubscription.state;
  }

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error || !data) return null;

  const state: TenantSubscriptionState = {
    plan: data.plan as CommercialPlan,
    status: data.status,
    addons: data.addons || [],
    overrides: data.overrides || {},
    grandfatheredFeatures: data.grandfathered_features || [],
    activeTrials: data.active_trials || {},
    usage: data.usage_limits || {},
    industryPack: data.industry_pack || 'bridal'
  };

  cachedSubscription = { state, timestamp: Date.now() };
  return state;
}

export async function assertEntitlement(featureKey: string, businessId?: string): Promise<void> {
  const sub = await fetchTenantSubscription(businessId);
  const result = EntitlementService.resolveEntitlement(sub, featureKey);
  if (result.status === 'DISABLED' || result.status === 'SUSPENDED' || result.status === 'LIMIT_REACHED') {
    throw new Error(`Entitlement Denied: ${result.reason}`);
  }
}

export class EntitlementService {
  /**
   * Resolves whether a tenant has access to a specific commercial feature
   */
  static resolveEntitlement(
    subscription: TenantSubscriptionState | null | undefined,
    featureKey: string
  ): EntitlementResult {
    // If no subscription is found, restrict access
    if (!subscription) {
      return {
        status: 'DISABLED',
        reason: 'No active subscription found.',
        upgradeRequired: true
      };
    }

    // 1. Check Suspension
    if (subscription.status === 'suspended') {
      return {
        status: 'SUSPENDED',
        reason: 'Subscription is suspended due to billing failure or policy violation.',
      };
    }

    // 2. Check Enterprise Overrides (Highest priority)
    if (subscription.overrides && subscription.overrides[featureKey] !== undefined) {
      if (subscription.overrides[featureKey]) {
        return {
          status: 'ENTERPRISE_OVERRIDE',
          reason: 'Access granted via enterprise contract override.',
        };
      } else {
        return {
          status: 'DISABLED',
          reason: 'Access explicitly disabled via enterprise contract override.',
        };
      }
    }

    // 3. Check Grandfathered Features
    if (subscription.grandfatheredFeatures && subscription.grandfatheredFeatures.includes(featureKey)) {
      return {
        status: 'GRANDFATHERED',
        reason: 'Access retained from a previous commercial agreement.',
      };
    }

    // 4. Check Active Trials
    if (subscription.activeTrials && subscription.activeTrials[featureKey]) {
      const trial = subscription.activeTrials[featureKey];
      if (new Date(trial.endDate) > new Date()) {
        return {
          status: 'TRIAL',
          reason: 'Access granted via active trial.',
        };
      }
      // If trial is expired, we continue evaluating because they might have bought it
    }

    // 5. Check Base Plan Included Features
    const planConfig = PLANS[subscription.plan];
    if (planConfig && planConfig.includedFeatures.includes(featureKey)) {
      
      // 5a. Check Usage Limits if applicable
      if (subscription.usage && subscription.usage[featureKey]) {
        const usage = subscription.usage[featureKey];
        if (usage.current >= usage.limit) {
          return {
            status: 'LIMIT_REACHED',
            reason: `Usage limit reached for ${featureKey}.`,
            usage: usage.current,
            limit: usage.limit,
            upgradeRequired: true
          };
        }
      }

      return {
        status: 'ENABLED',
        reason: `Included in ${planConfig.label}.`,
        plan: subscription.plan,
      };
    }

    // 6. Check Add-ons
    if (subscription.addons && subscription.addons.includes(featureKey)) {
      return {
        status: 'ENABLED',
        reason: 'Access granted via active add-on subscription.',
        addon: featureKey
      };
    }

    // If we reach here, the feature is not entitled
    return {
      status: 'DISABLED',
      reason: 'Feature not included in current subscription.',
      upgradeRequired: true
    };
  }

  /**
   * Helper to strictly boolean-check access for UI rendering
   */
  static can(subscription: TenantSubscriptionState | null | undefined, featureKey: string): boolean {
    const result = this.resolveEntitlement(subscription, featureKey);
    return ['ENABLED', 'TRIAL', 'GRANDFATHERED', 'ENTERPRISE_OVERRIDE'].includes(result.status);
  }
}
