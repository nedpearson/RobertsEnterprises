import { useMemo } from 'react';
import { Search, Gauge, AlertTriangle, CheckCircle2, ArrowUpRight, FileWarning } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';
import { useSearchMetrics, useSeoAudit } from '@/lib/growth/useGrowth';

/** Core Web Vitals thresholds, per Google's published "good / needs improvement" bands. */
const VITALS = {
  lcp: { good: 2500, poor: 4000, unit: 'ms', label: 'LCP' },
  inp: { good: 200, poor: 500, unit: 'ms', label: 'INP' },
  cls: { good: 0.1, poor: 0.25, unit: '', label: 'CLS' },
};

const band = (value: number | null, key: keyof typeof VITALS): 'good' | 'needs' | 'poor' | 'unknown' => {
  if (value === null) return 'unknown';
  const t = VITALS[key];
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs';
  return 'poor';
};

const BAND_STYLE: Record<string, string> = {
  good: 'text-emerald-700',
  needs: 'text-amber-600',
  poor: 'text-rose-600',
  unknown: 'text-stone-400',
};

/**
 * Technical SEO Health.
 *
 * Two independent data sources, deliberately kept visually separate because they
 * answer different questions: Search Console says how you *rank*, PageSpeed says
 * how the pages *perform*. Conflating them into one score hides which to fix.
 */
export function SearchConsoleView() {
  const { data: metrics, loading: metricsLoading } = useSearchMetrics(28);
  const { data: seo, loading: auditLoading } = useSeoAudit();

  const queryRollup = useMemo(() => {
    const byQuery = new Map<string, { query: string; clicks: number; impressions: number; positionSum: number; n: number }>();
    for (const m of metrics) {
      if (!m.query) continue;
      const row = byQuery.get(m.query) ?? { query: m.query, clicks: 0, impressions: 0, positionSum: 0, n: 0 };
      row.clicks += m.clicks;
      row.impressions += m.impressions;
      if (m.position !== null) {
        row.positionSum += m.position;
        row.n += 1;
      }
      byQuery.set(m.query, row);
    }
    return [...byQuery.values()]
      .map((r) => ({
        query: r.query,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
        position: r.n > 0 ? r.positionSum / r.n : null,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [metrics]);

  const totals = useMemo(
    () => ({
      clicks: queryRollup.reduce((s, r) => s + r.clicks, 0),
      impressions: queryRollup.reduce((s, r) => s + r.impressions, 0),
    }),
    [queryRollup],
  );

  /** Queries ranking 5–20 with real impressions: the cheapest wins available. */
  const strikingDistance = useMemo(
    () => queryRollup.filter((r) => r.position !== null && r.position > 4 && r.position <= 20 && r.impressions > 100).slice(0, 5),
    [queryRollup],
  );

  const allIssues = useMemo(
    () => seo.pages.flatMap((p) => (p.issues ?? []).map((i) => ({ ...i, url: p.url }))),
    [seo.pages],
  );

  return (
    <div className="space-y-6" data-tour-id="technical-seo">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Technical SEO Health</h1>
        <p className="mt-1 text-sm text-stone-500">
          Search Console shows how you rank. PageSpeed shows how your pages perform. Both are tracked separately.
        </p>
      </div>

      {/* Search performance */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-stone-400" /> Search performance
          </CardTitle>
          <CardDescription>Last 28 days from Google Search Console. Data lags roughly two days.</CardDescription>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <p className="text-sm text-stone-500">Loading search metrics…</p>
          ) : queryRollup.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-8 text-center" data-tour-id="search-empty">
              <Search className="mx-auto h-6 w-6 text-stone-400" />
              <p className="mt-2 text-sm font-semibold text-stone-800">Search Console not connected</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
                Connect Search Console to see which queries bring brides to your site. No Google approval is required
                for this one.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4" data-tour-id="search-totals">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Clicks</p>
                  <p className="text-2xl font-bold tabular-nums text-stone-900">{totals.clicks.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Impressions</p>
                  <p className="text-2xl font-bold tabular-nums text-stone-900">{totals.impressions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Avg CTR</p>
                  <p className="text-2xl font-bold tabular-nums text-stone-900">
                    {totals.impressions ? `${((totals.clicks / totals.impressions) * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Queries</p>
                  <p className="text-2xl font-bold tabular-nums text-stone-900">{queryRollup.length}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-tour-id="search-query-table">
                  <thead>
                    <tr className="border-y border-stone-200 bg-stone-50/80 text-left text-xs uppercase tracking-wider text-stone-500">
                      <th className="px-4 py-3 font-semibold">Query</th>
                      <th className="px-4 py-3 text-right font-semibold">Clicks</th>
                      <th className="px-4 py-3 text-right font-semibold">Impr.</th>
                      <th className="px-4 py-3 text-right font-semibold">CTR</th>
                      <th className="px-4 py-3 text-right font-semibold">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryRollup.slice(0, 15).map((r) => (
                      <tr key={r.query} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                        <td className="px-4 py-2.5 font-medium text-stone-900">{r.query}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">{r.clicks}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">{r.impressions.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">{(r.ctr * 100).toFixed(1)}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-stone-900">
                          {r.position?.toFixed(1) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {strikingDistance.length > 0 && (
                <div className="mt-5 rounded-xl border border-brand-primary/20 bg-brand-soft/30 p-4" data-tour-id="striking-distance">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                    <ArrowUpRight className="h-4 w-4 text-brand-primary" /> Striking distance
                  </p>
                  <p className="mt-0.5 text-xs text-stone-600">
                    Ranking 5–20 with real impression volume — the cheapest ranking wins available to you.
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-stone-700">
                    {strikingDistance.map((r) => (
                      <li key={r.query} className="flex justify-between gap-4">
                        <span className="truncate">{r.query}</span>
                        <span className="shrink-0 tabular-nums text-stone-500">
                          pos {r.position?.toFixed(1)} · {r.impressions.toLocaleString()} impr.
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-stone-400" /> Page performance
              </CardTitle>
              <CardDescription>
                {seo.audit
                  ? `Last audit ${new Date(seo.audit.started_at).toLocaleDateString()} · ${seo.audit.pages_crawled} pages`
                  : 'No audit has been run yet.'}
              </CardDescription>
            </div>
            {seo.audit?.overall_score !== null && seo.audit?.overall_score !== undefined && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Overall</p>
                <p
                  data-tour-id="seo-overall-score"
                  className={`text-2xl font-bold tabular-nums ${
                    seo.audit.overall_score >= 90 ? 'text-emerald-700' : seo.audit.overall_score >= 50 ? 'text-amber-600' : 'text-rose-600'
                  }`}
                >
                  {seo.audit.overall_score}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {auditLoading ? (
            <p className="text-sm text-stone-500">Loading audit…</p>
          ) : !seo.audit ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-8 text-center" data-tour-id="seo-empty">
              <Gauge className="mx-auto h-6 w-6 text-stone-400" />
              <p className="mt-2 text-sm font-semibold text-stone-800">No audit yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
                Run a PageSpeed audit to capture Core Web Vitals for your key pages.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-tour-id="seo-page-table">
                <thead>
                  <tr className="border-y border-stone-200 bg-stone-50/80 text-left text-xs uppercase tracking-wider text-stone-500">
                    <th className="px-4 py-3 font-semibold">Page</th>
                    <th className="px-4 py-3 text-right font-semibold">Perf</th>
                    <th className="px-4 py-3 text-right font-semibold">SEO</th>
                    <th className="px-4 py-3 text-right font-semibold">LCP</th>
                    <th className="px-4 py-3 text-right font-semibold">CLS</th>
                    <th className="px-4 py-3 text-right font-semibold">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {seo.pages.map((p) => (
                    <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                      <td className="px-4 py-2.5 font-medium text-stone-900">{p.url}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">{p.performance_score ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">{p.seo_score ?? '—'}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${BAND_STYLE[band(p.lcp_ms, 'lcp')]}`}>
                        {p.lcp_ms !== null ? `${(p.lcp_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${BAND_STYLE[band(p.cls, 'cls')]}`}>
                        {p.cls ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-700">{p.issues?.length ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {allIssues.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-stone-400" /> Issues to fix ({allIssues.length})
            </CardTitle>
            <CardDescription>Highest severity first — these are the changes that move the score.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2" data-tour-id="seo-issues">
              {[...allIssues]
                .sort((a, b) => (a.severity === 'high' ? -1 : 1) - (b.severity === 'high' ? -1 : 1))
                .map((issue, i) => (
                  <li
                    key={`${issue.url}-${issue.code}-${i}`}
                    className="flex items-start gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    {issue.severity === 'high' ? (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                    <span className="text-stone-700">
                      <span className="font-medium text-stone-900">{issue.url}</span> — {issue.message}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
