import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Unplug,
  Webhook,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, btnPrimary, btnSecondary, inputCls } from '@/components/vowos/ui';
import { toast } from '@/components/ui/use-toast';
import type { MarketingProvider } from '../types/marketingTypes';
import {
  DiscoveredProviderResource,
  LiveMarketingConnection,
  discoverProviderResources,
  disconnectLiveMarketingConnection,
  listLiveMarketingConnections,
  provisionWebsiteIntake,
  saveProviderApiKey,
  saveProviderResourceMappings,
  startProviderOAuth,
  testLiveMarketingConnection,
} from '../api/integrationApi';

const STATUS_PRESENTATION: Record<string, { label: string; classes: string; description: string }> = {
  CONNECTED_HEALTHY: {
    label: 'Connected & Healthy',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Credential verified and business resources mapped.',
  },
  ACCOUNT_SELECTION_REQUIRED: {
    label: 'Select Accounts',
    classes: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Authorization succeeded. Choose the accounts/resources VowOS may use.',
  },
  CONNECTED_UNVERIFIED: {
    label: 'Verification Required',
    classes: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Credential exists, but VowOS cannot yet prove the complete connection.',
  },
  AUTHORIZATION_PENDING: {
    label: 'Authorization Pending',
    classes: 'bg-sky-50 text-sky-800 border-sky-200',
    description: 'Provider authorization was started but has not completed.',
  },
  CONFIGURATION_REQUIRED: {
    label: 'Developer Setup Required',
    classes: 'bg-violet-50 text-violet-800 border-violet-200',
    description: 'The provider application credentials/approval are not configured on the server.',
  },
  ERROR: {
    label: 'Connection Error',
    classes: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'The most recent provider verification failed.',
  },
  REAUTHORIZATION_REQUIRED: {
    label: 'Reconnect Required',
    classes: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'The provider token must be renewed.',
  },
  DISCONNECTED: {
    label: 'Disconnected',
    classes: 'bg-stone-100 text-stone-700 border-stone-200',
    description: 'The provider was explicitly disconnected.',
  },
  NOT_CONFIGURED: {
    label: 'Not Connected',
    classes: 'bg-stone-100 text-stone-700 border-stone-200',
    description: 'No provider credential is stored for this business.',
  },
};

const LOCATION_OPTIONS = [
  { id: 'ido-br', label: 'I Do · Baton Rouge' },
  { id: 'ido-cov', label: 'I Do · Covington' },
  { id: 'pc-br', label: 'Proper & Co · Baton Rouge' },
  { id: 'pc-cov', label: 'Proper & Co · Covington' },
];

const BRAND_OPTIONS = [
  { id: 'ido', label: 'I Do Bridal Couture' },
  { id: 'proper', label: 'Proper & Co.' },
];

function formatWhen(value: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

function statusPresentation(status: string) {
  return STATUS_PRESENTATION[status] || STATUS_PRESENTATION.NOT_CONFIGURED;
}

export default function ConnectionsControlPlane() {
  const { profile } = useAuth();
  const canManage = ['Owner', 'Manager'].includes(profile?.role || '');
  const [connections, setConnections] = useState<LiveMarketingConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<MarketingProvider | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [credentialProvider, setCredentialProvider] = useState<'klaviyo' | 'call_tracking' | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const [shopifySetupOpen, setShopifySetupOpen] = useState(false);
  const [shopDomain, setShopDomain] = useState('');

  const [mappingProvider, setMappingProvider] = useState<MarketingProvider | null>(null);
  const [discoveredResources, setDiscoveredResources] = useState<DiscoveredProviderResource[]>([]);
  const [discoveryWarnings, setDiscoveryWarnings] = useState<string[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState(false);

  const [websiteProvision, setWebsiteProvision] = useState<{
    endpoint: string;
    signingSecret: string;
    signingInstructions: string;
  } | null>(null);

  const loadConnections = async () => {
    setLoadError(null);
    try {
      const data = await listLiveMarketingConnections();
      setConnections(data);
    } catch (error: any) {
      setLoadError(error.message || 'Unable to reach the integration service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
    const query = new URLSearchParams(window.location.search);
    const result = query.get('marketingConnection');
    const provider = query.get('provider');
    if (result === 'success') {
      toast({ title: 'Authorization completed', description: `${provider || 'Provider'} returned control to VowOS. Verify and map its accounts next.` });
    } else if (result === 'error') {
      toast({ title: 'Authorization failed', description: query.get('reason') || 'The provider did not complete authorization.', variant: 'destructive' });
    }
    if (result) {
      query.delete('marketingConnection');
      query.delete('provider');
      query.delete('reason');
      const next = `${window.location.pathname}${query.toString() ? `?${query}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', next);
    }
  }, []);

  const counts = useMemo(() => {
    const healthy = connections.filter((c) => c.status === 'CONNECTED_HEALTHY').length;
    const configuration = connections.filter((c) => c.status === 'CONFIGURATION_REQUIRED').length;
    return { healthy, configuration, attention: Math.max(0, connections.length - healthy - configuration) };
  }, [connections]);

  const replaceConnection = (next: LiveMarketingConnection) => {
    setConnections((current) => current.map((item) => (item.provider === next.provider ? next : item)));
  };

  const beginOAuth = async (connection: LiveMarketingConnection, options?: { shop?: string }) => {
    if (!canManage) return;
    setBusyProvider(connection.provider);
    try {
      const authorizationUrl = await startProviderOAuth(connection.provider, options);
      window.location.assign(authorizationUrl);
    } catch (error: any) {
      toast({ title: `${connection.title} setup could not start`, description: error.message, variant: 'destructive' });
      setBusyProvider(null);
    }
  };

  const handlePrimarySetup = async (connection: LiveMarketingConnection) => {
    if (!canManage) {
      toast({ title: 'Owner/Manager access required', description: 'Provider credentials can only be changed by an Owner or Manager.' });
      return;
    }
    if (!connection.configuration.configured && connection.authMode === 'oauth2') {
      toast({
        title: `${connection.title} developer setup required`,
        description: `Server configuration is missing: ${connection.configuration.missing.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (connection.provider === 'shopify') {
      setShopifySetupOpen(true);
      return;
    }
    if (connection.authMode === 'oauth2') {
      await beginOAuth(connection);
      return;
    }
    if (connection.provider === 'klaviyo' || connection.provider === 'call_tracking') {
      setCredentialProvider(connection.provider);
      setOrganizationName(connection.externalOrganization?.name || '');
      return;
    }
    if (connection.provider === 'web_forms') {
      setBusyProvider(connection.provider);
      try {
        const result = await provisionWebsiteIntake();
        replaceConnection(result.connection);
        setWebsiteProvision({
          endpoint: result.endpoint,
          signingSecret: result.signingSecret,
          signingInstructions: result.signingInstructions,
        });
      } catch (error: any) {
        toast({ title: 'Website intake setup failed', description: error.message, variant: 'destructive' });
      } finally {
        setBusyProvider(null);
      }
    }
  };

  const handleSaveApiKey = async () => {
    if (!credentialProvider || !apiKey.trim()) return;
    setBusyProvider(credentialProvider);
    try {
      const connection = await saveProviderApiKey(credentialProvider, apiKey.trim(), organizationName.trim());
      replaceConnection(connection);
      toast({ title: 'Provider verified', description: `${connection.title} credential was verified server-side and encrypted at rest.` });
      setCredentialProvider(null);
      setApiKey('');
      setOrganizationName('');
    } catch (error: any) {
      toast({ title: 'Credential rejected', description: error.message, variant: 'destructive' });
    } finally {
      setBusyProvider(null);
    }
  };

  const handleTest = async (connection: LiveMarketingConnection) => {
    setBusyProvider(connection.provider);
    try {
      const next = await testLiveMarketingConnection(connection.provider);
      replaceConnection(next);
      toast({ title: `${connection.title} verification complete`, description: statusPresentation(next.status).description });
    } catch (error: any) {
      toast({ title: `${connection.title} verification failed`, description: error.message, variant: 'destructive' });
      await loadConnections();
    } finally {
      setBusyProvider(null);
    }
  };

  const openMapping = async (connection: LiveMarketingConnection) => {
    setMappingProvider(connection.provider);
    setDiscovering(true);
    setDiscoveryWarnings([]);
    setDiscoveredResources([]);
    setSelectedResourceIds(connection.selectedResources.map((item: any) => String(item.id || item.externalId || '')));
    setSelectedBrands(connection.brandMappings || []);
    setSelectedLocations(connection.locationMappings || []);
    try {
      const result = await discoverProviderResources(connection.provider);
      setDiscoveredResources(result.resources);
      setDiscoveryWarnings(result.warnings || []);
    } catch (error: any) {
      setDiscoveryWarnings([error.message || 'Resource discovery failed.']);
    } finally {
      setDiscovering(false);
    }
  };

  const saveMappings = async () => {
    if (!mappingProvider) return;
    const selected = discoveredResources.filter((item) => selectedResourceIds.includes(item.id));
    setBusyProvider(mappingProvider);
    try {
      const next = await saveProviderResourceMappings(mappingProvider, {
        resources: selected,
        brandMappings: selectedBrands,
        locationMappings: selectedLocations,
      });
      replaceConnection(next);
      setMappingProvider(null);
      toast({ title: 'Account mappings saved', description: `${next.title} now uses only the resources and business locations you selected.` });
    } catch (error: any) {
      toast({ title: 'Could not save mappings', description: error.message, variant: 'destructive' });
    } finally {
      setBusyProvider(null);
    }
  };

  const handleDisconnect = async (connection: LiveMarketingConnection) => {
    if (!canManage) return;
    if (!window.confirm(`Disconnect ${connection.title}? VowOS will remove its stored provider credentials.`)) return;
    setBusyProvider(connection.provider);
    try {
      const next = await disconnectLiveMarketingConnection(connection.provider);
      replaceConnection(next);
      toast({ title: 'Provider disconnected', description: `${connection.title} credentials were removed from active use.` });
    } catch (error: any) {
      toast({ title: 'Disconnect failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyProvider(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[360px] flex items-center justify-center rounded-2xl border border-stone-200 bg-white">
        <div className="text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-rose-500" />
          <p className="text-sm font-semibold text-stone-700">Checking live integration health…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-rose-500" />
            <h2 className="text-xl font-bold text-stone-900">Connections &amp; OAuth</h2>
          </div>
          <p className="text-sm text-stone-500 mt-1 max-w-3xl">
            One control plane for paid social, Google, commerce, lifecycle messaging, call attribution and website lead intake. VowOS only reports a provider as healthy after server-side verification.
          </p>
        </div>
        <button onClick={loadConnections} className={`${btnSecondary} shrink-0`}>
          <RefreshCw className="h-4 w-4" /> Refresh Health
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Healthy</div>
          <div className="mt-1 text-3xl font-black text-emerald-900">{counts.healthy}</div>
          <div className="text-xs text-emerald-700">verified + mapped</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Needs Attention</div>
          <div className="mt-1 text-3xl font-black text-amber-900">{counts.attention}</div>
          <div className="text-xs text-amber-700">authorize, verify or map</div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Developer Setup</div>
          <div className="mt-1 text-3xl font-black text-violet-900">{counts.configuration}</div>
          <div className="text-xs text-violet-700">provider app credentials/approval</div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-950 p-4 text-white flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-sm">Production connection truth</div>
          <p className="text-xs text-stone-300 mt-1 leading-relaxed">
            Provider secrets are stored server-side, encrypted at rest, and never returned to the browser. OAuth uses short-lived CSRF state. Only Owners and Managers can change connections; other staff can inspect health.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3 text-rose-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-bold text-sm">Integration service unavailable</div>
            <p className="text-xs mt-1">{loadError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {connections.map((connection) => {
          const status = statusPresentation(connection.status);
          const isBusy = busyProvider === connection.provider;
          const hasCredential = !['NOT_CONFIGURED', 'DISCONNECTED', 'CONFIGURATION_REQUIRED'].includes(connection.status);
          return (
            <section key={connection.provider} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-stone-900">{connection.title}</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{connection.description}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.classes}`}>
                  {status.label}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {connection.subServices.map((service) => (
                  <div key={service.id} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-stone-800">{service.label}</span>
                      {service.configurationReady ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Settings2 className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1 leading-snug">{service.description}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-400 font-bold">Business Account</span>
                  <span className="font-semibold text-stone-800">{connection.externalOrganization?.name || 'Not authorized'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-400 font-bold">Selected Resources</span>
                  <span className="font-semibold text-stone-800">{connection.selectedResources.length}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-400 font-bold">Last Verified</span>
                  <span className="font-semibold text-stone-800">{formatWhen(connection.lastVerifiedAt)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-stone-400 font-bold">Last Webhook</span>
                  <span className="font-semibold text-stone-800">{formatWhen(connection.lastWebhookAt)}</span>
                </div>
              </div>

              {(connection.lastError || connection.missingScopes.length > 0 || connection.configuration.missing.length > 0) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                  {connection.lastError && <div><strong>Last error:</strong> {connection.lastError}</div>}
                  {connection.missingScopes.length > 0 && <div><strong>Missing/unchecked scopes:</strong> {connection.missingScopes.join(', ')}</div>}
                  {connection.configuration.missing.length > 0 && <div><strong>Server setup:</strong> {connection.configuration.missing.join(', ')}</div>}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  disabled={isBusy}
                  onClick={() => handlePrimarySetup(connection)}
                  className={`${btnPrimary} disabled:opacity-50`}
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : connection.authMode === 'api_key' ? <KeyRound className="h-4 w-4" /> : connection.authMode === 'internal' ? <Webhook className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {hasCredential ? 'Reconnect / Configure' : connection.authMode === 'internal' ? 'Provision Endpoint' : 'Connect'}
                </button>

                {hasCredential && connection.provider !== 'web_forms' && (
                  <button disabled={isBusy} onClick={() => openMapping(connection)} className={btnSecondary}>
                    <Settings2 className="h-4 w-4" /> Map Accounts
                  </button>
                )}

                {hasCredential && (
                  <button disabled={isBusy} onClick={() => handleTest(connection)} className={btnSecondary}>
                    <Activity className="h-4 w-4" /> Test
                  </button>
                )}

                {hasCredential && canManage && (
                  <button disabled={isBusy} onClick={() => handleDisconnect(connection)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                    <Unplug className="h-4 w-4" /> Disconnect
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {!canManage && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600 flex items-center gap-2">
          <LockKeyhole className="h-4 w-4" /> Connection changes are restricted to an Owner or Manager. Your view is read-only.
        </div>
      )}

      {credentialProvider && (
        <Modal open={true} onClose={() => setCredentialProvider(null)} title={credentialProvider === 'klaviyo' ? 'Connect Klaviyo' : 'Connect Call Tracking'} maxWidth="max-w-lg">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-700">Organization / account name</label>
              <input className={`${inputCls} mt-1`} value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Roberts Enterprises" />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700">Private API key</label>
              <input className={`${inputCls} mt-1 font-mono`} type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste private API key" />
              <p className="text-[11px] text-stone-500 mt-1">The key is sent directly to the VowOS worker, verified, encrypted, and never returned to this browser.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button className={btnSecondary} onClick={() => setCredentialProvider(null)}>Cancel</button>
              <button className={btnPrimary} disabled={!apiKey.trim() || busyProvider === credentialProvider} onClick={handleSaveApiKey}>
                {busyProvider === credentialProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify &amp; Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {shopifySetupOpen && (
        <Modal open={true} onClose={() => setShopifySetupOpen(false)} title="Connect Shopify" maxWidth="max-w-lg">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-700">Shopify store domain</label>
              <input className={`${inputCls} mt-1`} value={shopDomain} onChange={(e) => setShopDomain(e.target.value)} placeholder="properandcompany.myshopify.com" />
              <p className="text-[11px] text-stone-500 mt-1">Use the permanent <strong>myshopify.com</strong> domain, not the customer-facing storefront URL.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button className={btnSecondary} onClick={() => setShopifySetupOpen(false)}>Cancel</button>
              <button
                className={btnPrimary}
                disabled={!shopDomain.trim()}
                onClick={() => {
                  const connection = connections.find((item) => item.provider === 'shopify');
                  if (connection) beginOAuth(connection, { shop: shopDomain.trim() });
                }}
              >
                <ExternalLink className="h-4 w-4" /> Continue to Shopify
              </button>
            </div>
          </div>
        </Modal>
      )}

      {mappingProvider && (
        <Modal open={true} onClose={() => setMappingProvider(null)} title="Map Provider Accounts to VowOS" maxWidth="max-w-3xl">
          <div className="space-y-5">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
              Select only the external accounts VowOS should use, then map them to the Roberts brands and locations. This prevents data from unrelated businesses or personal accounts from entering analytics.
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Provider resources</div>
              {discovering ? (
                <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-rose-500" /><div className="text-xs text-stone-500 mt-2">Discovering live accounts…</div></div>
              ) : discoveredResources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500 flex gap-2 items-center"><CircleSlash className="h-4 w-4" /> No selectable resources were returned.</div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {discoveredResources.map((item) => (
                    <label key={`${item.type}-${item.id}`} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 cursor-pointer hover:bg-stone-50">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedResourceIds.includes(item.id)}
                        onChange={(e) => setSelectedResourceIds((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-stone-900 truncate">{item.name}</div>
                        <div className="text-[11px] text-stone-500">{item.type} · {item.externalId}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {discoveryWarnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                {discoveryWarnings.map((warning, index) => <div key={index}>• {warning}</div>)}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Brands</div>
                <div className="space-y-2">
                  {BRAND_OPTIONS.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm text-stone-700">
                      <input type="checkbox" checked={selectedBrands.includes(option.id)} onChange={(e) => setSelectedBrands((current) => e.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id))} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Locations</div>
                <div className="space-y-2">
                  {LOCATION_OPTIONS.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm text-stone-700">
                      <input type="checkbox" checked={selectedLocations.includes(option.id)} onChange={(e) => setSelectedLocations((current) => e.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id))} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
              <button className={btnSecondary} onClick={() => setMappingProvider(null)}>Cancel</button>
              <button className={btnPrimary} disabled={selectedResourceIds.length === 0 || busyProvider === mappingProvider} onClick={saveMappings}>
                {busyProvider === mappingProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save Mapping
              </button>
            </div>
          </div>
        </Modal>
      )}

      {websiteProvision && (
        <Modal open={true} onClose={() => setWebsiteProvision(null)} title="Website Lead Intake Provisioned" maxWidth="max-w-2xl">
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Copy the signing secret now. For security, VowOS will not display this same secret again after you close this window; reprovisioning creates a new one.
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700">Endpoint</label>
              <div className="mt-1 rounded-xl border border-stone-200 bg-stone-50 p-3 font-mono text-xs break-all">{websiteProvision.endpoint}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700">Signing secret</label>
              <div className="mt-1 rounded-xl border border-stone-200 bg-stone-950 text-emerald-300 p-3 font-mono text-xs break-all">{websiteProvision.signingSecret}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-stone-700">Signing rule</label>
              <div className="mt-1 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">{websiteProvision.signingInstructions}</div>
            </div>
            <div className="flex justify-end">
              <button className={btnPrimary} onClick={() => setWebsiteProvision(null)}>I Saved the Secret <ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
