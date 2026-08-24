import { useState, useMemo } from 'react';
import { CatalogProduct, InventoryMovement, PurchaseMode } from '../types/properCommerceTypes';
import { bulkPublishProducts, bulkUnpublishProducts, updateCatalogProduct } from '../api/properCommerceApi';
import { formatCents, marginPct } from '@/data/vowosData';
import { StatusBadge, Modal, inputCls, btnPrimary } from '@/components/vowos/ui';
import { Search, Plus, Filter, CheckCircle2, Globe, Lock, Tag, Package, Layers, ShoppingBag, Store, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from '@vowos/design-system';
import Product360Modal from './Product360Modal';

interface CatalogManagerProps {
  products: CatalogProduct[];
  movements?: InventoryMovement[];
  onUpdate: () => void;
}

const PURCHASE_MODE_LABELS: Record<PurchaseMode, { label: string; bg: string }> = {
  buy_online: { label: 'Buy Online', bg: 'bg-status-success/10 text-emerald-700 border-emerald-200' },
  reserve_in_store: { label: 'Reserve in Store', bg: 'bg-violet-50 text-violet-700 border-violet-200' },
  book_appointment: { label: 'Book Appointment', bg: 'bg-brand-soft text-brand-primary-hover border-border-subtle' },
  inquire_stylist: { label: 'Inquire with Stylist', bg: 'bg-status-warning/10 text-status-warning border-status-warning/20' },
  appointment_only: { label: 'Appointment Only', bg: 'bg-stone-100 text-stone-700 border-stone-200' },
  do_not_publish: { label: 'Internal Only', bg: 'bg-stone-200 text-stone-600 border-stone-300' },
};

export default function CatalogManager({ products, movements = [], onUpdate }: CatalogManagerProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Drilldown & Edit States
  const [drilldownProd, setDrilldownProd] = useState<CatalogProduct | null>(null);
  const [editingModeProd, setEditingModeProd] = useState<CatalogProduct | null>(null);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery =
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.styleNumber.toLowerCase().includes(query.toLowerCase()) ||
        p.vendorName.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || p.publishStatus === selectedStatus;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [products, query, selectedCategory, selectedStatus]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((p) => p.id));
  };

  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) return;
    setPublishing(true);
    const count = await bulkPublishProducts(selectedIds);
    toast({ title: 'Products Published', description: `Successfully published ${count} product(s) to Shopify storefront.` });
    setSelectedIds([]);
    onUpdate();
    setPublishing(false);
  };

  const handleBulkUnpublish = async () => {
    if (selectedIds.length === 0) return;
    setPublishing(true);
    const count = await bulkUnpublishProducts(selectedIds);
    toast({ title: 'Products Unpublished', description: `Moved ${count} product(s) to draft status.` });
    setSelectedIds([]);
    onUpdate();
    setPublishing(false);
  };

  const handleSavePurchaseMode = async (mode: PurchaseMode) => {
    if (!editingModeProd) return;
    await updateCatalogProduct(editingModeProd.id, { purchaseMode: mode });
    toast({ title: 'Purchase Mode Updated', description: `Set ${editingModeProd.title} to ${PURCHASE_MODE_LABELS[mode].label}` });
    setEditingModeProd(null);
    onUpdate();
  };

  return (
    <div className="space-y-5 select-none">
      {/* Search & Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalog by title, style #, vendor, category..."
              className={`${inputCls} pl-9`}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>Category: {c}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 focus:outline-none"
          >
            <option value="All">Status: All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-brand-soft px-3 py-1.5 rounded-xl border border-border-subtle">
            <span className="text-xs font-bold text-brand-secondary">{selectedIds.length} selected</span>
            <button
              onClick={handleBulkPublish}
              disabled={publishing}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              Publish to Shopify
            </button>
            <button
              onClick={handleBulkUnpublish}
              disabled={publishing}
              className="rounded-lg bg-stone-700 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition-colors"
            >
              Unpublish
            </button>
          </div>
        )}
      </div>

      {/* Catalog Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded text-brand-primary accent-rose-500"
                  />
                </th>
                <th className="px-4 py-3">Product / Style</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Cost &amp; Retail</th>
                <th className="px-4 py-3">Stock (BR / Cov)</th>
                <th className="px-4 py-3">Purchase Mode</th>
                <th className="px-4 py-3">Shopify Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((p) => {
                const primaryVariant = p.variants[0];
                const cost = primaryVariant?.costCents || 0;
                const retail = primaryVariant?.retailPriceCents || 0;
                const margin = marginPct(cost, retail);
                const brStock = p.variants.reduce((s, v) => s + v.inventoryBatonRouge, 0);
                const covStock = p.variants.reduce((s, v) => s + v.inventoryCovington, 0);
                const isSelected = selectedIds.includes(p.id);

                return (
                  <tr key={p.id} className={`transition-colors hover:bg-brand-soft/30 ${isSelected ? 'bg-brand-soft/50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded text-brand-primary accent-rose-500"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200">
                          {p.primaryImageUrl ? (
                            <img src={p.primaryImageUrl} alt={p.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-stone-400">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p
                            onClick={() => setDrilldownProd(p)}
                            className="font-bold text-stone-900 cursor-pointer hover:text-brand-primary hover:underline transition-colors"
                          >
                            {p.title}
                          </p>
                          <p className="text-[11px] text-stone-400">Style: {p.styleNumber} · {p.variants.length} variant(s)</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-stone-800">{p.vendorName}</td>
                    <td className="px-4 py-3.5 text-stone-600">{p.category}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-stone-900">{formatCents(retail)}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                        <span>Cost: {formatCents(cost)}</span>
                        <span className="rounded bg-status-success/10 px-1 font-semibold text-emerald-700">{margin}% margin</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs space-y-0.5">
                        <p className="font-medium text-stone-800">BR: <span className="font-bold">{brStock}</span></p>
                        <p className="text-stone-500">COV: <span className="font-bold">{covStock}</span></p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setEditingModeProd(p)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-transform hover:scale-105 ${PURCHASE_MODE_LABELS[p.purchaseMode].bg}`}
                      >
                        {PURCHASE_MODE_LABELS[p.purchaseMode].label}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          p.publishStatus === 'published'
                            ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}
                      >
                        {p.publishStatus === 'published' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {p.publishStatus === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-stone-400">
                    No Proper &amp; Co products match your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Purchase Mode Modal */}
      {editingModeProd && (
        <Modal open={true} onClose={() => setEditingModeProd(null)} title={`Purchase Mode — ${editingModeProd.title}`}>
          <div className="space-y-4 select-none">
            <p className="text-xs text-stone-600">
              Select how customers interact with this item on the Proper &amp; Co. storefront:
            </p>

            <div className="space-y-2">
              {(Object.keys(PURCHASE_MODE_LABELS) as PurchaseMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleSavePurchaseMode(mode)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    editingModeProd.purchaseMode === mode
                      ? 'border-brand-primary bg-brand-soft/50 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-stone-900">{PURCHASE_MODE_LABELS[mode].label}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {mode === 'buy_online' && 'Standard checkout via Proper Shopify store.'}
                      {mode === 'reserve_in_store' && 'Capture store hold request for Baton Rouge or Covington.'}
                      {mode === 'book_appointment' && 'Pre-fill bridal/evening consultation request.'}
                      {mode === 'inquire_stylist' && 'Customer sends direct product inquiry.'}
                      {mode === 'appointment_only' && 'Display item details without online checkout.'}
                      {mode === 'do_not_publish' && 'Keep item internal to VowOS.'}
                    </p>
                  </div>
                  {editingModeProd.purchaseMode === mode && <CheckCircle2 className="h-4 w-4 text-brand-primary" />}
                </button>
              ))}
            </div>
          </div>
        </Modal>
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
