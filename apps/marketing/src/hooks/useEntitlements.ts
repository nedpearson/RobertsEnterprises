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
      const allKeys = getAllFeatures().map(f => f.feature_key);
      const demoFeatures = {} as Record<FeatureKey, ResolvedFeature>;
      for (const key of allKeys) {
        demoFeatures[key] = {
          key: key,
          state: 'PLATFORM_ENABLED',
          isEffectivelyEnabled: true,
          reason: 'Demo Mode Sandbox'
        };
      }
      setFeatures(demoFeatures);
      setIsLoading(false);
      return;
    }

    if (!tenant?.id) return;

    const resolved = await entitlementService.resolveEntitlements(context);
    setFeatures(resolved);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [tenant?.id, user?.id]);

  const canUse = (featureKey: FeatureKey): boolean => {
    if (!features) return false;
    return features[featureKey]?.isEffectivelyEnabled ?? false;
  };

  return {
    features,
    isLoading,
    canUse,
    refresh
  };
}
