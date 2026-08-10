import { useState } from 'react';
import { Image, Sparkles, AlertTriangle, CheckCircle2, RefreshCw, BarChart2 } from 'lucide-react';

export default function CreativeIntelligenceView() {
  const [creatives] = useState([
    {
      id: 'cr_1',
      title: 'Summer Linen Styling Video',
      brandFit: 94,
      mobileReadability: 88,
      textDensityPct: 14.5,
      fatigueRiskScore: 78,
      status: 'fatigued',
      impressions: 48200,
      ctr: '1.42%'
    },
    {
      id: 'cr_2',
      title: 'Coastal Midi Hero Reel',
      brandFit: 96,
      mobileReadability: 92,
      textDensityPct: 8.2,
      fatigueRiskScore: 12,
      status: 'performing',
      impressions: 12400,
      ctr: '3.85%'
    }
  ]);

  return (
    <div className="space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Image className="h-5 w-5 text-vowos-violet" />
            Creative Intelligence &amp; Fatigue Studio
          </h2>
          <p className="text-xs text-stone-500">Visual score breakdown, mobile readability, text density &amp; creative memory bank.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {creatives.map((c) => (
          <div key={c.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base">{c.title}</h3>
                <p className="text-xs text-stone-500">{c.impressions.toLocaleString()} impressions • {c.ctr} CTR</p>
              </div>
              {c.status === 'fatigued' ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> High Fatigue
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> High Performing
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase">Brand Fit</span>
                <p className="font-extrabold text-stone-900 text-sm">{c.brandFit}/100</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase">Mobile Read</span>
                <p className="font-extrabold text-stone-900 text-sm">{c.mobileReadability}/100</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase">Text Density</span>
                <p className="font-extrabold text-stone-900 text-sm">{c.textDensityPct}%</p>
              </div>
            </div>

            {c.status === 'fatigued' && (
              <div className="p-3 bg-status-warning/10 rounded-xl border border-amber-100 text-xs text-amber-900 font-medium">
                High fatigue risk detected (&gt;45k impressions). Swap out hero video to protect campaign CAC.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
