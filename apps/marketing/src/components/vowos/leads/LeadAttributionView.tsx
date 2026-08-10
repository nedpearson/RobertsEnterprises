import { useState } from 'react';
import { Layers, PieChart, TrendingUp, BarChart3, ShieldCheck, DollarSign } from 'lucide-react';
import { UnifiedLeadRecord, leadService } from '@/lib/services/leadIntelligenceService';

export default function LeadAttributionView() {
  const [model, setModel] = useState<'first_touch' | 'last_touch' | 'linear' | 'position_based' | 'time_decay' | 'operational'>('last_touch');

  const MODELS = [
    { id: 'first_touch', name: 'First Touch', desc: '100% credit to the initial campaign that acquired the lead' },
    { id: 'last_touch', name: 'Last Touch', desc: '100% credit to the campaign active right before appointment request' },
    { id: 'linear', name: 'Linear', desc: 'Equal credit shared across all touchpoints in the lead chain' },
    { id: 'position_based', name: 'Position-Based (40/40/20)', desc: '40% First Touch, 40% Last Touch, 20% Middle Touches' },
    { id: 'time_decay', name: 'Time Decay', desc: 'Increasing credit to touches closer to conversion time' },
    { id: 'operational', name: 'VowOS Operational', desc: 'Attributes revenue to actual booked suite consultation outcome' },
  ];

  return (
    <div className="space-y-6">
      {/* Model Selector Bar */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          <Layers className="h-4 w-4 text-brand-primary" /> Multi-Touch Attribution Model Evaluator
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id as any)}
              className={`rounded-xl border p-3 text-left transition-all ${
                model === m.id ? 'border-brand-primary bg-brand-soft/50 text-brand-secondary ring-1 ring-focus-ring font-bold' : 'border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              <p className="text-xs font-bold">{m.name}</p>
              <p className="text-[10px] text-stone-400 mt-1 leading-tight">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Attribution Performance Summary Table */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-primary" /> Platform Attribution Breakdown ({model.replace('_', ' ').toUpperCase()})
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Attributed Leads</th>
                <th className="px-4 py-3">Attributed Spend</th>
                <th className="px-4 py-3">Attributed Revenue</th>
                <th className="px-4 py-3">Attributed Gross Profit</th>
                <th className="px-4 py-3">ROAS</th>
                <th className="px-4 py-3">Attribution Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {[
                { platform: 'Meta (Instagram/FB)', leads: 84, spend: '$2,450', rev: '$18,400', profit: '$10,120', roas: '7.51x', conf: '96%' },
                { platform: 'Google Ads', leads: 42, spend: '$1,870', rev: '$14,200', profit: '$7,810', roas: '7.59x', conf: '94%' },
                { platform: 'TikTok Ads', leads: 28, spend: '$890', rev: '$5,600', profit: '$3,080', roas: '6.29x', conf: '88%' },
                { platform: 'Pinterest Ads', leads: 19, spend: '$540', rev: '$3,800', profit: '$2,090', roas: '7.03x', conf: '85%' },
                { platform: 'Shopify E-commerce', leads: 31, spend: '$0', rev: '$6,900', profit: '$3,795', roas: '∞', conf: '99%' },
              ].map((row) => (
                <tr key={row.platform} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3 font-bold text-stone-900">{row.platform}</td>
                  <td className="px-4 py-3 text-stone-700">{row.leads}</td>
                  <td className="px-4 py-3 text-stone-700">{row.spend}</td>
                  <td className="px-4 py-3 font-bold text-status-success">{row.rev}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{row.profit}</td>
                  <td className="px-4 py-3 font-bold text-stone-900">{row.roas}</td>
                  <td className="px-4 py-3 text-stone-500">{row.conf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
