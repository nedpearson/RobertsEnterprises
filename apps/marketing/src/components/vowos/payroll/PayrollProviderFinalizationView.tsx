import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileCheck2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { payrollApi, PayrollDashboardPayload, PayrollPeriodDetailPayload } from '@/lib/api/payrollApi';
import { payrollManualApi } from '@/lib/api/payrollManualApi';

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50';
const money = (cents: number | null | undefined) => cents == null ? 'Pending' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

interface LineInput {
  tax: string;
  net: string;
}

export default function PayrollProviderFinalizationView() {
  const [dashboard, setDashboard] = useState<PayrollDashboardPayload | null>(null);
  const [detail, setDetail] = useState<PayrollPeriodDetailPayload | null>(null);
  const [lineInputs, setLineInputs] = useState<Record<string, LineInput>>({});
  const [providerReference, setProviderReference] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await payrollApi.dashboard();
      setDashboard(data);
      const pending = data.periods.find((period) => period.status === 'APPROVED');
      if (pending) {
        const periodDetail = await payrollApi.period(pending.id);
        setDetail(periodDetail);
        setLineInputs(Object.fromEntries(periodDetail.lines.map((line) => [line.id, {
          tax: line.tax_cents == null ? '' : (line.tax_cents / 100).toFixed(2),
          net: line.net_pay_cents == null ? '' : (line.net_pay_cents / 100).toFixed(2),
        }])));
      } else {
        setDetail(null);
        setLineInputs({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const approvedPeriods = useMemo(() => dashboard?.periods.filter((period) => period.status === 'APPROVED') ?? [], [dashboard?.periods]);
  const allFinal = detail?.lines.every((line) => line.tax_status === 'FINAL' && line.tax_cents != null && line.net_pay_cents != null) ?? false;

  const selectPeriod = async (periodId: string) => {
    if (!periodId) { setDetail(null); return; }
    setBusy(true);
    try {
      const periodDetail = await payrollApi.period(periodId);
      setDetail(periodDetail);
      setLineInputs(Object.fromEntries(periodDetail.lines.map((line) => [line.id, {
        tax: line.tax_cents == null ? '' : (line.tax_cents / 100).toFixed(2),
        net: line.net_pay_cents == null ? '' : (line.net_pay_cents / 100).toFixed(2),
      }])));
      const manualSubmission = periodDetail.submissions.find((submission) => submission.provider === 'MANUAL_VERIFIED');
      setProviderReference(typeof manualSubmission?.provider_reference === 'string' ? manualSubmission.provider_reference : '');
    } catch (err) {
      toast({ title: 'Payroll period could not load', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const applyResults = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    const lines = detail.lines.map((line) => {
      const input = lineInputs[line.id];
      const tax = Math.round(Number(input?.tax ?? '') * 100);
      const net = Math.round(Number(input?.net ?? '') * 100);
      if (!Number.isSafeInteger(tax) || tax < 0 || !Number.isSafeInteger(net) || net < 0) {
        throw new Error(`Enter valid tax and net-pay amounts for ${line.employee_name}.`);
      }
      return { line_id: line.id, tax_cents: tax, net_pay_cents: net };
    });

    setBusy(true);
    try {
      await payrollManualApi.applyVerifiedResults(detail.period.id, {
        provider_reference: providerReference,
        evidence_note: evidenceNote,
        lines,
      });
      setDetail(await payrollApi.period(detail.period.id));
      await loadDashboardOnly();
      toast({ title: 'Provider results finalized', description: 'The exact external-provider tax and net-pay values are now final and auditable. Payroll may be posted.' });
    } catch (err) {
      toast({ title: 'Provider results were not applied', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const loadDashboardOnly = async () => {
    try { setDashboard(await payrollApi.dashboard()); } catch { /* detail remains usable */ }
  };

  const postPayroll = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await payrollApi.postPeriod(detail.period.id);
      toast({ title: 'Payroll posted', description: 'The provider-finalized payroll period is now on the immutable payroll register.' });
      setDetail(null);
      await load();
    } catch (err) {
      toast({ title: 'Payroll could not be posted', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (loading && !dashboard) return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  if (error && !dashboard) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><div className="flex gap-3"><AlertTriangle className="h-5 w-5" /><div><p className="font-semibold">Provider finalization could not load</p><p className="mt-1">{error}</p><button className={`${secondaryButton} mt-3`} onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Retry</button></div></div></div>;
  if (!dashboard) return null;

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-4 ${dashboard.provider.ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            {dashboard.provider.ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />}
            <div><p className="font-semibold text-stone-900">{dashboard.provider.ready ? `${dashboard.provider.provider} API connection is healthy` : 'Verified manual-provider bridge'}</p><p className="mt-1 text-xs text-stone-600">{dashboard.provider.ready ? 'Direct provider processing can be added without changing the payroll ledger contract.' : 'Enter only the final figures produced by your actual payroll provider. VowOS does not estimate withholding.'}</p></div>
          </div>
          <a href="/settings?tab=integrations" className={secondaryButton}><ExternalLink className="h-4 w-4" /> Integrations</a>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="w-full max-w-lg space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Approved payroll awaiting provider results</span><select className={inputClass} value={detail?.period.id ?? ''} onChange={(e) => void selectPeriod(e.target.value)}><option value="">Select approved period</option>{approvedPeriods.map((period) => <option key={period.id} value={period.id}>{period.name} · pay {period.pay_date} · gross {money(period.total_gross_cents)}</option>)}</select></label>
          <button className={secondaryButton} disabled={busy} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </div>

      {!detail ? <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center"><FileCheck2 className="mx-auto h-8 w-8 text-stone-300" /><p className="mt-3 font-semibold text-stone-700">No approved payroll is awaiting finalization</p><p className="mt-1 text-xs text-stone-500">Calculate and approve a payroll period in the Payroll Register first.</p></div> : (
        <form onSubmit={applyResults} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-stone-500" /><h3 className="font-serif text-xl font-semibold text-stone-900">{detail.period.name}</h3></div><p className="mt-1 text-xs text-stone-500">Gross {money(detail.period.total_gross_cents)} · {detail.lines.length} employee{detail.lines.length === 1 ? '' : 's'} · pay date {detail.period.pay_date}</p></div>{allFinal && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Provider results final</span>}</div>

          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-stone-500">External provider reference</span><input className={inputClass} required disabled={allFinal} value={providerReference} onChange={(e) => setProviderReference(e.target.value)} placeholder="Gusto payroll ID, ADP batch ID, check register #…" /></label><label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Evidence / reconciliation note</span><input className={inputClass} disabled={allFinal} value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} placeholder="Verified against provider payroll register" /></label></div>

          <div className="overflow-x-auto rounded-xl border border-stone-200"><table className="min-w-full text-left text-xs"><thead className="bg-stone-50 text-stone-500"><tr><th className="px-3 py-2.5">Employee</th><th className="px-3 py-2.5">Gross</th><th className="px-3 py-2.5">Taxable gross</th><th className="px-3 py-2.5">Verified tax</th><th className="px-3 py-2.5">Verified net pay</th><th className="px-3 py-2.5">State</th></tr></thead><tbody className="divide-y divide-stone-100">{detail.lines.map((line) => <tr key={line.id}><td className="px-3 py-3 font-semibold text-stone-900">{line.employee_name}</td><td className="px-3 py-3 text-stone-700">{money(line.gross_pay_cents)}</td><td className="px-3 py-3 text-stone-600">{money(line.taxable_gross_cents)}</td><td className="px-3 py-3"><input className="w-28 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" type="number" min="0" step="0.01" required disabled={allFinal} value={lineInputs[line.id]?.tax ?? ''} onChange={(e) => setLineInputs((current) => ({ ...current, [line.id]: { ...(current[line.id] ?? { tax: '', net: '' }), tax: e.target.value } }))} /></td><td className="px-3 py-3"><input className="w-28 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" type="number" min="0" step="0.01" required disabled={allFinal} value={lineInputs[line.id]?.net ?? ''} onChange={(e) => setLineInputs((current) => ({ ...current, [line.id]: { ...(current[line.id] ?? { tax: '', net: '' }), net: e.target.value } }))} /></td><td className="px-3 py-3 text-stone-600">{line.tax_status.replace(/_/g, ' ')}</td></tr>)}</tbody></table></div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">These fields are not a tax calculator. Enter the exact final withholding and net-pay figures returned by the external payroll provider. The backend validates completeness, basic monetary bounds, provider reference, and preserves an immutable submission record.</div>

          <div className="flex flex-wrap justify-end gap-2">{!allFinal ? <button className={primaryButton} disabled={busy} type="submit">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Finalize verified provider results</button> : <button className={primaryButton} disabled={busy} type="button" onClick={() => void postPayroll()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Post finalized payroll</button>}</div>
        </form>
      )}
    </div>
  );
}
