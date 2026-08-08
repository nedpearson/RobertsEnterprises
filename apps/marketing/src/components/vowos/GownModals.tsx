import { useEffect, useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import {
  Gown,
  GOWN_IMAGES,
  GOWN_STYLES,
  GOWN_CATEGORIES,
  GOWN_CONDITIONS,
  LocationId,
  gownStatusForStock,
  formatCents,
  marginPct,
  markupLabel,
} from '@/data/vowosData';
import { useVowosData, GownInput } from '@/contexts/VowosDataContext';
import { Modal, StatusBadge, inputCls, btnPrimary, btnSecondary } from './ui';
import { LocationSelect, LocationBadge } from './LocationSelect';


const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500';

/** Parse a dollars string ("2,890.00") into integer cents. Returns NaN when invalid. */
function dollarsToCents(value: string): number {
  const n = parseFloat(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

// ─── Add / Edit Gown ───

export function GownFormModal({
  open,
  gown,
  onClose,
}: {
  open: boolean;
  gown: Gown | null; // null = add new
  onClose: () => void;
}) {
  const { addGown, updateGown, activeLocation } = useVowosData();
  const [name, setName] = useState('');
  const [designer, setDesigner] = useState('');
  const [style, setStyle] = useState(GOWN_STYLES[0]);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [msrp, setMsrp] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(GOWN_CATEGORIES[0]);
  const [condition, setCondition] = useState(GOWN_CONDITIONS[0]);
  const [vendor, setVendor] = useState('');
  const [reorderPoint, setReorderPoint] = useState('1');
  const [notes, setNotes] = useState('');
  const [stock, setStock] = useState('1');
  const [image, setImage] = useState(GOWN_IMAGES[0]);
  const [location, setLocation] = useState<LocationId>('ido-br');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(gown?.name ?? '');
      setDesigner(gown?.designer ?? '');
      setStyle(gown?.style ?? GOWN_STYLES[0]);
      setSize(gown?.size ?? '');
      setColor(gown?.color ?? '');
      setPrice(gown ? (gown.priceCents / 100).toFixed(2) : '');
      setCost(gown && gown.costCents > 0 ? (gown.costCents / 100).toFixed(2) : '');
      setMsrp(gown && gown.msrpCents > 0 ? (gown.msrpCents / 100).toFixed(2) : '');
      setSku(gown?.sku ?? '');
      setCategory(gown?.category ?? GOWN_CATEGORIES[0]);
      setCondition(gown?.condition ?? GOWN_CONDITIONS[0]);
      setVendor(gown?.vendor ?? '');
      setReorderPoint(gown ? String(gown.reorderPoint) : '1');
      setNotes(gown?.notes ?? '');
      setStock(gown ? String(gown.stock) : '1');
      setImage(gown?.image ?? GOWN_IMAGES[0]);
      // New gowns default to the store currently being viewed.
      setLocation(gown?.location ?? (activeLocation === 'all' ? 'ido-br' : activeLocation));
      setError('');
      setSaving(false);
    }
  }, [open, gown, activeLocation]);


  const priceCents = dollarsToCents(price);
  const costCents = cost.trim() === '' ? 0 : dollarsToCents(cost);
  const msrpCents = msrp.trim() === '' ? 0 : dollarsToCents(msrp);
  const stockNum = parseInt(stock, 10);
  const reorderNum = parseInt(reorderPoint, 10);
  const previewStatus = Number.isFinite(stockNum) && stockNum >= 0 ? gownStatusForStock(stockNum) : null;

  const margin =
    Number.isFinite(priceCents) && priceCents > 0 && Number.isFinite(costCents) && costCents > 0
      ? marginPct(costCents, priceCents)
      : null;
  const markup =
    Number.isFinite(priceCents) && Number.isFinite(costCents) ? markupLabel(costCents, priceCents) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please enter a gown name.');
    if (!designer.trim()) return setError('Please enter a designer.');
    if (!size.trim()) return setError('Please enter a size.');
    if (!color.trim()) return setError('Please enter a color.');
    if (!Number.isFinite(priceCents) || priceCents <= 0)
      return setError('Please enter a valid retail price greater than $0.');
    if (cost.trim() !== '' && (!Number.isFinite(costCents) || costCents < 0))
      return setError('Cost must be a valid dollar amount (or left blank).');
    if (msrp.trim() !== '' && (!Number.isFinite(msrpCents) || msrpCents < 0))
      return setError('MSRP must be a valid dollar amount (or left blank).');
    if (!Number.isInteger(stockNum) || stockNum < 0)
      return setError('Quantity must be a whole number of 0 or more.');
    if (!Number.isInteger(reorderNum) || reorderNum < 0)
      return setError('Reorder point must be a whole number of 0 or more.');

    const input: GownInput = {
      name: name.trim(),
      designer: designer.trim(),
      style,
      size: size.trim(),
      color: color.trim(),
      priceCents,
      stock: stockNum,
      image,
      location,
      sku: sku.trim(),
      costCents: Number.isFinite(costCents) ? costCents : 0,
      msrpCents: Number.isFinite(msrpCents) ? msrpCents : 0,
      category,
      condition,
      vendor: vendor.trim(),
      reorderPoint: reorderNum,
      notes: notes.trim(),
    };

    setSaving(true);
    const ok = gown ? await updateGown(gown.id, input) : await addGown(input);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={gown ? `Edit Gown · ${gown.id}` : 'Add Gown'}>
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="gown-name">Gown name</label>
            <input
              id="gown-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Seraphina"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="gown-designer">Designer</label>
            <input
              id="gown-designer"
              value={designer}
              onChange={(e) => setDesigner(e.target.value)}
              placeholder="e.g. Maggie Sottero"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls} htmlFor="gown-category">Category</label>
            <select id="gown-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {GOWN_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="gown-style">Silhouette</label>
            <select id="gown-style" value={style} onChange={(e) => setStyle(e.target.value)} className={inputCls}>
              {GOWN_STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="gown-condition">Condition</label>
            <select id="gown-condition" value={condition} onChange={(e) => setCondition(e.target.value)} className={inputCls}>
              {GOWN_CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls} htmlFor="gown-size">Size</label>
            <input id="gown-size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 8" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="gown-color">Color</label>
            <input id="gown-color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Ivory" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="gown-sku">SKU / tag #</label>
            <input id="gown-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="auto if blank" className={inputCls} />
          </div>
        </div>

        {/* Costing */}
        <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Costing</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls} htmlFor="gown-cost">Wholesale cost ($)</label>
              <input
                id="gown-cost"
                type="number" min="0" step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="1300.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="gown-price">Retail price ($)</label>
              <input
                id="gown-price"
                type="number" min="0.01" step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="2890.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="gown-msrp">MSRP ($)</label>
              <input
                id="gown-msrp"
                type="number" min="0" step="0.01"
                value={msrp}
                onChange={(e) => setMsrp(e.target.value)}
                placeholder="optional"
                className={inputCls}
              />
            </div>
          </div>
          {(margin !== null || markup) && (
            <p className="mt-2.5 text-xs text-stone-600">
              {margin !== null && (
                <>
                  Gross margin{' '}
                  <span className={`font-semibold ${margin >= 50 ? 'text-emerald-600' : margin >= 35 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {margin}%
                  </span>
                </>
              )}
              {markup && <> · Markup <span className="font-semibold text-stone-800">{markup}</span></>}
              {margin !== null && Number.isFinite(priceCents) && Number.isFinite(costCents) && (
                <> · {formatCents(priceCents - costCents)} profit per piece</>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls} htmlFor="gown-stock">Qty on hand</label>
            <input id="gown-stock" type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="gown-reorder">Reorder at</label>
            <input id="gown-reorder" type="number" min="0" step="1" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="gown-vendor">Vendor</label>
            <input id="gown-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="defaults to designer" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="gown-location">Store location</label>
          <LocationSelect id="gown-location" value={location} onChange={setLocation} />
          {gown && location !== gown.location && (
            <p className="mt-1 text-[11px] text-amber-600">
              This will move the record to a different store. For stock moves, prefer a Store Transfer.
            </p>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="gown-notes">Internal notes</label>
          <textarea
            id="gown-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Runs small · reorder lead time 16 weeks · discontinued Fall '26…"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label className={labelCls}>Catalog photo</label>
          <div className="grid grid-cols-8 gap-2">
            {GOWN_IMAGES.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setImage(url)}
                className={`overflow-hidden rounded-lg ring-2 transition-all ${
                  image === url ? 'ring-rose-500' : 'ring-transparent hover:ring-stone-300'
                }`}
                aria-label={`Photo option ${i + 1}`}
              >
                <img src={url} alt="" className="aspect-[3/4] w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {previewStatus && (
          <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600 ring-1 ring-stone-200">
            <span>Status will be</span>
            <StatusBadge status={previewStatus} />
            {Number.isFinite(priceCents) && priceCents > 0 && <span>· retails at {formatCents(priceCents)}</span>}
            {Number.isInteger(stockNum) && Number.isInteger(reorderNum) && stockNum <= reorderNum && (
              <span className="font-medium text-amber-600">· at/below reorder point</span>
            )}
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : gown ? 'Save Changes' : 'Add Gown'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Adjust Stock ───

export function AdjustStockModal({
  gown,
  onClose,
}: {
  gown: Gown | null;
  onClose: () => void;
}) {
  const { adjustGownStock } = useVowosData();
  const [stock, setStock] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gown) {
      setStock(gown.stock);
      setSaving(false);
    }
  }, [gown?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!gown) return null;

  const newStatus = gownStatusForStock(stock);
  const changed = stock !== gown.stock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed) return onClose();
    setSaving(true);
    const ok = await adjustGownStock(gown.id, stock);
    setSaving(false);
    if (ok) onClose();
  };

  const stepBtn =
    'flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40';

  return (
    <Modal open onClose={onClose} title={`Adjust Stock · ${gown.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <img src={gown.image} alt={gown.name} className="h-20 w-16 rounded-lg object-cover" />
          <div>
            <p className="font-serif text-lg text-stone-900">{gown.name}</p>
            <p className="text-xs text-stone-500">
              {gown.designer} · {gown.style} · Size {gown.size} · {gown.color}
            </p>
            <p className="text-xs text-stone-400">
              SKU {gown.sku || gown.id} · {gown.condition} · Retail {formatCents(gown.priceCents)}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Currently {gown.stock} on hand · <StatusBadge status={gown.status} />
            </p>
            <LocationBadge id={gown.location} className="mt-1.5" />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="stock-qty">Quantity on hand</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStock((s) => Math.max(0, s - 1))}
              className={stepBtn}
              disabled={stock <= 0}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              id="stock-qty"
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className={`${inputCls} w-24 text-center`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setStock((s) => s + 1)}
              className={stepBtn}
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600 ring-1 ring-stone-200">
          <span>Status will become</span>
          <StatusBadge status={newStatus} />
          {stock <= gown.reorderPoint && <span className="font-medium text-amber-600">· at/below reorder point ({gown.reorderPoint})</span>}
          {!changed && <span>· no change yet</span>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : 'Update Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
