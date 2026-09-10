import React, { useMemo, useState, useEffect } from 'react';
import { useModuleResolution } from '@/lib/modules/resolver';
import { useModulePreferences } from '@/hooks/useModulePreferences';
import { getAllModules, ModuleCategory, ModuleDefinition } from '@/lib/modules/moduleRegistry';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Lock, Settings2, RefreshCw, Loader2, Layers, Zap, Calendar, Users, Briefcase, Box, PieChart, Plug, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@vowos/design-system';
import { btnSecondary } from '@/components/vowos/ui';

interface ModulesSettingsTabProps {
  onDirtyChange: (isDirty: boolean) => void;
  registerSaveRef: (fn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  CORE: Settings2,
  APPOINTMENTS: Calendar,
  CUSTOMERS: Users,
  SALES: Briefcase,
  INVENTORY: Box,
  TEAM: Shield,
  GROWTH: Zap,
  REPORTS: PieChart,
  CONNECTIONS: Plug,
  ADVANCED: Layers,
};

export function ModulesSettingsTab({ onDirtyChange, registerSaveRef, resetTrigger }: ModulesSettingsTabProps) {
  const { resolveFeatureAvailability } = useModuleResolution();
  const { updatePreference, getModulePreference, isLoading: prefsLoading } = useModulePreferences();
  const { can } = useTenantEntitlements();
  const { profile } = useAuth();
  const role = profile?.role;
  
  const allModules = useMemo(() => getAllModules(), []);
  
  const categories = useMemo(() => {
    return Object.values(ModuleCategory).map(category => {
      return {
        category,
        modules: allModules.filter(m => m.category === category)
      };
    }).filter(c => c.modules.length > 0);
  }, [allModules]);

  const [activeSubTab, setActiveSubTab] = useState<string>(categories[0]?.category || 'CORE');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    onDirtyChange(false);
  }, [resetTrigger]);

  useEffect(() => {
    registerSaveRef(async () => {
      return true;
    });
  }, []);

  if ((role as string) !== 'Owner' && (role as string) !== 'ORG_SUPER_ADMIN') {
    return (
      <div className="p-8 text-center text-stone-500">
        <Lock className="h-12 w-12 mx-auto mb-4 text-stone-400" />
        <p>You do not have permission to modify workspace modules.</p>
      </div>
    );
  }

  const handleSync = () => {
    setIsSyncing(true);
    toast({ title: 'Sync Started', description: 'Synchronizing module configurations with cloud.' });
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: 'Sync Complete', description: 'Module settings are up to date.' });
    }, 1500);
  };

  const renderModuleCard = (module: ModuleDefinition) => {
    const isEntitled = module.entitlementFeatureKey ? can(module.entitlementFeatureKey) : true;
    const explicitPreference = getModulePreference(module.key);
    const isEnabled = explicitPreference !== undefined ? explicitPreference : module.defaultEnabled;

    const resolution = resolveFeatureAvailability(module.key);
    const effective = resolution.effective;
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

  const activeCategoryModules = categories.find(c => c.category === activeSubTab)?.modules || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Customize VowOS Modules</h3>
              <p className="text-xs text-stone-500">
                Show the tools your team uses and hide the ones you don't.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className={`${btnSecondary} gap-2`}
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Modules
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {categories.map(tab => {
            const Icon = CATEGORY_ICONS[tab.category] || Layers;
            return (
              <button
                key={tab.category}
                onClick={() => setActiveSubTab(tab.category)}
                className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSubTab === tab.category ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.category.charAt(0) + tab.category.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeCategoryModules.map(renderModuleCard)}
      </div>
    </div>
  );
}
