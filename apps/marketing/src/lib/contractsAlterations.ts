// ─── VowOS Contracts, Alterations & Bride Portal — shared data module ───
// Single source of truth for the bridal sales contract terms, e-sign records,
// alteration jobs, and the secret-link URL builders used by staff messaging,
// the public /sign page, and the bride portal.

import { supabase } from '@/lib/supabase';
import { Customer, LocationId, locationById, formatCents, formatDate } from '@/data/vowosData';
import { MessageTemplates, emailShell } from '@/lib/messaging';

/** The official signed boutique contract PDF (kept on file for reference/download). */
export const CONTRACT_PDF_URL =
  'https://d64gsuwffb70l.cloudfront.net/68e827871980859bd64d7f6f_1784514192893_3c5d3d11.pdf';

// ─── Contracts (e-sign) ───

export type ContractStatus = 'Draft' | 'Sent' | 'Signed';

export interface ContractRecord {
  id: string;
  businessId: string | null;
  customerId: string | null;
  customer: string;
  location: LocationId;
  gown: string;
  amountCents: number;
  depositCents: number;
  specialTerms: string;
  status: ContractStatus;
  signToken: string;
  signedName: string | null;
  signedInitials: string | null;
  signedAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export const mapContract = (r: any): ContractRecord => ({
  id: r.id || '',
  businessId: r.business_id ?? null,
  customerId: r.customer_id ?? null,
  customer: r.customer || '',
  location: (r.location ?? 'ido-br') as LocationId,
  gown: r.gown ?? '',
  amountCents: r.amount_cents ?? 0,
  depositCents: r.deposit_cents ?? 0,
  specialTerms: r.special_terms ?? '',
  status: (r.status ?? 'Draft') as ContractStatus,
  signToken: r.sign_token ?? '',
  signedName: r.signed_name ?? null,
  signedInitials: r.signed_initials ?? null,
  signedAt: r.signed_at ?? null,
  sentAt: r.sent_at ?? null,
  createdAt: r.created_at ?? '',
});

/**
 * Standard I Do Bridal Couture / Proper & Company sales agreement terms.
 * Mirrors the boutique's printed special-order contract; each clause is
 * shown on the e-sign page and acknowledged with the bride's signature.
 */
export const CONTRACT_TERMS: { title: string; body: string }[] = [
  {
    title: 'All sales are final',
    body:
      'Due to the custom nature of bridal merchandise, all sales are final. No refunds, exchanges, or cancellations are permitted once this agreement is signed — including changes to wedding plans or dates.',
  },
  {
    title: 'Deposit & balance',
    body:
      'A non-refundable deposit of at least 60% of the purchase price is due at signing. The remaining balance is due in full when the merchandise arrives at the boutique, and must be paid before the gown is released for fittings or pickup.',
  },
  {
    title: 'Special orders & sizing',
    body:
      'Special-order gowns are ordered to the designer size chart closest to the measurements taken at signing. Bridal sizing differs from ready-to-wear; the boutique is not responsible for changes in the bride\u2019s measurements after the order is placed.',
  },
  {
    title: 'Alterations',
    body:
      'Nearly all gowns require alterations for a perfect fit. Alterations are NOT included in the purchase price and are quoted separately at the first fitting. The bride may use the boutique\u2019s alterations department or a seamstress of her choosing.',
  },
  {
    title: 'Estimated delivery',
    body:
      'Designer delivery estimates are provided in good faith and typically run 4\u20136 months for gowns. Delivery dates are estimates, not guarantees; the boutique will notify the bride promptly when merchandise arrives.',
  },
  {
    title: 'Storage & pickup',
    body:
      'Merchandise must be picked up within 30 days of arrival notification unless a fitting schedule is arranged. A storage fee may apply after 30 days. The boutique is not responsible for merchandise left more than 90 days after arrival.',
  },
  {
    title: 'Inspection & release',
    body:
      'The bride (or her representative) will inspect merchandise at pickup. Once merchandise leaves the boutique, it is accepted in good condition and the boutique is no longer responsible for damage, loss, or cleaning.',
  },
  {
    title: 'Color & dye lots',
    body:
      'Slight variations in color, beading, and lace placement can occur between sample gowns and ordered gowns due to dye lots and hand-finishing. Such variations are normal and are not defects.',
  },
];

/** Load every contract (staff view). */
export async function fetchContracts(): Promise<ContractRecord[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapContract);
}

/** Load contracts for a single bride (portal). */
export async function fetchContractsFor(customerId: string, businessId: string): Promise<ContractRecord[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapContract);
}

export interface NewContractInput {
  customerId?: string | null;
  customer: string;
  location: LocationId;
  gown: string;
  amountCents: number;
  depositCents: number;
  specialTerms: string;
}

const newToken = () => {
  const secureCrypto = globalThis.crypto;
  if (!secureCrypto || typeof secureCrypto.randomUUID !== 'function') {
    throw new Error('Secure random UUID generation is unavailable.');
  }
  return secureCrypto.randomUUID();
};

async function resolveActiveBusinessId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return null;
  const { data, error } = await supabase
    .from('business_memberships')
    .select('business_id')
    .eq('user_id', auth.user.id)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.business_id ?? null;
}

async function resolveCustomerId(
  businessId: string,
  customerName: string,
  explicitCustomerId?: string | null,
): Promise<string | null> {
  if (explicitCustomerId) return explicitCustomerId;
  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('name', customerName)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

/** Create a Draft contract; returns the new record or null. */
export async function createContract(
  input: NewContractInput,
  existing: ContractRecord[],
): Promise<{ record: ContractRecord | null; error: string | null }> {
  const businessId = await resolveActiveBusinessId();
  if (!businessId) {
    return { record: null, error: 'Active business context required before creating a contract.' };
  }
  const customerId = await resolveCustomerId(businessId, input.customer, input.customerId);
  const maxNum = existing.reduce((max, c) => {
    const m = /^CT-(\d+)$/.exec(c.id);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 3000);
  const record: ContractRecord = {
    id: `CT-${maxNum + 1}`,
    businessId,
    customerId,
    customer: input.customer,
    location: input.location,
    gown: input.gown,
    amountCents: input.amountCents,
    depositCents: input.depositCents,
    specialTerms: input.specialTerms,
    status: 'Draft',
    signToken: newToken(),
    signedName: null,
    signedInitials: null,
    signedAt: null,
    sentAt: null,
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('contracts').insert({
    id: record.id,
    business_id: record.businessId,
    customer_id: record.customerId,
    customer: record.customer,
    location: record.location,
    gown: record.gown,
    amount_cents: record.amountCents,
    deposit_cents: record.depositCents,
    special_terms: record.specialTerms,
    status: record.status,
    sign_token: record.signToken,
  });
  if (error) return { record: null, error: error.message };
  return { record, error: null };
}

/** Mark a contract as Sent (called after the sign link is delivered). */
export async function markContractSent(id: string): Promise<void> {
  await supabase
    .from('contracts')
    .update({ status: 'Sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .neq('status', 'Signed');
}

// ─── Alterations tracker ───

export const ALTERATION_STATUSES = [
  'Not Started',
  'In Progress',
  'Final Fitting',
  'Ready for Pickup',
  'Picked Up',
] as const;
export type AlterationStatus = (typeof ALTERATION_STATUSES)[number];

export interface AlterationTask {
  label: string;
  done: boolean;
}

export interface AlterationJob {
  id: string;
  businessId: string | null;
  customerId: string | null;
  customer: string;
  gown: string;
  seamstress: string;
  status: AlterationStatus;
  tasks: AlterationTask[];
  nextFitting: string | null;
  dueDate: string | null;
  priceCents: number;
  notes: string;
  location: LocationId;
  createdAt: string;
}

export const ALTERATION_TASK_PRESETS = [
  'Hem to floor length',
  'Take in bodice sides',
  'Take in waist',
  'Add bustle',
  'Tighten straps',
  'Add cups',
  'Beading / lace repair',
  'Shorten sleeves',
  'Final steam & press',
];

export const SEAMSTRESSES = ['Rosa M.', 'Linh P.', 'Odette B.'];

export const mapAlteration = (r: any): AlterationJob => ({
  id: r.id || '',
  businessId: r.business_id ?? null,
  customerId: r.customer_id ?? null,
  customer: r.customer || '',
  gown: r.gown ?? '',
  seamstress: r.seamstress ?? '',
  status: (r.status ?? 'Not Started') as AlterationStatus,
  tasks: Array.isArray(r.tasks) ? r.tasks.map((t: any) => ({ label: String(t.label ?? ''), done: !!t.done })) : [],
  nextFitting: r.next_fitting ? String(r.next_fitting).slice(0, 10) : null,
  dueDate: r.due_date ? String(r.due_date).slice(0, 10) : null,
  priceCents: r.price_cents ?? 0,
  notes: r.notes ?? '',
  location: (r.location ?? 'ido-br') as LocationId,
  createdAt: r.created_at ?? '',
});

/** Load every alteration job (staff view). */
export async function fetchAlterations(): Promise<AlterationJob[]> {
  const { data, error } = await supabase
    .from('alterations')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error || !data) return [];
  return data.map(mapAlteration);
}

/** Load alteration jobs for a single bride (portal). */
export async function fetchAlterationsFor(customerId: string, businessId: string): Promise<AlterationJob[]> {
  const { data, error } = await supabase
    .from('alterations')
    .select('*')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapAlteration);
}

export interface NewAlterationInput {
  customerId?: string | null;
  customer: string;
  gown: string;
  seamstress: string;
  tasks: string[];
  nextFitting: string;
  dueDate: string;
  priceCents: number;
  notes: string;
  location: LocationId;
}

/** Create a new alteration job. */
export async function createAlteration(
  input: NewAlterationInput,
  existing: AlterationJob[],
): Promise<{ record: AlterationJob | null; error: string | null }> {
  const businessId = await resolveActiveBusinessId();
  if (!businessId) {
    return { record: null, error: 'Active business context required before creating an alteration job.' };
  }
  const customerId = await resolveCustomerId(businessId, input.customer, input.customerId);
  const maxNum = existing.reduce((max, a) => {
    const m = /^ALT-(\d+)$/.exec(a.id);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 4000);
  const record: AlterationJob = {
    id: `ALT-${maxNum + 1}`,
    businessId,
    customerId,
    customer: input.customer,
    gown: input.gown,
    seamstress: input.seamstress,
    status: 'Not Started',
    tasks: input.tasks.map((label) => ({ label, done: false })),
    nextFitting: input.nextFitting || null,
    dueDate: input.dueDate || null,
    priceCents: input.priceCents,
    notes: input.notes,
    location: input.location,
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('alterations').insert({
    id: record.id,
    business_id: record.businessId,
    customer_id: record.customerId,
    customer: record.customer,
    gown: record.gown,
    seamstress: record.seamstress,
    status: record.status,
    tasks: record.tasks,
    next_fitting: record.nextFitting,
    due_date: record.dueDate,
    price_cents: record.priceCents,
    notes: record.notes,
    location: record.location,
  });
  if (error) return { record: null, error: error.message };
  return { record, error: null };
}

/** Persist task list / status / fitting date changes on a job. */
export async function updateAlteration(
  id: string,
  patch: Partial<Pick<AlterationJob, 'tasks' | 'status' | 'nextFitting' | 'seamstress' | 'notes' | 'priceCents'>>,
): Promise<string | null> {
  const row: Record<string, any> = {};
  if (patch.tasks !== undefined) row.tasks = patch.tasks;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.nextFitting !== undefined) row.next_fitting = patch.nextFitting || null;
  if (patch.seamstress !== undefined) row.seamstress = patch.seamstress;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.priceCents !== undefined) row.price_cents = patch.priceCents;
  const { error } = await supabase.from('alterations').update(row).eq('id', id);
  return error ? error.message : null;
}

// ─── Secret-link URL builders & message templates ───

/** Public e-sign page URL for a contract. */
export function contractSignUrl(c: ContractRecord): string {
  return `${window.location.origin}/sign/${c.id}?t=${c.signToken}`;
}

/** Private bride portal URL. */
export function portalUrl(bride: Customer): string {
  return `${window.location.origin}/portal/${bride.id}?t=${bride.portalToken}`;
}

/** "Please review & sign your contract" email/text. */
export function contractSignTemplates(c: ContractRecord): MessageTemplates {
  const loc = locationById(c.location);
  const url = contractSignUrl(c);
  const first = c.customer.split(' ')[0];
  return {
    emailSubject: `Your bridal contract is ready to sign — ${loc.business}`,
    emailText: `Hi ${c.customer},\n\nYour bridal purchase agreement (${c.id}) for ${c.gown} is ready for your electronic signature.\n\nPurchase total: ${formatCents(c.amountCents)} · Deposit: ${formatCents(c.depositCents)}\n\nReview and sign securely online: ${url}\n\nQuestions? Call ${loc.phone}.\n\nWarmly,\n${loc.business}\n${loc.address}`,
    emailHtml: emailShell(
      'Your contract is ready to sign',
      `<p>Hi ${first},</p>
       <p>Your bridal purchase agreement <strong>${c.id}</strong> for <em>${c.gown}</em> is ready for your electronic signature.</p>
       <p>Purchase total: <strong>${formatCents(c.amountCents)}</strong> · Deposit: <strong>${formatCents(c.depositCents)}</strong></p>
       <p style="margin:20px 0"><a href="${url}" style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px">Review &amp; sign securely</a></p>
       <p>Or copy this link: <a href="${url}">${url}</a></p>
       <p>Questions? Call <a href="tel:${loc.phone}">${loc.phone}</a>.</p>`,
      `${loc.business} · ${loc.address} · ${loc.phone}`,
    ),
    sms: `${loc.business}: Hi ${first}! Your bridal contract ${c.id} is ready to review & e-sign: ${url} Questions? ${loc.phone}`,
  };
}

/** "Here's your private bridal portal" email/text. */
export function portalLinkTemplates(bride: Customer): MessageTemplates {
  const loc = locationById(bride.location);
  const url = portalUrl(bride);
  const first = bride.name.split(' ')[0];
  return {
    emailSubject: `Your private bridal portal — ${loc.business}`,
    emailText: `Hi ${bride.name},\n\nWelcome to your private bridal portal! Use your personal link any time to see your upcoming appointments, contracts, alterations progress, and balances — and pay online securely.\n\nYour portal: ${url}\n\nPlease keep this link private. Questions? Call ${loc.phone}.\n\nWarmly,\n${loc.business}\n${loc.address}`,
    emailHtml: emailShell(
      `Welcome to your bridal portal, ${first}!`,
      `<p>Hi ${first},</p>
       <p>Your private bridal portal is ready. Use it any time to check your <strong>appointments</strong>, <strong>contract</strong>, <strong>alterations progress</strong>, and <strong>balances</strong> — and pay securely online.</p>
       <p style="margin:20px 0"><a href="${url}" style="background:#e11d48;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px">Open my bridal portal</a></p>
       <p>Or copy this link: <a href="${url}">${url}</a></p>
       <p>Please keep this link private — it's unique to you.</p>`,
      `${loc.business} · ${loc.address} · ${loc.phone}`,
    ),
    sms: `${loc.business}: Hi ${first}! Here's your private bridal portal — appointments, contract, alterations & payments all in one place: ${url}`,
  };
}

/** "Your gown is ready for pickup" notice from the alterations tracker. */
export function pickupReadyTemplates(job: AlterationJob): MessageTemplates {
  const loc = locationById(job.location);
  const first = job.customer.split(' ')[0];
  const due = job.dueDate ? ` Please pick up by ${formatDate(job.dueDate)}.` : '';
  return {
    emailSubject: `Your gown is ready for pickup! — ${loc.business}`,
    emailText: `Hi ${job.customer},\n\nWonderful news — alterations on ${job.gown} are complete and your gown is pressed, bagged, and ready for pickup at ${loc.business}, ${loc.address}.${due}\n\nBoutique hours: ${loc.hours}. Call ${loc.phone} to arrange a pickup time.\n\nWe can't wait for you to take her home!\n— ${loc.business}`,
    emailHtml: emailShell(
      'Your gown is ready for pickup!',
      `<p>Hi ${first},</p>
       <p>Wonderful news — alterations on <strong>${job.gown}</strong> are complete. Your gown is pressed, bagged, and ready for pickup.${due}</p>
       <p><strong>${loc.business}</strong><br/>${loc.address}<br/>${loc.hours}</p>
       <p>Call <a href="tel:${loc.phone}">${loc.phone}</a> to arrange a pickup time.</p>`,
      `${loc.business} · ${loc.address} · ${loc.phone}`,
    ),
    sms: `${loc.business}: Hi ${first}! Your gown (${job.gown}) is altered, pressed & ready for pickup at ${loc.address}.${due} Call ${loc.phone} to arrange a time.`,
  };
}

/** Percent of tasks completed on a job (0–100). */
export function jobProgress(job: AlterationJob): number {
  if (!job.tasks.length) return job.status === 'Picked Up' ? 100 : 0;
  return Math.round((job.tasks.filter((t) => t.done).length / job.tasks.length) * 100);
}

