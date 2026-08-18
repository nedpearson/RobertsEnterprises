import { PlatformRole, OrganizationRole, hasMinimumRole } from '../auth/roles';
import { getFeature, FeatureTier } from '../registry/features';
import { getPlan } from '../registry/plans';

export interface EntitlementContext {
  platformUserRole?: PlatformRole;
  organizationId?: string;
  organizationPlan?: string;
  organizationFeatureOverrides?: Record<string, 'FORCED_ON' | 'FORCED_OFF'>;
  userOrganizationRole?: OrganizationRole;
  userStatus?: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  subscriptionStatus?: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'COMPED';
}

/**
 * Deterministic precedence for resolving access to a feature.
 * 
 * 1. Platform Security Restriction (e.g. Platform Admin routes)
 * 2. Platform Owner Override (ALL_CURRENT_AND_FUTURE_FEATURES)
 * 3. Organization Feature Override (FORCED_ON / FORCED_OFF)
 * 4. Organization Subscription (minimum tier check)
 * 5. Feature Enabled State (defaultEnabled)
 * 6. Role Permission (hasMinimumRole)
 */
export function resolveAccess(
  featureSlug: string,
  context: EntitlementContext
): boolean {
  const feature = getFeature(featureSlug);
  if (!feature) return false;

  // 1. User Status Check
  if (context.userStatus === 'SUSPENDED') {
    return false;
  }

  // 1b. Organization Subscription Status Check
  // Canceled or Past Due subscriptions lose feature access unless overriden by Platform Admin or specific feature overrides
  const isSubscriptionInvalid = context.subscriptionStatus === 'CANCELED' || context.subscriptionStatus === 'PAST_DUE';

  // 2. Platform Security Restriction
  if (featureSlug === 'platform_admin') {
    return context.platformUserRole === PlatformRole.PLATFORM_OWNER || context.platformUserRole === PlatformRole.SUPER_ADMIN;
  }

  // 3. Platform Owner / Super Admin implies full access to tenant features when in support mode
  if (context.platformUserRole === PlatformRole.PLATFORM_OWNER || context.platformUserRole === PlatformRole.SUPER_ADMIN) {
    return true;
  }

  // Handle ALL_CURRENT_AND_FUTURE_FEATURES override (e.g., Roberts Enterprises)
  const hasGlobalOverride = context.organizationFeatureOverrides?.['ALL_CURRENT_AND_FUTURE_FEATURES'] === 'FORCED_ON';
  
  // 3. Organization Feature Override (specific feature)
  const specificOverride = context.organizationFeatureOverrides?.[featureSlug];
  if (specificOverride === 'FORCED_OFF') return false;
  
  // 4. Organization Subscription
  let tierAllows = false;
  if (hasGlobalOverride || specificOverride === 'FORCED_ON') {
    tierAllows = true;
  } else {
    // If subscription is invalid (Canceled/Past Due) and no override was hit, block access
    if (isSubscriptionInvalid) {
      return false;
    }

    // Map old legacy plan strings ('starter', 'pro', 'elite', 'comped') to new tiers
    const planToTier = (planName: string): FeatureTier => {
      const p = planName.toLowerCase();
      if (p === 'elite' || p === 'comped') return 'ENTERPRISE';
      if (p === 'pro') return 'ADVANCED';
      if (p === 'starter') return 'STANDARD';
      // Fallback
      return 'CORE';
    };

    const orgTier = planToTier(context.organizationPlan || 'starter');
    const tierHierarchy: FeatureTier[] = ['CORE', 'STANDARD', 'ADVANCED', 'ENTERPRISE', 'SYSTEM'];
    const minTierIndex = tierHierarchy.indexOf(feature.minimumTier || 'CORE');
    const orgTierIndex = tierHierarchy.indexOf(orgTier);
    
    if (orgTierIndex >= minTierIndex) {
      tierAllows = true;
    }
  }

  if (!tierAllows) return false;

  // 5. Feature Enabled State
  if (!feature.defaultEnabled && !hasGlobalOverride && specificOverride !== 'FORCED_ON') {
    return false;
  }

  // 6. Role Permission
  if (feature.minimumRole && context.userOrganizationRole) {
    if (!hasMinimumRole(context.userOrganizationRole, feature.minimumRole)) {
      return false;
    }
  }

  return true;
}
