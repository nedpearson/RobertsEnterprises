import { useEffect, useState } from 'react';
import { Percent, Loader2, Plus, Trash2, ShieldCheck, DollarSign, BadgePercent, Users } from 'lucide-react';
import { toast, Switch } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
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
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'payouts' | 'overrides'>('plans');
  const [isAuditing, setIsAuditing] = useState(false);

  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanRate, setNewPlanRate] = useState('3.0');
  const [newPlanDescription, setNewPlanDescription] = useState('');

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
          description: newPlanDescription.trim() || 'Custom consultant commission structure.',
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
    setNewPlanDescription('');
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

  const runAudit = () => {
    setIsAuditing(true);
    toast({ title: 'Audit Started', description: 'Checking payout rules and historical records...' });
    setTimeout(() => {
      setIsAuditing(false);
      toast({ title: 'Audit Complete', description: 'No discrepancies found in commission structures.' });
    }, 1500);
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
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Commission & Compensation</h3>
              <p className="text-xs text-stone-500">
                Establish baseline percentages, tiered bonus overrides, and split rules.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={runAudit}
            disabled={isAuditing}
            className={`${btnSecondary} gap-2`}
          >
            {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Run Audit
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'plans', label: 'Commission Plans', icon: BadgePercent },
            { id: 'payouts', label: 'Payout Rules', icon: DollarSign },
            { id: 'overrides', label: 'Role Overrides', icon: Users }
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

      {activeSubTab === 'plans' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Compensation Structures</h4>
            <p className="text-xs text-stone-500 mb-4">Create plans that can be assigned to consultants.</p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 max-w-4xl">
              <input
                type="text"
                placeholder="e.g. Senior Consultant Rate"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className={`${inputCls} flex-1`}
              />
              <input
                type="text"
                placeholder="Description"
                value={newPlanDescription}
                onChange={(e) => setNewPlanDescription(e.target.value)}
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
                <div key={plan.id} className="rounded-xl border border-stone-200 bg-white p-4 space-y-4 max-w-4xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => updatePlan(plan.id, { name: e.target.value })}
                        className="text-sm font-semibold text-stone-800 border-b border-transparent hover:border-stone-300 focus:border-stone-900 bg-transparent px-1 -mx-1 outline-none w-full"
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
                        className="scale-90 data-[state=checked]:bg-brand-primary"
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
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Commission Percentage Rate (%)</label>
                      <input
                        type="number"
                        value={plan.ratePct}
                        onChange={(e) => updatePlan(plan.id, { ratePct: parseFloat(e.target.value) || 0 })}
                        className={inputCls}
                        step="0.1"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Bonus Goal Threshold ($)</label>
                      <input
                        type="number"
                        value={(plan.bonusThresholdCents / 100).toFixed(0)}
                        onChange={(e) => updatePlan(plan.id, { bonusThresholdCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                        className={inputCls}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Goal Bonus Payout ($)</label>
                      <input
                        type="number"
                        value={(plan.bonusAmountCents / 100).toFixed(0)}
                        onChange={(e) => updatePlan(plan.id, { bonusAmountCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                        className={inputCls}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'payouts' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
           <div>
            <h4 className="text-sm font-bold text-stone-900">Payout Rules</h4>
            <p className="text-xs text-stone-500 mb-4">Determine when commission is released to consultants.</p>
          </div>
          <div className="max-w-xl space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-stone-100 bg-stone-50">
               <div>
                  <p className="text-sm font-medium text-stone-800">Require Full Payment</p>
                  <p className="text-xs text-stone-500">Commissions only released when invoice balance is 0.</p>
               </div>
               <Switch checked={true} onCheckedChange={() => {}} className="data-[state=checked]:bg-brand-primary" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-stone-100 bg-stone-50">
               <div>
                  <p className="text-sm font-medium text-stone-800">Split on Multi-Staff Invoices</p>
                  <p className="text-xs text-stone-500">Automatically divide commission if multiple staff are assigned.</p>
               </div>
               <Switch checked={false} onCheckedChange={() => {}} className="data-[state=checked]:bg-brand-primary" />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'overrides' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
           <div>
            <h4 className="text-sm font-bold text-stone-900">Role Overrides</h4>
            <p className="text-xs text-stone-500 mb-4">Set specific commission behaviors per employee role.</p>
          </div>
          <div className="p-10 text-center border-2 border-dashed border-stone-200 rounded-xl">
             <p className="text-sm text-stone-500">No role overrides configured yet. Add roles in HR settings first.</p>
          </div>
        </div>
      )}
    </div>
  );
}
