import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { Scissors, Loader2, Plus, Bell, CalendarClock, PackageCheck, ChevronRight, Square, CheckSquare } from 'lucide-react';
import { useVowosData } from '@/contexts/VowosDataContext';
import { locationById, formatCents, formatDate, LocationId } from '@/data/vowosData';
import { LocationSelect } from './LocationSelect';
import { sendAndLogMessage, isEmail, isPhone } from '@/lib/messaging';
import {
  AlterationJob,
  AlterationStatus,
  ALTERATION_STATUSES,
  ALTERATION_TASK_PRESETS,
  SEAMSTRESSES,
  fetchAlterations,
  createAlteration,
  updateAlteration,
  jobProgress,
  pickupReadyTemplates,
} from '@/lib/contractsAlterations';
import { fetchAlterationSettings, AlterationSettings } from '@/lib/settings';
import BridalIdentity from './BridalIdentity';
import { PageHeader, StatusBadge, StatCard, Modal, inputCls, btnPrimary, btnSecondary } from './ui';
import { toast } from '@/components/ui/use-toast';

const STATUS_COLORS: Record<AlterationStatus, string> = {
  'Not Started': 'bg-stone-100 text-stone-600 ring-stone-200',
  'In Progress': 'bg-violet-50 text-violet-700 ring-violet-200',
  'Final Fitting': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Ready for Pickup': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Picked Up': 'bg-stone-100 text-stone-500 ring-stone-200',
};

export default function AlterationsView() {
  const { brides, allBrides, activeLocation } = useVowosData();
  const [jobs, setJobs] = useState<AlterationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [notifyingId, setNotifyingId] = useState('');
  const [filter, setFilter] = useState<'Active' | 'All'>('Active');

  const load = useCallback(async () => {
    setJobs(await fetchAlterations());
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const scoped = useMemo(() => {
    let list = activeLocation === 'all' ? jobs : jobs.filter((j) => j.location === activeLocation);
    if (filter === 'Active') list = list.filter((j) => j.status !== 'Picked Up');
    return list;
  }, [jobs, activeLocation, filter]);

  const active = jobs.filter((j) => j.status !== 'Picked Up');
  const readyForPickup = jobs.filter((j) => j.status === 'Ready for Pickup');
  const dueSoon = active.filter((j) => {
    if (!j.dueDate) return false;
    const days = Math.ceil((new Date(j.dueDate + 'T12:00:00').getTime() - Date.now()) / 86400000);
    return days <= 21;
  });

  /** Toggle one checklist task and persist. */
  const toggleTask = async (job: AlterationJob, idx: number) => {
    const tasks = job.tasks.map((t, i) => (i === idx ? { ...t, done: !t.done } : t));
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, tasks } : j)));
    const err = await updateAlteration(job.id, { tasks });
    if (err) {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
      toast({ title: 'Could not update task', description: err, variant: 'destructive' });
    }
  };

  /** Advance the job to the next pipeline stage. */
  const advance = async (job: AlterationJob) => {
    const idx = ALTERATION_STATUSES.indexOf(job.status);
    if (idx >= ALTERATION_STATUSES.length - 1) return;
    const status = ALTERATION_STATUSES[idx + 1];
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status } : j)));
    const err = await updateAlteration(job.id, { status });
    if (err) {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
      toast({ title: 'Could not update status', description: err, variant: 'destructive' });
    }
  };

  /** Text + email the bride that her gown is ready for pickup. */
  const notifyPickup = async (job: AlterationJob) => {
    const bride = allBrides.find((b) => b.name === job.customer);
    if (!bride) {
      toast({ title: 'Bride not found', description: 'No contact info on file.', variant: 'destructive' });
      return;
    }
    setNotifyingId(job.id);
    const tpl = pickupReadyTemplates(job);
    let sent = 0;
    if (isPhone(bride.phone)) {
      const r = await sendAndLogMessage({
        channel: 'sms',
        to: bride.phone,
        body: tpl.sms,
        customer: job.customer,
        kind: 'pickup',
      });
      if (r.ok) sent++;
    }
    if (isEmail(bride.email)) {
      const r = await sendAndLogMessage({
        channel: 'email',
        to: bride.email,
        subject: tpl.emailSubject,
        body: tpl.emailText,
        html: tpl.emailHtml,
        customer: job.customer,
        kind: 'pickup',
      });
      if (r.ok) sent++;
    }
    setNotifyingId('');
    toast(
      sent > 0
        ? { title: `Pickup notice sent to ${job.customer}`, description: `${sent} message(s) delivered.` }
        : { title: 'Nothing sent', description: 'No usable email or phone on file.', variant: 'destructive' },
    );
  };

  return (
    <div>
      <PageHeader
        title="Alterations"
        subtitle={`${active.length} active jobs · ${readyForPickup.length} ready for pickup`}
        action={
          <button onClick={() => setModalOpen(true)} className={btnPrimary}>
            <Plus className="h-4 w-4" /> New Alteration Job
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active jobs"
          value={String(active.length)}
          sub="In the sewing room now"
          icon={<Scissors className="h-5 w-5" />}
          accent="violet"
        />
        <StatCard
          label="Due within 3 weeks"
          value={String(dueSoon.length)}
          sub="Pickup deadlines approaching"
          icon={<CalendarClock className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          label="Ready for pickup"
          value={String(readyForPickup.length)}
          sub="Pressed, bagged & waiting"
          icon={<PackageCheck className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <div className="mb-5 flex gap-2">
        {(['Active', 'All'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
            }`}
          >
            {f === 'Active' ? 'Active jobs' : 'All jobs'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-stone-200/80 bg-white py-16 text-center shadow-sm">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-rose-400" />
          <p className="mt-3 text-sm text-stone-500">Loading alteration jobs…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {scoped.map((job) => {
            const progress = jobProgress(job);
            const daysToDue = job.dueDate
              ? Math.ceil((new Date(job.dueDate + 'T12:00:00').getTime() - Date.now()) / 86400000)
              : null;
            return (
              <div key={job.id} className="flex flex-col rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <BridalIdentity
                      customer={allBrides.find((b) => b.name.toLowerCase() === job.customer.toLowerCase()) || { name: job.customer }}
                      size="xs"
                      showName
                    />
                    <p className="truncate text-xs text-stone-500" title={job.gown}>{job.gown}</p>
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      {job.id} · {locationById(job.location).short}
                    </p>
                  </div>
                  <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_COLORS[job.status]}`}>
                    {job.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>{job.tasks.filter((t) => t.done).length}/{job.tasks.length} tasks done</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-rose-400'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Task checklist */}
                <div className="mt-3 space-y-1.5">
                  {job.tasks.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => toggleTask(job, i)}
                      className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs transition-colors hover:bg-stone-50"
                    >
                      {t.done ? (
                        <CheckSquare className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                      ) : (
                        <Square className="h-4 w-4 flex-shrink-0 text-stone-300" />
                      )}
                      <span className={t.done ? 'text-stone-400 line-through' : 'text-stone-700'}>{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-stone-500">
                  <p>Seamstress: <span className="font-medium text-stone-700">{job.seamstress || '—'}</span></p>
                  <p>Quote: <span className="font-medium text-stone-700">{job.priceCents ? formatCents(job.priceCents) : '—'}</span></p>
                  <p>Next fitting: <span className="font-medium text-stone-700">{job.nextFitting ? formatDate(job.nextFitting) : '—'}</span></p>
                  <p>
                    Pickup by:{' '}
                    <span className={`font-medium ${daysToDue !== null && daysToDue <= 14 && job.status !== 'Picked Up' ? 'text-rose-600' : 'text-stone-700'}`}>
                      {job.dueDate ? formatDate(job.dueDate) : '—'}
                      {daysToDue !== null && job.status !== 'Picked Up' && daysToDue >= 0 && ` (${daysToDue}d)`}
                    </span>
                  </p>
                </div>
                {job.notes && <p className="mt-2 rounded-lg bg-stone-50 p-2 text-[11px] text-stone-500">{job.notes}</p>}

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3">
                  {job.status !== 'Picked Up' && (
                    <button
                      onClick={() => advance(job)}
                      className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                    >
                      {ALTERATION_STATUSES[ALTERATION_STATUSES.indexOf(job.status) + 1]}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {job.status === 'Ready for Pickup' && (
                    <button
                      onClick={() => notifyPickup(job)}
                      disabled={notifyingId === job.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {notifyingId === job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                      Notify bride
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {scoped.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-stone-300 bg-white/60 py-14 text-center text-sm text-stone-500">
              No alteration jobs {filter === 'Active' ? 'in progress' : 'yet'} — start one with "New Alteration Job".
            </div>
          )}
        </div>
      )}

      <NewJobModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        brideNames={brides.map((b) => b.name)}
        jobs={jobs}
        onCreated={(rec) => setJobs((prev) => [rec, ...prev])}
      />
    </div>
  );
}

function NewJobModal({
  open,
  onClose,
  brideNames,
  jobs,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  brideNames: string[];
  jobs: AlterationJob[];
  onCreated: (rec: AlterationJob) => void;
}) {
  const { allBrides, activeLocation } = useVowosData();
  const [customer, setCustomer] = useState('');
  const [gown, setGown] = useState('');
  const [seamstress, setSeamstress] = useState(SEAMSTRESSES[0]);
  const [selected, setSelected] = useState<string[]>(['Hem to floor length', 'Final steam & press']);
  const [customTask, setCustomTask] = useState('');
  const [nextFitting, setNextFitting] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<LocationId>(activeLocation === 'all' ? 'ido-br' : activeLocation);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AlterationSettings | null>(null);

  useEffect(() => {
    fetchAlterationSettings(location).then(setSettings).catch(console.error);
  }, [location]);

  const toggle = (label: string) =>
    setSelected((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));

  /** Suggest pickup 2 weeks before the bride's wedding when she's chosen. */
  const pickBride = (name: string) => {
    setCustomer(name);
    const bride = allBrides.find((b) => b.name === name);
    if (bride?.weddingDate) {
      const buffer = settings?.dueBufferDays ?? 14;
      const d = new Date(bride.weddingDate.slice(0, 10) + 'T12:00:00');
      d.setDate(d.getDate() - buffer);
      setDueDate(d.toISOString().slice(0, 10));
    }
    if (bride) setLocation(bride.location);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const tasks = [...selected];
    if (customTask.trim()) tasks.push(customTask.trim());
    if (!customer || !gown.trim() || tasks.length === 0) return;
    setSaving(true);
    const { record, error } = await createAlteration(
      {
        customer,
        gown: gown.trim(),
        seamstress,
        tasks,
        nextFitting,
        dueDate,
        priceCents: Math.round(parseFloat(price || '0') * 100),
        notes: notes.trim(),
        location,
      },
      jobs,
    );
    setSaving(false);
    if (error || !record) {
      toast({ title: 'Could not create job', description: error ?? undefined, variant: 'destructive' });
      return;
    }
    onCreated(record);
    toast({ title: `Alteration job ${record.id} created` });
    setCustomer('');
    setGown('');
    setSelected(['Hem to floor length', 'Final steam & press']);
    setCustomTask('');
    setNextFitting('');
    setDueDate('');
    setPrice('');
    setNotes('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Alteration Job">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Bride *</label>
            <select required value={customer} onChange={(e) => pickBride(e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {brideNames.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Seamstress</label>
            <select value={seamstress} onChange={(e) => setSeamstress(e.target.value)} className={inputCls}>
              {SEAMSTRESSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Gown *</label>
          <input
            required
            value={gown}
            onChange={(e) => setGown(e.target.value)}
            className={inputCls}
            placeholder="Adeline — Ivory A-Line, Size 8"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Alteration tasks *</label>
          <div className="flex flex-wrap gap-1.5">
            {(settings?.services.map(s => s.name) || ALTERATION_TASK_PRESETS).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  selected.includes(t)
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={customTask}
            onChange={(e) => setCustomTask(e.target.value)}
            className={`${inputCls} mt-2`}
            placeholder="Custom task (optional)…"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Next fitting</label>
            <input type="date" value={nextFitting} onChange={(e) => setNextFitting(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Pickup by</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            <p className="mt-1 text-[10px] text-stone-400">Auto-set to {settings?.dueBufferDays ?? 14} days before her wedding.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Alterations quote</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`${inputCls} pl-7`}
                placeholder="425.00"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Store</label>
            <LocationSelect value={location} onChange={setLocation} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="Bride bringing shoes to next fitting…"
          />
        </div>
        <button type="submit" disabled={saving} className={`${btnPrimary} w-full justify-center disabled:opacity-60`}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
          {saving ? 'Creating…' : 'Create alteration job'}
        </button>
      </form>
    </Modal>
  );
}
