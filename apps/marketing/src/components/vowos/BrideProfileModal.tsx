import { useStylistNames } from '@/lib/staff/useStylistNames';
import { useEffect, useMemo, useState, FormEvent } from 'react';
import { Ruler, Shirt, Loader2, Plus, Trash2, X, PencilRuler, Sparkles, PackageSearch } from 'lucide-react';
import { Customer, formatCents, formatDate } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import {
  MeasurementSet,
  MEASUREMENT_FIELDS,
  fetchMeasurements,
  addMeasurement,
  deleteMeasurement,
  TryOnNote,
  TRY_ON_RATINGS,
  TryOnRating,
  RATING_STYLES,
  fetchTryOnNotes,
  addTryOnNote,
  deleteTryOnNote,
} from '@/lib/fitProfile';
import { inputCls, btnPrimary } from './ui';
import { toast } from '@vowos/design-system';

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyMeasureForm = {
  takenOn: todayIso(),
  bust: '',
  waist: '',
  hips: '',
  hollowToHem: '',
  height: '',
  heelHeight: '',
  streetSize: '',
  gownSize: '',
  notes: '',
};

export default function BrideProfileModal({
  bride,
  open,
  onClose,
}: {
  bride: Customer | null;
  open: boolean;
  onClose: () => void;
}) {
  const teamMembers = useStylistNames();
  const { allGowns, purchaseOrders } = useVowosData();
  const [tab, setTab] = useState<'measurements' | 'tryons' | 'orders'>('measurements');

  const bridePos = useMemo(() => {
    if (!bride) return [];
    return purchaseOrders.filter((p) => p.items.toLowerCase().includes(bride.name.toLowerCase()));
  }, [purchaseOrders, bride?.name]);
  const [loading, setLoading] = useState(false);
  const [sets, setSets] = useState<MeasurementSet[]>([]);
  const [tryOns, setTryOns] = useState<TryOnNote[]>([]);

  // Measurement form
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [mForm, setMForm] = useState({ ...emptyMeasureForm, takenBy: teamMembers[0] });
  const [savingM, setSavingM] = useState(false);

  // Try-on form
  const [showTryForm, setShowTryForm] = useState(false);
  const [tForm, setTForm] = useState({
    gownPick: '',
    gownName: '',
    designer: '',
    price: '',
    rating: 'Loved' as TryOnRating,
    notes: '',
    stylist: teamMembers[0],
    triedOn: todayIso(),
  });
  const [savingT, setSavingT] = useState(false);

  useEffect(() => {
    if (!open || !bride) return;
    setTab('measurements');
    setShowMeasureForm(false);
    setShowTryForm(false);
    setMForm({ ...emptyMeasureForm, takenBy: bride.stylist || teamMembers[0] });
    setTForm((f) => ({ ...f, gownPick: '', gownName: '', designer: '', price: '', notes: '', stylist: bride.stylist || teamMembers[0], triedOn: todayIso() }));
    setLoading(true);
    Promise.all([fetchMeasurements(bride.id), fetchTryOnNotes(bride.id)]).then(([m, t]) => {
      setSets(m);
      setTryOns(t);
      setLoading(false);
    });
  }, [open, bride?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gownOptions = useMemo(() => {
    const seen = new Set<string>();
    return allGowns.filter((g) => {
      const key = `${g.name}|${g.designer}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allGowns]);

  if (!open || !bride) return null;

  const handleAddMeasurement = async (e: FormEvent) => {
    e.preventDefault();
    setSavingM(true);
    const { record, error } = await addMeasurement({
      brideId: bride.id,
      customer: bride.name,
      takenOn: mForm.takenOn || todayIso(),
      bust: mForm.bust,
      waist: mForm.waist,
      hips: mForm.hips,
      hollowToHem: mForm.hollowToHem,
      height: mForm.height,
      heelHeight: mForm.heelHeight,
      streetSize: mForm.streetSize,
      gownSize: mForm.gownSize,
      notes: mForm.notes,
      takenBy: mForm.takenBy,
    });
    setSavingM(false);
    if (error || !record) {
      toast({ title: 'Could not save measurements', description: error ?? 'Unknown error', variant: 'destructive' });
      return;
    }
    setSets((prev) => [record, ...prev]);
    setShowMeasureForm(false);
    setMForm({ ...emptyMeasureForm, takenBy: mForm.takenBy });
    toast({ title: 'Measurements saved', description: `${bride.name} · taken ${formatDate(record.takenOn)}` });
  };

  const handleDeleteMeasurement = async (id: string) => {
    const prev = sets;
    setSets((s) => s.filter((m) => m.id !== id));
    const err = await deleteMeasurement(id);
    if (err) {
      setSets(prev);
      toast({ title: 'Could not delete', description: err, variant: 'destructive' });
    }
  };

  const handlePickGown = (val: string) => {
    if (!val) {
      setTForm((f) => ({ ...f, gownPick: '', gownName: '', designer: '', price: '' }));
      return;
    }
    const g = gownOptions.find((x) => `${x.name}|${x.designer}` === val);
    if (g) {
      setTForm((f) => ({
        ...f,
        gownPick: val,
        gownName: g.name,
        designer: g.designer,
        price: (g.priceCents / 100).toFixed(0),
      }));
    } else {
      setTForm((f) => ({ ...f, gownPick: val, gownName: '', designer: '', price: '' }));
    }
  };

  const handleAddTryOn = async (e: FormEvent) => {
    e.preventDefault();
    if (!tForm.gownName.trim()) {
      toast({ title: 'Pick or name a gown first', variant: 'destructive' });
      return;
    }
    setSavingT(true);
    const { record, error } = await addTryOnNote({
      brideId: bride.id,
      customer: bride.name,
      gownName: tForm.gownName.trim(),
      designer: tForm.designer.trim(),
      priceCents: Math.round((parseFloat(tForm.price) || 0) * 100),
      rating: tForm.rating,
      notes: tForm.notes.trim(),
      stylist: tForm.stylist,
      triedOn: tForm.triedOn || todayIso(),
    });
    setSavingT(false);
    if (error || !record) {
      toast({ title: 'Could not save try-on note', description: error ?? 'Unknown error', variant: 'destructive' });
      return;
    }
    setTryOns((prev) => [record, ...prev]);
    setShowTryForm(false);
    setTForm((f) => ({ ...f, gownPick: '', gownName: '', designer: '', price: '', notes: '', rating: 'Loved' }));
    toast({ title: 'Try-on logged', description: `${record.gownName} · ${record.rating}` });
  };

  const handleDeleteTryOn = async (id: string) => {
    const prev = tryOns;
    setTryOns((t) => t.filter((n) => n.id !== id));
    const err = await deleteTryOnNote(id);
    if (err) {
      setTryOns(prev);
      toast({ title: 'Could not delete', description: err, variant: 'destructive' });
    }
  };

  const latest = sets[0] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-rose-200 text-sm font-semibold text-brand-primary">
              {bride.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h3 className="font-serif text-xl text-stone-900">{bride.name} — Fit Profile</h3>
              <p className="text-xs text-stone-500">
                Wedding {formatDate(bride.weddingDate)} · Stylist {bride.stylist}
                {latest && ` · Last measured ${formatDate(latest.takenOn)}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-100 px-6 pt-3">
          {(
            [
              { key: 'measurements', label: `Measurements (${sets.length})`, icon: Ruler },
              { key: 'tryons', label: `Try-On Notes (${tryOns.length})`, icon: Shirt },
              { key: 'orders', label: `Purchase Orders (${bridePos.length})`, icon: PackageSearch },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === key ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-primary" />
              <p className="mt-2 text-xs text-stone-500">Loading fit profile...</p>
            </div>
          )}

          {/* ── Measurements tab ── */}
          {!loading && tab === 'measurements' && (
            <div className="space-y-4">
              {!showMeasureForm && (
                <button onClick={() => setShowMeasureForm(true)} className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Record new measurements
                </button>
              )}

              {showMeasureForm && (
                <form onSubmit={handleAddMeasurement} className="rounded-2xl border border-border-subtle bg-brand-soft/40 p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
                    <PencilRuler className="h-4 w-4" /> New measurement set
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {MEASUREMENT_FIELDS.map((f) => (
                      <div key={f.key}>
                        <label className="mb-1 block text-[11px] font-medium text-stone-600">{f.label}</label>
                        <input
                          value={(mForm as any)[f.key] ?? ''}
                          onChange={(e) => setMForm({ ...mForm, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          className={inputCls}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-stone-600">Taken on</label>
                      <input type="date" value={mForm.takenOn} onChange={(e) => setMForm({ ...mForm, takenOn: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-stone-600">Taken by</label>
                      <select value={mForm.takenBy} onChange={(e) => setMForm({ ...mForm, takenBy: e.target.value })} className={inputCls}>
                        {teamMembers.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-[11px] font-medium text-stone-600">Fitting notes</label>
                    <textarea
                      value={mForm.notes}
                      onChange={(e) => setMForm({ ...mForm, notes: e.target.value })}
                      rows={2}
                      placeholder="e.g. Order to designer chart size 12 — hips are the controlling measurement..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="submit" disabled={savingM} className={`${btnPrimary} disabled:opacity-60`}>
                      {savingM ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ruler className="h-4 w-4" />} Save measurements
                    </button>
                    <button type="button" onClick={() => setShowMeasureForm(false)} className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {sets.length === 0 && !showMeasureForm && (
                <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
                  No measurements on file yet — record her first set at the consultation or contract signing.
                </p>
              )}

              {sets.map((m, idx) => (
                <div key={m.id} className={`rounded-2xl border p-4 ${idx === 0 ? 'border-border-subtle bg-white shadow-sm' : 'border-stone-200 bg-stone-50/50'}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-800">
                      {formatDate(m.takenOn)}
                      {idx === 0 && (
                        <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-primary ring-1 ring-inset ring-focus-ring">
                          Current
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400">
                      {m.takenBy && <span>by {m.takenBy}</span>}
                      <button onClick={() => handleDeleteMeasurement(m.id)} title="Delete" className="rounded p-1 text-stone-300 transition-colors hover:bg-brand-soft hover:text-brand-primary">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                    {MEASUREMENT_FIELDS.map((f) => (
                      <div key={f.key}>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{f.label}</p>
                        <p className="text-sm font-semibold text-stone-800">{(m as any)[f.key] || '—'}</p>
                      </div>
                    ))}
                  </div>
                  {m.notes && <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ── Try-on notes tab ── */}
          {!loading && tab === 'tryons' && (
            <div className="space-y-4">
              {!showTryForm && (
                <button onClick={() => setShowTryForm(true)} className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Log a try-on
                </button>
              )}

              {showTryForm && (
                <form onSubmit={handleAddTryOn} className="rounded-2xl border border-border-subtle bg-brand-soft/40 p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
                    <Sparkles className="h-4 w-4" /> New try-on note
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-medium text-stone-600">Gown from inventory</label>
                      <select value={tForm.gownPick} onChange={(e) => handlePickGown(e.target.value)} className={inputCls}>
                        <option value="">Custom / not in inventory...</option>
                        {gownOptions.map((g) => (
                          <option key={g.id} value={`${g.name}|${g.designer}`}>
                            {g.name} — {g.designer} ({formatCents(g.priceCents)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-stone-600">Gown name *</label>
                      <input value={tForm.gownName} onChange={(e) => setTForm({ ...tForm, gownName: e.target.value })} placeholder="Seraphina" className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-stone-600">Designer</label>
                      <input value={tForm.designer} onChange={(e) => setTForm({ ...tForm, designer: e.target.value })} placeholder="Maggie Sottero" className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-stone-600">Price ($)</label>
                      <input type="number" min="0" value={tForm.price} onChange={(e) => setTForm({ ...tForm, price: e.target.value })} placeholder="2899" className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-stone-600">Tried on</label>
                      <input type="date" value={tForm.triedOn} onChange={(e) => setTForm({ ...tForm, triedOn: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-[11px] font-medium text-stone-600">Her reaction</label>
                    <div className="flex flex-wrap gap-2">
                      {TRY_ON_RATINGS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setTForm({ ...tForm, rating: r })}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
                            tForm.rating === r ? RATING_STYLES[r] : 'bg-white text-stone-500 ring-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-medium text-stone-600">Stylist notes</label>
                      <textarea
                        value={tForm.notes}
                        onChange={(e) => setTForm({ ...tForm, notes: e.target.value })}
                        rows={2}
                        placeholder="What she loved, what didn't work, who was with her, follow-ups..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-stone-600">Stylist</label>
                      <select value={tForm.stylist} onChange={(e) => setTForm({ ...tForm, stylist: e.target.value })} className={inputCls}>
                        {teamMembers.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="submit" disabled={savingT} className={`${btnPrimary} disabled:opacity-60`}>
                      {savingT ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shirt className="h-4 w-4" />} Save try-on
                    </button>
                    <button type="button" onClick={() => setShowTryForm(false)} className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {tryOns.length === 0 && !showTryForm && (
                <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
                  No try-ons logged yet — capture every gown she tries so any stylist can pick up where the last visit left off.
                </p>
              )}

              {tryOns.map((n) => (
                <div key={n.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">
                        {n.gownName}
                        {n.designer && <span className="font-normal text-stone-500"> — {n.designer}</span>}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        {formatDate(n.triedOn)}
                        {n.stylist && ` · with ${n.stylist}`}
                        {n.priceCents > 0 && ` · ${formatCents(n.priceCents)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${RATING_STYLES[n.rating]}`}>
                        {n.rating}
                      </span>
                      <button onClick={() => handleDeleteTryOn(n.id)} title="Delete" className="rounded p-1 text-stone-300 transition-colors hover:bg-brand-soft hover:text-brand-primary">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {n.notes && <p className="mt-2 text-xs leading-relaxed text-stone-600">{n.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ── Purchase Orders tab ── */}
          {!loading && tab === 'orders' && (
            <div className="space-y-3">
              {bridePos.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
                  No special purchase orders currently linked to {bride.name}. Create a PO from the Purchasing screen to track factory production and arrival ETAs.
                </p>
              ) : (
                bridePos.map((po) => (
                  <div key={po.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">{po.id}</span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        {po.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-stone-800">{po.items}</p>
                    <p className="text-xs text-stone-500">
                      Vendor: <span className="font-semibold text-stone-700">{po.vendor}</span> · Expected ETA: <span className="font-semibold text-stone-700">{formatDate(po.expectedDelivery)}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
