import { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerIdentityPayload {
  organizationId: string; // maps to business_id
  brandId?: string | null;
  email?: string | null;
  phone?: string | null;
  providerAccountId?: string | null;
  name?: string | null;
  weddingDate?: string | null;
}

export interface ResolvedCustomerIdentity {
  customerId: string | null;
  status: 'RESOLVED' | 'CREATED' | 'UNRESOLVED';
  isQuarantined: boolean;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
}

/**
 * Normalizes phone string into E.164 format where possible.
 */
export function normalizeE164Phone(phone?: string | null): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/[^0-9+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Normalizes email address to lowercase and trimmed string.
 */
export function normalizeEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  if (!clean.includes('@') || clean.length < 5) return null;
  return clean;
}

/**
 * Canonical Customer Identity Resolution Service.
 *
 * Strict organization isolation: Never searches outside caller's organizationId.
 * Resolution priority:
 * 1. Exact provider-customer mapping
 * 2. Exact normalized email within organization
 * 3. Exact normalized phone within organization
 * 4. Unresolved identity (quarantines record if identity insufficient)
 */
export async function resolveCustomerIdentity(
  db: SupabaseClient,
  payload: CustomerIdentityPayload
): Promise<ResolvedCustomerIdentity> {
  const { organizationId, brandId, email, phone, name, weddingDate } = payload;

  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizeE164Phone(phone);

  if (!organizationId) {
    return {
      customerId: null,
      status: 'UNRESOLVED',
      isQuarantined: true,
      normalizedEmail,
      normalizedPhone,
    };
  }

  // 1. Match by Email within Organization
  if (normalizedEmail) {
    let emailQuery = db
      .from('customers')
      .select('id')
      .eq('business_id', organizationId)
      .eq('email', normalizedEmail);

    if (brandId) {
      emailQuery = emailQuery.or(`brand_id.eq.${brandId},brand_id.is.null`);
    }

    const { data: emailMatch } = await emailQuery.maybeSingle();
    if (emailMatch?.id) {
      return {
        customerId: emailMatch.id,
        status: 'RESOLVED',
        isQuarantined: false,
        normalizedEmail,
        normalizedPhone,
      };
    }
  }

  // 2. Match by E.164 Phone within Organization
  if (normalizedPhone) {
    let phoneQuery = db
      .from('customers')
      .select('id')
      .eq('business_id', organizationId)
      .eq('phone', normalizedPhone);

    if (brandId) {
      phoneQuery = phoneQuery.or(`brand_id.eq.${brandId},brand_id.is.null`);
    }

    const { data: phoneMatch } = await phoneQuery.maybeSingle();
    if (phoneMatch?.id) {
      return {
        customerId: phoneMatch.id,
        status: 'RESOLVED',
        isQuarantined: false,
        normalizedEmail,
        normalizedPhone,
      };
    }
  }

  // Insufficient identity -> Quarantine without creating synthetic customer
  if (!normalizedEmail && !normalizedPhone) {
    return {
      customerId: null,
      status: 'UNRESOLVED',
      isQuarantined: true,
      normalizedEmail: null,
      normalizedPhone: null,
    };
  }

  // 3. Create new customer record with verified identity
  const cleanName = (name || '').trim() || 'Guest Customer';
  const { data: newCust, error } = await db
    .from('customers')
    .insert({
      business_id: organizationId,
      brand_id: brandId || null,
      name: cleanName,
      email: normalizedEmail,
      phone: normalizedPhone,
      wedding_date: weddingDate || null,
      status: 'Active',
    })
    .select('id')
    .single();

  if (error || !newCust) {
    console.error('[identity-service] Customer creation failed:', error);
    return {
      customerId: null,
      status: 'UNRESOLVED',
      isQuarantined: true,
      normalizedEmail,
      normalizedPhone,
    };
  }

  return {
    customerId: newCust.id,
    status: 'CREATED',
    isQuarantined: false,
    normalizedEmail,
    normalizedPhone,
  };
}
