import { createHash, timingSafeEqual } from 'node:crypto';

export interface NormalizedFormBridgeSubmission {
  provider: string;
  externalSubmissionId: string;
  siteDomain: string;
  locationHint: string;
  name: string;
  email: string;
  phone?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  weddingDate?: string;
  type?: string;
  lookingFor?: string;
  budgetCents?: number;
  notes?: string;
  idempotencyKey: string;
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
 * fields in slightly different shapes, so the bridge accepts a small set of
 * common wrappers and field-array formats while keeping one canonical contract
 * internally.
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

function parseMoneyCents(value: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const amount = Number(cleaned);
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

  let name = firstValue(fields, ['name', 'fullName', 'customerName', 'brideName']);
  if (!name) {
    const first = firstValue(fields, ['firstName', 'firstname', 'first']);
    const last = firstValue(fields, ['lastName', 'lastname', 'last']);
    name = `${first} ${last}`.trim();
  }

  const email = firstValue(fields, ['email', 'emailAddress', 'customerEmail', 'brideEmail']).toLowerCase();
  const phone = firstValue(fields, ['phone', 'phoneNumber', 'mobile', 'telephone']) || undefined;
  const appointmentDate = firstValue(fields, ['appointmentDate', 'preferredDate', 'preferredDate1', 'date', 'date1']) || undefined;
  const appointmentTime = firstValue(fields, ['appointmentTime', 'preferredTime', 'preferredWindow', 'time', 'time1']) || undefined;
  const weddingDate = firstValue(fields, ['weddingDate', 'eventDate', 'wedding']) || undefined;
  const type = firstValue(fields, ['appointmentType', 'service', 'type', 'visitType']) || undefined;
  const lookingFor = firstValue(fields, ['lookingFor', 'shoppingFor', 'interestedIn', 'interest']) || undefined;
  const notes = firstValue(fields, ['notes', 'message', 'comments', 'additionalInformation', 'additionalInfo'], MAX_NOTES) || undefined;

  const budgetCentsRaw = firstValue(fields, ['budgetCents']);
  const budgetRaw = firstValue(fields, ['budget', 'priceRange', 'spendRange']);
  const budgetCents = budgetCentsRaw && Number.isFinite(Number(budgetCentsRaw))
    ? Math.max(0, Math.round(Number(budgetCentsRaw)))
    : parseMoneyCents(budgetRaw);

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
    appointmentDate,
    appointmentTime,
    weddingDate,
    type,
    lookingFor,
    budgetCents,
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
