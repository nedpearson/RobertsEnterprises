import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AlertTriangle, CalendarCog, ChevronLeft, ChevronRight, Mail, Plus, Users2 } from 'lucide-react';
import { Appointment, teamMembers, locationById } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ScheduleData,
  dutyFor,
  apptOutsideShift,
  shiftShortLabel,
  minutesToLabel,
  fetchSchedules,
} from '@/lib/schedules';
import ScheduleModal from './ScheduleModal';
import EmailScheduleModal from './EmailScheduleModal';
import { BeautifulEmptyState } from './ui';

const TYPE_DOT: Record<string, string> = {
  'Bridal Consultation': 'bg-brand-primary',
  Fitting: 'bg-violet-400',
  Alterations: 'bg-amber-400',
  Pickup: 'bg-emerald-400',
  Accessories: 'bg-sky-400',
};

/** Diagonal-stripe shading for cells where the stylist is off. */
const OFF_STRIPES: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, rgba(120,113,108,0.08) 0px, rgba(120,113,108,0.08) 6px, transparent 6px, transparent 12px)',
};

const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Sunday that starts the week containing `d`. */
function weekStartOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

interface StaffMember {
  name: string;
  role: string;
}

export default function CoverageCalendar({
  onBook,
  onEdit,
}: {
  /** Book a bride into a specific day (and optionally a specific stylist). */
  onBook: (defaults: { date: string; stylist?: string }) => void;
  /** Open an existing appointment for editing/rescheduling. */
  onEdit: (appt: Appointment) => void;
}) {
  const { appointments } = useVowosData();
  const { profile } = useAuth();
  const canManageSchedules = profile?.role === 'Owner' || profile?.role === 'Manager';
  const [weekStart, setWeekStart] = useState<Date>(() => weekStartOf(new Date()));
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData>({ shifts: [], timeOff: [] });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  // Pull every employee account so the manager sees the whole team on one calendar,
  // even employees with zero appointments (coverage gaps are the whole point).
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('staff_profiles').select('name, role').order('created_at', { ascending: true });
      if (data) setStaff(data.map((r: any) => ({ name: r.name, role: r.role ?? 'Stylist' })));
    })();
  }, []);

  const reloadSchedules = useCallback(async () => {
    setSchedules(await fetchSchedules());
  }, []);

  useEffect(() => {
    reloadSchedules();
  }, [reloadSchedules]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );
  const dayKeys = days.map(isoDate);
  const todayKey = isoDate(new Date());

  const weekAppts = useMemo(
    () => appointments.filter((a) => dayKeys.includes(a.date) && a.status !== 'Cancelled'),
    [appointments, dayKeys.join(',')], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Roster = every employee account + booking-form stylists + anyone already holding
  // an appointment this week (so nothing ever falls off the grid).
  const roster = useMemo(() => {
    const names: { name: string; role: string }[] = [];
    const seen = new Set<string>();
    const push = (name: string, role: string) => {
      const key = name.trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      names.push({ name: key, role });
    };
    staff.forEach((s) => push(s.name, s.role));
    teamMembers.forEach((m) => push(m, 'Stylist'));
    weekAppts.forEach((a) => push(a.stylist, 'Stylist'));
    return names;
  }, [staff, weekAppts]);

  /** Appointments for one stylist on one day, in booked order. */
  const cellAppts = (stylist: string, day: string) =>
    weekAppts.filter((a) => a.stylist === stylist && a.date === day);

  /** True when a stylist holds 2+ active appointments at the same time that day. */
  const hasDoubleBooking = (list: Appointment[]) => {
    const times = new Map<string, number>();
    list.forEach((a) => {
      if (a.status === 'Completed') return;
      times.set(a.time, (times.get(a.time) ?? 0) + 1);
    });
    return [...times.values()].some((n) => n > 1);
  };

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const weekLabel = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const totalWeek = weekAppts.length;
  const coveredStylists = new Set(weekAppts.map((a) => a.stylist)).size;

  /** How many team members are on duty (working a shift) on a given day. */
  const onDutyCount = (day: string) =>
    roster.filter((m) => dutyFor(schedules, m.name, day).status === 'on').length;

  /** Count of this week's appointments that fall outside the assigned stylist's shift. */
  const outsideShiftCount = useMemo(
    () =>
      weekAppts.filter(
        (a) => a.status !== 'Completed' && apptOutsideShift(dutyFor(schedules, a.stylist, a.date), a.time),
      ).length,
    [weekAppts, schedules],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
      {/* Week navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftWeek(-1)}
            className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition-colors hover:bg-stone-50"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekStart(weekStartOf(new Date()))}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            Today
          </button>
          <button
            onClick={() => shiftWeek(1)}
            className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition-colors hover:bg-stone-50"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-2 font-serif text-lg text-stone-900">{weekLabel}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-1.5 text-xs text-stone-500">
            <Users2 className="h-3.5 w-3.5 text-stone-400" />
            {totalWeek} appointment{totalWeek === 1 ? '' : 's'} · {coveredStylists} of {roster.length} team members covering
          </p>
          {outsideShiftCount > 0 && (
            <p className="flex items-center gap-1 rounded-full bg-status-warning/10 px-2.5 py-1 text-[11px] font-semibold text-status-warning ring-1 ring-amber-200">
              <AlertTriangle className="h-3 w-3" /> {outsideShiftCount} outside shift
            </p>
          )}
          {canManageSchedules && (
            <>
              <button
                onClick={() => setScheduleOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                title="Set working days, hours, and time off per team member"
              >
                <CalendarCog className="h-3.5 w-3.5" /> Schedules
              </button>
              <button
                onClick={() => setEmailOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                title="Email each team member their shifts for this week"
              >
                <Mail className="h-3.5 w-3.5" /> Email Schedule
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/70">
              <th className="w-40 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                Team member
              </th>
              {days.map((d, i) => {
                const key = dayKeys[i];
                const isToday = key === todayKey;
                const dayCount = weekAppts.filter((a) => a.date === key).length;
                const duty = onDutyCount(key);
                return (
                  <th key={key} className={`px-2 py-2 text-center ${isToday ? 'bg-brand-soft/70' : ''}`}>
                    <button
                      onClick={() => onBook({ date: key })}
                      className="group mx-auto block w-full rounded-lg py-1 transition-colors hover:bg-brand-soft"
                      title={`Book a bride on ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
                    >
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span
                        className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                          isToday ? 'bg-brand-primary text-white' : 'text-stone-800 group-hover:bg-brand-soft'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                      <span className="block text-[10px] text-stone-400">
                        {dayCount > 0 ? `${dayCount} appt${dayCount === 1 ? '' : 's'}` : '—'}
                      </span>
                      <span
                        className={`mx-auto mt-0.5 inline-block rounded-full px-1.5 py-px text-[9px] font-semibold ${
                          duty === 0
                            ? 'bg-brand-soft text-brand-primary'
                            : 'bg-status-success/10 text-status-success ring-1 ring-emerald-100'
                        }`}
                        title={`${duty} team member${duty === 1 ? '' : 's'} scheduled to work this day`}
                      >
                        {duty} on duty
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {roster.map((member) => {
              const memberWeekCount = weekAppts.filter((a) => a.stylist === member.name).length;
              return (
                <tr key={member.name} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-stone-500 to-stone-700 text-[11px] font-semibold text-white">
                        {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-stone-800">{member.name}</p>
                        <p className="text-[10px] text-stone-400">
                          {member.role} · {memberWeekCount} this week
                        </p>
                      </div>
                    </div>
                  </td>
                  {dayKeys.map((day) => {
                    const list = cellAppts(member.name, day);
                    const doubled = hasDoubleBooking(list);
                    const isToday = day === todayKey;
                    const duty = dutyFor(schedules, member.name, day);
                    const isOff = duty.status !== 'on';
                    const cellTitle =
                      duty.status === 'on'
                        ? `${member.name} works ${minutesToLabel(duty.startMinutes)} – ${minutesToLabel(duty.endMinutes)}${duty.scheduled ? '' : ' (default hours — no schedule set)'}`
                        : duty.status === 'time_off'
                          ? `${member.name} is off: ${duty.reason}`
                          : `${member.name} does not work this day`;
                    return (
                      <td
                        key={day}
                        className={`group/cell px-1.5 py-2 ${isOff ? 'bg-stone-50' : isToday ? 'bg-brand-soft/40' : ''}`}
                        style={isOff ? OFF_STRIPES : undefined}
                        title={cellTitle}
                      >
                        <div className="min-h-[52px] space-y-1">
                          {isOff && (
                            <p className="rounded-md bg-stone-200/70 px-1.5 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-stone-500">
                              {duty.status === 'time_off' ? duty.reason : 'Off'}
                            </p>
                          )}
                          {!isOff && duty.scheduled && (
                            <p className="text-center text-[9px] font-medium text-stone-300">
                              {shiftShortLabel(duty.startMinutes, duty.endMinutes)}
                            </p>
                          )}
                          {doubled && (
                            <p className="flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-[9px] font-semibold text-brand-primary-hover">
                              <AlertTriangle className="h-2.5 w-2.5" /> Double-booked
                            </p>
                          )}
                          {list.map((a) => {
                            const outside = a.status !== 'Completed' && apptOutsideShift(duty, a.time);
                            return (
                              <button
                                key={a.id}
                                onClick={() => onEdit(a)}
                                title={`${a.customer} · ${a.type} · ${a.time} · ${locationById(a.location).short}${a.feePaid ? ' · fee paid' : ' · fee due'}${outside ? ` · WARNING: outside ${member.name}'s shift — reassign or reschedule` : ''}`}
                                className={`block w-full rounded-lg border px-1.5 py-1 text-left transition-colors ${
                                  a.status === 'Completed'
                                    ? 'border-stone-100 bg-stone-50 opacity-60'
                                    : outside
                                      ? 'border-amber-300 bg-status-warning/10 ring-1 ring-amber-300 hover:bg-amber-100'
                                      : a.status === 'Pending'
                                        ? 'border-status-warning/20 bg-status-warning/10 hover:bg-amber-100'
                                        : 'border-stone-200 bg-white hover:border-border-subtle hover:bg-brand-soft'
                                }`}
                              >
                                <span className="flex items-center gap-1">
                                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${TYPE_DOT[a.type] ?? 'bg-stone-300'}`} />
                                  <span className="truncate text-[10px] font-semibold text-stone-800">{a.time}</span>
                                  {outside && (
                                    <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 text-status-warning" aria-label="Booked outside this stylist's shift" />
                                  )}
                                  {!a.feePaid && a.status !== 'Completed' && (
                                    <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" title="Booking fee due" />
                                  )}
                                </span>
                                <span className="block truncate text-[10px] text-stone-600">{a.customer}</span>
                                {outside && (
                                  <span className="block truncate text-[9px] font-semibold text-status-warning">
                                    Outside shift
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => onBook({ date: day, stylist: member.name })}
                            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-transparent py-1 text-[10px] font-medium text-transparent transition-colors group-hover/cell:border-stone-200 group-hover/cell:text-stone-400 hover:!border-rose-300 hover:bg-brand-soft hover:!text-brand-primary"
                            title={
                              isOff
                                ? `${member.name} is off this day — booking here will be flagged`
                                : `Book a bride with ${member.name} on this day`
                            }
                          >
                            <Plus className="h-3 w-3" /> Book
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {roster.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8">
                  <BeautifulEmptyState
                    icon={<Users2 className="h-8 w-8" />}
                    title="No Team Members"
                    description="No team members yet - staff accounts appear here automatically."
                    colorHint="indigo"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-stone-100 px-5 py-3 text-[10px] text-stone-500">
        {Object.entries(TYPE_DOT).map(([type, dot]) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${dot}`} /> {type}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Fee due at check-in
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-stone-200" style={OFF_STRIPES} /> Off / vacation
        </span>
        <span className="inline-flex items-center gap-1">
          <AlertTriangle className="h-2.5 w-2.5 text-status-warning" /> Booked outside shift
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          Hover a cell to book that stylist · click a day number to book that day
        </span>
      </div>

      {/* Owner/Manager: working days, hours & time off */}
      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        roster={roster}
        data={schedules}
        onChanged={reloadSchedules}
      />

      {/* Owner/Manager: email the visible week's shifts to the team */}
      <EmailScheduleModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        roster={roster}
        weekDays={dayKeys}
        weekLabel={weekLabel}
        schedules={schedules}
      />

    </div>
  );
}
