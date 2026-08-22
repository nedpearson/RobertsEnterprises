import { PLANS, type CommercialPlan } from '@/config/commercialCatalog';
import { supabase } from '@/lib/supabase';
import { entitlementService as canonicalEntitlementService } from '@/lib/features/entitlementService';

/**
 * @deprecated Compatibility facade for older imports. New code must use
 * `@/lib/features/entitlementService`, which resolves the master feature catalog
 * against canonical `organization_subscriptions`.
 */
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
  overrides: Record<string, boolean>;
  grandfatheredFeatures: string[];
  activeTrials: Record<string, { endDate?: string; end_date?: string }>;
  usage: Record<string, { current?: number; limit?: number }>;
  industryPack: string;
}

async function resolveBusinessId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data, error } = await supabase
    .from('business_memberships')
    .select('business_id')
    .eq('user_id', auth.user.id)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.business_id || null;
}

export async function fetchTenantSubscription(businessId?: string): Promise<TenantSubscriptionState | null> {
  const resolvedBusinessId = await resolveBusinessId(businessId);
  if (!resolvedBusinessId) return null;

  const raw = await canonicalEntitlementService.fetchRawState(resolvedBusinessId);
  const statusMap: Record<string, TenantSubscriptionState['status']> = {
    ACTIVE: 'active',
    COMPED: 'active',
    TRIALING: 'trialing',
    PAST_DUE: 'past_due',
    SUSPENDED: 'suspended',
    CANCELED: 'canceled',
  };

  return {
    plan: raw.plan,
    status: statusMap[raw.status] || 'canceled',
    addons: raw.addons,
    overrides: raw.overrides,
    grandfatheredFeatures: raw.grandfatheredFeatures,
    activeTrials: raw.activeTrials,
    usage: raw.usageLimits,
    industryPack: raw.industryPack,
  };
}

export async function assertEntitlement(featureKey: string, businessId?: string): Promise<void> {
  const subscription = await fetchTenantSubscription(businessId);
  const result = EntitlementService.resolveEntitlement(subscription, featureKey);
  if (['DISABLED', 'SUSPENDED', 'LIMIT_REACHED'].includes(result.status)) {
    throw new Error(`Entitlement denied: ${result.reason}`);
  }
}

/**
 * Pure compatibility resolver retained for old tests/callers. Runtime route and
 * navigation enforcement must use the canonical feature entitlement service.
 */
export class EntitlementService {
  static resolveEntitlement(
    subscription: TenantSubscriptionState | null | undefined,
    featureKey: string,
  ): EntitlementResult {
    if (!subscription) {
      return { status: 'DISABLED', reason: 'No active subscription found.', upgradeRequired: true };
    }

    if (['past_due', 'suspended', 'canceled'].includes(subscription.status)) {
      return {
        status: 'SUSPENDED',
        reason: `Subscription status is ${subscription.status.replace('_', ' ')}.`,
      };
    }

    if (subscription.overrides[featureKey] === true) {
      return { status: 'ENTERPRISE_OVERRIDE', reason: 'Access granted by VowOS platform override.' };
    }
    if (subscription.overrides[featureKey] === false) {
      return { status: 'DISABLED', reason: 'Access disabled by VowOS platform override.' };
    }

    if (subscription.grandfatheredFeatures.includes(featureKey)) {
      return { status: 'GRANDFATHERED', reason: 'Access retained by commercial agreement.' };
    }

    const trial = subscription.activeTrials[featureKey];
    const trialEnd = trial?.endDate || trial?.end_date;
    if (trialEnd && new Date(trialEnd).getTime() > Date.now()) {
      return { status: 'TRIAL', reason: 'Access granted by active feature trial.' };
    }

    const usage = subscription.usage[featureKey];
    if (
      usage &&
      typeof usage.current === 'number' &&
      typeof usage.limit === 'number' &&
      usage.current >= usage.limit
    ) {
      return {
        status: 'LIMIT_REACHED',
        reason: `Usage limit reached for ${featureKey}.`,
        usage: usage.current,
        limit: usage.limit,
        upgradeRequired: true,
      };
    }

    const planConfig = PLANS[subscription.plan];
    if (planConfig?.includedFeatures.includes(featureKey as never)) {
      return { status: 'ENABLED', reason: `Included in ${planConfig.label}.`, plan: subscription.plan };
    }

    if (subscription.addons.includes(featureKey)) {
      return { status: 'ENABLED', reason: 'Access granted by active add-on.', addon: featureKey };
    }

    return { status: 'DISABLED', reason: 'Feature not included in current subscription.', upgradeRequired: true };
  }

  static can(subscription: TenantSubscriptionState | null | undefined, featureKey: string): boolean {
    return ['ENABLED', 'TRIAL', 'GRANDFATHERED', 'ENTERPRISE_OVERRIDE'].includes(
      this.resolveEntitlement(subscription, featureKey).status,
    );
  }
}
