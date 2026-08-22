import React, { useMemo, useState } from 'react';
import { Package, TrendingUp, DollarSign, Store, Tag, Hash, FileText, Calendar, Truck, ExternalLink, X, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Gown, formatCents, LOCATIONS, marginPct, locationById, formatDate } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { Modal, StatusBadge } from './ui';

interface GownProfileModalProps {
  gown: Gown | null;
  open: boolean;
  onClose: () => void;
}

export default function GownProfileModal({ gown, open, onClose }: GownProfileModalProps) {
  const { allGowns, allPurchaseOrders } = useVowosData();
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);

  const margin = gown && gown.costCents > 0 ? marginPct(gown.costCents, gown.priceCents) : null;

  // Genuine cross-location stock derived from allGowns
  const crossLocationStock = useMemo(() => {
    if (!gown) return [];
    return LOCATIONS.map((loc) => {
      const matchingGowns = allGowns.filter((g) => {
        if (g.location !== loc.id) return false;
        if (gown.sku && g.sku && g.sku.toLowerCase() === gown.sku.toLowerCase()) return true;
        return (
          g.name.toLowerCase() === gown.name.toLowerCase() &&
          g.designer.toLowerCase() === gown.designer.toLowerCase()
        );
      });
      const stockCount = matchingGowns.reduce((sum, g) => sum + g.stock, 0);
      return {
        location: loc,
        stock: loc.id === gown.location ? Math.max(gown.stock, stockCount) : stockCount,
      };
    });
  }, [gown, allGowns]);

  const recentPOs = useMemo(() => {
    if (!gown) return [];
    const gownName = gown.name.toLowerCase();
    const sku = gown.sku ? gown.sku.toLowerCase() : '';
    const designer = gown.designer.toLowerCase();

    return allPurchaseOrders.filter((po) => {
      const items = (po.items || '').toLowerCase();
      const vendor = (po.vendor || '').toLowerCase();
      return (
        items.includes(gownName) ||
        (sku && items.includes(sku)) ||
        vendor.includes(designer)
      );
    });
  }, [gown, allPurchaseOrders]);

  if (!gown || !open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Item Profile">
      <div className="flex flex-col md:flex-row gap-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Left Column: Image & Quick Stats */}
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
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-0.5">Total Stock</p>
              <p className="text-lg font-serif text-stone-900">{crossLocationStock.reduce((acc, curr) => acc + curr.stock, 0)}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 text-center">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-0.5">Margin</p>
              <p className={`text-lg font-serif ${margin && margin >= 50 ? 'text-emerald-600' : 'text-stone-900'}`}>
                {margin ? `${margin}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Drilldowns */}
        <div className="w-full md:w-2/3 space-y-6">
          {/* Header Info */}
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-2xl font-serif text-stone-900">{gown.name}</h2>
            <p className="text-base text-stone-500 mb-2">{gown.designer}</p>
            
            <div className="flex flex-wrap gap-2 text-xs font-medium text-stone-600">
              <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md">
                <Hash className="w-3.5 h-3.5"/> SKU: {gown.sku || gown.id}
              </span>
              <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md">
                <Tag className="w-3.5 h-3.5"/> Style: {gown.style}
              </span>
              <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md">Size {gown.size}</span>
              <span className="inline-flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-md">{gown.color}</span>
            </div>
          </div>

          {/* Pricing & Value */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-stone-400" /> Financials
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
              <div>
                <p className="text-[10px] text-stone-400 uppercase font-semibold">Retail Price</p>
                <p className="font-bold text-stone-900 text-sm">{formatCents(gown.priceCents)}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 uppercase font-semibold">Wholesale Cost</p>
                <p className="font-medium text-stone-700 text-sm">{gown.costCents > 0 ? formatCents(gown.costCents) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 uppercase font-semibold">MSRP</p>
                <p className="font-medium text-stone-700 text-sm">{gown.msrpCents > 0 ? formatCents(gown.msrpCents) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 uppercase font-semibold">Profit / Unit</p>
                <p className="font-bold text-emerald-600 text-sm">{gown.costCents > 0 ? formatCents(gown.priceCents - gown.costCents) : '—'}</p>
              </div>
            </div>
          </div>

          {/* Network Stock Levels */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-primary" /> Live Multi-Store Inventory
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {crossLocationStock.map((loc) => (
                <div key={loc.location.id} className="p-2.5 bg-white rounded-xl border border-stone-200 text-xs">
                  <p className="font-semibold text-stone-900 truncate">{loc.location.short}</p>
                  <p className="text-[10px] text-stone-500 truncate">{loc.location.city}</p>
                  <div className="mt-1.5 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-stone-900">{loc.stock} units</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      loc.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {loc.stock > 0 ? 'In Stock' : 'Out'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase History */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-brand-primary" /> Vendor Purchase Orders
            </h4>
            {recentPOs.length > 0 ? (
              <div className="space-y-2">
                {recentPOs.map((po) => {
                  const isExpanded = expandedPoId === po.id;
                  return (
                    <div
                      key={po.id}
                      className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                        className="w-full p-2.5 text-left flex items-center justify-between hover:bg-stone-50 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-brand-primary">{po.id}</span>
                          <div>
                            <p className="font-semibold text-stone-900">{po.vendor}</p>
                            <p className="text-[10px] text-stone-500 truncate max-w-[180px]">{po.items}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={po.status as any} />
                          <span className="font-bold text-stone-800">{formatCents((po as any).costCents || po.amountCents)}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-stone-400" /> : <ChevronDown className="h-3.5 w-3.5 text-stone-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3 py-2.5 bg-stone-50/70 border-t border-stone-100 text-xs space-y-1.5">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-600">
                            <div>
                              <span className="font-medium text-stone-400 block text-[9px] uppercase">Ordered</span>
                              <span className="font-semibold text-stone-800">{formatDate(po.ordered)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-stone-400 block text-[9px] uppercase">Expected</span>
                              <span className="font-semibold text-stone-800">{formatDate(po.expectedDelivery)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-stone-400 block text-[9px] uppercase">Destination</span>
                              <span className="font-semibold text-stone-800">{locationById(po.location)?.short}</span>
                            </div>
                            <div>
                              <span className="font-medium text-stone-400 block text-[9px] uppercase">Total Cost</span>
                              <span className="font-semibold text-stone-800">{formatCents((po as any).costCents || po.amountCents)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-500">
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
