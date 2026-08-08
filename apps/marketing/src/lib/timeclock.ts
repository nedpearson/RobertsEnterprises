import { supabase } from '@/lib/supabase';
import { ScheduleData, dutyFor } from '@/lib/schedules';

// ─── Time clock: punch in/out records in the `time_entries` table ───

export interface TimeEntry {
  id: string;
  staffName: string;
  clockIn: string; // ISO timestamp
  clockOut: string | null; // ISO timestamp or null while on the clock
  note: string | null;
}

function rowToEntry(r: any): TimeEntry {
  return {
    id: r.id,
    staffName: r.staff_name,
    clockIn: r.clock_in,
    clockOut: r.clock_out ?? null,
    note: r.note ?? null,
  };
}

/** Local ISO date (YYYY-MM-DD) for a Date. */
export const localIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Every ISO date from `fromIso` to `toIso` inclusive (safe-capped at 400 days). */
export function eachIsoDate(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  const [y, m, d] = fromIso.split('-').map((n) => parseInt(n, 10));
  const cur = new Date(y, m - 1, d);
  for (let i = 0; i < 400; i++) {
    const iso = localIsoDate(cur);
    if (iso > toIso) break;
    out.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Fetch punches whose clock-in falls inside a local date range (inclusive). */
export async function fetchTimeEntries(fromIso: string, toIso: string): Promise<TimeEntry[]> {
  const start = new Date(`${fromIso}T00:00:00`).toISOString();
  const endDate = new Date(`${toIso}T00:00:00`);
  endDate.setDate(endDate.getDate() + 1);
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .gte('clock_in', start)
    .lt('clock_in', endDate.toISOString())
    .order('clock_in', { ascending: true });
  if (error || !data) return [];
  return data.map(rowToEntry);
}

/** Everyone currently on the clock (no clock-out yet). */
export async function fetchOpenEntries(): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .is('clock_out', null)
    .order('clock_in', { ascending: true });
  if (error || !data) return [];
  return data.map(rowToEntry);
}

export async function clockIn(staffName: string): Promise<string | null> {
  const { error } = await supabase.from('time_entries').insert({ staff_name: staffName });
  return error ? error.message : null;
}

export async function clockOut(entryId: string): Promise<string | null> {
  const { error } = await supabase
    .from('time_entries')
    .update({ clock_out: new Date().toISOString() })
    .eq('id', entryId);
  return error ? error.message : null;
}

export async function deleteTimeEntry(entryId: string): Promise<string | null> {
  const { error } = await supabase.from('time_entries').delete().eq('id', entryId);
  return error ? error.message : null;
}

// ─── Hours math ───

/** Hours in one entry; open entries count up to `now`. */
export function entryHours(e: TimeEntry, now: Date = new Date()): number {
  const start = new Date(e.clockIn).getTime();
  const end = e.clockOut ? new Date(e.clockOut).getTime() : now.getTime();
  return Math.max(0, (end - start) / 3_600_000);
}

/** "7h 24m" style label. */
export function fmtHours(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return `${mm}m`;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}m`;
}

/** Punches longer than this are almost certainly a forgotten clock-out. */
export const SUSPICIOUS_SHIFT_HOURS = 14;

/**
 * Hours a member is scheduled to work across a date range,
 * derived from their weekly shift pattern minus time off.
 */
export function scheduledHoursForRange(
  data: ScheduleData,
  staffName: string,
  fromIso: string,
  toIso: string,
): number {
  let total = 0;
  for (const iso of eachIsoDate(fromIso, toIso)) {
    const duty = dutyFor(data, staffName, iso);
    if (duty.status === 'on') total += (duty.endMinutes - duty.startMinutes) / 60;
  }
  return total;
}

// ─── Staff email directory (for emailing schedules) ───

export async function fetchStaffContacts(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('staff_contacts').select('staff_name, email');
  if (error || !data) return {};
  const map: Record<string, string> = {};
  data.forEach((r: any) => {
    if (r.email) map[r.staff_name] = r.email;
  });
  return map;
}

export async function saveStaffContact(staffName: string, email: string): Promise<string | null> {
  const { error } = await supabase
    .from('staff_contacts')
    .upsert({ staff_name: staffName, email: email.trim(), updated_at: new Date().toISOString() });
  return error ? error.message : null;
}
