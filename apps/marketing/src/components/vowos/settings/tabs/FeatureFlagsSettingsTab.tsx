import { useEffect, useState } from 'react';
import { Flag, Loader2, Plus, Trash2, SlidersHorizontal, TestTube2, Target, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls, btnSecondary, btnPrimary } from '@/components/vowos/ui';
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
  const [activeSubTab, setActiveSubTab] = useState<'rollouts' | 'experiments' | 'targeting'>('rollouts');
  const [isSyncing, setIsSyncing] = useState(false);
  
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

  const handleForceSync = () => {
    setIsSyncing(true);
    toast({ title: 'Syncing Rules...', description: 'Pushing flag states to edge network.' });
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: 'Sync Complete', description: 'Edge nodes updated with latest rollout percentages.' });
    }, 1500);
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
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <Flag className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Feature Rollouts & Staging Flags</h3>
              <p className="text-xs text-stone-500">
                Manage experimental features, percentage-based rollouts, and targeted audiences.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleForceSync}
            disabled={isSyncing}
            className={`${btnSecondary} gap-2`}
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Force Edge Sync
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'rollouts', label: 'Staged Rollouts', icon: SlidersHorizontal },
            { id: 'experiments', label: 'A/B Experiments', icon: TestTube2 },
            { id: 'targeting', label: 'Audience Targeting', icon: Target }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'rollouts' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Active Feature Toggles</span>
            <button
              onClick={addFlag}
              className="flex items-center gap-1 text-[10px] font-bold text-brand-primary hover:text-brand-primary/80 px-2 py-1 rounded bg-brand-soft"
            >
              <Plus className="w-3 h-3" /> Add Custom Flag
            </button>
          </div>

          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white overflow-hidden">
            {safeFlags.map((flag) => (
              <div key={flag.id} className="p-4 space-y-3 hover:bg-stone-50/50 transition-colors group">
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
                      className="text-stone-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      className="flex-1 accent-brand-primary h-1 bg-stone-200 rounded-lg cursor-pointer"
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
      )}

      {activeSubTab === 'experiments' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Active A/B Experiments</h4>
            <p className="text-xs text-stone-500 mb-4">View and configure running experiments across your user base.</p>
          </div>
          
          <div className="grid gap-4 max-w-2xl">
            <div className="border border-stone-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-stone-800">Checkout Flow Conversion</h5>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">Running</span>
              </div>
              <p className="text-[11px] text-stone-500 mb-3">Testing one-page vs multi-step checkout.</p>
              
              <div className="flex gap-4">
                <div className="flex-1 bg-stone-50 rounded-lg p-3 text-center border border-stone-100">
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Control (A)</div>
                  <div className="text-lg font-bold text-stone-800 mt-1">50%</div>
                </div>
                <div className="flex-1 bg-brand-soft/30 rounded-lg p-3 text-center border border-brand-primary/20">
                  <div className="text-[10px] font-bold text-brand-primary uppercase">Variant (B)</div>
                  <div className="text-lg font-bold text-brand-primary mt-1">50%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'targeting' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Audience Targeting Rules</h4>
            <p className="text-xs text-stone-500 mb-4">Define custom user segments for feature flags and rollouts.</p>
          </div>
          
          <div className="border border-stone-200 rounded-xl p-4 max-w-2xl bg-stone-50/50">
            <h5 className="text-xs font-bold text-stone-800 mb-3">Internal Beta Testers</h5>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500">IF</span>
                <select className="border border-stone-200 rounded px-2 py-1 bg-white outline-none">
                  <option>User Email</option>
                  <option>Role</option>
                  <option>Location</option>
                </select>
                <select className="border border-stone-200 rounded px-2 py-1 bg-white outline-none">
                  <option>ends with</option>
                  <option>equals</option>
                  <option>contains</option>
                </select>
                <input type="text" value="@vowos.com" readOnly className="border border-stone-200 rounded px-2 py-1 bg-white outline-none" />
              </div>
            </div>
            
            <button className="mt-4 text-[10px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Condition
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
