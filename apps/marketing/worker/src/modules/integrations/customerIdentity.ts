import type { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerIdentityInput {
  businessId: string;
  provider: string;
  externalId?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  locationId?: string | null;
}

export interface CustomerIdentityResult {
  customerId: string | null;
  resolution: 'PROVIDER_ID' | 'EMAIL' | 'PHONE' | 'CREATED' | 'UNRESOLVED';
  email: string | null;
  phone: string | null;
}

export const normalizeCustomerEmail = (value?: string | null): string | null => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized && /^\S+@\S+\.\S+$/.test(normalized) ? normalized : null;
};

export const normalizeCustomerPhone = (value?: string | null): string | null => {
  if (!value) return null;
  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (raw.startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
};

const providerKey = (provider: string): string =>
  provider.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 64);

const isUniqueViolation = (error: unknown): boolean =>
  Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505');

async function providerIdentityCustomer(
  db: SupabaseClient | any,
  businessId: string,
  provider: string,
  externalId: string,
): Promise<string | null> {
  const { data, error } = await db
    .from('customer_external_identities')
    .select('customer_id')
    .eq('business_id', businessId)
    .eq('provider', provider)
    .eq('external_id', externalId)
    .maybeSingle();
  if (error) throw new Error(`Provider customer identity lookup failed: ${error.message}`);
  return data?.customer_id ?? null;
}

async function ensureProviderIdentity(
  db: SupabaseClient | any,
  input: { businessId: string; provider: string; externalId: string; customerId: string },
): Promise<string> {
  const existing = await providerIdentityCustomer(db, input.businessId, input.provider, input.externalId);
  if (existing) return existing;

  const { error } = await db.from('customer_external_identities').insert({
    business_id: input.businessId,
    customer_id: input.customerId,
    connected_account_id: null,
    provider: input.provider,
    external_id: input.externalId,
  });
  if (!error) return input.customerId;
  if (!isUniqueViolation(error)) throw new Error(`Provider customer identity insert failed: ${error.message}`);

  const raced = await providerIdentityCustomer(db, input.businessId, input.provider, input.externalId);
  if (!raced) throw new Error('Provider customer identity conflict could not be resolved.');
  return raced;
}

/**
 * Canonical integration identity resolution.
 *
 * Precedence is provider identity -> normalized email -> normalized phone ->
 * explicit creation. No placeholder names, fake emails, or cross-tenant search.
 */
export async function resolveIntegrationCustomer(
  db: SupabaseClient | any,
  input: CustomerIdentityInput,
): Promise<CustomerIdentityResult> {
  const provider = providerKey(input.provider);
  const externalId = typeof input.externalId === 'string' && input.externalId.trim()
    ? input.externalId.trim().slice(0, 512)
    : null;
  const email = normalizeCustomerEmail(input.email);
  const phone = normalizeCustomerPhone(input.phone);
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 256) : '';

  if (!input.businessId || !provider) {
    throw new Error('businessId and provider are required for customer identity resolution.');
  }

  if (externalId) {
    const customerId = await providerIdentityCustomer(db, input.businessId, provider, externalId);
    if (customerId) return { customerId, resolution: 'PROVIDER_ID', email, phone };
  }

  let existingCustomerId: string | null = null;
  let resolution: CustomerIdentityResult['resolution'] = 'UNRESOLVED';

  if (email) {
    const { data, error } = await db
      .from('customers')
      .select('id')
      .eq('business_id', input.businessId)
      .eq('email', email)
      .limit(2);
    if (error) throw new Error(`Customer email lookup failed: ${error.message}`);
    if ((data ?? []).length > 1) throw new Error('Customer email is duplicated inside this organization; manual identity repair is required.');
    if (data?.[0]?.id) {
      existingCustomerId = data[0].id;
      resolution = 'EMAIL';
    }
  }

  if (!existingCustomerId && phone) {
    const { data, error } = await db
      .from('customers')
      .select('id')
      .eq('business_id', input.businessId)
      .eq('phone', phone)
      .limit(2);
    if (error) throw new Error(`Customer phone lookup failed: ${error.message}`);
    if ((data ?? []).length > 1) throw new Error('Customer phone is duplicated inside this organization; manual identity repair is required.');
    if (data?.[0]?.id) {
      existingCustomerId = data[0].id;
      resolution = 'PHONE';
    }
  }

  if (existingCustomerId) {
    const canonicalId = externalId
      ? await ensureProviderIdentity(db, { businessId: input.businessId, provider, externalId, customerId: existingCustomerId })
      : existingCustomerId;
    return { customerId: canonicalId, resolution, email, phone };
  }

  // Creation requires authentic human identity attributes. A provider id by
  // itself is not enough to manufacture a customer record.
  if (!name || (!email && !phone)) {
    return { customerId: null, resolution: 'UNRESOLVED', email, phone };
  }

  const { data: created, error: createError } = await db
    .from('customers')
    .insert({
      business_id: input.businessId,
      location_id: input.locationId ?? null,
      name,
      email,
      phone,
      status: 'Active',
    })
    .select('id')
    .single();
  if (createError || !created?.id) {
    throw new Error(`Customer creation failed: ${createError?.message || 'No customer id returned.'}`);
  }

  if (externalId) {
    const canonicalId = await ensureProviderIdentity(db, {
      businessId: input.businessId,
      provider,
      externalId,
      customerId: created.id,
    });
    if (canonicalId !== created.id) {
      // Another concurrent webhook won the provider-identity race. The duplicate
      // customer has no integration references yet, so remove it best-effort.
      await db.from('customers').delete().eq('id', created.id).eq('business_id', input.businessId);
      return { customerId: canonicalId, resolution: 'PROVIDER_ID', email, phone };
    }
  }

  return { customerId: created.id, resolution: 'CREATED', email, phone };
}
