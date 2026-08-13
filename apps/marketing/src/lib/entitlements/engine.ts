import { PlatformRole, OrganizationRole, hasMinimumRole } from '../auth/roles';
import { getFeature } from '../registry/features';
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
 * 4. Organization Subscription (minimum plan check)
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
  let planAllows = false;
  if (hasGlobalOverride || specificOverride === 'FORCED_ON') {
    planAllows = true;
  } else {
    // If subscription is invalid (Canceled/Past Due) and no override was hit, block access
    if (isSubscriptionInvalid) {
      return false;
    }

    // Determine if the current plan meets the minimum plan requirement
    const orgPlan = context.organizationPlan || 'starter';
    const planHierarchy = ['starter', 'pro', 'elite', 'comped'];
    const minPlanIndex = planHierarchy.indexOf(feature.minimumPlan || 'starter');
    const orgPlanIndex = planHierarchy.indexOf(orgPlan);
    
    if (orgPlanIndex >= minPlanIndex) {
      planAllows = true;
    }
  }

  if (!planAllows) return false;

  // 5. Feature Enabled State
  // (In a full implementation, you'd check a tenant-specific toggle here if configurable=true)
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
