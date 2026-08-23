import { db, type ConnectionRow } from '../growth/store';

type JsonObject = Record<string, unknown>;

function asJsonObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

/**
 * Supabase replaces a jsonb column on update, so reauthorization must merge the
 * existing metadata first or configured locationMappings are silently erased.
 */
export function mergeShopifyConnectionMetadata(existing: unknown, incoming: unknown): JsonObject {
  return {
    ...asJsonObject(existing),
    ...asJsonObject(incoming),
  };
}

export async function upsertShopifyConnection(
  businessId: string,
  externalAccountId: string,
  patch: Partial<ConnectionRow>,
): Promise<ConnectionRow> {
  const existing = await db()
    .from('growth_provider_connections')
    .select('*')
    .eq('business_id', businessId)
    .eq('provider', 'shopify')
    .eq('external_account_id', externalAccountId)
    .maybeSingle();

  if (existing.error) throw new Error(`Shopify connection lookup failed: ${existing.error.message}`);
  if (existing.data) {
    const current = existing.data as ConnectionRow;
    const nextPatch: Partial<ConnectionRow> = patch.metadata === undefined
      ? patch
      : {
          ...patch,
          metadata: mergeShopifyConnectionMetadata(current.metadata, patch.metadata),
        };

    const { data, error } = await db()
      .from('growth_provider_connections')
      .update(nextPatch)
      .eq('id', current.id)
      .select('*')
      .single();
    if (error) throw new Error(`Shopify connection update failed: ${error.message}`);
    return data as ConnectionRow;
  }

  const { data, error } = await db()
    .from('growth_provider_connections')
    .insert({
      business_id: businessId,
      provider: 'shopify',
      external_account_id: externalAccountId,
      ...patch,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Shopify connection insert failed: ${error.message}`);
  return data as ConnectionRow;
}

export async function markShopifyConnectionError(
  businessId: string,
  shopDomain: string,
  message: string,
): Promise<void> {
  const normalized = shopDomain.trim().toLowerCase();
  const { data, error } = await db()
    .from('growth_provider_connections')
    .select('id')
    .eq('business_id', businessId)
    .eq('provider', 'shopify')
    .ilike('metadata->>shopDomain', normalized)
    .limit(1)
    .maybeSingle();
  if (error || !data?.id) return;

  await db()
    .from('growth_provider_connections')
    .update({ status: 'error', last_error: message })
    .eq('id', data.id);
}
