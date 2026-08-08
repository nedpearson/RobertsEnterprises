import { useState } from 'react';
import { getMarketingMetricsSummary, getMarketingCampaigns } from '../api/marketingApi';
import { formatCents } from '@/data/vowosData';
import { Download, FileText, BarChart3, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function MarketingReportsView() {
  const metrics = getMarketingMetricsSummary();
  const campaigns = getMarketingCampaigns();

  const handleExportCSV = () => {
    const headers = ['Campaign ID', 'Name', 'Brand', 'Status', 'Approved Budget ($)', 'Actual Spend ($)'];
    const rows = campaigns.map((c) => [
      c.id,
      `"${c.name}"`,
      c.brand,
      c.status,
      (c.approvedBudgetCents / 100).toFixed(2),
      (c.actualSpendCents / 100).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VowOS_Marketing_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast({ title: 'Report Exported!', description: 'Marketing CSV performance report downloaded.' });
  };

  return (
    <div className="space-y-6 select-none max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Executive Performance &amp; Marketing Audit Reports</h2>
          <p className="text-xs text-stone-500">Comprehensive cross-channel growth analytics, ROAS, MER, and spend reports.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-xs"
        >
          <Download className="h-4 w-4" /> Export CSV Report
        </button>
      </div>

      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs space-y-4">
        <h3 className="font-bold text-stone-900 text-sm">Executive Key Performance Indicators</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-stone-400 font-semibold uppercase text-[10px]">Return on Ad Spend (ROAS)</span>
            <p className="text-xl font-black text-emerald-600 mt-1">{metrics.roasMultiplier}x</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-stone-400 font-semibold uppercase text-[10px]">Marketing Efficiency Ratio</span>
            <p className="text-xl font-black text-stone-900 mt-1">{metrics.marketingEfficiencyRatioPct}%</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-stone-400 font-semibold uppercase text-[10px]">Cost Per Lead (CPL)</span>
            <p className="text-xl font-black text-stone-900 mt-1">{formatCents(metrics.costPerLeadCents)}</p>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-stone-400 font-semibold uppercase text-[10px]">Cost Per Appointment (CPA)</span>
            <p className="text-xl font-black text-stone-900 mt-1">{formatCents(metrics.costPerAppointmentCents)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
