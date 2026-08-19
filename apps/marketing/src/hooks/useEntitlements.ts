import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { entitlementService, ResolvedFeature, EntitlementContext } from '@/lib/features/entitlementService';
import { FeatureKey, getAllFeatures } from '@/lib/features/featureCatalog';
import { getActiveDataPlane } from '@/lib/supabase';

export function useEntitlements() {
  const { tenant, user } = useAuth();
  const [features, setFeatures] = useState<Record<FeatureKey, ResolvedFeature> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const context: EntitlementContext = {
    organizationId: tenant?.id,
    userId: user?.id,
  };

  const refresh = async () => {
    if (getActiveDataPlane() === 'demo') {
      // In demo mode, all features are forcefully enabled locally to showcase the product.
      const all = getAllFeatures();
      const demoFeatures: Partial<Record<FeatureKey, ResolvedFeature>> = {};
      all.forEach(f => {
        demoFeatures[f.feature_key] = {
          key: f.feature_key,
          state: 'PLATFORM_ENABLED',
          isEffectivelyEnabled: true,
          reason: 'Demo Mode Sandbox'
        };
      });
      setFeatures(demoFeatures as Record<FeatureKey, ResolvedFeature>);
      setIsLoading(false);
      return;
    }

    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const resolved = await entitlementService.resolveAll(context);
      setFeatures(resolved);
    } catch (e) {
      console.error('Failed to resolve entitlements:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [tenant?.id, user?.id]);

  const canUse = (featureKey: FeatureKey): boolean => {
    if (!features) return false;
    return features[featureKey]?.isEffectivelyEnabled ?? false;
  };

  const getFeatureState = (featureKey: FeatureKey): ResolvedFeature | undefined => {
    if (!features) return undefined;
    return features[featureKey];
  };

  const toggleCustomerFeature = async (featureKey: FeatureKey, enabled: boolean) => {
    if (!tenant?.id) return;
    await entitlementService.setCustomerToggle(tenant.id, featureKey, enabled);
    await refresh();
  };

  return {
    features,
    isLoading,
    canUse,
    getFeatureState,
    toggleCustomerFeature,
    refresh
  };
}
