import { useState } from 'react';
import { Settings, Users, ArrowRight, Plus, GitBranch, ShieldCheck } from 'lucide-react';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';

interface RoutingRule {
  id: string;
  name: string;
  condition: string;
  assignee: string;
  active: boolean;
}

const DEFAULT_RULES: RoutingRule[] = [
  { id: '1', name: 'VIP Brides', condition: 'Budget > $5,000', assignee: 'Sarah Jenkins (Senior Stylist)', active: true },
  { id: '2', name: 'The Knot Inquiries', condition: 'Source = The Knot', assignee: 'Round Robin (Sales Team)', active: true },
  { id: '3', name: 'Out of State', condition: 'State != TX', assignee: 'Virtual Consultation Team', active: false },
];

export default function LeadRoutingSettings() {
  const [rules, setRules] = useState<RoutingRule[]>(DEFAULT_RULES);
  const [autoAssign, setAutoAssign] = useState(true);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Lead Routing Engine</h2>
          <p className="text-stone-500 text-sm">Configure how incoming leads are distributed to your team.</p>
        </div>
        <button className={btnPrimary}>
          <Plus className="h-4 w-4" /> New Routing Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-brand-primary" /> Global Settings
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-1 rounded border-stone-300 text-brand-primary focus:ring-brand-primary"
                  checked={autoAssign}
                  onChange={(e) => setAutoAssign(e.target.checked)}
                />
                <div>
                  <p className="text-sm font-bold text-stone-900">Auto-Assign New Leads</p>
                  <p className="text-xs text-stone-500">Automatically assign leads as they arrive based on active rules.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-1 rounded border-stone-300 text-brand-primary focus:ring-brand-primary"
                  defaultChecked={true}
                />
                <div>
                  <p className="text-sm font-bold text-stone-900">SLA Reassignment</p>
                  <p className="text-xs text-stone-500">Re-route leads if not contacted within SLA timeframe.</p>
                </div>
              </label>
            </div>
            
            <div className="mt-6 pt-6 border-t border-stone-100">
              <button className={`${btnSecondary} w-full justify-center`}>
                Save Preferences
              </button>
            </div>
          </div>

          <div className="bg-brand-soft/50 border border-brand-primary/20 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-brand-primary mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Routing Active
            </h3>
            <p className="text-xs text-stone-600 mb-4">
              Your VowOS tenant is currently processing leads through the automated routing engine.
            </p>
            <div className="flex items-center justify-between text-xs font-bold text-stone-900 bg-white p-3 rounded-lg border border-stone-200">
              <span>Leads Routed Today</span>
              <span className="text-brand-primary">14</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-stone-500" /> Active Rules
              </h3>
              <span className="text-xs font-bold text-stone-500">{rules.length} configured</span>
            </div>
            
            <div className="divide-y divide-stone-100">
              {rules.map((rule) => (
                <div key={rule.id} className={`p-5 flex items-center justify-between transition-colors ${rule.active ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className={`text-sm font-bold ${rule.active ? 'text-stone-900' : 'text-stone-500'}`}>{rule.name}</h4>
                      {!rule.active && <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 bg-stone-200 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-stone-500">If: <strong className="text-stone-700">{rule.condition}</strong></span>
                      <ArrowRight className="h-3 w-3 text-stone-300" />
                      <span className="text-stone-500 flex items-center gap-1"><Users className="h-3 w-3" /> {rule.assignee}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 ml-4">
                    <button className="text-xs font-medium text-brand-primary hover:text-brand-primary-hover">Edit</button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={rule.active}
                        onChange={() => toggleRule(rule.id)}
                      />
                      <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-status-success"></div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
