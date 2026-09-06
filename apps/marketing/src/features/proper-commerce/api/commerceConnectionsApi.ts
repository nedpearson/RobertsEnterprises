import { getActiveBusinessId } from '@/config/hostConfig';
import { getActiveDataPlane, supabase } from '@/lib/supabase';
import type { CommerceConnection } from '../types/properCommerceTypes';

type Provider = CommerceConnection['provider'];

type GrowthConnectionRow = {
  id: string;
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
      {
        vowosLocationId: 'pc-br',
        vowosLocationName: 'Proper & Co — Baton Rouge',
        shopifyLocationId: 'demo-br',
        shopifyLocationName: 'Proper & Co — Baton Rouge',
        isDefault: true,
      },
      {
        vowosLocationId: 'pc-cov',
        vowosLocationName: 'Proper & Co — Covington',
        shopifyLocationId: 'demo-cov',
        shopifyLocationName: 'Proper & Co — Covington',
        isDefault: false,
      },
    ],
  };
}

function readScopes(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((scope): scope is string => typeof scope === 'string') : [];
}

type LocationMappingRow = {
  shopify_location_id: string | null;
  shopify_location_name: string | null;
  location_id: string;
  is_default: boolean | null;
  locations: { name: string | null } | { name: string | null }[] | null;
};

/**
 * Reads the stored Shopify → VowOS location bindings for a connection.
 *
 * These used to be read from growth_provider_connections.metadata.locationMappings,
 * a key no code path ever wrote, through a filter that additionally required
 * vowosLocationId to be the literal 'pc-br' or 'pc-cov'. Real locations are
 * UUIDs, so the reader would have discarded every genuine row even if the
 * metadata had existed. The source of truth is now the mappings table.
 */
async function fetchLocationMappings(connectionId: string): Promise<CommerceConnection['locationMappings']> {
  const { data, error } = await supabase
    .from('shopify_location_mappings')
    .select('shopify_location_id,shopify_location_name,location_id,is_default,locations(name)')
    .eq('connection_id', connectionId);

  // A missing mapping list is a configuration gap to surface in the UI, not a
  // reason to fail the whole connections view.
  if (error) {
    console.warn('[commerce] Could not load Shopify location mappings:', error.message);
    return [];
  }

  return ((data ?? []) as unknown as LocationMappingRow[]).map((row) => {
    const related = Array.isArray(row.locations) ? row.locations[0] : row.locations;
    return {
      vowosLocationId: row.location_id,
      vowosLocationName: related?.name ?? undefined,
      shopifyLocationId: row.shopify_location_id,
      shopifyLocationName: row.shopify_location_name,
      isDefault: row.is_default === true,
    };
  });
}

function mapShopify(row: GrowthConnectionRow, locationMappings: CommerceConnection['locationMappings']): CommerceConnection {
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
    // A connected store with no location mapping cannot attribute revenue to a
    // boutique, so it is Degraded rather than Healthy no matter what the token
    // says. Full delivery health lives at GET /api/shopify/health.
    health: status !== 'connected'
      ? 'Disconnected'
      : !row.last_error && row.last_sync_status !== 'failed' && locationMappings.length > 0
        ? 'Healthy'
        : 'Degraded',
    locationMappings,
  };
}

function isProperStore(row: GrowthConnectionRow): boolean {
  const metadata = row.metadata ?? {};
  const shopDomain = typeof metadata.shopDomain === 'string' ? metadata.shopDomain.toLowerCase() : '';
  const displayName = (row.display_name || '').toLowerCase();
  return shopDomain.includes('proper') || displayName.includes('proper');
}

/**
 * Commerce connection status must come from the canonical OAuth connection table.
 * Production must never render a fabricated "Connected · Healthy" Shopify state.
 * Roberts Enterprises may have more than one Shopify store under one tenant, so
 * the Proper commerce workspace selects only the Proper store connection.
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
    .select('id,provider,status,external_account_id,display_name,scopes,connected_at,last_sync_at,last_sync_status,last_error,metadata')
    .eq('business_id', businessId)
    .eq('provider', 'shopify')
    .limit(100);

  if (error) throw error;
  const rows = (data ?? []) as unknown as GrowthConnectionRow[];
  const properRow = rows.find(isProperStore);
  if (!properRow) {
    return [disconnected('shopify'), disconnected('godaddy'), disconnected('square')];
  }

  const locationMappings = await fetchLocationMappings(properRow.id);
  return [mapShopify(properRow, locationMappings), disconnected('godaddy'), disconnected('square')];
}
