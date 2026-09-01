import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, DollarSign, Plus, RefreshCw, RotateCcw, Search, X, XCircle } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { jsonBody, vowosApi } from '@/lib/api/vowosApi';

interface CustomerRef { id: string; name: string; email: string | null; phone: string | null }
interface InvoiceRef { id: string; description: string | null; amount_cents: number; paid_cents: number; status: string }
interface PaymentRow {
  id: string;
  customer_id: string | null;
  invoice_id: string | null;
  amount_cents: number;
  refundable_cents: number;
  payment_method: string;
  provider_transaction_id: string | null;
  status: string;
  processed_at: string;
  customer: CustomerRef | null;
  invoice: InvoiceRef | null;
}
interface RefundRow {
  id: string;
  payment_id: string;
  amount_cents: number;
  reason: string | null;
  status: string;
  provider: string | null;
  provider_refund_id: string | null;
  error_message: string | null;
  processed_at: string;
  created_at: string;
  payment: PaymentRow | null;
  customer: CustomerRef | null;
  invoice: InvoiceRef | null;
}
interface RefundResponse { refunds: RefundRow[]; payments: PaymentRow[] }

const inputCls = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500';

function money(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function when(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}
function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  const cls = normalized === 'completed'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : normalized === 'processing'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-red-200 bg-red-50 text-red-700';
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>{status}</span>;
}

export default function RefundsView() {
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vowosApi<RefundResponse>('/api/organization/sales/refunds');
      setRefunds(data.refunds || []);
      setPayments(data.payments || []);
    } catch (error) {
      toast({ title: 'Could not load refunds', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const refundablePayments = useMemo(() => payments.filter((payment) => payment.refundable_cents > 0 && !['failed', 'pending'].includes(String(payment.status).toLowerCase())), [payments]);
  const filtered = useMemo(() => refunds.filter((refund) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [refund.id, refund.customer?.name, refund.invoice?.description, refund.reason, refund.provider, refund.provider_refund_id, refund.status]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  }), [refunds, query]);

  const stats = useMemo(() => ({
    completed: refunds.filter((refund) => refund.status.toLowerCase() === 'completed').reduce((sum, refund) => sum + refund.amount_cents, 0),
    processing: refunds.filter((refund) => refund.status.toLowerCase() === 'processing').length,
    failed: refunds.filter((refund) => refund.status.toLowerCase() === 'failed').length,
  }), [refunds]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-xl font-serif font-semibold text-stone-900">Refund Processing</h2><p className="mt-1 max-w-3xl text-sm text-stone-500">Refunds are created against actual payments. Card refunds are sent to Stripe and only then reconciled into the VowOS payment and invoice ledgers.</p></div>
        <button onClick={() => setCreateOpen(true)} disabled={!refundablePayments.length} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" /> New refund</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Completed refunds</p><DollarSign className="h-4 w-4 text-stone-300" /></div><p className="mt-2 text-2xl font-semibold">{money(stats.completed)}</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Processing</p><RotateCcw className="h-4 w-4 text-stone-300" /></div><p className="mt-2 text-2xl font-semibold">{stats.processing}</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Failed</p><AlertCircle className="h-4 w-4 text-stone-300" /></div><p className="mt-2 text-2xl font-semibold">{stats.failed}</p></div>
      </div>

      <div className="flex gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input className={`${inputCls} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, invoice, provider refund, reason…" /></div><button onClick={() => void load()} className="rounded-xl border border-stone-200 bg-white px-3 text-stone-500 hover:bg-stone-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-stone-100 text-sm"><thead className="bg-stone-50/70"><tr>{['Customer / invoice', 'Original payment', 'Refund', 'Provider', 'Status', 'Processed'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">{heading}</th>)}</tr></thead><tbody className="divide-y divide-stone-100">
        {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-stone-400"><RotateCcw className="mx-auto mb-2 h-7 w-7" />No refunds found.</td></tr>}
        {filtered.map((refund) => <tr key={refund.id} className="hover:bg-stone-50"><td className="px-4 py-3"><p className="font-semibold text-stone-900">{refund.customer?.name || 'Unassigned customer'}</p><p className="max-w-[260px] truncate text-xs text-stone-400">{refund.invoice?.description || refund.invoice?.id || 'No linked invoice'}</p>{refund.reason && <p className="mt-1 max-w-[260px] truncate text-[11px] text-stone-500" title={refund.reason}>{refund.reason}</p>}{refund.error_message && <p className="mt-1 max-w-[300px] text-[11px] text-red-600">{refund.error_message}</p>}</td><td className="px-4 py-3"><p className="font-medium">{money(refund.payment?.amount_cents || 0)}</p><p className="text-xs text-stone-400">{refund.payment?.payment_method || '—'}</p></td><td className="px-4 py-3 font-semibold">{money(refund.amount_cents)}</td><td className="px-4 py-3"><p className="capitalize text-stone-600">{refund.provider || '—'}</p><p className="max-w-[170px] truncate text-[11px] text-stone-400" title={refund.provider_refund_id || ''}>{refund.provider_refund_id || ''}</p></td><td className="px-4 py-3">{statusBadge(refund.status)}</td><td className="px-4 py-3 text-stone-500">{when(refund.processed_at || refund.created_at)}</td></tr>)}
      </tbody></table></div></div>

      {!refundablePayments.length && !loading && <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">There are currently no payments with refundable balance.</div>}
      {createOpen && <CreateRefundModal payments={refundablePayments} onClose={() => setCreateOpen(false)} onCompleted={async () => { setCreateOpen(false); await load(); }} />}
    </div>
  );
}

function CreateRefundModal({ payments, onClose, onCompleted }: { payments: PaymentRow[]; onClose: () => void; onCompleted: () => Promise<void> }) {
  const [paymentId, setPaymentId] = useState(payments[0]?.id || '');
  const [amount, setAmount] = useState(payments[0] ? (payments[0].refundable_cents / 100).toFixed(2) : '');
  const [reason, setReason] = useState('Customer requested refund');
  const [saving, setSaving] = useState(false);
  const payment = payments.find((row) => row.id === paymentId) || null;

  const choosePayment = (id: string) => {
    setPaymentId(id);
    const next = payments.find((row) => row.id === id);
    if (next) setAmount((next.refundable_cents / 100).toFixed(2));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payment) return;
    const cents = Math.round(Number(amount || 0) * 100);
    if (cents <= 0 || cents > payment.refundable_cents) {
      toast({ title: 'Invalid refund amount', description: `Maximum refundable balance is ${money(payment.refundable_cents)}.`, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await vowosApi('/api/organization/sales/refunds', { method: 'POST', body: jsonBody({ payment_id: payment.id, amount_cents: cents, reason }) });
      toast({ title: 'Refund completed', description: `${money(cents)} returned via ${payment.payment_method}.` });
      await onCompleted();
    } catch (error) {
      toast({ title: 'Refund failed', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><form onSubmit={submit} className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">Process refund</h3><p className="mt-1 text-xs text-stone-500">The original payment provider and refundable balance are verified server-side.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-4"><div><label className={labelCls}>Original payment *</label><select className={inputCls} value={paymentId} onChange={(e) => choosePayment(e.target.value)}>{payments.map((row) => <option key={row.id} value={row.id}>{row.customer?.name || 'Customer'} · {money(row.amount_cents)} · {row.payment_method} · refundable {money(row.refundable_cents)}</option>)}</select></div>{payment && <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-400">Refundable balance</p><p className="mt-1 font-semibold">{money(payment.refundable_cents)}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-400">Provider path</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><CreditCard className="h-4 w-4" />{String(payment.payment_method).toLowerCase().includes('card') ? 'Stripe / original card' : 'Manual ledger reversal'}</p></div></div>}<div><label className={labelCls}>Refund amount *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">$</span><input required min="0.01" step="0.01" max={payment ? (payment.refundable_cents / 100).toFixed(2) : undefined} type="number" className={`${inputCls} pl-7`} value={amount} onChange={(e) => setAmount(e.target.value)} /></div></div><div><label className={labelCls}>Reason *</label><textarea required rows={3} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving || !payment} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saving ? 'Processing…' : 'Process refund'}</button></div><div className="mt-4 flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Card refunds are not marked complete until the payment provider accepts them. Provider failures remain visible in refund history and do not consume refundable balance.</div></form></div>;
}
