import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Gem, MapPin, Clock, Phone, CalendarHeart, CheckCircle2, AlertCircle, Video, ArrowLeft, CreditCard, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CardPaymentForm, { CardPaymentResult } from '@/components/vowos/CardPaymentForm';
import {
  LOCATIONS,
  LocationId,
  locationById,
  APPOINTMENT_TYPES,
  TIME_SLOTS,
  LOOKING_FOR_OPTIONS,
  BUDGET_RANGES,
  BOOKING_FEE_CENTS,
  budgetLabel,
  formatCents,
  VIRTUAL_CONSULT_BOOKING_URL,
  formatDate,
  Appointment,
} from '@/data/vowosData';


const inputCls =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-focus-ring';
const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500';

const TODAY = new Date().toISOString().slice(0, 10);
const FEE_LABEL = formatCents(BOOKING_FEE_CENTS);

export default function BookAppointment() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [weddingDate, setWeddingDate] = useState('');
  const [store, setStore] = useState<LocationId>('ido-br');
  const [type, setType] = useState<Appointment['type']>('Bridal Consultation');
  const [lookingFor, setLookingFor] = useState('');
  const [budgetCents, setBudgetCents] = useState(0);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [step, setStep] = useState<'details' | 'pay'>('details');
  const [error, setError] = useState(null as string | null);
  const [confirmed, setConfirmed] = useState<{ id: string; store: LocationId; date: string; time: string } | null>(null);

  const handleContinue = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !date || !time) {
      setError('Please fill in your name, email, and a preferred date & time.');
      return;
    }
    if (!lookingFor) {
      setError("Please tell us what you're looking for.");
      return;
    }
    if (!budgetCents) {
      setError('Please pick a budget range so we can pull the right gowns for you.');
      return;
    }
    if (date < TODAY) {
      setError('Please pick a date from today forward.');
      return;
    }
    setStep('pay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Called by CardPaymentForm AFTER the card has actually been charged. */
  const completeBooking = async (payment: CardPaymentResult) => {
    setError(null);

    const suffix = Date.now().toString().slice(-6);
    const apptId = `A-${suffix}`;

    // 1) Create the appointment request (Pending until staff confirm) — fee paid
    const { error: apptErr } = await supabase.from('appointments').insert({
      id: apptId,
      customer: name.trim(),
      type,
      date,
      time,
      stylist: 'Unassigned',
      status: 'Pending',
      location: store,
      looking_for: lookingFor,
      budget_cents: budgetCents,
      fee_paid: true,
    });
    if (apptErr) {
      setError(
        `Your card was charged (ref ${payment.paymentIntentId}) but we could not save the booking — please call the boutique at ${locationById(store).phone} and we will finish it by hand.`,
      );
      return;
    }

    // 2) Log a lead with her budget so the sales team can follow up (best effort)
    await supabase.from('leads').insert({
      id: `L-${suffix}`,
      name: name.trim(),
      email: email.trim(),
      source: 'Booking Page',
      budget_cents: budgetCents,
      wedding_date: weddingDate || date,
      stage: 'Appointment Set',
    });

    // 3) Record the real card payment in her communications timeline (best effort)
    await supabase.from('messages').insert({
      customer: name.trim(),
      channel: 'email',
      to_address: email.trim(),
      subject: `Booking fee received — ${apptId}`,
      body: `${formatCents(payment.totalCents)} charged to ${payment.brandLabel} (${FEE_LABEL} booking fee${payment.surchargeCents > 0 ? ` + ${formatCents(payment.surchargeCents)} ${payment.surchargePct}% card fee` : ''}) for ${type} on ${formatDate(date)} at ${time} (${locationById(store).short}). Looking for: ${lookingFor}. Budget: ${budgetLabel(budgetCents)}. Stripe ref ${payment.paymentIntentId}. Fee is credited toward her purchase.`,
      kind: 'payment',
      status: 'sent',
    });

    // 4) Add the bride to the boutique's contact list (CRM)
    try {
      await fetch('https://famous.ai/api/crm/6a5d5dc9d84ad34d886e72c1/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          sms_opt_in: smsOptIn === true,
          source: 'bride-booking-page',
          tags: ['bride', 'appointment-request', 'fee-paid', locationById(store).short],
        }),
      });
    } catch {
      // CRM subscribe is best-effort; the appointment itself is already saved
    }

    setConfirmed({ id: apptId, store, date, time });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const loc = locationById(store);

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Brand header */}
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-md">
            <Gem className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-serif text-lg leading-tight text-stone-900">I Do Bridal Couture · Proper &amp; Company</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">A The Boutique Family · Baton Rouge &amp; Covington, LA</p>
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Staff Portal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {confirmed ? (
          /* ─── Confirmation ─── */
          <div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-status-success" />
            <h1 className="mt-4 font-serif text-3xl text-stone-900">You're on the books!</h1>
            <p className="mt-2 text-sm text-stone-600">
              Request <span className="font-semibold">{confirmed.id}</span> — {formatDate(confirmed.date)} at {confirmed.time}
            </p>
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-status-success/10 px-4 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CreditCard className="h-3.5 w-3.5" /> {FEE_LABEL} booking fee paid — credited toward your purchase
            </div>
            <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-left text-sm text-stone-600 ring-1 ring-stone-200">
              <p className="font-medium text-stone-900">{locationById(confirmed.store).business} · {locationById(confirmed.store).city}</p>
              <p className="mt-1 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-primary" /> {locationById(confirmed.store).address}</p>
              <p className="mt-1 flex items-center gap-1.5"><Clock className="h-4 w-4 text-brand-primary" /> {locationById(confirmed.store).hours}</p>
              <p className="mt-1 flex items-center gap-1.5"><Phone className="h-4 w-4 text-brand-primary" /> {locationById(confirmed.store).phone}</p>
            </div>
            <p className="mt-4 text-xs text-stone-500">
              A stylist will confirm your visit shortly. Your request is marked <span className="font-semibold text-status-warning">Pending</span> until then.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => {
                  setConfirmed(null);
                  setStep('details');
                  setName(''); setEmail(''); setPhone(''); setDate(''); setTime(''); setWeddingDate('');
                  setLookingFor(''); setBudgetCents(0);
                }}

                className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                Book another visit
              </button>
              <a
                href={VIRTUAL_CONSULT_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                <Video className="h-4 w-4" /> Book a virtual consult
              </a>
            </div>
          </div>
        ) : step === 'pay' ? (
          /* ─── Step 2: $75 booking fee ─── */
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => setStep('details')}
              className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
            >
              <ChevronLeft className="h-4 w-4" /> Back to details
            </button>
            <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 bg-stone-50/60 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Reserve your visit</p>
                    <p className="mt-0.5 font-serif text-lg text-stone-900">{type}</p>
                    <p className="text-xs text-stone-500">
                      {formatDate(date)} at {time} · {loc.business} · {loc.city}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      Looking for {lookingFor} · Budget {budgetLabel(budgetCents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-3xl text-stone-900">{FEE_LABEL}</p>
                    <p className="text-[11px] text-stone-400">booking fee</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <div className="rounded-xl bg-brand-soft/70 p-3 text-xs leading-relaxed text-brand-secondary ring-1 ring-focus-ring">
                  A flat <span className="font-semibold">{FEE_LABEL} booking fee</span> reserves your private
                  styling suite and stylist. It is <span className="font-semibold">fully credited toward your purchase</span> when you say yes.
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-primary-hover ring-1 ring-inset ring-focus-ring">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <CardPaymentForm
                  baseCents={BOOKING_FEE_CENTS}
                  baseLabel="booking fee"
                  description={`Booking fee — ${type} · ${loc.short}`}
                  metadata={{ kind: 'booking-fee', customer: name.trim(), store, date, time }}
                  buttonLabel={`Pay & Reserve My Visit`}
                  onSuccess={completeBooking}
                />
                <p className="text-center text-[11px] text-stone-400">
                  Fee is credited toward your gown. Questions? Call {loc.phone}.
                </p>
              </div>

            </div>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-5">
            {/* ─── Left: pitch + locations ─── */}
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-primary">Book your visit</p>
              <h1 className="mt-2 font-serif text-4xl leading-tight text-stone-900">
                Say yes at one of our four Louisiana boutiques
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                Reserve a private styling appointment at I Do Bridal Couture or Proper &amp; Company. Pick your
                store, your day, and your time — our stylists will confirm within one business day. A flat{' '}
                <span className="font-semibold text-stone-800">{FEE_LABEL} booking fee</span> holds your suite and
                is credited toward your purchase.
              </p>

              <div className="mt-6 space-y-3">
                {LOCATIONS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setStore(l.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      store === l.id
                        ? l.accent === 'rose'
                          ? 'border-brand-primary bg-brand-soft/70 ring-2 ring-focus-ring'
                          : 'border-violet-400 bg-violet-50/70 ring-2 ring-violet-200'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-stone-900">{l.business}</p>
                    <p className={`text-xs font-medium ${l.accent === 'rose' ? 'text-brand-primary' : 'text-violet-500'}`}>{l.city}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500"><MapPin className="h-3.5 w-3.5" /> {l.address}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500"><Clock className="h-3.5 w-3.5" /> {l.hours} · {l.phone}</p>
                  </button>
                ))}
              </div>

              <a
                href={VIRTUAL_CONSULT_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white p-4 transition-colors hover:border-stone-400"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">Out of town? Book a virtual consult</p>
                  <p className="text-xs text-stone-500">Pick a video call time on our live calendar — opens in a new tab.</p>
                </div>
              </a>
            </div>

            {/* ─── Right: booking form ─── */}
            <div className="lg:col-span-3">
              <form onSubmit={handleContinue} className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-2">
                  <CalendarHeart className="h-5 w-5 text-brand-primary" />
                  <h2 className="font-serif text-2xl text-stone-900">Request your appointment</h2>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Booking at <span className="font-semibold text-stone-700">{loc.business} · {loc.city}</span> — change stores on the left.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Your name *</label>
                    <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Emma Landry" />
                  </div>
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="emma@email.com" />
                  </div>
                  <div>
                    <label className={labelCls}>Phone number (optional)</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(225) 555-0123" />
                  </div>
                  <div>
                    <label className={labelCls}>Wedding date (optional)</label>
                    <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Visit type *</label>
                    <div className="flex flex-wrap gap-2">
                      {APPOINTMENT_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                            type === t
                              ? 'border-brand-primary bg-brand-soft text-brand-primary ring-1 ring-rose-300'
                              : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>What are you looking for? *</label>
                    <div className="flex flex-wrap gap-2">
                      {LOOKING_FOR_OPTIONS.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setLookingFor(o)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                            lookingFor === o
                              ? 'border-violet-400 bg-violet-50 text-violet-600 ring-1 ring-violet-300'
                              : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Your budget *</label>
                    <div className="flex flex-wrap gap-2">
                      {BUDGET_RANGES.map((b) => (
                        <button
                          key={b.cents}
                          type="button"
                          onClick={() => setBudgetCents(b.cents)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                            budgetCents === b.cents
                              ? 'border-emerald-400 bg-status-success/10 text-emerald-700 ring-1 ring-emerald-300'
                              : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-stone-400">
                      Helps your stylist pull gowns you'll love — and can actually take home.
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>Preferred date *</label>
                    <input required type="date" min={TODAY} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Preferred time *</label>
                    <select required value={time} onChange={(e) => setTime(e.target.value)} className={inputCls}>
                      <option value="">Pick a time…</option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="mt-5 flex items-start gap-2.5 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={(e) => setSmsOptIn(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-primary focus:ring-focus-ring"
                  />
                  <span className="text-xs leading-relaxed text-stone-600">
                    Text me appointment updates. Msg &amp; data rates may apply. Reply STOP to unsubscribe.
                  </span>
                </label>

                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-primary-hover ring-1 ring-inset ring-focus-ring">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="mt-6 w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
                >
                  Continue to Payment — {FEE_LABEL} booking fee
                </button>
                <p className="mt-3 text-center text-[11px] text-stone-400">
                  A flat {FEE_LABEL} fee reserves your suite and is credited toward your purchase. A stylist confirms every request personally.
                </p>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        © 2026 The Boutique · I Do Bridal Couture + Proper &amp; Company · Baton Rouge &amp; Covington, LA
      </footer>
    </div>
  );
}
