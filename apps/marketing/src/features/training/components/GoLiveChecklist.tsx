import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, Filter, ArrowRight } from 'lucide-react';
import { getGoLiveReadinessReport } from '@/lib/services/goLiveReadinessService';
import { GoLiveChecklistItem } from '../types/trainingTypes';

export function GoLiveChecklist() {
  const [report, setReport] = useState(getGoLiveReadinessReport());
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const handleRefresh = () => {
    setReport(getGoLiveReadinessReport());
  };

  const categories = ['ALL', 'BUSINESS', 'USERS', 'SHOPIFY', 'CATALOG', 'TAX', 'SHIPPING', 'PAYMENTS', 'WEBSITE', 'MARKETING_CONNECTIONS', 'LEADS', 'BUDGETS', 'AI', 'REPORTS'];

  const filteredItems = filterCategory === 'ALL'
    ? report.items
    : report.items.filter((i) => i.category === filterCategory);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-status-success" />
            <h2 className="text-xl font-black text-stone-900">34-Point Automated Go-Live Readiness Audit</h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Machine-verified evidence for business, Shopify, tax boundaries, shipping tests, payment gateways, and marketing connections.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="rounded-xl bg-stone-900 text-white px-4 py-2 text-xs font-bold hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" /> Run Live Machine Audit
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5 bg-stone-100 p-1.5 rounded-xl border border-stone-200">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterCategory === cat
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Audit Items Grid */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-stone-300 transition-all"
          >
            <div className="flex items-start gap-3.5 flex-1">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                item.status === 'COMPLETED'
                  ? 'bg-status-success/10 text-status-success border border-emerald-200'
                  : item.status === 'ACTION_REQUIRED' || item.status === 'FAILED'
                  ? 'bg-brand-soft text-brand-primary border border-border-subtle'
                  : 'bg-status-warning/10 text-status-warning border border-status-warning/20'
              }`}>
                {item.status === 'COMPLETED' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                    {item.category.replace('_', ' ')}
                  </span>
                  <h4 className="font-bold text-sm text-stone-900">{item.title}</h4>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{item.description}</p>
                {item.evidence && (
                  <p className="text-[11px] font-mono text-emerald-700 bg-status-success/10/80 px-2.5 py-1 rounded-md border border-emerald-100 inline-block">
                    ✓ Verified Evidence: {item.evidence}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
              <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase ${
                item.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : item.status === 'ACTION_REQUIRED'
                  ? 'bg-brand-soft text-brand-secondary'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {item.status.replace('_', ' ')}
              </span>

              <a
                href={`#${item.settingsRoute}`}
                className="rounded-xl border border-stone-200 bg-stone-50 text-stone-700 px-3 py-1.5 text-xs font-bold hover:bg-stone-100 transition-colors flex items-center gap-1"
              >
                Inspect Settings <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
