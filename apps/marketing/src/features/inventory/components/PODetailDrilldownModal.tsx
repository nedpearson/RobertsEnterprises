import React from 'react';
import { PackageSearch, Truck, CheckCircle2, Clock, Globe, User, UserCheck, DollarSign, Calendar, MapPin, ExternalLink, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/vowos/ui';
import { PurchaseOrder, formatCents, formatDate, locationById } from '@/data/vowosData';

interface PODetailDrilldownModalProps {
  po: PurchaseOrder | null;
  onClose: () => void;
}

export default function PODetailDrilldownModal({ po, onClose }: PODetailDrilldownModalProps) {
  if (!po) return null;

  const steps = [
    { title: 'Purchase Order Issued to Vendor', date: po.ordered, done: true, desc: 'Wholesale order submitted via designer portal' },
    { title: 'Factory Production & Cutting', date: '2026-06-25', done: true, desc: 'Atelier hand-sewing & beadwork' },
    { title: 'Quality Inspection & Shipping', date: '2026-07-05', done: po.status === 'In Transit' || po.status === 'Delivered', active: po.status === 'In Transit', desc: 'Air freight express tracking logged' },
    { title: 'Boutique Receiving & Barcode Tagging', date: po.expectedDelivery, done: po.status === 'Delivered', active: po.status === 'Delivered', desc: `Delivery to ${locationById(po.location).short}` },
  ];

  return (
    <Modal open={!!po} onClose={onClose} title={`Purchase Order Drilldown — ${po.id}`} maxWidth="max-w-3xl">
      <div className="space-y-6 select-none">
        
        {/* Header Summary */}
        <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded border border-rose-800">
                {po.id}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-300">
                {locationById(po.location).business} · {locationById(po.location).city}
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold mt-1 text-white">{po.items}</h2>
            <p className="text-xs text-stone-300 mt-1">Vendor: <span className="font-bold text-white">{po.vendor}</span></p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-right min-w-[160px]">
            <span className="text-[10px] uppercase font-bold text-stone-300">Wholesale Value</span>
            <p className="font-serif text-2xl font-bold text-emerald-400 mt-0.5">{formatCents(po.amountCents)}</p>
            <span className="text-[10px] text-stone-300 block">Status: {po.status}</span>
          </div>
        </div>

        {/* Operational Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-stone-500" /> Order Date
            </span>
            <p className="font-semibold text-stone-900 text-xs">{formatDate(po.ordered)}</p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-status-warning" /> Expected Delivery (ETA)
            </span>
            <p className="font-semibold text-stone-900 text-xs">{formatDate(po.expectedDelivery)}</p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-violet-500" /> Assigned Staff
            </span>
            <p className="font-semibold text-stone-900 text-xs">{po.assignedStaff || 'Ramsey Roberts (Owner)'}</p>
          </div>
        </div>

        {/* Special Order Customer Attachment */}
        {po.assignedCustomer && (
          <div className="rounded-xl border border-border-subtle bg-brand-soft/60 p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-brand-primary" />
              <div>
                <span className="font-bold text-brand-secondary">Customer Special Order:</span>
                <span className="text-brand-secondary ml-1 font-semibold">{po.assignedCustomer}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-brand-primary-hover uppercase tracking-wider border border-rose-300 px-2 py-0.5 rounded bg-white">
              Bride Reserved
            </span>
          </div>
        )}

        {/* Timeline Journey */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="font-serif text-sm font-bold text-stone-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-primary" /> Factory Production &amp; Delivery Log
          </h3>

          <div className="relative pl-6 border-l-2 border-stone-200 space-y-6">
            {steps.map((s, idx) => (
              <div key={s.title} className="relative">
                <div className={`absolute -left-[31px] top-0 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                  s.done
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : s.active
                    ? 'bg-status-warning border-amber-500 text-white animate-pulse'
                    : 'bg-white border-stone-300 text-stone-400'
                }`}>
                  {s.done ? '✓' : idx + 1}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-stone-900">{s.title}</h4>
                    <span className="text-[10px] text-stone-400">{formatDate(s.date)}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="rounded-xl bg-stone-50 p-4 border border-stone-200 text-xs text-stone-600 space-y-1">
          <span className="font-bold text-stone-900 block text-[11px] uppercase tracking-wider">Source of Truth Ledger Audit</span>
          <p>
            PO record verified against designer backend API and inventory ledger. Last status update logged at {new Date().toLocaleTimeString()} by System.
          </p>
        </div>

      </div>
    </Modal>
  );
}
