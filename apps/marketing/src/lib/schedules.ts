import { supabase } from '@/lib/supabase';

// ─── Staff shift scheduling: weekly working hours + time-off/vacation ranges ───
// Both live in the `staff_schedules` table, discriminated by `kind`.

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Default salon shift when a team member hasn't been scheduled yet: 9:00 AM – 5:30 PM. */
export const DEFAULT_START_MINUTES = 9 * 60;
export const DEFAULT_END_MINUTES = 17 * 60 + 30;

export const TIME_OFF_REASONS = ['Day off', 'Vacation', 'Sick', 'Personal', 'Training'] as const;

/** One weekday rule for one team member (kind='shift'). */
export interface ShiftRule {
  id: string;
  staffName: string;
  weekday: number; // 0=Sunday … 6=Saturday
  isWorking: boolean;
  startMinutes: number;
  endMinutes: number;
}

/** One day-off / vacation range for one team member (kind='time_off'). */
export interface TimeOffEntry {
  id: string;
  staffName: string;
  offStart: string; // ISO date (inclusive)
  offEnd: string; // ISO date (inclusive)
  reason: string;
}

export interface ScheduleData {
  shifts: ShiftRule[];
  timeOff: TimeOffEntry[];
}

/** Parse "1:30 PM" style times into minutes since midnight (0 when unparseable). */
export function timeToMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + parseInt(m[2], 10);
}

/** Format minutes-since-midnight back into "1:30 PM" style labels. */
export function minutesToLabel(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const mm = String(mins % 60).padStart(2, '0');
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${ampm}`;
}

/** Compact "9–5:30" style shift label for tight calendar cells. */
export function shiftShortLabel(startMinutes: number, endMinutes: number): string {
  const short = (mins: number) => {
    const h24 = Math.floor(mins / 60);
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const mm = mins % 60;
    return mm === 0 ? `${h12}` : `${h12}:${String(mm).padStart(2, '0')}`;
  };
  return `${short(startMinutes)}–${short(endMinutes)}`;
}

/** Selectable shift boundary times: 7:00 AM – 9:00 PM in 30-minute steps. */
export const SHIFT_TIME_OPTIONS: { minutes: number; label: string }[] = (() => {
  const opts: { minutes: number; label: string }[] = [];
  for (let m = 7 * 60; m <= 21 * 60; m += 30) opts.push({ minutes: m, label: minutesToLabel(m) });
  return opts;
})();

// ─── Data access ───

export async function fetchSchedules(): Promise<ScheduleData> {
  const { data, error } = await supabase.from('staff_schedules').select('*');
  if (error || !data) return { shifts: [], timeOff: [] };
  const shifts: ShiftRule[] = [];
  const timeOff: TimeOffEntry[] = [];
  data.forEach((r: any) => {
    if (r.kind === 'shift' && r.weekday !== null) {
      shifts.push({
        id: r.id,
        staffName: r.staff_name,
        weekday: r.weekday,
        isWorking: r.is_working ?? true,
        startMinutes: r.start_minutes ?? DEFAULT_START_MINUTES,
        endMinutes: r.end_minutes ?? DEFAULT_END_MINUTES,
      });
    } else if (r.kind === 'time_off' && r.off_start) {
      timeOff.push({
        id: r.id,
        staffName: r.staff_name,
        offStart: String(r.off_start).slice(0, 10),
        offEnd: String(r.off_end ?? r.off_start).slice(0, 10),
        reason: r.reason || 'Day off',
      });
    }
  });
  timeOff.sort((a, b) => a.offStart.localeCompare(b.offStart));
  return { shifts, timeOff };
}

/** Replace one team member's full weekly shift pattern (7 rows) in one shot. */
export async function saveWeekShifts(
  staffName: string,
  week: { weekday: number; isWorking: boolean; startMinutes: number; endMinutes: number }[],
): Promise<string | null> {
  const { error: delErr } = await supabase
    .from('staff_schedules')
    .delete()
    .eq('staff_name', staffName)
    .eq('kind', 'shift');
  if (delErr) return delErr.message;
  const { error } = await supabase.from('staff_schedules').insert(
    week.map((w) => ({
      staff_name: staffName,
      kind: 'shift',
      weekday: w.weekday,
      is_working: w.isWorking,
      start_minutes: w.startMinutes,
      end_minutes: w.endMinutes,
    })),
  );
  return error ? error.message : null;
}

export async function addTimeOff(
  staffName: string,
  offStart: string,
  offEnd: string,
  reason: string,
): Promise<string | null> {
  const { error } = await supabase.from('staff_schedules').insert({
    staff_name: staffName,
    kind: 'time_off',
    off_start: offStart,
    off_end: offEnd < offStart ? offStart : offEnd,
    reason,
  });
  return error ? error.message : null;
}

export async function removeTimeOff(id: string): Promise<string | null> {
  const { error } = await supabase.from('staff_schedules').delete().eq('id', id);
  return error ? error.message : null;
}

// ─── Calendar helpers ───

export type DayDuty =
  | { status: 'on'; startMinutes: number; endMinutes: number; scheduled: boolean }
  | { status: 'off' }
  | { status: 'time_off'; reason: string };

/** Weekday index (0=Sun) for an ISO date, immune to timezone drift. */
export function weekdayOfIso(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d).getDay();
}

/**
 * Resolve one team member's duty for one calendar day.
 * Time off beats the weekly pattern; members with no rules yet count as
 * on duty for default salon hours (so an empty schedule doesn't shade everyone).
 */
export function dutyFor(data: ScheduleData, staffName: string, isoDate: string): DayDuty {
  const off = data.timeOff.find(
    (t) => t.staffName === staffName && isoDate >= t.offStart && isoDate <= t.offEnd,
  );
  if (off) return { status: 'time_off', reason: off.reason };
  const weekday = weekdayOfIso(isoDate);
  const rule = data.shifts.find((s) => s.staffName === staffName && s.weekday === weekday);
  if (!rule) {
    return {
      status: 'on',
      startMinutes: DEFAULT_START_MINUTES,
      endMinutes: DEFAULT_END_MINUTES,
      scheduled: false,
    };
  }
  if (!rule.isWorking) return { status: 'off' };
  return { status: 'on', startMinutes: rule.startMinutes, endMinutes: rule.endMinutes, scheduled: true };
}

/** True when an appointment time falls outside the member's shift for that day. */
export function apptOutsideShift(duty: DayDuty, apptTime: string): boolean {
  if (duty.status !== 'on') return true;
  if (!duty.scheduled) return false; // no explicit schedule yet — don't nag
  const mins = timeToMinutes(apptTime);
  return mins < duty.startMinutes || mins >= duty.endMinutes;
}
