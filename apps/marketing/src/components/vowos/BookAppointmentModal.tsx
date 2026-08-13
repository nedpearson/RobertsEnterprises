import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, CreditCard, Loader2, MailCheck, Pencil } from 'lucide-react';
import {
  Appointment,
  LocationId,
  locationById,
  teamMembers,
  APPOINTMENT_TYPES,
  TIME_SLOTS,
  LOOKING_FOR_OPTIONS,
  BUDGET_RANGES,
  BOOKING_FEE_CENTS,
  formatCents,
} from '@/data/vowosData';
import { useVowosData, NewAppointmentInput } from '@/contexts/VowosDataContext';
import { toast } from '@vowos/design-system';
import { Modal, inputCls, btnPrimary, btnSecondary } from './ui';
import { LocationSelect } from './LocationSelect';
import {
  sendAndLogMessage,
  appointmentConfirmationTemplates,
  appointmentRescheduleTemplates,
  isEmail,
  isPhone,
} from '@/lib/messaging';
import { fetchBookingFeeCents } from '@/lib/settings';


const OTHER = '__other__';

const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500';
const FEE_LABEL = formatCents(BOOKING_FEE_CENTS);


export default function BookAppointmentModal({
  open,
  onClose,
  appointment,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal becomes an edit/reschedule form for this appointment. */
  appointment?: Appointment | null;
  /** Prefills for new bookings (e.g. clicking a calendar cell books that day/stylist). */
  defaults?: { date?: string; time?: string; stylist?: string; request?: any } | null;
}) {

  const {
    brides,
    leads,
    allBrides,
    allAppointments,
    activeLocation,
    addAppointment,
    updateAppointment,
  } = useVowosData();
  const isEdit = Boolean(appointment);

  const [brideChoice, setBrideChoice] = useState('');
  const [customName, setCustomName] = useState('');
  const [type, setType] = useState<Appointment['type']>('Bridal Consultation');
  const [location, setLocation] = useState<LocationId>('ido-br');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [stylist, setStylist] = useState(teamMembers[0]);
  const [lookingFor, setLookingFor] = useState('');
  const [budgetCents, setBudgetCents] = useState(0);
  const [feeCollected, setFeeCollected] = useState(true);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dynamicBookingFee, setDynamicBookingFee] = useState(BOOKING_FEE_CENTS);
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    fetchBookingFeeCents(location).then(fee => {
      setDynamicBookingFee(fee);
    }).catch(console.error);
  }, [location]);


  // Pre-fill the form when opening in edit mode; reset for booking mode
  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setBrideChoice('');
      setCustomName('');
      setType(appointment.type);
      setLocation(appointment.location);
      setDate(appointment.date);
      // Existing times should always be one of our slots, but keep whatever it is
      setTime(appointment.time);
      setStylist(appointment.stylist);
      setLookingFor(appointment.lookingFor);
      setBudgetCents(appointment.budgetCents);
      setFeeCollected(appointment.feePaid);
    } else {
      const hasRequestCustomer = !!defaults?.request?.customer?.name;
      setBrideChoice(hasRequestCustomer ? OTHER : '');
      setCustomName(defaults?.request?.customer?.name || '');
      setType((defaults?.request?.type as Appointment['type']) || 'Bridal Consultation');
      // Book into the store the staffer is currently viewing
      setLocation(activeLocation === 'all' ? 'ido-br' : activeLocation);
      // Calendar cells pass prefills (book this day / this stylist / this slot)
      setDate(defaults?.date ?? '');
      setTime(defaults?.time ?? '');
      setStylist(defaults?.stylist ?? teamMembers[0]);
      setLookingFor(defaults?.request?.looking_for || '');
      setBudgetCents(0);
      setFeeCollected(true);
    }
    setNotify(true);
    setError('');

  }, [open, appointment, activeLocation, defaults]);



  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleAISuggest = () => {
    setIsSuggesting(true);
    setTimeout(() => {
      // AI Logic: Find an available slot over the next 7 days, avoiding existing appointments
      let foundDate = '';
      let foundTime = '';
      let foundStylist = '';
      
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dStr = d.toISOString().slice(0, 10);
        
        // Skip Sundays (0) if you want, but this is generic
        for (const t of ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM']) {
          for (const s of teamMembers) {
            const conflict = allAppointments.some(a => 
              a.date === dStr && a.time === t && a.stylist === s && a.status !== 'Cancelled'
            );
            if (!conflict) {
              foundDate = dStr;
              foundTime = t;
              foundStylist = s;
              break;
            }
          }
          if (foundDate) break;
        }
        if (foundDate) break;
      }
      
      if (foundDate) {
        setDate(foundDate);
        setTime(foundTime);
        setStylist(foundStylist);
        toast({ 
          title: '✨ AI Smart Suggestion Applied', 
          description: `Found an open slot with ${foundStylist} on ${foundDate} at ${foundTime}.` 
        });
      } else {
        toast({ 
          title: 'No availability', 
          description: 'No openings found in the next 7 days.',
          variant: 'destructive'
        });
      }
      setIsSuggesting(false);
    }, 800);
  };

  const customerName = isEdit
    ? appointment!.customer
    : brideChoice === OTHER
      ? customName.trim()
      : brideChoice;

  // A stylist can only be in one place at a time, so check across every store.
  const conflict = useMemo(() => {
    if (!date || !time || !stylist) return null;
    return (
      allAppointments.find(
        (a) =>
          a.stylist === stylist &&
          a.date === date &&
          a.time === time &&
          a.status !== 'Completed' &&
          a.status !== 'Cancelled' &&
          a.id !== appointment?.id, // an appointment never conflicts with itself

      ) || null
    );
  }, [allAppointments, date, time, stylist, appointment]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  // Bride record (for email/phone) matching whoever the appointment is for
  const contact = useMemo(
    () => allBrides.find((b) => b.name === customerName) ?? null,
    [allBrides, customerName],
  );
  const canNotify = !!contact && (isEmail(contact.email) || isPhone(contact.phone));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) {
      setError(brideChoice === OTHER ? "Please type the lead's name." : 'Please choose a bride.');
      return;
    }
    if (!isEdit && !lookingFor) {
      setError("Please pick what she's looking for.");
      return;
    }
    if (!isEdit && !budgetCents) {
      setError('Please pick her budget range.');
      return;
    }
    if (!date) {
      setError('Please pick a date.');
      return;
    }
    if (!time) {
      setError('Please pick a time.');
      return;
    }
    setError('');
    setSaving(true);
    let ok: boolean;
    if (isEdit) {
      ok = await updateAppointment(appointment!.id, { type, date, time, stylist, location });
    } else {
      const input: NewAppointmentInput = {
        customer: customerName,
        type,
        date,
        time,
        stylist,
        location,
        lookingFor,
        budgetCents,
        feePaid: feeCollected,
      };
      ok = await addAppointment(input);
    }

    // Email/text confirmation (new bookings) or reschedule notice (edits)
    const sendResults: string[] = [];
    if (ok && notify && canNotify && contact) {
      const apptForMsg: Appointment = {
        id: appointment?.id ?? 'new',
        customer: customerName,
        type,
        date,
        time,
        stylist,
        status: 'Confirmed',
        location,
        lookingFor,
        budgetCents,
        feePaid: feeCollected,
      };

      const tpl = isEdit
        ? appointmentRescheduleTemplates(apptForMsg)
        : appointmentConfirmationTemplates(apptForMsg);
      if (isEmail(contact.email)) {
        const r = await sendAndLogMessage({
          channel: 'email',
          to: contact.email,
          subject: tpl.emailSubject,
          body: tpl.emailText,
          html: tpl.emailHtml,
          customer: customerName,
          kind: isEdit ? 'reschedule' : 'confirmation',
        });
        sendResults.push(r.ok ? 'email sent' : 'email failed');
      }
      if (isPhone(contact.phone)) {
        const r = await sendAndLogMessage({
          channel: 'sms',
          to: contact.phone,
          body: tpl.sms,
          customer: customerName,
          kind: isEdit ? 'reschedule' : 'confirmation',
        });
        sendResults.push(r.ok ? 'text sent' : 'text failed');
      }
    }

    setSaving(false);
    if (ok) {
      toast({
        title: isEdit ? 'Appointment rescheduled — calendar updated' : 'Appointment booked',
        description: `${customerName} · ${type} with ${stylist} at ${time} — ${locationById(location).short}${
          sendResults.length > 0 ? ` · ${sendResults.join(' · ')}` : ''
        }.`,
      });
      handleClose();
    }
  };


  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Appointment' : 'Book Appointment'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isEdit ? (
          <div>
            <span className={labelCls}>Bride</span>
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
              {appointment!.customer}
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="ba-bride" className={labelCls}>
              Bride
            </label>
            <select
              id="ba-bride"
              value={brideChoice}
              onChange={(e) => setBrideChoice(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose a bride…</option>
              {brides.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name} · {b.stylist}
                </option>
              ))}
              <option value={OTHER}>Someone else (lead / walk-in)…</option>
            </select>
            {brideChoice === OTHER && (
              <>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Type the lead's name"
                  list="ba-lead-names"
                  className={`${inputCls} mt-2`}
                  autoFocus
                />
                <datalist id="ba-lead-names">
                  {leads.map((l) => (
                    <option key={l.id} value={l.name} />
                  ))}
                </datalist>
              </>
            )}
          </div>
        )}

        <div>
          <label htmlFor="ba-location" className={labelCls}>
            Store location
          </label>
          <LocationSelect id="ba-location" value={location} onChange={setLocation} />
          <p className="mt-1 text-[11px] text-stone-400">
            {locationById(location).address} · {locationById(location).hours}
          </p>
        </div>

        <div>
          <label htmlFor="ba-type" className={labelCls}>
            Appointment type
          </label>
          <select
            id="ba-type"
            value={type}
            onChange={(e) => setType(e.target.value as Appointment['type'])}
            className={inputCls}
          >
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ba-looking" className={labelCls}>
              Looking for
            </label>
            <select
              id="ba-looking"
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose…</option>
              {/* Keep a non-standard existing value selectable when editing */}
              {lookingFor && !LOOKING_FOR_OPTIONS.includes(lookingFor as any) && (
                <option value={lookingFor}>{lookingFor}</option>
              )}
              {LOOKING_FOR_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ba-budget" className={labelCls}>
              Budget
            </label>
            <select
              id="ba-budget"
              value={budgetCents}
              onChange={(e) => setBudgetCents(parseInt(e.target.value, 10) || 0)}
              className={inputCls}
            >
              <option value={0}>Choose a range…</option>
              {BUDGET_RANGES.map((b) => (
                <option key={b.cents} value={b.cents}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isEdit && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border-subtle bg-brand-soft/60 p-3">
            <input
              type="checkbox"
              checked={feeCollected}
              onChange={(e) => setFeeCollected(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-primary focus:ring-focus-ring"
            />
            <span className="text-xs leading-relaxed text-brand-secondary">
              <span className="flex items-center gap-1 font-semibold">
                <CreditCard className="h-3.5 w-3.5" /> {formatCents(dynamicBookingFee)} booking fee collected
              </span>
              Every booking carries a flat {formatCents(dynamicBookingFee)} fee, credited toward her purchase. Uncheck if
              collecting at check-in instead.
            </span>
          </label>
        )}


        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-stone-900">Schedule</label>
          <button
            type="button"
            onClick={handleAISuggest}
            disabled={isSuggesting}
            className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
          >
            {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>✨</span>}
            AI Smart Suggest
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ba-date" className={labelCls}>
              Date
            </label>
            <input
              id="ba-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ba-time" className={labelCls}>
              Time
            </label>
            <select
              id="ba-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputCls}
            >
              <option value="">Pick a time…</option>
              {/* Keep a non-standard existing time selectable when editing */}
              {time && !TIME_SLOTS.includes(time) && <option value={time}>{time}</option>}
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ba-stylist" className={labelCls}>
            Stylist
          </label>
          <select
            id="ba-stylist"
            value={stylist}
            onChange={(e) => setStylist(e.target.value)}
            className={inputCls}
          >
            {/* Keep a stylist no longer on the roster selectable when editing */}
            {stylist && !teamMembers.includes(stylist) && (
              <option value={stylist}>{stylist}</option>
            )}
            {teamMembers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {conflict && (
          <div className="flex items-start gap-2.5 rounded-xl border border-status-warning/20 bg-status-warning/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-warning" />
            <p className="text-xs leading-relaxed text-amber-800">
              <span className="font-semibold">Scheduling conflict:</span> {conflict.stylist} already
              has {conflict.customer} ({conflict.type}) at {conflict.time} on this date at{' '}
              {locationById(conflict.location).short}. You can still {isEdit ? 'save' : 'book'}, but
              consider another time or stylist.
            </p>
          </div>
        )}

        {/* Confirmation / reschedule notice */}
        {canNotify && contact ? (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-emerald-200 bg-status-success/10/60 p-3">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-status-success focus:ring-emerald-400"
            />
            <span className="text-xs leading-relaxed text-emerald-800">
              <span className="flex items-center gap-1 font-semibold">
                <MailCheck className="h-3.5 w-3.5" />
                {isEdit ? 'Send reschedule notice' : 'Send booking confirmation'}
              </span>
              {isEmail(contact.email) && `Email to ${contact.email}`}
              {isEmail(contact.email) && isPhone(contact.phone) && ' · '}
              {isPhone(contact.phone) && `Text to ${contact.phone}`}
            </span>
          </label>
        ) : (
          customerName && (
            <p className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-500">
              No email or phone on file for {customerName} — no confirmation will be sent. Add contact
              details in Brides to enable automatic confirmations.
            </p>
          )
        )}

        {error && <p className="text-sm text-brand-primary">{error}</p>}

        <label className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3 mt-4">
          <input
            type="checkbox"
            required
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-primary focus:ring-brand-primary"
          />
          <span className="text-xs leading-relaxed text-stone-700">
            I agree to the <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Cancellation Policy</a>. I understand that booking fees may apply and that data is processed in accordance with the Privacy Policy.
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={handleClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving || !consentChecked} className={`${btnPrimary} disabled:opacity-60`}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            {saving
              ? isEdit
                ? 'Saving…'
                : 'Booking…'
              : conflict
                ? isEdit
                  ? 'Save Anyway'
                  : 'Book Anyway'
                : isEdit
                  ? 'Save Changes'
                  : 'Book Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
