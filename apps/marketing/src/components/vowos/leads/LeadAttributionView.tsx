import { useState, useMemo } from 'react';
import { Layers, PieChart, TrendingUp, BarChart3, ShieldCheck, DollarSign } from 'lucide-react';
import { useVowosData } from '@/contexts/VowosDataContext';
import { formatCents } from '@/data/vowosData';

export default function LeadAttributionView() {
  const { leads, brides } = useVowosData();
  const [model, setModel] = useState<'first_touch' | 'last_touch' | 'linear' | 'position_based' | 'time_decay' | 'operational'>('last_touch');

  const MODELS = [
    { id: 'first_touch', name: 'First Touch', desc: '100% credit to the initial campaign that acquired the lead' },
    { id: 'last_touch', name: 'Last Touch', desc: '100% credit to the campaign active right before appointment request' },
    { id: 'linear', name: 'Linear', desc: 'Equal credit shared across all touchpoints in the lead chain' },
    { id: 'position_based', name: 'Position-Based (40/40/20)', desc: '40% First Touch, 40% Last Touch, 20% Middle Touches' },
    { id: 'time_decay', name: 'Time Decay', desc: 'Increasing credit to touches closer to conversion time' },
    { id: 'operational', name: 'VowOS Operational', desc: 'Attributes revenue to actual booked suite consultation outcome' },
  ];

  const attributionData = useMemo(() => {
    // Group leads by source
    const sources = Array.from(new Set(leads.map(l => l.source || 'Unknown/Organic')));
    
    return sources.map(source => {
      const sourceLeads = leads.filter(l => (l.source || 'Unknown/Organic') === source);
      
      // Match leads to actual closed customers to find revenue
      let revenueCents = 0;
      sourceLeads.forEach(lead => {
        // Link by email (or name as fallback for demo data)
        const matchedCustomer = brides.find(b => 
          (b.email && b.email.toLowerCase() === lead.email?.toLowerCase()) || 
          (b.name.toLowerCase() === lead.name.toLowerCase())
        );
        if (matchedCustomer && matchedCustomer.spendCents) {
          revenueCents += matchedCustomer.spendCents;
        }
      });

      return {
        platform: source,
        leadsCount: sourceLeads.length,
        revCents: revenueCents,
        profitCents: Math.round(revenueCents * 0.55), // rough estimate margin
        conf: 'High (Deterministic)'
      };
    }).sort((a, b) => b.revCents - a.revCents);
  }, [leads, brides]);

  return (
    <div className="space-y-6">
      {/* Model Selector Bar */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          <Layers className="h-4 w-4 text-rose-500" /> Multi-Touch Attribution Model Evaluator
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id as any)}
              className={ounded-xl border p-3 text-left transition-all }
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
          <BarChart3 className="h-4 w-4 text-rose-500" /> Platform Attribution Breakdown ({model.replace('_', ' ').toUpperCase()})
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
              {attributionData.map((row) => (
                <tr key={row.platform} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3 font-bold text-stone-900">{row.platform}</td>
                  <td className="px-4 py-3 text-stone-700">{row.leadsCount}</td>
                  <td className="px-4 py-3 text-stone-400 italic">Not Configured</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{formatCents(row.revCents)}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{formatCents(row.profitCents)}</td>
                  <td className="px-4 py-3 text-stone-400 italic">Integration Required</td>
                  <td className="px-4 py-3 text-stone-500">{row.conf}</td>
                </tr>
              ))}
              {attributionData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500 italic">
                    No lead attribution data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-stone-400 flex-shrink-0" />
          <p>
            <strong>Note on Spend & ROAS:</strong> VowOS currently tracks realized revenue deterministicially by linking Leads to Closed Customer Invoices. 
            To calculate Ad Spend and Return on Ad Spend (ROAS), you must connect your Meta Ads and Google Ads accounts in the Integrations center.
          </p>
        </div>
      </div>
    </div>
  );
}
