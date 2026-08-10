import { useEffect, useState } from 'react';
import { Flag, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@vowos/design-system';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_FEATURE_FLAGS, FeatureFlag } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface FeatureFlagsSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function FeatureFlagsSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: FeatureFlagsSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<FeatureFlag[]>(DEFAULT_FEATURE_FLAGS);
  const [dbFlags, setDbFlags] = useState<FeatureFlag[]>(DEFAULT_FEATURE_FLAGS);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<FeatureFlag[]>(
      'feature_flags',
      'feature_flags',
      { dataPlane },
      DEFAULT_FEATURE_FLAGS
    );
    const fallback = Array.isArray(result.value) ? result.value : DEFAULT_FEATURE_FLAGS;
    setFlags(fallback);
    setDbFlags(fallback);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty = JSON.stringify(flags) !== JSON.stringify(dbFlags);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('feature_flags', 'feature_flags', flags, { dataPlane }, reason);

      toast({
        title: 'Feature flags updated',
        description: 'Staged releases rules updated successfully.',
      });
      setDbFlags(flags);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save feature flags',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [flags]);

  const updateFlag = (id: string, fields: Partial<FeatureFlag>) => {
    setFlags(
      flags.map((f) => (f.id === id ? { ...f, ...fields } as typeof f : f))
    );
  };

  const addFlag = () => {
    const newFlag: FeatureFlag = {
      id: Date.now().toString(),
      name: 'NEW_UNRELEASED_FEATURE',
      description: 'Custom feature toggle for dev staging.',
      enabled: false,
      rolloutPct: 0,
    };
    setFlags([...flags, newFlag]);
  };

  const deleteFlag = (id: string) => {
    setFlags(flags.filter((f) => f.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading staged rollouts…
      </div>
    );
  }

  const safeFlags = Array.isArray(flags) ? flags : DEFAULT_FEATURE_FLAGS;

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Feature Rollouts & Staging Flags"
        description="Enable or disable experimental features for selected stores and stylists."
        icon={<Flag className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Active Feature Toggles</span>
            <button
              onClick={addFlag}
              className="text-[10px] font-bold text-brand-primary hover:text-brand-primary px-2 py-0.5 border border-border-subtle rounded hover:bg-brand-soft/50"
            >
              + Add Custom Flag
            </button>
          </div>

          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white overflow-hidden">
            {safeFlags.map((flag) => (
              <div key={flag.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <input
                      type="text"
                      value={flag.name}
                      onChange={(e) => updateFlag(flag.id, { name: e.target.value })}
                      className="text-xs font-bold text-stone-800 uppercase tracking-wider bg-transparent border-b border-transparent hover:border-stone-200 focus:border-stone-800 outline-none w-64"
                    />
                    <input
                      type="text"
                      value={flag.description}
                      onChange={(e) => updateFlag(flag.id, { description: e.target.value })}
                      className="text-[11px] text-stone-400 mt-1 block w-96 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-stone-800 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => deleteFlag(flag.id)}
                      className="text-stone-400 hover:text-red-500 p-1"
                      title="Delete Flag"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(checked) => updateFlag(flag.id, { enabled: checked })}
                      className="data-[state=checked]:bg-brand-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-stone-50">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[10px] text-stone-500 font-medium">Staged Rollout:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={flag.rolloutPct}
                      onChange={(e) => updateFlag(flag.id, { rolloutPct: parseInt(e.target.value) || 0 })}
                      className="flex-1 accent-rose-500 h-1 bg-stone-200 rounded-lg cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] text-stone-600 font-bold bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded w-12 text-center">
                    {flag.rolloutPct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
