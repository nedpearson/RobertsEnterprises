import { useMemo } from 'react';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { useModulePreferences } from '@/hooks/useModulePreferences';
import { useAuth } from '@/contexts/AuthContext';
import { getModuleDefinition, ModuleDefinition, ModuleReleaseState } from './moduleRegistry';

export interface ModuleResolutionResult {
  effective: boolean;
  reason: 'RELEASE_STATE' | 'UNENTITLED' | 'WORKSPACE_DISABLED' | 'UNAUTHORIZED' | 'PARENT_DISABLED' | 'ACTIVE';
  module: ModuleDefinition;
}

export function useModuleResolution() {
  const { can, isLoading: entitlementsLoading } = useTenantEntitlements();
  const { preferences, getModulePreference, isLoading: prefsLoading } = useModulePreferences();
  const { role, loading: authLoading } = useAuth();

  const isLoading = entitlementsLoading || prefsLoading || authLoading;

  const resolveFeatureAvailability = (featureKey: string): ModuleResolutionResult => {
    const module = getModuleDefinition(featureKey);
    if (!module) {
      return { effective: false, reason: 'RELEASE_STATE', module: null as any };
    }

    // 1. Release State
    if (module.releaseState === ModuleReleaseState.DEVELOPMENT || module.releaseState === ModuleReleaseState.DEPRECATED) {
      // In production, we typically hide DEVELOPMENT. For now, assume it's hidden.
      // (Could be overridden by env variables)
      if (import.meta.env.PROD) {
        return { effective: false, reason: 'RELEASE_STATE', module };
      }
    }

    // 2. Entitlement
    if (module.entitlementFeatureKey && !can(module.entitlementFeatureKey)) {
      return { effective: false, reason: 'UNENTITLED', module };
    }

    // 3. Workspace Enablement
    if (!module.core) {
      const explicitPreference = getModulePreference(module.key);
      const isEnabledInWorkspace = explicitPreference !== undefined ? explicitPreference : module.defaultEnabled;
      if (!isEnabledInWorkspace) {
        return { effective: false, reason: 'WORKSPACE_DISABLED', module };
      }
    }

    // 4. Parent Constraints
    if (module.parentModuleKeys && module.parentModuleKeys.length > 0) {
      // If ANY parent is explicitly disabled in the workspace, this child is disabled.
      const parentDisabled = module.parentModuleKeys.some(parentKey => {
        const parentPref = getModulePreference(parentKey);
        const parentDef = getModuleDefinition(parentKey);
        if (parentDef?.core) return false;
        const parentEnabled = parentPref !== undefined ? parentPref : (parentDef?.defaultEnabled ?? true);
        return !parentEnabled;
      });
      if (parentDisabled) {
        return { effective: false, reason: 'PARENT_DISABLED', module };
      }
    }

    // 5. User Authorization
    // In the future, we could check module.supportedRoles against `role`.
    // For now, if the user made it this far and has access to the workspace, they can see the module UI.
    // The server/RLS still enforces actual read/write access.

    return { effective: true, reason: 'ACTIVE', module };
  };

  const getAccessibleModules = (): ModuleDefinition[] => {
    // Requires resolving all and filtering
    return Object.keys(getModuleDefinition('') || {}).map(k => getModuleDefinition(k)).filter(Boolean) as ModuleDefinition[];
  };

  return {
    resolveFeatureAvailability,
    isLoading
  };
}
