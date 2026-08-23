import { getActiveBusinessId } from '@/config/hostConfig';
import { getActiveDataPlane, supabase } from '@/lib/supabase';
import type { CommerceConnection } from '../types/properCommerceTypes';

type Provider = CommerceConnection['provider'];

type GrowthConnectionRow = {
  provider: string;
  status: string | null;
  external_account_id: string | null;
  display_name: string | null;
  scopes: unknown;
  connected_at: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  metadata: Record<string, unknown> | null;
};

const EMPTY_SHOPIFY_DOMAIN = 'properandcompany.myshopify.com';

function disconnected(provider: Provider): CommerceConnection {
  const names: Record<Provider, string> = {
    shopify: 'Shopify',
    godaddy: 'GoDaddy',
    square: 'Square',
  };
  return {
    brand: 'Proper & Company',
    provider,
    shopDomain: provider === 'shopify' ? EMPTY_SHOPIFY_DOMAIN : '',
    shopName: names[provider],
    status: 'disconnected',
    grantedScopes: [],
    health: 'Disconnected',
    locationMappings: [],
  };
}

function demoShopify(): CommerceConnection {
  return {
    brand: 'Proper & Company',
    provider: 'shopify',
    shopDomain: EMPTY_SHOPIFY_DOMAIN,
    shopName: 'Proper & Co. Boutique',
    status: 'connected',
    grantedScopes: ['read_products', 'read_inventory', 'read_orders'],
    installedAt: '2026-06-15T10:00:00Z',
    lastVerifiedAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    health: 'Healthy',
    locationMappings: [
      { vowosLocationId: 'pc-br', shopifyLocationId: 'demo-br', shopifyLocationName: 'Proper & Co — Baton Rouge' },
      { vowosLocationId: 'pc-cov', shopifyLocationId: 'demo-cov', shopifyLocationName: 'Proper & Co — Covington' },
    ],
  };
}

function readScopes(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((scope): scope is string => typeof scope === 'string') : [];
}

function readLocationMappings(metadata: Record<string, unknown> | null): CommerceConnection['locationMappings'] {
  const raw = metadata?.locationMappings;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const vowosLocationId = row.vowosLocationId;
    const shopifyLocationId = row.shopifyLocationId;
    const shopifyLocationName = row.shopifyLocationName;
    if ((vowosLocationId !== 'pc-br' && vowosLocationId !== 'pc-cov') ||
        typeof shopifyLocationId !== 'string' ||
        typeof shopifyLocationName !== 'string') return [];
    return [{ vowosLocationId, shopifyLocationId, shopifyLocationName }];
  });
}

function mapShopify(row: GrowthConnectionRow): CommerceConnection {
  const metadata = row.metadata ?? {};
  const status = row.status?.toUpperCase() === 'CONNECTED'
    ? 'connected'
    : row.status
      ? 'reauth_required'
      : 'disconnected';
  const shopDomain = typeof metadata.shopDomain === 'string' && metadata.shopDomain.trim()
    ? metadata.shopDomain.trim()
    : EMPTY_SHOPIFY_DOMAIN;
  return {
    brand: 'Proper & Company',
    provider: 'shopify',
    shopDomain,
    shopName: row.display_name || row.external_account_id || 'Shopify',
    status,
    grantedScopes: readScopes(row.scopes),
    installedAt: row.connected_at || undefined,
    lastVerifiedAt: row.connected_at || undefined,
    lastSyncAt: row.last_sync_at || undefined,
    health: status === 'connected' && !row.last_error && row.last_sync_status !== 'failed'
      ? 'Healthy'
      : status === 'connected'
        ? 'Degraded'
        : 'Disconnected',
    locationMappings: readLocationMappings(metadata),
  };
}

/**
 * Commerce connection status must come from the canonical OAuth connection table.
 * Production must never render a fabricated "Connected · Healthy" Shopify state.
 */
export async function fetchCommerceConnections(): Promise<CommerceConnection[]> {
  if (getActiveDataPlane() === 'demo') {
    return [demoShopify(), disconnected('godaddy'), disconnected('square')];
  }

  const businessId = getActiveBusinessId();
  if (!businessId) {
    return [disconnected('shopify'), disconnected('godaddy'), disconnected('square')];
  }

  const { data, error } = await supabase
    .from('growth_provider_connections')
    .select('provider,status,external_account_id,display_name,scopes,connected_at,last_sync_at,last_sync_status,last_error,metadata')
    .eq('business_id', businessId)
    .eq('provider', 'shopify')
    .maybeSingle();

  if (error) throw error;
  const shopify = data ? mapShopify(data as unknown as GrowthConnectionRow) : disconnected('shopify');
  return [shopify, disconnected('godaddy'), disconnected('square')];
}
