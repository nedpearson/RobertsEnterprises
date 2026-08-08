import { useState, useEffect } from 'react';
import { fetchAIBrief, fetchAIRecommendations } from '../api/marketingAIApi';
import { AIRecommendation } from '../types';
import { Sparkles, TrendingUp, AlertTriangle, ShieldCheck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';

interface AICommandCenterViewProps {
  brandFilter: string;
  onNavigateTab: (tab: string) => void;
}

export default function AICommandCenterView({ brandFilter, onNavigateTab }: AICommandCenterViewProps) {
  const [brief, setBrief] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const b = await fetchAIBrief(brandFilter);
      const r = await fetchAIRecommendations(brandFilter);
      setBrief(b);
      setRecommendations(r);
      setLoading(false);
    }
    loadData();
  }, [brandFilter]);

  if (loading) {
    return <div className="p-8 text-center text-stone-500 font-medium animate-pulse">Loading AI Growth Intelligence...</div>;
  }

  return (
    <div className="space-y-6 select-none">
      {/* Hero Daily Brief Card */}
      <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-purple-950 to-stone-900 p-6 text-white shadow-lg border border-purple-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-300">
              <Sparkles className="h-4 w-4 text-purple-400 animate-spin-slow" />
              Executive Growth Intelligence Brief — {brief?.brand || 'Proper & Company'}
            </div>
            <h2 className="text-2xl font-extrabold text-white">Closed-Loop Optimization Engine</h2>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              Optimizing advertising spend continuously toward <strong className="text-purple-200">Incremental Gross Profit After Ad Expense</strong> by connecting ads → site visits → leads → appointments → contracts → sales → gross margin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('copilot')}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4" /> Ask Copilot
            </button>
            <button
              onClick={() => onNavigateTab('copilot')}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
            >
              Review Actions ({recommendations.length})
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-4">
          <div className="bg-white/5 rounded-xl p-3">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Optimization Objective</span>
            <p className="text-sm font-bold text-white mt-0.5">Incremental Gross Profit</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Estimated Incremental ROAS</span>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">3.42x (+14.2% YoY)</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">Governance Mode</span>
            <p className="text-sm font-bold text-stone-200 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Mode 2 (Human Approval)
            </p>
          </div>
        </div>
      </div>

      {/* Top Priorities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Growth Opportunities */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Top Growth Opportunities
            </h3>
            <span className="text-[11px] font-semibold text-stone-500">Sorted by Profit Impact</span>
          </div>

          <div className="space-y-3">
            {brief?.topGrowthOpportunities?.map((opp: any) => (
              <div key={opp.id} className="rounded-xl bg-stone-50 p-4 border border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-stone-900 text-sm">{opp.title}</h4>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    +${(opp.profitImpactCents / 100).toLocaleString()} est. incremental profit
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('copilot')}
                  className="rounded-lg bg-stone-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-stone-800 transition-all flex items-center gap-1 cursor-pointer"
                >
                  View <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Top Risks & Anomalies */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Detected Anomaly &amp; Risk Alerts
            </h3>
            <span className="text-[11px] font-semibold text-stone-500">Real-Time Audited</span>
          </div>

          <div className="space-y-3">
            {brief?.topRisks?.map((risk: any) => (
              <div key={risk.id} className="rounded-xl bg-amber-500/10 p-4 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-amber-900 text-sm">{risk.title}</h4>
                  <p className="text-xs text-amber-800 mt-0.5">Severity: {risk.severity.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => onNavigateTab('creatives')}
                  className="rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-amber-700 transition-all cursor-pointer"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
