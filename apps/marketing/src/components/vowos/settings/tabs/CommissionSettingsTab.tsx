import { useEffect, useState } from 'react';
import { Percent, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@/components/ui/switch';
import { resolveEffectiveSetting, saveScopedSetting, CommissionSettings } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  plans: [
    { id: '1', name: 'Standard Consultant Rate', description: 'Base 3% commission on all completed gown sales.', ratePct: 3, designerRates: {}, bonusThresholdCents: 5000000, bonusAmountCents: 50000, active: true },
    { id: '2', name: 'Designer Special Tier', description: 'Elevated 5% rate for premium designer collections.', ratePct: 5, designerRates: { 'Monique Lhuillier': 6, 'Berta': 6 }, bonusThresholdCents: 8000000, bonusAmountCents: 100000, active: true },
  ],
};

interface CommissionSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function CommissionSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: CommissionSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CommissionSettings>(DEFAULT_COMMISSION_SETTINGS);
  const [dbSettings, setDbSettings] = useState<CommissionSettings>(DEFAULT_COMMISSION_SETTINGS);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanRate, setNewPlanRate] = useState('3.0');

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<CommissionSettings>(
      'staff',
      'commission_settings',
      { dataPlane },
      DEFAULT_COMMISSION_SETTINGS
    );
    setSettings(result.value);
    setDbSettings(result.value);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(dbSettings);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('staff', 'commission_settings', settings, { dataPlane }, reason);
      
      toast({
        title: 'Commission settings saved',
        description: 'Commission rules have been updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save commission settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  const addPlan = () => {
    if (!newPlanName.trim()) return;
    const exists = settings.plans.some((p) => p.name.toLowerCase() === newPlanName.trim().toLowerCase());
    if (exists) {
      toast({ title: 'Plan already exists', variant: 'destructive' });
      return;
    }
    const ratePct = parseFloat(newPlanRate) || 0;
    setSettings({
      ...settings,
      plans: [
        ...settings.plans,
        {
          id: Date.now().toString(),
          name: newPlanName.trim(),
          description: 'Custom consultant commission structure.',
          ratePct,
          designerRates: {},
          bonusThresholdCents: 5000000,
          bonusAmountCents: 50000,
          active: true,
        },
      ],
    });
    setNewPlanName('');
    setNewPlanRate('3.0');
  };

  const removePlan = (id: string) => {
    setSettings({
      ...settings,
      plans: settings.plans.filter((p) => p.id !== id),
    });
  };

  const updatePlan = (id: string, fields: Partial<CommissionSettings['plans'][number]>) => {
    setSettings({
      ...settings,
      plans: settings.plans.map((p) =>
        p.id === id ? { ...p, ...fields } as typeof p : p
      ),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading commission plans…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Compensation & Commission Policies"
        description="Establish baseline percentages, tiered bonus overrides, and split rules."
        icon={<Percent className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. Senior Consultant Rate"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <input
              type="number"
              placeholder="Rate (%)"
              value={newPlanRate}
              onChange={(e) => setNewPlanRate(e.target.value)}
              className={`${inputCls} w-28 text-right`}
              step="0.1"
            />
            <button
              onClick={addPlan}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Create Plan
            </button>
          </div>

          <div className="space-y-3">
            {settings.plans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => updatePlan(plan.id, { name: e.target.value })}
                      className="text-sm font-semibold text-stone-800 border-b border-transparent hover:border-stone-300 focus:border-stone-900 bg-transparent px-1 -mx-1 outline-none"
                    />
                    <input
                      type="text"
                      value={plan.description}
                      onChange={(e) => updatePlan(plan.id, { description: e.target.value })}
                      className="text-xs text-stone-400 mt-1 block w-full border-b border-transparent hover:border-stone-200 focus:border-stone-900 bg-transparent px-1 -mx-1 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plan.active}
                      onCheckedChange={(checked) => updatePlan(plan.id, { active: checked })}
                      className="scale-90 data-[state=checked]:bg-rose-500"
                    />
                    <button
                      onClick={() => removePlan(plan.id)}
                      className="text-stone-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 pt-3 border-t border-stone-100">
                  <SettingsField label="Commission Percentage Rate (%)">
                    <input
                      type="number"
                      value={plan.ratePct}
                      onChange={(e) => updatePlan(plan.id, { ratePct: parseFloat(e.target.value) || 0 })}
                      className={inputCls}
                      step="0.1"
                      min="0"
                    />
                  </SettingsField>

                  <SettingsField label="Bonus Goal Threshold ($)">
                    <input
                      type="number"
                      value={(plan.bonusThresholdCents / 100).toFixed(0)}
                      onChange={(e) => updatePlan(plan.id, { bonusThresholdCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      className={inputCls}
                      min="0"
                    />
                  </SettingsField>

                  <SettingsField label="Goal Bonus Payout ($)">
                    <input
                      type="number"
                      value={(plan.bonusAmountCents / 100).toFixed(0)}
                      onChange={(e) => updatePlan(plan.id, { bonusAmountCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      className={inputCls}
                      min="0"
                    />
                  </SettingsField>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
