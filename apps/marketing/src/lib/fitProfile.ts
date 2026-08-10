// ─── VowOS Fit Profile — bride measurements & try-on notes ───
// Single source of truth for the measurement fields, try-on ratings, and the
// database accessors used by the staff Fit Profile modal and the bride portal.

import { supabase } from '@/lib/supabase';

// ─── Measurements ───

export interface MeasurementSet {
  id: string;
  brideId: string;
  customer: string;
  takenOn: string; // ISO date
  bust: string;
  waist: string;
  hips: string;
  hollowToHem: string;
  height: string;
  heelHeight: string;
  streetSize: string;
  gownSize: string;
  notes: string;
  takenBy: string;
  createdAt: string;
}

/** Field metadata shared by the staff form, history cards, and the portal. */
export const MEASUREMENT_FIELDS: { key: keyof MeasurementSet; label: string; placeholder: string }[] = [
  { key: 'bust', label: 'Bust', placeholder: '36"' },
  { key: 'waist', label: 'Waist', placeholder: '28"' },
  { key: 'hips', label: 'Hips', placeholder: '38"' },
  { key: 'hollowToHem', label: 'Hollow to hem', placeholder: '58"' },
  { key: 'height', label: 'Height', placeholder: `5'6"` },
  { key: 'heelHeight', label: 'Heel height', placeholder: '2.5"' },
  { key: 'streetSize', label: 'Street size', placeholder: '8' },
  { key: 'gownSize', label: 'Gown size ordered', placeholder: '12' },
];

const mapMeasurement = (r: any): MeasurementSet => ({
  id: r.id,
  brideId: r.bride_id,
  customer: r.customer,
  takenOn: String(r.taken_on ?? '').slice(0, 10),
  bust: r.bust ?? '',
  waist: r.waist ?? '',
  hips: r.hips ?? '',
  hollowToHem: r.hollow_to_hem ?? '',
  height: r.height ?? '',
  heelHeight: r.heel_height ?? '',
  streetSize: r.street_size ?? '',
  gownSize: r.gown_size ?? '',
  notes: r.notes ?? '',
  takenBy: r.taken_by ?? '',
  createdAt: r.created_at ?? '',
});

/** Full measurement history for a bride, newest first. */
export async function fetchMeasurements(brideId: string): Promise<MeasurementSet[]> {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('bride_id', brideId)
    .order('taken_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapMeasurement);
}

export interface NewMeasurementInput {
  brideId: string;
  customer: string;
  takenOn: string;
  bust: string;
  waist: string;
  hips: string;
  hollowToHem: string;
  height: string;
  heelHeight: string;
  streetSize: string;
  gownSize: string;
  notes: string;
  takenBy: string;
}

/** Record a new measurement set; returns the saved record or an error. */
export async function addMeasurement(
  input: NewMeasurementInput,
): Promise<{ record: MeasurementSet | null; error: string | null }> {
  const { data, error } = await supabase
    .from('measurements')
    .insert({
      bride_id: input.brideId,
      customer: input.customer,
      taken_on: input.takenOn,
      bust: input.bust,
      waist: input.waist,
      hips: input.hips,
      hollow_to_hem: input.hollowToHem,
      height: input.height,
      heel_height: input.heelHeight,
      street_size: input.streetSize,
      gown_size: input.gownSize,
      notes: input.notes,
      taken_by: input.takenBy,
    })
    .select()
    .single();
  if (error || !data) return { record: null, error: error?.message ?? 'Insert failed' };
  return { record: mapMeasurement(data), error: null };
}

/** Delete a measurement set (mistake correction). */
export async function deleteMeasurement(id: string): Promise<string | null> {
  const { error } = await supabase.from('measurements').delete().eq('id', id);
  return error ? error.message : null;
}

// ─── Try-on notes ───

export const TRY_ON_RATINGS = ['Said Yes', 'Loved', 'Liked', 'Not For Her'] as const;
export type TryOnRating = (typeof TRY_ON_RATINGS)[number];

export const RATING_STYLES: Record<TryOnRating, string> = {
  'Said Yes': 'bg-brand-primary text-white ring-focus-ring',
  Loved: 'bg-brand-soft text-brand-primary-hover ring-focus-ring',
  Liked: 'bg-sky-50 text-sky-700 ring-sky-200',
  'Not For Her': 'bg-stone-100 text-stone-500 ring-stone-200',
};

export interface TryOnNote {
  id: string;
  brideId: string;
  customer: string;
  gownName: string;
  designer: string;
  priceCents: number;
  rating: TryOnRating;
  notes: string;
  stylist: string;
  triedOn: string; // ISO date
  createdAt: string;
}

const mapTryOn = (r: any): TryOnNote => ({
  id: r.id,
  brideId: r.bride_id,
  customer: r.customer,
  gownName: r.gown_name ?? '',
  designer: r.designer ?? '',
  priceCents: r.price_cents ?? 0,
  rating: (TRY_ON_RATINGS.includes(r.rating) ? r.rating : 'Liked') as TryOnRating,
  notes: r.notes ?? '',
  stylist: r.stylist ?? '',
  triedOn: String(r.tried_on ?? '').slice(0, 10),
  createdAt: r.created_at ?? '',
});

/** All try-on notes for a bride, newest first. */
export async function fetchTryOnNotes(brideId: string): Promise<TryOnNote[]> {
  const { data, error } = await supabase
    .from('try_on_notes')
    .select('*')
    .eq('bride_id', brideId)
    .order('tried_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapTryOn);
}

export interface NewTryOnInput {
  brideId: string;
  customer: string;
  gownName: string;
  designer: string;
  priceCents: number;
  rating: TryOnRating;
  notes: string;
  stylist: string;
  triedOn: string;
}

/** Log a gown try-on with the stylist's notes. */
export async function addTryOnNote(
  input: NewTryOnInput,
): Promise<{ record: TryOnNote | null; error: string | null }> {
  const { data, error } = await supabase
    .from('try_on_notes')
    .insert({
      bride_id: input.brideId,
      customer: input.customer,
      gown_name: input.gownName,
      designer: input.designer,
      price_cents: input.priceCents,
      rating: input.rating,
      notes: input.notes,
      stylist: input.stylist,
      tried_on: input.triedOn,
    })
    .select()
    .single();
  if (error || !data) return { record: null, error: error?.message ?? 'Insert failed' };
  return { record: mapTryOn(data), error: null };
}

/** Delete a try-on note. */
export async function deleteTryOnNote(id: string): Promise<string | null> {
  const { error } = await supabase.from('try_on_notes').delete().eq('id', id);
  return error ? error.message : null;
}

// ─── Daily digest settings (stored in app_settings, read by the auto-comms cron) ───

export interface DigestSettings {
  email: string;
  enabled: boolean;
}

/** Load the morning digest recipient + on/off switch. */
export async function fetchDigestSettings(): Promise<DigestSettings> {
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['digest_email', 'digest_enabled']);
  const rows = data ?? [];
  const email = rows.find((r: any) => r.key === 'digest_email')?.value ?? '';
  const enabled = (rows.find((r: any) => r.key === 'digest_enabled')?.value ?? 'on') !== 'off';
  return { email, enabled };
}

/** Save the morning digest recipient + on/off switch. */
export async function saveDigestSettings(s: DigestSettings): Promise<string | null> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('app_settings').upsert([
    { key: 'digest_email', value: s.email.trim(), updated_at: now },
    { key: 'digest_enabled', value: s.enabled ? 'on' : 'off', updated_at: now },
  ]);
  return error ? error.message : null;
}
