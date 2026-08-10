import { TrendingUp, BarChart3, AlertTriangle, PackageOpen, Download } from 'lucide-react';
import { formatCents } from '@/data/vowosData';

export default function OTBForecastingWidget() {
  // Simulated ML forecasts for the next bridal market
  const recommendedCapital = 12500000; // $125,000
  const forecastedGrowth = 14.5;
  const confidenceScore = 92;

  const buyRecommendations = [
    { category: 'Clean Aesthetic (Satin/Crepe)', designer: 'Ines Di Santo', units: 12, budgetCents: 4500000, trend: 'up' },
    { category: 'A-Line Lace', designer: 'Martina Liana', units: 8, budgetCents: 1800000, trend: 'stable' },
    { category: 'Plus Size (Sizes 18-24)', designer: 'Essense of Australia', units: 15, budgetCents: 2200000, trend: 'up' },
    { category: 'Mermaid Beaded', designer: 'Berta', units: 5, budgetCents: 4000000, trend: 'down' },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-border-subtle bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-black text-brand-secondary flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-primary" />
            AI Open-to-Buy (OTB) Forecast
          </h2>
          <p className="text-xs text-brand-primary-hover/80 mt-1 max-w-xl">
            Predictive capital allocation for upcoming bridal markets based on trailing 12-month sales data, current pipeline velocity, and regional search trends.
          </p>
        </div>
        <div className="flex gap-2">
           <button className="px-3 py-1.5 rounded-lg bg-white border border-border-subtle text-xs font-bold text-brand-primary-hover hover:bg-brand-soft transition-colors shadow-sm">
             Adjust Parameters
           </button>
           <button className="px-3 py-1.5 rounded-lg bg-brand-primary-hover border border-rose-700 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-1.5">
             <Download className="h-3.5 w-3.5" /> Export Buy Sheet
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-white p-4 border border-border-subtle shadow-sm col-span-1 md:col-span-2">
           <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Recommended OTB Capital</p>
           <div className="flex items-baseline gap-3">
             <p className="text-4xl font-black text-stone-900">{formatCents(recommendedCapital)}</p>
             <span className="flex items-center text-xs font-bold text-status-success">
               <TrendingUp className="h-3.5 w-3.5 mr-1" /> +{forecastedGrowth}% YoY
             </span>
           </div>
           <p className="text-xs text-stone-400 mt-2 flex items-center gap-1">
             <AlertTriangle className="h-3.5 w-3.5 text-status-warning" /> {confidenceScore}% confidence based on 4,200 data points.
           </p>
        </div>

        <div className="rounded-xl bg-brand-primary-hover p-4 shadow-sm text-white flex flex-col justify-center">
           <p className="text-[10px] font-bold text-rose-200 uppercase tracking-wider mb-1">Top Growth Category</p>
           <p className="text-lg font-bold">Clean Aesthetic</p>
           <p className="text-xs text-rose-100 mt-1">Projected 32% increase in demand next season.</p>
        </div>

        <div className="rounded-xl bg-white p-4 border border-border-subtle shadow-sm flex flex-col justify-center">
           <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">High Risk Alert</p>
           <p className="text-sm font-bold text-stone-900">Mermaid Beaded</p>
           <p className="text-xs text-brand-primary mt-1 font-medium">Demand dropping. Reduce buys by 15%.</p>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase">
              <th className="py-2.5 px-4">Category Focus</th>
              <th className="py-2.5 px-4">Primary Designer</th>
              <th className="py-2.5 px-4 text-center">Suggested Units</th>
              <th className="py-2.5 px-4 text-right">Capital Allocation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {buyRecommendations.map((rec, i) => (
              <tr key={i} className="hover:bg-stone-50 transition-colors">
                <td className="py-2.5 px-4 font-medium text-stone-900 flex items-center gap-2">
                  <PackageOpen className="h-3.5 w-3.5 text-stone-400" /> {rec.category}
                </td>
                <td className="py-2.5 px-4 text-stone-600">{rec.designer}</td>
                <td className="py-2.5 px-4 text-center font-bold text-stone-700">{rec.units}</td>
                <td className="py-2.5 px-4 text-right font-bold text-status-success">{formatCents(rec.budgetCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
