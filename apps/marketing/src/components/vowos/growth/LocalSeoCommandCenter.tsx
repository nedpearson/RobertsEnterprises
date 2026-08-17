import { useMemo } from 'react';
import { MapPin, Phone, Globe, Clock, CheckCircle2, AlertTriangle, ExternalLink, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';
import { useLocalListings, useLocalMetrics, useGrowthConnections } from '@/lib/growth/useGrowth';
import type { LocalMetric } from '@/lib/growth/types';

const SEVERITY_STYLES: Record<string, string> = {
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-stone-50 text-stone-600 border-stone-200',
};

function sumMetrics(metrics: LocalMetric[]) {
  return metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions_maps + m.impressions_search,
      clicks: acc.clicks + m.website_clicks,
      calls: acc.calls + m.calls,
      directions: acc.directions + m.direction_requests,
      bookings: acc.bookings + m.bookings,
    }),
    { impressions: 0, clicks: 0, calls: 0, directions: 0, bookings: 0 },
  );
}

/** Minimal inline sparkline — one series, no chart dependency, no axes needed. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-8 w-full" role="img" aria-label={label}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        className="text-brand-primary"
      />
    </svg>
  );
}

/**
 * Local SEO & Google Business Profile, backed by growth_local_listings and
 * growth_local_metrics. Completeness scores and the issue list are computed by
 * the worker's scoreListing() during sync, so what is shown here is exactly what
 * the sync recorded — no second, divergent scoring implementation.
 */
export function LocalSeoCommandCenter() {
  const { data: listings, loading, error } = useLocalListings();
  const { data: metrics } = useLocalMetrics(30);
  const { data: connections } = useGrowthConnections();

  const gbp = connections.find((c) => c.provider === 'google_business_profile');
  const totals = useMemo(() => sumMetrics(metrics), [metrics]);
  const byDate = useMemo(
    () => [...metrics].sort((a, b) => a.metric_date.localeCompare(b.metric_date)),
    [metrics],
  );

  return (
    <div className="space-y-6" data-tour-id="local-seo">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Local SEO &amp; Google</h1>
          <p className="mt-1 text-sm text-stone-500">
            How your storefront performs in Maps and local Search, and what is holding it back.
          </p>
        </div>
        {gbp && (
          <span
            data-tour-id="gbp-connection-status"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              gbp.status === 'connected'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {gbp.status === 'connected' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            Business Profile: {gbp.status}
          </span>
        )}
      </div>

      {error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="p-4 text-sm text-rose-800">{error}</CardContent>
        </Card>
      )}

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5" data-tour-id="local-metrics">
          {[
            { label: 'Profile views', value: totals.impressions, series: byDate.map((m) => m.impressions_maps + m.impressions_search) },
            { label: 'Website clicks', value: totals.clicks, series: byDate.map((m) => m.website_clicks) },
            { label: 'Calls', value: totals.calls, series: byDate.map((m) => m.calls) },
            { label: 'Direction requests', value: totals.directions, series: byDate.map((m) => m.direction_requests) },
            { label: 'Bookings', value: totals.bookings, series: byDate.map((m) => m.bookings) },
          ].map((tile) => (
            <Card key={tile.label} className="shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{tile.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">{tile.value.toLocaleString()}</p>
                <Sparkline values={tile.series} label={`${tile.label} over 30 days`} />
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Last 30 days</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 text-sm text-stone-500">Loading listings…</CardContent>
        </Card>
      ) : listings.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center" data-tour-id="local-seo-empty">
            <MapPin className="mx-auto h-6 w-6 text-stone-400" />
            <p className="mt-2 text-sm font-semibold text-stone-800">No Google Business Profile connected</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
              Connect Business Profile to pull your listing, completeness score, and Maps performance. Google must
              approve API access before this can sync.
            </p>
          </CardContent>
        </Card>
      ) : (
        listings.map((listing) => {
          const address = listing.storefront_address as {
            addressLines?: string[];
            locality?: string;
            administrativeArea?: string;
            postalCode?: string;
          };
          const score = listing.completeness_score ?? 0;
          return (
            <Card key={listing.id} className="shadow-sm" data-tour-id="local-listing">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{listing.title}</CardTitle>
                    <CardDescription>
                      {[address?.addressLines?.join(' '), address?.locality, address?.administrativeArea, address?.postalCode]
                        .filter(Boolean)
                        .join(', ') || 'No address on file'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Completeness</p>
                    <p
                      data-tour-id="listing-completeness"
                      className={`text-2xl font-bold tabular-nums ${
                        score >= 90 ? 'text-emerald-700' : score >= 70 ? 'text-amber-600' : 'text-rose-600'
                      }`}
                    >
                      {score}%
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={`h-full rounded-full ${score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-stone-700">
                    <Phone className="h-4 w-4 text-stone-400" />
                    {listing.phone ?? <span className="text-rose-600">No phone number</span>}
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <Globe className="h-4 w-4 text-stone-400" />
                    {listing.website_url ? (
                      <a href={listing.website_url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                        {listing.website_url}
                      </a>
                    ) : (
                      <span className="text-rose-600">No website</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <MapPin className="h-4 w-4 text-stone-400" />
                    {listing.primary_category ?? <span className="text-rose-600">No primary category</span>}
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <Clock className="h-4 w-4 text-stone-400" />
                    {Object.keys(listing.regular_hours ?? {}).length > 0 ? (
                      `${Object.keys(listing.regular_hours).length} days of hours set`
                    ) : (
                      <span className="text-rose-600">Hours not set</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <TrendingUp className="h-4 w-4 text-stone-400" />
                    {listing.rating ? `${listing.rating} stars · ${listing.review_count} reviews` : 'No rating yet'}
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <CheckCircle2 className="h-4 w-4 text-stone-400" />
                    {listing.verification_state ?? 'Verification unknown'}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Issues found ({listing.issues?.length ?? 0})
                  </p>
                  {(listing.issues?.length ?? 0) === 0 ? (
                    <p className="text-sm text-emerald-700">No issues — this listing is fully optimised.</p>
                  ) : (
                    <ul className="space-y-2" data-tour-id="listing-issues">
                      {listing.issues.map((issue) => (
                        <li
                          key={issue.code}
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.low}`}
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{issue.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {listing.external_id && (
                  <a
                    href="https://business.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Edit on Google Business Profile <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
