import { getActiveDataPlane } from '@/lib/supabase';
import { useEntitlements } from './useEntitlements';
import type { FeatureKey } from '@/lib/features/featureCatalog';

// Compatibility map for screens that still use pre-master-catalog capability names.
// New code should use FeatureKey directly.
const LEGACY_FEATURE_MAP: Record<string, FeatureKey> = {
  'sales.contracts': 'sales.quotes',
  'alterations.core': 'sales',
  'purchasing.core': 'inventory.purchase_orders',
  'transfers.core': 'inventory.transfers',
  'payroll.core': 'team.payroll',
  'growth.marketing': 'growth',
  'growth.social_content': 'growth.meta',
  'growth.seo': 'growth.website',
  'growth.local_seo': 'growth.google',
  'growth.reputation': 'growth.google',
  'growth.competitors': 'growth.competitor_intelligence',
  'reports.core': 'reports',
  'reports.advanced': 'reports.financial',
  'integrations.shopify': 'integrations.shopify',
  'integrations.api': 'integrations.api',
  'communications.sms': 'integrations.sms',
  'automation.rules': 'customers.follow_up',
  'payments.schedules': 'sales.financing',
  'portal.bridal': 'customers.tasks',
  'scale.multi_location': 'reports.multi_location',
  'scale.multi_brand': 'reports.multi_location',
  'ai.assist': 'growth.ai_advisor',
};

export const useTenantEntitlements = () => {
  const isDemo = getActiveDataPlane() === 'demo';
  const {
    canUse,
    features,
    rawState,
    plan,
    subscriptionStatus,
    industryPackId,
    addOns,
    isLoading,
    error,
    refresh,
  } = useEntitlements();

  const can = (featureKey: string) => {
    if (isDemo) return true;
    const masterKey = LEGACY_FEATURE_MAP[featureKey] || (featureKey as FeatureKey);
    return canUse(masterKey);
  };

  const getEntitlement = (featureKey: string) => {
    const masterKey = LEGACY_FEATURE_MAP[featureKey] || (featureKey as FeatureKey);
    const resolved = features?.[masterKey];
    return resolved
      ? { status: resolved.isEffectivelyEnabled ? 'ENABLED' : 'DENIED', reason: resolved.reason, state: resolved.state }
      : { status: 'DENIED', reason: error || 'Entitlements are still loading.' };
  };

  return {
    subscription: rawState,
    isLoading,
    error,
    can,
    getEntitlement,
    plan,
    subscriptionStatus,
    addOns,
    isStaffing: isLoading,
    refresh,
    industryPackId,
  };
};
