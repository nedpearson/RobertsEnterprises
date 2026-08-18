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
 * 1. Platform Security Restriction (e.g. Platform Admin routes)
 * 2. User/Workspace Preference (hiddenModules) - NEW!
 * 3. Platform Owner Override (ALL_CURRENT_AND_FUTURE_FEATURES)
 * 4. Organization Feature Override (FORCED_ON / FORCED_OFF)
 * 5. Organization Subscription (minimum tier check)
 * 6. Feature Enabled State (defaultEnabled)
 * 7. Role Permission (hasMinimumRole)
 */
export function resolveAccess(
  featureSlug: string,
  context: EntitlementContext
): boolean {
  const feature = getFeature(featureSlug);
  
  // If no feature definition, but it's a raw module check (e.g., 'workspace:growth'), handle it
  if (featureSlug.startsWith('workspace:')) {
    const moduleId = featureSlug.split(':')[1];
    if (context.hiddenModules?.includes(moduleId)) return false;
    return true; // Defer to role checks if not hidden
  }

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

  // NEW: 2b. Module Preference Check (Overrides ALL_CURRENT_AND_FUTURE_FEATURES)
  const moduleId = getModuleForFeature(featureSlug);
  if (context.hiddenModules?.includes(moduleId)) {
    return false; // User explicitly hid this module for their workspace
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
