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

/** Maps feature slugs to their Workspace/Module ID. */
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

function isPlatformAdmin(role?: PlatformRole): boolean {
  return role === PlatformRole.PLATFORM_OWNER || role === PlatformRole.SUPER_ADMIN;
}

/**
 * Deterministic precedence for resolving access to a feature.
 *
 * 1. Platform-only route restriction
 * 2. Active tenant membership + tenant scope
 * 3. User/workspace module preference
 * 4. Platform owner/super-admin support override
 * 5. Organization feature override
 * 6. Subscription status + canonical plan tier
 * 7. Feature enabled state
 * 8. Organization role permission
 */
export function resolveAccess(
  featureSlug: string,
  context: EntitlementContext,
): boolean {
  if (featureSlug === 'platform_admin') {
    return isPlatformAdmin(context.platformUserRole);
  }

  // All tenant feature/module checks require an explicitly resolved active
  // organization membership. PENDING/unknown status must never behave as ACTIVE.
  if (!context.organizationId || context.userStatus !== 'ACTIVE') {
    return false;
  }

  // Unknown legacy roles are intentionally represented as OTHER_AUTHORIZED_ROLE;
  // that sentinel is not a usable tenant role and must never inherit plan access.
  if (!context.userOrganizationRole || context.userOrganizationRole === OrganizationRole.OTHER_AUTHORIZED_ROLE) {
    return false;
  }

  if (featureSlug.startsWith('workspace:')) {
    const moduleId = featureSlug.split(':')[1];
    if (!moduleId || context.hiddenModules?.includes(moduleId)) return false;
    return true;
  }

  const feature = getFeature(featureSlug);
  if (!feature) return false;

  const moduleId = getModuleForFeature(featureSlug);
  if (context.hiddenModules?.includes(moduleId)) {
    return false;
  }

  // Platform administrators operating in an explicitly entered tenant/support
  // context may override commercial entitlements, but never the tenant-context
  // requirement above.
  if (isPlatformAdmin(context.platformUserRole)) {
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
    if (isSubscriptionInvalid) return false;

    const orgTier = getPlanTier(context.organizationPlan);
    const tierHierarchy: FeatureTier[] = ['CORE', 'STANDARD', 'ADVANCED', 'ENTERPRISE', 'SYSTEM'];
    const minTierIndex = tierHierarchy.indexOf(feature.minimumTier || 'CORE');
    const orgTierIndex = tierHierarchy.indexOf(orgTier);
    if (orgTierIndex >= minTierIndex) tierAllows = true;
  }

  if (!tierAllows) return false;

  if (!feature.defaultEnabled && !hasGlobalOverride && specificOverride !== 'FORCED_ON') {
    return false;
  }

  if (feature.minimumRole && !hasMinimumRole(context.userOrganizationRole, feature.minimumRole)) {
    return false;
  }

  return true;
}
