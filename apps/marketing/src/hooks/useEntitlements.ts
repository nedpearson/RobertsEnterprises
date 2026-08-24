import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  entitlementService,
  type ResolvedFeature,
  type EntitlementContext,
  type RawEntitlementState,
} from '@/lib/features/entitlementService';
import { type FeatureKey, getAllFeatures } from '@/lib/features/featureCatalog';
import { getActiveDataPlane } from '@/lib/supabase';

export function useEntitlements() {
  const { tenant, user } = useAuth();
  const [features, setFeatures] = useState<Record<FeatureKey, ResolvedFeature> | null>(null);
  const [rawState, setRawState] = useState<RawEntitlementState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (getActiveDataPlane() === 'demo') {
        const demoFeatures = {} as Record<FeatureKey, ResolvedFeature>;
        for (const feature of getAllFeatures()) {
          demoFeatures[feature.feature_key] = {
            key: feature.feature_key,
            state: 'PLATFORM_ENABLED',
            isEffectivelyEnabled: true,
            reason: 'Demo Mode Sandbox',
          };
        }
        setFeatures(demoFeatures);
        setRawState({
          plan: 'enterprise',
          status: 'ACTIVE',
          accountType: 'DEMO',
          addons: [],
          grandfatheredFeatures: [],
          activeTrials: {},
          usageLimits: {},
          industryPack: 'bridal',
          overrides: {},
          customerToggles: {},
        });
        return;
      }

      if (!tenant?.id) {
        setFeatures(null);
        setRawState(null);
        return;
      }

      entitlementService.invalidateCache();
      const context: EntitlementContext = {
        organizationId: tenant.id,
        userId: user?.id,
      };
      const [resolved, subscriptionState] = await Promise.all([
        entitlementService.resolveAll(context),
        entitlementService.fetchRawState(tenant.id),
      ]);
      setFeatures(resolved);
      setRawState(subscriptionState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load feature entitlements.';
      setError(message);
      setFeatures(null);
      setRawState(null);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canUse = (featureKey: FeatureKey): boolean =>
    features?.[featureKey]?.isEffectivelyEnabled ?? false;

  const toggleCustomerFeature = useCallback(async (featureKey: FeatureKey, enabled: boolean): Promise<void> => {
    if (getActiveDataPlane() === 'demo') {
      setFeatures((current) => current ? {
        ...current,
        [featureKey]: {
          ...current[featureKey],
          state: enabled ? 'CUSTOMER_ENABLED' : 'CUSTOMER_DISABLED',
          isEffectivelyEnabled: enabled,
          reason: enabled ? 'Enabled in demo' : 'Disabled in demo',
        },
      } : current);
      return;
    }
    if (!tenant?.id) throw new Error('Active organization is required to change feature settings.');
    await entitlementService.setCustomerToggle(tenant.id, featureKey, enabled);
    await refresh();
  }, [tenant?.id, refresh]);

  return {
    features,
    rawState,
    plan: rawState?.plan ?? null,
    subscriptionStatus: rawState?.status ?? null,
    industryPackId: rawState?.industryPack ?? 'bridal',
    addOns: rawState?.addons ?? [],
    isLoading,
    error,
    canUse,
    toggleCustomerFeature,
    refresh,
  };
}
