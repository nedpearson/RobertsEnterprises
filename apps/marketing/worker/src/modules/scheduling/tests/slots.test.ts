/**
 * Slot generation tests.
 *
 * The code these replace returned an employee's raw shift rows and let the UI
 * invent a time — `preferred_date_1` at midnight, plus exactly one hour. Any
 * test of that would have passed while producing an unbookable appointment, so
 * these assert the things that actually make a slot real: that a busy period is
 * subtracted, that buffers are honoured, that a suite at capacity stops being
 * offered, and that somebody ineligible is never proposed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dateInZone,
  freeIntervals,
  generateSlots,
  matchesWindow,
  overlaps,
  type GenerateSlotsInput,
  type Interval,
} from '../slots';

const ZONE = 'UTC';
const at = (iso: string) => Date.parse(iso);

/** One 09:00–17:00 shift, one consultant, one suite, 60-minute service. */
function baseInput(overrides: Partial<GenerateSlotsInput> = {}): GenerateSlotsInput {
  return {
    service: {
      id: 'svc-bridal',
      name: 'Bridal Appointment',
      durationMinutes: 60,
      setupBufferMinutes: 0,
      cleanupBufferMinutes: 0,
      requiredRoomType: null,
    },
    shifts: [
      { employeeId: 'emp-1', locationId: 'loc-1', start: at('2026-09-10T09:00:00Z'), end: at('2026-09-10T17:00:00Z') },
    ],
    eligible: [{ employeeId: 'emp-1', displayName: 'Mia', skillLevel: 1 }],
    rooms: [{ id: 'room-1', name: 'Suite A', roomType: null, capacity: 1, locationId: 'loc-1' }],
    employeeBusy: new Map<string, Interval[]>(),
    roomBusy: new Map<string, Interval[]>(),
    preferences: { preferredDates: [], preferredWindows: [], preferredEmployeeId: null, timeZone: ZONE },
    granularityMinutes: 60,
    notBefore: at('2026-09-01T00:00:00Z'),
    maxSlots: 100,
    ...overrides,
  };
}

test('an empty shift yields one slot per hour, and none run past the end', () => {
  const slots = generateSlots(baseInput());
  assert.equal(slots.length, 8); // 09:00 through 16:00 inclusive; 16:00 ends exactly on the bell
  assert.equal(slots[0].startAt, '2026-09-10T09:00:00.000Z');
  assert.equal(slots.at(-1)!.endAt, '2026-09-10T17:00:00.000Z');
});

test('an existing appointment is subtracted, not ignored', () => {
  // This is the whole defect in the code being replaced: it never looked.
  const employeeBusy = new Map<string, Interval[]>([
    ['emp-1', [{ start: at('2026-09-10T12:00:00Z'), end: at('2026-09-10T13:00:00Z') }]],
  ]);
  const slots = generateSlots(baseInput({ employeeBusy }));
  const starts = slots.map((slot) => slot.startAt);
  assert.ok(!starts.includes('2026-09-10T12:00:00.000Z'), 'the booked hour must not be offered');
  assert.ok(starts.includes('2026-09-10T13:00:00.000Z'), 'the hour after it must be');
  // 09/10/11 before the booking, 13/14/15/16 after it.
  assert.equal(slots.length, 7);
});

test('buffers block the diary without moving the customer-facing time', () => {
  // 15 minutes either side: a 10:00 appointment occupies 09:45-11:15, so the
  // 09:00 slot survives but the shift can no longer fit a 16:00 start.
  const slots = generateSlots(
    baseInput({
      service: {
        id: 'svc-bridal',
        name: 'Bridal Appointment',
        durationMinutes: 60,
        setupBufferMinutes: 15,
        cleanupBufferMinutes: 15,
        requiredRoomType: null,
      },
    }),
  );
  const starts = slots.map((slot) => slot.startAt);
  assert.ok(!starts.includes('2026-09-10T09:00:00.000Z'), 'setup buffer must not spill before the shift');
  assert.ok(!starts.includes('2026-09-10T16:00:00.000Z'), 'cleanup buffer must not spill past the shift');
  assert.ok(starts.includes('2026-09-10T10:00:00.000Z'));
});

test('a consultant on shift but not eligible is never offered', () => {
  const input = baseInput({
    shifts: [
      { employeeId: 'emp-1', locationId: 'loc-1', start: at('2026-09-10T09:00:00Z'), end: at('2026-09-10T17:00:00Z') },
      { employeeId: 'emp-stranger', locationId: 'loc-1', start: at('2026-09-10T09:00:00Z'), end: at('2026-09-10T17:00:00Z') },
    ],
  });
  const slots = generateSlots(input);
  assert.ok(slots.every((slot) => slot.employeeId === 'emp-1'));
});

test('a suite at capacity stops being offered; capacity above one does not', () => {
  const busyHour = { start: at('2026-09-10T09:00:00Z'), end: at('2026-09-10T10:00:00Z') };

  const single = generateSlots(baseInput({ roomBusy: new Map([['room-1', [busyHour]]]) }));
  assert.ok(!single.map((s) => s.startAt).includes('2026-09-10T09:00:00.000Z'));

  // The RPC previously treated any occupancy as full, which made a shared
  // lounge bookable once a day.
  const shared = generateSlots(
    baseInput({
      rooms: [{ id: 'room-1', name: 'Lounge', roomType: null, capacity: 2, locationId: 'loc-1' }],
      roomBusy: new Map([['room-1', [busyHour]]]),
    }),
  );
  assert.ok(shared.map((s) => s.startAt).includes('2026-09-10T09:00:00.000Z'));
});

test('a service requiring a room type will not take a room of another type', () => {
  const input = baseInput({
    service: {
      id: 'svc-bridal',
      name: 'Bridal Appointment',
      durationMinutes: 60,
      setupBufferMinutes: 0,
      cleanupBufferMinutes: 0,
      requiredRoomType: 'BRIDAL_SUITE',
    },
    rooms: [{ id: 'room-1', name: 'Alterations Bay', roomType: 'ALTERATIONS', capacity: 1, locationId: 'loc-1' }],
  });
  assert.equal(generateSlots(input).length, 0);
});

test('no rooms or nobody eligible produces nothing rather than a fabricated time', () => {
  assert.equal(generateSlots(baseInput({ rooms: [] })).length, 0);
  assert.equal(generateSlots(baseInput({ eligible: [] })).length, 0);
});

test('slots before notBefore are never offered', () => {
  const slots = generateSlots(baseInput({ notBefore: at('2026-09-10T13:00:00Z') }));
  assert.equal(slots[0].startAt, '2026-09-10T13:00:00.000Z');
});

test('ranking follows the request, not array position', () => {
  // The replaced scorer was `100 - index * 10` — position only. Here the
  // afternoon slot on the requested date must beat the morning one.
  const slots = generateSlots(
    baseInput({
      preferences: {
        preferredDates: ['2026-09-10'],
        preferredWindows: ['Afternoon'],
        preferredEmployeeId: null,
        timeZone: ZONE,
      },
    }),
  );
  const top = slots[0];
  assert.ok(top.reasons.includes('their first choice of date'));
  assert.ok(top.reasons.includes('asked for the afternoon'));
  assert.ok(Number.parseInt(top.startAt.slice(11, 13), 10) >= 12);
});

test('the requested consultant outranks an equally available colleague', () => {
  const slots = generateSlots(
    baseInput({
      shifts: [
        { employeeId: 'emp-1', locationId: 'loc-1', start: at('2026-09-10T09:00:00Z'), end: at('2026-09-10T11:00:00Z') },
        { employeeId: 'emp-2', locationId: 'loc-1', start: at('2026-09-10T09:00:00Z'), end: at('2026-09-10T11:00:00Z') },
      ],
      eligible: [
        { employeeId: 'emp-1', displayName: 'Mia', skillLevel: 1 },
        { employeeId: 'emp-2', displayName: 'Jess', skillLevel: 1 },
      ],
      rooms: [{ id: 'room-1', name: 'Suite A', roomType: null, capacity: 5, locationId: 'loc-1' }],
      preferences: { preferredDates: [], preferredWindows: [], preferredEmployeeId: 'emp-2', timeZone: ZONE },
    }),
  );
  assert.equal(slots[0].employeeId, 'emp-2');
  assert.ok(slots[0].reasons.includes('the consultant they asked for'));
});

test('a slot outside every preference says so rather than inventing a reason', () => {
  const slots = generateSlots(
    baseInput({
      preferences: {
        preferredDates: ['2026-12-25'],
        preferredWindows: ['Evening'],
        preferredEmployeeId: null,
        timeZone: ZONE,
      },
    }),
  );
  assert.ok(slots.every((slot) => slot.reasons.includes('available, though outside everything they asked for')));
});

test('freeIntervals subtracts overlapping and adjacent blocks correctly', () => {
  const shift = { start: 0, end: 100 };
  assert.deepEqual(freeIntervals(shift, []), [{ start: 0, end: 100 }]);
  assert.deepEqual(freeIntervals(shift, [{ start: 20, end: 40 }]), [
    { start: 0, end: 20 },
    { start: 40, end: 100 },
  ]);
  // Overlapping blocks must merge, not produce a negative-width gap.
  assert.deepEqual(freeIntervals(shift, [{ start: 20, end: 60 }, { start: 40, end: 80 }]), [
    { start: 0, end: 20 },
    { start: 80, end: 100 },
  ]);
  assert.deepEqual(freeIntervals(shift, [{ start: 0, end: 100 }]), []);
});

test('overlaps treats intervals as half-open so back-to-back is not a clash', () => {
  assert.equal(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 }), false);
  assert.equal(overlaps({ start: 0, end: 11 }, { start: 10, end: 20 }), true);
});

test('window matching reads what a bridal form actually sends', () => {
  const morning = at('2026-09-10T10:00:00Z');
  const evening = at('2026-09-10T18:00:00Z');
  assert.ok(matchesWindow(morning, 'Morning', ZONE));
  assert.equal(matchesWindow(evening, 'Morning', ZONE), null);
  assert.ok(matchesWindow(evening, 'Evening', ZONE));
  assert.ok(matchesWindow(at('2026-09-10T14:00:00Z'), '2pm', ZONE));
  // "2 guests" is not a request for 2pm.
  assert.equal(matchesWindow(at('2026-09-10T14:00:00Z'), '2 guests', ZONE), null);
  assert.equal(matchesWindow(morning, '', ZONE), null);
});

test('dateInZone reports the boutique day, not the server day', () => {
  // 02:00 UTC is still the previous evening in Louisiana.
  assert.equal(dateInZone(at('2026-09-11T02:00:00Z'), 'America/Chicago'), '2026-09-10');
  assert.equal(dateInZone(at('2026-09-11T02:00:00Z'), 'UTC'), '2026-09-11');
});
