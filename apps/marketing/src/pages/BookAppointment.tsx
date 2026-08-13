import { useState, FormEvent, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Gem, 
  MapPin, 
  Clock, 
  Phone, 
  CalendarHeart, 
  CheckCircle2, 
  AlertCircle, 
  Video, 
  ArrowLeft, 
  CreditCard, 
  ChevronLeft,
  ChevronRight,
  Store,
  Sparkles,
  CalendarDays,
  User,
  Image as ImageIcon
} from 'lucide-react';
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
import { Calendar } from "@/components/ui/calendar";

const TODAY_DATE = new Date();
const TODAY = TODAY_DATE.toISOString().slice(0, 10);
const FEE_LABEL = formatCents(BOOKING_FEE_CENTS);

// Steps for progressive disclosure
type BookingStep = 'location' | 'type' | 'datetime' | 'details' | 'pay' | 'confirmed';

export default function BookAppointment() {
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [step, setStep] = useState<BookingStep>('location');
  
  // Form State
  const [store, setStore] = useState<LocationId | null>(null);
  const [type, setType] = useState<Appointment['type'] | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [weddingDate, setWeddingDate] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [budgetCents, setBudgetCents] = useState(0);
  
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ id: string; store: LocationId; date: string; time: string } | null>(null);

  useEffect(() => {
    if ((window as any).__VOWOS_TENANT_CONFIG) {
      setTenantConfig((window as any).__VOWOS_TENANT_CONFIG);
    }
  }, []);

  // Skip location if only 1 location exists (not the case here, but good practice)
  useEffect(() => {
    if (LOCATIONS.length === 1 && !store) {
      setStore(LOCATIONS[0].id);
      setStep('type');
    }
  }, [store]);

  const brandName = tenantConfig?.name || 'VowOS';
  const brandColor = tenantConfig?.brand?.primary_color || '#1c1917'; // default stone-900

  const handleContinueDetails = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Please fill in your name and email.');
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
    setStep('pay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const completeBooking = async (payment: CardPaymentResult) => {
    setError(null);
    if (!store || !type || !date || !time) return;

    // Adjust for local timezone offset when getting ISO string
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    const dateStr = localDate.toISOString().slice(0, 10);
    
    const suffix = Date.now().toString().slice(-6);
    const apptId = `A-${suffix}`;

    const { data: newApptId, error: rpcErr } = await supabase.rpc('submit_public_appointment', {
      p_store_slug: store,
      p_customer_name: name.trim(),
      p_email: email.trim(),
      p_phone: phone.trim(),
      p_type: type,
      p_date: dateStr,
      p_time: time,
      p_looking_for: lookingFor,
      p_budget_cents: budgetCents,
      p_payment_intent_id: payment.paymentIntentId,
      p_total_cents: payment.totalCents
    });

    if (rpcErr || !newApptId) {
      setError(
        `Your card was charged (ref ${payment.paymentIntentId}) but we could not save the booking — please call the boutique at ${locationById(store).phone} and we will finish it by hand.`
      );
      return;
    }
    
    const finalApptId = typeof newApptId === 'string' ? newApptId : (newApptId as any).id || apptId;

    try {
      await fetch('/api/v1/tenant/subscribe', {
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
    } catch (err) {
      console.error(err);
    }

    setConfirmed({ id: finalApptId, store, date: dateStr, time });
    setStep('confirmed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentLoc = store ? locationById(store) : null;

  const steps = [
    { id: 'location', label: 'Location', icon: Store },
    { id: 'type', label: 'Service', icon: Sparkles },
    { id: 'datetime', label: 'Date & Time', icon: CalendarDays },
    { id: 'details', label: 'Details', icon: User },
    { id: 'pay', label: 'Confirm', icon: CreditCard }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  const resetBooking = () => {
    setConfirmed(null);
    setStep('location');
    setStore(null);
    setType(null);
    setDate(undefined);
    setTime('');
    setName(''); 
    setEmail(''); 
    setPhone(''); 
    setWeddingDate('');
    setLookingFor(''); 
    setBudgetCents(0);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans selection:bg-stone-200">
      {/* Premium Public Header */}
      <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              <Gem className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-serif text-lg leading-tight text-stone-900">{brandName}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Book Your Appointment</p>
            </div>
          </div>
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        
        {step !== 'confirmed' && (
          <div className="mb-10">
            {/* Progress Indicator */}
            <div className="relative">
              <div className="absolute left-0 top-1/2 hidden h-0.5 w-full -translate-y-1/2 bg-stone-200 sm:block" aria-hidden="true" />
              <ul className="relative flex w-full justify-between sm:justify-between flex-wrap sm:flex-nowrap gap-2 sm:gap-0">
                {steps.map((s, idx) => {
                  const isActive = step === s.id;
                  const isCompleted = currentStepIndex > idx;
                  const Icon = s.icon;
                  return (
                    <li key={s.id} className="flex items-center">
                      <div className="group flex flex-col items-center sm:flex-row sm:gap-3">
                        <span 
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-[#faf8f5] transition-colors
                            ${isActive ? 'bg-stone-900 text-white' : 
                              isCompleted ? 'bg-stone-200 text-stone-900' : 'bg-stone-100 text-stone-400'}`}
                        >
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </span>
                        <span className={`hidden sm:block text-xs font-medium uppercase tracking-wider ${isActive ? 'text-stone-900' : 'text-stone-400'}`}>
                          {s.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl">
          
          {/* STEP 1: LOCATION */}
          {step === 'location' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 text-center sm:text-left">
                <h1 className="font-serif text-3xl sm:text-4xl text-stone-900">Choose a location</h1>
                <p className="mt-2 text-sm text-stone-500">Select the boutique you'd like to visit.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {LOCATIONS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setStore(l.id);
                      setStep('type');
                    }}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm transition-all hover:border-stone-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-stone-900"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-600 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-xl text-stone-900">{l.business}</h3>
                    <p className="mt-1 text-sm font-medium text-stone-500">{l.city}</p>
                    <div className="mt-4 space-y-1.5 text-xs text-stone-500">
                      <p>{l.address}</p>
                      <p>{l.hours}</p>
                      <p>{l.phone}</p>
                    </div>
                    <div className="mt-6 flex items-center text-sm font-medium text-stone-900 opacity-0 transition-opacity group-hover:opacity-100">
                      Select Location <ChevronRight className="ml-1 h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: APPOINTMENT TYPE */}
          {step === 'type' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setStep('location')} className="mb-6 inline-flex items-center text-sm font-medium text-stone-500 hover:text-stone-900">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to locations
              </button>
              <div className="mb-8">
                <h1 className="font-serif text-3xl sm:text-4xl text-stone-900">What brings you in?</h1>
                <p className="mt-2 text-sm text-stone-500">Choose the type of appointment for your visit to {currentLoc?.city}.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {APPOINTMENT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setType(t);
                      setStep('datetime');
                    }}
                    className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm transition-all hover:border-stone-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-stone-900"
                  >
                    <div className="flex w-full items-start justify-between">
                      <h3 className="font-serif text-lg text-stone-900">{t}</h3>
                      <Sparkles className="h-5 w-5 text-stone-300 transition-colors group-hover:text-stone-900" />
                    </div>
                    <p className="mt-2 text-sm text-stone-500 line-clamp-2">
                      A private styling experience tailored to you. Includes a dedicated stylist and suite.
                    </p>
                    <div className="mt-6 flex items-center text-sm font-medium text-stone-900 opacity-0 transition-opacity group-hover:opacity-100">
                      Select Service <ChevronRight className="ml-1 h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: DATE & TIME */}
          {step === 'datetime' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setStep('type')} className="mb-6 inline-flex items-center text-sm font-medium text-stone-500 hover:text-stone-900">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to services
              </button>
              <div className="mb-8">
                <h1 className="font-serif text-3xl sm:text-4xl text-stone-900">Select a time</h1>
                <p className="mt-2 text-sm text-stone-500">
                  {type} at {currentLoc?.business} in {currentLoc?.city}.
                </p>
              </div>
              
              <div className="grid gap-8 md:grid-cols-[auto_1fr]">
                {/* VowOS Premium Calendar Component */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm w-fit mx-auto md:mx-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => {
                      // Adjust for local timezone offset when comparing
                      const offset = d.getTimezoneOffset() * 60000;
                      const localDate = new Date(d.getTime() - offset);
                      return localDate.toISOString().slice(0, 10) < TODAY;
                    }}
                    className="rounded-md"
                  />
                </div>
                
                {/* Time Slots */}
                <div>
                  <h3 className="font-medium text-stone-900 mb-4">
                    {date ? formatDate(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)) : "Select a date to see times"}
                  </h3>
                  
                  {date ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {TIME_SLOTS.map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setTime(t);
                            setStep('details');
                          }}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-stone-900
                            ${time === t 
                              ? 'border-stone-900 bg-stone-900 text-white shadow-md' 
                              : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 text-sm text-stone-400">
                      Waiting for date selection...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CUSTOMER DETAILS */}
          {step === 'details' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setStep('datetime')} className="mb-6 inline-flex items-center text-sm font-medium text-stone-500 hover:text-stone-900">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to time selection
              </button>
              
              <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-6">
                <div>
                  <h1 className="font-serif text-3xl sm:text-4xl text-stone-900">Your details</h1>
                  <p className="mt-2 text-sm text-stone-500">Let us know a bit about you to prepare for your visit.</p>
                </div>
                <div className="text-left sm:text-right text-sm text-stone-600 bg-stone-100 px-4 py-2 rounded-lg w-fit">
                  <p className="font-medium text-stone-900">{date ? formatDate(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)) : ''} at {time}</p>
                  <p className="text-xs text-stone-500">{type}</p>
                </div>
              </div>

              <form onSubmit={handleContinueDetails} className="space-y-8">
                
                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="font-serif text-xl text-stone-900">Contact Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700">Full Name *</label>
                      <input 
                        required 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900" 
                        placeholder="Emma Landry" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700">Email Address *</label>
                      <input 
                        required 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900" 
                        placeholder="emma@example.com" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700">Phone Number (Optional)</label>
                      <input 
                        type="tel" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900" 
                        placeholder="(555) 123-4567" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-700">Wedding Date (Optional)</label>
                      <input 
                        type="date" 
                        value={weddingDate} 
                        onChange={(e) => setWeddingDate(e.target.value)} 
                        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900" 
                      />
                    </div>
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-6 pt-4">
                  <h3 className="font-serif text-xl text-stone-900">Styling Details</h3>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-stone-700">What are you looking for? *</label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {LOOKING_FOR_OPTIONS.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setLookingFor(o)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                            lookingFor === o
                              ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-sm font-medium text-stone-700">What is your gown budget? *</label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {BUDGET_RANGES.map((b) => (
                        <button
                          key={b.cents}
                          type="button"
                          onClick={() => setBudgetCents(b.cents)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                            budgetCents === b.cents
                              ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-stone-500">
                      This helps your stylist pre-pull gowns you'll love that fit within your comfort zone.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-stone-100 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsOptIn}
                      onChange={(e) => setSmsOptIn(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <span className="text-sm text-stone-600">
                      Text me appointment updates and reminders. Msg &amp; data rates may apply.
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 border border-rose-200">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" /> {error}
                  </div>
                )}

                <div className="pt-4 border-t border-stone-200 flex justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto rounded-xl bg-stone-900 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2"
                  >
                    Continue to Payment
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 5: REVIEW & PAY */}
          {step === 'pay' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setStep('details')} className="mb-6 inline-flex items-center text-sm font-medium text-stone-500 hover:text-stone-900">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to details
              </button>
              
              <div className="mb-8">
                <h1 className="font-serif text-3xl sm:text-4xl text-stone-900">Review &amp; Reserve</h1>
                <p className="mt-2 text-sm text-stone-500">A {FEE_LABEL} fee reserves your private styling suite.</p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="border-b border-stone-100 bg-stone-50/50 p-6 sm:p-8">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Appointment</p>
                      <p className="font-serif text-xl text-stone-900">{type}</p>
                      <p className="mt-1 text-sm font-medium text-stone-700">{date ? formatDate(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)) : ''} at {time}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Location</p>
                      <p className="font-medium text-stone-900">{currentLoc?.business}</p>
                      <p className="mt-1 text-sm text-stone-600">{currentLoc?.address}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="mb-8 rounded-xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-600 border border-stone-100">
                    A flat <span className="font-semibold text-stone-900">{FEE_LABEL} booking fee</span> reserves your private
                    styling suite and stylist. It is <span className="font-semibold text-stone-900">fully credited toward your purchase</span> when you say yes!
                  </div>

                  {error && (
                    <div className="mb-6 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 border border-rose-200">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <CardPaymentForm
                    baseCents={BOOKING_FEE_CENTS}
                    baseLabel="booking fee"
                    description={`Booking fee — ${type} · ${currentLoc?.short}`}
                    metadata={{ kind: 'booking-fee', customer: name.trim(), store: store!, date: date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,10) : '', time }}
                    buttonLabel={`Reserve My Visit — ${FEE_LABEL}`}
                    onSuccess={completeBooking}
                  />
                  <p className="mt-4 text-center text-xs text-stone-400">
                    Secure checkout powered by Stripe. Questions? Call {currentLoc?.phone}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: CONFIRMED */}
          {step === 'confirmed' && confirmed && (
             <div className="animate-in fade-in zoom-in-95 duration-700 mx-auto max-w-xl text-center pt-8">
               <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
                 <CheckCircle2 className="h-10 w-10 text-emerald-500" />
               </div>
               <h1 className="font-serif text-4xl text-stone-900 mb-4">You're on the books!</h1>
               <p className="text-lg text-stone-600 mb-8">
                 We can't wait to see you, <span className="font-semibold text-stone-900">{name.split(' ')[0]}</span>.
               </p>
               
               <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm text-left relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-stone-900" />
                 <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Appointment Details</p>
                 <p className="font-serif text-2xl text-stone-900">{type}</p>
                 <p className="mt-1 text-lg font-medium text-stone-700">{formatDate(confirmed.date)} at {confirmed.time}</p>
                 
                 <div className="mt-6 border-t border-stone-100 pt-6">
                   <p className="font-medium text-stone-900">{locationById(confirmed.store).business}</p>
                   <p className="mt-1 text-sm text-stone-500 flex items-center gap-2"><MapPin className="h-4 w-4" /> {locationById(confirmed.store).address}</p>
                   <p className="mt-1 text-sm text-stone-500 flex items-center gap-2"><Phone className="h-4 w-4" /> {locationById(confirmed.store).phone}</p>
                 </div>
               </div>

               <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                 <button
                   onClick={resetBooking}
                   className="rounded-xl border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:bg-stone-50"
                 >
                   Book another visit
                 </button>
               </div>
               
               <p className="mt-8 text-xs text-stone-400">
                 A confirmation email has been sent to {email}.<br/>
                 Booking ID: {confirmed.id}
               </p>
             </div>
          )}
          
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-50/50 py-8 text-center">
        <p className="text-xs text-stone-400">
          © {TODAY_DATE.getFullYear()} {brandName} · Powered by VowOS
        </p>
      </footer>
    </div>
  );
}
