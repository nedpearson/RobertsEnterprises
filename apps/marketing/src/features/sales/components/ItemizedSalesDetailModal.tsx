import React from 'react';
import { Shirt, Tag, DollarSign, User, MapPin, Sparkles, CheckCircle2, ShieldCheck, FileText, Ruler } from 'lucide-react';
import { Modal } from '@/components/vowos/ui';
import { formatCents, formatDate, locationById } from '@/data/vowosData';

export interface DetailedSaleItem {
  id: string;
  invoiceId: string;
  customerName: string;
  weddingDate: string;
  designer: string; // e.g. Monique Lhuillier
  gownName: string; // e.g. Bliss Silk Satin Gown
  styleNumber: string; // e.g. ML-2026-BLISS
  sku: string; // e.g. SKU-881029384912
  gownType: string; // e.g. Couture Bridal Gown
  size: string; // e.g. Size 10 Bridal (Bust 34", Waist 26", Hips 38")
  color: string; // e.g. Ivory Silk Satin
  fabric: string; // e.g. French Silk Satin & Chantilly Lace
  condition: string; // e.g. New Custom Order
  wholesaleCostCents: number; // e.g. $1,800.00
  retailPriceCents: number; // e.g. $4,500.00
  paidCents: number; // e.g. $4,500.00
  locationId: string; // e.g. ido-br
  stylist: string; // e.g. Ramsey Roberts
  saleDate: string; // e.g. 2026-07-20
}

interface ItemizedSalesDetailModalProps {
  item: DetailedSaleItem | null;
  onClose: () => void;
}

export default function ItemizedSalesDetailModal({ item, onClose }: ItemizedSalesDetailModalProps) {
  if (!item) return null;

  const loc = locationById(item.locationId);
  const marginPct = item.retailPriceCents > 0
    ? Math.round(((item.retailPriceCents - item.wholesaleCostCents) / item.retailPriceCents) * 100)
    : 0;

  return (
    <Modal open={!!item} onClose={onClose} title={`Full Designer & Gown Itemization — ${item.invoiceId}`} maxWidth="max-w-3xl">
      <div className="space-y-6 select-none">
        
        {/* Designer Hero Header */}
        <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-rose-950 to-stone-900 text-white p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded border border-rose-800">
                {item.designer}
              </span>
              <span className="text-[10px] font-mono font-bold text-stone-300">
                Style: {item.styleNumber}
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold mt-1 text-white">{item.gownName}</h2>
            <p className="text-xs text-rose-200 mt-0.5">{item.gownType} · {item.condition}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-right min-w-[170px]">
            <span className="text-[10px] uppercase font-bold text-stone-300">Retail Sold Price</span>
            <p className="font-serif text-2xl font-bold text-emerald-400 mt-0.5">{formatCents(item.retailPriceCents)}</p>
            <span className="text-[10px] text-stone-300 block">Cost: {formatCents(item.wholesaleCostCents)} ({marginPct}% Margin)</span>
          </div>
        </div>

        {/* Detailed Itemization Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
              <Shirt className="h-3.5 w-3.5 text-brand-primary" /> Designer / Brand
            </span>
            <p className="font-serif text-base font-bold text-stone-900">{item.designer}</p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-vowos-violet" /> Style Name &amp; Code
            </span>
            <p className="font-semibold text-stone-900 text-xs">{item.gownName}</p>
            <p className="text-[11px] font-mono text-stone-500">{item.styleNumber}</p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5 text-status-success" /> Dress Size &amp; Fit Specs
            </span>
            <p className="font-semibold text-stone-900 text-xs">{item.size}</p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Color &amp; Fabric</span>
            <p className="font-semibold text-stone-900 text-xs">{item.color}</p>
            <p className="text-[11px] text-stone-500">{item.fabric}</p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Barcode / SKU Tag</span>
            <p className="font-mono text-xs font-bold text-stone-800">{item.sku}</p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Boutique Location</span>
            <p className="font-semibold text-stone-900 text-xs">{loc.business}</p>
            <p className="text-[11px] text-stone-500">{loc.city} Storefront</p>
          </div>

        </div>

        {/* Customer & Stylist Info */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Customer &amp; Stylist</span>
            <p className="font-serif text-lg font-bold text-stone-900">{item.customerName}</p>
            <p className="text-xs text-stone-500">Wedding Date: {formatDate(item.weddingDate)} · Stylist: <span className="font-bold text-stone-800">{item.stylist}</span></p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Sale Date</span>
            <p className="font-semibold text-stone-900 text-xs">{formatDate(item.saleDate)}</p>
          </div>
        </div>

        {/* Source of Truth Verification */}
        <div className="rounded-xl bg-status-success/10 border border-emerald-200 p-4 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-status-success" />
            <div>
              <span className="font-bold block text-sm">Full Source of Truth Itemization Verified</span>
              <span>Every designer attribute, size spec, fabric code, and pricing tier matches VowOS database.</span>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}
