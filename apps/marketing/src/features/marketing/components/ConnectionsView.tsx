import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  MapPin,
  PlugZap,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, toast } from '@vowos/design-system';
import { getActiveDataPlane, supabase } from '@/lib/supabase';
import { useGrowthConnections } from '@/lib/growth/useGrowth';
import type { GrowthProvider, ProviderConnection } from '@/lib/growth/types';

interface ProviderDefinition {
  key: GrowthProvider;
  title: string;
  category: 'Advertising' | 'Analytics' | 'Search & Local' | 'Social' | 'Commerce & Website';
  description: string;
  connectPath?: string;
  syncPath?: string;
  externalRequirement?: string;
}

const PROVIDERS: ProviderDefinition[] = [
  {
    key: 'google_ads',
    title: 'Google Ads',
    category: 'Advertising',
    description: 'Campaign spend, clicks, platform conversions and account-level performance.',
    connectPath: '/api/growth/connect/google_ads',
    externalRequirement: 'Requires Google Ads API access and GOOGLE_ADS_DEVELOPER_TOKEN on the worker.',
  },
  {
    key: 'meta_ads',
    title: 'Meta Ads',
    category: 'Advertising',
    description: 'Facebook and Instagram paid campaign performance.',
    connectPath: '/api/growth/connect-meta/meta_ads',
    syncPath: '/api/growth/sync/meta-ads',
    externalRequirement: 'Other tenants require Meta App Review and Business Verification; your own app-role assets can work under Standard Access.',
  },
  {
    key: 'pinterest_ads',
    title: 'Pinterest Ads',
    category: 'Advertising',
    description: 'Paid Pinterest campaign performance and downstream VowOS outcomes.',
    externalRequirement: 'Pinterest developer app/OAuth connector must be configured before live sync is available.',
  },
  {
    key: 'tiktok_ads',
    title: 'TikTok Ads',
    category: 'Advertising',
    description: 'TikTok paid media spend and conversion performance.',
    externalRequirement: 'TikTok for Business developer credentials and approved scopes are required.',
  },
  {
    key: 'google_analytics',
    title: 'Google Analytics 4',
    category: 'Analytics',
    description: 'Website sessions, source/medium, landing pages and conversion behavior.',
    connectPath: '/api/growth/connect/google_analytics',
  },
  {
    key: 'google_search_console',
    title: 'Google Search Console',
    category: 'Search & Local',
    description: 'Organic queries, clicks, impressions, CTR and search position.',
    connectPath: '/api/growth/connect/google_search_console',
    syncPath: '/api/growth/sync/search-console',
  },
  {
    key: 'google_business_profile',
    title: 'Google Business Profile',
    category: 'Search & Local',
    description: 'Local listings, reviews and location presence.',
    connectPath: '/api/growth/connect/google_business_profile',
    syncPath: '/api/growth/sync/business-profile',
    externalRequirement: 'Google Business Profile API access approval is required; accounts with zero quota cannot sync.',
  },
  {
    key: 'meta_social',
    title: 'Facebook & Instagram Organic',
    category: 'Social',
    description: 'Pages, Instagram business accounts, posts and engagement.',
    connectPath: '/api/growth/connect-meta/meta_social',
    syncPath: '/api/growth/sync/social',
  },
  {
    key: 'tiktok',
    title: 'TikTok Organic',
    category: 'Social',
    description: 'Organic content and audience performance when provider permissions allow.',
    externalRequirement: 'TikTok developer app and approved organic-account scopes are required.',
  },
  {
    key: 'pinterest',
    title: 'Pinterest Organic',
    category: 'Social',
    description: 'Pins, audience and content performance.',
    externalRequirement: 'Pinterest developer app/OAuth scopes are required.',
  },
  {
    key: 'youtube',
    title: 'YouTube',
    category: 'Social',
    description: 'Channel and video performance.',
    externalRequirement: 'YouTube Analytics/Data API OAuth connector must be configured.',
  },
  {
    key: 'linkedin_ads',
    title: 'LinkedIn',
    category: 'Social',
    description: 'Optional B2B advertising and company-page intelligence.',
    externalRequirement: 'LinkedIn Marketing API approval is required.',
  },
  {
    key: 'shopify',
    title: 'Shopify',
    category: 'Commerce & Website',
    description: 'Commerce outcomes used to close the marketing-to-sale loop.',
    externalRequirement: 'Map the tenant Shopify store through the VowOS Shopify integration.',
  },
  {
    key: 'website',
    title: 'VowOS Website Tracking',
    category: 'Commerce & Website',
    description: 'First-party UTM/click-ID touchpoints and form conversions.',
    externalRequirement: 'Install and verify VowOS first-party tracking on the tenant website.',
  },
];

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Data-Plane': getActiveDataPlane(),
  };
}

async function apiRequest(path: string, init: RequestInit = {}) {
  const headers = { ...(await authHeaders()), ...((init.headers as Record<string, string> | undefined) ?? {}) };
  const response = await fetch(path, { credentials: 'include', ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || `Request failed (${response.status}).`);
  return body;
}

const timeLabel = (value: string | null | undefined) => {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unknown';
};

function ConnectionStatus({ connection }: { connection?: ProviderConnection }) {
  const status = connection?.status ?? 'disconnected';
  const style =
    status === 'connected'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'error' || status === 'revoked'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : status === 'pending'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-stone-100 text-stone-600 border-stone-200';
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${style}`}>{status}</span>;
}

export default function ConnectionsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const connectionsState = useGrowthConnections();
  const [busy, setBusy] = useState<string | null>(null);
  const [setup, setSetup] = useState<Record<string, unknown> | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const connectionByProvider = useMemo(
    () => new Map(connectionsState.data.map((connection) => [connection.provider, connection])),
    [connectionsState.data],
  );

  useEffect(() => {
    fetch('/api/growth/setup/status')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        setSetup(body);
        if (!response.ok) setSetupError(body.error || 'Provider setup is incomplete.');
      })
      .catch((error) => setSetupError(error instanceof Error ? error.message : String(error)));
  }, []);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const provider = searchParams.get('provider');
    const error = searchParams.get('error');
    if (connected === '1') {
      toast({ title: 'Authorization completed', description: `${provider || 'Provider'} authorization returned successfully. Select/match the account and run a sync.` });
      connectionsState.refresh();
      setSearchParams({ tab: 'connections' });
    } else if (connected === '0' || error) {
      toast({ title: 'Authorization failed', description: error || 'The provider did not authorize VowOS.', variant: 'destructive' });
      setSearchParams({ tab: 'connections' });
    }
  }, [searchParams, setSearchParams, connectionsState]);

  const connect = async (provider: ProviderDefinition) => {
    if (!provider.connectPath) {
      toast({
        title: `${provider.title} requires provider setup`,
        description: provider.externalRequirement || 'This provider connector is not configured yet.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(provider.key);
    try {
      const body = await apiRequest(provider.connectPath);
      if (!body.url) throw new Error('The provider did not return an OAuth consent URL.');
      window.location.assign(body.url);
    } catch (error) {
      toast({ title: `Could not connect ${provider.title}`, description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
      setBusy(null);
    }
  };

  const sync = async (provider: ProviderDefinition) => {
    if (!provider.syncPath) {
      toast({
        title: `${provider.title} sync is not yet available`,
        description: provider.externalRequirement || 'Authorization may be supported, but a live data sync route has not been configured.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(provider.key);
    try {
      const body = await apiRequest(provider.syncPath, { method: 'POST', body: JSON.stringify({ days: 30 }) });
      toast({ title: `${provider.title} sync completed`, description: `${body.recordsWritten ?? body.rowsWritten ?? 0} records written.` });
      connectionsState.refresh();
    } catch (error) {
      toast({ title: `${provider.title} sync failed`, description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const categories = ['Advertising', 'Analytics', 'Search & Local', 'Social', 'Commerce & Website'] as const;
  const missing = (setup?.missing as string[] | undefined) ?? [];
  const warnings = (setup?.warnings as string[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Marketing Connections</h2>
          <p className="mt-1 text-sm text-stone-500">Authorize real provider accounts, map them to the tenant, and verify data freshness.</p>
        </div>
        <button
          onClick={connectionsState.refresh}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <Card className="border-stone-800 bg-stone-900 text-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <div>
              <p className="text-sm font-bold">Connection truth rule</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-300">
                VowOS only displays a provider as connected when a tenant-scoped provider row exists. A successful OAuth redirect is not the same as a successful data sync; last-sync status and errors are shown separately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(missing.length > 0 || warnings.length > 0 || setupError) && (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-amber-950">Provider infrastructure needs attention</CardTitle>
            <CardDescription>These are server/developer-account requirements, not UI placeholders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {setupError && <p className="text-xs text-amber-900">{setupError}</p>}
            {missing.map((item) => <div key={item} className="flex items-center gap-2 text-xs text-amber-900"><KeyRound className="h-3.5 w-3.5" /> Missing required environment variable: <strong>{item}</strong></div>)}
            {warnings.map((item, index) => <div key={index} className="flex items-start gap-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {item}</div>)}
          </CardContent>
        </Card>
      )}

      {connectionsState.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{connectionsState.error}</div>
      )}

      {categories.map((category) => (
        <section key={category} className="space-y-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">{category}</h3>
            <p className="mt-0.5 text-xs text-stone-400">{PROVIDERS.filter((provider) => provider.category === category).length} available/roadmapped data sources</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {PROVIDERS.filter((provider) => provider.category === category).map((provider) => {
              const connection = connectionByProvider.get(provider.key);
              const connected = connection?.status === 'connected';
              const working = busy === provider.key;
              return (
                <Card key={provider.key} className="shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-stone-900">{provider.title}</h4>
                          <ConnectionStatus connection={connection} />
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-stone-500">{provider.description}</p>
                      </div>
                      <PlugZap className={`h-5 w-5 shrink-0 ${connected ? 'text-emerald-600' : 'text-stone-300'}`} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-3 text-xs sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Account</p>
                        <p className="mt-1 truncate font-medium text-stone-700">{connection?.display_name || connection?.external_account_id || 'Not mapped'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Last successful attempt</p>
                        <p className="mt-1 font-medium text-stone-700">{timeLabel(connection?.last_sync_at)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Sync status</p>
                        <p className="mt-1 font-medium text-stone-700">{connection?.last_sync_status || 'Never synced'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Location mapping</p>
                        <p className="mt-1 inline-flex items-center gap-1 font-medium text-stone-700"><MapPin className="h-3 w-3" /> {connection?.location_id ? 'Mapped' : 'Business-wide / not mapped'}</p>
                      </div>
                    </div>

                    {connection?.last_error && (
                      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{connection.last_error}</div>
                    )}
                    {!provider.connectPath && provider.externalRequirement && (
                      <div className="mt-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
                        <strong>Required:</strong> {provider.externalRequirement}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        disabled={working}
                        onClick={() => connect(provider)}
                        className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
                      >
                        {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                        {connected ? 'Reauthorize' : 'Connect'}
                      </button>
                      {connected && (
                        <button
                          disabled={working}
                          onClick={() => sync(provider)}
                          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                        >
                          <Activity className="h-3.5 w-3.5" /> Sync Now
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">What “working” means</CardTitle>
          <CardDescription>VowOS separates authorization, account mapping, sync health and attribution so stale or partial connections cannot masquerade as live data.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            ['Authorized', 'OAuth/token exists for this tenant.'],
            ['Mapped', 'The exact external account is attached to the correct business/location.'],
            ['Synced', 'The provider returned records successfully.'],
            ['Attributed', 'VowOS can connect provider activity to downstream leads/appointments/sales.'],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <CheckCircle2 className="h-4 w-4 text-brand-primary" />
              <p className="mt-2 text-xs font-bold text-stone-800">{title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-stone-400">
        <ExternalLink className="h-3.5 w-3.5" /> Third-party API approvals and account authorization must be completed by the account owner/provider; VowOS does not fake those states.
      </div>
    </div>
  );
}
