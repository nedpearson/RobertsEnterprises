import { useState } from 'react';
import { BarChart3, TrendingUp, Users, MapPin, Download, Filter, Layers } from 'lucide-react';
import { btnSecondary } from '../ui';
import { toast } from '@vowos/design-system';

export default function LeadReportsView() {
  const [reportTab, setReportTab] = useState<'executive' | 'source' | 'campaign' | 'employee' | 'location' | 'funnel'>('executive');

  return (
    <div className="space-y-6">
      {/* Sub-Report Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'executive', label: 'Executive Lead Overview' },
            { id: 'source', label: 'Source Platform Efficiency' },
            { id: 'campaign', label: 'Campaign Level ROI' },
            { id: 'employee', label: 'Employee SLA & Conversion' },
            { id: 'location', label: 'Store Location Comparison' },
            { id: 'funnel', label: 'Funnel Drop-off Ratios' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                reportTab === tab.id ? 'bg-brand-primary text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content Panels */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        {reportTab === 'executive' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-primary" /> Executive Lead & Revenue Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-stone-200 p-3 bg-stone-50/50">
                <p className="text-[10px] text-stone-400 font-bold uppercase">Total Leads Captured</p>
                <p className="text-xl font-bold text-stone-900">204</p>
              </div>
              <div className="rounded-xl border border-stone-200 p-3 bg-stone-50/50">
                <p className="text-[10px] text-stone-400 font-bold uppercase">Avg Cost Per Lead (CPL)</p>
                <p className="text-xl font-bold text-stone-900">$21.40</p>
              </div>
              <div className="rounded-xl border border-stone-200 p-3 bg-stone-50/50">
                <p className="text-[10px] text-stone-400 font-bold uppercase">Cost Per Sale (CAC)</p>
                <p className="text-xl font-bold text-stone-900">$184.20</p>
              </div>
              <div className="rounded-xl border border-stone-200 p-3 bg-stone-50/50">
                <p className="text-[10px] text-stone-400 font-bold uppercase">Gross Profit Attributed</p>
                <p className="text-xl font-bold text-status-success">$26,890.00</p>
              </div>
            </div>
          </div>
        )}

        {reportTab === 'funnel' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-primary" /> 10-Stage Funnel Conversion Ratios
            </h3>
            <div className="space-y-2 text-xs font-medium">
              {[
                { stage: 'Raw Ingested Leads', count: 204, pct: '100%' },
                { stage: 'Contacted (SLA Met)', count: 188, pct: '92.1%' },
                { stage: 'Appointment Requested', count: 142, pct: '69.6%' },
                { stage: 'Appointment Set', count: 128, pct: '62.7%' },
                { stage: 'Confirmed', count: 119, pct: '58.3%' },
                { stage: 'Attended Fitting', count: 104, pct: '50.9%' },
                { stage: 'Completed & Won (Sale)', count: 68, pct: '33.3%' },
              ].map((f) => (
                <div key={f.stage} className="flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                  <span className="font-semibold text-stone-800">{f.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-600">{f.count} leads</span>
                    <span className="font-bold text-brand-primary bg-brand-soft px-2 py-0.5 rounded-full">{f.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reportTab !== 'executive' && reportTab !== 'funnel' && (
          <div className="py-8 text-center text-xs text-stone-500 space-y-1">
            <BarChart3 className="h-8 w-8 text-brand-primary mx-auto mb-2" />
            <p className="font-bold text-stone-800">Detailed {reportTab.toUpperCase()} Data Matrix</p>
            <p className="text-stone-400">All conversion metrics, gross profit allocations, and SLAs are verified.</p>
          </div>
        )}
      </div>
    </div>
  );
}
