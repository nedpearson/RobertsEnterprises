import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { useModulePreferences } from '@/hooks/useModulePreferences';
import { useAuth } from '@/contexts/AuthContext';
import { getAllModules, getModuleDefinition, ModuleDefinition, ModuleReleaseState } from './moduleRegistry';
import { ALL_FEATURES_OVERRIDE_KEY } from '@/lib/features/entitlementService';

export interface ModuleResolutionResult {
  effective: boolean;
  reason: 'RELEASE_STATE' | 'UNENTITLED' | 'WORKSPACE_DISABLED' | 'UNAUTHORIZED' | 'PARENT_DISABLED' | 'ACTIVE';
  module: ModuleDefinition;
}

export function useModuleResolution() {
  const { can, subscription, isLoading: entitlementsLoading } = useTenantEntitlements();
  const { getModulePreference, isLoading: prefsLoading } = useModulePreferences();
  const { loading: authLoading } = useAuth();

  const isLoading = entitlementsLoading || prefsLoading || authLoading;
  const hasAllFeaturesOverride = subscription?.overrides?.[ALL_FEATURES_OVERRIDE_KEY] === true;

  const resolveFeatureAvailability = (featureKey: string): ModuleResolutionResult => {
    const module = getModuleDefinition(featureKey);
    if (!module) {
      return { effective: false, reason: 'RELEASE_STATE', module: null as unknown as ModuleDefinition };
    }

    if (
      (module.releaseState === ModuleReleaseState.DEVELOPMENT || module.releaseState === ModuleReleaseState.DEPRECATED)
      && import.meta.env.PROD
    ) {
      return { effective: false, reason: 'RELEASE_STATE', module };
    }

    if (module.entitlementFeatureKey && !can(module.entitlementFeatureKey)) {
      return { effective: false, reason: 'UNENTITLED', module };
    }

    if (!module.core && !hasAllFeaturesOverride) {
      const explicitPreference = getModulePreference(module.key);
      const isEnabledInWorkspace = explicitPreference !== undefined ? explicitPreference : module.defaultEnabled;
      if (!isEnabledInWorkspace) return { effective: false, reason: 'WORKSPACE_DISABLED', module };
    }

    if (!hasAllFeaturesOverride && module.parentModuleKeys?.length) {
      const parentDisabled = module.parentModuleKeys.some((parentKey) => {
        const parentPref = getModulePreference(parentKey);
        const parentDef = getModuleDefinition(parentKey);
        if (parentDef?.core) return false;
        const parentEnabled = parentPref !== undefined ? parentPref : (parentDef?.defaultEnabled ?? true);
        return !parentEnabled;
      });
      if (parentDisabled) return { effective: false, reason: 'PARENT_DISABLED', module };
    }

    return { effective: true, reason: 'ACTIVE', module };
  };

  const getAccessibleModules = (): ModuleDefinition[] =>
    getAllModules().filter((module) => resolveFeatureAvailability(module.key).effective);

  return { resolveFeatureAvailability, getAccessibleModules, isLoading };
}
