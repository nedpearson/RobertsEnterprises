import { useMemo, useState } from 'react';
import {
  Megaphone,
  Target,
  DollarSign,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Download,
  AlertCircle,
  PlugZap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';
import { useGrowthSummary, useGrowthConnections, useReviews, useLocalListings } from '@/lib/growth/useGrowth';
import { GrowthConnectionsPanel } from './GrowthConnectionsPanel';
import type { ChannelPerformance } from '@/lib/growth/types';
import { ViewKey } from '../Sidebar';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';

const RANGES: Array<{ label: string; days: number }> = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'This Quarter', days: 90 },
  { label: 'Year to Date', days: 365 },
];

const fmtCents = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtRoas = (roas: number | null) => (roas === null ? '—' : `${roas.toFixed(2)}x`);

function KpiCard({
  label,
  value,
  sub,
  icon,
  trend,
  tourId,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | null;
  tourId: string;
}) {
  return (
    <Card data-tour-id={tourId} className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="rounded-xl bg-brand-soft/60 p-2 text-brand-primary">{icon}</div>
          {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-600" />}
          {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-rose-600" />}
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-stone-900">{value}</p>
        <p className="mt-1 text-xs text-stone-500">{sub}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Growth Overview.
 *
 * Reference implementation for the Growth section: every number below is derived
 * from the growth_* tables plus the operational data already in
 * VowosDataContext. Nothing here is hardcoded — if a tenant has no ad spend and
 * no tracked touchpoints, this renders an explicit empty state rather than
 * inventing figures.
 */
export function GrowthOverview({ onNavigate: onNavigateProp }: { onNavigate?: (view: ViewKey) => void } = {}) {
  // GrowthWorkspace mounts this with no handler, which made every CTA a no-op.
  const { navigateToView } = useApplicationRoute();
  const onNavigate = onNavigateProp ?? navigateToView;
  const [rangeDays, setRangeDays] = useState(30);
  const { data: summary, loading, error } = useGrowthSummary(rangeDays);
  const { data: connections } = useGrowthConnections();
  const { data: needsReply } = useReviews('needs_reply');
  const { data: listings } = useLocalListings();

  const disconnected = useMemo(
    () => connections.filter((c) => c.status !== 'connected').map((c) => c.provider),
    [connections],
  );

  /** Actionable recommendations, derived from live signals — not a static list. */
  const recommendations = useMemo(() => {
    const out: Array<{ tag: string; title: string; detail: string; view?: ViewKey; tab?: string }> = [];

    if (needsReply.length > 0) {
      out.push({
        tag: 'Reputation',
        title: `Respond to ${needsReply.length} unanswered review${needsReply.length === 1 ? '' : 's'}`,
        detail: `${needsReply.length} Google review${needsReply.length === 1 ? '' : 's'} currently await response.`,
        view: 'growth',
        tab: 'reviews',
      });
    }

    const listingIssues = listings.flatMap((l) => l.issues ?? []);
    const highIssue = listingIssues.find((i) => i.severity === 'high') ?? listingIssues[0];
    if (highIssue) {
      out.push({
        tag: 'Local SEO',
        title: highIssue.message,
        detail: `Google Business Profile completeness is ${listings[0]?.completeness_score ?? 0}%.`,
        view: 'growth',
        tab: 'google',
      });
    }

    if (summary && summary.channels.length > 1) {
      const withRoas = summary.channels.filter((c) => c.roas !== null && c.spendCents > 0);
      if (withRoas.length > 1) {
        const best = withRoas.reduce((a, b) => ((a.roas ?? 0) > (b.roas ?? 0) ? a : b));
        const worst = withRoas.reduce((a, b) => ((a.roas ?? 0) < (b.roas ?? 0) ? a : b));
        if (best.channel !== worst.channel && (best.roas ?? 0) > (worst.roas ?? 0) * 1.3) {
          out.push({
            tag: 'Budget',
            title: `Shift spend from ${worst.channel} to ${best.channel}`,
            detail: `${best.channel} is returning ${fmtRoas(best.roas)} against ${worst.channel} at ${fmtRoas(worst.roas)} over the last ${rangeDays} days.`,
            view: 'growth',
            tab: 'attribution',
          });
        }
      }
    }

    if (disconnected.length > 0) {
      out.push({
        tag: 'Setup',
        title: `Connect ${disconnected.length} remaining data source${disconnected.length === 1 ? '' : 's'}`,
        detail: `Attribution stays incomplete until ${disconnected.join(', ').replace(/_/g, ' ')} ${disconnected.length === 1 ? 'is' : 'are'} connected.`,
        view: 'growth',
      });
    }

    return out.slice(0, 4);
  }, [needsReply, listings, summary, disconnected, rangeDays]);

  return (
    <div className="space-y-6" data-tour-id="growth-overview">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Growth &amp; Marketing Overview</h1>
          <p className="mt-1 text-sm text-stone-500">
            End-to-end attribution from first search click to final gown revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Reporting period"
            data-tour-id="growth-range"
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
          >
            {RANGES.map((r) => (
              <option key={r.days} value={r.days}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => navigateToView('reports', { tab: 'marketing' })}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            <Download className="h-4 w-4" />
            Open Marketing Report
          </button>
        </div>
      </div>

      {error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-semibold text-rose-900">Growth data could not be loaded</p>
              <p className="mt-0.5 text-xs text-rose-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations, derived from live signals */}
      <Card className="relative overflow-hidden border-brand-primary/20 bg-brand-soft/30 shadow-sm">
        <div className="pointer-events-none absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-brand-primary/5 blur-3xl" />
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-primary/20 bg-white shadow-sm">
                <Sparkles className="h-6 w-6 text-brand-primary" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-bold text-stone-900">Growth Recommendations</h3>
              <p className="text-sm text-stone-600">
                Derived from your reviews, Google profile, and channel performance over the last {rangeDays} days.
              </p>

              {recommendations.length === 0 ? (
                <p className="pt-2 text-sm text-stone-500">
                  {loading ? 'Analyzing your growth data…' : 'No actions outstanding. Everything tracked is healthy.'}
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 pt-2 md:grid-cols-2" data-tour-id="growth-recommendations">
                  {recommendations.map((rec) => (
                    <button
                      key={rec.title}
                      onClick={() => rec.view && (rec.tab ? navigateToView(rec.view, { tab: rec.tab }) : onNavigate(rec.view))}
                      disabled={!rec.view}
                      className="group rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand-primary/40 hover:shadow-md disabled:cursor-default disabled:hover:border-stone-200 disabled:hover:shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">{rec.tag}</span>
                        {rec.view && (
                          <ArrowUpRight className="h-4 w-4 text-stone-400 group-hover:text-brand-primary" />
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-stone-900">{rec.title}</h4>
                      <p className="mt-1 text-xs text-stone-500">{rec.detail}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI ribbon */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          tourId="growth-kpi-spend"
          label="Marketing Spend"
          value={loading || !summary ? '—' : fmtCents(summary.totalSpendCents)}
          sub={`Across ${summary?.channels.length ?? 0} channels`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KpiCard
          tourId="growth-kpi-revenue"
          label="Attributed Revenue"
          value={loading || !summary ? '—' : fmtCents(summary.attributedRevenueCents)}
          sub="Last-touch, collected only"
          icon={<TrendingUp className="h-5 w-5" />}
          trend={summary && summary.attributedRevenueCents > summary.totalSpendCents ? 'up' : null}
        />
        <KpiCard
          tourId="growth-kpi-roas"
          label="Blended ROAS"
          value={loading || !summary ? '—' : fmtRoas(summary.blendedRoas)}
          sub={summary?.blendedCacCents ? `${fmtCents(summary.blendedCacCents)} per lead` : 'No spend recorded'}
          icon={<Target className="h-5 w-5" />}
        />
        <KpiCard
          tourId="growth-kpi-leads"
          label="Attributed Leads"
          value={loading || !summary ? '—' : String(summary.leads)}
          sub={`${summary?.bookedAppointments ?? 0} became appointments`}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <GrowthConnectionsPanel />

      {/* Channel table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
          <CardDescription>
            Last-touch attribution against revenue actually collected. Channels with no spend are organic.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-6 pb-6 text-sm text-stone-500">Loading channel performance…</p>
          ) : !summary || summary.isEmpty ? (
            <div className="px-6 pb-6" data-tour-id="growth-empty">
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-6 text-center">
                <PlugZap className="mx-auto h-6 w-6 text-stone-400" />
                <p className="mt-2 text-sm font-semibold text-stone-800">No marketing data yet</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
                  Connect an ad account or record spend to see channel performance. Attribution begins tracking as soon
                  as leads arrive with campaign parameters.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-tour-id="growth-channel-table">
                <thead>
                  <tr className="border-y border-stone-200 bg-stone-50/80 text-left text-xs uppercase tracking-wider text-stone-500">
                    <th className="px-6 py-3 font-semibold">Channel</th>
                    <th className="px-4 py-3 text-right font-semibold">Spend</th>
                    <th className="px-4 py-3 text-right font-semibold">Leads</th>
                    <th className="px-4 py-3 text-right font-semibold">Appts</th>
                    <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                    <th className="px-4 py-3 text-right font-semibold">ROAS</th>
                    <th className="px-6 py-3 text-right font-semibold">Cost / Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.channels.map((c: ChannelPerformance) => (
                    <tr key={c.channel} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                      <td className="px-6 py-3 font-medium text-stone-900">
                        <span className="flex items-center gap-2">
                          <Megaphone className="h-3.5 w-3.5 text-stone-400" />
                          {c.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                        {c.spendCents ? fmtCents(c.spendCents) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">{c.leads}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700">{c.appointments}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-stone-900">
                        {fmtCents(c.revenueCents)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums font-semibold ${
                          c.roas === null ? 'text-stone-400' : c.roas >= 1 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {fmtRoas(c.roas)}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-stone-700">
                        {c.cacCents ? fmtCents(c.cacCents) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
