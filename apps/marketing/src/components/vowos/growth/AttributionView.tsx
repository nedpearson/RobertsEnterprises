import { useMemo, useState } from 'react';
import { Target, Route, Info, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';
import { useGrowthSummary, useTouchpoints } from '@/lib/growth/useGrowth';

const fmtCents = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

/**
 * Marketing Attribution.
 *
 * Shows first-touch and last-touch side by side rather than picking one and
 * presenting it as "the" answer. Where they disagree is the actionable signal:
 * a channel that opens journeys but never closes them is a discovery channel,
 * not a failing one, and cutting it because last-touch looks weak is the classic
 * expensive mistake.
 *
 * Revenue figures come from the same last-touch rollup as Growth Overview, so
 * the two tabs can never disagree.
 */
export function AttributionView() {
  const [rangeDays, setRangeDays] = useState(30);
  const { data: summary, loading } = useGrowthSummary(rangeDays);
  const { data: touchpoints } = useTouchpoints(rangeDays);

  const model = useMemo(() => {
    const first = new Map<string, Set<string>>();
    const last = new Map<string, Set<string>>();
    const firstByEntity = new Map<string, { channel: string; at: string }>();
    const lastByEntity = new Map<string, { channel: string; at: string }>();

    for (const t of touchpoints) {
      const entity = t.lead_id ?? t.customer_id;
      if (!entity) continue;
      const f = firstByEntity.get(entity);
      if (!f || new Date(t.occurred_at) < new Date(f.at)) {
        firstByEntity.set(entity, { channel: t.channel, at: t.occurred_at });
      }
      const l = lastByEntity.get(entity);
      if (!l || new Date(t.occurred_at) > new Date(l.at)) {
        lastByEntity.set(entity, { channel: t.channel, at: t.occurred_at });
      }
    }

    for (const [entity, v] of firstByEntity) {
      if (!first.has(v.channel)) first.set(v.channel, new Set());
      first.get(v.channel)!.add(entity);
    }
    for (const [entity, v] of lastByEntity) {
      if (!last.has(v.channel)) last.set(v.channel, new Set());
      last.get(v.channel)!.add(entity);
    }

    const channels = [...new Set([...first.keys(), ...last.keys()])];
    return channels
      .map((channel) => {
        const firstCount = first.get(channel)?.size ?? 0;
        const lastCount = last.get(channel)?.size ?? 0;
        return {
          channel,
          firstCount,
          lastCount,
          // Positive = opens more journeys than it closes (discovery).
          delta: firstCount - lastCount,
        };
      })
      .sort((a, b) => b.firstCount + b.lastCount - (a.firstCount + a.lastCount));
  }, [touchpoints]);

  const maxCount = Math.max(1, ...model.map((m) => Math.max(m.firstCount, m.lastCount)));
  const journeyLengths = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of touchpoints) {
      const entity = t.lead_id ?? t.customer_id;
      if (entity) counts.set(entity, (counts.get(entity) ?? 0) + 1);
    }
    const values = [...counts.values()];
    if (!values.length) return null;
    return {
      entities: values.length,
      avgTouches: values.reduce((a, b) => a + b, 0) / values.length,
      multiTouchPct: (values.filter((v) => v > 1).length / values.length) * 100,
    };
  }, [touchpoints]);

  return (
    <div className="space-y-6" data-tour-id="attribution">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Marketing Attribution</h1>
          <p className="mt-1 text-sm text-stone-500">
            Which channels start bridal journeys, and which ones finish them.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
          {RANGES.map((r) => (
            <button
              key={r.days}
              data-tour-id={`attribution-range-${r.days}`}
              onClick={() => setRangeDays(r.days)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                rangeDays === r.days ? 'bg-brand-primary text-white' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-tour-id="attribution-kpis">
        {[
          { label: 'Attributed revenue', value: summary ? fmtCents(summary.attributedRevenueCents) : '—' },
          { label: 'Marketing spend', value: summary ? fmtCents(summary.totalSpendCents) : '—' },
          { label: 'Tracked journeys', value: journeyLengths ? String(journeyLengths.entities) : '0' },
          {
            label: 'Multi-touch journeys',
            value: journeyLengths ? `${journeyLengths.multiTouchPct.toFixed(0)}%` : '—',
          },
        ].map((tile) => (
          <Card key={tile.label} className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{tile.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-4 w-4 text-stone-400" /> First touch vs last touch
          </CardTitle>
          <CardDescription>
            A channel that opens far more journeys than it closes is doing discovery work. Judge it on assists, not on
            last-touch revenue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-stone-500">Loading attribution…</p>
          ) : model.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-8 text-center" data-tour-id="attribution-empty">
              <Target className="mx-auto h-6 w-6 text-stone-400" />
              <p className="mt-2 text-sm font-semibold text-stone-800">No tracked touchpoints yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
                Attribution starts recording as soon as leads arrive with campaign parameters on the booking and
                enquiry forms.
              </p>
            </div>
          ) : (
            <div className="space-y-4" data-tour-id="attribution-model">
              {model.map((row) => (
                <div key={row.channel}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-900">{row.channel}</span>
                    <span className="tabular-nums text-stone-500">
                      {row.firstCount} first · {row.lastCount} last
                      {row.delta > 0 && <span className="ml-2 text-brand-primary">opens {row.delta} more</span>}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-stone-400">First</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-brand-primary/50"
                          style={{ width: `${(row.firstCount / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-stone-400">Last</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-brand-primary"
                          style={{ width: `${(row.lastCount / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {summary && summary.channels.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-stone-400" /> Return by channel
            </CardTitle>
            <CardDescription>
              Last-touch revenue against spend. Identical numbers to Growth Overview — one rollup, two views.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-tour-id="attribution-return-table">
                <thead>
                  <tr className="border-y border-stone-200 bg-stone-50/80 text-left text-xs uppercase tracking-wider text-stone-500">
                    <th className="px-6 py-3 font-semibold">Channel</th>
                    <th className="px-4 py-3 text-right font-semibold">Spend</th>
                    <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                    <th className="px-6 py-3 text-right font-semibold">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.channels.map((c) => (
                    <tr key={c.channel} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                      <td className="px-6 py-2.5 font-medium text-stone-900">{c.channel}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">
                        {c.spendCents ? fmtCents(c.spendCents) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-900">{fmtCents(c.revenueCents)}</td>
                      <td
                        className={`px-6 py-2.5 text-right tabular-nums font-semibold ${
                          c.roas === null ? 'text-stone-400' : c.roas >= 1 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {c.roas === null ? '—' : `${c.roas.toFixed(2)}x`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50/60 p-4 text-xs text-stone-600">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
        <p>
          Revenue is attributed last-touch and counts only money actually collected. Multi-touch weighting needs
          cross-session identity stitching, which requires the analytics and ads connections to be live — until then a
          weighted model would look more precise without being more accurate.
        </p>
      </div>
    </div>
  );
}
