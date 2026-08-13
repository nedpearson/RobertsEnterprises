import { useAuth } from '@/contexts/AuthContext';

export const useTenantEntitlements = () => {
  const { canAccess, entitlementContext, loading, refreshProfile } = useAuth();

  const plan = entitlementContext?.organizationPlan || 'starter';
  const addOns: string[] = [];
  const isStaffing = loading;
  const industryPackId = 'bridal';

  const can = (featureKey: string) => {
    return canAccess(featureKey);
  };

  const getEntitlement = (featureKey: string) => {
    return canAccess(featureKey) ? { status: 'ENABLED' } : { status: 'DENIED' };
  };

  return {
    subscription: { plan },
    isLoading: loading,
    error: null,
    can,
    getEntitlement,
    plan,
    addOns,
    isStaffing,
    refresh: refreshProfile,
    industryPackId
  };
};
