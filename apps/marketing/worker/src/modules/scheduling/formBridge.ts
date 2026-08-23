import { createHash, timingSafeEqual } from 'node:crypto';

export interface NormalizedFormBridgeSubmission {
  provider: string;
  externalSubmissionId: string;
  siteDomain: string;
  locationHint: string;
  name: string;
  email: string;
  phone?: string;
  appointmentRequest1?: string;
  appointmentRequest2?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  secondAppointmentDate?: string;
  secondAppointmentTime?: string;
  weddingDate?: string;
  occasionDate?: string;
  type?: string;
  lookingFor?: string;
  budgetLabel?: string;
  budgetCents?: number;
  partySize?: string;
  firstTimeTryingOn?: string;
  beverageSelection?: string;
  notes?: string;
  idempotencyKey: string;
}

export interface ParsedAppointmentSlot {
  date?: string;
  window?: string;
}

const MAX_TEXT = 512;
const MAX_NOTES = 4000;
const MAX_EXTERNAL_ID = 512;
const MAX_PROVIDER = 64;

const clip = (value: unknown, max = MAX_TEXT): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().slice(0, max)
    : '';

const normalizeKey = (value: unknown): string =>
  String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function addValue(map: Map<string, unknown>, key: unknown, value: unknown): void {
  const normalized = normalizeKey(key);
  if (!normalized || map.has(normalized) || value === undefined || value === null) return;
  map.set(normalized, value);
}

/**
 * Powerful Form can reach us through Zapier, Make, or n8n. Those tools expose
 * fields in slightly different shapes, so the bridge accepts common wrappers
 * and field-array formats while keeping one canonical contract internally.
 */
export function flattenFormBridgePayload(input: unknown): Map<string, unknown> {
  const values = new Map<string, unknown>();
  const visit = (value: unknown, depth: number): void => {
    if (depth > 2 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          const row = entry as Record<string, unknown>;
          const key = row.key ?? row.name ?? row.label ?? row.title;
          const fieldValue = row.value ?? row.answer ?? row.text ?? row.response;
          if (key !== undefined && fieldValue !== undefined) addValue(values, key, fieldValue);
          else visit(entry, depth + 1);
        }
      }
      return;
    }
    if (typeof value !== 'object') return;
    for (const [key, fieldValue] of Object.entries(value as Record<string, unknown>)) {
      addValue(values, key, fieldValue);
      if (['fields', 'data', 'submission', 'answers', 'formdata'].includes(normalizeKey(key))) {
        visit(fieldValue, depth + 1);
      }
    }
  };
  visit(input, 0);
  return values;
}

function firstValue(map: Map<string, unknown>, aliases: string[], max = MAX_TEXT): string {
  for (const alias of aliases) {
    const value = map.get(normalizeKey(alias));
    const text = clip(value, max);
    if (text) return text;
  }
  return '';
}

function normalizeProvider(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return (cleaned || 'powerful-form').slice(0, MAX_PROVIDER);
}

function normalizeDomain(value: string): string {
  if (!value) return '';
  try {
    const host = new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return '';
  }
}

function validIsoDate(year: number, month: number, day: number): string | undefined {
  if (year < 2000 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return undefined;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

const MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

/**
 * Existing Powerful Form date/time widgets can arrive as ISO, US date, or a
 * human-readable month string. Only a date we can prove is valid is written to
 * the DATE column; the original value is still retained in request notes.
 */
export function parseAppointmentRequestSlot(value: string): ParsedAppointmentSlot {
  const raw = clip(value);
  if (!raw) return {};

  let date: string | undefined;
  const iso = raw.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) date = validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  if (!date) {
    const us = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2}|20\d{2})\b/);
    if (us) {
      const year = us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3]);
      date = validIsoDate(year, Number(us[1]), Number(us[2]));
    }
  }

  if (!date) {
    const named = raw.match(/\b(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sept|Sep|October|Oct|November|Nov|December|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b/i);
    if (named) date = validIsoDate(Number(named[3]), MONTHS[named[1].toLowerCase()], Number(named[2]));
  }

  let window: string | undefined;
  const time = raw.match(/\b(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?\b/i);
  if (time) {
    const hour = Number(time[1]);
    const minute = Number(time[2]);
    if (hour <= 23 && minute <= 59) {
      const meridiem = time[3]?.replace(/\./g, '').toUpperCase();
      if ((!meridiem && hour <= 23) || (meridiem && hour >= 1 && hour <= 12)) {
        window = `${time[1]}:${time[2]}${meridiem ? ` ${meridiem}` : ''}`;
      }
    }
  }
  if (!window) {
    const hourOnly = raw.match(/\b(\d{1,2})\s*([ap]\.?m\.?)\b/i);
    if (hourOnly && Number(hourOnly[1]) >= 1 && Number(hourOnly[1]) <= 12) {
      window = `${hourOnly[1]} ${hourOnly[2].replace(/\./g, '').toUpperCase()}`;
    }
  }
  if (!window) {
    const daypart = raw.match(/\b(morning|afternoon|evening)\b/i);
    if (daypart) window = daypart[1][0].toUpperCase() + daypart[1].slice(1).toLowerCase();
  }

  return { date, window };
}

function parseMoneyCents(value: string): number | undefined {
  if (!value) return undefined;
  const tokens = value.match(/\$?\s*\d[\d,]*(?:\.\d{1,2})?/g) ?? [];
  // A price range is not an exact budget. Keep it as budgetLabel only rather
  // than fabricating one giant number or silently picking a side of the range.
  if (tokens.length !== 1) return undefined;
  const amount = Number(tokens[0].replace(/[$,\s]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return Math.round(amount * 100);
}

export function buildBridgeIdempotencyKey(provider: string, externalSubmissionId: string): string {
  const raw = `${provider}:${externalSubmissionId}`;
  if (raw.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(raw)) return raw;
  return `bridge:${createHash('sha256').update(raw).digest('hex')}`;
}

export function normalizeFormBridgeSubmission(input: unknown): NormalizedFormBridgeSubmission {
  const fields = flattenFormBridgePayload(input);
  const provider = normalizeProvider(firstValue(fields, ['sourceProvider', 'provider', 'integration'], MAX_PROVIDER));
  const externalSubmissionId = firstValue(
    fields,
    ['externalSubmissionId', 'submissionId', 'submission_id', 'responseId', 'response_id', 'entryId', 'entry_id', 'formSubmissionId'],
    MAX_EXTERNAL_ID,
  );
  const siteDomain = normalizeDomain(firstValue(fields, ['siteDomain', 'domain', 'storeDomain', 'website', 'shopDomain']));
  const locationHint = firstValue(fields, [
    'location', 'preferredLocation', 'appointmentLocation', 'storeLocation', 'boutique', 'whichLocation', 'store',
  ]);

  let name = firstValue(fields, [
    'name', 'fullName', 'firstAndLastName', 'firstLastName', 'customerName', 'brideName',
  ]);
  if (!name) {
    const first = firstValue(fields, ['firstName', 'firstname', 'first']);
    const last = firstValue(fields, ['lastName', 'lastname', 'last']);
    name = `${first} ${last}`.trim();
  }

  const email = firstValue(fields, ['email', 'emailAddress', 'customerEmail', 'brideEmail']).toLowerCase();
  const phone = firstValue(fields, ['phone', 'contactPhone', 'phoneNumber', 'mobile', 'telephone']) || undefined;

  const appointmentRequest1 = firstValue(fields, [
    'firstAppointmentRequest', 'appointmentRequest1', 'firstRequest', 'firstAppointmentChoice',
  ]) || undefined;
  const appointmentRequest2 = firstValue(fields, [
    'secondAppointmentRequest', 'appointmentRequest2', 'secondRequest', 'secondAppointmentChoice',
  ]) || undefined;
  const firstParsed = parseAppointmentRequestSlot(appointmentRequest1 ?? '');
  const secondParsed = parseAppointmentRequestSlot(appointmentRequest2 ?? '');

  const explicitAppointmentDate = firstValue(fields, ['appointmentDate', 'preferredDate', 'preferredDate1', 'date', 'date1']);
  const explicitSecondDate = firstValue(fields, ['secondAppointmentDate', 'preferredDate2', 'date2']);
  const explicitDateParsed = parseAppointmentRequestSlot(explicitAppointmentDate);
  const explicitSecondDateParsed = parseAppointmentRequestSlot(explicitSecondDate);
  const appointmentDate = explicitDateParsed.date ?? firstParsed.date;
  const appointmentTime = firstValue(fields, ['appointmentTime', 'preferredTime', 'preferredWindow', 'preferredWindow1', 'time', 'time1']) || firstParsed.window;
  const secondAppointmentDate = explicitSecondDateParsed.date ?? secondParsed.date;
  const secondAppointmentTime = firstValue(fields, ['secondAppointmentTime', 'preferredTime2', 'preferredWindow2', 'time2']) || secondParsed.window;

  const weddingDateRaw = firstValue(fields, ['weddingDate', 'wedding']);
  const weddingDate = parseAppointmentRequestSlot(weddingDateRaw).date || weddingDateRaw || undefined;
  const occasionDateRaw = firstValue(fields, ['occasionDate', 'eventDate']);
  const occasionDate = parseAppointmentRequestSlot(occasionDateRaw).date || occasionDateRaw || undefined;
  const type = firstValue(fields, ['appointmentType', 'occasionType', 'service', 'type', 'visitType']) || undefined;
  const lookingFor = firstValue(fields, ['lookingFor', 'shoppingFor', 'interestedIn', 'interest']) || undefined;
  const partySize = firstValue(fields, [
    'numberInParty', 'numberInPartyIncludeBride', 'partySize', 'guestCount', 'numberOfGuests',
  ]) || undefined;
  const firstTimeTryingOn = firstValue(fields, [
    'firstTimeTryingOnAWeddingDress', 'firstTimeTryingOnWeddingDress', 'firstTimeTryingOn',
  ]) || undefined;
  const beverageSelection = firstValue(fields, ['beverageSelection', 'beverage', 'drinkSelection']) || undefined;
  const notes = firstValue(fields, [
    'notes', 'extraNotes', 'message', 'comments', 'additionalInformation', 'additionalInfo',
  ], MAX_NOTES) || undefined;

  const budgetCentsRaw = firstValue(fields, ['budgetCents']);
  const budgetLabel = firstValue(fields, [
    'budget', 'weddingDressBudget', 'pricePoint', 'priceRange', 'spendRange',
  ]) || undefined;
  const budgetCents = budgetCentsRaw && Number.isFinite(Number(budgetCentsRaw))
    ? Math.max(0, Math.round(Number(budgetCentsRaw)))
    : parseMoneyCents(budgetLabel ?? '');

  if (!externalSubmissionId) throw new Error('externalSubmissionId is required for retry-safe ingestion.');
  if (!siteDomain) throw new Error('siteDomain is required.');
  if (!locationHint) throw new Error('location is required so the request cannot be routed to the wrong boutique.');
  if (!name) throw new Error('Customer name is required.');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('A valid customer email is required.');

  return {
    provider,
    externalSubmissionId,
    siteDomain,
    locationHint,
    name,
    email,
    phone,
    appointmentRequest1,
    appointmentRequest2,
    appointmentDate,
    appointmentTime,
    secondAppointmentDate,
    secondAppointmentTime,
    weddingDate,
    occasionDate,
    type,
    lookingFor,
    budgetLabel,
    budgetCents,
    partySize,
    firstTimeTryingOn,
    beverageSelection,
    notes,
    idempotencyKey: buildBridgeIdempotencyKey(provider, externalSubmissionId),
  };
}

export function isFormBridgeConfigured(secret: unknown): boolean {
  return typeof secret === 'string' && secret.trim().length >= 32;
}

export function verifyFormBridgeSecret(
  configuredSecret: unknown,
  authorizationHeader: unknown,
  explicitHeader: unknown,
): boolean {
  if (!isFormBridgeConfigured(configuredSecret)) return false;
  const configured = String(configuredSecret).trim();
  const bearer = typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length).trim()
    : '';
  const supplied = bearer || (typeof explicitHeader === 'string' ? explicitHeader.trim() : '');
  if (!supplied) return false;
  const a = Buffer.from(configured);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

const REDACTED_KEY = /(password|passwd|secret|token|authorization|card|cvv|cvc|ssn|socialsecurity)/i;

/** Store the original form payload for audit/replay without retaining secrets. */
export function redactFormBridgePayload(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => redactFormBridgePayload(item, depth + 1));
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? value.slice(0, MAX_NOTES) : value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>).slice(0, 200)) {
    out[key] = REDACTED_KEY.test(key) ? '[redacted]' : redactFormBridgePayload(child, depth + 1);
  }
  return out;
}
