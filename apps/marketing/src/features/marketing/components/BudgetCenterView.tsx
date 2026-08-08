import { useState } from 'react';
import { VendorCoopClaim } from '../types/marketingTypes';
import { getVendorCoopClaims, getMarketingMetricsSummary } from '../api/marketingApi';
import { formatCents } from '@/data/vowosData';
import { DollarSign, ShieldAlert, FileText, CheckCircle2, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { btnPrimary } from '@/components/vowos/ui';
import VendorCoopClaimModal from './VendorCoopClaimModal';

interface BudgetCenterViewProps {
  brandFilter: string;
  locationFilter: string;
}

export default function BudgetCenterView({ brandFilter, locationFilter }: BudgetCenterViewProps) {
  const metrics = getMarketingMetricsSummary(brandFilter, locationFilter);
  const vendorClaims = getVendorCoopClaims();
  const [selectedClaim, setSelectedClaim] = useState<VendorCoopClaim | null>(null);

  return (
    <div className="space-y-6 select-none max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Budget Center &amp; Vendor Co-Op Advertising</h2>
        <p className="text-xs text-stone-500">Planned vs approved budget pacing, hard spend caps, and vendor matching fund claims.</p>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase">Total Approved Budget</span>
          <p className="mt-1 text-2xl font-black text-stone-900">{formatCents(metrics.totalApprovedBudgetCents)}</p>
          <p className="mt-1 text-xs text-stone-500">Across active brand campaigns</p>
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase">Actual Ad Spend</span>
          <p className="mt-1 text-2xl font-black text-rose-600">{formatCents(metrics.actualSpendCents)}</p>
          <p className="mt-1 text-xs text-stone-500">Synchronized from platform APIs</p>
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase">Remaining Budget</span>
          <p className="mt-1 text-2xl font-black text-emerald-600">{formatCents(metrics.remainingBudgetCents)}</p>
          <p className="mt-1 text-xs text-stone-500">{metrics.spendPacingPct}% Pacing</p>
        </div>
      </div>

      {/* Vendor Co-Op Claims Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm">Vendor Cooperative Advertising Funds</h3>
          <button className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> Submit Co-Op Claim Package
          </button>
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 font-bold text-stone-500 uppercase">
                <th className="py-3 px-4">Vendor &amp; Program</th>
                <th className="py-3 px-4">Approved Fund</th>
                <th className="py-3 px-4">Actual Spend</th>
                <th className="py-3 px-4">Claim Status</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {vendorClaims.map((v) => (
                <tr key={v.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-stone-900">{v.vendorName} — {v.programName}</td>
                  <td className="py-3.5 px-4 font-bold">{formatCents(v.approvedAmountCents)}</td>
                  <td className="py-3.5 px-4 text-stone-600">{formatCents(v.actualSpendCents)}</td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                      {v.claimStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-stone-500">{v.deadlineDate}</td>
                  <td className="py-3.5 px-4 text-right">
                     <button
                       onClick={() => setSelectedClaim(v)}
                       className="rounded-lg bg-white border border-stone-200 px-2.5 py-1.5 text-[11px] font-bold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-1.5 ml-auto"
                     >
                       <FileText className="h-3.5 w-3.5" /> View Claim PDF
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedClaim && (
         <VendorCoopClaimModal
            claimId={selectedClaim.id}
            vendor={selectedClaim.vendorName}
            amountCents={selectedClaim.actualSpendCents}
            onClose={() => setSelectedClaim(null)}
         />
      )}
    </div>
  );
}
