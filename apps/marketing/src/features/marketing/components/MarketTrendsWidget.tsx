import { TrendingUp, ArrowUpRight, Search, Sparkles } from 'lucide-react';
import { btnPrimary } from '@/components/vowos/ui';

export function MarketTrendsWidget() {
  const trends = [
    {
      id: 1,
      brand: 'I Do Bridal',
      keyword: 'Square neckline wedding dress',
      volume: '+142%',
      insight: 'High local search velocity in Baton Rouge area.',
      action: 'Create Meta Ad',
    },
    {
      id: 2,
      brand: 'Proper & Co',
      keyword: 'Pearl bridal block heels',
      volume: '+89%',
      insight: 'Trending across TikTok organically this week.',
      action: 'Boost on TikTok',
    },
    {
      id: 3,
      brand: 'I Do Bridal',
      keyword: 'Clean aesthetic bridal gowns',
      volume: '+56%',
      insight: 'Consistent upward trend over last 30 days.',
      action: 'Update Pinterest Board',
    },
  ];

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" /> AI Market Trend Intelligence
          </h3>
          <p className="text-xs text-stone-500 mt-1">Real-time internet search velocity for your demographic</p>
        </div>
        <div className="flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Live Sync</span>
        </div>
      </div>

      <div className="space-y-3">
        {trends.map((trend) => (
          <div key={trend.id} className="rounded-xl border border-stone-100 bg-stone-50/50 p-3 flex flex-col gap-2 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30">
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${trend.brand === 'I Do Bridal' ? 'bg-rose-100 text-rose-700' : 'bg-stone-200 text-stone-800'}`}>
                  {trend.brand}
                </span>
                <p className="font-bold text-stone-900 mt-1.5 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-stone-400" /> {trend.keyword}
                </p>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-xs border border-emerald-100">
                <ArrowUpRight className="h-3 w-3" /> {trend.volume}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-stone-500">{trend.insight}</p>
              <button className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                {trend.action} &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
