import { useCallback, useMemo, useState } from 'react';
import {
  PlugZap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Clock,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';
import { supabase } from '@/lib/supabase';
import { useGrowthConnections, useBusinessId } from '@/lib/growth/useGrowth';
import type { GrowthProvider, ProviderConnection } from '@/lib/growth/types';

interface ProviderSpec {
  id: GrowthProvider | 'meta_social';
  label: string;
  description: string;
  connectPath: string;
  syncPath?: string;
  /** Providers gated behind a manual approval by the platform owner. */
  approval?: string;
}

const PROVIDERS: ProviderSpec[] = [
  {
    id: 'google_search_console',
    label: 'Google Search Console',
    description: 'Which searches bring brides to your site, and where you rank.',
    connectPath: '/api/growth/connect/google_search_console',
    syncPath: '/api/growth/sync/search-console',
  },
  {
    id: 'google_business_profile',
    label: 'Google Business Profile',
    description: 'Maps performance, listing health, and reviews with reply publishing.',
    connectPath: '/api/growth/connect/google_business_profile',
    syncPath: '/api/growth/sync/business-profile',
    approval: 'Needs an approved Google access request — quota reads 0 QPM until then.',
  },
  {
    id: 'meta_ads',
    label: 'Meta Ads',
    description: 'Facebook and Instagram ad spend, campaigns, and conversions.',
    connectPath: '/api/growth/connect-meta/meta_ads',
    syncPath: '/api/growth/sync/meta-ads',
    approval: 'Works now for ad accounts you have a role on; App Review is only needed for other tenants.',
  },
  {
    id: 'meta_social',
    label: 'Instagram & Facebook',
    description: 'Organic posts, reach, engagement, and follower growth.',
    connectPath: '/api/growth/connect-meta/meta_social',
    syncPath: '/api/growth/sync/social',
    approval: 'Same Standard Access rule as Meta Ads.',
  },
];

const STATUS_STYLE: Record<string, string> = {
  connected: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  revoked: 'border-rose-200 bg-rose-50 text-rose-700',
  disconnected: 'border-stone-200 bg-stone-50 text-stone-600',
};

const relative = (iso: string | null) => {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

/**
 * Connect and sync the growth data sources.
 *
 * Every call carries the caller's Supabase access token: the worker runs under
 * the service role and derives business_id from that token's membership, so the
 * browser cannot name a tenant. Nothing here posts a business id as a fact.
 */
export function GrowthConnectionsPanel() {
  const { data: connections, loading, refresh } = useGrowthConnections();
  const businessId = useBusinessId();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const byProvider = useMemo(() => {
    const map = new Map<string, ProviderConnection>();
    for (const c of connections) map.set(c.provider, c);
    return map;
  }, [connections]);

  const authorizedFetch = useCallback(async (path: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Sign in again to manage connections.');
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
    if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
    return json;
  }, []);

  const connect = async (spec: ProviderSpec) => {
    setBusy(spec.id);
    setMessage(null);
    try {
      const { url } = await authorizedFetch(spec.connectPath);
      if (!url) throw new Error('No consent URL returned.');
      // Full navigation, not a popup: OAuth in a popup is blocked by default on
      // mobile Safari, which is where a boutique owner usually is.
      window.location.assign(url);
    } catch (err) {
      setBusy(null);
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const sync = async (spec: ProviderSpec) => {
    if (!spec.syncPath) return;
    setBusy(spec.id);
    setMessage(null);
    try {
      const result = (await authorizedFetch(spec.syncPath, { method: 'POST', body: JSON.stringify({}) })) as {
        rowsWritten?: number;
        recordsWritten?: number;
        pagesCrawled?: number;
      };
      const written = result.rowsWritten ?? result.recordsWritten ?? result.pagesCrawled ?? 0;
      setMessage({ kind: 'ok', text: `${spec.label}: synced ${written} record${written === 1 ? '' : 's'}.` });
      refresh();
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="shadow-sm" data-tour-id="growth-connections">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlugZap className="h-4 w-4 text-stone-400" /> Data sources
        </CardTitle>
        <CardDescription>
          Connect the accounts VowOS pulls growth data from. Tokens are stored server-side and never reach your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {message && (
          <div
            data-tour-id="connections-message"
            className={`rounded-lg border px-3 py-2 text-xs ${
              message.kind === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {PROVIDERS.map((spec) => {
          const connection = byProvider.get(spec.id);
          const status = connection?.status ?? 'disconnected';
          const isConnected = status === 'connected';
          const working = busy === spec.id;

          return (
            <div
              key={spec.id}
              data-tour-id={`connection-${spec.id}`}
              className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-900">{spec.label}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[status] ?? STATUS_STYLE.disconnected}`}
                  >
                    {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {status}
                  </span>
                  {isConnected && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                      <Clock className="h-3 w-3" /> synced {relative(connection?.last_sync_at ?? null)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-stone-500">{spec.description}</p>
                {spec.approval && !isConnected && (
                  <p className="mt-1 flex items-start gap-1 text-[11px] text-amber-700">
                    <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                    {spec.approval}
                  </p>
                )}
                {connection?.last_error && (
                  <p className="mt-1 text-[11px] text-rose-700" data-tour-id={`connection-error-${spec.id}`}>
                    {connection.last_error}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isConnected && spec.syncPath && (
                  <button
                    data-tour-id={`sync-${spec.id}`}
                    onClick={() => sync(spec)}
                    disabled={working}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
                  >
                    {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Sync now
                  </button>
                )}
                <button
                  data-tour-id={`connect-${spec.id}`}
                  onClick={() => connect(spec)}
                  disabled={working || !businessId}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    isConnected
                      ? 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                  }`}
                >
                  {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  {isConnected ? 'Reconnect' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}

        {loading && <p className="text-xs text-stone-500">Loading connections…</p>}
      </CardContent>
    </Card>
  );
}
