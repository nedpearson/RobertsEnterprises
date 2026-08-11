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
  const isDemoPlane = typeof window !== 'undefined' && localStorage.getItem('vowos_data_plane') === 'demo';

  let effectiveSubscription: TenantSubscriptionState | null = subscription ? {
    ...subscription,
    plan: demoPlanOverride || subscription.plan,
  } : null;

  // 🌟 DEMO MODE OVERRIDE 🌟
  // If we are in the demo environment and no subscription was found (e.g., due to missing DB),
  // forcefully inject an active Enterprise subscription to unlock all features.
  if (!effectiveSubscription && (isDemoPlane || businessId === 'biz_lumiere_demo')) {
    effectiveSubscription = {
      plan: demoPlanOverride || 'enterprise',
      status: 'active',
      addons: ['api_access', 'custom_domain'],
      overrides: {},
      grandfatheredFeatures: [],
      activeTrials: {},
      usage: {},
      industryPack: 'bridal'
    };
  }

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
