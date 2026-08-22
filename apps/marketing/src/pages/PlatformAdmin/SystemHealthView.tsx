import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Loader2, MinusCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { measurePlatformHealth, type PlatformHealthCheck } from '@/lib/platform/platformHealthService';

const TONE: Record<string, { chip: string; icon: JSX.Element; label: string }> = {
  OPERATIONAL: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, label: 'Operational' },
  DEGRADED: { chip: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, label: 'Degraded' },
  PARTIAL_OUTAGE: { chip: 'bg-rose-50 text-rose-700 border-rose-200', icon: <AlertTriangle className="h-4 w-4 text-rose-500" />, label: 'Partial outage' },
  UNKNOWN: { chip: 'bg-stone-50 text-stone-600 border-stone-200', icon: <MinusCircle className="h-4 w-4 text-stone-400" />, label: 'Unknown' },
};

export default function SystemHealthView() {
  const [checks, setChecks] = useState<PlatformHealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChecks(await measurePlatformHealth());
    } catch (err: any) {
      setChecks([]);
      setError(err?.message || 'Health checks could not run.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const worst = useMemo(() => checks.some((check) => check.status === 'PARTIAL_OUTAGE')
    ? 'PARTIAL_OUTAGE'
    : checks.some((check) => check.status === 'DEGRADED')
      ? 'DEGRADED'
      : checks.some((check) => check.status === 'UNKNOWN')
        ? 'UNKNOWN'
        : checks.length ? 'OPERATIONAL' : 'UNKNOWN', [checks]);
  const affected = checks.reduce((sum, check) => sum + check.affectedOrgs, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-xl font-serif text-stone-800">System Health</h2><p className="text-sm text-stone-500">Measured liveness and readiness checks. Unknown is shown instead of inventing a green status.</p></div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      {loading && checks.length === 0 ? (
        <Card><CardContent className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></CardContent></Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-5"><div><p className="font-medium text-red-900">Health checks failed</p><p className="text-sm text-red-700">{error}</p></div><Button variant="outline" onClick={() => void refresh()}>Retry</Button></CardContent></Card>
      ) : (
        <>
          <Card className={`shadow-xs border ${TONE[worst].chip}`}>
            <CardContent className="flex items-center gap-3 p-4">
              {TONE[worst].icon}
              <div><p className="text-sm font-semibold">{worst === 'OPERATIONAL' ? 'All measured systems operational' : `Platform ${TONE[worst].label.toLowerCase()}`}</p><p className="text-xs opacity-80">{checks.length} measured checks · {affected} organization{affected === 1 ? '' : 's'} affected</p></div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {checks.map((check) => {
              const tone = TONE[check.status] ?? TONE.UNKNOWN;
              return (
                <Card key={check.name} className="shadow-xs border-stone-200/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-stone-800">{check.name}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}>{tone.label}</span></div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div><dt className="text-stone-400">Latency</dt><dd className="font-semibold text-stone-800">{check.latencyMs >= 1000 ? `${(check.latencyMs / 1000).toFixed(1)}s` : `${check.latencyMs}ms`}</dd></div>
                      <div><dt className="text-stone-400">Failures</dt><dd className={`font-semibold ${check.failureRate > 0 ? 'text-rose-600' : 'text-stone-800'}`}>{(check.failureRate * 100).toFixed(0)}%</dd></div>
                      <div><dt className="text-stone-400">Orgs hit</dt><dd className={`font-semibold ${check.affectedOrgs > 0 ? 'text-amber-700' : 'text-stone-800'}`}>{check.affectedOrgs}</dd></div>
                    </dl>
                    <p className="mt-3 text-xs text-stone-600">{check.detail || 'No additional diagnostic detail.'}</p>
                    <p className="mt-2 text-[11px] text-stone-400">Last checked {new Date(check.lastCheck).toLocaleTimeString()}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {checks.length === 0 && !loading && !error && <Card><CardContent className="flex flex-col items-center justify-center p-12 text-center"><Activity className="mb-3 h-8 w-8 text-stone-300" /><p className="text-sm text-stone-600">No health checks are configured.</p></CardContent></Card>}
    </div>
  );
}
