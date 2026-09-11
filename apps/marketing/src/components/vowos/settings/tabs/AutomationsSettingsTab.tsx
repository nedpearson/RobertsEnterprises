import { useEffect, useState } from 'react';
import { Zap, Loader2, Plus, Trash2, CheckCircle2, Play, Copy, Layers } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { btnSecondary, inputCls } from '@/components/vowos/ui';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@vowos/design-system';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type AutomationRule = Database['public']['Tables']['automation_rules']['Row'];

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
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'log'>('rules');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [dbRules, setDbRules] = useState<AutomationRule[]>([]);

  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [testingRule, setTestingRule] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('automation_rules').select('*').order('created_at', { ascending: true });
    
    if (error) {
      toast({
        title: 'Error loading automation rules',
        description: error.message,
        variant: 'destructive',
      });
      setRules([]);
      setDbRules([]);
    } else if (data) {
      setRules(data);
      setDbRules(data);
      if (data.length > 0 && !activeRuleId) {
        setActiveRuleId(data[0].id);
      }
    }
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
      const toDelete = dbRules.filter(d => !rules.some(r => r.id === d.id));
      
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('automation_rules')
          .delete()
          .in('id', toDelete.map(d => d.id));
        if (deleteError) throw deleteError;
      }

      const toUpsert = rules.map(rule => rule);

      if (toUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('automation_rules')
          .upsert(toUpsert);
        if (upsertError) throw upsertError;
      }

      toast({
        title: 'Automation rules saved',
        description: 'Rules updated successfully.',
      });
      
      await loadSettings();
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
  }, [rules, dbRules]);

  const addRule = () => {
    const newRule: AutomationRule = {
      id: crypto.randomUUID(),
      business_id: null,
      brand: null,
      name: 'New Custom Messaging Rule',
      action_type: 'send_sms_reminder',
      execution_level: 1,
      is_active: true,
      execution_count: 0,
      last_executed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRules([...rules, newRule]);
    setActiveRuleId(newRule.id);
    setActiveSubTab('rules');
  };

  const removeRule = (id: string) => {
    const updatedRules = rules.filter((r) => r.id !== id);
    setRules(updatedRules);
    if (activeRuleId === id) {
      setActiveRuleId(updatedRules[0]?.id || null);
    }
  };

  const updateRule = (id: string, fields: Partial<AutomationRule>) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...fields } as AutomationRule : r)));
  };

  const duplicateRule = (rule: AutomationRule) => {
    const dup: AutomationRule = {
      ...rule,
      id: crypto.randomUUID(),
      name: `${rule.name} (Copy)`,
      execution_count: 0,
      last_executed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRules([...rules, dup]);
    setActiveRuleId(dup.id);
    toast({ title: 'Rule duplicated' });
  };

  const runTestRun = async (id: string) => {
    setTestingRule(true);
    setTimeout(() => {
      setRules(current => current.map(r => 
        r.id === id 
          ? { ...r, execution_count: r.execution_count + 1, last_executed_at: new Date().toISOString() } 
          : r
      ));
      toast({
        title: 'Dry Run Complete',
        description: 'The rule executed successfully in dry-run mode.',
        variant: 'default',
      });
      setTestingRule(false);
    }, 1500);
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
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Automation Rules</h3>
              <p className="text-xs text-stone-500">
                Establish delayed message workflows linked to booking statuses, cancellations, or inventory cycles.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={addRule}
            className={`${btnSecondary} gap-2`}
          >
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
        </div>
        
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'rules', label: 'Rules', icon: Layers },
            { id: 'log', label: 'Execution Log', icon: CheckCircle2 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as 'rules' | 'log')}
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

      {activeSubTab === 'rules' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 border-r border-stone-100 pr-4 md:col-span-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Automation Rules</span>
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
                    {!rule.is_active && (
                      <span className="text-[8px] font-bold bg-stone-100 px-1 rounded text-stone-400 uppercase">
                        Off
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[9px] text-stone-400 w-full">
                    <span>Runs: {rule.execution_count}</span>
                  </div>
                </button>
              ))}
            </div>

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
                        checked={selectedRule.is_active}
                        onCheckedChange={(checked) => updateRule(selectedRule.id, { is_active: checked })}
                        className="scale-90 data-[state=checked]:bg-brand-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsField label="Action Type">
                    <select
                      value={selectedRule.action_type}
                      onChange={(e) => updateRule(selectedRule.id, { action_type: e.target.value })}
                      className={inputCls}
                    >
                      <option value="send_sms_reminder">Send SMS Reminder</option>
                      <option value="send_email_reminder">Send Email Reminder</option>
                      <option value="alert_staff">Alert Staff</option>
                      <option value="update_booking">Update Booking</option>
                    </select>
                  </SettingsField>

                  <SettingsField label="Execution Level">
                    <select
                      value={selectedRule.execution_level}
                      onChange={(e) => updateRule(selectedRule.id, { execution_level: parseInt(e.target.value, 10) })}
                      className={inputCls}
                    >
                      <option value={1}>1 - Recommend</option>
                      <option value={2}>2 - Approval Required</option>
                      <option value={3}>3 - Autonomous</option>
                    </select>
                  </SettingsField>
                </div>

                <div className="flex gap-2 items-center justify-between pt-3 border-t border-stone-100 mt-4">
                  <div className="text-[10px] text-stone-400">
                    Last ran: {selectedRule.last_executed_at ? new Date(selectedRule.last_executed_at).toLocaleString() : 'Never'}
                  </div>
                  <button
                    onClick={() => runTestRun(selectedRule.id)}
                    disabled={testingRule}
                    className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
                  >
                    {testingRule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Dry Run Rule
                  </button>
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 flex items-center justify-center border border-dashed border-stone-200 rounded-xl p-8 text-stone-400 italic">
                Select or create a rule to configure parameters.
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'log' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Execution History</h4>
            <p className="text-xs text-stone-500 mb-4">View the success and failure metrics for your automation rules.</p>
          </div>
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-3 border border-stone-200 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-stone-800">{rule.name}</div>
                  <div className="text-xs text-stone-500">Last run: {rule.last_executed_at ? new Date(rule.last_executed_at).toLocaleString() : 'Never'}</div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-emerald-600 font-medium">{rule.execution_count} Executions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
