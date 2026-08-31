import React, { useCallback, useMemo, useState } from 'react';
import { Activity, AlertOctagon, AlertTriangle, FileText, MessageSquare, Radio, RefreshCw, Search, ShoppingBag, X, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getIntegrations } from '@/lib/platform/platformDataSource';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner, PlatformTableState } from '@/components/platform/PlatformStates';
import { IntegrationDiagnosticDrawer } from './components/IntegrationDiagnosticDrawer';
import type { IntegrationHealthStatus, IntegrationTableRow } from '@/types/integrationOps';

function normalizeHealth(value: unknown): IntegrationHealthStatus {
  const status = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (status === 'HEALTHY' || status === 'RECOVERING' || status === 'ACTION_REQUIRED' || status === 'DEGRADED') {
    return status;
  }
  return 'RECOVERING';
}

function normalizeAuthState(value: unknown): IntegrationTableRow['auth_state'] {
  const status = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (status === 'AUTHORIZED' || status === 'EXPIRED' || status === 'REVOKED' || status === 'PENDING' || status === 'REAUTH_REQUIRED') {
    return status;
  }
  return 'PENDING';
}

function normalizeCircuitState(value: unknown): IntegrationTableRow['circuit_breaker_state'] {
  const status = String(value || '').trim().toUpperCase();
  if (status === 'CLOSED' || status === 'OPEN' || status === 'HALF_OPEN') return status;
  // The persisted type predates an UNKNOWN state. Keep the UI fail-closed and
  // never imply a closed circuit merely because telemetry is missing.
  return 'UNKNOWN' as IntegrationTableRow['circuit_breaker_state'];
}

function providerIcon(provider: string) {
  const value = provider.toLowerCase();
  if (value.includes('shopify')) return <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />;
  if (value.includes('instagram')) return <MessageSquare className="h-3.5 w-3.5 text-pink-600" />;
  if (value.includes('facebook') || value.includes('meta')) return <MessageSquare className="h-3.5 w-3.5 text-blue-600" />;
  if (value.includes('drive')) return <FileText className="h-3.5 w-3.5 text-amber-600" />;
  if (value.includes('google')) return <Activity className="h-3.5 w-3.5 text-blue-500" />;
  if (value.includes('stripe')) return <Zap className="h-3.5 w-3.5 text-indigo-600" />;
  return <Radio className="h-3.5 w-3.5 text-stone-400" />;
}

function healthBadge(status: IntegrationHealthStatus) {
  if (status === 'HEALTHY') {
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">HEALTHY</span>;
  }
  if (status === 'RECOVERING') {
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">RECOVERING</span>;
  }
  if (status === 'ACTION_REQUIRED') {
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700"><AlertOctagon className="h-3 w-3" />ACTION REQUIRED</span>;
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700"><AlertTriangle className="h-3 w-3" />DEGRADED</span>;
}

export default function IntegrationsHealthView() {
  const { data: integrations, error, refetch } = usePlatformData(useCallback(() => getIntegrations(), []));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedProvider, setSelectedProvider] = useState('ALL');
  const [selectedHealth, setSelectedHealth] = useState('ALL');
  const [inspectItem, setInspectItem] = useState<IntegrationTableRow | null>(null);

  const normalizedRows = useMemo<IntegrationTableRow[]>(() => (integrations || []).map((integration: any) => {
    const healthStatus = normalizeHealth(integration.health_status || integration.status);
    const brandName = integration.brand_name || integration.org || 'Organization Level';
    const locationName = integration.location_name || 'All Locations';
    const provider = integration.provider || 'Custom';
    const providerAccountId = integration.provider_account_id || integration.external || integration.id || 'Not recorded';
    const lastEvent = integration.last_event_at || integration.last_health_check_at || (integration.lastSync !== '—' ? integration.lastSync : null) || null;
    const lastSuccessfulSync = integration.last_successful_sync_at || (integration.lastSync !== '—' ? integration.lastSync : null) || null;

    return {
      id: integration.id,
      business_id: integration.business_id || integration.orgId || null,
      brand_id: integration.brand_id || null,
      brand_name: brandName,
      location_id: integration.location_id || null,
      location_name: locationName,
      provider,
      provider_account_id: String(providerAccountId),
      health_status: healthStatus,
      circuit_breaker_state: normalizeCircuitState(integration.circuit_breaker_state),
      auth_state: normalizeAuthState(integration.auth_state),
      last_event_at: lastEvent,
      last_successful_sync_at: lastSuccessfulSync,
      recovery_status: integration.recovery_status || (healthStatus === 'HEALTHY' ? 'Verified healthy' : 'Health verification pending'),
      sync_errors_24h: Number(integration.sync_errors_24h ?? integration.errors24h ?? 0),
      is_auto_repairable: Boolean(integration.is_auto_repairable ?? false),
      reconnect_url: integration.reconnect_url || null,
      metadata: integration.metadata || {},
    };
  }), [integrations]);

  const uniqueBrands = useMemo(() => Array.from(new Set(normalizedRows.map((row) => row.brand_name))).sort(), [normalizedRows]);
  const uniqueProviders = useMemo(() => Array.from(new Set(normalizedRows.map((row) => row.provider))).sort(), [normalizedRows]);
  const uniqueLocations = useMemo(() => Array.from(new Set(
    normalizedRows
      .filter((row) => selectedBrand === 'ALL' || row.brand_name === selectedBrand)
      .map((row) => row.location_name)
      .filter((name) => name !== 'All Locations'),
  )).sort(), [normalizedRows, selectedBrand]);

  const filteredRows = useMemo(() => normalizedRows.filter((row) => {
    const query = searchQuery.trim().toLowerCase();
    if (query && ![
      row.brand_name,
      row.location_name,
      row.provider,
      row.provider_account_id,
      row.recovery_status,
    ].some((value) => value.toLowerCase().includes(query))) return false;
    if (selectedBrand !== 'ALL' && row.brand_name !== selectedBrand) return false;
    if (selectedLocation !== 'ALL' && row.location_name !== selectedLocation) return false;
    if (selectedProvider !== 'ALL' && row.provider !== selectedProvider) return false;
    if (selectedHealth !== 'ALL' && row.health_status !== selectedHealth) return false;
    return true;
  }), [normalizedRows, searchQuery, selectedBrand, selectedLocation, selectedProvider, selectedHealth]);

  const totalCount = normalizedRows.length;
  const healthyCount = normalizedRows.filter((row) => row.health_status === 'HEALTHY').length;
  const recoveringCount = normalizedRows.filter((row) => row.health_status === 'RECOVERING').length;
  const actionRequiredCount = normalizedRows.filter((row) => row.health_status === 'ACTION_REQUIRED').length;
  const healthyPct = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : null;
  const hasActiveFilters = Boolean(searchQuery.trim() || selectedBrand !== 'ALL' || selectedLocation !== 'ALL' || selectedProvider !== 'ALL' || selectedHealth !== 'ALL');

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedBrand('ALL');
    setSelectedLocation('ALL');
    setSelectedProvider('ALL');
    setSelectedHealth('ALL');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PlatformDemoBanner />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-serif font-semibold text-stone-900">Integrations Operations & Health</h2>
          <p className="mt-0.5 text-sm text-stone-500">Observed provider state, authorization, synchronization, and recovery telemetry.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Telemetry
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500">Total Connections</span><div className="mt-1 text-2xl font-serif font-bold text-stone-900">{totalCount}</div><span className="text-[10px] text-stone-400">Observed provider connections</span></Card>
        <Card className="p-4"><span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Verified Healthy</span><div className="mt-1 text-2xl font-serif font-bold text-emerald-600">{healthyPct === null ? '—' : `${healthyPct}%`}</div><span className="text-[10px] text-emerald-600/80">{totalCount ? `${healthyCount} of ${totalCount}` : 'No connection evidence yet'}</span></Card>
        <Card className="p-4"><span className="block text-[11px] font-semibold uppercase tracking-wider text-blue-700">Recovering / Pending</span><div className="mt-1 text-2xl font-serif font-bold text-blue-600">{recoveringCount}</div><span className="text-[10px] text-blue-600/80">Verification or recovery in progress</span></Card>
        <Card className="p-4"><span className="block text-[11px] font-semibold uppercase tracking-wider text-rose-700">Action Required</span><div className="mt-1 text-2xl font-serif font-bold text-rose-600">{actionRequiredCount}</div><span className="text-[10px] text-rose-600/80">Operator intervention required</span></Card>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search brand, location, provider, account, or recovery state..." className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-9 pr-8 text-xs text-stone-800 outline-none focus:border-stone-400" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={selectedBrand} onChange={(event) => { setSelectedBrand(event.target.value); setSelectedLocation('ALL'); }} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs"><option value="ALL">All Brands</option>{uniqueBrands.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs"><option value="ALL">All Locations</option>{uniqueLocations.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <select value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value)} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs"><option value="ALL">All Providers</option>{uniqueProviders.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            <select value={selectedHealth} onChange={(event) => setSelectedHealth(event.target.value)} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs"><option value="ALL">All Health States</option><option value="HEALTHY">Healthy</option><option value="RECOVERING">Recovering</option><option value="ACTION_REQUIRED">Action Required</option><option value="DEGRADED">Degraded</option></select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">Reset</Button>}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-stone-50/70"><TableHead>Brand</TableHead><TableHead>Location</TableHead><TableHead>Provider</TableHead><TableHead>Account</TableHead><TableHead>Health</TableHead><TableHead>Last Event</TableHead><TableHead>Recovery Status</TableHead><TableHead className="text-right">Inspect</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs font-semibold">{row.brand_name}</TableCell>
                <TableCell className="text-xs text-stone-600">{row.location_name}</TableCell>
                <TableCell className="text-xs"><span className="inline-flex items-center gap-1.5 font-medium">{providerIcon(row.provider)}{row.provider}</span></TableCell>
                <TableCell className="max-w-[180px] truncate font-mono text-xs text-stone-600" title={row.provider_account_id}>{row.provider_account_id}</TableCell>
                <TableCell>{healthBadge(row.health_status)}</TableCell>
                <TableCell className="text-xs text-stone-500">{row.last_event_at ? new Date(row.last_event_at).toLocaleString() : 'Not yet observed'}</TableCell>
                <TableCell className="max-w-[240px] text-xs text-stone-600"><span className="block truncate" title={row.recovery_status}>{row.recovery_status}</span></TableCell>
                <TableCell className="text-right"><Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setInspectItem(row)}>Inspect</Button></TableCell>
              </TableRow>
            ))}
            {filteredRows.length === 0 && (
              <PlatformTableState colSpan={8} error={error} empty={hasActiveFilters ? 'No integrations match the active filters.' : 'No provider connections have been observed.'} emptyHint={hasActiveFilters ? 'Broaden or reset the filters.' : 'A connection appears only after an organization authorizes and VowOS records a provider connection.'} action={hasActiveFilters ? <Button variant="outline" size="sm" onClick={resetFilters}>Clear Filters</Button> : undefined} />
            )}
          </TableBody>
        </Table>
      </Card>

      <IntegrationDiagnosticDrawer isOpen={Boolean(inspectItem)} onClose={() => setInspectItem(null)} integration={inspectItem} onRefresh={() => refetch()} />
    </div>
  );
}
