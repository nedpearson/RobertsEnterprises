import { useState } from 'react';
import { AlarmClock, AlertTriangle, CheckCircle2, PhoneCall, MessageSquare, ShieldAlert, ArrowRight } from 'lucide-react';
import { UnifiedLeadRecord, leadService } from '@/lib/services/leadIntelligenceService';
import { btnPrimary } from '../ui';
import { toast } from '@vowos/design-system';

export default function LeadFollowUpView({ onSelectLead }: { onSelectLead: (lead: UnifiedLeadRecord) => void }) {
  const [leads, setLeads] = useState<UnifiedLeadRecord[]>(leadService.getLeads());

  const handleResolveSLA = (leadId: string, leadName: string) => {
    const updated = leadService.advanceStage(leadId, 'Contacted');
    if (updated) {
      setLeads([...leadService.getLeads()]);
      toast({
        title: 'SLA Response Logged',
        description: `Logged first response for ${leadName}. SLA status updated.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* SLA Target Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border-subtle bg-brand-soft/50 p-4">
          <div className="flex items-center gap-2 text-brand-primary-hover font-bold text-sm">
            <AlarmClock className="h-4 w-4" /> Paid Lead SLA Target
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-1">5 Minutes</p>
          <p className="text-xs text-brand-primary mt-1">First contact target for Meta & Google Paid Search inquiries.</p>
        </div>

        <div className="rounded-2xl border border-status-warning/20 bg-status-warning/10/50 p-4">
          <div className="flex items-center gap-2 text-status-warning font-bold text-sm">
            <AlarmClock className="h-4 w-4" /> Organic Inquiry Target
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-1">15 Minutes</p>
          <p className="text-xs text-status-warning mt-1">First contact target for Website & Social organic messages.</p>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
          <div className="flex items-center gap-2 text-violet-700 font-bold text-sm">
            <ShieldAlert className="h-4 w-4" /> Manager Escalation
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-1">30 Minutes</p>
          <p className="text-xs text-violet-600 mt-1">Automatic alert to Owner/Manager if uncontacted past threshold.</p>
        </div>
      </div>

      {/* Leads SLA Queue */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-brand-primary" /> Active SLA Tracking Queue
        </h3>

        <div className="space-y-3">
          {leads.map((l) => (
            <div
              key={l.id}
              onClick={() => onSelectLead(l)}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50/50 p-4 hover:border-stone-300 transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-stone-900 text-sm">{l.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      l.slaStatus === 'Met'
                        ? 'bg-emerald-100 text-emerald-800'
                        : l.slaStatus === 'Warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-brand-soft text-brand-secondary'
                    }`}
                  >
                    SLA: {l.slaStatus}
                  </span>
                  <span className="text-xs text-stone-400">Assigned: {l.assignedEmployeeName || 'Unassigned'}</span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Next Action: <span className="font-semibold text-stone-800">{l.nextAction.reason}</span>
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResolveSLA(l.id, l.name);
                }}
                className={btnPrimary + ' text-xs px-3 py-1.5'}
              >
                Log Contact & Resolve <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
