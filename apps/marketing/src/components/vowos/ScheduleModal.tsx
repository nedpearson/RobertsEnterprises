import { useEffect, useMemo, useState } from 'react';
import { CalendarOff, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { Modal, btnPrimary, btnSecondary } from './ui';
import { formatDate } from '@/data/vowosData';
import {
  ScheduleData,
  WEEKDAYS,
  DEFAULT_START_MINUTES,
  DEFAULT_END_MINUTES,
  SHIFT_TIME_OPTIONS,
  TIME_OFF_REASONS,
  saveWeekShifts,
  addTimeOff,
  removeTimeOff,
} from '@/lib/schedules';

interface RosterMember {
  name: string;
  role: string;
}

interface DayRow {
  weekday: number;
  isWorking: boolean;
  startMinutes: number;
  endMinutes: number;
}

const inputCls =
  'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-focus-ring';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Owner/Manager tool: set each team member's weekly working days & hours and
 * log day-off / vacation ranges. Everything persists to the staff_schedules table.
 */
export default function ScheduleModal({
  open,
  onClose,
  roster,
  data,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  roster: RosterMember[];
  data: ScheduleData;
  onChanged: () => Promise<void>;
}) {
  const [member, setMember] = useState('');
  const [week, setWeek] = useState<DayRow[]>([]);
  const [savingWeek, setSavingWeek] = useState(false);

  // Time-off form
  const [offStart, setOffStart] = useState(todayIso());
  const [offEnd, setOffEnd] = useState(todayIso());
  const [offReason, setOffReason] = useState<string>('Day off');
  const [savingOff, setSavingOff] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Default selection when the modal opens
  useEffect(() => {
    if (open && !member && roster.length > 0) setMember(roster[0].name);
  }, [open, roster, member]);

  // Load the selected member's weekly pattern (defaults: working every day 9–5:30)
  useEffect(() => {
    if (!member) return;
    setWeek(
      WEEKDAYS.map((_, weekday) => {
        const rule = data.shifts.find((s) => s.staffName === member && s.weekday === weekday);
        return rule
          ? {
              weekday,
              isWorking: rule.isWorking,
              startMinutes: rule.startMinutes,
              endMinutes: rule.endMinutes,
            }
          : {
              weekday,
              isWorking: true,
              startMinutes: DEFAULT_START_MINUTES,
              endMinutes: DEFAULT_END_MINUTES,
            };
      }),
    );
  }, [member, data.shifts, open]);

  const memberTimeOff = useMemo(
    () => data.timeOff.filter((t) => t.staffName === member),
    [data.timeOff, member],
  );

  const hasSchedule = useMemo(
    () => data.shifts.some((s) => s.staffName === member),
    [data.shifts, member],
  );

  const setDay = (weekday: number, patch: Partial<DayRow>) =>
    setWeek((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));

  const handleSaveWeek = async () => {
    if (!member) return;
    const bad = week.find((d) => d.isWorking && d.endMinutes <= d.startMinutes);
    if (bad) {
      toast({
        title: 'Check the hours',
        description: `${WEEKDAYS[bad.weekday]}: the shift must end after it starts.`,
        variant: 'destructive',
      });
      return;
    }
    setSavingWeek(true);
    const err = await saveWeekShifts(member, week);
    setSavingWeek(false);
    if (err) {
      toast({ title: 'Could not save schedule', description: err, variant: 'destructive' });
      return;
    }
    await onChanged();
    const workDays = week.filter((d) => d.isWorking).length;
    toast({
      title: 'Schedule saved',
      description: `${member} now works ${workDays} day${workDays === 1 ? '' : 's'} a week — the coverage calendar is updated.`,
    });
  };

  const handleAddTimeOff = async () => {
    if (!member || !offStart) return;
    setSavingOff(true);
    const err = await addTimeOff(member, offStart, offEnd || offStart, offReason);
    setSavingOff(false);
    if (err) {
      toast({ title: 'Could not add time off', description: err, variant: 'destructive' });
      return;
    }
    await onChanged();
    toast({
      title: `${offReason} added`,
      description: `${member} is off ${formatDate(offStart)}${offEnd && offEnd !== offStart ? ` – ${formatDate(offEnd)}` : ''}.`,
    });
  };

  const handleRemoveTimeOff = async (id: string) => {
    setRemovingId(id);
    const err = await removeTimeOff(id);
    setRemovingId(null);
    if (err) {
      toast({ title: 'Could not remove time off', description: err, variant: 'destructive' });
      return;
    }
    await onChanged();
    toast({ title: 'Time off removed' });
  };

  return (
    <Modal open={open} onClose={onClose} title="Staff Shift Schedules">
      <div className="space-y-5">
        {/* Team member picker */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500">
            Team member
          </label>
          <select value={member} onChange={(e) => setMember(e.target.value)} className={inputCls}>
            {roster.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} · {m.role}
              </option>
            ))}
          </select>
          {!hasSchedule && (
            <p className="mt-1.5 text-[11px] text-stone-400">
              No schedule set yet — until saved, {member || 'this member'} is treated as on duty for
              default salon hours (9:00 AM – 5:30 PM).
            </p>
          )}
        </div>

        {/* Weekly working days & hours */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Working days &amp; hours
          </p>
          <div className="space-y-1.5">
            {week.map((d) => (
              <div key={d.weekday} className="flex items-center gap-2">
                <label className="flex w-28 flex-shrink-0 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={d.isWorking}
                    onChange={(e) => setDay(d.weekday, { isWorking: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-stone-300 text-brand-primary focus:ring-rose-300"
                  />
                  <span className={`text-xs font-medium ${d.isWorking ? 'text-stone-800' : 'text-stone-400 line-through'}`}>
                    {WEEKDAYS[d.weekday]}
                  </span>
                </label>
                {d.isWorking ? (
                  <div className="flex flex-1 items-center gap-1.5">
                    <select
                      value={d.startMinutes}
                      onChange={(e) => setDay(d.weekday, { startMinutes: parseInt(e.target.value, 10) })}
                      className="flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-rose-300 focus:outline-none"
                      aria-label={`${WEEKDAYS[d.weekday]} shift start`}
                    >
                      {SHIFT_TIME_OPTIONS.map((o) => (
                        <option key={o.minutes} value={o.minutes}>{o.label}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-stone-400">to</span>
                    <select
                      value={d.endMinutes}
                      onChange={(e) => setDay(d.weekday, { endMinutes: parseInt(e.target.value, 10) })}
                      className="flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-rose-300 focus:outline-none"
                      aria-label={`${WEEKDAYS[d.weekday]} shift end`}
                    >
                      {SHIFT_TIME_OPTIONS.map((o) => (
                        <option key={o.minutes} value={o.minutes}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="flex-1 text-xs text-stone-400">Not scheduled</p>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleSaveWeek}
            disabled={savingWeek || !member}
            className={`${btnPrimary} mt-3 w-full justify-center disabled:opacity-60`}
          >
            {savingWeek ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingWeek ? 'Saving…' : 'Save Weekly Hours'}
          </button>
        </div>

        {/* Time off / vacation */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <CalendarOff className="h-3.5 w-3.5 text-stone-400" /> Days off &amp; vacation
          </p>
          {memberTimeOff.length > 0 ? (
            <ul className="mb-3 space-y-1.5">
              {memberTimeOff.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-800">
                      {formatDate(t.offStart)}
                      {t.offEnd !== t.offStart ? ` – ${formatDate(t.offEnd)}` : ''}
                    </p>
                    <p className="text-[10px] text-stone-400">{t.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTimeOff(t.id)}
                    disabled={removingId === t.id}
                    className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-brand-soft hover:text-brand-primary disabled:opacity-50"
                    title="Remove this time off"
                    aria-label={`Remove time off starting ${t.offStart}`}
                  >
                    {removingId === t.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-xs text-stone-400">No upcoming time off for {member || 'this member'}.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                First day
              </label>
              <input
                type="date"
                value={offStart}
                onChange={(e) => {
                  setOffStart(e.target.value);
                  if (offEnd < e.target.value) setOffEnd(e.target.value);
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Last day
              </label>
              <input
                type="date"
                value={offEnd}
                min={offStart}
                onChange={(e) => setOffEnd(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Reason
              </label>
              <select value={offReason} onChange={(e) => setOffReason(e.target.value)} className={inputCls}>
                {TIME_OFF_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddTimeOff}
              disabled={savingOff || !member || !offStart}
              className={`${btnSecondary} disabled:opacity-60`}
            >
              {savingOff ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-stone-400">
          Off days and vacations are shaded on the coverage calendar, and any bride booked outside a
          stylist&rsquo;s shift is flagged with a warning so the manager can reassign her.
        </p>
      </div>
    </Modal>
  );
}
