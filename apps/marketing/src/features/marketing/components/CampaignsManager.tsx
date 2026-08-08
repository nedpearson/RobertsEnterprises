import { useState } from 'react';
import { MarketingCampaign } from '../types/marketingTypes';
import { getMarketingCampaigns, updateCampaignStatus } from '../api/marketingApi';
import CampaignWizardModal from './CampaignWizardModal';
import Campaign360Modal from './Campaign360Modal';
import { formatCents } from '@/data/vowosData';
import { Search, PlusCircle, PlayCircle, PauseCircle, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface CampaignsManagerProps {
  brandFilter: string;
  onOpenWizard: () => void;
}

export default function CampaignsManager({ brandFilter, onOpenWizard }: CampaignsManagerProps) {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(getMarketingCampaigns());
  const [searchQuery, setSearchQuery] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);

  const filtered = campaigns.filter((c) => {
    if (brandFilter !== 'all' && c.brand !== brandFilter) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleUpdateStatus = (id: string, status: MarketingCampaign['status']) => {
    updateCampaignStatus(id, status);
    setCampaigns(getMarketingCampaigns());
    toast({ title: 'Campaign Status Updated', description: `Campaign is now ${status.toUpperCase()}.` });
  };

  return (
    <div className="space-y-5 select-none">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 py-2 text-xs font-medium text-stone-900 focus:border-rose-500 focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-600 transition-colors flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" /> Build New Campaign
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 font-bold text-stone-500 uppercase tracking-wider">
                <th className="py-3 px-4">Campaign Name &amp; Objective</th>
                <th className="py-3 px-4">Brand &amp; Locations</th>
                <th className="py-3 px-4">Platforms</th>
                <th className="py-3 px-4">Status &amp; Approval</th>
                <th className="py-3 px-4">Budget / Spend</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {filtered.map((c) => (
                <tr 
                  key={c.id} 
                  className="hover:bg-stone-50/70 transition-colors cursor-pointer group"
                  onClick={() => setSelectedCampaign(c)}
                >
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="font-bold text-stone-900 truncate group-hover:text-rose-600 transition-colors">{c.name}</p>
                    <p className="text-[11px] text-stone-500 truncate">{c.description}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 font-bold uppercase text-[10px] text-stone-700">
                      {c.brand}
                    </span>
                    <p className="text-[11px] text-stone-400 mt-0.5">{c.locations.join(', ')}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {c.providers.map((p) => (
                        <span key={p} className="rounded-md bg-stone-200/70 px-1.5 py-0.5 text-[10px] font-bold capitalize text-stone-800">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                        c.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'paused'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-stone-900">{formatCents(c.actualSpendCents)}</p>
                    <p className="text-[11px] text-stone-400">Budget: {formatCents(c.approvedBudgetCents)}</p>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {c.status === 'active' ? (
                      <button
                        onClick={() => handleUpdateStatus(c.id, 'paused')}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                      >
                        Pause Campaign
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(c.id, 'active')}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-2xs"
                      >
                        Approve &amp; Publish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showWizard && (
        <CampaignWizardModal
          onClose={() => setShowWizard(false)}
          onCampaignCreated={() => setCampaigns(getMarketingCampaigns())}
        />
      )}

      {selectedCampaign && (
        <Campaign360Modal 
          campaign={selectedCampaign} 
          onClose={() => setSelectedCampaign(null)} 
        />
      )}
    </div>
  );
}
