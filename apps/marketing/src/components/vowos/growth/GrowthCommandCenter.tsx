import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  DollarSign,
  Gauge,
  Megaphone,
  MousePointerClick,
  PlugZap,
  RefreshCw,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vowos/design-system';
import { useGrowthConnections, useGrowthSummary } from '@/lib/growth/useGrowth';
import {
  useCampaignPerformance,
  useGrowthAIRecommendations,
  useGrowthDataHealth,
  useMoneyMap,
} from '@/lib/growth/useGrowthIntelligence';
import type { CampaignPerformance, GrowthAIRecommendation } from '@/lib/growth/types';

const RANGES = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'This Quarter', days: 90 },
  { label: 'Year to Date', days: 365 },
];

const money = (cents: number | null | undefined) =>
  typeof cents === 'number'
    ? (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—';

const ratio = (value: number | null | undefined) => (typeof value === 'number' ? `${value.toFixed(2)}x` : '—');
const percent = (value: number | null | undefined) =>
  typeof value === 'number' ? `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%` : '—';

const providerLabel = (provider: string) =>
  provider
    .replace(/^google_/, 'Google ')
    .replace(/^meta_/, 'Meta ')
    .replace(/^tiktok_/, 'TikTok ')
    .replace(/^pinterest_/, 'Pinterest ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

function Kpi({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-stone-900">{value}</p>
            <p className="mt-1 text-xs text-stone-500">{detail}</p>
          </div>
          <div className="rounded-xl bg-brand-soft/60 p-2 text-brand-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ recommendation }: { recommendation: GrowthAIRecommendation }) {
  const expected = recommendation.expected_impact ?? {};
  const impactCents = Number(
    expected.incrementalGrossProfitCents ?? expected.incremental_gross_profit_cents ?? expected.savingsCents ?? 0,
  );

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-primary">
              {recommendation.category}
            </span>
            <span className="text-xs text-stone-500">
              {recommendation.confidence_score === null
                ? 'Confidence pending'
                : `${Math.round(recommendation.confidence_score * 100)}% confidence`}
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-stone-900">{recommendation.title}</h4>
        </div>
        {impactCents !== 0 && (
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Expected impact</p>
            <p className="text-sm font-bold text-emerald-700">{money(impactCents)}</p>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-stone-600">{recommendation.rationale}</p>
      {Array.isArray(recommendation.evidence) && recommendation.evidence.length > 0 && (
        <div className="mt-3 rounded-lg bg-stone-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Evidence</p>
          <ul className="mt-1 space-y-1 text-xs text-stone-600">
            {recommendation.evidence.slice(0, 3).map((item, index) => (
              <li key={index}>• {typeof item === 'string' ? item : JSON.stringify(item)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: CampaignPerformance }) {
  return (
    <tr className="border-b border-stone-100 last:border-0 hover:bg-stone-50/70">
      <td className="px-5 py-3">
        <p className="font-medium text-stone-900">{campaign.name}</p>
        <p className="text-xs text-stone-500">{providerLabel(campaign.provider)} · {campaign.status || 'status unknown'}</p>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{money(campaign.spendCents)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{campaign.leads}</td>
      <td className="px-3 py-3 text-right tabular-nums">{campaign.appointmentsBooked}</td>
      <td className="px-3 py-3 text-right tabular-nums">{campaign.sales}</td>
      <td className="px-3 py-3 text-right tabular-nums font-medium">{money(campaign.revenueCents)}</td>
      <td className="px-3 py-3 text-right tabular-nums font-semibold">{ratio(campaign.roas)}</td>
      <td className="px-5 py-3 text-right tabular-nums">{money(campaign.cacCents)}</td>
    </tr>
  );
}

export function GrowthCommandCenter() {
  const [rangeDays, setRangeDays] = useState(30);
  const summaryState = useGrowthSummary(rangeDays);
  const campaignState = useCampaignPerformance(rangeDays);
  const moneyMapState = useMoneyMap(rangeDays);
  const recommendationState = useGrowthAIRecommendations();
  const healthState = useGrowthDataHealth(rangeDays);
  const connectionState = useGrowthConnections();

  const summary = summaryState.data;
  const campaigns = campaignState.data;
  const moneyMap = moneyMapState.data;
  const totalCampaignSpend = campaigns.reduce((sum, campaign) => sum + campaign.spendCents, 0);
  const totalSpend = totalCampaignSpend > 0 ? totalCampaignSpend : summary?.totalSpendCents ?? 0;
  const totalRevenue = campaigns.length > 0
    ? campaigns.reduce((sum, campaign) => sum + campaign.revenueCents, 0)
    : summary?.attributedRevenueCents ?? 0;
  const totalGrossProfit = campaigns.reduce((sum, campaign) => sum + campaign.grossProfitCents, 0);
  const totalLeads = campaigns.length > 0
    ? campaigns.reduce((sum, campaign) => sum + campaign.leads, 0)
    : summary?.leads ?? 0;
  const totalAppointments = campaigns.length > 0
    ? campaigns.reduce((sum, campaign) => sum + campaign.appointmentsBooked, 0)
    : summary?.bookedAppointments ?? 0;
  const totalAttended = campaigns.reduce((sum, campaign) => sum + campaign.appointmentsAttended, 0);
  const totalSales = campaigns.reduce((sum, campaign) => sum + campaign.sales, 0);
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : summary?.blendedRoas ?? null;
  const trueCac = totalSpend > 0 && totalSales > 0 ? Math.round(totalSpend / totalSales) : null;
  const costPerAppointment = totalSpend > 0 && totalAppointments > 0 ? Math.round(totalSpend / totalAppointments) : null;

  const topWinner = useMemo(
    () => campaigns.filter((c) => c.spendCents > 0 && c.roas !== null).sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0],
    [campaigns],
  );
  const topWaste = useMemo(
    () => campaigns.filter((c) => c.spendCents > 0).sort((a, b) => a.revenueCents / Math.max(1, a.spendCents) - b.revenueCents / Math.max(1, b.spendCents))[0],
    [campaigns],
  );

  const maxChannelSpend = Math.max(1, ...moneyMap.map((row) => row.spendCents));
  const isLoading = summaryState.loading || campaignState.loading;
  const primaryError = summaryState.error || campaignState.error || moneyMapState.error;

  const refreshAll = () => {
    summaryState.refresh();
    campaignState.refresh();
    moneyMapState.refresh();
    recommendationState.refresh();
    healthState.refresh();
    connectionState.refresh();
  };

  return (
    <div className="space-y-6" data-tour-id="growth-command-center">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Marketing Command Center</h1>
            <span className="rounded-full bg-brand-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-primary">
              VowOS Intelligence
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Follow every marketing dollar from platform spend to VowOS-verified appointments, sales and revenue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700"
            value={rangeDays}
            onChange={(event) => setRangeDays(Number(event.target.value))}
            aria-label="Marketing reporting period"
          >
            {RANGES.map((range) => (
              <option key={range.days} value={range.days}>{range.label}</option>
            ))}
          </select>
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {primaryError && (
        <Card className="border-rose-200 bg-rose-50/70">
          <CardContent className="flex gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-semibold text-rose-900">Marketing data needs attention</p>
              <p className="mt-1 text-xs text-rose-700">{primaryError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Marketing Spend" value={isLoading ? '—' : money(totalSpend)} detail="Actual tracked spend" icon={<DollarSign className="h-5 w-5" />} />
        <Kpi label="Attributed Revenue" value={isLoading ? '—' : money(totalRevenue)} detail="VowOS-linked collected revenue" icon={<TrendingUp className="h-5 w-5" />} />
        <Kpi label="ROAS" value={isLoading ? '—' : ratio(blendedRoas)} detail={totalGrossProfit > 0 ? `${money(totalGrossProfit)} tracked gross profit` : 'Revenue return on ad spend'} icon={<Target className="h-5 w-5" />} />
        <Kpi label="True CAC" value={isLoading ? '—' : money(trueCac)} detail={totalSales > 0 ? `${totalSales} VowOS-verified sales` : 'Requires verified sales'} icon={<CircleDollarSign className="h-5 w-5" />} />
        <Kpi label="Leads" value={isLoading ? '—' : totalLeads.toLocaleString()} detail="Attributed marketing leads" icon={<Users className="h-5 w-5" />} />
        <Kpi label="Appointments" value={isLoading ? '—' : totalAppointments.toLocaleString()} detail={costPerAppointment ? `${money(costPerAppointment)} per booked appointment` : 'Bookings linked to marketing'} icon={<MousePointerClick className="h-5 w-5" />} />
        <Kpi label="Attended" value={isLoading ? '—' : totalAttended.toLocaleString()} detail="VowOS-verified attendance" icon={<CheckCircle2 className="h-5 w-5" />} />
        <Kpi label="Marketing Health" value={healthState.loading ? '—' : `${healthState.data.score}%`} detail={`${healthState.data.state.toUpperCase()} · ${connectionState.data.filter((c) => c.status === 'connected').length} sources connected`} icon={<Gauge className="h-5 w-5" />} />
      </div>

      <Card className="overflow-hidden border-brand-primary/20 bg-brand-soft/20 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-primary/20 bg-white shadow-sm">
              <Bot className="h-6 w-6 text-brand-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">VowOS AI — What I Recommend Today</h2>
                  <p className="mt-1 text-sm text-stone-600">Recommendations are tenant-scoped and must be supported by measured data.</p>
                </div>
                {recommendationState.loading && <span className="text-xs text-stone-500">Analyzing…</span>}
              </div>

              {recommendationState.error ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  AI recommendations could not be loaded: {recommendationState.error}
                </div>
              ) : recommendationState.data.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {recommendationState.data.slice(0, 4).map((recommendation) => (
                    <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white/70 p-5">
                  <p className="text-sm font-semibold text-stone-800">No evidence-backed AI action is ready yet.</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">
                    VowOS will not invent a budget recommendation. Connect ad platforms, analytics and conversion tracking, then collect enough qualified outcomes for a defensible recommendation.
                  </p>
                </div>
              )}

              {(topWinner || topWaste) && recommendationState.data.length === 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {topWinner && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Observed winner · not yet an AI action</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-950">{topWinner.name}</p>
                      <p className="mt-1 text-xs text-emerald-800">{ratio(topWinner.roas)} ROAS from {money(topWinner.spendCents)} spend.</p>
                    </div>
                  )}
                  {topWaste && topWaste.campaignId !== topWinner?.campaignId && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Investigate</p>
                      <p className="mt-1 text-sm font-semibold text-amber-950">{topWaste.name}</p>
                      <p className="mt-1 text-xs text-amber-800">{ratio(topWaste.roas)} ROAS from {money(topWaste.spendCents)} spend. Sample size and marginal return must be checked before changing budget.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>Where Your Marketing Money Went</CardTitle>
            <CardDescription>Provider-level spend with downstream VowOS outcomes. Drill into campaigns below.</CardDescription>
          </CardHeader>
          <CardContent>
            {moneyMapState.loading ? (
              <p className="text-sm text-stone-500">Loading spend map…</p>
            ) : moneyMap.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                <Megaphone className="mx-auto h-6 w-6 text-stone-400" />
                <p className="mt-2 text-sm font-semibold text-stone-800">No campaign-level spend has synced yet</p>
                <p className="mt-1 text-xs text-stone-500">Connect Google Ads, Meta Ads or another provider and complete the first sync.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {moneyMap.map((row) => (
                  <div key={row.channel}>
                    <div className="mb-1 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{providerLabel(row.channel)}</p>
                        <p className="text-xs text-stone-500">{row.leads} leads · {row.appointments} appointments · {row.sales} sales</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-stone-900">{money(row.spendCents)}</p>
                        <p className="text-xs text-stone-500">{ratio(row.roas)} ROAS</p>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-brand-primary" style={{ width: `${Math.max(2, (row.spendCents / maxChannelSpend) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Marketing Data Health</CardTitle>
            <CardDescription>Connection, freshness and attribution integrity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold tracking-tight text-stone-900">{healthState.data.score}%</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-stone-500">{healthState.data.state}</p>
              </div>
              <Gauge className="h-8 w-8 text-brand-primary" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-brand-primary" style={{ width: `${healthState.data.score}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-stone-50 p-3">
                <p className="text-stone-500">Connections</p>
                <p className="mt-1 font-bold text-stone-900">{healthState.data.connectionScore}%</p>
              </div>
              <div className="rounded-lg bg-stone-50 p-3">
                <p className="text-stone-500">Freshness</p>
                <p className="mt-1 font-bold text-stone-900">{healthState.data.freshnessScore}%</p>
              </div>
            </div>
            {healthState.data.issues.length > 0 ? (
              <div className="mt-4 space-y-2">
                {healthState.data.issues.slice(0, 4).map((issue) => (
                  <div key={issue.code} className="flex gap-2 rounded-lg border border-stone-200 p-3">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${issue.severity === 'high' ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div>
                      <p className="text-xs font-medium text-stone-800">{issue.message}</p>
                      {issue.action && <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-primary">{issue.action}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> No data-health issues detected.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Full-Funnel Performance</CardTitle>
              <CardDescription>Platform activity compared with VowOS operational outcomes.</CardDescription>
            </div>
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
              Platform conversions are not treated as verified sales
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Clicks', campaigns.reduce((sum, c) => sum + c.clicks, 0), <MousePointerClick key="clicks" className="h-4 w-4" />],
              ['Leads', totalLeads, <Users key="leads" className="h-4 w-4" />],
              ['Booked', totalAppointments, <Target key="booked" className="h-4 w-4" />],
              ['Attended', totalAttended, <CheckCircle2 key="attended" className="h-4 w-4" />],
              ['Sales', totalSales, <ShoppingBag key="sales" className="h-4 w-4" />],
              ['Revenue', money(totalRevenue), <DollarSign key="revenue" className="h-4 w-4" />],
            ].map(([label, value, icon]) => (
              <div key={String(label)} className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
                  {icon}
                </div>
                <p className="mt-2 text-xl font-bold text-stone-900">{String(value)}</p>
              </div>
            ))}
          </div>
          {totalLeads > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-600">
              <span>Lead → appointment: <strong>{percent(totalAppointments / totalLeads)}</strong></span>
              <span>Appointment → attended: <strong>{totalAppointments > 0 ? percent(totalAttended / totalAppointments) : '—'}</strong></span>
              <span>Attended → sale: <strong>{totalAttended > 0 ? percent(totalSales / totalAttended) : '—'}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Campaign Intelligence</CardTitle>
              <CardDescription>Spend, leads, appointments, sales and financial return at campaign level.</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <BarChart3 className="h-4 w-4" /> {campaigns.length} campaigns in selected period
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {campaignState.loading ? (
            <p className="px-6 pb-6 text-sm text-stone-500">Loading campaigns…</p>
          ) : campaigns.length === 0 ? (
            <div className="px-6 pb-6">
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                <PlugZap className="mx-auto h-6 w-6 text-stone-400" />
                <p className="mt-2 text-sm font-semibold text-stone-800">Campaign intelligence is waiting for provider data</p>
                <p className="mx-auto mt-1 max-w-xl text-xs text-stone-500">Connect ad accounts and sync campaign metrics. VowOS will not manufacture campaign performance when the source is unavailable.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-y border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                    <th className="px-5 py-3 text-left font-semibold">Campaign</th>
                    <th className="px-3 py-3 text-right font-semibold">Spend</th>
                    <th className="px-3 py-3 text-right font-semibold">Leads</th>
                    <th className="px-3 py-3 text-right font-semibold">Booked</th>
                    <th className="px-3 py-3 text-right font-semibold">Sales</th>
                    <th className="px-3 py-3 text-right font-semibold">Revenue</th>
                    <th className="px-3 py-3 text-right font-semibold">ROAS</th>
                    <th className="px-5 py-3 text-right font-semibold">CAC</th>
                  </tr>
                </thead>
                <tbody>{campaigns.slice(0, 100).map((campaign) => <CampaignRow key={campaign.campaignId} campaign={campaign} />)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {connectionState.data.map((connection) => (
          <div key={connection.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-900">{providerLabel(connection.provider)}</p>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${connection.status === 'connected' ? 'bg-emerald-50 text-emerald-700' : connection.status === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-600'}`}>
                {connection.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-stone-500">{connection.display_name || connection.external_account_id || 'Account not mapped'}</p>
            <p className="mt-2 text-[11px] text-stone-400">Last sync: {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}</p>
          </div>
        ))}
        {connectionState.data.length === 0 && (
          <div className="lg:col-span-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5">
            <p className="text-sm font-semibold text-stone-800">No marketing sources are connected.</p>
            <p className="mt-1 text-xs text-stone-500">Open Connections to authorize Google, Meta and the other platforms used by this business.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end text-xs text-stone-400">
        <span className="inline-flex items-center gap-1">Advanced attribution and incrementality remain separate from platform-reported conversions <ArrowRight className="h-3 w-3" /></span>
      </div>
    </div>
  );
}
