import { useState } from 'react';
import { Inbox, Sparkles, UserPlus, Calendar, AlertTriangle, ArrowRight, CheckCircle2, Search, Filter } from 'lucide-react';
import { UnifiedLeadRecord, leadService } from '@/lib/services/leadIntelligenceService';
import { formatCents, formatDate } from '@/data/vowosData';
import { btnPrimary, btnSecondary, inputCls } from '../ui';
import { toast } from '@/components/ui/use-toast';

export default function LeadInboxView({ onSelectLead }: { onSelectLead: (lead: UnifiedLeadRecord) => void }) {
  const [leads, setLeads] = useState<UnifiedLeadRecord[]>(leadService.getLeads());
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'duplicates' | 'appointments'>('all');
  const [search, setSearch] = useState('');

  const filtered = leads.filter((l) => {
    const matchesSearch =
      (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase());
    if (filter === 'unassigned') return matchesSearch && !l.assignedEmployeeId;
    if (filter === 'appointments') return matchesSearch && l.stage === 'Appointment Requested';
    return matchesSearch;
  });

  const handleClaimLead = (leadId: string, leadName: string) => {
    const updated = leadService.advanceStage(leadId, 'Contacted');
    if (updated) {
      setLeads([...leadService.getLeads()]);
      toast({
        title: 'Lead Claimed',
        description: `You have claimed ${leadName} and updated SLA status to Contacted.`,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inbox by lead name, email, or campaign..."
            className={inputCls + ' pl-9'}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Ingestion' },
            { id: 'unassigned', label: 'Unassigned' },
            { id: 'appointments', label: 'Appointment Requests' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === f.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inbox List */}
      <div className="space-y-3">
        {filtered.map((l) => (
          <div
            key={l.id}
            onClick={() => onSelectLead(l)}
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 font-bold text-white shadow-xs text-sm">
                {l.name.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-stone-900 text-sm">{l.name}</p>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                    AI {l.aiScore.bookingProbability * 100}% Fit
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                    {l.sourcePlatform}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {l.email} · {l.phone} · <span className="font-semibold text-stone-700">{l.occasion}</span>
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Campaign: <span className="text-stone-600 font-medium">{l.campaignName}</span> · CPL: ${ (l.costCents / 100).toFixed(2) } ({l.costAllocationMethod})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
              <div className="text-left md:text-right">
                <p className="text-xs font-bold text-stone-900">{formatCents(l.budgetCents)} Budget</p>
                <p className="text-[11px] text-stone-400">Wedding: {l.weddingDate ? formatDate(l.weddingDate) : 'N/A'}</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClaimLead(l.id, l.name);
                }}
                className={btnPrimary + ' text-xs px-3 py-1.5'}
              >
                Claim & Contact <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center bg-stone-50">
            <Inbox className="h-8 w-8 text-stone-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-700">No leads in this inbox filter</p>
            <p className="text-xs text-stone-400 mt-1">All incoming inquiries have been assigned and processed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
