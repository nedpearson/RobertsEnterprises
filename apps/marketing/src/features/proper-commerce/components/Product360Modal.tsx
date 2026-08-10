import { useState, useMemo } from 'react';
import { CatalogProduct, InventoryMovement, PurchaseMode } from '../types/properCommerceTypes';
import { updateCatalogProduct, recordStockAdjustment } from '../api/properCommerceApi';
import { formatCents, marginPct, formatDate } from '@/data/vowosData';
import { Modal } from '@/components/vowos/ui';
import { Package, Globe, Lock, Tag, MapPin, History, Code, Edit3, CheckCircle2, ExternalLink, Plus, Minus, RefreshCw, Layers, DollarSign, ShieldCheck } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface Product360ModalProps {
  product: CatalogProduct | null;
  movements: InventoryMovement[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function Product360Modal({ product, movements, onClose, onUpdate }: Product360ModalProps) {
  const [activeTab, setActiveTab] = useState<'source' | 'stock' | 'ledger' | 'json'>('source');
  const [editingPrice, setEditingPrice] = useState(false);
  const [retailInput, setRetailInput] = useState(
    (product?.variants?.[0]?.retailPriceCents / 100 || 0).toString()
  );
  const [costInput, setCostInput] = useState(
    (product?.variants?.[0]?.costCents / 100 || 0).toString()
  );

  // Manual Stock Adjustment state
  const [selectedVariantId, setSelectedVariantId] = useState(product?.variants?.[0]?.id || '');
  const [adjustLocation, setAdjustLocation] = useState<'pc-br' | 'pc-cov'>('pc-br');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('Manual cycle adjustment');

  // Filter movements for this product's variants
  const itemMovements = useMemo(() => {
    if (!product) return [];
    const variantSkus = product.variants.map((v) => v.sku);
    return movements.filter((m) => variantSkus.includes(m.sku));
  }, [movements, product]);

  if (!product) return null;

  const primaryVariant = product.variants[0];
  const currentCost = primaryVariant?.costCents || 0;
  const currentRetail = primaryVariant?.retailPriceCents || 0;
  const currentMargin = marginPct(currentCost, currentRetail);

  const handleSavePrices = async () => {
    const newRetailCents = Math.round(parseFloat(retailInput) * 100);
    const newCostCents = Math.round(parseFloat(costInput) * 100);

    if (isNaN(newRetailCents) || isNaN(newCostCents)) {
      toast({ title: 'Invalid price', description: 'Please enter valid dollar amounts.', variant: 'destructive' });
      return;
    }

    const updatedVariants = product.variants.map((v) => ({
      ...v,
      retailPriceCents: newRetailCents,
      costCents: newCostCents,
    }));

    await updateCatalogProduct(product.id, { variants: updatedVariants });
    toast({ title: 'Prices Updated', description: 'Updated cost & retail price across all variants.' });
    setEditingPrice(false);
    onUpdate();
  };

  const handleApplyAdjustment = async () => {
    if (!selectedVariantId) return;
    await recordStockAdjustment(
      product.id,
      selectedVariantId,
      adjustLocation,
      adjustQty,
      adjustReason,
      'Ramsey Sims'
    );
    toast({ title: 'Stock Adjusted', description: `Recorded ${adjustQty > 0 ? '+' : ''}${adjustQty} stock delta.` });
    onUpdate();
  };

  const togglePublish = async () => {
    const nextStatus = product.publishStatus === 'published' ? 'draft' : 'published';
    await updateCatalogProduct(product.id, {
      publishStatus: nextStatus,
      syncStatus: nextStatus === 'published' ? 'synced' : 'unpublished',
      lastSyncedAt: new Date().toISOString(),
    });
    toast({
      title: nextStatus === 'published' ? 'Published to Shopify' : 'Unpublished to Draft',
      description: `${product.title} status is now ${nextStatus}.`,
    });
    onUpdate();
  };

  return (
    <Modal open={true} onClose={onClose} title={`Product 360 Drilldown — ${product.title}`}>
      <div className="space-y-5 select-none max-w-3xl">
        {/* Header Hero Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-stone-900 p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-xl bg-stone-800 border border-stone-700 flex-shrink-0">
              {product.primaryImageUrl ? (
                <img src={product.primaryImageUrl} alt={product.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-stone-500">
                  <Package className="h-6 w-6" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">{product.title}</h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    product.publishStatus === 'published'
                      ? 'bg-status-success/20 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-status-warning/20 text-amber-300 ring-1 ring-status-warning/40'
                  }`}
                >
                  {product.publishStatus === 'published' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {product.publishStatus === 'published' ? 'Published on Shopify' : 'Internal Draft'}
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Style: <strong>{product.styleNumber}</strong> · Vendor: <strong>{product.vendorName}</strong> · Category: <strong>{product.category}</strong>
              </p>
              {product.shopifyProductId && (
                <p className="text-[11px] font-mono text-stone-400 mt-0.5">Shopify GID: {product.shopifyProductId}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePublish}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                product.publishStatus === 'published'
                  ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
              }`}
            >
              {product.publishStatus === 'published' ? 'Unpublish to Draft' : 'Publish to Shopify'}
            </button>
          </div>
        </div>

        {/* Modal Navigation Sub-Tabs */}
        <div className="flex border-b border-stone-200 gap-2">
          <button
            onClick={() => setActiveTab('source')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
              activeTab === 'source' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Tag className="h-3.5 w-3.5" /> Source Metadata &amp; Margin
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
              activeTab === 'stock' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" /> Multi-Location Stock
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
              activeTab === 'ledger' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="h-3.5 w-3.5" /> Item Audit Ledger ({itemMovements.length})
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
              activeTab === 'json' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Code className="h-3.5 w-3.5" /> Raw Source Schema
          </button>
        </div>

        {/* TAB 1: Source Metadata */}
        {activeTab === 'source' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div>
                <p className="text-stone-400">Retail Selling Price</p>
                {editingPrice ? (
                  <input
                    type="number"
                    value={retailInput}
                    onChange={(e) => setRetailInput(e.target.value)}
                    className="w-24 rounded border border-stone-300 px-2 py-1 font-bold text-stone-900"
                  />
                ) : (
                  <p className="text-lg font-bold text-stone-900">{formatCents(currentRetail)}</p>
                )}
              </div>
              <div>
                <p className="text-stone-400">Wholesale Cost Basis</p>
                {editingPrice ? (
                  <input
                    type="number"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                    className="w-24 rounded border border-stone-300 px-2 py-1 font-bold text-stone-900"
                  />
                ) : (
                  <p className="text-lg font-bold text-stone-900">{formatCents(currentCost)}</p>
                )}
              </div>
              <div>
                <p className="text-stone-400">Gross Profit Margin</p>
                <p className="text-lg font-bold text-status-success">{currentMargin}% Margin</p>
              </div>
              <div>
                <p className="text-stone-400">Purchase Mode</p>
                <p className="font-bold text-stone-900 capitalize">{product.purchaseMode.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingPrice ? (
                <>
                  <button
                    onClick={() => setEditingPrice(false)}
                    className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePrices}
                    className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Save Prices
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingPrice(true)}
                  className="inline-flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  <Edit3 className="h-3.5 w-3.5 text-brand-primary" /> Edit Cost &amp; Retail Price
                </button>
              )}
            </div>

            <div className="space-y-2 border-t border-stone-100 pt-3">
              <p className="font-bold text-stone-900">Tags &amp; Collections</p>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((t) => (
                  <span key={t} className="rounded-full bg-brand-soft border border-border-subtle px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary-hover">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Multi-Location Stock & Manual Adjustment */}
        {activeTab === 'stock' && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 text-[10px] font-bold uppercase text-stone-500 border-b">
                  <tr>
                    <th className="p-2.5">Variant / Size / Color</th>
                    <th className="p-2.5">SKU &amp; Barcode</th>
                    <th className="p-2.5">Baton Rouge Stock</th>
                    <th className="p-2.5">Covington Stock</th>
                    <th className="p-2.5">Total Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {product.variants.map((v) => (
                    <tr key={v.id}>
                      <td className="p-2.5 font-bold text-stone-900">
                        {v.color} / {v.size}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-stone-500">
                        {v.sku} <br />
                        <span className="text-[10px] text-stone-400">UPC: {v.barcode}</span>
                      </td>
                      <td className="p-2.5 font-bold text-stone-800">{v.inventoryBatonRouge} units</td>
                      <td className="p-2.5 font-bold text-stone-800">{v.inventoryCovington} units</td>
                      <td className="p-2.5">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                          {v.inventoryBatonRouge + v.inventoryCovington} total
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Adjustment Tool */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
              <p className="font-bold text-stone-900">Record Stock Adjustment</p>
              <div className="grid grid-cols-4 gap-2">
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="rounded-xl border border-stone-300 bg-white p-2 text-xs font-semibold text-stone-800"
                >
                  {product.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.color} / {v.size} ({v.sku})
                    </option>
                  ))}
                </select>

                <select
                  value={adjustLocation}
                  onChange={(e) => setAdjustLocation(e.target.value as any)}
                  className="rounded-xl border border-stone-300 bg-white p-2 text-xs font-semibold text-stone-800"
                >
                  <option value="pc-br">Proper Baton Rouge</option>
                  <option value="pc-cov">Proper Covington</option>
                </select>

                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 0)}
                  placeholder="Delta e.g. +1 or -1"
                  className="rounded-xl border border-stone-300 bg-white p-2 text-xs font-bold text-stone-900"
                />

                <button
                  onClick={handleApplyAdjustment}
                  className="rounded-xl bg-brand-primary py-2 text-xs font-bold text-white hover:bg-brand-primary-hover"
                >
                  Post Adjustment
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-500 mb-1">Adjustment Reason / Note</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Audit Ledger */}
        {activeTab === 'ledger' && (
          <div className="space-y-3 text-xs max-h-80 overflow-y-auto">
            {itemMovements.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 shadow-2xs">
                <div>
                  <p className="font-bold text-stone-900">{m.reason}</p>
                  <p className="text-[11px] font-mono text-stone-400">
                    {m.sku} · Location: {m.locationId === 'pc-br' ? 'Baton Rouge' : 'Covington'} · Staff: {m.performedBy}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${m.quantityDelta >= 0 ? 'text-status-success' : 'text-brand-primary'}`}>
                    {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta} units
                  </span>
                  <p className="text-[10px] text-stone-400">{formatDate(m.occurredAt)}</p>
                </div>
              </div>
            ))}
            {itemMovements.length === 0 && (
              <p className="py-8 text-center text-stone-400">No stock movements recorded for this item yet.</p>
            )}
          </div>
        )}

        {/* TAB 4: Raw JSON Source Schema */}
        {activeTab === 'json' && (
          <div className="rounded-xl border border-stone-800 bg-stone-950 p-4 text-[11px] font-mono text-emerald-400 max-h-80 overflow-y-auto">
            <pre>{JSON.stringify(product, null, 2)}</pre>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end border-t border-stone-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-300 bg-white px-5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
          >
            Close Drilldown
          </button>
        </div>
      </div>
    </Modal>
  );
}
