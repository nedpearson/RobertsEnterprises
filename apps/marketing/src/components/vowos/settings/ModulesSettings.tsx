import React, { useMemo } from 'react';
import { useModuleResolution } from '@/lib/modules/resolver';
import { useModulePreferences } from '@/hooks/useModulePreferences';
import { getAllModules, ModuleCategory, ModuleDefinition } from '@/lib/modules/moduleRegistry';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Lock, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ModulesSettings() {
  const { resolveFeatureAvailability } = useModuleResolution();
  const { updatePreference, getModulePreference, isLoading: prefsLoading } = useModulePreferences();
  const { can } = useTenantEntitlements();
  const { role } = useAuth();
  
  const allModules = useMemo(() => getAllModules(), []);
  
  const categories = useMemo(() => {
    return Object.values(ModuleCategory).map(category => {
      return {
        category,
        modules: allModules.filter(m => m.category === category)
      };
    }).filter(c => c.modules.length > 0);
  }, [allModules]);

  if (role !== 'Owner' && role !== 'ORG_SUPER_ADMIN') {
    return (
      <div className="p-8 text-center text-stone-500">
        <Lock className="h-12 w-12 mx-auto mb-4 text-stone-400" />
        <p>You do not have permission to modify workspace modules.</p>
      </div>
    );
  }

  const renderModuleCard = (module: ModuleDefinition) => {
    // 1. Is it entitled?
    const isEntitled = module.entitlementFeatureKey ? can(module.entitlementFeatureKey) : true;
    
    // 2. Is it explicitly disabled by the user?
    const explicitPreference = getModulePreference(module.key);
    const isEnabled = explicitPreference !== undefined ? explicitPreference : module.defaultEnabled;

    const resolution = resolveFeatureAvailability(module.key);
    const effective = resolution.effective;
    
    // Parents constraint check
    const hasParentConstraint = resolution.reason === 'PARENT_DISABLED';

    return (
      <div key={module.key} className="flex items-start justify-between p-5 bg-white border border-stone-200 rounded-xl shadow-sm transition-all hover:border-stone-300">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-stone-900">{module.name}</h4>
            {module.core && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">
                Core
              </span>
            )}
            {!isEntitled && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                Upgrade Required
              </span>
            )}
            {hasParentConstraint && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">
                Parent Disabled
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500">{module.description}</p>
          
          <div className="mt-2 text-xs text-stone-400">
            {isEntitled ? (
              module.core ? 'Required for VowOS operation.' : 'Included in your plan.'
            ) : (
              'Available with an upgraded plan or add-on.'
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3 min-w-[100px]">
          {isEntitled ? (
            <Switch 
              checked={isEnabled} 
              onCheckedChange={(checked) => {
                updatePreference({ moduleId: module.key, isEnabled: checked });
              }}
              disabled={module.core || prefsLoading || hasParentConstraint}
            />
          ) : (
            <Button variant="outline" size="sm" className="text-xs" disabled>
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Upgrade
            </Button>
          )}
          <div className="text-[11px] font-semibold text-stone-400">
            {effective ? (
              <span className="text-emerald-600">ACTIVE</span>
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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
            <Settings2 className="h-6 w-6 text-brand-primary" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-stone-900">Customize VowOS</h1>
        </div>
        <p className="text-stone-500">
          Show the tools your team uses and hide the ones you don't. Anything included in your plan can be turned back on later.
        </p>
      </div>

      <div className="space-y-12">
        {categories.map(({ category, modules }) => (
          <section key={category}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-4 px-1">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map(renderModuleCard)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
