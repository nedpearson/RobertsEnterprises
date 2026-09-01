import React, { useEffect, useMemo, useState } from 'react';
import { useModuleResolution } from '@/lib/modules/resolver';
import { useModulePreferences } from '@/hooks/useModulePreferences';
import { getAllModules, ModuleCategory, ModuleDefinition } from '@/lib/modules/moduleRegistry';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Lock, Loader2, RefreshCw, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@vowos/design-system';

interface ModulesSettingsTabProps {
  onDirtyChange: (isDirty: boolean) => void;
  registerSaveRef: (fn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function ModulesSettingsTab({ onDirtyChange, registerSaveRef, resetTrigger }: ModulesSettingsTabProps) {
  const { resolveFeatureAvailability } = useModuleResolution();
  const {
    updatePreferenceAsync,
    getModulePreference,
    isLoading: prefsLoading,
    isFetching,
    isUpdating,
    error,
    refetch,
  } = useModulePreferences();
  const { can } = useTenantEntitlements();
  const { profile } = useAuth();
  const role = profile?.role;
  const [pendingModule, setPendingModule] = useState<string | null>(null);

  const allModules = useMemo(() => getAllModules(), []);
  const categories = useMemo(() => Object.values(ModuleCategory)
    .map((category) => ({ category, modules: allModules.filter((module) => module.category === category) }))
    .filter((entry) => entry.modules.length > 0), [allModules]);

  // Module switches persist immediately. Tell SettingsShell there is no separate
  // unsaved local form state to flush when the user changes tabs.
  useEffect(() => {
    onDirtyChange(false);
    registerSaveRef(async () => true);
  }, [onDirtyChange, registerSaveRef, resetTrigger]);

  const canManageModules = role === 'Owner' || role === 'Manager';
  if (!canManageModules) {
    return (
      <div className="p-8 text-center text-stone-500">
        <Lock className="h-12 w-12 mx-auto mb-4 text-stone-400" />
        <p>Workspace modules can be changed by an Owner or Store Manager.</p>
      </div>
    );
  }

  const handleToggle = async (module: ModuleDefinition, checked: boolean) => {
    setPendingModule(module.key);
    try {
      await updatePreferenceAsync({ moduleId: module.key, isEnabled: checked });
      toast({
        title: checked ? `${module.name} enabled` : `${module.name} hidden`,
        description: checked
          ? 'The setting was saved to this organization and is now available to authorized staff.'
          : 'The setting was saved. Existing business data was preserved and can be restored by enabling the module again.',
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The module setting could not be saved.';
      toast({ title: `Could not update ${module.name}`, description: message, variant: 'destructive' });
    } finally {
      setPendingModule(null);
    }
  };

  const renderModuleCard = (module: ModuleDefinition) => {
    const isEntitled = module.entitlementFeatureKey ? can(module.entitlementFeatureKey) : true;
    const explicitPreference = getModulePreference(module.key);
    const isEnabled = explicitPreference !== undefined ? explicitPreference : module.defaultEnabled;
    const resolution = resolveFeatureAvailability(module.key);
    const effective = resolution.effective;
    const hasParentConstraint = resolution.reason === 'PARENT_DISABLED';
    const saving = pendingModule === module.key;

    return (
      <div key={module.key} className="flex items-start justify-between p-5 bg-white border border-stone-200 rounded-xl shadow-sm transition-all hover:border-stone-300">
        <div className="flex-1 pr-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="font-semibold text-stone-900">{module.name}</h4>
            {module.core && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">Core</span>
            )}
            {!isEntitled && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Upgrade Required</span>
            )}
            {hasParentConstraint && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">Dependency Disabled</span>
            )}
          </div>
          <p className="text-sm text-stone-500">{module.description}</p>
          <div className="mt-2 text-xs text-stone-400">
            {!isEntitled
              ? 'Available with an upgraded plan or add-on.'
              : module.core
                ? 'Required for VowOS operation.'
                : hasParentConstraint
                  ? 'Enable its required parent module first.'
                  : 'Setting is stored per organization and enforced throughout the workspace.'}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 min-w-[100px]">
          {isEntitled ? (
            saving ? (
              <div className="h-5 w-9 flex items-center justify-center" aria-label={`Saving ${module.name}`}>
                <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
              </div>
            ) : (
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => void handleToggle(module, checked)}
                disabled={module.core || prefsLoading || isUpdating || hasParentConstraint}
                aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${module.name}`}
              />
            )
          ) : (
            <Button variant="outline" size="sm" className="text-xs" disabled>
              <Lock className="h-3.5 w-3.5 mr-1.5" /> Upgrade
            </Button>
          )}
          <div className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
            {saving ? (
              <span className="text-brand-primary">SAVING</span>
            ) : effective ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-600" /><span className="text-emerald-600">ACTIVE</span></>
            ) : (
              <span>{isEntitled ? 'HIDDEN' : 'LOCKED'}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg">
              <Settings2 className="h-6 w-6 text-brand-primary" />
            </div>
            <h1 className="text-2xl font-serif font-semibold text-stone-900">Customize VowOS</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={prefsLoading || isFetching || isUpdating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
        <p className="text-stone-500">
          Show the tools your team uses and hide the ones you don't. Changes save immediately and are enforced for this organization.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Module settings could not be loaded.</p>
            <p className="mt-1">{error instanceof Error ? error.message : 'Check the API connection and try again.'}</p>
          </div>
        </div>
      )}

      <div className="space-y-12">
        {categories.map(({ category, modules }) => (
          <section key={category}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-4 px-1">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{modules.map(renderModuleCard)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
