import { useState, useEffect } from 'react';
import { fetchAIRecommendations, approveAIRecommendation } from '../api/marketingAIApi';
import { AIRecommendation } from '../types';
import { CheckCircle2, XCircle, Clock, ShieldAlert, Sparkles, DollarSign, Layers } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';

interface RecommendationsViewProps {
  brandFilter: string;
}

export default function RecommendationsView({ brandFilter }: RecommendationsViewProps) {
  const [items, setItems] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchAIRecommendations(brandFilter);
      setItems(data);
      setLoading(false);
    }
    load();
  }, [brandFilter]);

  const handleApprove = async (id: string) => {
    await approveAIRecommendation(id);
    setItems(prev => prev.map(i => (i.id === id ? { ...i, status: 'approved' } : i)));
    toast({ title: 'Recommendation Approved', description: 'Action dispatched via durable job worker.' });
  };

  const handleDismiss = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Recommendation Dismissed', description: 'Item removed from queue.' });
  };

  if (loading) return <div className="p-8 text-center text-stone-500 animate-pulse">Loading AI Recommendation Queue...</div>;

  return (
    <div className="space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Ranked Recommendation Queue
          </h2>
          <p className="text-xs text-stone-500">Every recommendation is backed by evidence, confidence score &amp; data freshness.</p>
        </div>
        <span className="text-xs font-bold bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full border border-stone-200">
          {items.filter(i => i.status === 'pending').length} Pending Actions
        </span>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
            No active recommendations for {brandFilter}.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Updated {item.dataFreshnessSeconds}s ago
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900">{item.title}</h3>
                  <p className="text-xs text-stone-600 mt-0.5">{item.businessObjective}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100 inline-block">
                    {(item.confidenceScore * 100).toFixed(0)}% Confidence
                  </span>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Level {item.requiredGovernanceLevel} Approval Required
                  </p>
                </div>
              </div>

              {/* Evidence Section */}
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 text-xs space-y-1">
                <span className="font-bold text-stone-700 uppercase tracking-wider text-[10px]">Grounded Evidence:</span>
                {item.evidence.map((ev, idx) => (
                  <div key={idx} className="text-stone-600 flex items-center gap-1.5">
                    <span className="text-purple-600 font-bold">•</span> {ev}
                  </div>
                ))}
              </div>

              {/* Expected Impact & Financial Exposure */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-stone-100 text-xs">
                <div className="flex items-center gap-4">
                  {item.expectedImpact.incrementalGrossProfitCents && (
                    <div className="font-bold text-emerald-700">
                      Est. Profit Impact: +${(item.expectedImpact.incrementalGrossProfitCents / 100).toLocaleString()}
                    </div>
                  )}
                  <div className="text-stone-500">
                    Exposure: ${item.financialExposureCents > 0 ? (item.financialExposureCents / 100).toLocaleString() : '0.00'}
                  </div>
                </div>

                {item.status === 'approved' ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4" /> Approved &amp; Enqueued
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(item.id)} className={`${btnPrimary} bg-purple-600 hover:bg-purple-700 text-xs px-4 py-1.5`}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve Action
                    </button>
                    <button onClick={() => handleDismiss(item.id)} className={`${btnSecondary} text-xs px-3 py-1.5`}>
                      <XCircle className="h-4 w-4 mr-1 text-stone-400" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
