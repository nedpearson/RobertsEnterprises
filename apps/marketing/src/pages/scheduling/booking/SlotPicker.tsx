/**
 * Pick a real time, a real consultant and a real suite.
 *
 * What this replaces, from UnifiedSchedulingWorkspace:
 *
 *     const startAt = req.preferred_date_1 ? new Date(req.preferred_date_1) : new Date();
 *     const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
 *     roomId: '00000000-0000-0000-0000-000000000000'
 *
 * preferred_date_1 is a DATE, so that is midnight. When it was null the booking
 * silently became "now". The room was a zero uuid that would have violated the
 * foreign key. Nothing consulted a shift, an existing appointment, or a suite.
 *
 * Every option below comes from the server's slot engine, and each one carries
 * the reason it is being offered — derived from this request, not a constant.
 */
import React, { useMemo, useState } from 'react';
import { useBookableSlots, useAssignAppointment, type BookableSlot } from '@/lib/services/bookingService';

interface Props {
  businessId: string | undefined;
  requestId: string;
  locationId?: string | null;
  serviceId?: string | null;
  customerName?: string;
  onBooked?: (appointment: any) => void;
}

/** Server-side reasons an empty list is empty, phrased as the next action. */
const BLOCKED_ACTIONS: Record<string, string> = {
  NO_SERVICE: 'Choose an appointment type for this enquiry first.',
  NO_ELIGIBLE_STAFF: 'Tick who can take this appointment type in booking setup.',
  NO_ROOMS: 'Add a suite for this location in booking setup.',
  NO_PUBLISHED_SHIFTS: 'Publish the rota in the Workforce tab — draft shifts offer no times.',
  FULLY_BOOKED: 'Try a wider date range, or free up a shift.',
};

function groupByDay(slots: BookableSlot[], timeZone: string) {
  const groups = new Map<string, BookableSlot[]>();
  for (const slot of slots) {
    const day = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(slot.startAt));
    const list = groups.get(day) ?? [];
    list.push(slot);
    groups.set(day, list);
  }
  return [...groups.entries()];
}

export const SlotPicker: React.FC<Props> = ({
  businessId,
  requestId,
  locationId,
  serviceId,
  customerName,
  onBooked,
}) => {
  const [days, setDays] = useState(14);
  const [selected, setSelected] = useState<BookableSlot | null>(null);

  const window = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + days * 86_400_000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [days]);

  const slots = useBookableSlots(businessId, {
    requestId,
    serviceId: serviceId ?? undefined,
    locationId: locationId ?? undefined,
    ...window,
  });
  const assign = useAssignAppointment(businessId);

  const timeZone = slots.data?.timeZone || 'America/Chicago';
  const grouped = useMemo(() => groupByDay(slots.data?.slots ?? [], timeZone), [slots.data, timeZone]);

  const book = async () => {
    if (!selected) return;
    const appointment = await assign.mutateAsync({
      requestId,
      employeeId: selected.employeeId,
      roomId: selected.roomId,
      startAt: selected.startAt,
      endAt: selected.endAt,
      locationId: locationId ?? undefined,
    });
    onBooked?.(appointment.appointment);
  };

  if (slots.isLoading) return <p className="p-3 text-sm text-gray-500">Working out real available times…</p>;
  if (slots.error) return <p className="p-3 text-sm text-red-600">{(slots.error as Error).message}</p>;

  const blocked = slots.data?.blockedBy;
  if (blocked) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-medium text-amber-900">{slots.data?.message}</p>
        <p className="mt-1 text-xs text-amber-800">{BLOCKED_ACTIONS[blocked] ?? ''}</p>
        {blocked === 'FULLY_BOOKED' && days < 60 && (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-amber-900 underline"
            onClick={() => setDays(60)}
          >
            Look 60 days ahead
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {slots.data?.service?.name} · {slots.data?.service?.durationMinutes} min · times shown in the boutique's zone
        </p>
        <select
          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        >
          <option value={7}>Next 7 days</option>
          <option value={14}>Next 14 days</option>
          <option value={30}>Next 30 days</option>
          <option value={60}>Next 60 days</option>
        </select>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {grouped.map(([day, daySlots]) => (
          <div key={day}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{day}</p>
            <div className="space-y-1">
              {daySlots.map((slot) => {
                const isSelected =
                  selected?.startAt === slot.startAt && selected?.employeeId === slot.employeeId;
                const time = new Intl.DateTimeFormat('en-US', {
                  timeZone,
                  hour: 'numeric',
                  minute: '2-digit',
                }).format(new Date(slot.startAt));
                return (
                  <button
                    key={`${slot.startAt}-${slot.employeeId}-${slot.roomId}`}
                    type="button"
                    onClick={() => setSelected(slot)}
                    className={`flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left ${
                      isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-medium text-gray-900">
                        {time} · {slot.employeeName}
                      </span>
                      <span className="block text-xs text-gray-500">{slot.roomName}</span>
                    </span>
                    {/* The reasons are computed from this request. The scorer they
                        replace returned `100 - index * 10` for every slot. */}
                    <span className="max-w-[55%] text-right text-[11px] leading-tight text-gray-500">
                      {slot.reasons.join(' · ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {assign.error && <p className="text-xs text-red-600">{(assign.error as Error).message}</p>}

      <button
        type="button"
        onClick={book}
        disabled={!selected || assign.isPending}
        className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {assign.isPending
          ? 'Booking…'
          : selected
            ? `Book ${customerName || 'this bride'} with ${selected.employeeName}`
            : 'Pick a time'}
      </button>
    </div>
  );
};

export default SlotPicker;
