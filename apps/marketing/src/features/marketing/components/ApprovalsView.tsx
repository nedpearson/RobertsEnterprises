import { useState } from 'react';
import { getMarketingCampaigns, updateCampaignStatus } from '../api/marketingApi';
import { CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { formatCents } from '@/data/vowosData';
import { toast } from '@vowos/design-system';

export default function ApprovalsView() {
  const [campaigns, setCampaigns] = useState(getMarketingCampaigns());

  const pending = campaigns.filter((c) => c.approvalStatus === 'pending');

  const handleApprove = (id: string) => {
    updateCampaignStatus(id, 'active');
    setCampaigns(getMarketingCampaigns());
    toast({ title: 'Campaign Approved & Published!', description: 'Ad delivery initiated.' });
  };

  return (
    <div className="space-y-6 select-none max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Campaign &amp; Budget Approvals Queue</h2>
        <p className="text-xs text-stone-500">Review and authorize pending marketing campaigns and budget change requests.</p>
      </div>

      <div className="space-y-3">
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center text-xs text-stone-400">
            No pending campaign approvals at this time.
          </div>
        ) : (
          pending.map((c) => (
            <div key={c.id} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-status-warning" />
                  <h3 className="font-bold text-stone-900 text-sm">{c.name}</h3>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-bold uppercase text-[10px] text-stone-700">
                    {c.brand}
                  </span>
                </div>
                <span className="font-bold text-stone-900 text-xs">Requested Budget: {formatCents(c.approvedBudgetCents)}</span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">{c.description}</p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => handleApprove(c.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve &amp; Publish Campaign
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
