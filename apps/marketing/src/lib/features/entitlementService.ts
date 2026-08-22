import { FeatureKey, getFeature, getAllFeatures } from './featureCatalog';
import { supabase } from '@/lib/supabase';

export type FeatureState =
  | 'AVAILABLE'
  | 'CUSTOMER_ENABLED'
  | 'CUSTOMER_DISABLED'
  | 'PLAN_LOCKED'
  | 'PLATFORM_ENABLED'
  | 'PLATFORM_DISABLED'
  | 'REQUIRED'
  | 'TRIAL'
  | 'BETA'
  | 'COMPLIMENTARY'
  | 'CUSTOM';

export interface EntitlementContext {
  organizationId?: string;
  locationId?: string;
  userId?: string;
}

export interface ResolvedFeature {
  key: FeatureKey;
  state: FeatureState;
  isEffectivelyEnabled: boolean;
  reason: string;
}

export type CanonicalCommercialPlan = 'essentials' | 'growth' | 'pro' | 'enterprise';
export type CanonicalSubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | 'COMPED';

export interface RawEntitlementState {
  plan: CanonicalCommercialPlan;
  status: CanonicalSubscriptionStatus;
  accountType: string;
  addons: string[];
  grandfatheredFeatures: string[];
  activeTrials: Record<string, { endDate?: string; end_date?: string }>;
  usageLimits: Record<string, { current?: number; limit?: number }>;
  industryPack: string;
  overrides: Record<string, boolean>;
  customerToggles: Record<string, boolean>;
}

let cache: { orgId: string; timestamp: number; data: RawEntitlementState } | null = null;
const CACHE_TTL_MS = 30_000;
const PLAN_HIERARCHY: CanonicalCommercialPlan[] = ['essentials', 'growth', 'pro', 'enterprise'];
const BLOCKED_STATUSES = new Set<CanonicalSubscriptionStatus>(['PAST_DUE', 'SUSPENDED', 'CANCELED']);

function normalizePlan(value: unknown): CanonicalCommercialPlan {
  const plan = String(value || '').trim().toLowerCase();
  if (plan === 'growth' || plan === 'pro' || plan === 'enterprise') return plan;
  if (plan === 'elite' || plan === 'comped') return 'enterprise';
  // `starter` is a deprecated predecessor of Essentials. New records must use Essentials.
  return 'essentials';
}

function normalizeStatus(value: unknown, accountType?: unknown): CanonicalSubscriptionStatus {
  if (String(accountType || '').toUpperCase() === 'COMPED') return 'COMPED';
  const status = String(value || 'ACTIVE').trim().toUpperCase();
  if (status === 'TRIAL' || status === 'TRIALING') return 'TRIALING';
  if (status === 'PAST_DUE' || status === 'SUSPENDED' || status === 'CANCELED' || status === 'COMPED') return status;
  return 'ACTIVE';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asRecord<T>(value: unknown): Record<string, T> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, T>) : {};
}

function isActiveTrial(raw: RawEntitlementState, featureKey: string): boolean {
  const trial = raw.activeTrials[featureKey];
  if (!trial) return false;
  const end = trial.endDate || trial.end_date;
  return Boolean(end && new Date(end).getTime() > Date.now());
}

export const entitlementService = {
  invalidateCache() {
    cache = null;
  },

  async fetchRawState(organizationId: string): Promise<RawEntitlementState> {
    if (cache && cache.orgId === organizationId && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      return cache.data;
    }

    const [subscriptionResult, overrideResult, preferenceResult] = await Promise.all([
      supabase
        .from('organization_subscriptions')
        .select('plan_id,status,account_type,addons,grandfathered_features,active_trials,usage_limits,industry_pack')
        .eq('business_id', organizationId)
        .maybeSingle(),
      supabase
        .from('organization_feature_overrides')
        .select('feature_key,state')
        .eq('business_id', organizationId),
      supabase
        .from('organization_module_preferences')
        .select('module_id,is_enabled')
        .eq('business_id', organizationId),
    ]);

    if (subscriptionResult.error) throw new Error(`Unable to load subscription: ${subscriptionResult.error.message}`);
    if (overrideResult.error) throw new Error(`Unable to load platform feature overrides: ${overrideResult.error.message}`);
    if (preferenceResult.error) throw new Error(`Unable to load organization feature preferences: ${preferenceResult.error.message}`);

    const subscription = subscriptionResult.data;
    const overrides: Record<string, boolean> = {};
    for (const row of overrideResult.data || []) {
      if (row.state === 'FORCED_ON') overrides[row.feature_key] = true;
      if (row.state === 'FORCED_OFF') overrides[row.feature_key] = false;
    }

    const customerToggles: Record<string, boolean> = {};
    for (const row of preferenceResult.data || []) {
      customerToggles[row.module_id] = Boolean(row.is_enabled);
    }

    const state: RawEntitlementState = {
      plan: normalizePlan(subscription?.plan_id),
      status: subscription ? normalizeStatus(subscription.status, subscription.account_type) : 'CANCELED',
      accountType: String(subscription?.account_type || 'PAID').toUpperCase(),
      addons: asStringArray(subscription?.addons),
      grandfatheredFeatures: asStringArray(subscription?.grandfathered_features),
      activeTrials: asRecord(subscription?.active_trials),
      usageLimits: asRecord(subscription?.usage_limits),
      industryPack: String(subscription?.industry_pack || 'bridal'),
      overrides,
      customerToggles,
    };

    cache = { orgId: organizationId, timestamp: Date.now(), data: state };
    return state;
  },

  async resolve(context: EntitlementContext, featureKey: FeatureKey): Promise<ResolvedFeature> {
    if (!context.organizationId) {
      return { key: featureKey, state: 'PLAN_LOCKED', isEffectivelyEnabled: false, reason: 'No organization context' };
    }

    const feature = getFeature(featureKey);
    if (!feature) {
      return { key: featureKey, state: 'PLAN_LOCKED', isEffectivelyEnabled: false, reason: 'Unknown feature' };
    }

    const raw = await this.fetchRawState(context.organizationId);

    // Platform operator overrides are explicit contractual controls and take precedence.
    if (raw.overrides[featureKey] === true) {
      return { key: featureKey, state: 'PLATFORM_ENABLED', isEffectivelyEnabled: true, reason: 'Enabled by VowOS platform override' };
    }
    if (raw.overrides[featureKey] === false) {
      return { key: featureKey, state: 'PLATFORM_DISABLED', isEffectivelyEnabled: false, reason: 'Disabled by VowOS platform override' };
    }

    // Billing/account state is enforced before ordinary plan entitlement.
    if (BLOCKED_STATUSES.has(raw.status)) {
      return {
        key: featureKey,
        state: 'PLAN_LOCKED',
        isEffectivelyEnabled: false,
        reason: `Subscription status is ${raw.status.toLowerCase().replace('_', ' ')}`,
      };
    }

    const explicitlyGranted = raw.addons.includes(featureKey);
    const grandfathered = raw.grandfatheredFeatures.includes(featureKey);
    const trial = isActiveTrial(raw, featureKey);

    const currentIdx = PLAN_HIERARCHY.indexOf(raw.plan);
    const requiredIdx = PLAN_HIERARCHY.indexOf(feature.minimum_plan);
    const isPlanEntitled = currentIdx >= requiredIdx;

    if (!isPlanEntitled && !explicitlyGranted && !grandfathered && !trial) {
      return {
        key: featureKey,
        state: 'PLAN_LOCKED',
        isEffectivelyEnabled: false,
        reason: `Requires ${feature.minimum_plan} plan or an explicit add-on`,
      };
    }

    // Parent/dependency checks still apply to plan, trial, grandfathered and add-on access.
    if (feature.parent_feature_key) {
      const parentResolution = await this.resolve(context, feature.parent_feature_key);
      if (!parentResolution.isEffectivelyEnabled) {
        return {
          key: featureKey,
          state: 'CUSTOMER_DISABLED',
          isEffectivelyEnabled: false,
          reason: `Parent feature ${feature.parent_feature_key} is disabled`,
        };
      }
    }

    for (const depKey of feature.dependencies || []) {
      const dependency = await this.resolve(context, depKey);
      if (!dependency.isEffectivelyEnabled) {
        return {
          key: featureKey,
          state: 'CUSTOMER_DISABLED',
          isEffectivelyEnabled: false,
          reason: `Dependency ${depKey} is disabled`,
        };
      }
    }

    const usage = raw.usageLimits[featureKey];
    if (usage && typeof usage.limit === 'number' && typeof usage.current === 'number' && usage.current >= usage.limit) {
      return { key: featureKey, state: 'PLAN_LOCKED', isEffectivelyEnabled: false, reason: 'Usage limit reached' };
    }

    // Required features cannot be hidden by tenant configuration after entitlement succeeds.
    if (feature.required) {
      return { key: featureKey, state: 'REQUIRED', isEffectivelyEnabled: true, reason: 'Core capability required by VowOS' };
    }

    const customerPref = raw.customerToggles[featureKey];
    if (customerPref === false) {
      return { key: featureKey, state: 'CUSTOMER_DISABLED', isEffectivelyEnabled: false, reason: 'Turned off by organization' };
    }
    if (customerPref === true) {
      return { key: featureKey, state: 'CUSTOMER_ENABLED', isEffectivelyEnabled: true, reason: 'Turned on by organization' };
    }

    if (trial) return { key: featureKey, state: 'TRIAL', isEffectivelyEnabled: true, reason: 'Active feature trial' };
    if (grandfathered) return { key: featureKey, state: 'COMPLIMENTARY', isEffectivelyEnabled: true, reason: 'Grandfathered commercial entitlement' };
    if (explicitlyGranted) return { key: featureKey, state: 'CUSTOM', isEffectivelyEnabled: true, reason: 'Active add-on entitlement' };

    return {
      key: featureKey,
      state: 'AVAILABLE',
      isEffectivelyEnabled: feature.default_enabled,
      reason: feature.default_enabled ? 'Enabled by default' : 'Available but disabled by default',
    };
  },

  async canUse(context: EntitlementContext, featureKey: FeatureKey): Promise<boolean> {
    return (await this.resolve(context, featureKey)).isEffectivelyEnabled;
  },

  async require(context: EntitlementContext, featureKey: FeatureKey): Promise<void> {
    const result = await this.resolve(context, featureKey);
    if (!result.isEffectivelyEnabled) {
      throw new Error(`Unauthorized: Feature ${featureKey} is not accessible. Reason: ${result.reason}`);
    }
  },

  async resolveAll(context: EntitlementContext): Promise<Record<FeatureKey, ResolvedFeature>> {
    const map: Partial<Record<FeatureKey, ResolvedFeature>> = {};
    for (const feature of getAllFeatures()) {
      map[feature.feature_key] = await this.resolve(context, feature.feature_key);
    }
    return map as Record<FeatureKey, ResolvedFeature>;
  },

  async setCustomerToggle(organizationId: string, featureKey: FeatureKey, enabled: boolean) {
    const feature = getFeature(featureKey);
    if (!feature) throw new Error(`Unknown feature: ${featureKey}`);
    if (!feature.customer_configurable || feature.required) {
      throw new Error(`${feature.display_name} cannot be changed by the organization.`);
    }

    // A tenant preference may hide/show an already entitled feature, but it cannot
    // create a paid entitlement. Verify the plan/add-on/trial grant without allowing
    // the customer preference itself to influence the decision.
    const raw = await this.fetchRawState(organizationId);
    if (BLOCKED_STATUSES.has(raw.status)) throw new Error(`Subscription status is ${raw.status}.`);

    const currentIdx = PLAN_HIERARCHY.indexOf(raw.plan);
    const requiredIdx = PLAN_HIERARCHY.indexOf(feature.minimum_plan);
    const commerciallyEntitled =
      currentIdx >= requiredIdx ||
      raw.addons.includes(featureKey) ||
      raw.grandfatheredFeatures.includes(featureKey) ||
      isActiveTrial(raw, featureKey) ||
      raw.overrides[featureKey] === true;

    if (!commerciallyEntitled) {
      throw new Error(`${feature.display_name} requires ${feature.minimum_plan} or an approved add-on.`);
    }

    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('organization_module_preferences')
      .upsert(
        {
          business_id: organizationId,
          module_id: featureKey,
          is_enabled: enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id,module_id' },
      );

    if (error) throw error;

    const { error: auditError } = await supabase.from('audit_logs').insert({
      entity_type: 'feature',
      entity_id: featureKey,
      action: 'FEATURE_SETTING_CHANGED',
      user_id: auth?.user?.id ?? null,
      before_value: { organization_id: organizationId },
      after_value: { organization_id: organizationId, enabled },
      reason: 'Organization module preference changed',
    });
    if (auditError) console.error('Feature preference saved but audit logging failed', auditError);

    this.invalidateCache();
  },
};
