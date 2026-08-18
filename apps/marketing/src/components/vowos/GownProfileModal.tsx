import React from 'react';
import { Package, TrendingUp, DollarSign, Store, Tag, Hash, FileText } from 'lucide-react';
import { Gown, formatCents, LOCATIONS, marginPct } from '@/data/vowosData';
import { Modal, StatusBadge } from './ui';

interface GownProfileModalProps {
  gown: Gown | null;
  open: boolean;
  onClose: () => void;
}

export default function GownProfileModal({ gown, open, onClose }: GownProfileModalProps) {
  if (!gown) return null;

  const margin = gown.costCents > 0 ? marginPct(gown.costCents, gown.priceCents) : null;
  const isSpecialOrder = gown.stock === 0;

  // Mock cross-location stock
  const crossLocationStock = LOCATIONS.map(loc => ({
    location: loc,
    stock: loc.id === gown.location ? gown.stock : (Math.random() > 0.5 ? Math.floor(Math.random() * 3) : 0)
  }));
  const totalNetworkStock = crossLocationStock.reduce((acc, curr) => acc + curr.stock, 0);

  // Mock recent PO history
  const recentPOs = [
    { id: `PO-8812-${gown.sku.slice(0, 4)}`, date: '2026-05-12', qty: 2, status: 'Delivered' },
    { id: `PO-8944-${gown.sku.slice(0, 4)}`, date: '2026-08-01', qty: 1, status: 'In Transit' }
  ];

  return (
    <Modal open={open} onClose={onClose} title="Item Profile" size="max-w-4xl">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Image & Quick Actions */}
        <div className="w-full md:w-1/3 space-y-4">
          <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-[3/4] relative">
            <img src={gown.image} alt={gown.name} className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3">
              <StatusBadge status={gown.status} />
            </div>
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
              {gown.condition}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Total Stock</p>
              <p className="text-xl font-serif text-stone-900">{totalNetworkStock}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Margin</p>
              <p className={`text-xl font-serif ${margin && margin >= 50 ? 'text-emerald-600' : 'text-stone-900'}`}>
                {margin ? `${margin}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Drilldowns */}
        <div className="w-full md:w-2/3 space-y-6">
          
          {/* Header Info */}
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-3xl font-serif text-stone-900">{gown.name}</h2>
            <p className="text-lg text-stone-500 mb-2">{gown.designer}</p>
            
            <div className="flex flex-wrap gap-2 text-xs font-medium text-stone-600">
              <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md"><Hash className="w-3.5 h-3.5"/> SKU: {gown.sku || gown.id}</span>
              <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md"><Tag className="w-3.5 h-3.5"/> Style: {gown.style}</span>
              <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md">Size {gown.size}</span>
              <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md">{gown.color}</span>
            </div>
          </div>

          {/* Pricing & Value */}
          <div>
            <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-stone-400" /> Financials
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-stone-500 mb-1">Retail Price</p>
                <p className="font-medium text-stone-900">{formatCents(gown.priceCents)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-1">Wholesale Cost</p>
                <p className="font-medium text-stone-900">{gown.costCents > 0 ? formatCents(gown.costCents) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-1">MSRP</p>
                <p className="font-medium text-stone-900">{gown.msrpCents > 0 ? formatCents(gown.msrpCents) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-1">Profit Per Unit</p>
                <p className="font-medium text-emerald-600">{gown.costCents > 0 ? formatCents(gown.priceCents - gown.costCents) : '—'}</p>
              </div>
            </div>
          </div>

          {/* Network Stock Levels */}
          <div>
            <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-stone-400" /> Network Stock Levels
            </h4>
            <div className="rounded-xl border border-stone-200 divide-y divide-stone-100">
              {crossLocationStock.map((loc) => (
                <div key={loc.location.id} className="flex justify-between items-center p-3 text-sm">
                  <div>
                    <p className="font-medium text-stone-800">{loc.location.business}</p>
                    <p className="text-xs text-stone-500">{loc.location.city}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full text-xs font-bold ${
                      loc.stock > 0 ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400'
                    }`}>
                      {loc.stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase History */}
          <div>
            <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-stone-400" /> Vendor Purchase Orders
            </h4>
            {recentPOs.length > 0 ? (
              <div className="rounded-xl border border-stone-200 divide-y divide-stone-100">
                {recentPOs.map(po => (
                  <div key={po.id} className="flex justify-between items-center p-3 text-sm">
                    <div>
                      <p className="font-medium text-blue-600 hover:underline cursor-pointer">{po.id}</p>
                      <p className="text-xs text-stone-500">Ordered {po.date}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-xs text-stone-600">Qty: {po.qty}</span>
                      <StatusBadge status={po.status as any} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-sm text-stone-500">
                No active or recent purchase orders for this item.
              </div>
            )}
          </div>
          
          {/* Internal Notes */}
          {gown.notes && (
            <div>
              <h4 className="text-sm font-semibold text-stone-900 mb-2">Internal Notes</h4>
              <div className="p-3 bg-yellow-50/50 border border-yellow-100 rounded-lg text-sm text-stone-700 italic">
                {gown.notes}
              </div>
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
}
