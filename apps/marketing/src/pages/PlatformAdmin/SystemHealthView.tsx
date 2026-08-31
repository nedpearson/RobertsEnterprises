import { useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle2, MinusCircle, RotateCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSystemHealth } from '@/lib/platform/platformDataSource';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner } from '@/components/platform/PlatformStates';

const TONE: Record<string, { chip: string; icon: JSX.Element; label: string }> = {
  OPERATIONAL: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: 'Operational',
  },
  DEGRADED: {
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    label: 'Degraded',
  },
  PARTIAL_OUTAGE: {
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
    label: 'Partial outage',
  },
  UNKNOWN: {
    chip: 'bg-stone-50 text-stone-600 border-stone-200',
    icon: <MinusCircle className="h-4 w-4 text-stone-400" />,
    label: 'Unknown',
  },
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export default function SystemHealthView() {
  const { data: checks, error, refetch } = usePlatformData(useCallback(() => getSystemHealth(), []));

  const worst = checks.some((check) => check.status === 'PARTIAL_OUTAGE')
    ? 'PARTIAL_OUTAGE'
    : checks.some((check) => check.status === 'DEGRADED')
      ? 'DEGRADED'
      : checks.some((check) => check.status === 'UNKNOWN')
        ? 'UNKNOWN'
        : checks.length
          ? 'OPERATIONAL'
          : 'UNKNOWN';
  const affected = checks.reduce((sum, check) => sum + (finiteNumber(check.affectedOrgs) ?? 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PlatformDemoBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif text-stone-800">System Health</h2>
          <p className="text-sm text-stone-500">Evidence-based platform liveness and readiness monitoring.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
          <RotateCw className="h-3.5 w-3.5" /> Refresh Health Checks
        </Button>
      </div>

      {checks.length > 0 && (
        <Card className={`border shadow-xs ${TONE[worst]?.chip || TONE.UNKNOWN.chip}`}>
          <CardContent className="flex items-center gap-3 p-4">
            {TONE[worst]?.icon || TONE.UNKNOWN.icon}
            <div>
              <p className="text-sm font-semibold">
                {worst === 'OPERATIONAL'
                  ? 'All observed systems operational'
                  : worst === 'UNKNOWN'
                    ? 'Some system health is not yet verified'
                    : `Platform ${TONE[worst]?.label.toLowerCase() || 'monitoring'}`}
              </p>
              <p className="text-xs opacity-80">{checks.length} observed checks · {affected} organization{affected === 1 ? '' : 's'} affected</p>
            </div>
          </CardContent>
        </Card>
      )}

      {checks.length === 0 ? (
        <Card className="border-stone-200/60 shadow-xs">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-stone-500">
            <Activity className="mb-4 h-8 w-8 text-stone-300" />
            <p className="text-sm font-medium text-stone-700">Health telemetry unavailable</p>
            <p className="mx-auto mt-1 max-w-lg text-xs">{error ?? 'No verified health observations are available yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => {
            const tone = TONE[check.status] ?? TONE.UNKNOWN;
            const latency = finiteNumber(check.latencyMs);
            const failureRate = finiteNumber(check.failureRate);
            const affectedOrgs = finiteNumber(check.affectedOrgs);
            const lastCheck = typeof check.lastCheck === 'string' && check.lastCheck ? check.lastCheck : null;
            return (
              <Card key={check.name} className="border-stone-200/60 shadow-xs">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-stone-800">{check.name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}>{tone.label}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-stone-400">Latency</dt>
                      <dd className="font-semibold text-stone-800">{latency === null ? '—' : latency >= 1000 ? `${(latency / 1000).toFixed(1)}s` : `${latency}ms`}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Failures</dt>
                      <dd className={`font-semibold ${failureRate !== null && failureRate > 0.01 ? 'text-rose-600' : 'text-stone-800'}`}>{failureRate === null ? '—' : `${(failureRate * 100).toFixed(1)}%`}</dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Orgs hit</dt>
                      <dd className={`font-semibold ${affectedOrgs !== null && affectedOrgs > 0 ? 'text-amber-700' : 'text-stone-800'}`}>{affectedOrgs ?? '—'}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[11px] text-stone-400">{lastCheck ? `Last observed ${new Date(lastCheck).toLocaleString()}` : 'Not yet verified'}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
