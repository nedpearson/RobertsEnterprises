import { useState, useEffect } from 'react';
import { fetchCompetitorSignals } from '../api/marketingAIApi';
import { CompetitorSignal } from '../types';
import { Eye, ExternalLink, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';

interface CompetitorTrendsViewProps {
  brandFilter: string;
}

export default function CompetitorTrendsView({ brandFilter }: CompetitorTrendsViewProps) {
  const [signals, setSignals] = useState<CompetitorSignal[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchCompetitorSignals(brandFilter);
      setSignals(data);
    }
    load();
  }, [brandFilter]);

  return (
    <div className="space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-600" />
            Public Source Competitor &amp; Trend Radar
          </h2>
          <p className="text-xs text-stone-500">Lawful monitoring via Meta Ad Library, Google Ads Transparency &amp; search trend signals.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> 100% Lawful Public Sources
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competitor Signals */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-indigo-600" /> Competitor Ad Library Intelligence
          </h3>

          <div className="space-y-3">
            {signals.map((s) => (
              <div key={s.id} className="bg-stone-50 rounded-xl p-4 border border-stone-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">{s.competitorName}</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">
                    {s.source.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-stone-800">{s.headline}</h4>
                <p className="text-xs text-stone-600">{s.summary}</p>
                <a
                  href={s.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                >
                  View Public Ad Transparency Record <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Louisiana Trend Radar */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Louisiana Search &amp; Social Trend Radar
          </h3>

          <div className="space-y-3">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-emerald-950">pearl veil bridal accessories</span>
                <span className="font-extrabold text-emerald-700 text-xs">+64.2% Growth Velocity</span>
              </div>
              <p className="text-xs text-emerald-800">Matched to 6 Proper &amp; Co accessories in catalog.</p>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-emerald-950">linen bachelorette outfit Baton Rouge</span>
                <span className="font-extrabold text-emerald-700 text-xs">+42.8% Growth Velocity</span>
              </div>
              <p className="text-xs text-emerald-800">Matched to 11 Proper &amp; Co resort apparel products.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
