import { useState } from 'react';
import { Layers, Sparkles, TrendingUp, CheckCircle2, AlertCircle, Play, Pause } from 'lucide-react';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';

export default function ExperimentsView() {
  const [activeBandit, setActiveBandit] = useState({
    name: 'Proper Summer Apparel Headline Bandit',
    status: 'running',
    explorationFloorPct: 5,
    maxAllocationShiftPct: 15,
    variants: [
      { id: 'v1', name: 'Variant A: "Elevate Your Summer Style"', weight: 58.4, wins: 45, conversionRate: '4.8%' },
      { id: 'v2', name: 'Variant B: "Luxury Baton Rouge Linen Outfits"', weight: 36.6, wins: 28, conversionRate: '4.2%' },
      { id: 'v3', name: 'Variant C: "Boutique Apparel Made For You"', weight: 5.0, wins: 4, conversionRate: '2.1%' }
    ]
  });

  return (
    <div className="space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-vowos-violet" />
            Experimentation &amp; Multi-Armed Bandit Hub
          </h2>
          <p className="text-xs text-stone-500">Thompson Sampling adaptive allocation with strict 5% exploration floor guardrails.</p>
        </div>
      </div>

      {/* Active Bandit Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              Active Bandit Experiment
            </span>
            <h3 className="text-base font-bold text-stone-900 mt-1">{activeBandit.name}</h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
            <Sparkles className="h-4 w-4 text-vowos-violet" /> Thompson Sampling Active
          </div>
        </div>

        {/* Variants Distribution Breakdown */}
        <div className="space-y-4">
          {activeBandit.variants.map((variant) => (
            <div key={variant.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-800">{variant.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-stone-500">Conv. Rate: <strong className="text-stone-800">{variant.conversionRate}</strong></span>
                  <span className="font-bold text-purple-700">{variant.weight}% Budget Weight</span>
                </div>
              </div>
              <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-500 rounded-full"
                  style={{ width: `${variant.weight}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-600 flex items-center justify-between">
          <span>Exploration Floor: <strong>{activeBandit.explorationFloorPct}% min per variant</strong></span>
          <span>Max Allocation Shift: <strong>{activeBandit.maxAllocationShiftPct}% per cycle</strong></span>
        </div>
      </div>
    </div>
  );
}
