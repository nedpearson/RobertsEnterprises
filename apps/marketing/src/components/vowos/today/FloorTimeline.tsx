import React, { useEffect, useMemo, useState } from 'react';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { useAppointments, useEmployeeSchedules } from '@/lib/services/schedulingService';
import { LOCATIONS, resolveLocationSlug } from '@/data/vowosData';
import { CalendarRange } from 'lucide-react';

interface FloorTimelineProps {
  businessId?: string;
  locationId: string | 'all';
}

type ApptKind = 'bridal' | 'fitting' | 'alterations' | 'formalwear' | 'other';

const KIND_STYLE: Record<ApptKind, { bg: string; label: string }> = {
  bridal: { bg: 'bg-[#7A2E4E]', label: 'Bridal appointment' },
  fitting: { bg: 'bg-[#3F6B54]', label: 'Fitting' },
  alterations: { bg: 'bg-[#96601D]', label: 'Alterations' },
  formalwear: { bg: 'bg-[#3D4A6B]', label: 'Tux / formalwear' },
  other: { bg: 'bg-stone-500', label: 'Other' },
};

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 19;

function classify(raw: string): ApptKind {
  const t = raw.toLowerCase();
  if (t.includes('alteration')) return 'alterations';
  if (t.includes('fitting')) return 'fitting';
  if (t.includes('tux') || t.includes('suit') || t.includes('groom') || t.includes('formal'))
    return 'formalwear';
  if (t.includes('bridal') || t.includes('consultation') || t.includes('gown')) return 'bridal';
  return 'other';
}

function titleCase(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function laneLabel(slug: string): string {
  const match = (LOCATIONS as any[]).find((l) => l?.id === slug);
  return match?.short || match?.city || (slug ? titleCase(slug) : 'Unassigned location');
}

interface Block {
  id: string;
  laneKey: string;
  startMinutes: number;
  endMinutes: number;
  kind: ApptKind;
  timeLabel: string;
  customer: string;
  stylist: string;
  typeLabel: string;
}

function toMinutes(appt: any): number | null {
  if (appt.start_at) {
    const d = new Date(appt.start_at);
    if (!Number.isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
  }
  const time: string = appt.time || '';
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const mer = m[3]?.toLowerCase();
  if (mer === 'pm' && hour !== 12) hour += 12;
  if (mer === 'am' && hour === 12) hour = 0;
  return hour * 60 + mins;
}

/**
 * Today's floor: one lane per boutique, a live now-line, and every booked block
 * placed against a real clock. On phones the same data renders as a grouped
 * list, because a ten-hour rail is unreadable at 375px.
 */
export function FloorTimeline({ businessId, locationId }: FloorTimelineProps) {
  const { navigateToView } = useApplicationRoute();
  const { data: appointments = [], isLoading } = useAppointments(businessId, locationId);
  const { data: schedules = [] } = useEmployeeSchedules(businessId, locationId);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const blocks: Block[] = useMemo(() => {
    return (appointments as any[])
      .filter((a) => {
        const dateStr = a.start_at ? a.start_at.slice(0, 10) : a.date;
        return dateStr === todayStr;
      })
      .map((a) => {
        const start = toMinutes(a);
        if (start === null) return null;
        const typeLabel = a.service?.name || a.type || 'Appointment';
        const customer =
          typeof a.customer === 'object' && a.customer
            ? a.customer.name
            : typeof a.customer === 'string'
            ? a.customer
            : 'Unknown bride';
        const stylist =
          typeof a.employee === 'object' && a.employee
            ? a.employee.name
            : typeof a.stylist === 'string' && a.stylist
            ? a.stylist
            : 'Unassigned';
        return {
          id: a.id,
          laneKey: resolveLocationSlug(a.location ?? a.location_id) || '',
          startMinutes: start,
          endMinutes: start + (a.duration_minutes || 90),
          kind: classify(typeLabel),
          timeLabel: a.start_at
            ? new Date(a.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : a.time || '',
          customer,
          stylist,
          typeLabel,
        } as Block;
      })
      .filter(Boolean) as Block[];
  }, [appointments, todayStr]);

  // Lanes = every boutique with something booked today, plus every boutique with
  // someone rostered. A quiet store is information, so it keeps its lane.
  const laneKeys: string[] = useMemo(() => {
    const keys = new Set<string>();
    blocks.forEach((b) => keys.add(b.laneKey));
    (schedules as any[])
      .filter((s) => s.date === todayStr)
      .forEach((s) => keys.add(resolveLocationSlug(s.location ?? s.location_id) || ''));
    if (locationId !== 'all' && keys.size === 0) keys.add(String(locationId));
    return Array.from(keys).filter((k) => k !== undefined).sort();
  }, [blocks, schedules, todayStr, locationId]);

  const totalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  const pct = (mins: number) =>
    Math.min(100, Math.max(0, ((mins - DAY_START_HOUR * 60) / totalMinutes) * 100));
  const nowVisible = nowMinutes >= DAY_START_HOUR * 60 && nowMinutes <= DAY_END_HOUR * 60;

  const hourTicks = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i
  );
  const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;

  const kindsPresent = Array.from(new Set(blocks.map((b) => b.kind)));

  if (isLoading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-40 animate-pulse rounded bg-stone-100" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-stone-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 sm:px-5">
        <CalendarRange className="h-4 w-4 text-brand-primary" aria-hidden="true" />
        <h2 className="font-serif text-lg font-semibold text-stone-900">Today's floor</h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-stone-600">
          {blocks.length}
        </span>
        <button
          type="button"
          onClick={() => navigateToView('appointments', { tab: 'calendar' })}
          className="ml-auto text-sm font-semibold text-brand-primary hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Open calendar →
        </button>
      </header>

      {laneKeys.length === 0 ? (
        <div className="px-4 py-10 text-center sm:px-6">
          <p className="font-serif text-lg text-stone-700">Nothing booked today</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-stone-500">
            No appointments and no one rostered. Use the day to clear the request queue.
          </p>
        </div>
      ) : (
        <>
          {/* ── PHONE: grouped list, thumb-reachable rows ── */}
          <div className="divide-y divide-stone-100 sm:hidden">
            {laneKeys.map((key) => {
              const laneBlocks = blocks
                .filter((b) => b.laneKey === key)
                .sort((a, b) => a.startMinutes - b.startMinutes);
              return (
                <div key={key} className="px-4 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-stone-500">
                    {laneLabel(key)}
                  </p>
                  {laneBlocks.length === 0 ? (
                    <p className="text-sm text-stone-400">Nothing booked</p>
                  ) : (
                    <ul className="space-y-2">
                      {laneBlocks.map((b) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() =>
                              navigateToView('appointments', { tab: 'calendar', appointmentId: b.id })
                            }
                            className="flex w-full min-h-[56px] items-center gap-3 rounded-lg border border-stone-200 p-3 text-left active:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                          >
                            <span
                              className={`h-9 w-1.5 shrink-0 rounded-full ${KIND_STYLE[b.kind].bg}`}
                              aria-hidden="true"
                            />
                            <span className="w-[62px] shrink-0 text-sm font-semibold tabular-nums text-stone-900">
                              {b.timeLabel}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-stone-900">
                                {b.customer}
                              </span>
                              <span className="block truncate text-xs text-stone-500">
                                {b.typeLabel} · {b.stylist}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── TABLET / DESKTOP: hour rail with a live now-line ── */}
          <div className="hidden px-4 pb-4 pt-3 sm:block sm:px-5">
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="flex border-b border-stone-100 pb-1.5 pl-[132px]">
                  {hourTicks.map((h) => (
                    <span
                      key={h}
                      className="flex-1 text-[11px] tabular-nums text-stone-400"
                    >
                      {hourLabel(h)}
                    </span>
                  ))}
                </div>

                {laneKeys.map((key) => {
                  const laneBlocks = blocks.filter((b) => b.laneKey === key);
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 border-b border-stone-100 py-2.5 last:border-b-0"
                    >
                      <p className="w-[120px] shrink-0 truncate text-[12.5px] font-semibold text-stone-700">
                        {laneLabel(key)}
                      </p>
                      <div className="relative h-9 flex-1 rounded-lg border border-stone-100 bg-stone-50/70">
                        {nowVisible && (
                          <div
                            className="absolute -top-2 bottom-[-8px] z-10 w-0.5 bg-vowos-rose"
                            style={{ left: `${pct(nowMinutes)}%` }}
                            aria-hidden="true"
                          />
                        )}
                        {laneBlocks.length === 0 && (
                          <span className="absolute inset-0 grid place-items-center text-xs text-stone-400">
                            Nothing booked
                          </span>
                        )}
                        {laneBlocks.map((b) => {
                          const left = pct(b.startMinutes);
                          const width = Math.max(6, pct(b.endMinutes) - left);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              title={`${b.timeLabel} · ${b.customer} · ${b.typeLabel} · ${b.stylist}`}
                              onClick={() =>
                                navigateToView('appointments', {
                                  tab: 'calendar',
                                  appointmentId: b.id,
                                })
                              }
                              className={`absolute top-[3px] bottom-[3px] flex items-center overflow-hidden rounded px-2 text-left text-[11.5px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-1 ${
                                KIND_STYLE[b.kind].bg
                              }`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                            >
                              <span className="truncate">
                                {b.timeLabel} {b.customer}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {kindsPresent.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-500">
                {kindsPresent.map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <i
                      className={`inline-block h-2.5 w-2.5 rounded-sm ${KIND_STYLE[k].bg}`}
                      aria-hidden="true"
                    />
                    {KIND_STYLE[k].label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
