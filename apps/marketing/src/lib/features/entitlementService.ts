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

// In-memory cache to prevent excessive DB calls during render cycles
let cache: {
  orgId: string;
  timestamp: number;
  data: {
    plan: string;
    overrides: Record<string, boolean>;
    customerToggles: Record<string, boolean>;
  }
} | null = null;
const CACHE_TTL_MS = 30000;

export const entitlementService = {
  /**
   * Clears the entitlement cache. Must be called after mutation.
   */
  invalidateCache() {
    cache = null;
  },

  /**
   * Fetches raw state from the database.
   */
  async fetchRawState(organizationId: string) {
    if (cache && cache.orgId === organizationId && (Date.now() - cache.timestamp < CACHE_TTL_MS)) {
      return cache.data;
    }

    // 1. Get Platform Subscription Entitlement & Overrides
    // Using `tenant_subscriptions` but mapped by business_id in our schema
    const { data: subData } = await supabase
      .from('tenant_subscriptions')
      .select('plan, overrides')
      .eq('business_id', organizationId)
      .maybeSingle();

    const plan = subData?.plan || 'essentials';
    const overrides = subData?.overrides || {};

    // 2. Get Customer Configuration
    // We'll read from organization_module_preferences or fallback
    const { data: prefData } = await supabase
      .from('organization_module_preferences')
      .select('module_id, is_enabled')
      .eq('organization_id', organizationId);

    const customerToggles: Record<string, boolean> = {};
    if (prefData) {
      prefData.forEach(p => {
        customerToggles[p.module_id] = p.is_enabled;
      });
    }

    const state = { plan, overrides, customerToggles };
    cache = { orgId: organizationId, timestamp: Date.now(), data: state };
    return state;
  },

  /**
   * Resolves the authoritative state for a specific feature key.
   */
  async resolve(context: EntitlementContext, featureKey: FeatureKey): Promise<ResolvedFeature> {
    if (!context.organizationId) {
      return { key: featureKey, state: 'PLAN_LOCKED', isEffectivelyEnabled: false, reason: 'No organization context' };
    }

    const feature = getFeature(featureKey);
    if (!feature) {
      return { key: featureKey, state: 'PLAN_LOCKED', isEffectivelyEnabled: false, reason: 'Unknown feature' };
    }

    const raw = await this.fetchRawState(context.organizationId);
    
    // 1. Platform Overrides (Highest Precedence)
    if (raw.overrides[featureKey] === true) {
      return { key: featureKey, state: 'PLATFORM_ENABLED', isEffectivelyEnabled: true, reason: 'Forced ON by Platform Super Admin' };
    }
    if (raw.overrides[featureKey] === false) {
      return { key: featureKey, state: 'PLATFORM_DISABLED', isEffectivelyEnabled: false, reason: 'Forced OFF by Platform Super Admin' };
    }

    // 2. Subscription Check
    const planHierarchy = ['essentials', 'growth', 'pro', 'enterprise'];
    const currentIdx = planHierarchy.indexOf(raw.plan);
    const requiredIdx = planHierarchy.indexOf(feature.minimum_plan);
    const isPlanEntitled = currentIdx >= requiredIdx;

    if (!isPlanEntitled) {
      return { key: featureKey, state: 'PLAN_LOCKED', isEffectivelyEnabled: false, reason: `Requires ${feature.minimum_plan} plan` };
    }

    // 3. Required Features (Cannot be turned off by customer)
    if (feature.required) {
      return { key: featureKey, state: 'REQUIRED', isEffectivelyEnabled: true, reason: 'Core capability required by VowOS' };
    }

    // 4. Check Parent Feature States (Dependencies)
    if (feature.parent_feature_key) {
      const parentResolution = await this.resolve(context, feature.parent_feature_key);
      if (!parentResolution.isEffectivelyEnabled) {
        return { key: featureKey, state: 'CUSTOMER_DISABLED', isEffectivelyEnabled: false, reason: `Parent feature ${feature.parent_feature_key} is disabled` };
      }
    }
    
    // 5. Check Explicit Dependencies
    if (feature.dependencies) {
      for (const depKey of feature.dependencies) {
        const depResolution = await this.resolve(context, depKey);
        if (!depResolution.isEffectivelyEnabled) {
          return { key: featureKey, state: 'CUSTOMER_DISABLED', isEffectivelyEnabled: false, reason: `Dependency ${depKey} is disabled` };
        }
      }
    }

    // 6. Customer Organization Setting
    const customerPref = raw.customerToggles[featureKey];
    if (customerPref === false) {
      return { key: featureKey, state: 'CUSTOMER_DISABLED', isEffectivelyEnabled: false, reason: 'Turned off by organization' };
    }
    if (customerPref === true) {
      return { key: featureKey, state: 'CUSTOMER_ENABLED', isEffectivelyEnabled: true, reason: 'Turned on by organization' };
    }

    // 7. Default State
    if (feature.default_enabled) {
      return { key: featureKey, state: 'AVAILABLE', isEffectivelyEnabled: true, reason: 'Enabled by default' };
    } else {
      return { key: featureKey, state: 'AVAILABLE', isEffectivelyEnabled: false, reason: 'Available but turned off by default' };
    }
  },

  /**
   * Synchronous shorthand for when we just need a boolean.
   */
  async canUse(context: EntitlementContext, featureKey: FeatureKey): Promise<boolean> {
    const res = await this.resolve(context, featureKey);
    return res.isEffectivelyEnabled;
  },

  /**
   * Validates required features for API endpoints.
   */
  async require(context: EntitlementContext, featureKey: FeatureKey): Promise<void> {
    const res = await this.resolve(context, featureKey);
    if (!res.isEffectivelyEnabled) {
      throw new Error(`Unauthorized: Feature ${featureKey} is not accessible. Reason: ${res.reason}`);
    }
  },

  /**
   * Bulk resolve all features for UI rendering.
   */
  async resolveAll(context: EntitlementContext): Promise<Record<FeatureKey, ResolvedFeature>> {
    const all = getAllFeatures();
    const map: Partial<Record<FeatureKey, ResolvedFeature>> = {};
    for (const f of all) {
      map[f.feature_key] = await this.resolve(context, f.feature_key);
    }
    return map as Record<FeatureKey, ResolvedFeature>;
  },

  /**
   * Persist a customer feature toggle.
   */
  async setCustomerToggle(organizationId: string, featureKey: FeatureKey, enabled: boolean) {
    const { error } = await supabase
      .from('organization_module_preferences')
      .upsert({
        business_id: organizationId,
        organization_id: organizationId,
        module_id: featureKey,
        is_enabled: enabled,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id, module_id' });
      
    if (error) throw error;

    // Create Audit Log (Part 34)
    await supabase.from('audit_logs').insert({
      business_id: organizationId,
      organization_id: organizationId,
      action: 'FEATURE_SETTING_CHANGED',
      entity_type: 'feature',
      resource_type: 'feature',
      resource_id: featureKey,
      metadata: { new_state: enabled, change_source: 'CUSTOMER_OWNER' },
      after_value: { new_state: enabled, change_source: 'CUSTOMER_OWNER' }
    });

    this.invalidateCache();
  }
};
