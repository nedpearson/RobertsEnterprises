import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Clock3, PackageX, Plus, RefreshCw, Search, Truck, X, XCircle } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { jsonBody, vowosApi } from '@/lib/api/vowosApi';

interface VendorReturn {
  id: string;
  return_number: string;
  location_id: string | null;
  vendor_name: string;
  gown_id: string | null;
  invoice_id: string | null;
  item_description: string;
  quantity: number;
  value_cents: number;
  reason: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SHIPPED' | 'CREDIT_RECEIVED' | 'CANCELLED';
  carrier: string | null;
  tracking_number: string | null;
  notes: string | null;
  shipped_at: string | null;
  credit_received_at: string | null;
  created_at: string;
}

interface LocationRow { id: string; name: string; is_active: boolean }
interface GownRow { id: string; name: string | null; designer: string | null; style: string | null; sku: string | null; price_cents: number | null; location_id: string | null }
interface InvoiceRow { id: string; customer_id: string | null; description: string | null; amount_cents: number; paid_cents: number; status: string; location_id: string | null }
interface ReturnsResponse { returns: VendorReturn[]; locations: LocationRow[]; gowns: GownRow[]; invoices: InvoiceRow[] }

const inputCls = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500';

const REASONS = [
  ['DEFECTIVE_MERCHANDISE', 'Defective merchandise'],
  ['STOCK_BALANCING', 'Stock balancing'],
  ['SAMPLE_RETURN', 'Sample return'],
  ['CUSTOMER_CANCELLATION', 'Customer cancellation'],
  ['SIZE_DISCREPANCY', 'Size discrepancy'],
  ['OTHER', 'Other'],
] as const;

const NEXT: Record<VendorReturn['status'], Array<{ status: VendorReturn['status']; label: string }>> = {
  DRAFT: [{ status: 'PENDING_APPROVAL', label: 'Submit for approval' }, { status: 'CANCELLED', label: 'Cancel' }],
  PENDING_APPROVAL: [{ status: 'APPROVED', label: 'Approve' }, { status: 'CANCELLED', label: 'Reject / cancel' }],
  APPROVED: [{ status: 'SHIPPED', label: 'Mark shipped' }, { status: 'CANCELLED', label: 'Cancel' }],
  SHIPPED: [{ status: 'CREDIT_RECEIVED', label: 'Credit received' }],
  CREDIT_RECEIVED: [],
  CANCELLED: [],
};

function money(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function when(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}
function statusClass(status: VendorReturn['status']) {
  if (status === 'CREDIT_RECEIVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'SHIPPED') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'APPROVED') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (status === 'PENDING_APPROVAL') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'CANCELLED') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-stone-100 text-stone-600 border-stone-200';
}

export default function VendorReturnsView() {
  const [rows, setRows] = useState<VendorReturn[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [gowns, setGowns] = useState<GownRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState<VendorReturn | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vowosApi<ReturnsResponse>('/api/organization/sales/returns');
      setRows(data.returns || []);
      setLocations(data.locations || []);
      setGowns(data.gowns || []);
      setInvoices(data.invoices || []);
      setSelected((current) => current ? (data.returns || []).find((row) => row.id === current.id) || null : null);
    } catch (error) {
      toast({ title: 'Could not load vendor returns', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (status !== 'ALL' && row.status !== status) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [row.return_number, row.vendor_name, row.item_description, row.reason, row.tracking_number, row.notes]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  }), [rows, query, status]);

  const stats = useMemo(() => ({
    open: rows.filter((row) => !['CREDIT_RECEIVED', 'CANCELLED'].includes(row.status)).length,
    shipped: rows.filter((row) => row.status === 'SHIPPED').length,
    credits: rows.filter((row) => row.status === 'CREDIT_RECEIVED').reduce((sum, row) => sum + row.value_cents, 0),
  }), [rows]);

  const move = async (row: VendorReturn, nextStatus: VendorReturn['status'], carrier?: string, tracking?: string) => {
    try {
      const result = await vowosApi<{ return: VendorReturn }>(`/api/organization/sales/returns/${row.id}`, {
        method: 'PATCH',
        body: jsonBody({ status: nextStatus, carrier, tracking_number: tracking }),
      });
      setRows((current) => current.map((item) => item.id === row.id ? result.return : item));
      setSelected(result.return);
      toast({ title: `${row.return_number} updated`, description: nextStatus.replaceAll('_', ' ') });
    } catch (error) {
      toast({ title: 'Could not update vendor return', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-xl font-serif font-semibold text-stone-900">Return to Vendor</h2><p className="mt-1 text-sm text-stone-500">Real return authorizations, approval, shipping, tracking, and vendor credit receipt.</p></div>
        <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800"><Plus className="h-4 w-4" /> Create RTV</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Open returns</p><p className="mt-2 text-2xl font-semibold">{stats.open}</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">In transit</p><p className="mt-2 text-2xl font-semibold">{stats.shipped}</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Credits received</p><p className="mt-2 text-2xl font-semibold">{money(stats.credits)}</p></div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input className={`${inputCls} pl-9`} placeholder="Search return number, vendor, item, tracking…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <select className={`${inputCls} sm:w-56`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All statuses</option>{Object.keys(NEXT).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select>
        <button onClick={() => void load()} className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-stone-500 hover:bg-stone-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-stone-100 text-sm"><thead className="bg-stone-50/70"><tr>{['RTV', 'Vendor / item', 'Qty', 'Value', 'Status', 'Created', ''].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">{h}</th>)}</tr></thead><tbody className="divide-y divide-stone-100">
          {!loading && filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-stone-400"><PackageX className="mx-auto mb-2 h-7 w-7" />No vendor returns found.</td></tr>}
          {filtered.map((row) => <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer hover:bg-stone-50"><td className="px-4 py-3 font-semibold text-stone-900">{row.return_number}</td><td className="px-4 py-3"><div className="font-medium text-stone-800">{row.vendor_name}</div><div className="max-w-[300px] truncate text-xs text-stone-400">{row.item_description}</div></td><td className="px-4 py-3 text-stone-600">{row.quantity}</td><td className="px-4 py-3 font-medium">{money(row.value_cents)}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass(row.status)}`}>{row.status.replaceAll('_', ' ')}</span></td><td className="px-4 py-3 text-stone-500">{when(row.created_at)}</td><td className="px-4 py-3 text-right"><ChevronRight className="ml-auto h-4 w-4 text-stone-300" /></td></tr>)}
        </tbody></table></div>
      </div>

      {createOpen && <CreateReturnModal locations={locations} gowns={gowns} invoices={invoices} onClose={() => setCreateOpen(false)} onCreated={(row) => { setRows((current) => [row, ...current]); setCreateOpen(false); setSelected(row); }} />}
      {selected && <ReturnDetail row={selected} location={locations.find((location) => location.id === selected.location_id)} onClose={() => setSelected(null)} onMove={move} />}
    </div>
  );
}

function CreateReturnModal({ locations, gowns, invoices, onClose, onCreated }: { locations: LocationRow[]; gowns: GownRow[]; invoices: InvoiceRow[]; onClose: () => void; onCreated: (row: VendorReturn) => void }) {
  const [saving, setSaving] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [vendor, setVendor] = useState('');
  const [item, setItem] = useState('');
  const [gownId, setGownId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('DEFECTIVE_MERCHANDISE');
  const [notes, setNotes] = useState('');

  const selectGown = (id: string) => {
    setGownId(id);
    const gown = gowns.find((row) => row.id === id);
    if (!gown) return;
    if (!vendor) setVendor(gown.designer || '');
    if (!item) setItem([gown.name, gown.style].filter(Boolean).join(' · '));
    if (!value && gown.price_cents) setValue((gown.price_cents / 100).toFixed(2));
    if (!locationId && gown.location_id) setLocationId(gown.location_id);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await vowosApi<{ return: VendorReturn }>('/api/organization/sales/returns', { method: 'POST', body: jsonBody({ location_id: locationId || null, vendor_name: vendor, gown_id: gownId || null, invoice_id: invoiceId || null, item_description: item, quantity: Number(quantity), value_cents: Math.round(Number(value || 0) * 100), reason, notes }) });
      toast({ title: `${result.return.return_number} created`, description: 'Draft return is ready for approval.' });
      onCreated(result.return);
    } catch (error) {
      toast({ title: 'Could not create vendor return', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-semibold">Create vendor return</h3><p className="text-xs text-stone-500">Creates a real organization-scoped RTV record.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X className="h-4 w-4" /></button></div><div className="grid gap-4 sm:grid-cols-2">
    <div><label className={labelCls}>Location</label><select className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}><option value="">Organization-wide / unassigned</option>{locations.filter((x) => x.is_active !== false).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
    <div><label className={labelCls}>Gown / inventory link</label><select className={inputCls} value={gownId} onChange={(e) => selectGown(e.target.value)}><option value="">No linked gown</option>{gowns.map((gown) => <option key={gown.id} value={gown.id}>{[gown.designer, gown.name || gown.style, gown.sku].filter(Boolean).join(' · ')}</option>)}</select></div>
    <div><label className={labelCls}>Vendor / designer *</label><input required className={inputCls} value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
    <div><label className={labelCls}>Invoice link</label><select className={inputCls} value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}><option value="">No linked invoice</option>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.description || invoice.id} · {money(invoice.amount_cents)}</option>)}</select></div>
    <div className="sm:col-span-2"><label className={labelCls}>Item description *</label><input required className={inputCls} value={item} onChange={(e) => setItem(e.target.value)} /></div>
    <div><label className={labelCls}>Quantity *</label><input required min="1" max="1000" type="number" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
    <div><label className={labelCls}>Return value</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">$</span><input min="0" step="0.01" type="number" className={`${inputCls} pl-7`} value={value} onChange={(e) => setValue(e.target.value)} /></div></div>
    <div className="sm:col-span-2"><label className={labelCls}>Reason *</label><select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="sm:col-span-2"><label className={labelCls}>Notes</label><textarea rows={3} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
  </div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create RTV'}</button></div></form></div>;
}

function ReturnDetail({ row, location, onClose, onMove }: { row: VendorReturn; location?: LocationRow; onClose: () => void; onMove: (row: VendorReturn, status: VendorReturn['status'], carrier?: string, tracking?: string) => Promise<void> }) {
  const [carrier, setCarrier] = useState(row.carrier || 'UPS');
  const [tracking, setTracking] = useState(row.tracking_number || '');
  const [working, setWorking] = useState(false);
  const doMove = async (nextStatus: VendorReturn['status']) => { setWorking(true); await onMove(row, nextStatus, carrier, tracking); setWorking(false); };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{row.return_number}</p><h3 className="mt-1 text-lg font-semibold">{row.vendor_name}</h3><p className="text-sm text-stone-500">{row.item_description}</p></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X className="h-4 w-4" /></button></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-stone-50 p-3"><span className="text-xs text-stone-400">Status</span><p className="font-semibold">{row.status.replaceAll('_', ' ')}</p></div><div className="rounded-xl bg-stone-50 p-3"><span className="text-xs text-stone-400">Value</span><p className="font-semibold">{money(row.value_cents)}</p></div><div className="rounded-xl bg-stone-50 p-3"><span className="text-xs text-stone-400">Location</span><p className="font-semibold">{location?.name || 'Unassigned'}</p></div><div className="rounded-xl bg-stone-50 p-3"><span className="text-xs text-stone-400">Reason</span><p className="font-semibold">{row.reason.replaceAll('_', ' ')}</p></div></div>{row.status === 'APPROVED' && <div className="mt-4 grid grid-cols-2 gap-3"><div><label className={labelCls}>Carrier *</label><input className={inputCls} value={carrier} onChange={(e) => setCarrier(e.target.value)} /></div><div><label className={labelCls}>Tracking number *</label><input className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} /></div></div>}{row.tracking_number && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800"><Truck className="mr-2 inline h-4 w-4" />{row.carrier} · {row.tracking_number}</div>}{row.notes && <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">{row.notes}</p>}<div className="mt-5 flex flex-wrap justify-end gap-2">{NEXT[row.status].map((next) => <button key={next.status} disabled={working || (next.status === 'SHIPPED' && (!carrier.trim() || !tracking.trim()))} onClick={() => void doMove(next.status)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${next.status === 'CANCELLED' ? 'border border-red-200 text-red-700' : 'bg-stone-900 text-white'}`}>{next.status === 'SHIPPED' ? <Truck className="h-4 w-4" /> : next.status === 'CREDIT_RECEIVED' ? <CheckCircle2 className="h-4 w-4" /> : next.status === 'CANCELLED' ? <XCircle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{next.label}</button>)}</div></div></div>;
}
