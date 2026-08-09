import { useQuery } from '@tanstack/react-query';
import { useActiveBusinessContext } from '@/lib/services/schedulingService';
import { fetchTenantSubscription, EntitlementService, TenantSubscriptionState } from '@/lib/services/entitlementService';
import { CommercialPlan } from '@/config/commercialCatalog';

export const useTenantEntitlements = () => {
  const { businessId } = useActiveBusinessContext();

  const { data: subscription, isLoading, error, refetch: refresh } = useQuery({
    queryKey: ['tenant_subscription', businessId],
    queryFn: () => fetchTenantSubscription(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Support for Sales Demo Preview Mode
  const demoPlanOverride = typeof window !== 'undefined' ? localStorage.getItem('vowos_demo_plan_override') as CommercialPlan | null : null;

  const effectiveSubscription: TenantSubscriptionState | null = subscription ? {
    ...subscription,
    plan: demoPlanOverride || subscription.plan,
  } : null;

  const plan = effectiveSubscription?.plan || 'essentials';
  const addOns = effectiveSubscription?.addons || [];
  const isStaffing = isLoading;
  const industryPackId = effectiveSubscription?.industryPack || 'bridal';

  const can = (featureKey: string) => {
    if (isLoading || !effectiveSubscription) return false;
    const result = EntitlementService.resolveEntitlement(effectiveSubscription, featureKey);
    return result.status === 'ENABLED' || result.status === 'GRANDFATHERED' || result.status === 'ENTERPRISE_OVERRIDE' || result.status === 'TRIAL';
  };

  const getEntitlement = (featureKey: string) => {
    if (!effectiveSubscription) return null;
    return EntitlementService.resolveEntitlement(effectiveSubscription, featureKey);
  };

  return {
    subscription: effectiveSubscription,
    isLoading,
    error,
    can,
    getEntitlement,
    plan,
    addOns,
    isStaffing,
    refresh,
    industryPackId
  };
};
