// Runtime-safe settings facade.
//
// The legacy settings module still owns the domain types/default values. This
// facade replaces only the persistence resolver/writer so every existing
// `@/lib/settings` consumer gets deterministic business/brand/location scoping
// without duplicating those domain definitions.

export * from './settings';

import { supabase } from '@/lib/supabase';
import { getActiveBusinessId } from '@/config/hostConfig';
import type { EffectiveSettingResult, SettingsContext } from './settings';

interface ResolvedSettingsContext extends SettingsContext {
  dataPlane: 'production' | 'demo';
  businessId?: string;
  brandId?: string;
  locationId?: string;
  userId?: string;
}

type RuntimeSourceScope = EffectiveSettingResult<unknown>['sourceScope'] | 'brand';
type RuntimeEffectiveSettingResult<T> = Omit<EffectiveSettingResult<T>, 'sourceScope'> & {
  sourceScope: RuntimeSourceScope;
};

interface SettingRow {
  id: string;
  data_plane: string;
  business_id: string | null;
  brand_id?: string | null;
  location_id: string | null;
  user_id: string | null;
  setting_namespace: string;
  setting_key: string;
  value_json: unknown;
  status: string;
  version?: number | null;
  updated_at?: string | null;
}

async function resolveSettingsContext(context: SettingsContext & { brandId?: string }): Promise<ResolvedSettingsContext> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && context.dataPlane === 'production') throw authError;

  const userId = context.userId || authData?.user?.id || undefined;
  let businessId = context.businessId;

  if (!businessId && userId) {
    const preferredBusinessId = getActiveBusinessId();
    const { data: memberships, error } = await supabase
      .from('business_memberships')
      .select('business_id,status')
      .eq('user_id', userId);
    if (error) throw error;

    const activeMemberships = (memberships || []).filter((membership) =>
      !membership.status || String(membership.status).toUpperCase() === 'ACTIVE',
    );

    if (preferredBusinessId) {
      const preferred = activeMemberships.find((membership) => membership.business_id === preferredBusinessId);
      if (preferred) businessId = preferred.business_id;
    }

    if (!businessId && activeMemberships.length === 1) {
      businessId = activeMemberships[0].business_id;
    }

    if (!businessId && activeMemberships.length > 1) {
      throw new Error('Multiple organizations are available. Select an organization before changing settings.');
    }
  }

  if (context.dataPlane === 'production' && !businessId) {
    throw new Error('Active organization context is required for production settings.');
  }

  let brandId = context.brandId;
  if (!brandId && context.locationId && businessId) {
    const { data: location, error } = await supabase
      .from('locations')
      .select('brand_id')
      .eq('business_id', businessId)
      .eq('id', context.locationId)
      .maybeSingle();
    if (error) throw error;
    brandId = location?.brand_id || undefined;
  }

  return {
    ...context,
    businessId,
    brandId,
    userId,
  };
}

function rowApplies(row: SettingRow, context: ResolvedSettingsContext): boolean {
  if (row.business_id && row.business_id !== context.businessId) return false;
  if (row.user_id && row.user_id !== context.userId) return false;
  if (row.location_id && row.location_id !== context.locationId) return false;
  if (row.brand_id && row.brand_id !== context.brandId) return false;
  return true;
}

function rowSpecificity(row: SettingRow): number {
  // Combined scopes are intentionally supported. A user+location override beats
  // a user-only override; a location+brand override beats a brand-only value.
  return (row.user_id ? 8 : 0)
    + (row.location_id ? 4 : 0)
    + (row.brand_id ? 2 : 0)
    + (row.business_id ? 1 : 0);
}

function sourceScope(row: SettingRow): RuntimeSourceScope {
  if (row.user_id) return 'user';
  if (row.location_id) return 'location';
  if (row.brand_id) return 'brand';
  if (row.business_id) return 'business';
  return 'platform';
}

export async function resolveEffectiveSetting<T>(
  namespace: string,
  key: string,
  context: SettingsContext & { brandId?: string },
  defaultValue: T,
): Promise<RuntimeEffectiveSettingResult<T>> {
  try {
    const resolved = await resolveSettingsContext(context);

    let query = supabase
      .from('settings_values')
      .select('*')
      .eq('setting_namespace', namespace)
      .eq('setting_key', key)
      .eq('data_plane', resolved.dataPlane)
      .eq('status', 'active');

    if (resolved.businessId) {
      query = query.or(`business_id.is.null,business_id.eq.${resolved.businessId}`);
    } else {
      query = query.is('business_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;

    const candidates = ((data || []) as SettingRow[])
      .filter((row) => rowApplies(row, resolved))
      .sort((a, b) => rowSpecificity(b) - rowSpecificity(a));

    const effective = candidates[0];
    if (!effective) {
      return {
        value: defaultValue,
        sourceScope: 'default',
        isDefault: true,
        isOverride: false,
        version: 0,
      };
    }

    const scope = sourceScope(effective);
    return {
      value: effective.value_json as T,
      sourceScope: scope,
      isDefault: false,
      isOverride: scope === 'user' || scope === 'location' || scope === 'brand',
      version: effective.version || 1,
      updatedAt: effective.updated_at || undefined,
    };
  } catch (error) {
    console.error(`Error resolving effective setting ${namespace}:${key}`, error);
    if (context.dataPlane === 'production') throw error;
    return {
      value: defaultValue,
      sourceScope: 'default',
      isDefault: true,
      isOverride: false,
      version: 0,
    };
  }
}

export async function saveScopedSetting<T>(
  namespace: string,
  key: string,
  value: T,
  context: SettingsContext & { brandId?: string },
  reason?: string,
): Promise<void> {
  try {
    const resolved = await resolveSettingsContext(context);

    const matchQuery = {
      data_plane: resolved.dataPlane,
      business_id: resolved.businessId || null,
      brand_id: resolved.brandId || null,
      location_id: resolved.locationId || null,
      user_id: context.userId || null,
      setting_namespace: namespace,
      setting_key: key,
    };

    const { data: existing, error: existingError } = await supabase
      .from('settings_values')
      .select('id,version,value_json')
      .match(matchQuery)
      .maybeSingle();
    if (existingError) throw existingError;

    const newVersion = existing ? (existing.version || 1) + 1 : 1;
    const now = new Date().toISOString();
    const { data: savedValue, error } = await supabase
      .from('settings_values')
      .upsert(
        {
          ...matchQuery,
          value_json: value,
          version: newVersion,
          updated_at: now,
          updated_by: resolved.userId || null,
          ...(existing ? {} : { created_by: resolved.userId || null }),
        },
        { onConflict: 'data_plane,business_id,brand_id,location_id,user_id,setting_namespace,setting_key' },
      )
      .select('id')
      .single();
    if (error) throw error;

    const { error: versionError } = await supabase
      .from('settings_versions')
      .insert({
        setting_value_id: savedValue.id,
        version: newVersion,
        previous_value_json: existing?.value_json ?? null,
        new_value_json: value,
        change_reason: reason || null,
        changed_by: resolved.userId || null,
      });
    if (versionError) throw versionError;
  } catch (error) {
    console.error(`Failed to save setting ${namespace}:${key}`, error);
    if (context.dataPlane === 'production') throw error;
    // Demo uses the in-memory Supabase adapter; a missing persistence adapter
    // must never masquerade as a successful production save.
  }
}
