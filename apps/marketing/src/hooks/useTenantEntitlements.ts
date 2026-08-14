import { useAuth } from '@/contexts/AuthContext';
import { getActiveDataPlane } from '@/lib/supabase';

export const useTenantEntitlements = () => {
  const { canAccess, entitlementContext, loading, refreshProfile } = useAuth();
  const isDemo = getActiveDataPlane() === 'demo';

  const plan = isDemo ? 'demo-full-access' : (entitlementContext?.organizationPlan || 'starter');
  const addOns: string[] = [];
  const isStaffing = isDemo ? false : loading;
  const industryPackId = 'bridal';

  const can = (featureKey: string) => {
    // Public /demoapp is a safe synthetic sandbox intended to demonstrate the
    // complete product. Feature entitlement locks belong to production tenants,
    // not to the isolated demo data plane.
    if (isDemo) return true;
    return canAccess(featureKey);
  };

  const getEntitlement = (featureKey: string) => {
    return can(featureKey) ? { status: 'ENABLED' } : { status: 'DENIED' };
  };

  return {
    subscription: { plan },
    isLoading: isDemo ? false : loading,
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
