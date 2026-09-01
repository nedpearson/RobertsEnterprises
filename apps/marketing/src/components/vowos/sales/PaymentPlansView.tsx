import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, CreditCard, Loader2, Plus, RefreshCw, Search, XCircle } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { jsonBody, vowosApi } from '@/lib/api/vowosApi';

interface CustomerSummary { id: string; name: string; email?: string | null; phone?: string | null }
interface InvoiceSummary { id: string; customer_id: string; description?: string | null; amount_cents: number; paid_cents: number; due_date?: string | null; status?: string | null; location_id?: string | null }
interface PaymentSchedule {
  id: string;
  plan_id: string;
  sequence_no: number;
  stage_name: string;
  amount_cents: number;
  paid_cents: number;
  due_date: string;
  status: string;
  payment_reference?: string | null;
  paid_at?: string | null;
}
interface PaymentPlan {
  id: string;
  customer_id: string;
  invoice_id: string;
  location_id?: string | null;
  plan_type: 'LAYAWAY' | 'PAYMENT_PLAN';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DEFAULTED';
  total_cents: number;
  down_payment_cents: number;
  installment_count: number;
  frequency: string;
  start_date: string;
  notes?: string | null;
  created_at: string;
  customer?: CustomerSummary | null;
  invoice?: InvoiceSummary | null;
  schedule: PaymentSchedule[];
}

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
const dollarsToCents = (value: string): number | null => {
  const parsed = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
};
const panel = 'rounded-2xl border border-stone-200 bg-white shadow-sm';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500';

export default function PaymentPlansView({ planType }: { planType: 'LAYAWAY' | 'PAYMENT_PLAN' }) {
  const { profile } = useAuth();
  const canManage = profile?.role === 'Owner' || profile?.role === 'Manager';
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [payingSchedule, setPayingSchedule] = useState<PaymentSchedule | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [paymentReference, setPaymentReference] = useState('');
  const [form, setForm] = useState({
    customer_id: '', invoice_id: '', total: '', down_payment: '0.00', down_payment_method: 'credit_card', installment_count: '4', frequency: 'MONTHLY', start_date: new Date().toISOString().slice(0, 10), notes: '',
  });

  const title = planType === 'LAYAWAY' ? 'Layaway' : 'Payment Plans';

  const load = async () => {
    setLoading(true);
    try {
      const response = await vowosApi<{ plans: PaymentPlan[]; customers: CustomerSummary[]; invoices: InvoiceSummary[] }>(`/api/organization/sales/payment-plans?type=${planType}`);
      setPlans(response.plans ?? []);
      setCustomers(response.customers ?? []);
      setInvoices(response.invoices ?? []);
      setSelectedPlanId((current) => current && response.plans.some((plan) => plan.id === current) ? current : response.plans?.[0]?.id ?? null);
    } catch (cause) {
      toast({ title: `Could not load ${title.toLowerCase()}`, description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [planType]);

  const customerInvoices = useMemo(() => invoices.filter((invoice) => invoice.customer_id === form.customer_id && invoice.amount_cents > invoice.paid_cents), [invoices, form.customer_id]);
  const selectedInvoice = customerInvoices.find((invoice) => invoice.id === form.invoice_id) ?? null;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const filteredPlans = plans.filter((plan) => [plan.customer?.name, plan.invoice?.description, plan.status, plan.frequency].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!selectedInvoice) return;
    const outstanding = Math.max(selectedInvoice.amount_cents - selectedInvoice.paid_cents, 0);
    setForm((current) => ({ ...current, total: (outstanding / 100).toFixed(2) }));
  }, [selectedInvoice?.id]);

  const createPlan = async () => {
    const totalCents = dollarsToCents(form.total);
    const downPaymentCents = dollarsToCents(form.down_payment);
    const installments = Number(form.installment_count);
    if (!form.customer_id || !form.invoice_id) return toast({ title: 'Select a customer and invoice', variant: 'destructive' });
    if (totalCents === null || totalCents <= 0 || downPaymentCents === null || downPaymentCents > totalCents) return toast({ title: 'Enter valid plan amounts', variant: 'destructive' });
    if (!Number.isInteger(installments) || installments < 1 || installments > 120) return toast({ title: 'Installments must be between 1 and 120', variant: 'destructive' });

    setSaving(true);
    try {
      await vowosApi('/api/organization/sales/payment-plans', {
        method: 'POST',
        body: jsonBody({
          customer_id: form.customer_id,
          invoice_id: form.invoice_id,
          location_id: selectedInvoice?.location_id ?? null,
          plan_type: planType,
          total_cents: totalCents,
          down_payment_cents: downPaymentCents,
          down_payment_method: form.down_payment_method,
          installment_count: installments,
          frequency: form.frequency,
          start_date: form.start_date,
          notes: form.notes,
        }),
      });
      toast({ title: `${title} created`, description: 'The installment schedule and invoice ledger were created atomically.' });
      setShowCreate(false);
      setForm({ customer_id: '', invoice_id: '', total: '', down_payment: '0.00', down_payment_method: 'credit_card', installment_count: '4', frequency: 'MONTHLY', start_date: new Date().toISOString().slice(0, 10), notes: '' });
      await load();
    } catch (cause) {
      toast({ title: `Could not create ${title.toLowerCase()}`, description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const recordPayment = async () => {
    if (!selectedPlan || !payingSchedule) return;
    const amountCents = dollarsToCents(paymentAmount);
    const remaining = payingSchedule.amount_cents - payingSchedule.paid_cents;
    if (amountCents === null || amountCents <= 0 || amountCents > remaining) return toast({ title: 'Enter a payment no greater than the installment balance', variant: 'destructive' });
    setSaving(true);
    try {
      await vowosApi(`/api/organization/sales/payment-plans/${selectedPlan.id}/installments/${payingSchedule.id}/pay`, {
        method: 'POST',
        body: jsonBody({ amount_cents: amountCents, payment_method: paymentMethod, provider_transaction_id: paymentReference || null }),
      });
      toast({ title: 'Payment recorded', description: 'Payment ledger, installment, invoice balance, and plan status were updated together.' });
      setPayingSchedule(null); setPaymentAmount(''); setPaymentReference('');
      await load();
    } catch (cause) {
      toast({ title: 'Could not record payment', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const changeStatus = async (plan: PaymentPlan, status: 'ACTIVE' | 'CANCELLED' | 'DEFAULTED') => {
    if (!window.confirm(`Change this ${title.toLowerCase()} to ${status.toLowerCase()}?`)) return;
    try {
      await vowosApi(`/api/organization/sales/payment-plans/${plan.id}/status`, { method: 'PATCH', body: jsonBody({ status }) });
      await load();
      toast({ title: `${title} status updated` });
    } catch (cause) {
      toast({ title: 'Could not update status', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    }
  };

  if (loading) return <div className={`${panel} flex min-h-48 items-center justify-center gap-3 text-sm text-stone-500`}><Loader2 className="h-5 w-5 animate-spin" />Loading {title.toLowerCase()}…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-xl font-semibold text-stone-900"><CalendarClock className="h-5 w-5 text-brand-primary" />{title}</h2><p className="mt-1 text-sm text-stone-500">Invoice-backed schedules with real payment ledger reconciliation.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>{canManage && <Button onClick={() => setShowCreate((value) => !value)}><Plus className="mr-2 h-4 w-4" />New {planType === 'LAYAWAY' ? 'Layaway' : 'Plan'}</Button>}</div>
      </div>

      {showCreate && canManage && (
        <section className={`${panel} p-5`}>
          <h3 className="mb-4 font-semibold text-stone-900">Create {title}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div><label className={label}>Customer</label><select className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm" value={form.customer_id} onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value, invoice_id: '', total: '' }))}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
            <div><label className={label}>Invoice</label><select className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm" value={form.invoice_id} onChange={(event) => setForm((current) => ({ ...current, invoice_id: event.target.value }))} disabled={!form.customer_id}><option value="">Select open invoice</option>{customerInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.description || invoice.id} · {money(invoice.amount_cents - invoice.paid_cents)} due</option>)}</select></div>
            <div><label className={label}>Plan total</label><Input inputMode="decimal" value={form.total} onChange={(event) => setForm((current) => ({ ...current, total: event.target.value }))} placeholder="0.00" /></div>
            <div><label className={label}>Down payment collected now</label><Input inputMode="decimal" value={form.down_payment} onChange={(event) => setForm((current) => ({ ...current, down_payment: event.target.value }))} /></div>
            <div><label className={label}>Down payment method</label><select className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm" value={form.down_payment_method} onChange={(event) => setForm((current) => ({ ...current, down_payment_method: event.target.value }))}><option value="credit_card">Credit card</option><option value="cash">Cash</option><option value="check">Check</option><option value="transfer">Bank transfer</option><option value="external">External processor</option></select></div>
            <div><label className={label}>Installments</label><Input type="number" min={1} max={120} value={form.installment_count} onChange={(event) => setForm((current) => ({ ...current, installment_count: event.target.value }))} /></div>
            <div><label className={label}>Frequency</label><select className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm" value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every 2 weeks</option><option value="MONTHLY">Monthly</option><option value="CUSTOM">30-day custom</option></select></div>
            <div><label className={label}>First due date</label><Input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} /></div>
            <div className="md:col-span-2 lg:col-span-3"><label className={label}>Notes</label><textarea rows={3} className="w-full rounded-lg border border-stone-300 p-3 text-sm" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div>
          </div>
          <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button disabled={saving} onClick={() => void createPlan()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Create & Schedule</Button></div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`${panel} p-4`}>
          <div className="relative mb-3"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="pl-9" /></div>
          <div className="space-y-2 max-h-[690px] overflow-y-auto">
            {filteredPlans.map((plan) => {
              const schedulePaid = plan.schedule.reduce((sum, row) => sum + (row.paid_cents || 0), 0);
              const remaining = Math.max(plan.total_cents - plan.down_payment_cents - schedulePaid, 0);
              return <button type="button" key={plan.id} onClick={() => setSelectedPlanId(plan.id)} className={`w-full rounded-xl border p-3 text-left ${selectedPlanId === plan.id ? 'border-brand-primary bg-rose-50' : 'border-stone-200 hover:bg-stone-50'}`}><div className="flex items-start justify-between gap-2"><p className="font-semibold text-stone-900">{plan.customer?.name ?? 'Customer'}</p><span className="text-[10px] font-bold text-stone-500">{plan.status}</span></div><p className="mt-1 text-xs text-stone-500">{plan.invoice?.description || 'Invoice'} · {money(remaining)} remaining</p></button>;
            })}
            {!filteredPlans.length && <p className="p-5 text-center text-sm text-stone-400">No {title.toLowerCase()} found.</p>}
          </div>
        </aside>

        <section className={`${panel} p-5`}>
          {selectedPlan ? (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-stone-900">{selectedPlan.customer?.name ?? 'Customer'}</h3><p className="text-sm text-stone-500">{selectedPlan.invoice?.description || selectedPlan.invoice_id} · {selectedPlan.frequency.toLowerCase()} · {selectedPlan.installment_count} installments</p></div><div className="flex flex-wrap gap-2">{canManage && selectedPlan.status === 'ACTIVE' && <><Button variant="outline" size="sm" onClick={() => void changeStatus(selectedPlan, 'DEFAULTED')}>Mark Defaulted</Button><Button variant="outline" size="sm" className="text-red-600" onClick={() => void changeStatus(selectedPlan, 'CANCELLED')}><XCircle className="mr-2 h-4 w-4" />Cancel</Button></>}{canManage && (selectedPlan.status === 'DEFAULTED' || selectedPlan.status === 'CANCELLED') && <Button variant="outline" size="sm" onClick={() => void changeStatus(selectedPlan, 'ACTIVE')}>Reactivate</Button>}</div></div>
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Plan Total</p><p className="font-semibold">{money(selectedPlan.total_cents)}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Down Payment</p><p className="font-semibold">{money(selectedPlan.down_payment_cents)}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Status</p><p className="font-semibold">{selectedPlan.status}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Started</p><p className="font-semibold">{selectedPlan.start_date}</p></div></div>
              <div className="space-y-2">
                {selectedPlan.schedule.map((row) => {
                  const remaining = Math.max(row.amount_cents - row.paid_cents, 0);
                  const paid = remaining === 0;
                  return <div key={row.id} className="flex flex-col gap-3 rounded-xl border border-stone-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3">{paid ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <CreditCard className="mt-0.5 h-5 w-5 text-stone-400" />}<div><p className="font-medium text-stone-900">{row.stage_name}</p><p className="text-xs text-stone-500">Due {row.due_date} · {money(row.paid_cents)} paid of {money(row.amount_cents)}</p></div></div>{canManage && selectedPlan.status === 'ACTIVE' && !paid && <Button size="sm" onClick={() => { setPayingSchedule(row); setPaymentAmount((remaining / 100).toFixed(2)); }}>Record {money(remaining)}</Button>}</div>;
                })}
              </div>
            </>
          ) : <div className="flex min-h-64 items-center justify-center text-sm text-stone-500">Select a plan to view its schedule.</div>}
        </section>
      </div>

      {payingSchedule && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4" role="dialog" aria-modal="true" aria-label="Record installment payment">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h3 className="text-lg font-semibold">Record Payment</h3><p className="mt-1 text-sm text-stone-500">{selectedPlan.customer?.name} · {payingSchedule.stage_name}</p><div className="mt-5 space-y-4"><div><label className={label}>Amount</label><Input inputMode="decimal" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></div><div><label className={label}>Payment method</label><select className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="credit_card">Credit card</option><option value="cash">Cash</option><option value="check">Check</option><option value="transfer">Bank transfer</option><option value="external">External processor</option></select></div><div><label className={label}>Transaction / reference ID</label><Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Optional external processor ID" /></div></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setPayingSchedule(null)}>Cancel</Button><Button disabled={saving} onClick={() => void recordPayment()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Post Payment</Button></div></div>
        </div>
      )}
    </div>
  );
}
