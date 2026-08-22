import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Radio,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  FileText,
  Zap,
  Activity,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { getIntegrations } from '@/lib/platform/platformDataSource';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner, PlatformTableState } from '@/components/platform/PlatformStates';
import { IntegrationDiagnosticDrawer } from './components/IntegrationDiagnosticDrawer';
import type { IntegrationTableRow, IntegrationHealthStatus } from '@/types/integrationOps';

export default function IntegrationsHealthView() {
  const { data: integrations, error, refetch } = usePlatformData(useCallback(() => getIntegrations(), []));

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [selectedHealth, setSelectedHealth] = useState<string>('ALL');

  // Diagnostic Drawer State
  const [inspectItem, setInspectItem] = useState<IntegrationTableRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Normalize row items to full IntegrationTableRow structure
  const normalizedRows: IntegrationTableRow[] = useMemo(() => {
    return (integrations || []).map((int: any) => {
      const brandName = int.brand_name || int.org || 'Organization Level';
      const locationName = int.location_name || 'All Locations';
      const provider = int.provider || 'Custom';
      const providerAccountId = int.provider_account_id || int.external || int.id;
      const rawStatus = (int.health_status || int.status || 'HEALTHY').toUpperCase().replace(/\s+/g, '_');
      const healthStatus: IntegrationHealthStatus =
        rawStatus === 'HEALTHY' || rawStatus === 'RECOVERING' || rawStatus === 'ACTION_REQUIRED' || rawStatus === 'DEGRADED'
          ? rawStatus
          : rawStatus === 'ACTION REQUIRED'
          ? 'ACTION_REQUIRED'
          : 'HEALTHY';

      return {
        id: int.id,
        business_id: int.business_id || int.orgId || null,
        brand_id: int.brand_id || null,
        brand_name: brandName,
        location_id: int.location_id || null,
        location_name: locationName,
        provider: provider,
        provider_account_id: providerAccountId,
        health_status: healthStatus,
        circuit_breaker_state: int.circuit_breaker_state || 'CLOSED',
        auth_state: int.auth_state || (healthStatus === 'ACTION_REQUIRED' ? 'REVOKED' : 'AUTHORIZED'),
        last_event_at: int.last_event_at || int.last_health_check_at || int.lastSync || null,
        last_successful_sync_at: int.last_successful_sync_at || int.lastSync || null,
        recovery_status: int.recovery_status || (healthStatus === 'HEALTHY' ? 'Healthy (Active)' : 'Investigating'),
        sync_errors_24h: int.sync_errors_24h ?? int.errors24h ?? 0,
        is_auto_repairable: int.is_auto_repairable ?? (healthStatus !== 'ACTION_REQUIRED'),
        reconnect_url: int.reconnect_url || null,
        metadata: int.metadata || {},
      };
    });
  }, [integrations]);

  // Derived Filter Options
  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    normalizedRows.forEach((r) => {
      if (r.brand_name) set.add(r.brand_name);
    });
    return Array.from(set).sort();
  }, [normalizedRows]);

  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    normalizedRows.forEach((r) => {
      if (selectedBrand === 'ALL' || r.brand_name === selectedBrand) {
        if (r.location_name && r.location_name !== 'All Locations') {
          set.add(r.location_name);
        }
      }
    });
    return Array.from(set).sort();
  }, [normalizedRows, selectedBrand]);

  const uniqueProviders = useMemo(() => {
    const set = new Set<string>();
    normalizedRows.forEach((r) => {
      if (r.provider) set.add(r.provider);
    });
    return Array.from(set).sort();
  }, [normalizedRows]);

  // Filtered dataset
  const filteredRows = useMemo(() => {
    return normalizedRows.filter((r) => {
      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.brand_name.toLowerCase().includes(q) ||
          r.location_name.toLowerCase().includes(q) ||
          r.provider.toLowerCase().includes(q) ||
          r.provider_account_id.toLowerCase().includes(q) ||
          r.recovery_status.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Brand filter
      if (selectedBrand !== 'ALL' && r.brand_name !== selectedBrand) {
        return false;
      }

      // Location filter
      if (selectedLocation !== 'ALL' && r.location_name !== selectedLocation) {
        return false;
      }

      // Provider filter
      if (selectedProvider !== 'ALL' && r.provider.toLowerCase() !== selectedProvider.toLowerCase()) {
        return false;
      }

      // Health status filter
      if (selectedHealth !== 'ALL') {
        const normHealth = r.health_status.toUpperCase().replace(/\s+/g, '_');
        if (normHealth !== selectedHealth) return false;
      }

      return true;
    });
  }, [normalizedRows, searchQuery, selectedBrand, selectedLocation, selectedProvider, selectedHealth]);

  // Health Badge Formatter
  const renderHealthBadge = (status: string) => {
    const s = (status || '').toUpperCase().replace(/\s+/g, '_');
    switch (s) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            HEALTHY
          </span>
        );
      case 'RECOVERING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            RECOVERING
          </span>
        );
      case 'ACTION_REQUIRED':
      case 'ACTION REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            ACTION REQUIRED
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            DEGRADED
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
            <Radio className="w-2.5 h-2.5 text-stone-400" />
            DISCONNECTED
          </span>
        );
    }
  };

  // Provider Icon Formatter
  const getProviderIcon = (provider: string) => {
    const p = provider.toLowerCase();
    if (p.includes('shopify')) return <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />;
    if (p.includes('instagram')) return <MessageSquare className="w-3.5 h-3.5 text-pink-600" />;
    if (p.includes('facebook')) return <MessageSquare className="w-3.5 h-3.5 text-blue-600" />;
    if (p.includes('drive')) return <FileText className="w-3.5 h-3.5 text-amber-600" />;
    if (p.includes('google')) return <Activity className="w-3.5 h-3.5 text-blue-500" />;
    if (p.includes('stripe')) return <Zap className="w-3.5 h-3.5 text-indigo-600" />;
    return <ShoppingBag className="w-3.5 h-3.5 text-stone-400" />;
  };

  // Metrics summary
  const totalCount = normalizedRows.length;
  const healthyCount = normalizedRows.filter((r) => r.health_status === 'HEALTHY').length;
  const recoveringCount = normalizedRows.filter((r) => r.health_status === 'RECOVERING').length;
  const actionRequiredCount = normalizedRows.filter((r) => r.health_status === 'ACTION_REQUIRED').length;
  const healthyPct = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100;

  // Open Drawer Handler
  const handleInspect = (row: IntegrationTableRow) => {
    setInspectItem(row);
    setIsDrawerOpen(true);
  };

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBrand('ALL');
    setSelectedLocation('ALL');
    setSelectedProvider('ALL');
    setSelectedHealth('ALL');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedBrand !== 'ALL' ||
    selectedLocation !== 'ALL' ||
    selectedProvider !== 'ALL' ||
    selectedHealth !== 'ALL';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PlatformDemoBanner />

      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-semibold text-stone-900">Integrations Operations & Health</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Observability, circuit breaker states, and automated remediation telemetry across multi-brand connections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs bg-white border-stone-200 text-stone-700 hover:bg-stone-50 shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Total Connections</span>
          <div className="text-2xl font-serif font-bold text-stone-900 mt-1">{totalCount}</div>
          <span className="text-[10px] text-stone-400 mt-0.5 block">Across all tenant brands</span>
        </Card>

        <Card className="p-4 bg-white border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Healthy Fleet Rate</span>
          <div className="text-2xl font-serif font-bold text-emerald-600 mt-1">{healthyPct}%</div>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">{healthyCount} of {totalCount} operational</span>
        </Card>

        <Card className="p-4 bg-white border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Auto-Recovering</span>
          <div className="text-2xl font-serif font-bold text-blue-600 mt-1">{recoveringCount}</div>
          <span className="text-[10px] text-blue-600/80 mt-0.5 block">Self-healing in progress</span>
        </Card>

        <Card className="p-4 bg-white border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Action Required</span>
          <div className="text-2xl font-serif font-bold text-rose-600 mt-1">{actionRequiredCount}</div>
          <span className="text-[10px] text-rose-600/80 mt-0.5 block">Re-authorization required</span>
        </Card>
      </div>

      {/* Scoping & Filters Bar */}
      <Card className="p-4 bg-white border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by brand, location, provider, account, or error..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all text-stone-800 placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Brand Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-stone-500 whitespace-nowrap">Brand:</span>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedLocation('ALL'); // Reset location when brand changes
                }}
                className="text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              >
                <option value="ALL">All Brands</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter (Scoped to Selected Brand) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-stone-500 whitespace-nowrap">Location:</span>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              >
                <option value="ALL">All Locations</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-stone-500 whitespace-nowrap">Provider:</span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              >
                <option value="ALL">All Providers</option>
                {uniqueProviders.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Health Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-stone-500 whitespace-nowrap">Health:</span>
              <select
                value={selectedHealth}
                onChange={(e) => setSelectedHealth(e.target.value)}
                className="text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              >
                <option value="ALL">All Health States</option>
                <option value="HEALTHY">Healthy</option>
                <option value="RECOVERING">Recovering</option>
                <option value="ACTION_REQUIRED">Action Required</option>
                <option value="DEGRADED">Degraded</option>
                <option value="DISCONNECTED">Disconnected</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-stone-500 hover:text-stone-900 h-8 px-2"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 8-Column Canonical Observability Table */}
      <Card className="shadow-xs border-stone-200/80 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50/70 border-b border-stone-200 text-stone-600">
              {/* Column 1 */}
              <TableHead className="font-semibold text-xs py-3.5">Brand</TableHead>
              {/* Column 2 */}
              <TableHead className="font-semibold text-xs py-3.5">Location</TableHead>
              {/* Column 3 */}
              <TableHead className="font-semibold text-xs py-3.5">Provider</TableHead>
              {/* Column 4 */}
              <TableHead className="font-semibold text-xs py-3.5">Account</TableHead>
              {/* Column 5 */}
              <TableHead className="font-semibold text-xs py-3.5">Health</TableHead>
              {/* Column 6 */}
              <TableHead className="font-semibold text-xs py-3.5">Last Event</TableHead>
              {/* Column 7 */}
              <TableHead className="font-semibold text-xs py-3.5">Recovery Status</TableHead>
              {/* Column 8 */}
              <TableHead className="font-semibold text-xs py-3.5 text-right">Inspect</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow
                key={row.id}
                className="hover:bg-stone-50/60 transition-colors border-b border-stone-100 group"
              >
                {/* 1. Brand */}
                <TableCell className="font-medium text-xs text-stone-900 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{row.brand_name}</span>
                  </div>
                </TableCell>

                {/* 2. Location */}
                <TableCell className="text-xs text-stone-600 py-3">
                  <span className="truncate max-w-[150px] inline-block font-normal" title={row.location_name}>
                    {row.location_name}
                  </span>
                </TableCell>

                {/* 3. Provider */}
                <TableCell className="text-xs py-3">
                  <span className="inline-flex items-center gap-1.5 font-medium text-stone-800">
                    {getProviderIcon(row.provider)}
                    {row.provider}
                  </span>
                </TableCell>

                {/* 4. Account */}
                <TableCell className="text-xs font-mono text-stone-600 max-w-[180px] truncate py-3" title={row.provider_account_id}>
                  {row.provider_account_id}
                </TableCell>

                {/* 5. Health */}
                <TableCell className="py-3">
                  {renderHealthBadge(row.health_status)}
                </TableCell>

                {/* 6. Last Event */}
                <TableCell className="text-xs text-stone-500 py-3">
                  {row.last_event_at && row.last_event_at !== '—'
                    ? new Date(row.last_event_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
                      ' (' +
                      new Date(row.last_event_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' }) +
                      ')'
                    : '—'}
                </TableCell>

                {/* 7. Recovery Status */}
                <TableCell className="text-xs py-3 max-w-[240px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`truncate text-[11px] ${
                        row.health_status === 'HEALTHY'
                          ? 'text-stone-600'
                          : row.health_status === 'RECOVERING'
                          ? 'text-blue-700 font-medium'
                          : row.health_status === 'ACTION_REQUIRED'
                          ? 'text-rose-700 font-medium'
                          : 'text-amber-700 font-medium'
                      }`}
                      title={row.recovery_status}
                    >
                      {row.recovery_status}
                    </span>
                  </div>
                </TableCell>

                {/* 8. Inspect Action */}
                <TableCell className="text-right py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium bg-white hover:bg-stone-100 text-stone-800 border-stone-200 shadow-xs h-7 px-2.5"
                    onClick={() => handleInspect(row)}
                  >
                    Inspect
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {filteredRows.length === 0 && (
              <PlatformTableState
                colSpan={8}
                error={error}
                empty={hasActiveFilters ? 'No integrations match the active filters.' : 'No provider connections.'}
                emptyHint={
                  hasActiveFilters
                    ? 'Try broadening your search query or resetting filters.'
                    : 'Connections appear here once an organization authorizes Shopify, Google, Stripe, or a messaging provider.'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs">
                      Clear Filters
                    </Button>
                  ) : undefined
                }
              />
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Integration Diagnostic Slide-Over Drawer */}
      <IntegrationDiagnosticDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setInspectItem(null);
        }}
        integration={inspectItem}
        onRefresh={() => refetch()}
      />
    </div>
  );
}
