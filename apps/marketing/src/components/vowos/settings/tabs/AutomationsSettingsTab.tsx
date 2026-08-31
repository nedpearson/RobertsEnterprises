import { useEffect, useState } from 'react';
import { Zap, Loader2, Plus, Trash2, CheckCircle2, Play, Copy, RefreshCw, Eye } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@vowos/design-system';
import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane, supabase } from '@/lib/supabase';

interface AutomationRuleDetail {
  id: string;
  name: string;
  trigger: string;
  delayHours: number;
  templateId: string;
  active: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  successCount: number;
  failureCount: number;
  lastRun: string;
}

const DEFAULT_DETAILED_AUTOMATIONS: AutomationRuleDetail[] = [
  { id: '1', name: '7-Day Appointment Reminder', trigger: '7_days_before_appointment', delayHours: 0, templateId: '3', active: true, quietHoursStart: '20:00', quietHoursEnd: '08:00', successCount: 0, failureCount: 0, lastRun: '' },
  { id: '2', name: 'DNB Recovery Auto-Offer', trigger: '3_days_after_dnb', delayHours: 72, templateId: '2', active: false, quietHoursStart: '21:00', quietHoursEnd: '09:00', successCount: 0, failureCount: 0, lastRun: '' },
  { id: '3', name: 'Instant Booking Confirmation', trigger: 'booking_created', delayHours: 0, templateId: '1', active: true, quietHoursStart: '22:00', quietHoursEnd: '07:00', successCount: 0, failureCount: 0, lastRun: '' },
];

interface AutomationsSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function AutomationsSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: AutomationsSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AutomationRuleDetail[]>(DEFAULT_DETAILED_AUTOMATIONS);
  const [dbRules, setDbRules] = useState<AutomationRuleDetail[]>(DEFAULT_DETAILED_AUTOMATIONS);

  const [activeRuleId, setActiveRuleId] = useState<string | null>('1');
  const [testingRule, setTestingRule] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<AutomationRuleDetail[]>(
      'automation_rules_detailed',
      'automation_rules_detailed',
      { dataPlane },
      DEFAULT_DETAILED_AUTOMATIONS
    );
    setRules(result.value);
    setDbRules(result.value);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty = JSON.stringify(rules) !== JSON.stringify(dbRules);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('automation_rules_detailed', 'automation_rules_detailed', rules, { dataPlane }, reason);

      toast({
        title: 'Automation rules saved',
        description: 'Auto messaging guidelines updated successfully.',
      });
      setDbRules(rules);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save automation rules',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [rules]);

  const addRule = () => {
    const newRule: AutomationRuleDetail = {
      id: Date.now().toString(),
      name: 'New Custom Messaging Rule',
      trigger: 'booking_created',
      delayHours: 24,
      templateId: '1',
      active: true,
      quietHoursStart: '20:00',
      quietHoursEnd: '08:00',
      successCount: 0,
      failureCount: 0,
      lastRun: 'Never',
    };
    setRules([...rules, newRule]);
    setActiveRuleId(newRule.id);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    if (activeRuleId === id) {
      setActiveRuleId(rules[0]?.id || null);
    }
  };

  const updateRule = (id: string, fields: Partial<AutomationRuleDetail>) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...fields } as typeof r : r)));
  };

  const duplicateRule = (rule: AutomationRuleDetail) => {
    const dup: AutomationRuleDetail = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (Copy)`,
      successCount: 0,
      failureCount: 0,
      lastRun: 'Never',
    };
    setRules([...rules, dup]);
    setActiveRuleId(dup.id);
    toast({ title: 'Rule duplicated' });
  };

  const runTestRun = async (id: string) => {
    setTestingRule(true);
    try {
      const { data, error } = await supabase.rpc('test_automation_rule', { rule_id: id });
      if (error) throw error;
      toast({
        title: 'Dry-run execution finalized',
        description: `Found ${data?.matches || 0} matching candidate orders. ${data?.errors || 0} errors detected.`,
      });
    } catch (err: any) {
      toast({
        title: 'Dry-run execution failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setTestingRule(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading automation rules…
      </div>
    );
  }

  const selectedRule = rules.find((r) => r.id === activeRuleId);

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Durable Auto-Notification Rules"
        description="Establish delayed message workflows linked to booking statuses, cancellations, or inventory cycles."
        icon={<Zap className="h-5 w-5" />}
      >
        <div className="grid gap-6 md:grid-cols-3">
          {/* Rules List Panel */}
          <div className="space-y-2 border-r border-stone-100 pr-4 md:col-span-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Automation Rules</span>
              <button
                onClick={addRule}
                className="text-[10px] font-bold text-brand-primary hover:text-brand-primary px-2 py-0.5 border border-border-subtle rounded hover:bg-brand-soft/50"
              >
                + Create Rule
              </button>
            </div>

            {rules.map((rule) => (
              <button
                key={rule.id}
                onClick={() => setActiveRuleId(rule.id)}
                className={`flex w-full flex-col p-3 rounded-xl border text-left transition-all ${
                  activeRuleId === rule.id
                    ? 'border-rose-300 bg-brand-soft/30'
                    : 'border-stone-200 hover:bg-stone-50/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-stone-800 truncate pr-2">{rule.name}</span>
                  {!rule.active && (
                    <span className="text-[8px] font-bold bg-stone-100 px-1 rounded text-stone-400 uppercase">
                      Off
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-[9px] text-stone-400 w-full">
                  <span>Runs: {rule.successCount + rule.failureCount}</span>
                  <span className="text-stone-300">|</span>
                  <span>Errors: {rule.failureCount}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Rule Editor Panel */}
          {selectedRule ? (
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <input
                  type="text"
                  value={selectedRule.name}
                  onChange={(e) => updateRule(selectedRule.id, { name: e.target.value })}
                  className="text-sm font-semibold text-stone-800 border-b border-transparent hover:border-stone-300 focus:border-stone-900 bg-transparent outline-none flex-1 mr-4"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => duplicateRule(selectedRule)}
                    className="text-stone-400 hover:text-stone-600 p-1"
                    title="Duplicate Rule"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeRule(selectedRule.id)}
                    className="text-stone-400 hover:text-red-500 p-1 mr-2"
                    title="Delete Rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1.5 border-l border-stone-200 pl-3">
                    <span className="text-xs text-stone-500">Active</span>
                    <Switch
                      checked={selectedRule.active}
                      onCheckedChange={(checked) => updateRule(selectedRule.id, { active: checked })}
                      className="scale-90 data-[state=checked]:bg-brand-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField label="Trigger Event Hook">
                  <select
                    value={selectedRule.trigger}
                    onChange={(e) => updateRule(selectedRule.id, { trigger: e.target.value })}
                    className={inputCls}
                  >
                    <option value="booking_created">Online Booking Created</option>
                    <option value="7_days_before_appointment">7 Days Before Appt</option>
                    <option value="3_days_after_dnb">3 Days After Did Not Buy</option>
                    <option value="fitting_scheduled">Fitting Scheduled</option>
                    <option value="pickup_ready">Pickup Marked Ready</option>
                  </select>
                </SettingsField>

                <SettingsField label="Execution Delay (hours)">
                  <input
                    type="number"
                    value={selectedRule.delayHours}
                    onChange={(e) => updateRule(selectedRule.id, { delayHours: parseInt(e.target.value) || 0 })}
                    className={inputCls}
                    min="0"
                  />
                </SettingsField>

                <SettingsField label="Quiet Hours Start">
                  <input
                    type="time"
                    value={selectedRule.quietHoursStart}
                    onChange={(e) => updateRule(selectedRule.id, { quietHoursStart: e.target.value })}
                    className={inputCls}
                  />
                </SettingsField>

                <SettingsField label="Quiet Hours End">
                  <input
                    type="time"
                    value={selectedRule.quietHoursEnd}
                    onChange={(e) => updateRule(selectedRule.id, { quietHoursEnd: e.target.value })}
                    className={inputCls}
                  />
                </SettingsField>

                <SettingsField label="Linked Message Template" className="sm:col-span-2">
                  <select
                    value={selectedRule.templateId}
                    onChange={(e) => updateRule(selectedRule.id, { templateId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="1">Booking Created Confirmation (Email)</option>
                    <option value="2">Booking Fee Invoice Request (SMS)</option>
                    <option value="3">7-Day Appointment Reminder (SMS)</option>
                    <option value="4">Alterations Completed Pickup (Email)</option>
                  </select>
                </SettingsField>
              </div>

              <div className="flex gap-2 items-center justify-between pt-3 border-t border-stone-100 mt-4">
                <div className="text-[10px] text-stone-400">
                  Last ran: {selectedRule.lastRun !== 'Never' ? new Date(selectedRule.lastRun).toLocaleString() : 'Never'}
                </div>
                <button
                  onClick={() => runTestRun(selectedRule.id)}
                  disabled={testingRule}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" /> Dry Run Rule
                </button>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 flex items-center justify-center border border-dashed border-stone-200 rounded-xl p-8 text-stone-400 italic">
              Select or create a rule to configure parameters.
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
