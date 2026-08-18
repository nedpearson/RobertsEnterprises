import { ArrowLeftRight, Sparkles, AlertTriangle, ArrowRight, Check } from 'lucide-react';

export default function RebalancingEngine() {
  const recommendations = [
    {
      id: 1,
      item: 'Ines Di Santo - Quice',
      type: 'Sample Gown',
      from: 'Baton Rouge',
      to: 'Covington',
      reason: '3 appointments in Covington next week requested "Clean Aesthetic". Covington has no sample.',
      urgency: 'High',
    },
    {
      id: 2,
      item: 'Martina Liana - 1104',
      type: 'Sample Gown',
      from: 'Covington',
      to: 'Baton Rouge',
      reason: 'Baton Rouge search velocity for "A-Line Lace" is up 40%.',
      urgency: 'Medium',
    },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
       <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-black text-indigo-950 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            AI Inventory Rebalancing Engine
          </h2>
          <p className="text-xs text-indigo-700/80 mt-1 max-w-2xl">
            Proactive transfer recommendations based on upcoming appointment demographics and local market search velocity. Maximizes sample ROI.
          </p>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-indigo-600 border border-indigo-700 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5">
          <ArrowLeftRight className="h-3.5 w-3.5" /> Auto-Generate Transfer Manifest
        </button>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div key={rec.id} className="bg-white border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row items-center gap-6 shadow-sm">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${rec.urgency === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                  {rec.urgency} Priority
                </span>
                <span className="text-sm font-black text-stone-900">{rec.item}</span>
                <span className="text-xs text-stone-500">({rec.type})</span>
              </div>
              <p className="text-xs text-stone-600 mt-2 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <span><strong className="text-indigo-900 font-semibold">AI Insight:</strong> {rec.reason}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-stone-50 px-4 py-2 rounded-lg border border-stone-200">
               <span className="text-sm font-bold text-stone-700">{rec.from}</span>
               <ArrowRight className="h-4 w-4 text-stone-400" />
               <span className="text-sm font-bold text-indigo-700">{rec.to}</span>
            </div>
            
            <button className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors flex-shrink-0">
               <Check className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
