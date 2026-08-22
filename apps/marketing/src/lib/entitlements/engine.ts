import { PlatformRole, OrganizationRole, hasMinimumRole } from '../auth/roles';
import { getFeature, FeatureTier } from '../registry/features';
import { getPlanTier } from '../registry/plans';

export interface EntitlementContext {
  platformUserRole?: PlatformRole;
  organizationId?: string;
  organizationPlan?: string;
  organizationFeatureOverrides?: Record<string, 'FORCED_ON' | 'FORCED_OFF'>;
  userOrganizationRole?: OrganizationRole;
  userStatus?: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  subscriptionStatus?: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'COMPED';
  hiddenModules?: string[];
}

/**
 * Maps feature slugs to their Workspace/Module ID
 */
export function getModuleForFeature(featureSlug: string): string {
  if (featureSlug === 'dashboard' || featureSlug === 'overview') return 'today';
  if (featureSlug === 'schedule' || featureSlug === 'booking') return 'appointments';
  if (featureSlug === 'customers' || featureSlug === 'communications') return 'customers';
  if (featureSlug.startsWith('sales.') || featureSlug === 'invoices' || featureSlug.startsWith('purchasing.')) return 'sales';
  if (featureSlug === 'inventory' || featureSlug === 'catalog' || featureSlug.startsWith('transfers.') || featureSlug.startsWith('alterations.')) return 'inventory';
  if (featureSlug === 'staff' || featureSlug === 'timeclock' || featureSlug.startsWith('payroll.')) return 'team';
  if (featureSlug.startsWith('growth.')) return 'growth';
  if (featureSlug.startsWith('reports.')) return 'reports';
  return featureSlug;
}

/**
 * Deterministic precedence for resolving access to a feature.
 *
 * 1. User/account status
 * 2. Platform-only route restriction
 * 3. User/workspace module preference
 * 4. Platform owner/super-admin override
 * 5. Organization feature override
 * 6. Subscription status + canonical plan tier
 * 7. Feature enabled state
 * 8. Organization role permission
 */
export function resolveAccess(
  featureSlug: string,
  context: EntitlementContext
): boolean {
  const feature = getFeature(featureSlug);

  if (featureSlug.startsWith('workspace:')) {
    const moduleId = featureSlug.split(':')[1];
    if (context.hiddenModules?.includes(moduleId)) return false;
    return true;
  }

  if (!feature) return false;

  if (context.userStatus === 'SUSPENDED') {
    return false;
  }

  if (featureSlug === 'platform_admin') {
    return context.platformUserRole === PlatformRole.PLATFORM_OWNER || context.platformUserRole === PlatformRole.SUPER_ADMIN;
  }

  const moduleId = getModuleForFeature(featureSlug);
  if (context.hiddenModules?.includes(moduleId)) {
    return false;
  }

  if (context.platformUserRole === PlatformRole.PLATFORM_OWNER || context.platformUserRole === PlatformRole.SUPER_ADMIN) {
    return true;
  }

  const hasGlobalOverride = context.organizationFeatureOverrides?.ALL_CURRENT_AND_FUTURE_FEATURES === 'FORCED_ON';
  const specificOverride = context.organizationFeatureOverrides?.[featureSlug];

  if (specificOverride === 'FORCED_OFF') return false;

  const isSubscriptionInvalid = context.subscriptionStatus === 'CANCELED' || context.subscriptionStatus === 'PAST_DUE';

  let tierAllows = false;
  if (hasGlobalOverride || specificOverride === 'FORCED_ON') {
    tierAllows = true;
  } else {
    if (isSubscriptionInvalid) {
      return false;
    }

    const orgTier = getPlanTier(context.organizationPlan);
    const tierHierarchy: FeatureTier[] = ['CORE', 'STANDARD', 'ADVANCED', 'ENTERPRISE', 'SYSTEM'];
    const minTierIndex = tierHierarchy.indexOf(feature.minimumTier || 'CORE');
    const orgTierIndex = tierHierarchy.indexOf(orgTier);

    if (orgTierIndex >= minTierIndex) {
      tierAllows = true;
    }
  }

  if (!tierAllows) return false;

  if (!feature.defaultEnabled && !hasGlobalOverride && specificOverride !== 'FORCED_ON') {
    return false;
  }

  if (feature.minimumRole && context.userOrganizationRole) {
    if (!hasMinimumRole(context.userOrganizationRole, feature.minimumRole)) {
      return false;
    }
  }

  return true;
}
