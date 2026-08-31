import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import {  } from '@/data/vowosData';
import { supabase } from '@/lib/supabase';
import { toast } from '@vowos/design-system';
import { ScheduleData, fetchSchedules } from '@/lib/schedules';
import {
  TimeEntry,
  fetchTimeEntries,
  fetchOpenEntries,
  clockOut,
  deleteTimeEntry,
  entryHours,
  fmtHours,
  localIsoDate,
  scheduledHoursForRange,
  SUSPICIOUS_SHIFT_HOURS,
} from '@/lib/timeclock';
import { btnSecondary } from './ui';

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Sunday-start week containing today. */
function thisWeek(): [string, string] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return [localIsoDate(start), localIsoDate(end)];
}

const PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: 'This week', range: thisWeek },
  {
    label: 'Last week',
    range: () => {
      const [s] = thisWeek();
      const start = new Date(`${s}T00:00:00`);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return [localIsoDate(start), localIsoDate(end)];
    },
  },
  {
    label: 'This month',
    range: () => {
      const now = new Date();
      return [
        localIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        localIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      ];
    },
  },
  {
    label: 'Last month',
    range: () => {
      const now = new Date();
      return [
        localIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        localIsoDate(new Date(now.getFullYear(), now.getMonth(), 0)),
      ];
    },
  },
  {
    label: 'Last 30 days',
    range: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return [localIsoDate(start), localIsoDate(now)];
    },
  },
];

/**
 * Hours & Time Clock report: scheduled hours (from shift rules minus time off)
 * vs actual punched hours per team member, with punch-level detail and cleanup.
 */
export default function HoursReportTab() {
  const [[from, to], setRange] = useState<[string, string]>(thisWeek);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleData>({ shifts: [], timeOff: [] });
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [openEntries, setOpenEntries] = useState<TimeEntry[]>([]);
  const [staffNames, setStaffNames] = useState<string[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [sched, ents, open, staffRes] = await Promise.all([
      fetchSchedules(),
      fetchTimeEntries(from, to),
      fetchOpenEntries(),
      supabase.from('staff_profiles').select('name').order('created_at', { ascending: true }),
    ]);
    setSchedules(sched);
    setEntries(ents);
    setOpenEntries(open);
    setStaffNames((staffRes.data ?? []).map((r: any) => r.name));
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    reload();
  }, [reload]);

  const now = new Date();

  // Roster = staff accounts + booking-form stylists + anyone with a punch in range
  const roster = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (n: string) => {
      const k = n.trim();
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    };
    staffNames.forEach(push);
    // Sample team members are no longer injected into the live roster.
    entries.forEach((e) => push(e.staffName));
    return out;
  }, [staffNames, entries]);

  const rows = useMemo(
    () =>
      roster.map((name) => {
        const mine = entries.filter((e) => e.staffName === name);
        const worked = mine.reduce((s, e) => s + entryHours(e, now), 0);
        const scheduled = scheduledHoursForRange(schedules, name, from, to);
        const daysWorked = new Set(mine.map((e) => localIsoDate(new Date(e.clockIn)))).size;
        const onClock = openEntries.some((e) => e.staffName === name);
        return { name, scheduled, worked, variance: worked - scheduled, punches: mine.length, daysWorked, onClock };
      }),
    [roster, entries, schedules, openEntries, from, to], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const totalScheduled = rows.reduce((s, r) => s + r.scheduled, 0);
  const totalWorked = rows.reduce((s, r) => s + r.worked, 0);
  const coverage = totalScheduled > 0 ? Math.round((totalWorked / totalScheduled) * 100) : 0;

  const handleForceOut = async (e: TimeEntry) => {
    const err = await clockOut(e.id);
    if (err) toast({ title: 'Could not clock out', description: err, variant: 'destructive' });
    else toast({ title: 'Clocked out', description: `${e.staffName}'s open punch was closed.` });
    reload();
  };

  const handleDelete = async (e: TimeEntry) => {
    const err = await deleteTimeEntry(e.id);
    if (err) toast({ title: 'Could not delete punch', description: err, variant: 'destructive' });
    else toast({ title: 'Punch deleted', description: `${e.staffName} · ${new Date(e.clockIn).toLocaleString()}` });
    reload();
  };

  const exportCsv = () =>
    downloadCsv(`hours-${from}-to-${to}.csv`, [
      ['Team Member', 'Scheduled Hours', 'Worked Hours', 'Variance', 'Punches', 'Days Worked'],
      ...rows.map((r) => [
        r.name,
        r.scheduled.toFixed(2),
        r.worked.toFixed(2),
        r.variance.toFixed(2),
        r.punches,
        r.daysWorked,
      ]),
    ]);

  const fmtStamp = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Range controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-500">From</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && setRange([e.target.value, to])}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-500">To</label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => e.target.value && setRange([from, e.target.value])}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setRange(p.range())}
              className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-border-subtle hover:bg-brand-soft hover:text-brand-primary"
            >
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className={`${btnSecondary} ml-auto`}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Scheduled hours', value: fmtHours(totalScheduled) },
          { label: 'Worked hours (punched)', value: fmtHours(totalWorked), tone: 'text-emerald-700' },
          {
            label: 'Worked vs scheduled',
            value: totalScheduled > 0 ? `${coverage}%` : '—',
            tone: coverage >= 90 ? 'text-emerald-700' : coverage >= 70 ? 'text-status-warning' : 'text-brand-primary',
          },
          { label: 'On the clock right now', value: String(openEntries.length), tone: openEntries.length > 0 ? 'text-emerald-700' : undefined },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{s.label}</p>
            <p className={`mt-1 font-serif text-2xl ${s.tone ?? 'text-stone-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center rounded-2xl border border-stone-200/80 bg-white py-14 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <p className="mt-3 text-sm text-stone-500">Crunching the hours...</p>
        </div>
      ) : (
        <>
          {/* Per-member summary */}
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-100 text-sm">
                <thead className="bg-stone-50/70">
                  <tr>
                    {['Team member', 'Scheduled', 'Worked', 'Variance', 'Punches', 'Days worked', 'Status'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map((r) => (
                    <tr key={r.name} className="transition-colors hover:bg-brand-soft/40">
                      <td className="px-5 py-3.5 font-medium text-stone-900">{r.name}</td>
                      <td className="px-5 py-3.5 text-stone-700">{r.scheduled > 0 ? fmtHours(r.scheduled) : '—'}</td>
                      <td className="px-5 py-3.5 font-semibold text-stone-900">{r.worked > 0 ? fmtHours(r.worked) : '—'}</td>
                      <td className="px-5 py-3.5">
                        {r.scheduled === 0 && r.worked === 0 ? (
                          <span className="text-stone-400">—</span>
                        ) : (
                          <span
                            className={`font-semibold ${
                              r.variance >= 0 ? 'text-emerald-700' : r.variance > -2 ? 'text-status-warning' : 'text-brand-primary'
                            }`}
                          >
                            {r.variance >= 0 ? '+' : '−'}
                            {fmtHours(Math.abs(r.variance))}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-stone-700">{r.punches}</td>
                      <td className="px-5 py-3.5 text-stone-700">{r.daysWorked}</td>
                      <td className="px-5 py-3.5">
                        {r.onClock ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-success" /> On the clock
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">Off</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-50/70">
                  <tr>
                    <td className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Total</td>
                    <td className="px-5 py-3 font-semibold text-stone-900">{fmtHours(totalScheduled)}</td>
                    <td className="px-5 py-3 font-semibold text-stone-900">{fmtHours(totalWorked)}</td>
                    <td className="px-5 py-3" colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Punch detail */}
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4">
              <h3 className="font-serif text-lg text-stone-900">Punch Detail</h3>
              <p className="text-xs text-stone-500">
                Every clock-in inside the range. Close forgotten punches or delete mistakes — the summary updates instantly.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-100 text-sm">
                <thead className="bg-stone-50/70">
                  <tr>
                    {['Team member', 'Clock in', 'Clock out', 'Hours', ''].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {entries.map((e) => {
                    const hrs = entryHours(e, now);
                    const suspicious = hrs > SUSPICIOUS_SHIFT_HOURS;
                    return (
                      <tr key={e.id} className="transition-colors hover:bg-brand-soft/40">
                        <td className="px-5 py-3 font-medium text-stone-900">{e.staffName}</td>
                        <td className="px-5 py-3 text-stone-700">{fmtStamp(e.clockIn)}</td>
                        <td className="px-5 py-3 text-stone-700">
                          {e.clockOut ? (
                            fmtStamp(e.clockOut)
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-status-success/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              Still clocked in
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`font-semibold ${suspicious ? 'text-status-warning' : 'text-stone-900'}`}>
                            {fmtHours(hrs)}
                          </span>
                          {suspicious && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-status-warning">
                              <AlertTriangle className="h-3 w-3" /> check
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1.5">
                            {!e.clockOut && (
                              <button
                                onClick={() => handleForceOut(e)}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 transition-colors hover:bg-stone-50"
                                title="Close this punch now"
                              >
                                <LogOut className="h-3 w-3" /> Clock out
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(e)}
                              className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-brand-soft hover:text-brand-primary"
                              title="Delete this punch"
                              aria-label={`Delete punch for ${e.staffName}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-stone-500">
                        No punches in this range yet — the team clocks in from the Appointments page.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-stone-400">
            Scheduled hours come from each member's weekly shift pattern minus approved time off (set from the
            calendar's Schedules button). Members without a saved schedule count default salon hours on every day.
          </p>
        </>
      )}
    </div>
  );
}
