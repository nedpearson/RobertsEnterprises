import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  FileCheck2,
  Link2,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { toast } from '@vowos/design-system';
import {
  CommissionAssignment,
  CommissionBatch,
  CommissionBatchDetail,
  CommissionEarning,
  CommissionPlan,
  CommissionsDashboardPayload,
  UnattributedPayment,
  commissionsApi,
} from '@/lib/api/commissionsApi';

type Tab = 'ledger' | 'plans' | 'attribution' | 'batches';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const percent = (bps: number) => `${(bps / 100).toFixed(2)}%`;
const humanize = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (char) => char.toUpperCase());
const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50';

function StatusPill({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const className = ['PAID', 'APPROVED', 'EXPORTED'].includes(normalized)
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : ['DRAFT', 'OPEN', 'BATCHED'].includes(normalized)
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : normalized === 'VOIDED'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-stone-200 bg-stone-50 text-stone-600';
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}>{humanize(value)}</span>;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white px-5 py-4">
          <h2 className="font-serif text-xl font-semibold text-stone-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</span>{children}</label>;
}

export default function CommissionsView() {
  const [tab, setTab] = useState<Tab>('ledger');
  const [data, setData] = useState<CommissionsDashboardPayload | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<CommissionBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planModal, setPlanModal] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [batchModal, setBatchModal] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', rate: '4.00', notes: '' });
  const [assignmentForm, setAssignmentForm] = useState({ employee_id: '', plan_id: '', location_id: '', effective_from: today() });
  const [batchForm, setBatchForm] = useState({ name: '', start_date: monthStart(), end_date: today() });
  const [attributionSelection, setAttributionSelection] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await commissionsApi.dashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const staffById = useMemo(() => new Map((data?.staff ?? []).map((row) => [row.id, row])), [data?.staff]);
  const planById = useMemo(() => new Map((data?.plans ?? []).map((row) => [row.id, row])), [data?.plans]);
  const locationById = useMemo(() => new Map((data?.locations ?? []).map((row) => [row.id, row])), [data?.locations]);
  const openEarnings = useMemo(() => (data?.earnings ?? []).filter((row) => row.settlement_status === 'OPEN'), [data?.earnings]);
  const openCommission = useMemo(() => openEarnings.reduce((sum, row) => sum + row.commission_cents, 0), [openEarnings]);
  const paidCommission = useMemo(() => (data?.earnings ?? []).filter((row) => row.settlement_status === 'PAID').reduce((sum, row) => sum + row.commission_cents, 0), [data?.earnings]);
  const reversalTotal = useMemo(() => (data?.earnings ?? []).filter((row) => row.event_type === 'REFUND_REVERSAL').reduce((sum, row) => sum + Math.abs(row.commission_cents), 0), [data?.earnings]);
  const employeeBalances = useMemo(() => {
    const totals = new Map<string, { basis: number; commission: number; events: number }>();
    for (const earning of openEarnings) {
      const current = totals.get(earning.employee_id) ?? { basis: 0, commission: 0, events: 0 };
      current.basis += earning.basis_cents;
      current.commission += earning.commission_cents;
      current.events += 1;
      totals.set(earning.employee_id, current);
    }
    return [...totals.entries()].sort((a, b) => b[1].commission - a[1].commission);
  }, [openEarnings]);

  const createPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await commissionsApi.createPlan({ name: planForm.name, rate_bps: Math.round(Number(planForm.rate) * 100), notes: planForm.notes });
      toast({ title: 'Commission plan created', description: 'The rate is immutable for auditability; create a new plan when the rate changes.' });
      setPlanModal(false);
      setPlanForm({ name: '', rate: '4.00', notes: '' });
      await load();
    } catch (err) {
      toast({ title: 'Plan not created', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const assignPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await commissionsApi.assignPlan({
        employee_id: assignmentForm.employee_id,
        plan_id: assignmentForm.plan_id,
        location_id: assignmentForm.location_id || null,
        effective_from: assignmentForm.effective_from,
      });
      toast({ title: 'Commission plan assigned', description: `${response.reconciledPayments} already-attributed completed payment${response.reconciledPayments === 1 ? '' : 's'} reconciled.` });
      setAssignmentModal(false);
      await load();
    } catch (err) {
      toast({ title: 'Assignment not saved', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const attributePayment = async (payment: UnattributedPayment) => {
    const employeeId = attributionSelection[payment.id];
    if (!employeeId) return;
    setBusy(true);
    try {
      const result = await commissionsApi.attributePayment(payment.id, employeeId, true);
      toast({
        title: 'Payment attributed',
        description: result.earning
          ? `Commission earning created for ${staffById.get(employeeId)?.name ?? 'staff member'}.`
          : 'Attribution saved. No earning was created because no effective commission plan matched the payment date/location.',
      });
      await load();
    } catch (err) {
      toast({ title: 'Attribution failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const reconcile = async () => {
    setBusy(true);
    try {
      const result = await commissionsApi.reconcile();
      toast({ title: 'Commission ledger reconciled', description: `${result.reconciled} attributed completed payment${result.reconciled === 1 ? '' : 's'} checked idempotently.` });
      await load();
    } catch (err) {
      toast({ title: 'Reconciliation failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const createBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await commissionsApi.createBatch(batchForm);
      toast({ title: 'Commission batch created', description: 'Only employees with a positive net open balance were locked into the draft.' });
      setSelectedBatch({ batch: response.batch, earnings: response.earnings, payrollAdjustments: [] });
      setBatchModal(false);
      setTab('batches');
      await load();
    } catch (err) {
      toast({ title: 'Batch not created', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const openBatch = async (batch: CommissionBatch) => {
    setBusy(true);
    try {
      setSelectedBatch(await commissionsApi.batch(batch.id));
      setTab('batches');
    } catch (err) {
      toast({ title: 'Batch could not load', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const approveBatch = async () => {
    if (!selectedBatch) return;
    setBusy(true);
    try {
      await commissionsApi.approveBatch(selectedBatch.batch.id);
      setSelectedBatch(await commissionsApi.batch(selectedBatch.batch.id));
      await load();
      toast({ title: 'Commission batch approved', description: 'The batch is now eligible for Payroll export.' });
    } catch (err) {
      toast({ title: 'Approval failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const exportPayroll = async () => {
    if (!selectedBatch) return;
    setBusy(true);
    try {
      await commissionsApi.exportBatchToPayroll(selectedBatch.batch.id);
      setSelectedBatch(await commissionsApi.batch(selectedBatch.batch.id));
      await load();
      toast({ title: 'Commission batch sent to Payroll', description: 'One approved TAXABLE commission adjustment was generated per payable employee. Payroll remains responsible for provider-final tax withholding.' });
    } catch (err) {
      toast({ title: 'Payroll export failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const voidBatch = async () => {
    if (!selectedBatch) return;
    const reason = window.prompt('Why are you voiding this commission batch?');
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await commissionsApi.voidBatch(selectedBatch.batch.id, reason.trim());
      setSelectedBatch(null);
      await load();
      toast({ title: 'Commission batch voided', description: 'Its earning events were returned to the open ledger.' });
    } catch (err) {
      toast({ title: 'Batch cannot be voided', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (loading && !data) return <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-stone-400" /></div>;
  if (error && !data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800"><div className="flex gap-3"><AlertTriangle className="h-5 w-5" /><div><p className="font-semibold">Commission operations could not load</p><p className="mt-1 text-sm">{error}</p><button className={`${secondaryButton} mt-4`} onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Retry</button></div></div></div>;
  if (!data) return null;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400"><ShieldCheck className="h-4 w-4" /> Collected-revenue ledger</div>
          <h2 className="mt-1 font-serif text-3xl font-semibold text-stone-900">Commissions</h2>
          <p className="mt-1 max-w-3xl text-sm text-stone-500">Earnings come only from explicitly attributed completed payments. Completed refunds generate automatic negative reversal events. No customer-name inference or synthetic stylist rates.</p>
        </div>
        <div className="flex flex-wrap gap-2"><button className={secondaryButton} disabled={busy} onClick={() => void reconcile()}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Reconcile</button><button className={primaryButton} onClick={() => setBatchModal(true)}><FileCheck2 className="h-4 w-4" /> Create payout batch</button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><DollarSign className="h-5 w-5 text-stone-400" /><p className="mt-3 text-2xl font-semibold text-stone-900">{money(openCommission)}</p><p className="text-xs text-stone-500">Net open commission balance</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><p className="mt-3 text-2xl font-semibold text-stone-900">{money(paidCommission)}</p><p className="text-xs text-stone-500">Paid through Payroll</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><TrendingDown className="h-5 w-5 text-rose-400" /><p className="mt-3 text-2xl font-semibold text-stone-900">{money(reversalTotal)}</p><p className="text-xs text-stone-500">Refund commission reversals</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><Link2 className="h-5 w-5 text-amber-500" /><p className="mt-3 text-2xl font-semibold text-stone-900">{data.unattributedPayments.length}</p><p className="text-xs text-stone-500">Completed payments needing attribution</p></div>
      </div>

      {data.unattributedPayments.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" /><div><p className="font-semibold text-amber-900">Revenue is waiting for a verified staff attribution</p><p className="mt-1 text-xs text-amber-800">These payments are intentionally excluded from commission earnings until a manager assigns the responsible staff member.</p><button onClick={() => setTab('attribution')} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline">Review attribution <ArrowRight className="h-3 w-3" /></button></div></div></div>}

      <div className="overflow-x-auto border-b border-stone-200"><div className="flex min-w-max gap-1">{([['ledger','Earning ledger'],['plans','Plans & assignments'],['attribution','Revenue attribution'],['batches','Payout batches']] as Array<[Tab,string]>).map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === key ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'}`}>{label}{key === 'attribution' && data.unattributedPayments.length > 0 && <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">{data.unattributedPayments.length}</span>}</button>)}</div></div>

      {tab === 'ledger' && <div className="space-y-5">
        {employeeBalances.length > 0 && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{employeeBalances.map(([employeeId,total]) => <div key={employeeId} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-stone-900">{staffById.get(employeeId)?.name ?? employeeId}</p><p className="mt-1 text-xs text-stone-500">{total.events} open ledger event{total.events === 1 ? '' : 's'} · net basis {money(total.basis)}</p></div><p className={`text-lg font-semibold ${total.commission < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{money(total.commission)}</p></div></div>)}</div>}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm"><div className="border-b border-stone-100 p-4"><h3 className="font-serif text-lg font-semibold text-stone-900">Immutable earning events</h3><p className="text-xs text-stone-500">Each completed payment earns once; each completed refund reverses once.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Revenue basis</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">Settlement</th></tr></thead><tbody className="divide-y divide-stone-100">{data.earnings.map((row: CommissionEarning) => <tr key={row.id}><td className="px-4 py-3 text-stone-600">{row.event_date}</td><td className="px-4 py-3 font-medium text-stone-900">{staffById.get(row.employee_id)?.name ?? row.employee_id}</td><td className="px-4 py-3"><StatusPill value={row.event_type} /></td><td className={`px-4 py-3 ${row.basis_cents < 0 ? 'text-rose-600' : 'text-stone-700'}`}>{money(row.basis_cents)}</td><td className="px-4 py-3 text-stone-600">{percent(row.rate_bps)}</td><td className={`px-4 py-3 font-semibold ${row.commission_cents < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{money(row.commission_cents)}</td><td className="px-4 py-3"><StatusPill value={row.settlement_status} /></td></tr>)}</tbody></table></div>{data.earnings.length === 0 && <p className="p-8 text-center text-sm text-stone-500">No commission events yet. Configure a plan, assign staff, and attribute completed payments.</p>}</div>
      </div>}

      {tab === 'plans' && <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-xl font-semibold text-stone-900">Commission plans</h3><p className="text-xs text-stone-500">Rates are immutable snapshots. Create a new plan when compensation terms change.</p></div><div className="flex gap-2"><button className={secondaryButton} onClick={() => setAssignmentModal(true)} disabled={data.plans.filter((p) => p.is_active).length === 0}><Users className="h-4 w-4" /> Assign plan</button><button className={primaryButton} onClick={() => setPlanModal(true)}><Plus className="h-4 w-4" /> New plan</button></div></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.plans.map((plan: CommissionPlan) => <div key={plan.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="font-semibold text-stone-900">{plan.name}</p><p className="mt-1 text-xs text-stone-500">Collected revenue net of refunds</p></div><StatusPill value={plan.is_active ? 'ACTIVE' : 'INACTIVE'} /></div><p className="mt-4 text-3xl font-semibold text-stone-900">{percent(plan.rate_bps)}</p>{plan.notes && <p className="mt-3 text-xs leading-relaxed text-stone-500">{plan.notes}</p>}</div>)}{data.plans.length === 0 && <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No commission plans configured.</div>}</div>
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm"><div className="border-b border-stone-100 p-4"><h3 className="font-serif text-lg font-semibold text-stone-900">Effective staff assignments</h3></div><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Effective</th><th className="px-4 py-3">State</th></tr></thead><tbody className="divide-y divide-stone-100">{data.assignments.map((row: CommissionAssignment) => <tr key={row.id}><td className="px-4 py-3 font-medium text-stone-900">{staffById.get(row.employee_id)?.name ?? row.employee_id}</td><td className="px-4 py-3 text-stone-700">{planById.get(row.plan_id)?.name ?? row.plan_id} <span className="text-stone-400">({percent(planById.get(row.plan_id)?.rate_bps ?? 0)})</span></td><td className="px-4 py-3 text-stone-600">{row.location_id ? locationById.get(row.location_id)?.name ?? row.location_id : 'All locations'}</td><td className="px-4 py-3 text-stone-600">{row.effective_from}{row.effective_to ? ` → ${row.effective_to}` : ''}</td><td className="px-4 py-3"><StatusPill value={row.is_active && !row.effective_to ? 'ACTIVE' : 'HISTORICAL'} /></td></tr>)}</tbody></table></div>{data.assignments.length === 0 && <p className="p-8 text-center text-sm text-stone-500">No staff commission assignments.</p>}</div>
      </div>}

      {tab === 'attribution' && <div className="space-y-4"><div><h3 className="font-serif text-xl font-semibold text-stone-900">Unattributed completed payments</h3><p className="text-xs text-stone-500">Assign the staff member responsible for the sale. If linked to an invoice, the attribution also becomes the default for future payments on that invoice.</p></div>{data.unattributedPayments.map((payment: UnattributedPayment) => <div key={payment.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><div className="rounded-xl bg-stone-100 p-2 text-stone-500"><ReceiptText className="h-5 w-5" /></div><div><p className="font-semibold text-stone-900">{payment.invoice?.customer || payment.invoice?.description || `Payment ${payment.id.slice(0,8)}`}</p><p className="mt-1 text-xs text-stone-500">{payment.processed_at ? new Date(payment.processed_at).toLocaleString() : payment.created_at} · {humanize(payment.payment_method)} · {payment.invoice?.description || 'No invoice description'}</p><p className="mt-1 text-lg font-semibold text-stone-900">{money(payment.amount_cents)}</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><select className={`${inputClass} min-w-56`} value={attributionSelection[payment.id] ?? ''} onChange={(e) => setAttributionSelection((current) => ({ ...current, [payment.id]: e.target.value }))}><option value="">Select responsible staff</option>{data.staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name} · {staff.role}</option>)}</select><button className={primaryButton} disabled={busy || !attributionSelection[payment.id]} onClick={() => void attributePayment(payment)}><Link2 className="h-4 w-4" /> Attribute</button></div></div>)}{data.unattributedPayments.length === 0 && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 font-semibold text-emerald-900">All recent completed payments are attributed</p><p className="mt-1 text-xs text-emerald-700">Future invoice-created payments inherit the invoice's explicit sales staff attribution automatically.</p></div>}</div>}

      {tab === 'batches' && <div className="grid gap-5 xl:grid-cols-5"><div className="space-y-2 xl:col-span-2"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-serif text-xl font-semibold text-stone-900">Commission payout register</h3><p className="text-xs text-stone-500">Draft → approved → payroll exported → paid.</p></div><button className={primaryButton} onClick={() => setBatchModal(true)}><Plus className="h-4 w-4" /></button></div>{data.batches.map((batch) => <button key={batch.id} onClick={() => void openBatch(batch)} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:bg-stone-50 ${selectedBatch?.batch.id === batch.id ? 'border-stone-500 bg-stone-50' : 'border-stone-200 bg-white'}`}><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-stone-900">{batch.name}</p><p className="mt-1 text-xs text-stone-500">{batch.start_date} → {batch.end_date} · {batch.employee_count} employee{batch.employee_count === 1 ? '' : 's'}</p><p className="mt-1 text-sm font-semibold text-emerald-700">{money(batch.total_commission_cents)}</p></div><StatusPill value={batch.status} /></div></button>)}{data.batches.length === 0 && <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No commission batches.</p>}</div><div className="xl:col-span-3">{!selectedBatch ? <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center"><FileCheck2 className="mx-auto h-8 w-8 text-stone-300" /><p className="mt-3 text-sm font-semibold text-stone-700">Select a commission batch</p></div> : <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-xl font-semibold text-stone-900">{selectedBatch.batch.name}</h3><StatusPill value={selectedBatch.batch.status} /></div><p className="mt-1 text-xs text-stone-500">Net eligible revenue {money(selectedBatch.batch.total_basis_cents)} · commission {money(selectedBatch.batch.total_commission_cents)}</p></div><div className="flex flex-wrap gap-2">{['DRAFT','APPROVED'].includes(selectedBatch.batch.status) && <button className={secondaryButton} disabled={busy} onClick={() => void voidBatch()}>Void</button>}{selectedBatch.batch.status === 'DRAFT' && <button className={primaryButton} disabled={busy} onClick={() => void approveBatch()}><ShieldCheck className="h-4 w-4" /> Approve</button>}{selectedBatch.batch.status === 'APPROVED' && <button className={primaryButton} disabled={busy} onClick={() => void exportPayroll()}><ArrowRight className="h-4 w-4" /> Send to Payroll</button>}</div></div>{selectedBatch.batch.status === 'EXPORTED' && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">This batch has generated approved taxable Payroll adjustments. It becomes PAID only when those adjustments are applied by a posted payroll period.</div>}<div className="overflow-x-auto rounded-xl border border-stone-100"><table className="min-w-full text-left text-xs"><thead className="bg-stone-50 text-stone-500"><tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Event</th><th className="px-3 py-2">Basis</th><th className="px-3 py-2">Rate</th><th className="px-3 py-2">Commission</th></tr></thead><tbody className="divide-y divide-stone-100">{selectedBatch.earnings.map((row) => <tr key={row.id}><td className="px-3 py-2.5 font-medium text-stone-900">{staffById.get(row.employee_id)?.name ?? row.employee_id}</td><td className="px-3 py-2.5"><StatusPill value={row.event_type} /></td><td className="px-3 py-2.5 text-stone-600">{money(row.basis_cents)}</td><td className="px-3 py-2.5 text-stone-600">{percent(row.rate_bps)}</td><td className={`px-3 py-2.5 font-semibold ${row.commission_cents < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{money(row.commission_cents)}</td></tr>)}</tbody></table></div>{selectedBatch.payrollAdjustments.length > 0 && <div><h4 className="text-xs font-bold uppercase tracking-wide text-stone-400">Payroll adjustments</h4><div className="mt-2 space-y-2">{selectedBatch.payrollAdjustments.map((row) => <div key={row.id} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-xs"><span className="font-medium text-stone-800">{staffById.get(row.employee_id)?.name ?? row.employee_id} · {money(row.amount_cents)}</span><StatusPill value={row.status} /></div>)}</div></div>}</div>}</div></div>}

      {planModal && <ModalShell title="Create commission plan" onClose={() => setPlanModal(false)}><form onSubmit={createPlan} className="space-y-4"><Field label="Plan name"><input className={inputClass} required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Bridal Consultant 4%" /></Field><Field label="Commission rate %"><input className={inputClass} type="number" min="0" max="100" step="0.01" required value={planForm.rate} onChange={(e) => setPlanForm({ ...planForm, rate: e.target.value })} /></Field><Field label="Notes"><textarea className={`${inputClass} min-h-20`} value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="Eligibility or compensation policy notes" /></Field><div className="rounded-xl bg-stone-50 p-3 text-xs text-stone-600"><div className="flex gap-2"><Settings2 className="h-4 w-4 shrink-0" /><span>Current commission basis is completed collected revenue, net of completed refunds. Rates cannot be edited in place after plan creation.</span></div></div><div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setPlanModal(false)}>Cancel</button><button className={primaryButton} disabled={busy} type="submit">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create plan</button></div></form></ModalShell>}

      {assignmentModal && <ModalShell title="Assign commission plan" onClose={() => setAssignmentModal(false)}><form onSubmit={assignPlan} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Employee"><select className={inputClass} required value={assignmentForm.employee_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, employee_id: e.target.value })}><option value="">Select employee</option>{data.staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></Field><Field label="Plan"><select className={inputClass} required value={assignmentForm.plan_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, plan_id: e.target.value })}><option value="">Select active plan</option>{data.plans.filter((plan) => plan.is_active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {percent(plan.rate_bps)}</option>)}</select></Field><Field label="Location override"><select className={inputClass} value={assignmentForm.location_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, location_id: e.target.value })}><option value="">All locations</option>{data.locations.filter((location) => location.is_active).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field><Field label="Effective from"><input className={inputClass} type="date" required value={assignmentForm.effective_from} onChange={(e) => setAssignmentForm({ ...assignmentForm, effective_from: e.target.value })} /></Field></div><div className="rounded-xl bg-stone-50 p-3 text-xs text-stone-600">Saving a new assignment closes the currently active assignment for the same employee/location on the preceding date and reconciles already-attributed completed payments from the new effective date.</div><div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setAssignmentModal(false)}>Cancel</button><button className={primaryButton} disabled={busy} type="submit">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save assignment</button></div></form></ModalShell>}

      {batchModal && <ModalShell title="Create commission payout batch" onClose={() => setBatchModal(false)}><form onSubmit={createBatch} className="space-y-4"><Field label="Batch name (optional)"><input className={inputClass} value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} placeholder="August commissions" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Start date"><input className={inputClass} type="date" required value={batchForm.start_date} onChange={(e) => setBatchForm({ ...batchForm, start_date: e.target.value })} /></Field><Field label="End date"><input className={inputClass} type="date" required value={batchForm.end_date} onChange={(e) => setBatchForm({ ...batchForm, end_date: e.target.value })} /></Field></div><div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600"><div className="flex gap-2"><TrendingUp className="h-4 w-4 shrink-0" /><span>The batch locks all open earning and refund-reversal events in the date range for employees whose net commission balance is positive. Negative carry-forward balances remain open.</span></div></div><div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setBatchModal(false)}>Cancel</button><button className={primaryButton} disabled={busy} type="submit">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create draft batch</button></div></form></ModalShell>}
    </div>
  );
}
