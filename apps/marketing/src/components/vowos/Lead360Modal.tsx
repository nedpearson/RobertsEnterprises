import { useState } from 'react';
import { Lead, LeadStage, formatCents, formatDate, teamMembers } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { Modal, StatusBadge } from './ui';
import { Sparkles, Calendar, DollarSign, UserCheck, Mail, Phone, MessageSquare, ArrowRight, CheckCircle2, CalendarPlus, UserPlus, Tag, Clock } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface Lead360ModalProps {
  lead: Lead | null;
  onClose: () => void;
  onNavigateToBride?: (brideId: string) => void;
  onBookAppointment?: (leadName: string, leadEmail: string) => void;
}

const STAGES: LeadStage[] = ['New', 'Contacted', 'Appointment Set', 'Won'];

export default function Lead360Modal({
  lead,
  onClose,
  onNavigateToBride,
  onBookAppointment,
}: Lead360ModalProps) {
  const { advanceLead, updateLeadStage, addBride } = useVowosData();
  const [notes, setNotes] = useState(`Interested in bridal gowns & veil styling. Preferred budget: ${formatCents(lead?.budgetCents || 0)}.`);
  const [assignedStylist, setAssignedStylist] = useState(teamMembers[0]);
  const [phoneInput, setPhoneInput] = useState('(225) 555-0199');
  const [converting, setConverting] = useState(false);

  if (!lead) return null;

  const handleStageChange = async (newStage: LeadStage) => {
    await updateLeadStage(lead.id, newStage);
    toast({ title: 'Pipeline Stage Updated', description: `${lead.name} moved to ${newStage}` });
  };

  const handleConvertLeadToBride = async () => {
    setConverting(true);
    try {
      const newBride = await addBride({
        name: lead.name,
        email: lead.email,
        phone: phoneInput,
        weddingDate: lead.weddingDate,
        stylist: assignedStylist,
        status: 'Active',
      });
      await updateLeadStage(lead.id, 'Won');
      toast({ title: 'Lead Converted to Bride!', description: `${lead.name} enrolled in Bride 360 pipeline.` });
      onClose();
      if (onNavigateToBride && newBride) {
        onNavigateToBride(newBride.id);
      }
    } catch (e: any) {
      toast({ title: 'Conversion failed', description: e.message || 'Could not convert lead.', variant: 'destructive' });
    } finally {
      setConverting(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Lead 360 Source Drilldown — ${lead.name}`}>
      <div className="space-y-6 select-none max-w-2xl">
        {/* Header Hero Card */}
        <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-stone-800 to-rose-950 p-5 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/20 text-rose-300 font-bold text-lg ring-1 ring-focus-ring/40 flex-shrink-0">
                {lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  {lead.name} <Sparkles className="h-4 w-4 text-brand-primary" />
                </h3>
                <p className="text-xs text-stone-300">{lead.email} · {phoneInput}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="rounded-full bg-stone-800 border border-stone-700 px-2.5 py-0.5 text-[11px] font-semibold text-stone-300">
                    Source: {lead.source}
                  </span>
                  <span className="rounded-full bg-status-success/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    Budget: {formatCents(lead.budgetCents)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Stepper */}
        <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
          <p className="text-xs font-bold text-stone-700">Lead Pipeline Progress Stepper</p>
          <div className="grid grid-cols-4 gap-2">
            {STAGES.map((s, idx) => {
              const isCurrent = lead.stage === s;
              const isPast = STAGES.indexOf(lead.stage) >= idx;
              return (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'border-brand-primary bg-brand-primary text-white shadow-xs'
                      : isPast
                      ? 'border-border-subtle bg-brand-soft text-brand-secondary hover:bg-brand-soft'
                      : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-[10px] opacity-75 uppercase">Stage {idx + 1}</div>
                  <div>{s}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lead Details & Notes */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-stone-200 p-3.5 space-y-1">
            <span className="text-stone-400 font-semibold uppercase text-[10px]">Target Wedding Date</span>
            <p className="font-bold text-stone-900 text-sm">{formatDate(lead.weddingDate)}</p>
            <p className="text-[11px] text-stone-500">Event location: Baton Rouge / Covington</p>
          </div>

          <div className="rounded-xl border border-stone-200 p-3.5 space-y-1">
            <span className="text-stone-400 font-semibold uppercase text-[10px]">Assigned Bridal Stylist</span>
            <select
              value={assignedStylist}
              onChange={(e) => setAssignedStylist(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white p-1.5 font-bold text-stone-900 focus:outline-none"
            >
              {teamMembers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 10-Tier Source Chain & Cost Attribution Panel */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-brand-primary" /> Complete 10-Tier Source Chain &amp; Cost Allocation
            </span>
            <span className="text-[10px] font-bold text-brand-primary-hover bg-brand-soft px-2 py-0.5 rounded-full">
              Direct Provider Cost: $24.50
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-lg bg-white p-2 border border-stone-200">
              <span className="text-[9px] text-stone-400 uppercase font-bold block">1. Provider</span>
              <span className="font-bold text-stone-900">Meta Ads (Instagram)</span>
            </div>
            <div className="rounded-lg bg-white p-2 border border-stone-200">
              <span className="text-[9px] text-stone-400 uppercase font-bold block">2. Ad Account</span>
              <span className="font-bold text-stone-900">act-9921 (BR Luxury)</span>
            </div>
            <div className="rounded-lg bg-white p-2 border border-stone-200">
              <span className="text-[9px] text-stone-400 uppercase font-bold block">3. Campaign</span>
              <span className="font-bold text-stone-900">BR Fall 2026 Lookbook</span>
            </div>
            <div className="rounded-lg bg-white p-2 border border-stone-200">
              <span className="text-[9px] text-stone-400 uppercase font-bold block">4. Ad Set</span>
              <span className="font-bold text-stone-900">BR 25-40 High Income</span>
            </div>
            <div className="rounded-lg bg-white p-2 border border-stone-200">
              <span className="text-[9px] text-stone-400 uppercase font-bold block">5. Ad &amp; Creative</span>
              <span className="font-bold text-stone-900">Fleur Gown 15s Reel</span>
            </div>
            <div className="rounded-lg bg-white p-2 border border-stone-200">
              <span className="text-[9px] text-stone-400 uppercase font-bold block">6. Cost Allocation</span>
              <span className="font-bold text-status-success">Direct Provider API</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5 text-xs">
          <label className="block font-bold text-stone-800">Lead Interaction Notes &amp; Preferences</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-900 placeholder-stone-400 focus:border-brand-primary focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-stone-100 pt-4">
          <button
            onClick={() => {
              onClose();
              if (onBookAppointment) onBookAppointment(lead.name, lead.email);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-bold text-stone-800 shadow-2xs hover:bg-stone-50 transition-colors"
          >
            <CalendarPlus className="h-4 w-4 text-brand-primary" /> Book Consultation Appointment
          </button>

          <button
            onClick={handleConvertLeadToBride}
            disabled={converting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" /> Convert to Bride 360 Profile
          </button>
        </div>
      </div>
    </Modal>
  );
}
