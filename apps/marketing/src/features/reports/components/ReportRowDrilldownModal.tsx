import React from 'react';
import { ShieldCheck, FileText, Calendar, DollarSign, User, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/vowos/ui';

interface ReportRowDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    title: string;
    subtitle: string;
    fields: { label: string; value: string; bold?: boolean }[];
    status?: string;
  } | null;
}

export default function ReportRowDrilldownModal({ isOpen, onClose, data }: ReportRowDrilldownModalProps) {
  if (!data || !isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={`Record Detail — ${data.title}`}>
      <div className="space-y-6 select-none">
        
        {/* Header Badge */}
        <div className="rounded-2xl bg-stone-900 text-white p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary bg-rose-950 px-2.5 py-0.5 rounded border border-rose-800">
              Record
            </span>
            <h3 className="font-serif text-xl font-bold mt-1.5 text-white">{data.title}</h3>
            <p className="text-xs text-stone-300 mt-0.5">{data.subtitle}</p>
          </div>
          {data.status && (
            <span className="bg-status-success/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-full">
              {data.status}
            </span>
          )}
        </div>

        {/* Detailed Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.fields.map((f) => (
            <div key={f.label} className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{f.label}</span>
              <p className={`text-xs text-stone-900 ${f.bold ? 'font-serif text-lg font-bold text-brand-primary' : 'font-semibold'}`}>
                {f.value}
              </p>
            </div>
          ))}
        </div>

        {/* Provenance */}
        <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-xs text-stone-600 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-stone-800">
            <ShieldCheck className="h-4 w-4 text-stone-400" /> Shown as stored
          </p>
          <p>Values above are read directly from this organization's records. Fields that are not on record are omitted rather than estimated.</p>
        </div>

      </div>
    </Modal>
  );
}
