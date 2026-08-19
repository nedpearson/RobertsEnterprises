import { useAuth } from '@/contexts/AuthContext';
import { getActiveDataPlane } from '@/lib/supabase';
import { useEntitlements } from './useEntitlements';
import { FeatureKey } from '@/lib/features/featureCatalog';

// Map legacy keys to new master keys
const LEGACY_FEATURE_MAP: Record<string, FeatureKey> = {
  'sales.contracts': 'sales.quotes',
  'alterations.core': 'sales', // Just map to sales since we removed alterations as a separate top-level
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
  'integrations.shopify': 'integrations.shopify'
};

export const useTenantEntitlements = () => {
  const { session, loading, refreshProfile } = useAuth();
  const isDemo = getActiveDataPlane() === 'demo';
  const { canUse, features, isLoading: entLoading, refresh } = useEntitlements();

  const plan = 'pro';
  const addOns: string[] = [];
  const isStaffing = loading || entLoading;
  const industryPackId = 'bridal';

  const can = (featureKey: string) => {
    if (isDemo) return true;
    
    // Map to new feature key if it's a legacy one
    const masterKey = LEGACY_FEATURE_MAP[featureKey] || (featureKey as FeatureKey);
    return canUse(masterKey);
  };

  const getEntitlement = (featureKey: string) => {
    return can(featureKey) ? { status: 'ENABLED' } : { status: 'DENIED' };
  };

  const handleRefresh = async () => {
    await refreshProfile();
    await refresh();
  };

  return {
    subscription: { plan },
    isLoading: isStaffing,
    error: null,
    can,
    getEntitlement,
    plan,
    addOns,
    isStaffing,
    refresh: handleRefresh,
    industryPackId
  };
};
