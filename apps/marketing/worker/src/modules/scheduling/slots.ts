/**
 * Bookable slot generation.
 *
 * What this replaces: availability.ts returned the raw rows of an employee's
 * published shift and left a comment conceding the point —
 *   "In a full implementation, we'd cross-reference existing appointments and breaks"
 * — so it never subtracted anything. The UI, having nothing usable, invented a
 * time instead: it took preferred_date_1 (a DATE, therefore midnight), fell back
 * to `new Date()` when that was null, and hardcoded `+ 60 * 60 * 1000` for the
 * end. Every booking would have been at midnight for exactly an hour.
 *
 * A slot here is a real offer: a consultant who is eligible for the service and
 * on a published shift, a suite with remaining capacity, and a window that is
 * free of appointments, live holds and breaks — including the service's setup
 * and cleanup buffers, which are what stop back-to-back bookings from colliding
 * in the doorway.
 *
 * The generator is a pure function over already-fetched data. Slot arithmetic is
 * where off-by-one errors hide, and a pure core is the only kind you can test
 * exhaustively without a database.
 */

/** Half-open interval [start, end) in epoch milliseconds. */
export interface Interval {
  start: number;
  end: number;
}

export interface ShiftWindow {
  employeeId: string;
  locationId: string | null;
  start: number;
  end: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  roomType: string | null;
  capacity: number;
  locationId: string | null;
}

export interface ServiceSpec {
  id: string;
  name: string;
  durationMinutes: number;
  setupBufferMinutes: number;
  cleanupBufferMinutes: number;
  requiredRoomType: string | null;
}

export interface EligibleEmployee {
  employeeId: string;
  displayName: string;
  skillLevel: number;
}

export interface SlotPreferences {
  /** ISO dates (yyyy-mm-dd) the customer asked for, in order of preference. */
  preferredDates: string[];
  /** Free text from the form: "Morning", "Afternoon", "Evening", "2pm"… */
  preferredWindows: string[];
  preferredEmployeeId: string | null;
  /** IANA zone of the boutique. Slot labelling and window matching use it. */
  timeZone: string;
}

export interface GenerateSlotsInput {
  service: ServiceSpec;
  shifts: ShiftWindow[];
  eligible: EligibleEmployee[];
  rooms: RoomInfo[];
  /** Existing commitments per employee id: appointments, holds, breaks. */
  employeeBusy: Map<string, Interval[]>;
  /** Existing commitments per room id. Capacity is applied on top. */
  roomBusy: Map<string, Interval[]>;
  preferences: SlotPreferences;
  /** Candidate starts are stepped by this. 15 minutes is the retail default. */
  granularityMinutes?: number;
  /** Slots before this instant are never offered. Defaults to now. */
  notBefore?: number;
  maxSlots?: number;
}

export interface Slot {
  startAt: string;
  endAt: string;
  employeeId: string;
  employeeName: string;
  roomId: string;
  roomName: string;
  score: number;
  /** Why this slot is being offered. Shown to the operator verbatim. */
  reasons: string[];
}

const MINUTE = 60_000;

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Named windows a bridal form actually produces. A request that says "Morning"
 * should not rank an 18:00 slot above a 10:00 one just because it came first.
 */
const NAMED_WINDOWS: Array<{ match: RegExp; startHour: number; endHour: number; label: string }> = [
  { match: /morning|a\.?m\.?\b/i, startHour: 8, endHour: 12, label: 'morning' },
  { match: /afternoon/i, startHour: 12, endHour: 17, label: 'afternoon' },
  { match: /evening|night|p\.?m\.?\b/i, startHour: 17, endHour: 21, label: 'evening' },
];

/** Hour-of-day in the boutique's zone, not the server's. */
export function hourInZone(epochMs: number, timeZone: string): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).format(new Date(epochMs));
  const hour = Number.parseInt(formatted, 10);
  return Number.isFinite(hour) ? hour % 24 : new Date(epochMs).getUTCHours();
}

/** Calendar date in the boutique's zone as yyyy-mm-dd. */
export function dateInZone(epochMs: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epochMs));
  return parts;
}

/**
 * Does this start fall inside a window the customer asked for?
 * Returns the matched label, or null. An explicit clock time ("2pm") beats a
 * named window, because it is a more specific request.
 */
export function matchesWindow(startMs: number, window: string, timeZone: string): string | null {
  const text = (window || '').trim();
  if (!text) return null;
  const hour = hourInZone(startMs, timeZone);

  const explicit = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (explicit) {
    let wanted = Number.parseInt(explicit[1], 10);
    const meridiem = explicit[3]?.toLowerCase();
    if (meridiem === 'pm' && wanted < 12) wanted += 12;
    if (meridiem === 'am' && wanted === 12) wanted = 0;
    // Only treat it as a clock time when a meridiem or a colon made it one;
    // "2 guests" must not be read as 2pm.
    if (meridiem || explicit[2]) {
      return Math.abs(hour - wanted) <= 1 ? `asked for around ${text}` : null;
    }
  }

  for (const named of NAMED_WINDOWS) {
    if (named.match.test(text)) {
      return hour >= named.startHour && hour < named.endHour ? `asked for the ${named.label}` : null;
    }
  }
  return null;
}

/** Subtracts busy intervals from a shift, returning the free remainder. */
export function freeIntervals(shift: Interval, busy: Interval[]): Interval[] {
  const relevant = busy
    .filter((b) => overlaps(shift, b))
    .sort((a, b) => a.start - b.start);

  const free: Interval[] = [];
  let cursor = shift.start;
  for (const block of relevant) {
    if (block.start > cursor) free.push({ start: cursor, end: Math.min(block.start, shift.end) });
    cursor = Math.max(cursor, block.end);
    if (cursor >= shift.end) break;
  }
  if (cursor < shift.end) free.push({ start: cursor, end: shift.end });
  return free.filter((interval) => interval.end > interval.start);
}

/**
 * Picks a suite for a candidate window.
 *
 * Capacity is a count, not a boolean: a lounge that seats three parties is only
 * unavailable once three overlap. The previous RPC treated any occupancy as
 * full, which would have made a shared space bookable once per day.
 */
function pickRoom(
  candidate: Interval,
  rooms: RoomInfo[],
  roomBusy: Map<string, Interval[]>,
  requiredRoomType: string | null,
): RoomInfo | null {
  const wanted = requiredRoomType?.trim().toLowerCase() || null;
  const usable = rooms.filter((room) => !wanted || (room.roomType || '').trim().toLowerCase() === wanted);

  // Prefer the tightest suite that still fits, so a two-person appointment does
  // not consume the largest room while a bridal party is waiting for it.
  const ordered = [...usable].sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name));

  for (const room of ordered) {
    const busy = roomBusy.get(room.id) ?? [];
    const concurrent = busy.filter((interval) => overlaps(candidate, interval)).length;
    if (concurrent < Math.max(room.capacity, 1)) return room;
  }
  return null;
}

/**
 * Scoring, stated honestly.
 *
 * The function this replaces was `score = 100 - (index * 10)` with a fixed
 * score_breakdown_json of {base_match: 50, availability_bonus: 30, skill_bonus: 20}
 * — constants that described nothing about the slot and ranked purely by array
 * position. Every component below is derived from the request, and every one
 * that fires appends the human-readable reason the operator sees.
 */
function scoreSlot(
  candidate: Interval,
  employee: EligibleEmployee,
  preferences: SlotPreferences,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const day = dateInZone(candidate.start, preferences.timeZone);
  const preferredIndex = preferences.preferredDates.indexOf(day);
  if (preferredIndex === 0) {
    score += 40;
    reasons.push('their first choice of date');
  } else if (preferredIndex > 0) {
    score += 25;
    reasons.push('their second choice of date');
  }

  for (const window of preferences.preferredWindows) {
    const matched = matchesWindow(candidate.start, window, preferences.timeZone);
    if (matched) {
      score += 20;
      reasons.push(matched);
      break;
    }
  }

  if (preferences.preferredEmployeeId && preferences.preferredEmployeeId === employee.employeeId) {
    score += 25;
    reasons.push('the consultant they asked for');
  }

  // Skill is a tiebreaker, not a driver. A level-3 consultant three weeks out
  // is worse for the bride than a level-1 on the morning she asked for.
  const skillBonus = Math.min(Math.max(employee.skillLevel, 1), 5) * 2;
  score += skillBonus;
  if (employee.skillLevel >= 3) reasons.push(`${employee.displayName} is senior for this service`);

  if (reasons.length === 0) reasons.push('available, though outside everything they asked for');
  return { score, reasons };
}

/**
 * Generates ranked, bookable slots.
 *
 * A candidate is only emitted when all of these hold simultaneously:
 *   - the consultant is eligible for the service and on a published shift
 *   - the appointment PLUS its setup and cleanup buffers fits inside that shift
 *   - the buffered window is free of their appointments, live holds and breaks
 *   - a suite of the required type has capacity for the un-buffered window
 *
 * Buffers are applied to the occupancy check but not to the customer-facing
 * time: a bride booked at 10:00 arrives at 10:00, while the consultant's diary
 * is blocked from 09:45.
 */
export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const {
    service,
    shifts,
    eligible,
    rooms,
    employeeBusy,
    roomBusy,
    preferences,
    granularityMinutes = 15,
    notBefore = Date.now(),
    maxSlots = 60,
  } = input;

  if (service.durationMinutes <= 0) return [];
  const eligibleById = new Map(eligible.map((entry) => [entry.employeeId, entry]));
  if (eligibleById.size === 0 || rooms.length === 0) return [];

  const duration = service.durationMinutes * MINUTE;
  const setup = Math.max(service.setupBufferMinutes, 0) * MINUTE;
  const cleanup = Math.max(service.cleanupBufferMinutes, 0) * MINUTE;
  const step = Math.max(granularityMinutes, 5) * MINUTE;

  const slots: Slot[] = [];

  for (const shift of shifts) {
    const employee = eligibleById.get(shift.employeeId);
    if (!employee) continue; // On shift, but not eligible for this service.

    const busy = employeeBusy.get(shift.employeeId) ?? [];
    for (const free of freeIntervals({ start: shift.start, end: shift.end }, busy)) {
      // Align the first candidate to the step grid so offered times read as
      // 10:00 and 10:15 rather than 10:07.
      const firstStart = Math.ceil((free.start + setup) / step) * step;

      for (let start = firstStart; ; start += step) {
        const end = start + duration;
        if (end + cleanup > free.end) break;
        if (start < notBefore) continue;

        const candidate: Interval = { start, end };
        const room = pickRoom(candidate, rooms, roomBusy, service.requiredRoomType);
        if (!room) continue;

        const { score, reasons } = scoreSlot(candidate, employee, preferences);
        slots.push({
          startAt: new Date(start).toISOString(),
          endAt: new Date(end).toISOString(),
          employeeId: employee.employeeId,
          employeeName: employee.displayName,
          roomId: room.id,
          roomName: room.name,
          score,
          reasons,
        });
      }
    }
  }

  // Best match first; ties broken by the earliest appointment, because a bride
  // waiting on a date wants the soonest of two equally good options.
  slots.sort((a, b) => b.score - a.score || a.startAt.localeCompare(b.startAt));
  return slots.slice(0, maxSlots);
}
