import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Gem, Loader2, AlertTriangle, CalendarDays, FileSignature, Scissors, Receipt, CheckCircle2, CreditCard, PenLine, MapPin, Phone, Heart, Ruler, Download, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Customer,
  Appointment,
  Invoice,
  LocationId,
  locationById,
  formatCents,
  formatDate,
} from '@/data/vowosData';
import {
  ContractRecord,
  AlterationJob,
  mapContract,
  mapAlteration,
  jobProgress,
} from '@/lib/contractsAlterations';
import { MeasurementSet, MEASUREMENT_FIELDS, fetchMeasurements } from '@/lib/fitProfile';

export default function BridePortal() {
  const { brideId } = useParams<{ brideId: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';

  const [bride, setBride] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [alterations, setAlterations] = useState<AlterationJob[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!brideId || !token) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('brides')
        .select('*')
        .eq('id', brideId)
        .eq('portal_token', token)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const b: Customer = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        weddingDate: data.wedding_date,
        stylist: data.stylist,
        status: data.status,
        spendCents: data.spend_cents,
        location: (data.location ?? 'ido-br') as LocationId,
        portalToken: data.portal_token ?? '',
      };
      setBride(b);
      const businessId = data.business_id as string;
      const [apptRes, invRes, ctRes, altRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .eq('business_id', businessId)
          .eq('customer_id', b.id)
          .order('date', { ascending: true }),
        supabase
          .from('invoices')
          .select('*')
          .eq('business_id', businessId)
          .eq('customer_id', b.id)
          .order('due_date', { ascending: true }),
        supabase
          .from('contracts')
          .select('*')
          .eq('business_id', businessId)
          .eq('customer_id', b.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('alterations')
          .select('*')
          .eq('business_id', businessId)
          .eq('customer_id', b.id)
          .order('created_at', { ascending: false }),
      ]);
      if (apptRes.data) {
        setAppointments(
          apptRes.data.map((r: any) => ({
            id: r.id,
            customer: r.customer,
            type: r.type,
            date: r.date,
            time: r.time,
            stylist: r.stylist,
            status: r.status,
            location: (r.location ?? 'ido-br') as LocationId,
            lookingFor: r.looking_for ?? '',
            budgetCents: r.budget_cents ?? 0,
            feePaid: r.fee_paid ?? false,
          })),
        );
      }

      if (invRes.data) {
        setInvoices(
          invRes.data.map((r: any) => ({
            id: r.id,
            customer: r.customer,
            description: r.description,
            amountCents: r.amount_cents,
            paidCents: r.paid_cents,
            dueDate: r.due_date,
            status: r.status,
            location: (r.location ?? 'ido-br') as LocationId,
            payToken: r.pay_token ?? '',
          })),
        );
      }
      if (ctRes.data) setContracts(ctRes.data.map(mapContract));
      if (altRes.data) setAlterations(altRes.data.map(mapAlteration));
      setMeasurements(await fetchMeasurements(b.id));
      setLoading(false);

    };
    load();
  }, [brideId, token]);

  const loc = useMemo(() => (bride ? locationById(bride.location) : null), [bride]);
  const first = bride?.name.split(' ')[0] ?? '';
  const daysToWedding = bride
    ? Math.ceil((new Date(bride.weddingDate.slice(0, 10) + 'T12:00:00').getTime() - Date.now()) / 86400000)
    : 0;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter((a) => a.date.slice(0, 10) >= today && a.status !== 'Cancelled');
  const openInvoices = invoices.filter((i) => i.amountCents > i.paidCents);
  const totalBalance = openInvoices.reduce((s, i) => s + (i.amountCents - i.paidCents), 0);

  return (
    <div className="min-h-screen bg-[#faf8f5] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-200">
            <Gem className="h-6 w-6 text-white" />
          </div>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.25em] text-brand-primary">
            {loc ? loc.business : 'The Boutique Bridal'}
          </p>
          <h1 className="font-serif text-3xl text-stone-900">
            {bride ? `Welcome back, ${first}` : 'Your Bridal Portal'}
          </h1>
          {bride && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-4 py-1.5 text-sm text-brand-primary ring-1 ring-focus-ring">
              <Heart className="h-4 w-4" />
              {daysToWedding > 0
                ? `${daysToWedding} days until your wedding — ${formatDate(bride.weddingDate)}`
                : `Married ${formatDate(bride.weddingDate)} — congratulations!`}
            </p>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl border border-stone-200 bg-white py-16 text-center shadow-sm">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-primary" />
            <p className="mt-3 text-sm text-stone-500">Opening your portal…</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="rounded-3xl border border-border-subtle bg-white p-8 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-8 w-8 text-brand-primary" />
            <h2 className="mt-4 font-serif text-xl text-stone-900">Portal link not found</h2>
            <p className="mt-2 text-sm text-stone-500">
              This private link may have expired or been mistyped. Please contact the boutique for a
              fresh portal link.
            </p>
          </div>
        )}

        {!loading && bride && (
          <div className="space-y-6">
            
            {/* Dedicated "Bride Portal" App (PWA) Banner */}
            {showPwaBanner && (
              <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-2xl shadow-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
                 <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2.5 rounded-xl">
                      <Smartphone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Install the Bridal Portal App</h3>
                      <p className="text-xs text-rose-100 mt-0.5 max-w-sm leading-relaxed">
                        Keep track of your appointments, production status, and checklist right from your home screen.
                      </p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => setShowPwaBanner(false)}
                      className="text-xs text-rose-200 hover:text-white transition-colors"
                    >
                      Dismiss
                    </button>
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white text-brand-primary px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-stone-50 transition-colors">
                      <Download className="h-4 w-4" /> Install App
                    </button>
                 </div>
              </div>
            )}

            {/* Appointments */}
            <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50/60 px-6 py-4">
                <CalendarDays className="h-4 w-4 text-brand-primary" />
                <h2 className="font-serif text-lg text-stone-900">Your appointments</h2>
              </div>
              <div className="divide-y divide-stone-100">
                {upcoming.length === 0 && (
                  <p className="px-6 py-6 text-sm text-stone-500">
                    No upcoming appointments. Call {loc?.phone} or{' '}
                    <a href="/book" className="font-medium text-brand-primary hover:text-brand-primary">book online</a>.
                  </p>
                )}
                {upcoming.map((a) => {
                  const aloc = locationById(a.location);
                  return (
                    <div key={a.id} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{a.type}</p>
                        <p className="text-xs text-stone-500">
                          {formatDate(a.date)} at {a.time} · with {a.stylist}
                        </p>
                        <p className="text-[11px] text-stone-400">{aloc.business} · {aloc.address}</p>
                      </div>
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                          a.status === 'Confirmed'
                            ? 'bg-status-success/10 text-emerald-700 ring-emerald-200'
                            : 'bg-status-warning/10 text-status-warning ring-amber-200'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Contracts */}
            <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50/60 px-6 py-4">
                <FileSignature className="h-4 w-4 text-brand-primary" />
                <h2 className="font-serif text-lg text-stone-900">Your contract</h2>
              </div>
              <div className="divide-y divide-stone-100">
                {contracts.length === 0 && (
                  <p className="px-6 py-6 text-sm text-stone-500">No contracts on file yet.</p>
                )}
                {contracts.map((c) => (
                  <div key={c.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-800">{c.gown}</p>
                      <p className="text-xs text-stone-500">
                        {c.id} · Total {formatCents(c.amountCents)} · Deposit {formatCents(c.depositCents)}
                      </p>
                    </div>
                    {c.status === 'Signed' ? (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-status-success/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Signed {c.signedAt ? formatDate(c.signedAt.slice(0, 10)) : ''}
                      </span>
                    ) : (
                      <a
                        href={`/sign/${c.id}?t=${c.signToken}`}
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
                      >
                        <PenLine className="h-3.5 w-3.5" /> Review & sign
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Alterations progress */}
            <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50/60 px-6 py-4">
                <Scissors className="h-4 w-4 text-brand-primary" />
                <h2 className="font-serif text-lg text-stone-900">Alterations progress</h2>
              </div>
              <div className="divide-y divide-stone-100">
                {alterations.length === 0 && (
                  <p className="px-6 py-6 text-sm text-stone-500">
                    No alterations underway — we'll start tracking here after your first fitting.
                  </p>
                )}
                {alterations.map((job) => {
                  const progress = jobProgress(job);
                  return (
                    <div key={job.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-stone-800">{job.gown}</p>
                        <span className="text-xs font-semibold text-stone-600">{job.status}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-status-success' : 'bg-brand-primary'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-stone-500">
                        <span>{job.tasks.filter((t) => t.done).length} of {job.tasks.length} steps complete</span>
                        {job.nextFitting && <span>Next fitting: {formatDate(job.nextFitting)}</span>}
                        {job.dueDate && <span>Ready by: {formatDate(job.dueDate)}</span>}
                      </div>
                      <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {job.tasks.map((t, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${t.done ? 'text-status-success' : 'text-stone-200'}`} />
                            <span className={t.done ? 'text-stone-400 line-through' : 'text-stone-600'}>{t.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Fit profile — latest measurements on file */}
            {measurements.length > 0 && (
              <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-brand-primary" />
                    <h2 className="font-serif text-lg text-stone-900">Your fit profile</h2>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    Last measured {formatDate(measurements[0].takenOn)}
                    {measurements[0].takenBy && ` by ${measurements[0].takenBy}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-6 py-5 sm:grid-cols-4">
                  {MEASUREMENT_FIELDS.map((f) => (
                    <div key={String(f.key)}>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{f.label}</p>
                      <p className="text-sm font-semibold text-stone-800">{(measurements[0] as any)[f.key] || '—'}</p>
                    </div>
                  ))}
                </div>
                {measurements[0].notes && (
                  <p className="border-t border-stone-100 px-6 py-3 text-xs leading-relaxed text-stone-500">
                    {measurements[0].notes}
                  </p>
                )}
              </section>
            )}


            {/* Invoices & payments */}
            <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-brand-primary" />
                  <h2 className="font-serif text-lg text-stone-900">Balances & payments</h2>
                </div>
                {totalBalance > 0 && (
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-primary ring-1 ring-inset ring-focus-ring">
                    {formatCents(totalBalance)} due
                  </span>
                )}
              </div>
              <div className="divide-y divide-stone-100">
                {invoices.length === 0 && (
                  <p className="px-6 py-6 text-sm text-stone-500">No invoices on file.</p>
                )}
                {invoices.map((inv) => {
                  const balance = inv.amountCents - inv.paidCents;
                  return (
                    <div key={inv.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{inv.description}</p>
                        <p className="text-xs text-stone-500">
                          {inv.id} · {formatCents(inv.paidCents)} of {formatCents(inv.amountCents)} paid · Due {formatDate(inv.dueDate)}
                        </p>
                      </div>
                      {balance > 0 ? (
                        <a
                          href={`/pay/${inv.id}?t=${inv.payToken}`}
                          className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-stone-700"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Pay {formatCents(balance)}
                        </a>
                      ) : (
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-status-success/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paid in full
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Boutique contact */}
            {loc && (
              <section className="rounded-3xl border border-stone-200 bg-white px-6 py-5 shadow-sm">
                <p className="font-serif text-lg text-stone-900">{loc.business}</p>
                <div className="mt-2 flex flex-col gap-1.5 text-sm text-stone-600 sm:flex-row sm:gap-6">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-brand-primary" /> {loc.address}
                  </span>
                  <a href={`tel:${loc.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-primary">
                    <Phone className="h-4 w-4 text-brand-primary" /> {loc.phone}
                  </a>
                </div>
                <p className="mt-2 text-xs text-stone-400">
                  {loc.hours} · Your stylist: {bride.stylist}
                </p>
              </section>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-stone-400">
          This portal link is private to you — please don't share it. <br />
          VowOS · The Boutique · I Do Bridal Couture + Proper &amp; Company
        </p>
      </div>
    </div>
  );
}
