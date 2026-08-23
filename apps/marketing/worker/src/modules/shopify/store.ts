import { db, type ConnectionRow } from '../growth/store';

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
    const { data, error } = await db()
      .from('growth_provider_connections')
      .update(patch)
      .eq('id', (existing.data as ConnectionRow).id)
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
  const { data, error } = await db()
    .from('growth_provider_connections')
    .select('id,metadata')
    .eq('business_id', businessId)
    .eq('provider', 'shopify')
    .limit(100);
  if (error) return;

  const normalized = shopDomain.toLowerCase();
  const match = (data ?? []).find((row) => {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    return typeof metadata.shopDomain === 'string' && metadata.shopDomain.toLowerCase() === normalized;
  });
  if (!match?.id) return;

  await db()
    .from('growth_provider_connections')
    .update({ status: 'error', last_error: message })
    .eq('id', match.id);
}
