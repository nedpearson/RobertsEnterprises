import React, { useMemo, useState } from 'react';
import { useAppointmentRequests } from '@/lib/services/schedulingService';
import { isArchivedAppointmentRequestStatus } from '@/lib/services/bookingRequestBulk';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { CalendarClock } from 'lucide-react';
import { formatDate } from '@/data/vowosData';

/**
 * Gown production runs six to eight months. A bride marrying sooner than that
 * is already into rush fees, so the queue is ordered by WEDDING DATE, not by
 * how long the request has sat. Submission age tells you how late you are;
 * wedding date tells you who to call first.
 */
const RUSH_MONTHS = 4;
const COMFORTABLE_MONTHS = 9;

const AGE_BUCKETS = [
  { id: 'stale', label: 'Over a week', min: 7, max: Infinity },
  { id: 'week', label: 'This week', min: 1, max: 7 },
  { id: 'new', label: 'Last 24 hours', min: -Infinity, max: 1 },
] as const;

type BucketId = (typeof AGE_BUCKETS)[number]['id'] | 'all';

/**
 * The wedding date lives in `appointment_requests.event_date` — added in
 * 20260807000001_scheduling_missing_rpcs.sql and the column the form bridge
 * writes. Everything after it is a fallback: the linked customer record
 * (customers.wedding_date, 20260804000001_core_schema.sql), then the raw Globo
 * payload in metadata_json, whose key differs between the two brand forms.
 */
function readWeddingDate(req: any): string | null {
  const raw =
    req?.event_date ??
    req?.eventDate ??
    req?.customer?.wedding_date ??
    req?.customer?.weddingDate ??
    req?.wedding_date ??
    req?.weddingDate ??
    req?.metadata_json?.wedding_date ??
    req?.metadata_json?.event_date ??
    req?.preferences?.wedding_date ??
    req?.preferences?.weddingDate ??
    null;
  if (!raw) return null;
  const d = new Date(String(raw).slice(0, 10) + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function monthsUntil(iso: string): number {
  const then = new Date(iso + 'T12:00:00').getTime();
  return (then - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
}

function daysSince(raw?: string): number | null {
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((Date.now() - ts) / 86_400_000);
}

interface QueueRow {
  id: string;
  name: string;
  status: string;
  weddingIso: string | null;
  monthsOut: number | null;
  ageDays: number | null;
  submittedLabel: string;
  preferredLabel: string;
  locationLabel: string;
}

export function PendingRequestsList({
  businessId,
  locationId,
}: {
  businessId?: string;
  locationId: string | 'all';
}) {
  const { data: requests = [], isLoading } = useAppointmentRequests(businessId, locationId);
  const { navigateToView } = useApplicationRoute();
  const [bucket, setBucket] = useState<BucketId>('all');

  const rows: QueueRow[] = useMemo(() => {
    return (requests as any[])
      .filter((req) => !isArchivedAppointmentRequestStatus(req.status))
      .map((req) => {
        const weddingIso = readWeddingDate(req);
        const submittedRaw = req.created_at || req.submitted_at;
        return {
          id: req.id,
          name: req.customer?.name || req.customer_name || 'Unknown bride',
          status: req.status || 'new',
          weddingIso,
          monthsOut: weddingIso ? monthsUntil(weddingIso) : null,
          ageDays: daysSince(submittedRaw),
          submittedLabel: submittedRaw ? new Date(submittedRaw).toLocaleDateString() : '—',
          preferredLabel: req.preferences?.date ? formatDate(req.preferences.date) : 'No date preference',
          locationLabel: req.location?.name || req.location_name || '',
        };
      })
      .sort((a, b) => {
        // Undated brides sort last, never lost.
        if (a.weddingIso && b.weddingIso) return a.weddingIso.localeCompare(b.weddingIso);
        if (a.weddingIso) return -1;
        if (b.weddingIso) return 1;
        return (b.ageDays ?? 0) - (a.ageDays ?? 0);
      });
  }, [requests]);

  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = { stale: 0, week: 0, new: 0 };
    rows.forEach((r) => {
      if (r.ageDays === null) return;
      AGE_BUCKETS.forEach((b) => {
        if (r.ageDays! >= b.min && r.ageDays! < b.max) counts[b.id] += 1;
      });
    });
    return counts;
  }, [rows]);

  const rushCount = useMemo(
    () => rows.filter((r) => r.monthsOut !== null && r.monthsOut < RUSH_MONTHS).length,
    [rows]
  );
  const anyWeddingDates = useMemo(() => rows.some((r) => r.weddingIso), [rows]);

  const visible = useMemo(() => {
    if (bucket === 'all') return rows;
    const def = AGE_BUCKETS.find((b) => b.id === bucket)!;
    return rows.filter((r) => r.ageDays !== null && r.ageDays >= def.min && r.ageDays < def.max);
  }, [rows, bucket]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded bg-stone-100" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-stone-50" />
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <CalendarClock className="mx-auto mb-2 h-8 w-8 text-stone-300" aria-hidden="true" />
        <p className="font-serif text-lg text-stone-700">The queue is clear</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-stone-500">
          Every booking request has been answered.
        </p>
      </div>
    );
  }

  const shown = visible.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 sm:px-5">
        <CalendarClock className="h-4 w-4 text-brand-primary" aria-hidden="true" />
        <h2 className="font-serif text-lg font-semibold text-stone-900">The queue</h2>
        <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold tabular-nums text-white">
          {rows.length.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={() => navigateToView('appointments', { tab: 'booking-requests' })}
          className="ml-auto text-sm font-semibold text-brand-primary hover:underline focus-visible:outline-none focus-visible:underline"
        >
          View all →
        </button>
      </header>

      {/* Age buckets — horizontally scrollable on a phone rather than wrapped */}
      <div className="flex divide-x divide-stone-100 overflow-x-auto border-b border-stone-100">
        {[{ id: 'all' as BucketId, label: 'Everyone', count: rows.length }, ...AGE_BUCKETS.map((b) => ({
          id: b.id as BucketId,
          label: b.label,
          count: bucketCounts[b.id],
        }))].map((b) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={bucket === b.id}
            onClick={() => setBucket(b.id)}
            className={`min-w-[104px] flex-1 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${
              bucket === b.id ? 'bg-rose-50/60' : 'hover:bg-stone-50'
            }`}
          >
            <span
              className={`block font-serif text-xl tabular-nums ${
                b.id === 'stale' && b.count > 0 ? 'text-vowos-rose' : 'text-stone-900'
              }`}
            >
              {b.count.toLocaleString()}
            </span>
            <span className="block text-[11.5px] text-stone-500">{b.label}</span>
          </button>
        ))}
      </div>

      <ul className="divide-y divide-stone-100">
        {shown.map((r) => {
          const rush = r.monthsOut !== null && r.monthsOut < RUSH_MONTHS;
          const soon =
            r.monthsOut !== null && r.monthsOut >= RUSH_MONTHS && r.monthsOut < COMFORTABLE_MONTHS;
          const monthsLabel =
            r.monthsOut === null
              ? 'No wedding date'
              : r.monthsOut < 0
              ? 'Date passed'
              : `${Math.max(0, Math.round(r.monthsOut))} mo out`;

          return (
            <li key={r.id} className="p-4 transition-colors hover:bg-stone-50 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-stone-900">{r.name}</p>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
                        r.monthsOut === null
                          ? 'bg-stone-100 text-stone-500'
                          : rush
                          ? 'bg-rose-50 text-vowos-rose'
                          : soon
                          ? 'bg-amber-50 text-vowos-clay'
                          : 'bg-emerald-50 text-vowos-sage'
                      }`}
                    >
                      {monthsLabel}
                    </span>
                    {r.locationLabel && (
                      <span className="rounded border border-stone-200 px-1.5 py-0.5 text-[10.5px] text-stone-500">
                        {r.locationLabel}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-stone-500">
                    {r.weddingIso ? (
                      <>
                        Wedding <span className="font-semibold text-stone-700">{formatDate(r.weddingIso)}</span>
                      </>
                    ) : (
                      <span className="text-stone-400">Wedding date not captured</span>
                    )}
                    {' · '}Submitted {r.submittedLabel}
                    {r.ageDays !== null && r.ageDays >= 7 && (
                      <span className="text-vowos-rose"> ({r.ageDays}d ago)</span>
                    )}
                    {' · '}
                    {r.preferredLabel}
                  </p>
                  {rush && (
                    <p className="mt-1 text-[12px] font-medium text-vowos-rose">
                      Rush territory — a standard gown order takes six to eight months.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigateToView('appointments', {
                      tab: 'booking-requests',
                      appointmentId: r.id,
                    })
                  }
                  className="min-h-[44px] w-full shrink-0 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 sm:w-auto sm:min-h-0 sm:py-2"
                >
                  Book her
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="flex flex-col gap-2 border-t border-stone-100 bg-stone-50/70 px-4 py-3 text-[12.5px] text-stone-600 sm:flex-row sm:items-center sm:px-5">
        <p className="min-w-0">
          Showing {shown.length} of {visible.length.toLocaleString()}
          {anyWeddingDates && rushCount > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-vowos-rose">
                {rushCount.toLocaleString()} marry within {RUSH_MONTHS} months
              </span>
            </>
          )}
          {!anyWeddingDates && (
            <>
              {' · '}
              <span className="text-stone-500">
                no wedding dates captured — sorted by age instead
              </span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => navigateToView('appointments', { tab: 'booking-requests' })}
          className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 sm:ml-auto sm:min-h-0 sm:py-2"
        >
          Open full queue
        </button>
      </footer>
    </section>
  );
}
