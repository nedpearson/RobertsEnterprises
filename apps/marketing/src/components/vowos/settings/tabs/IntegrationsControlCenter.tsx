import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Facebook,
  Globe2,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  XCircle,
} from 'lucide-react';
import { toast } from '@vowos/design-system';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { IntegrationsSettingsTab } from './IntegrationsSettingsTab';

interface Props {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

type Brand = { id: string; name: string; description?: string | null; logo_url?: string | null };
type Location = { id: string; name: string; brand_id?: string | null; is_active?: boolean | null };
type Site = {
  id: string;
  name: string;
  domain: string;
  brand_id?: string | null;
  location_id?: string | null;
  provider?: string | null;
  status?: string | null;
  ecommerce_enabled?: boolean | null;
  booking_enabled?: boolean | null;
};
type Connection = {
  id: string;
  provider: string;
  status: string | null;
  display_name: string | null;
  external_account_id: string | null;
  scopes: unknown;
  connected_at: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  metadata: Record<string, unknown> | null;
};
type Structure = {
  organization: { id?: string; name: string };
  brands: Brand[];
  locations: Location[];
  sites: Site[];
  connections: Connection[];
};

const emptyStructure: Structure = {
  organization: { name: '' },
  brands: [],
  locations: [],
  sites: [],
  connections: [],
};

const apiUrl = () => String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const metadataString = (connection: Connection | undefined, key: string) => {
  const value = connection?.metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
};
const normalizedStatus = (connection: Connection | undefined) => connection?.status?.toUpperCase() || 'DISCONNECTED';
const isConnected = (connection: Connection | undefined) => normalizedStatus(connection) === 'CONNECTED';
const formatWhen = (value: string | null | undefined) => {
  if (!value) return 'No sync recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
};
const scopeCount = (connection: Connection | undefined) => Array.isArray(connection?.scopes) ? connection!.scopes.length : 0;

function StatusBadge({ connection }: { connection?: Connection }) {
  if (isConnected(connection) && !connection?.last_error && connection?.last_sync_status !== 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" /> Connected & Healthy
      </span>
    );
  }
  if (isConnected(connection)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5" /> Connected — Attention Needed
      </span>
    );
  }
  if (connection) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
        <AlertTriangle className="h-3.5 w-3.5" /> Reconnect Required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
      <XCircle className="h-3.5 w-3.5" /> Not Connected
    </span>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="text-2xl font-semibold tracking-tight text-stone-900">{value}</div>
      <div className="mt-1 text-sm font-semibold text-stone-800">{label}</div>
      <div className="mt-1 text-xs leading-5 text-stone-500">{detail}</div>
    </div>
  );
}

export function IntegrationsControlCenter({ onDirtyChange, registerSaveRef, resetTrigger }: Props) {
  const { tenant } = useAuth();
  const [structure, setStructure] = useState<Structure>(emptyStructure);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState(() => {
    if (typeof window === 'undefined') return 'all';
    return new URLSearchParams(window.location.search).get('brandId') || 'all';
  });

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setLoadError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Your session has expired. Sign in again to view integration details.');
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (tenant?.id) headers['X-Business-Id'] = tenant.id;
      const response = await fetch(`${apiUrl()}/api/organization/structure`, { headers });
      const payload = await response.json().catch(() => ({})) as Partial<Structure> & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Could not load brand and integration details.');
      const next: Structure = {
        organization: payload.organization || { name: tenant?.name || 'Organization' },
        brands: Array.isArray(payload.brands) ? payload.brands : [],
        locations: Array.isArray(payload.locations) ? payload.locations : [],
        sites: Array.isArray(payload.sites) ? payload.sites : [],
        connections: Array.isArray(payload.connections) ? payload.connections : [],
      };
      setStructure(next);
      setSelectedBrand((current) => current === 'all' || next.brands.some((brand) => brand.id === current) ? current : 'all');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(message);
      toast({ title: 'Could not load integration control center', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, [tenant?.id, resetTrigger]);

  const shopifyConnections = useMemo(
    () => structure.connections.filter((connection) => connection.provider === 'shopify'),
    [structure.connections],
  );
  const metaConnection = structure.connections.find((connection) => connection.provider === 'meta_social');
  const connectedShopify = shopifyConnections.filter(isConnected);
  const attentionCount = structure.connections.filter((connection) => {
    if (!isConnected(connection)) return true;
    return Boolean(connection.last_error || connection.last_sync_status === 'failed');
  }).length;
  const unassignedShopify = shopifyConnections.filter((connection) => {
    const brandId = metadataString(connection, 'brandId');
    return !brandId || !structure.brands.some((brand) => brand.id === brandId);
  });

  const selectBrand = (brandId: string) => {
    setSelectedBrand(brandId);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (brandId === 'all') params.delete('brandId');
    else params.set('brandId', brandId);
    params.set('tab', 'integrations');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  };

  const goToOrganizationSetup = () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'organization');
    params.delete('brandId');
    window.location.assign(`${window.location.pathname}?${params.toString()}${window.location.hash}`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading brands, stores, locations, and live connection status…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-rose-900">Integration details could not be loaded</h3>
            <p className="mt-1 text-sm text-rose-800">{loadError}</p>
            <button type="button" onClick={() => void load()} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-rose-800">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              <ShieldCheck className="h-4 w-4" /> Integration Control Center
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-950">
              Know exactly what is connected — by brand
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">
              Each store connection is tied to one VowOS brand. Select a brand below to connect, reconnect, or manage its Shopify store. Organization-level channels such as Meta are shown separately so there is no ambiguity.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh status
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Brands" value={structure.brands.length} detail="Available for brand-specific integrations" />
          <Metric label="Shopify stores connected" value={connectedShopify.length} detail={`${shopifyConnections.length} Shopify connection record${shopifyConnections.length === 1 ? '' : 's'} found`} />
          <Metric label="Locations" value={structure.locations.filter((location) => location.is_active !== false).length} detail="Active operating locations in this organization" />
          <Metric label="Needs attention" value={attentionCount + unassignedShopify.length} detail="Reconnects, sync errors, or unassigned store connections" />
        </div>
      </section>

      {structure.brands.length === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Store className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-950">No brands are configured for this organization</h3>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                Shopify cannot be safely assigned until brands exist. Add each operating brand first, then return here to connect the correct store to the correct brand.
              </p>
              <button type="button" onClick={goToOrganizationSetup} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-sm font-semibold text-white">
                Set up brands <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-950">Choose the brand you want to manage</h3>
              <p className="mt-1 text-sm text-stone-600">The selected brand controls the Shopify store shown in the management panel below.</p>
            </div>
            <div className="text-xs font-medium text-stone-500">Organization: {structure.organization.name || tenant?.name || 'Current organization'}</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => selectBrand('all')}
              className={`rounded-xl border p-4 text-left transition ${selectedBrand === 'all' ? 'border-stone-900 bg-stone-950 text-white shadow-sm' : 'border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" /> All Brands</div>
                {selectedBrand === 'all' && <CheckCircle2 className="h-4 w-4" />}
              </div>
              <p className={`mt-2 text-xs leading-5 ${selectedBrand === 'all' ? 'text-stone-300' : 'text-stone-500'}`}>
                Organization overview. Select a specific brand before changing Shopify authorization.
              </p>
            </button>

            {structure.brands.map((brand) => {
              const connection = shopifyConnections.find((candidate) => metadataString(candidate, 'brandId') === brand.id);
              const locations = structure.locations.filter((location) => location.brand_id === brand.id && location.is_active !== false);
              const sites = structure.sites.filter((site) => site.brand_id === brand.id);
              const active = selectedBrand === brand.id;
              return (
                <button
                  type="button"
                  key={brand.id}
                  onClick={() => selectBrand(brand.id)}
                  className={`rounded-xl border p-4 text-left transition ${active ? 'border-rose-300 bg-rose-50 shadow-sm ring-1 ring-rose-200' : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-stone-950">{brand.name}</div>
                      <div className="mt-1 text-xs text-stone-500">{locations.length} location{locations.length === 1 ? '' : 's'} · {sites.length} website{sites.length === 1 ? '' : 's'}</div>
                    </div>
                    {active && <CheckCircle2 className="h-5 w-5 text-rose-700" />}
                  </div>
                  <div className="mt-3"><StatusBadge connection={connection} /></div>
                  <div className="mt-2 truncate text-xs font-medium text-stone-600">
                    {connection ? metadataString(connection, 'shopDomain') || connection.display_name || connection.external_account_id || 'Shopify store connected' : 'No Shopify store assigned'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-stone-700" />
          <h3 className="text-base font-semibold text-stone-950">Connection map</h3>
        </div>
        <p className="mt-1 text-sm text-stone-600">This is the authoritative view of which external account belongs to each brand.</p>

        <div className="mt-4 space-y-3">
          {structure.brands.map((brand) => {
            const connection = shopifyConnections.find((candidate) => metadataString(candidate, 'brandId') === brand.id);
            const locations = structure.locations.filter((location) => location.brand_id === brand.id && location.is_active !== false);
            const sites = structure.sites.filter((site) => site.brand_id === brand.id);
            return (
              <div key={brand.id} className={`rounded-xl border p-4 ${selectedBrand === brand.id ? 'border-rose-200 bg-rose-50/40' : 'border-stone-200 bg-stone-50/50'}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Store className="h-4 w-4 text-stone-500" />
                      <span className="font-semibold text-stone-950">{brand.name}</span>
                      <StatusBadge connection={connection} />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-stone-600 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <span className="font-semibold text-stone-800">Shopify store</span>
                        <div className="mt-0.5 break-all">{connection ? metadataString(connection, 'shopDomain') || connection.display_name || connection.external_account_id || 'Connected account' : 'Not connected'}</div>
                      </div>
                      <div>
                        <span className="font-semibold text-stone-800">Locations</span>
                        <div className="mt-0.5">{locations.length ? locations.map((location) => location.name).join(', ') : 'No brand-specific locations mapped'}</div>
                      </div>
                      <div>
                        <span className="font-semibold text-stone-800">Websites</span>
                        <div className="mt-0.5">{sites.length ? sites.map((site) => site.domain).join(', ') : 'No websites mapped'}</div>
                      </div>
                      <div>
                        <span className="font-semibold text-stone-800">Last sync</span>
                        <div className="mt-0.5">{formatWhen(connection?.last_sync_at)}</div>
                      </div>
                    </div>
                    {connection && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
                        <span>OAuth scopes: {scopeCount(connection)}</span>
                        <span>Connected: {formatWhen(connection.connected_at)}</span>
                        {connection.last_error && <span className="font-medium text-rose-700">Last error: {connection.last_error}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => selectBrand(brand.id)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    Manage {brand.name} <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Facebook className="h-4 w-4 text-stone-500" />
                  <span className="font-semibold text-stone-950">Facebook & Instagram</span>
                  <span className="text-xs text-stone-500">Organization-level Meta authorization</span>
                  <StatusBadge connection={metaConnection} />
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-600">
                  One Meta authorization can cover the selected Facebook Page and its linked Instagram professional account. This is intentionally shown separately from brand-specific Shopify stores.
                </p>
                {metaConnection && (
                  <div className="mt-2 text-[11px] text-stone-500">
                    Account: {metaConnection.display_name || metaConnection.external_account_id || 'Authorized Meta account'} · Last sync: {formatWhen(metaConnection.last_sync_at)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {unassignedShopify.map((connection) => (
            <div key={connection.id} className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                <div>
                  <div className="font-semibold text-amber-950">Shopify connection needs a brand assignment</div>
                  <div className="mt-1 text-sm text-amber-900">
                    {metadataString(connection, 'shopDomain') || connection.display_name || connection.external_account_id || 'Unknown Shopify account'} is present, but it is not bound to a valid current brand. VowOS will not guess the brand.
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-950">
              {selectedBrand === 'all' ? 'Organization integration controls' : `${structure.brands.find((brand) => brand.id === selectedBrand)?.name || 'Brand'} integration controls`}
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              {selectedBrand === 'all'
                ? 'Organization-wide channels can be managed below. Choose a specific brand above before connecting or reconnecting Shopify.'
                : 'The Shopify actions below are locked to this exact brand so store data cannot cross into another brand.'}
            </p>
          </div>
          {selectedBrand !== 'all' && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4" /> Exact brand routing active
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-stone-200 pt-5 [&>div>div:first-child]:hidden">
          <IntegrationsSettingsTab
            key={selectedBrand}
            onDirtyChange={onDirtyChange}
            registerSaveRef={registerSaveRef}
            resetTrigger={resetTrigger}
          />
        </div>
      </section>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs leading-5 text-stone-600">
        <div className="flex items-start gap-2">
          <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
          <span><strong className="text-stone-800">How routing works:</strong> VowOS uses the permanent Shopify <code>.myshopify.com</code> identity and the selected brand ID. Website domains, business names, and similar-looking store names are not used to guess ownership.</span>
        </div>
        <div className="mt-2 flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
          <span><strong className="text-stone-800">Locations:</strong> Shopify location IDs can refine which physical location receives an order only after the organization and brand have already been verified.</span>
        </div>
        <div className="mt-2 flex items-start gap-2">
          <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
          <span><strong className="text-stone-800">Orders and appointments:</strong> connected Shopify orders are processed under the exact brand/store identity and can create the downstream customer, appointment, lead, and notification records without crossing brands.</span>
        </div>
      </div>
    </div>
  );
}
