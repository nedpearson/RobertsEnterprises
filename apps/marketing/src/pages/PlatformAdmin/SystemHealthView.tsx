import { Card, CardContent } from '@/components/ui/card';
import { Activity, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import { useCallback } from 'react';
import { getSystemHealth } from '@/lib/platform/platformDataSource';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner } from '@/components/platform/PlatformStates';

const TONE: Record<string, { chip: string; icon: JSX.Element; label: string }> = {
  OPERATIONAL: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, label: 'Operational',
  },
  DEGRADED: {
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, label: 'Degraded',
  },
  PARTIAL_OUTAGE: {
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <AlertTriangle className="h-4 w-4 text-rose-500" />, label: 'Partial outage',
  },
  UNKNOWN: {
    chip: 'bg-stone-50 text-stone-600 border-stone-200',
    icon: <MinusCircle className="h-4 w-4 text-stone-400" />, label: 'Unknown',
  },
};

export default function SystemHealthView() {
  const { data: checks, error } = usePlatformData(useCallback(() => getSystemHealth(), []));

  const worst = checks.some((c) => c.status === 'PARTIAL_OUTAGE')
    ? 'PARTIAL_OUTAGE'
    : checks.some((c) => c.status === 'DEGRADED')
      ? 'DEGRADED'
      : checks.length ? 'OPERATIONAL' : 'UNKNOWN';
  const affected = checks.reduce((s, c) => s + c.affectedOrgs, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PlatformDemoBanner />
      <div>
        <h2 className="text-xl font-serif text-stone-800">System Health</h2>
        <p className="text-sm text-stone-500">Global platform liveness and readiness monitoring.</p>
      </div>

      {checks.length > 0 && (
        <Card className={`shadow-xs border ${TONE[worst].chip}`}>
          <CardContent className="flex items-center gap-3 p-4">
            {TONE[worst].icon}
            <div>
              <p className="text-sm font-semibold">
                {worst === 'OPERATIONAL' ? 'All systems operational' : `Platform ${TONE[worst].label.toLowerCase()}`}
              </p>
              <p className="text-xs opacity-80">
                {checks.length} checks · {affected} organization{affected === 1 ? '' : 's'} affected
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {checks.length === 0 ? (
        <Card className="shadow-xs border-stone-200/60">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-stone-500">
            <Activity className="mb-4 h-8 w-8 text-stone-300" />
            <p className="text-sm font-medium text-stone-700">Health monitoring not wired</p>
            <p className="mx-auto mt-1 max-w-lg text-xs">
              {error ?? 'Real-time telemetry will be available when /api/platform/health is deployed.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {checks.map((c) => {
            const tone = TONE[c.status] ?? TONE.UNKNOWN;
            return (
              <Card key={c.name} className="shadow-xs border-stone-200/60">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-stone-800">{c.name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}>
                      {tone.label}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-stone-400">Latency</dt>
                      <dd className="font-semibold text-stone-800">
                        {c.latencyMs >= 1000 ? `${(c.latencyMs / 1000).toFixed(1)}s` : `${c.latencyMs}ms`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Failures</dt>
                      <dd className={`font-semibold ${c.failureRate > 0.01 ? 'text-rose-600' : 'text-stone-800'}`}>
                        {(c.failureRate * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-400">Orgs hit</dt>
                      <dd className={`font-semibold ${c.affectedOrgs > 0 ? 'text-amber-700' : 'text-stone-800'}`}>
                        {c.affectedOrgs}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[11px] text-stone-400">
                    Last checked {new Date(c.lastCheck).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
