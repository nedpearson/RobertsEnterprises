import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileCheck2,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from '@vowos/design-system';
import {
  CompensationProfile,
  PayrollAdjustment,
  PayrollDashboardPayload,
  PayrollPeriod,
  PayrollPeriodDetailPayload,
  PayrollTimecard,
  payrollApi,
} from '@/lib/api/payrollApi';

const money = (cents: number | null | undefined) => cents == null
  ? 'Pending'
  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const hours = (minutes: number | null | undefined) => `${((minutes ?? 0) / 60).toFixed(2)}h`;

const today = () => new Date().toISOString().slice(0, 10);

const thirtyDaysAgo = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 30);
  return date.toISOString().slice(0, 10);
};

type Tab = 'overview' | 'timecards' | 'compensation' | 'adjustments' | 'periods';

interface CompensationForm {
  employee_id: string;
  compensation_type: CompensationProfile['compensation_type'];
  pay_frequency: CompensationProfile['pay_frequency'];
  hourly_rate: string;
  annual_salary: string;
  commission_percent: string;
  draw_amount: string;
  effective_from: string;
  reason: string;
}

interface AdjustmentForm {
  employee_id: string;
  adjustment_type: PayrollAdjustment['adjustment_type'];
  tax_treatment: PayrollAdjustment['tax_treatment'];
  amount: string;
  occurred_on: string;
  description: string;
}

interface PeriodForm {
  name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white px-5 py-4">
          <h2 className="font-serif text-xl font-semibold text-stone-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50';

function StatusPill({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const className = normalized === 'APPROVED' || normalized === 'POSTED' || normalized === 'RECONCILED' || normalized === 'FINAL'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : normalized === 'PENDING' || normalized === 'DRAFT' || normalized === 'REVIEWING' || normalized === 'PENDING_PROVIDER'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : normalized === 'VOIDED' || normalized === 'REJECTED' || normalized === 'FAILED' || normalized === 'ERROR'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-stone-50 text-stone-600 border-stone-200';
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}>{value.replaceAll('_', ' ')}</span>;
}

export default function PayrollView() {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<PayrollDashboardPayload | null>(null);
  const [periodDetail, setPeriodDetail] = useState<PayrollPeriodDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compModal, setCompModal] = useState(false);
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [periodModal, setPeriodModal] = useState(false);

  const [compForm, setCompForm] = useState<CompensationForm>({
    employee_id: '',
    compensation_type: 'HOURLY',
    pay_frequency: 'SEMIMONTHLY',
    hourly_rate: '',
    annual_salary: '',
    commission_percent: '0',
    draw_amount: '0',
    effective_from: today(),
    reason: '',
  });
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>({
    employee_id: '',
    adjustment_type: 'BONUS',
    tax_treatment: 'TAXABLE',
    amount: '',
    occurred_on: today(),
    description: '',
  });
  const [periodForm, setPeriodForm] = useState<PeriodForm>({
    name: '',
    start_date: thirtyDaysAgo(),
    end_date: today(),
    pay_date: today(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await payrollApi.dashboard();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const staffById = useMemo(() => new Map((data?.staff ?? []).map((row) => [row.id, row])), [data?.staff]);
  const activeCompensation = useMemo(() => {
    const seen = new Set<string>();
    return (data?.compensationProfiles ?? []).filter((profile) => {
      if (!profile.is_active || profile.effective_to) return false;
      if (seen.has(profile.employee_id)) return false;
      seen.add(profile.employee_id);
      return true;
    });
  }, [data?.compensationProfiles]);
  const activeCompByEmployee = useMemo(() => new Map(activeCompensation.map((row) => [row.employee_id, row])), [activeCompensation]);
  const openTimecards = useMemo(() => (data?.recentTimecards ?? []).filter((row) => !row.clock_out), [data?.recentTimecards]);
  const pendingAdjustments = useMemo(() => (data?.adjustments ?? []).filter((row) => row.status === 'PENDING'), [data?.adjustments]);
  const missingCompensation = useMemo(() => {
    const employeeIds = new Set((data?.recentTimecards ?? []).filter((row) => row.user_id).map((row) => row.user_id as string));
    return [...employeeIds].filter((id) => !activeCompByEmployee.has(id)).map((id) => staffById.get(id)?.name ?? id);
  }, [activeCompByEmployee, data?.recentTimecards, staffById]);

  const openCompensation = (employeeId?: string) => {
    setCompForm((current) => ({ ...current, employee_id: employeeId ?? current.employee_id ?? '' }));
    setCompModal(true);
  };

  const saveCompensation = async (event: React.FormEvent) => {
    event.preventDefault();
    const hourly = Math.round(Number(compForm.hourly_rate || 0) * 100);
    const salary = Math.round(Number(compForm.annual_salary || 0) * 100);
    const commissionBps = Math.round(Number(compForm.commission_percent || 0) * 100);
    const draw = Math.round(Number(compForm.draw_amount || 0) * 100);
    setBusy(true);
    try {
      await payrollApi.saveCompensation({
        employee_id: compForm.employee_id,
        compensation_type: compForm.compensation_type,
        pay_frequency: compForm.pay_frequency,
        hourly_rate_cents: hourly,
        annual_salary_cents: salary,
        commission_rate_bps: commissionBps,
        draw_amount_cents: draw,
        effective_from: compForm.effective_from,
        reason: compForm.reason,
      });
      toast({ title: 'Compensation saved', description: 'A new effective-dated compensation version was recorded.' });
      setCompModal(false);
      await load();
    } catch (err) {
      toast({ title: 'Compensation not saved', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const createAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await payrollApi.createAdjustment({
        employee_id: adjustmentForm.employee_id,
        adjustment_type: adjustmentForm.adjustment_type,
        tax_treatment: adjustmentForm.tax_treatment,
        amount_cents: Math.round(Number(adjustmentForm.amount || 0) * 100),
        occurred_on: adjustmentForm.occurred_on,
        description: adjustmentForm.description,
      });
      toast({ title: 'Adjustment created', description: 'The adjustment is pending managerial approval before payroll can consume it.' });
      setAdjustmentModal(false);
      await load();
    } catch (err) {
      toast({ title: 'Adjustment not created', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const decideAdjustment = async (row: PayrollAdjustment, decision: 'APPROVED' | 'REJECTED') => {
    setBusy(true);
    try {
      await payrollApi.decideAdjustment(row.id, decision);
      toast({ title: `Adjustment ${decision.toLowerCase()}` });
      await load();
    } catch (err) {
      toast({ title: 'Adjustment decision failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const createPeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await payrollApi.createPeriod(periodForm);
      toast({
        title: 'Payroll draft calculated',
        description: response.provider.ready
          ? 'Gross payroll is locked to the Time Clock ledger. Tax/net pay are awaiting provider results.'
          : 'Gross payroll is calculated. Tax/net pay remain intentionally unresolved because no verified payroll provider is ready.',
      });
      setPeriodDetail({ period: response.period, lines: response.lines, submissions: [] });
      setPeriodModal(false);
      setTab('periods');
      await load();
    } catch (err) {
      toast({ title: 'Payroll draft not created', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openPeriod = async (period: PayrollPeriod) => {
    setBusy(true);
    try {
      setPeriodDetail(await payrollApi.period(period.id));
      setTab('periods');
    } catch (err) {
      toast({ title: 'Could not load payroll period', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const approvePeriod = async () => {
    if (!periodDetail) return;
    setBusy(true);
    try {
      await payrollApi.approvePeriod(periodDetail.period.id);
      toast({ title: 'Payroll approved', description: 'Source timecards and approved adjustments are now locked to this payroll period.' });
      setPeriodDetail(await payrollApi.period(periodDetail.period.id));
      await load();
    } catch (err) {
      toast({ title: 'Payroll approval blocked', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const postPeriod = async () => {
    if (!periodDetail) return;
    setBusy(true);
    try {
      await payrollApi.postPeriod(periodDetail.period.id);
      toast({ title: 'Payroll posted' });
      setPeriodDetail(await payrollApi.period(periodDetail.period.id));
      await load();
    } catch (err) {
      toast({ title: 'Payroll cannot be posted yet', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const voidPeriod = async () => {
    if (!periodDetail) return;
    const reason = window.prompt('Why is this draft being voided?');
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await payrollApi.voidPeriod(periodDetail.period.id, reason.trim());
      toast({ title: 'Payroll draft voided' });
      setPeriodDetail(null);
      await load();
    } catch (err) {
      toast({ title: 'Payroll could not be voided', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-stone-400" /></div>;
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div className="space-y-3">
            <div><h2 className="font-semibold">Payroll operations could not load</h2><p className="mt-1 text-sm">{error}</p></div>
            <button className={secondaryButton} onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const provider = data.provider;
  const providerLabel = provider.ready
    ? `${provider.provider} connected`
    : provider.connected
      ? `${provider.provider} action required`
      : 'No payroll provider connected';
  const allTaxesFinal = periodDetail?.lines.every((line) => line.tax_status === 'FINAL' && line.tax_cents != null && line.net_pay_cents != null) ?? false;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400"><ShieldCheck className="h-4 w-4" /> Authoritative payroll ledger</div>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-stone-900">Payroll Operations</h1>
          <p className="mt-1 max-w-3xl text-sm text-stone-500">Gross wages are calculated server-side from closed Time Clock records and effective-dated compensation. VowOS does not invent statutory taxes or net pay.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={secondaryButton} onClick={() => void load()} disabled={loading || busy}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button className={primaryButton} onClick={() => setPeriodModal(true)} disabled={openTimecards.length > 0}><Plus className="h-4 w-4" /> Create payroll draft</button>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${provider.ready ? 'border-emerald-200 bg-emerald-50' : provider.connected ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-stone-50'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {provider.ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />}
            <div>
              <p className="font-semibold text-stone-900">{providerLabel}</p>
              <p className="mt-0.5 text-xs text-stone-600">
                {provider.ready
                  ? `Health ${provider.healthStatus} · Auth ${provider.authState} · Circuit ${provider.circuitBreakerState}`
                  : provider.connected
                    ? `${provider.healthStatus} / ${provider.authState}. ${provider.lastErrorMessage || 'Provider must be healthy and authorized before tax processing.'}`
                    : 'Tax calculations and net pay stay pending until a verified Gusto, ADP, Paychex, or Rippling connection is established.'}
              </p>
            </div>
          </div>
          <a href="/settings?tab=integrations" className={secondaryButton}><Settings2 className="h-4 w-4" /> Integration settings</a>
        </div>
      </div>

      {(openTimecards.length > 0 || missingCompensation.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {openTimecards.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 text-amber-700" /><div><p className="font-semibold text-amber-900">{openTimecards.length} open shift{openTimecards.length === 1 ? '' : 's'} block payroll drafting</p><p className="mt-1 text-xs text-amber-800">Close the shifts in Time Clock before calculating a payroll period.</p></div></div>
            </div>
          )}
          {missingCompensation.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-rose-700" /><div><p className="font-semibold text-rose-900">Compensation setup required</p><p className="mt-1 text-xs text-rose-800">{missingCompensation.join(', ')}</p></div></div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto border-b border-stone-200">
        <div className="flex min-w-max gap-1">
          {([
            ['overview', 'Overview'],
            ['timecards', 'Timecards'],
            ['compensation', 'Compensation'],
            ['adjustments', 'Adjustments'],
            ['periods', 'Payroll periods'],
          ] as Array<[Tab, string]>).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === key ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'}`}>{label}</button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><Users className="h-5 w-5 text-stone-400" /><p className="mt-3 text-2xl font-semibold text-stone-900">{activeCompensation.length}/{data.staff.length}</p><p className="text-xs text-stone-500">Employees with active compensation</p></div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><Clock3 className="h-5 w-5 text-stone-400" /><p className="mt-3 text-2xl font-semibold text-stone-900">{openTimecards.length}</p><p className="text-xs text-stone-500">Open timecards</p></div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><DollarSign className="h-5 w-5 text-stone-400" /><p className="mt-3 text-2xl font-semibold text-stone-900">{pendingAdjustments.length}</p><p className="text-xs text-stone-500">Adjustments awaiting approval</p></div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><CalendarDays className="h-5 w-5 text-stone-400" /><p className="mt-3 text-2xl font-semibold text-stone-900">{data.periods.filter((row) => row.status !== 'VOIDED').length}</p><p className="text-xs text-stone-500">Payroll periods on register</p></div>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center justify-between"><div><h3 className="font-serif text-lg font-semibold text-stone-900">Recent payroll periods</h3><p className="text-xs text-stone-500">Server snapshots of hours, compensation and approved adjustments.</p></div><button className={secondaryButton} onClick={() => setTab('periods')}>View register</button></div>
              {data.periods.length === 0 ? <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">No payroll periods have been created.</p> : (
                <div className="space-y-2">{data.periods.slice(0, 5).map((period) => <button key={period.id} onClick={() => void openPeriod(period)} className="flex w-full items-center justify-between rounded-xl border border-stone-100 px-4 py-3 text-left hover:bg-stone-50"><div><p className="text-sm font-semibold text-stone-900">{period.name}</p><p className="text-xs text-stone-500">Pay {period.pay_date} · {period.employee_count} employee{period.employee_count === 1 ? '' : 's'} · Gross {money(period.total_gross_cents)}</p></div><StatusPill value={period.status} /></button>)}</div>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="font-serif text-lg font-semibold text-stone-900">Payroll rules</h3>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex justify-between gap-4"><span className="text-stone-500">Workweek starts</span><span className="font-semibold text-stone-800">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][data.configuration.workweek_start] ?? 'Sunday'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-stone-500">Weekly OT threshold</span><span className="font-semibold text-stone-800">{hours(data.configuration.overtime_threshold_minutes)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-stone-500">OT multiplier</span><span className="font-semibold text-stone-800">{Number(data.configuration.overtime_multiplier).toFixed(2)}×</span></div>
              </div>
              <p className="mt-5 rounded-xl bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-500">These rules control gross wage calculation only. Tax withholding is never estimated by this screen.</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'timecards' && (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 p-5"><h3 className="font-serif text-lg font-semibold text-stone-900">Time Clock payroll source</h3><p className="text-xs text-stone-500">Last 90 days. Worked time deducts recorded unpaid breaks; paid breaks remain compensable.</p></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Clock in</th><th className="px-4 py-3">Clock out</th><th className="px-4 py-3">Worked</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Payroll lock</th></tr></thead><tbody className="divide-y divide-stone-100">{data.recentTimecards.map((row: PayrollTimecard) => <tr key={row.id}><td className="px-4 py-3 font-medium text-stone-900">{row.staff_name}</td><td className="px-4 py-3 text-stone-600">{new Date(row.clock_in).toLocaleString()}</td><td className="px-4 py-3 text-stone-600">{row.clock_out ? new Date(row.clock_out).toLocaleString() : <StatusPill value="OPEN" />}</td><td className="px-4 py-3 font-mono text-stone-800">{hours(row.worked_minutes)}</td><td className="px-4 py-3 text-stone-600">{row.department || '—'}</td><td className="px-4 py-3">{row.payroll_period_id ? <StatusPill value="LOCKED" /> : <span className="text-stone-400">Available</span>}</td></tr>)}</tbody></table></div>
          {data.recentTimecards.length === 0 && <p className="p-8 text-center text-sm text-stone-500">No Time Clock records yet.</p>}
        </div>
      )}

      {tab === 'compensation' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-xl font-semibold text-stone-900">Compensation versions</h3><p className="text-xs text-stone-500">Effective-dated rates are preserved for historical payroll reproducibility.</p></div><button className={primaryButton} onClick={() => openCompensation()}><Plus className="h-4 w-4" /> Add compensation</button></div>
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Frequency</th><th className="px-4 py-3">Effective</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-stone-100">{data.compensationProfiles.map((row) => <tr key={row.id}><td className="px-4 py-3 font-medium text-stone-900">{staffById.get(row.employee_id)?.name ?? row.employee_id}</td><td className="px-4 py-3 text-stone-600">{row.compensation_type.replaceAll('_', ' ')}</td><td className="px-4 py-3 text-stone-800">{row.compensation_type.startsWith('HOURLY') ? `${money(row.hourly_rate_cents)}/hr` : `${money(row.annual_salary_cents)}/yr`}</td><td className="px-4 py-3 text-stone-600">{row.pay_frequency}</td><td className="px-4 py-3 text-stone-600">{row.effective_from}{row.effective_to ? ` → ${row.effective_to}` : ''}</td><td className="px-4 py-3"><StatusPill value={row.is_active && !row.effective_to ? 'ACTIVE' : 'HISTORICAL'} /></td></tr>)}</tbody></table></div>{data.compensationProfiles.length === 0 && <p className="p-8 text-center text-sm text-stone-500">No compensation profiles configured.</p>}</div>
        </div>
      )}

      {tab === 'adjustments' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-xl font-semibold text-stone-900">Payroll adjustments</h3><p className="text-xs text-stone-500">Bonuses, commissions, reimbursements and deductions require explicit approval before a payroll draft can consume them.</p></div><button className={primaryButton} onClick={() => setAdjustmentModal(true)}><Plus className="h-4 w-4" /> New adjustment</button></div>
          <div className="space-y-2">{data.adjustments.map((row) => <div key={row.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-stone-900">{staffById.get(row.employee_id)?.name ?? row.employee_id}</p><StatusPill value={row.adjustment_type} /><StatusPill value={row.status} /></div><p className="mt-1 text-xs text-stone-500">{row.occurred_on} · {row.tax_treatment.replaceAll('_', ' ')} · {row.description}</p></div><div className="flex items-center gap-2"><span className="mr-2 text-sm font-semibold text-stone-900">{money(row.amount_cents)}</span>{row.status === 'PENDING' && <><button disabled={busy} onClick={() => void decideAdjustment(row, 'APPROVED')} className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-4 w-4" /></button><button disabled={busy} onClick={() => void decideAdjustment(row, 'REJECTED')} className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"><XCircle className="h-4 w-4" /></button></>}</div></div>)}{data.adjustments.length === 0 && <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No payroll adjustments.</p>}</div>
        </div>
      )}

      {tab === 'periods' && (
        <div className="grid gap-5 xl:grid-cols-5">
          <div className="space-y-2 xl:col-span-2"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-serif text-xl font-semibold text-stone-900">Payroll register</h3><p className="text-xs text-stone-500">Draft through reconciled.</p></div><button className={primaryButton} onClick={() => setPeriodModal(true)} disabled={openTimecards.length > 0}><Plus className="h-4 w-4" /></button></div>{data.periods.map((period) => <button key={period.id} onClick={() => void openPeriod(period)} className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:bg-stone-50 ${periodDetail?.period.id === period.id ? 'border-stone-500 bg-stone-50' : 'border-stone-200 bg-white'}`}><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-stone-900">{period.name}</p><p className="mt-1 text-xs text-stone-500">Pay {period.pay_date} · Gross {money(period.total_gross_cents)}</p></div><StatusPill value={period.status} /></div></button>)}{data.periods.length === 0 && <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No payroll periods.</p>}</div>

          <div className="xl:col-span-3">
            {!periodDetail ? <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center"><FileCheck2 className="mx-auto h-8 w-8 text-stone-300" /><p className="mt-3 text-sm font-semibold text-stone-700">Select a payroll period</p><p className="mt-1 text-xs text-stone-500">Employee calculation lines and provider state appear here.</p></div> : (
              <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-xl font-semibold text-stone-900">{periodDetail.period.name}</h3><StatusPill value={periodDetail.period.status} /></div><p className="mt-1 text-xs text-stone-500">{periodDetail.period.start_date} → {periodDetail.period.end_date} · pay {periodDetail.period.pay_date}</p></div><div className="flex flex-wrap gap-2">{['DRAFT','REVIEWING'].includes(periodDetail.period.status) && <><button className={secondaryButton} disabled={busy} onClick={() => void voidPeriod()}>Void</button><button className={primaryButton} disabled={busy} onClick={() => void approvePeriod()}><ShieldCheck className="h-4 w-4" /> Approve & lock</button></>}{periodDetail.period.status === 'APPROVED' && <button className={primaryButton} disabled={busy || !allTaxesFinal} onClick={() => void postPeriod()}><Banknote className="h-4 w-4" /> Post payroll</button>}</div></div>

                <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Gross</p><p className="mt-1 text-lg font-semibold text-stone-900">{money(periodDetail.period.total_gross_cents)}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Taxes</p><p className="mt-1 text-lg font-semibold text-stone-900">{money(periodDetail.period.total_tax_cents)}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Net pay</p><p className="mt-1 text-lg font-semibold text-stone-900">{money(periodDetail.period.total_net_cents)}</p></div></div>

                {!allTaxesFinal && periodDetail.period.status !== 'POSTED' && periodDetail.period.status !== 'RECONCILED' && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><div className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Posting is blocked until every employee line has provider-final tax and net-pay results. VowOS will not substitute estimates.</span></div></div>}

                <div className="overflow-x-auto rounded-xl border border-stone-100"><table className="min-w-full text-left text-[11px]"><thead className="bg-stone-50 text-stone-500"><tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Regular</th><th className="px-3 py-2">OT</th><th className="px-3 py-2">Gross</th><th className="px-3 py-2">Tax state</th><th className="px-3 py-2">Net</th></tr></thead><tbody className="divide-y divide-stone-100">{periodDetail.lines.map((line) => <tr key={line.id}><td className="px-3 py-2.5 font-semibold text-stone-900">{line.employee_name}</td><td className="px-3 py-2.5 text-stone-600">{hours(line.regular_minutes)}</td><td className="px-3 py-2.5 text-stone-600">{hours(line.overtime_minutes)}</td><td className="px-3 py-2.5 font-semibold text-stone-900">{money(line.gross_pay_cents)}</td><td className="px-3 py-2.5"><StatusPill value={line.tax_status} /></td><td className="px-3 py-2.5 text-stone-800">{money(line.net_pay_cents)}</td></tr>)}</tbody></table></div>
              </div>
            )}
          </div>
        </div>
      )}

      {compModal && <ModalShell title="Effective-dated compensation" onClose={() => setCompModal(false)}><form onSubmit={saveCompensation} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Employee"><select className={inputClass} required value={compForm.employee_id} onChange={(e) => setCompForm({ ...compForm, employee_id: e.target.value })}><option value="">Select employee</option>{data.staff.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field><Field label="Compensation type"><select className={inputClass} value={compForm.compensation_type} onChange={(e) => setCompForm({ ...compForm, compensation_type: e.target.value as CompensationProfile['compensation_type'] })}><option value="HOURLY">Hourly</option><option value="HOURLY_PLUS_COMMISSION">Hourly + commission</option><option value="SALARY">Salary</option><option value="SALARY_PLUS_COMMISSION">Salary + commission</option></select></Field><Field label="Pay frequency"><select className={inputClass} value={compForm.pay_frequency} onChange={(e) => setCompForm({ ...compForm, pay_frequency: e.target.value as CompensationProfile['pay_frequency'] })}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Biweekly</option><option value="SEMIMONTHLY">Semimonthly</option><option value="MONTHLY">Monthly</option></select></Field><Field label="Effective from"><input className={inputClass} type="date" required value={compForm.effective_from} onChange={(e) => setCompForm({ ...compForm, effective_from: e.target.value })} /></Field>{compForm.compensation_type.startsWith('HOURLY') ? <Field label="Hourly rate"><input className={inputClass} type="number" min="0.01" step="0.01" required value={compForm.hourly_rate} onChange={(e) => setCompForm({ ...compForm, hourly_rate: e.target.value })} /></Field> : <Field label="Annual salary"><input className={inputClass} type="number" min="1" step="0.01" required value={compForm.annual_salary} onChange={(e) => setCompForm({ ...compForm, annual_salary: e.target.value })} /></Field>}<Field label="Commission %"><input className={inputClass} type="number" min="0" max="100" step="0.01" value={compForm.commission_percent} onChange={(e) => setCompForm({ ...compForm, commission_percent: e.target.value })} /></Field><Field label="Commission draw"><input className={inputClass} type="number" min="0" step="0.01" value={compForm.draw_amount} onChange={(e) => setCompForm({ ...compForm, draw_amount: e.target.value })} /></Field></div><Field label="Reason / change note"><textarea className={`${inputClass} min-h-20`} value={compForm.reason} onChange={(e) => setCompForm({ ...compForm, reason: e.target.value })} /></Field><div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setCompModal(false)}>Cancel</button><button type="submit" className={primaryButton} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save compensation</button></div></form></ModalShell>}

      {adjustmentModal && <ModalShell title="New payroll adjustment" onClose={() => setAdjustmentModal(false)}><form onSubmit={createAdjustment} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Employee"><select className={inputClass} required value={adjustmentForm.employee_id} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, employee_id: e.target.value })}><option value="">Select employee</option>{data.staff.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field><Field label="Adjustment type"><select className={inputClass} value={adjustmentForm.adjustment_type} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustment_type: e.target.value as PayrollAdjustment['adjustment_type'] })}><option value="BONUS">Bonus</option><option value="COMMISSION">Commission</option><option value="REIMBURSEMENT">Reimbursement</option><option value="DEDUCTION">Deduction</option></select></Field><Field label="Tax treatment"><select className={inputClass} value={adjustmentForm.tax_treatment} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, tax_treatment: e.target.value as PayrollAdjustment['tax_treatment'] })}><option value="TAXABLE">Taxable</option><option value="NON_TAXABLE">Non-taxable</option><option value="PRE_TAX">Pre-tax deduction</option><option value="AFTER_TAX">After-tax deduction</option></select></Field><Field label="Amount"><input className={inputClass} type="number" min="0.01" step="0.01" required value={adjustmentForm.amount} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })} /></Field><Field label="Effective date"><input className={inputClass} type="date" required value={adjustmentForm.occurred_on} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, occurred_on: e.target.value })} /></Field></div><Field label="Description"><textarea className={`${inputClass} min-h-20`} required value={adjustmentForm.description} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })} /></Field><div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setAdjustmentModal(false)}>Cancel</button><button type="submit" className={primaryButton} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create pending adjustment</button></div></form></ModalShell>}

      {periodModal && <ModalShell title="Create payroll draft" onClose={() => setPeriodModal(false)}><form onSubmit={createPeriod} className="space-y-4"><div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600"><div className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-stone-500" /><span>This creates a server-side snapshot from closed Time Clock entries, compensation versions, and approved adjustments. It does not calculate fake taxes.</span></div></div><Field label="Register name (optional)"><input className={inputClass} value={periodForm.name} placeholder="Aug 16–31 Payroll" onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Period start"><input className={inputClass} type="date" required value={periodForm.start_date} onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })} /></Field><Field label="Period end"><input className={inputClass} type="date" required value={periodForm.end_date} onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })} /></Field><Field label="Pay date"><input className={inputClass} type="date" required value={periodForm.pay_date} onChange={(e) => setPeriodForm({ ...periodForm, pay_date: e.target.value })} /></Field></div><div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setPeriodModal(false)}>Cancel</button><button type="submit" className={primaryButton} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Calculate draft</button></div></form></ModalShell>}
    </div>
  );
}
