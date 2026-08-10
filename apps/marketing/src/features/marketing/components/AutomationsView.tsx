import { useState } from 'react';
import { MarketingAutomationRule } from '../types/marketingTypes';
import { Zap, ShieldCheck, CheckCircle2, Play, Pause, AlertTriangle } from 'lucide-react';
import { toast } from '@vowos/design-system';

const INITIAL_RULES: MarketingAutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Inventory Safeguard: Auto-Pause Ad when Stock = 0',
    brand: 'proper',
    triggerType: 'inventory_zero',
    condition: 'When sellable inventory quantity reaches 0 for a promoted Shopify product',
    action: 'Pause active paid campaign and send alert to Marketing Manager',
    active: true,
    requiresApproval: false,
    lastTriggeredAt: '2026-07-22T14:00:00Z',
  },
  {
    id: 'rule-2',
    name: 'Budget Guardrail: 80% Pacing Alert',
    brand: 'ido',
    triggerType: 'budget_warning',
    condition: 'When actual campaign spend reaches 80% of approved budget',
    action: 'Send high-priority email alert to Owner & Manager',
    active: true,
    requiresApproval: false,
    lastTriggeredAt: '2026-07-25T09:30:00Z',
  },
];

export default function AutomationsView() {
  const [rules, setRules] = useState<MarketingAutomationRule[]>(INITIAL_RULES);

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextActive = !r.active;
          toast({ title: 'Automation Rule Updated', description: `${r.name} is now ${nextActive ? 'Active' : 'Paused'}.` });
          return { ...r, active: nextActive };
        }
        return r;
      })
    );
  };

  return (
    <div className="space-y-6 select-none max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Rule-Based Marketing Automations</h2>
        <p className="text-xs text-stone-500">Automated inventory safeguards, budget pacing alerts, and lead assignment routing.</p>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-primary" />
                <h3 className="font-bold text-stone-900 text-sm">{rule.name}</h3>
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-bold uppercase text-[10px] text-stone-700">
                  {rule.brand}
                </span>
              </div>
              <button
                onClick={() => handleToggleRule(rule.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  rule.active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                }`}
              >
                {rule.active ? 'Active (Click to Pause)' : 'Paused (Click to Activate)'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-stone-50 p-3 rounded-xl border border-stone-200/80">
              <div>
                <span className="font-bold text-stone-500 uppercase text-[10px]">Trigger Condition</span>
                <p className="text-stone-800 font-medium">{rule.condition}</p>
              </div>
              <div>
                <span className="font-bold text-stone-500 uppercase text-[10px]">Automated Action</span>
                <p className="text-stone-800 font-medium">{rule.action}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
