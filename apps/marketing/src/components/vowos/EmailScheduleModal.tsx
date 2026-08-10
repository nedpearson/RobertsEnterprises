import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@vowos/design-system';
import { ScheduleData, dutyFor, shiftShortLabel } from '@/lib/schedules';
import { fetchStaffContacts, saveStaffContact } from '@/lib/timeclock';
import { Modal, btnSecondary } from './ui';

const isEmail = (s: string) => /.+@.+\..+/.test(s.trim());

interface Row {
  name: string;
  role: string;
  email: string;
  include: boolean;
}

/**
 * Owner/Manager tool: email every team member their shifts for the visible week.
 * Emails are remembered in the staff_contacts directory, which also powers the
 * automatic Saturday schedule email for the upcoming week.
 */
export default function EmailScheduleModal({
  open,
  onClose,
  roster,
  weekDays,
  weekLabel,
  schedules,
}: {
  open: boolean;
  onClose: () => void;
  roster: { name: string; role: string }[];
  /** The 7 ISO dates of the visible calendar week (Sunday first). */
  weekDays: string[];
  weekLabel: string;
  schedules: ScheduleData;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const contacts = await fetchStaffContacts();
      setRows(
        roster.map((m) => ({
          name: m.name,
          role: m.role,
          email: contacts[m.name] ?? '',
          include: Boolean(contacts[m.name]),
        })),
      );
      setLoading(false);
    })();
  }, [open, roster]);

  /** Compact "Sun Off · Mon 9–5:30 · …" preview of a member's week. */
  const weekSummary = useMemo(
    () => (name: string) =>
      weekDays
        .map((iso) => {
          const d = new Date(`${iso}T12:00:00`);
          const day = d.toLocaleDateString('en-US', { weekday: 'short' });
          const duty = dutyFor(schedules, name, iso);
          if (duty.status === 'on') return `${day} ${shiftShortLabel(duty.startMinutes, duty.endMinutes)}`;
          if (duty.status === 'time_off') return `${day} ${duty.reason}`;
          return `${day} Off`;
        })
        .join(' · '),
    [weekDays, schedules],
  );

  const setRow = (name: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.name === name ? { ...r, ...patch } : r)));

  const selected = rows.filter((r) => r.include && isEmail(r.email));
  const badSelected = rows.filter((r) => r.include && r.email.trim() !== '' && !isEmail(r.email));

  const handleSend = async () => {
    if (selected.length === 0) {
      toast({ title: 'No recipients', description: 'Check at least one team member with a valid email.', variant: 'destructive' });
      return;
    }
    setSending(true);
    // Remember every typed email in the directory (also powers the weekly auto-send)
    await Promise.all(rows.filter((r) => isEmail(r.email)).map((r) => saveStaffContact(r.name, r.email)));

    const { data, error } = await supabase.functions.invoke('email-schedule', {
      body: {
        weekStart: weekDays[0],
        recipients: selected.map((r) => ({ name: r.name, email: r.email.trim() })),
      },
    });
    setSending(false);

    if (error || !data?.ok) {
      toast({ title: 'Could not send schedules', description: error?.message ?? data?.error ?? 'Unknown error', variant: 'destructive' });
      return;
    }
    const failed: { name: string; error: string }[] = data.failed ?? [];
    toast({
      title: `Schedule emailed to ${data.sent} team member${data.sent === 1 ? '' : 's'}`,
      description:
        failed.length > 0
          ? `Failed: ${failed.map((f) => f.name).join(', ')}`
          : `Week of ${weekLabel}. Schedules also auto-send every Saturday for the week ahead.`,
      variant: failed.length > 0 ? 'destructive' : undefined,
    });
    if (failed.length === 0) onClose();
  };

  return (
    <Modal open={open} onClose={() => (sending ? undefined : onClose())} title="Email Weekly Schedule">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-stone-600">
          Send each team member their shifts for the week of{' '}
          <span className="font-semibold text-stone-900">{weekLabel}</span>. Emails you enter here are
          remembered — and every <span className="font-medium text-stone-800">Saturday at 7 AM</span> the
          upcoming week's schedule is emailed automatically to everyone on file.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
          </div>
        ) : (
          <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
            {rows.map((r) => (
              <div
                key={r.name}
                className={`rounded-xl border p-3 transition-colors ${
                  r.include ? 'border-border-subtle bg-brand-soft/40' : 'border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => setRow(r.name, { include: e.target.checked })}
                    className="h-4 w-4 flex-shrink-0 rounded border-stone-300 text-brand-primary focus:ring-rose-300"
                    aria-label={`Email schedule to ${r.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {r.name} <span className="text-[10px] font-medium text-stone-400">· {r.role}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-stone-500" title={weekSummary(r.name)}>
                      {weekSummary(r.name)}
                    </p>
                  </div>
                  <div className="relative w-52 flex-shrink-0">
                    <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={r.email}
                      onChange={(e) => setRow(r.name, { email: e.target.value, include: e.target.value.trim() !== '' ? r.include || true : r.include })}
                      placeholder="email@boutique.com"
                      className={`w-full rounded-lg border py-1.5 pl-8 pr-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-focus-ring ${
                        r.email.trim() !== '' && !isEmail(r.email) ? 'border-rose-300' : 'border-stone-200 focus:border-rose-300'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="rounded-xl border border-dashed border-stone-200 py-8 text-center text-sm text-stone-400">
                No team members found yet.
              </p>
            )}
          </div>
        )}

        {badSelected.length > 0 && (
          <p className="text-xs font-medium text-brand-primary">
            Fix the email for: {badSelected.map((r) => r.name).join(', ')}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-xs text-stone-400">
            {selected.length} of {rows.length} selected
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={sending} className={`${btnSecondary} disabled:opacity-60`}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || selected.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending…' : `Email ${selected.length || ''} Schedule${selected.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
