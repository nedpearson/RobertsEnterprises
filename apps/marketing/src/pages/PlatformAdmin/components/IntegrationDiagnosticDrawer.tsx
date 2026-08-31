import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertOctagon, AlertTriangle, Check, CheckCircle2, Clock, Copy, FileText, KeyRound, Lock, MessageSquare, Radio, RefreshCw, RotateCcw, ShoppingBag, Sliders, Wifi, Zap } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { DiagnosticDrawerData, IntegrationTableRow } from '@/types/integrationOps';
import {
  forceReconcile,
  generateReconnectUrl,
  getIntegrationDiagnostics,
  testConnection,
  triggerAutoRepair,
} from '@/lib/platform/platformDataSource';

interface IntegrationDiagnosticDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  integration: IntegrationTableRow | null;
  onRefresh?: () => void;
}

type Feedback = { type: 'success' | 'error' | 'info'; message: string };

function providerIcon(provider?: string) {
  const value = (provider || '').toLowerCase();
  if (value.includes('shopify')) return <ShoppingBag className="h-5 w-5 text-emerald-600" />;
  if (value.includes('instagram')) return <MessageSquare className="h-5 w-5 text-pink-600" />;
  if (value.includes('facebook') || value.includes('meta')) return <MessageSquare className="h-5 w-5 text-blue-600" />;
  if (value.includes('drive')) return <FileText className="h-5 w-5 text-amber-600" />;
  if (value.includes('google')) return <Activity className="h-5 w-5 text-blue-500" />;
  if (value.includes('stripe')) return <Zap className="h-5 w-5 text-indigo-600" />;
  return <Radio className="h-5 w-5 text-stone-500" />;
}

function healthBadge(status?: string | null) {
  const value = String(status || 'RECOVERING').toUpperCase().replace(/\s+/g, '_');
  if (value === 'HEALTHY') return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Healthy</Badge>;
  if (value === 'ACTION_REQUIRED') return <Badge className="border-rose-200 bg-rose-50 text-rose-700"><AlertOctagon className="mr-1 h-3 w-3" />Action Required</Badge>;
  if (value === 'DEGRADED') return <Badge className="border-amber-200 bg-amber-50 text-amber-700"><AlertTriangle className="mr-1 h-3 w-3" />Degraded</Badge>;
  return <Badge className="border-blue-200 bg-blue-50 text-blue-700">Recovering / Pending</Badge>;
}

function authTone(state?: string | null) {
  if (state === 'AUTHORIZED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (state === 'REVOKED' || state === 'REAUTH_REQUIRED' || state === 'EXPIRED') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export function IntegrationDiagnosticDrawer({ isOpen, onClose, integration, onRefresh }: IntegrationDiagnosticDrawerProps) {
  const { toast } = useToast();
  const [data, setData] = useState<DiagnosticDrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [reconnectLink, setReconnectLink] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async () => {
    if (!integration) return;
    setLoading(true);
    try {
      const result = await getIntegrationDiagnostics(integration.id);
      if (result.error) {
        setData(null);
        setFeedback({ type: 'error', message: result.error });
        return;
      }
      setData(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load diagnostic data.';
      setData(null);
      setFeedback({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [integration]);

  useEffect(() => {
    if (isOpen && integration) {
      setFeedback(null);
      setReconnectLink(null);
      void loadDiagnostics();
    } else {
      setData(null);
      setFeedback(null);
      setReconnectLink(null);
    }
  }, [isOpen, integration, loadDiagnostics]);

  const copy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard access is unavailable.', variant: 'destructive' });
    }
  };

  const runAction = async (name: string, fn: () => Promise<{ success: boolean; message: string }>) => {
    setActionLoading(name);
    setFeedback(null);
    try {
      const result = await fn();
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      toast({
        title: result.success ? 'Action completed' : 'Action not completed',
        description: result.message,
        variant: result.success ? undefined : 'destructive',
      });
      if (result.success) {
        await loadDiagnostics();
        onRefresh?.();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReconnect = async () => {
    if (!integration) return;
    setActionLoading('reconnect');
    setFeedback(null);
    try {
      const result = await generateReconnectUrl(integration.id);
      if (!result.success || !result.url) {
        const message = 'A verified reconnect link is not available for this connection. Use the provider integration setup flow.';
        setFeedback({ type: 'error', message });
        toast({ title: 'Reconnect link unavailable', description: message, variant: 'destructive' });
        return;
      }
      setReconnectLink(result.url);
      setFeedback({ type: 'info', message: 'Verified reconnect route generated. No provider credential is exposed in this browser.' });
    } finally {
      setActionLoading(null);
    }
  };

  if (!integration) return null;

  const connection: any = data?.connection || {
    provider: integration.provider,
    provider_account_id: integration.provider_account_id,
    health_status: integration.health_status,
    auth_state: integration.auth_state || 'PENDING',
    circuit_breaker_state: integration.circuit_breaker_state,
    last_health_check_at: integration.last_event_at,
    last_successful_sync_at: integration.last_successful_sync_at,
  };
  const health = connection.health_status || integration.health_status || 'RECOVERING';
  const authState = connection.auth_state || 'PENDING';
  const lastChecked = connection.last_health_check_at || integration.last_event_at || null;
  const firstCursor: any = data?.cursors?.[0] || null;
  const latestError: any = data?.latestError || null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex h-full w-full flex-col overflow-hidden border-l border-stone-200 bg-white p-0 shadow-2xl sm:max-w-xl md:max-w-2xl">
        <div className="border-b border-stone-200 bg-stone-50/80 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-stone-200 bg-white p-2.5 shadow-xs">{providerIcon(integration.provider)}</div>
              <div>
                <div className="flex items-center gap-2"><h3 className="text-base font-semibold text-stone-900">{integration.provider}</h3><Badge variant="outline">{integration.brand_name || 'Organization Level'}</Badge></div>
                <p className="mt-0.5 text-xs text-stone-500">{integration.location_name || 'All Locations'}</p>
              </div>
            </div>
            {healthBadge(health)}
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {feedback && (
            <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : feedback.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}{feedback.message}
            </div>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400"><Activity className="h-3.5 w-3.5" />Connection Overview</h4>
              <span className="text-[11px] text-stone-400">{lastChecked ? `Last observed ${new Date(lastChecked).toLocaleString()}` : 'Not yet verified'}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
                <span className="text-[11px] font-medium text-stone-500">Provider Account</span>
                <div className="flex items-center justify-between gap-2"><span className="truncate font-mono text-xs text-stone-800">{integration.provider_account_id || 'Not recorded'}</span>{integration.provider_account_id && <button type="button" onClick={() => void copy(integration.provider_account_id, 'account')} className="text-stone-400">{copiedField === 'account' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button>}</div>
                <span className="text-[10px] text-stone-400">Connection ID: {integration.id}</span>
              </div>

              <div className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
                <div className="flex items-center justify-between"><span className="text-[11px] font-medium text-stone-500">Authorization State</span><Badge variant="outline" className={`text-[10px] ${authTone(authState)}`}>{authState}</Badge></div>
                <div className="flex items-center gap-1.5 text-xs text-stone-700"><Lock className="h-3 w-3 text-stone-400" />Credentials are stored server-side and are never exposed here.</div>
              </div>

              <div className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
                <span className="text-[11px] font-medium text-stone-500">Circuit Breaker</span>
                <div className="font-mono text-xs text-stone-800">{data?.circuitBreaker?.state || connection.circuit_breaker_state || 'UNKNOWN'}</div>
                {data?.circuitBreaker && <span className="text-[10px] text-stone-400">Consecutive failures: {data.circuitBreaker.consecutive_failures ?? 0}</span>}
              </div>

              <div className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
                <div className="flex items-center justify-between"><span className="text-[11px] font-medium text-stone-500">Sync Cursor</span><Badge variant="outline" className="text-[10px]">{firstCursor?.sync_status || 'NOT RECORDED'}</Badge></div>
                <div className="font-mono text-xs text-stone-800">{connection.last_successful_sync_at ? new Date(connection.last_successful_sync_at).toLocaleString() : 'No verified successful sync recorded'}</div>
                <span className="text-[10px] text-stone-400">Records synced: {typeof firstCursor?.records_synced_total === 'number' ? firstCursor.records_synced_total : '—'}</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400"><AlertTriangle className="h-3.5 w-3.5" />Latest Recorded Failure</h4>
            {latestError ? (
              <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="flex flex-wrap gap-2"><Badge variant="outline" className="font-mono text-xs">{latestError.failure_category || 'UNKNOWN'}</Badge>{latestError.status_code ? <Badge variant="outline">HTTP {latestError.status_code}</Badge> : null}</div>
                <div><span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Root cause</span><p className="mt-1 text-xs text-stone-800">{latestError.root_cause || latestError.error_message || 'No root-cause detail recorded.'}</p></div>
                <div><span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Suggested action</span><p className="mt-1 text-xs text-stone-700">{latestError.suggested_action || 'No suggested action recorded.'}</p></div>
                {latestError.endpoint && <div><span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Endpoint</span><p className="mt-1 break-all font-mono text-[11px] text-stone-600">{latestError.endpoint}</p></div>}
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 text-xs text-stone-600">No persisted integration error is recorded for this connection. This does not substitute for a live provider probe.</div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between"><h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400"><Clock className="h-3.5 w-3.5" />Recovery Timeline</h4><span className="text-[11px] text-stone-400">{data?.timeline?.length || 0} recorded events</span></div>
            {data?.timeline?.length ? data.timeline.map((step: any) => (
              <div key={step.id} className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs">
                <div className="flex items-center justify-between gap-3"><span className="font-mono font-semibold text-stone-900">{step.action_type}</span><span className="text-[10px] text-stone-400">{step.created_at ? new Date(step.created_at).toLocaleString() : 'Timestamp unavailable'}</span></div>
                <div className="mt-1 text-[11px] text-stone-600">{step.previous_status || 'UNKNOWN'} → {step.resulting_status || 'UNKNOWN'} · {step.success ? 'Succeeded' : 'Not completed'}</div>
                {step.details && Object.keys(step.details).length > 0 && <pre className="mt-2 max-h-28 overflow-auto rounded bg-white p-2 font-mono text-[10px] text-stone-600">{JSON.stringify(step.details, null, 2)}</pre>}
              </div>
            )) : <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 text-xs text-stone-500">No remediation events have been recorded.</div>}
          </section>

          {loading && <div className="text-xs text-stone-400">Refreshing diagnostics…</div>}
        </div>

        <div className="space-y-3 border-t border-stone-200 bg-stone-50/90 p-5">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600"><Sliders className="h-3.5 w-3.5" />Operator Actions</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="outline" size="sm" disabled={actionLoading !== null} onClick={() => void runAction('repair', () => triggerAutoRepair(integration.id))} className="gap-1.5 text-xs"><RotateCcw className={`h-3.5 w-3.5 ${actionLoading === 'repair' ? 'animate-spin' : ''}`} />Auto-Repair</Button>
            <Button variant="outline" size="sm" disabled={actionLoading !== null} onClick={() => void runAction('reconcile', () => forceReconcile(integration.id))} className="gap-1.5 text-xs"><RefreshCw className={`h-3.5 w-3.5 ${actionLoading === 'reconcile' ? 'animate-spin' : ''}`} />Reconcile</Button>
            <Button variant="outline" size="sm" disabled={actionLoading !== null} onClick={() => void runAction('test', async () => { const result = await testConnection(integration.id); return { success: result.success, message: result.message }; })} className="gap-1.5 text-xs"><Wifi className={`h-3.5 w-3.5 ${actionLoading === 'test' ? 'animate-spin' : ''}`} />Verify</Button>
            <Button size="sm" disabled={actionLoading !== null} onClick={() => void handleReconnect()} className="gap-1.5 bg-stone-900 text-xs text-white hover:bg-stone-800"><KeyRound className="h-3.5 w-3.5" />Reconnect</Button>
          </div>
          {reconnectLink && (
            <div className="rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-700">
              <p className="mb-2">Verified VowOS reconnect route:</p>
              <div className="flex items-start gap-2"><code className="min-w-0 flex-1 break-all rounded bg-stone-50 p-2 text-[10px]">{reconnectLink}</code><Button variant="outline" size="sm" onClick={() => void copy(reconnectLink, 'reconnect')}>{copiedField === 'reconnect' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</Button></div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
