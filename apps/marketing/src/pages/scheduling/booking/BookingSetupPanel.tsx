/**
 * The four things that must exist before any request can become an appointment.
 *
 * Production has 3,705 booking requests and zero appointments. Not because
 * booking is broken in an interesting way — because there are no suites, no
 * appointment types, nobody marked as able to take one, and no published
 * shifts. Every assignment path gates on data that was never entered, and the
 * UI's only feedback was an empty list.
 *
 * So this is a checklist that says what is missing and lets it be fixed in
 * place. "No availability" and "you never told us how long an appointment is"
 * are different problems and must never look the same.
 */
import React, { useMemo, useState } from 'react';
import {
  useBookingReadiness,
  useBookingRooms,
  useBookingServices,
  useBookingEligibility,
  useCreateRoom,
  useCreateService,
  useSetEligibility,
  type ReadinessStep,
} from '@/lib/services/bookingService';

interface Props {
  businessId: string | undefined;
  locationId?: string | null;
  /** Rendered inside the queue when nothing is bookable; collapsible elsewhere. */
  defaultOpen?: boolean;
}

const STEP_ORDER: ReadinessStep['key'][] = ['suites', 'services', 'eligibility', 'shifts'];

export const BookingSetupPanel: React.FC<Props> = ({ businessId, locationId, defaultOpen = false }) => {
  const readiness = useBookingReadiness(businessId);
  const [openStep, setOpenStep] = useState<ReadinessStep['key'] | null>(null);

  const steps = useMemo(() => {
    const byKey = new Map((readiness.data?.steps ?? []).map((step) => [step.key, step]));
    return STEP_ORDER.map((key) => byKey.get(key)).filter(Boolean) as ReadinessStep[];
  }, [readiness.data]);

  const firstIncomplete = steps.find((step) => !step.done)?.key ?? null;
  const activeStep = openStep ?? (defaultOpen ? firstIncomplete : null);

  if (readiness.isLoading) {
    return <div className="p-4 text-sm text-gray-500">Checking what you need to start booking…</div>;
  }
  if (readiness.error) {
    return (
      <div className="p-4 text-sm text-red-600">
        Could not check booking setup: {(readiness.error as Error).message}
      </div>
    );
  }
  if (readiness.data?.ready && !openStep) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm text-green-900">
          Everything is set up. Open a request and pick a time to book it.
        </p>
        <button
          type="button"
          className="text-xs font-medium text-green-800 underline"
          onClick={() => setOpenStep('suites')}
        >
          Review setup
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50">
      <div className="border-b border-amber-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-amber-900">Before you can book, four things need to exist</h3>
        <p className="mt-1 text-xs text-amber-800">
          Requests are arriving and being stored correctly. They cannot become appointments until these are filled in.
        </p>
      </div>

      <ol className="divide-y divide-amber-200">
        {steps.map((step, index) => (
          <li key={step.key}>
            <button
              type="button"
              onClick={() => setOpenStep(activeStep === step.key ? null : step.key)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-amber-100/60"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step.done ? 'bg-green-600 text-white' : 'bg-amber-200 text-amber-900'
                }`}
              >
                {step.done ? '✓' : index + 1}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-gray-900">{step.label}</span>
                <span className="block text-xs text-gray-600">{step.detail}</span>
              </span>
            </button>

            {activeStep === step.key && (
              <div className="border-t border-amber-200 bg-white px-4 py-4">
                {step.key === 'suites' && <SuiteEditor businessId={businessId} locationId={locationId} />}
                {step.key === 'services' && <ServiceEditor businessId={businessId} />}
                {step.key === 'eligibility' && <EligibilityEditor businessId={businessId} />}
                {step.key === 'shifts' && <ShiftGuidance />}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

const fieldClass =
  'w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-gray-900 focus:outline-none';
const buttonClass =
  'rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50';

/**
 * Suites.
 *
 * The queue currently shows "Suite A - Rose Bridal Suite" on every card. That
 * string is a ternary on the enquiry's occasion field — it has never touched
 * the rooms table, which is empty. Whatever is typed here is the first real
 * suite this tenant has ever had.
 */
const SuiteEditor: React.FC<{ businessId: string | undefined; locationId?: string | null }> = ({
  businessId,
  locationId,
}) => {
  const rooms = useBookingRooms(businessId);
  const createRoom = useCreateRoom(businessId);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [roomType, setRoomType] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await createRoom.mutateAsync({
      name: name.trim(),
      capacity,
      roomType: roomType.trim() || null,
      locationId: locationId ?? null,
    });
    setName('');
    setRoomType('');
    setCapacity(1);
  };

  return (
    <div className="space-y-3">
      {(rooms.data ?? []).length > 0 && (
        <ul className="space-y-1">
          {(rooms.data ?? []).map((room) => (
            <li key={room.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-900">{room.name}</span>
              <span className="text-xs text-gray-500">
                seats {room.capacity}
                {room.room_type ? ` · ${room.room_type}` : ''}
                {room.active ? '' : ' · inactive'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr,1fr,1fr,auto]">
        <input className={fieldClass} placeholder="Suite name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className={fieldClass}
          placeholder="Type (optional)"
          value={roomType}
          onChange={(e) => setRoomType(e.target.value)}
        />
        <input
          className={fieldClass}
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value) || 1)}
          aria-label="How many appointments can run here at once"
        />
        <button className={buttonClass} disabled={createRoom.isPending || !name.trim()}>
          Add
        </button>
      </form>
      <p className="text-xs text-gray-500">
        Capacity is how many appointments can run in here at once — 1 for a private fitting room, more for a shared lounge.
      </p>
      {createRoom.error && <p className="text-xs text-red-600">{(createRoom.error as Error).message}</p>}
    </div>
  );
};

/**
 * Appointment types.
 *
 * Duration is the load-bearing field. Without it there is no end time, which is
 * why the old assign path hardcoded "+ 1 hour" onto a date that was midnight.
 */
const ServiceEditor: React.FC<{ businessId: string | undefined }> = ({ businessId }) => {
  const services = useBookingServices(businessId);
  const createService = useCreateService(businessId);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(90);
  const [cleanup, setCleanup] = useState(15);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || duration <= 0) return;
    await createService.mutateAsync({
      name: name.trim(),
      durationMinutes: duration,
      cleanupBufferMinutes: cleanup,
    });
    setName('');
  };

  return (
    <div className="space-y-3">
      {(services.data ?? []).length > 0 && (
        <ul className="space-y-1">
          {(services.data ?? []).map((service) => (
            <li key={service.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-900">{service.name}</span>
              <span className="text-xs text-gray-500">
                {service.duration_minutes} min
                {service.cleanup_buffer_minutes ? ` + ${service.cleanup_buffer_minutes} min turnaround` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr,1fr,1fr,auto]">
        <input
          className={fieldClass}
          placeholder="e.g. Bridal Appointment"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={fieldClass}
          type="number"
          min={15}
          step={15}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value) || 0)}
          aria-label="Length in minutes"
        />
        <input
          className={fieldClass}
          type="number"
          min={0}
          step={5}
          value={cleanup}
          onChange={(e) => setCleanup(Number(e.target.value) || 0)}
          aria-label="Turnaround minutes"
        />
        <button className={buttonClass} disabled={createService.isPending || !name.trim()}>
          Add
        </button>
      </form>
      <p className="text-xs text-gray-500">
        Length, then turnaround. Turnaround blocks the consultant's diary after the bride leaves without moving her
        appointment time — it is what stops two parties meeting in the doorway.
      </p>
      {createService.error && <p className="text-xs text-red-600">{(createService.error as Error).message}</p>}
    </div>
  );
};

/**
 * Who can take what.
 *
 * The request drawer has a "Staffing" tab headed ELIGIBLE EMPLOYEES that lists
 * every member of the business — it has never consulted eligibility, a shift,
 * or the requested date. It is a roster wearing an eligibility label. This grid
 * is the real thing, and the slot engine reads it.
 */
const EligibilityEditor: React.FC<{ businessId: string | undefined }> = ({ businessId }) => {
  const eligibility = useBookingEligibility(businessId);
  const services = useBookingServices(businessId);
  const setEligibility = useSetEligibility(businessId);

  const active = useMemo(() => {
    const set = new Set<string>();
    for (const row of eligibility.data?.eligibility ?? []) {
      if (row.active) set.add(`${row.employeeId}::${row.serviceId}`);
    }
    return set;
  }, [eligibility.data]);

  const team = eligibility.data?.team ?? [];
  const serviceList = (services.data ?? []).filter((service) => service.active);

  if (serviceList.length === 0) {
    return <p className="text-sm text-gray-600">Add an appointment type first — there is nothing to be eligible for yet.</p>;
  }
  if (team.length === 0) {
    return <p className="text-sm text-gray-600">No active team members. Invite your consultants under Team.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-1 pr-4 font-medium">Consultant</th>
              {serviceList.map((service) => (
                <th key={service.id} className="px-2 py-1 font-medium">{service.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {team.map((member) => (
              <tr key={member.employeeId}>
                <td className="py-2 pr-4">
                  <span className="text-gray-900">{member.name}</span>
                  {member.role && <span className="ml-1 text-xs text-gray-500">({member.role})</span>}
                </td>
                {serviceList.map((service) => {
                  const key = `${member.employeeId}::${service.id}`;
                  const checked = active.has(key);
                  return (
                    <td key={service.id} className="px-2 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        disabled={setEligibility.isPending}
                        aria-label={`${member.name} can take ${service.name}`}
                        onChange={(event) =>
                          setEligibility.mutate({
                            employeeId: member.employeeId,
                            serviceId: service.id,
                            active: event.target.checked,
                          })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {setEligibility.error && <p className="text-xs text-red-600">{(setEligibility.error as Error).message}</p>}
    </div>
  );
};

/**
 * Shifts are edited in the Workforce tab, which already works. Pointing at it
 * beats rebuilding a rota editor here — but the reason it matters belongs on
 * this checklist, because "published" is the word that trips people up.
 */
const ShiftGuidance: React.FC = () => (
  <div className="space-y-2 text-sm text-gray-700">
    <p>
      Slots are generated from <strong>published</strong> shifts. A shift saved as a draft offers no times at all, which
      looks identical to being fully booked.
    </p>
    <p className="text-xs text-gray-500">
      Open the Workforce tab, add each consultant's hours, then publish the week.
    </p>
  </div>
);

export default BookingSetupPanel;
