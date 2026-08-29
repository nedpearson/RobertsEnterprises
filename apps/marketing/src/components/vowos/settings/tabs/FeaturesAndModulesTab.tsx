import React, { useMemo } from 'react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { getAllFeatures } from '@/lib/features/featureCatalog';
import { Switch } from '@/components/ui/switch';
import { Lock, Settings2, ShieldCheck, AlertCircle } from 'lucide-react';

export function FeaturesAndModulesTab() {
  const entitlements = useEntitlements() as any;
  const { features, isLoading, toggleCustomerFeature } = entitlements;
  const allFeatures = useMemo(() => getAllFeatures(), []);

  if (isLoading || !features) {
    return <div className="p-8 text-center text-stone-500 animate-pulse">Loading modules...</div>;
  }

  // Group features by category
  const groupedFeatures = allFeatures.reduce((acc, feature) => {
    if (!feature.parent_feature_key) {
      if (!acc[feature.module]) acc[feature.module] = { module: feature.module, items: [] };
      acc[feature.module].items.push(feature);
    }
    return acc;
  }, {} as Record<string, { module: string; items: any[] }>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Features & Modules</h2>
        <p className="text-sm text-stone-500 mt-1">
          Choose which VowOS capabilities your business uses. Disabled features are hidden from everyday workflows.
          Turning off a feature never deletes existing business data.
        </p>
      </div>

      <div className="space-y-8">
        {Object.values(groupedFeatures).map(group => (
          <div key={group.module} className="border rounded-xl bg-white overflow-hidden">
            <div className="bg-stone-50 px-4 py-3 border-b border-stone-200">
              <h3 className="font-semibold text-stone-900 capitalize">{group.module}</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {group.items.map(feature => {
                const state = features[feature.feature_key];
                const childFeatures = allFeatures.filter(f => f.parent_feature_key === feature.feature_key);

                return (
                  <div key={feature.id} className="p-4">
                    <FeatureToggleRow 
                      feature={feature} 
                      state={state} 
                      onToggle={(val) => toggleCustomerFeature(feature.feature_key, val)} 
                    />
                    
                    {childFeatures.length > 0 && state.isEffectivelyEnabled && (
                      <div className="mt-4 pl-6 space-y-3 border-l-2 border-stone-100 ml-2">
                        {childFeatures.map(child => (
                          <FeatureToggleRow 
                            key={child.id} 
                            feature={child} 
                            state={features[child.feature_key]} 
                            onToggle={(val) => toggleCustomerFeature(child.feature_key, val)} 
                            isChild
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureToggleRow({ feature, state, onToggle, isChild = false }: any) {
  const isLocked = state.state === 'PLAN_LOCKED';
  const isPlatformForced = state.state === 'PLATFORM_ENABLED' || state.state === 'PLATFORM_DISABLED' || state.state === 'REQUIRED';
  const disabledToggle = isLocked || isPlatformForced;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className={`font-medium ${isChild ? 'text-sm text-stone-700' : 'text-base text-stone-900'}`}>
            {feature.display_name}
          </h4>
          {isLocked && (
            <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600">
              <Lock className="w-3 h-3" /> {feature.minimum_plan} plan
            </span>
          )}
          {state.state === 'COMPLIMENTARY' && (
            <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
              <ShieldCheck className="w-3 h-3" /> Included
            </span>
          )}
        </div>
        <p className="text-sm text-stone-500 mt-0.5">{feature.description}</p>
        
        {isPlatformForced && (
          <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Required by VowOS Platform
          </p>
        )}
        {!state.isEffectivelyEnabled && state.state !== 'PLAN_LOCKED' && !isPlatformForced && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Feature is hidden from workflows
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isLocked ? (
          <button className="text-xs font-medium text-brand-primary bg-brand-soft px-3 py-1.5 rounded-full hover:bg-brand-soft/80">
            Upgrade
          </button>
        ) : (
          <Switch 
            checked={state.isEffectivelyEnabled} 
            disabled={disabledToggle}
            onCheckedChange={onToggle}
          />
        )}
      </div>
    </div>
  );
}
