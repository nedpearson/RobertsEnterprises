import React, { useState } from 'react';
import { ArrowLeftRight, Sparkles, AlertTriangle, CheckCircle2, Calendar, MapPin, RefreshCw } from 'lucide-react';

export default function InventoryBalancerWidget() {
  const [transfers, setTransfers] = useState([
    {
      id: 'bal-1',
      gownName: 'Ines Di Santo Atelier Silk Gown (Sample Size 10)',
      fromStore: 'Covington Boutique',
      toStore: 'Baton Rouge Boutique',
      reason: 'Requested by Camille Fontenot for 1-on-1 Consultation on Friday, July 31',
      urgency: 'high',
      initiated: false,
    },
    {
      id: 'bal-2',
      gownName: 'Monique Lhuillier Cathedral Lace Veil Sample',
      fromStore: 'Baton Rouge Boutique',
      toStore: 'Covington Boutique',
      reason: '2 Upcoming Fittings in Covington with Veil Styling Requests',
      urgency: 'medium',
      initiated: false,
    },
  ]);

  const handleInitiate = (id: string) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, initiated: true } : t)));
  };

  return (
    <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/70 via-white to-purple-50/70 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-purple-600 p-2 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900">AI Multi-Location Sample Balancer</h3>
            <p className="text-xs text-stone-500">
              Cross-references 14-day appointment preferences with physical boutique inventory locations
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
          Automated Sample Dispatch
        </span>
      </div>

      <div className="space-y-3">
        {transfers.map((t) => (
          <div key={t.id} className="rounded-xl bg-white p-4 border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-stone-900">{t.gownName}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  t.urgency === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {t.urgency.toUpperCase()} PRIORITY
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                <span className="text-rose-600">{t.fromStore}</span>
                <ArrowLeftRight className="h-3.5 w-3.5 text-stone-400" />
                <span className="text-emerald-700">{t.toStore}</span>
              </div>

              <p className="text-xs text-stone-500">{t.reason}</p>
            </div>

            {t.initiated ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Transfer Created
              </span>
            ) : (
              <button
                onClick={() => handleInitiate(t.id)}
                className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" /> Initiate Store Transfer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
