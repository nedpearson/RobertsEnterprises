import { useState, useMemo } from 'react';
import { CatalogProduct, InventoryLevel, InventoryMovement } from '../types/properCommerceTypes';
import Product360Modal from './Product360Modal';
import { formatDate } from '@/data/vowosData';
import { Search, MapPin, ArrowRightLeft, History, PackageCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface InventoryLevelsViewProps {
  levels: InventoryLevel[];
  movements: InventoryMovement[];
  products?: CatalogProduct[];
  onUpdate?: () => void;
}

export default function InventoryLevelsView({ levels, movements, products = [], onUpdate = () => {} }: InventoryLevelsViewProps) {
  const [activeTab, setActiveTab] = useState<'levels' | 'movements'>('levels');
  const [selectedLocation, setSelectedLocation] = useState<'all' | 'pc-br' | 'pc-cov'>('all');
  const [query, setQuery] = useState('');
  const [drilldownProd, setDrilldownProd] = useState<CatalogProduct | null>(null);

  const filteredLevels = useMemo(() => {
    return levels.filter((lvl) => {
      const matchesLoc = selectedLocation === 'all' || lvl.locationId === selectedLocation;
      const matchesQuery =
        lvl.sku.toLowerCase().includes(query.toLowerCase()) ||
        lvl.productTitle.toLowerCase().includes(query.toLowerCase());
      return matchesLoc && matchesQuery;
    });
  }, [levels, selectedLocation, query]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchesLoc = selectedLocation === 'all' || m.locationId === selectedLocation;
      const matchesQuery =
        m.sku.toLowerCase().includes(query.toLowerCase()) ||
        m.productTitle.toLowerCase().includes(query.toLowerCase()) ||
        m.reason.toLowerCase().includes(query.toLowerCase());
      return matchesLoc && matchesQuery;
    });
  }, [movements, selectedLocation, query]);

  return (
    <div className="space-y-5 select-none">
      {/* Header Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('levels')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'levels' ? 'bg-rose-500 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Location Inventory Levels
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'movements' ? 'bg-rose-500 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Inventory Movement Ledger
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value as any)}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none"
          >
            <option value="all">Location: All Proper Stores</option>
            <option value="pc-br">Proper &amp; Co — Baton Rouge</option>
            <option value="pc-cov">Proper &amp; Co — Covington</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SKU or title..."
              className="rounded-xl border border-stone-300 bg-white pl-9 pr-3 py-2 text-xs font-medium text-stone-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Inventory Levels */}
      {activeTab === 'levels' && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Product / SKU</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">On Hand</th>
                  <th className="px-4 py-3">Committed / Reserved</th>
                  <th className="px-4 py-3">Available for Online</th>
                  <th className="px-4 py-3">Reorder Threshold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLevels.map((lvl, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-rose-50/30">
                    <td className="px-4 py-3.5">
                      <p
                        onClick={() => {
                          const targetProd = products.find((p) => p.variants.some((v) => v.sku === lvl.sku));
                          if (targetProd) setDrilldownProd(targetProd);
                        }}
                        className="font-bold text-stone-900 cursor-pointer hover:text-rose-600 hover:underline transition-colors"
                      >
                        {lvl.productTitle}
                      </p>
                      <p className="text-[11px] font-mono text-stone-400">SKU: {lvl.sku}</p>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-stone-800">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-rose-500" /> {lvl.locationName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-stone-900">{lvl.onHand} units</td>
                    <td className="px-4 py-3.5 text-stone-500">{lvl.committed + lvl.reserved} units</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                        {lvl.available} available
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">
                      Reorder at ≤ {lvl.reorderPoint} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Inventory Movement Ledger */}
      {activeTab === 'movements' && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Product / SKU</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Quantity Delta</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3">Reason / Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMovements.map((mov) => (
                  <tr key={mov.id} className="transition-colors hover:bg-stone-50">
                    <td className="px-4 py-3.5 font-mono text-[11px] text-stone-500">{formatDate(mov.occurredAt)}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-stone-900">{mov.productTitle}</p>
                      <p className="text-[11px] font-mono text-stone-400">{mov.sku}</p>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-stone-800">
                      {mov.locationId === 'pc-br' ? 'Proper Baton Rouge' : 'Proper Covington'}
                    </td>
                    <td className="px-4 py-3.5 font-bold">
                      <span className={mov.quantityDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {mov.quantityDelta >= 0 ? `+${mov.quantityDelta}` : mov.quantityDelta} units
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-stone-100 px-2 py-0.5 font-semibold text-stone-700 uppercase text-[10px]">
                        {mov.movementType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-stone-800">{mov.reason}</p>
                      <p className="text-[11px] text-stone-400">By: {mov.performedBy}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product 360 Drilldown Modal */}
      {drilldownProd && (
        <Product360Modal
          product={drilldownProd}
          movements={movements}
          onClose={() => setDrilldownProd(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
