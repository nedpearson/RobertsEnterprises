import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Loader2, PackageCheck, Plus, Truck, Store } from 'lucide-react';
import { Gown, LocationId, LOCATIONS, locationById, formatDate } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { PageHeader, StatusBadge, Modal, inputCls, btnPrimary, btnSecondary, StatCard, BeautifulEmptyState } from './ui';
import { LocationBadge, LocationSelect } from './LocationSelect';
import RebalancingEngine from '@/features/inventory/components/RebalancingEngine';
import InventoryBalancerWidget from '@/features/inventory/components/InventoryBalancerWidget';

const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500';

/**
 * Start a transfer between stores. When `gown` is provided (from the
 * Inventory view) the gown picker is locked to that piece.
 */
export function TransferModal({
  open,
  gown,
  onClose,
}: {
  open: boolean;
  gown?: Gown | null;
  onClose: () => void;
}) {
  const { allGowns, addTransfer } = useVowosData();
  const [gownId, setGownId] = useState('');
  const [to, setTo] = useState<LocationId>('ido-cov');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const available = useMemo(() => allGowns.filter((g) => g.stock > 0), [allGowns]);
  const selected = allGowns.find((g) => g.id === gownId) ?? null;

  useEffect(() => {
    if (open) {
      const initial = gown ?? available[0] ?? null;
      setGownId(initial?.id ?? '');
      const source = initial?.location ?? 'ido-br';
      setTo(LOCATIONS.find((l) => l.id !== source)?.id ?? 'ido-cov');
      setQty('1');
      setNote('');
      setError('');
      setSaving(false);
    }
  }, [open, gown]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep destination valid whenever the source gown changes.
  useEffect(() => {
    if (selected && to === selected.location) {
      setTo(LOCATIONS.find((l) => l.id !== selected.location)?.id ?? 'ido-cov');
    }
  }, [selected, to]);

  const qtyNum = parseInt(qty, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selected) return setError('Please choose a gown to transfer.');
    if (!Number.isInteger(qtyNum) || qtyNum < 1) return setError('Quantity must be at least 1.');
    if (qtyNum > selected.stock)
      return setError(`Only ${selected.stock} piece(s) on hand at ${locationById(selected.location).short}.`);
    setSaving(true);
    const ok = await addTransfer({ gownId: selected.id, to, qty: qtyNum, note });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Transfer Between Stores">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="transfer-gown">Gown</label>
          {gown ? (
            <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
              <img src={gown.image} alt={gown.name} className="h-16 w-12 rounded-lg object-cover" />
              <div>
                <p className="font-serif text-stone-900">{gown.name}</p>
                <p className="text-xs text-stone-500">
                  {gown.designer} · Size {gown.size} · {gown.stock} on hand
                </p>
                <LocationBadge id={gown.location} className="mt-1" />
              </div>
            </div>
          ) : (
            <select
              id="transfer-gown"
              value={gownId}
              onChange={(e) => setGownId(e.target.value)}
              className={inputCls}
            >
              {available.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.designer} · Size {g.size} — {locationById(g.location).short} ({g.stock} on hand)
                </option>
              ))}
            </select>
          )}
        </div>

        {selected && (
          <div className="flex items-center justify-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5 ring-1 ring-stone-200">
            <LocationBadge id={selected.location} />
            <ArrowRight className="h-4 w-4 text-stone-400" />
            <LocationBadge id={to} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="transfer-to">Send to</label>
            <LocationSelect id="transfer-to" value={to} onChange={setTo} exclude={selected?.location} />
          </div>
          <div>
            <label className={labelCls} htmlFor="transfer-qty">Quantity</label>
            <input
              id="transfer-qty"
              type="number"
              min="1"
              max={selected?.stock ?? 1}
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="transfer-note">Note (optional)</label>
          <input
            id="transfer-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. For Saturday trunk show"
            className={inputCls}
          />
        </div>

        {error && <p className="text-sm text-brand-primary">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving || !selected}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            {saving ? 'Sending...' : 'Start Transfer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TransfersView() {
  const { transfers, activeLocation, loading, receiveTransfer } = useVowosData();
  const [modalOpen, setModalOpen] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const inTransit = transfers.filter((t) => t.status === 'In Transit');
  const received = transfers.filter((t) => t.status === 'Received');
  const piecesMoved = transfers.reduce((s, t) => s + t.qty, 0);

  const scopeLabel =
    activeLocation === 'all' ? 'across all four stores' : `involving ${locationById(activeLocation).short}`;

  const handleReceive = async (id: string) => {
    setReceivingId(id);
    await receiveTransfer(id);
    setReceivingId(null);
  };

  return (
    <div>
      <PageHeader
        title="Store Transfers"
        subtitle={`${inTransit.length} in transit · ${piecesMoved} pieces moved ${scopeLabel}`}
        action={
          <button data-tour-id="btn-request-transfer" onClick={() => setModalOpen(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" />
            New Transfer
          </button>
        }
      />

      <InventoryBalancerWidget />
      <RebalancingEngine />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="In Transit"
          value={String(inTransit.length)}
          sub={`${inTransit.reduce((s, t) => s + t.qty, 0)} piece(s) on the road`}
          icon={<Truck className="h-5 w-5" />}
          accent="violet"
        />
        <StatCard
          label="Completed"
          value={String(received.length)}
          sub="Transfers received and restocked"
          icon={<PackageCheck className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Stores"
          value={String(LOCATIONS.length)}
          sub="I Do Bridal Couture + Proper & Co · Baton Rouge & Covington"
          icon={<Store className="h-5 w-5" />}
          accent="rose"
        />
      </div>

      {loading && transfers.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 py-16 text-stone-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading transfers...
        </div>
      ) : transfers.length === 0 ? (
        <BeautifulEmptyState
          icon={<ArrowLeftRight className="h-8 w-8" />}
          title="No Transfers Found"
          description={`No transfers ${scopeLabel} yet.`}
          colorHint="violet"
          action={
            <button onClick={() => setModalOpen(true)} className={`${btnPrimary}`}>
              Initiate Transfer
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-xs uppercase tracking-wider text-stone-500">
                  <th className="px-4 py-3 font-medium">Transfer</th>
                  <th className="px-4 py-3 font-medium">Gown</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-medium text-stone-700">{t.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-serif text-stone-900">{t.gownName}</p>
                      {t.note && <p className="text-xs text-stone-400">{t.note}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <LocationBadge id={t.from} />
                        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-stone-400" />
                        <LocationBadge id={t.to} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{t.qty}</td>
                    <td className="px-4 py-3 text-stone-500">{t.requested ? formatDate(t.requested) : '—'}</td>
                    <td className="px-4 py-3 text-stone-500">{t.received ? formatDate(t.received) : '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === 'In Transit' ? (
                        <button
                          onClick={() => handleReceive(t.id)}
                          disabled={receivingId === t.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-status-success/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {receivingId === t.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PackageCheck className="h-3.5 w-3.5" />
                          )}
                          Mark Received
                        </button>
                      ) : (
                        <span className="text-xs text-stone-400">Restocked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TransferModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
