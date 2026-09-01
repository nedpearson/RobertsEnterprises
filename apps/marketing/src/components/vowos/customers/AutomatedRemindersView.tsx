import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from '@vowos/design-system';
import { vowosApi, jsonBody } from '@/lib/api/vowosApi';
import { Switch } from '@/components/ui/switch';

interface AutomationRule {
  id: string;
  name: string;
  rule_type: 'APPOINTMENT_REMINDER' | 'APPOINTMENT_FOLLOW_UP';
  channel: 'SMS' | 'EMAIL';
  timing_direction: 'BEFORE' | 'AFTER';
  offset_minutes: number;
  template_subject: string | null;
  template_body: string;
  enabled: boolean;
  location_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AutomationDelivery {
  id: string;
  channel: 'SMS' | 'EMAIL';
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
  rule: { id: string; name: string; rule_type: string; channel: string } | null;
  appointment: { id: string; start_at: string; end_at: string | null; status: string; type: string | null } | null;
  customer: { id: string; name: string; email: string | null; phone: string | null } | null;
}

interface LocationRow {
  id: string;
  name: string;
  is_active: boolean;
}

interface RuleResponse {
  rules: AutomationRule[];
  locations: LocationRow[];
}

interface DeliveryResponse {
  deliveries: AutomationDelivery[];
}

interface RuleDraft {
  name: string;
  rule_type: AutomationRule['rule_type'];
  channel: AutomationRule['channel'];
  offset_value: number;
  offset_unit: 'MINUTES' | 'HOURS' | 'DAYS';
  template_subject: string;
  template_body: string;
  enabled: boolean;
  location_id: string;
}

const defaultDraft = (): RuleDraft => ({
  name: '24-hour appointment reminder',
  rule_type: 'APPOINTMENT_REMINDER',
  channel: 'SMS',
  offset_value: 24,
  offset_unit: 'HOURS',
  template_subject: 'Your {{business_name}} appointment is coming up',
  template_body: 'Hi {{customer_name}}, this is a reminder for your {{appointment_type}} appointment on {{appointment_date}} at {{appointment_time}} at {{location_name}}. Reply if you need to make a change.',
  enabled: true,
  location_id: '',
});

const inputCls = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-100';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500';

function offsetMinutes(draft: RuleDraft): number {
  const multiplier = draft.offset_unit === 'DAYS' ? 1440 : draft.offset_unit === 'HOURS' ? 60 : 1;
  return Math.max(0, Math.round(Number(draft.offset_value || 0) * multiplier));
}

function draftFromRule(rule: AutomationRule): RuleDraft {
  const minutes = rule.offset_minutes;
  const unit: RuleDraft['offset_unit'] = minutes % 1440 === 0 && minutes >= 1440
    ? 'DAYS'
    : minutes % 60 === 0 && minutes >= 60
      ? 'HOURS'
      : 'MINUTES';
  const divisor = unit === 'DAYS' ? 1440 : unit === 'HOURS' ? 60 : 1;
  return {
    name: rule.name,
    rule_type: rule.rule_type,
    channel: rule.channel,
    offset_value: minutes / divisor,
    offset_unit: unit,
    template_subject: rule.template_subject || '',
    template_body: rule.template_body,
    enabled: rule.enabled,
    location_id: rule.location_id || '',
  };
}

function formatOffset(rule: AutomationRule): string {
  const minutes = rule.offset_minutes;
  const value = minutes % 1440 === 0 && minutes >= 1440
    ? `${minutes / 1440} day${minutes === 1440 ? '' : 's'}`
    : minutes % 60 === 0 && minutes >= 60
      ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}`
      : `${minutes} minute${minutes === 1 ? '' : 's'}`;
  return `${value} ${rule.timing_direction === 'BEFORE' ? 'before' : 'after'}`;
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusBadge(status: AutomationDelivery['status']) {
  const classes = status === 'SENT'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : status === 'FAILED'
      ? 'bg-red-50 text-red-700 border-red-200'
      : status === 'SKIPPED'
        ? 'bg-stone-100 text-stone-600 border-stone-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide ${classes}`}>{status}</span>;
}

export default function AutomatedRemindersView() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [deliveries, setDeliveries] = useState<AutomationDelivery[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(defaultDraft());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ruleData, deliveryData] = await Promise.all([
        vowosApi<RuleResponse>('/api/organization/communications/automations/rules'),
        vowosApi<DeliveryResponse>('/api/organization/communications/automations/deliveries?limit=150'),
      ]);
      setRules(ruleData.rules || []);
      setLocations(ruleData.locations || []);
      setDeliveries(deliveryData.deliveries || []);
    } catch (error) {
      toast({ title: 'Could not load automated reminders', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    active: rules.filter((rule) => rule.enabled).length,
    sent: deliveries.filter((delivery) => delivery.status === 'SENT').length,
    queued: deliveries.filter((delivery) => delivery.status === 'QUEUED').length,
    failed: deliveries.filter((delivery) => delivery.status === 'FAILED').length,
  }), [rules, deliveries]);

  const openNew = () => {
    setEditingId(null);
    setDraft(defaultDraft());
    setEditorOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setEditingId(rule.id);
    setDraft(draftFromRule(rule));
    setEditorOpen(true);
  };

  const saveRule = async () => {
    const minutes = offsetMinutes(draft);
    if (!draft.name.trim() || !draft.template_body.trim()) return;
    if (minutes > 10_080) {
      toast({ title: 'Timing is too far out', description: 'Automations can be scheduled up to 7 days before or after an appointment.', variant: 'destructive' });
      return;
    }
    if (draft.channel === 'EMAIL' && !draft.template_subject.trim()) {
      toast({ title: 'Email subject required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        rule_type: draft.rule_type,
        channel: draft.channel,
        offset_minutes: minutes,
        template_subject: draft.channel === 'EMAIL' ? draft.template_subject.trim() : null,
        template_body: draft.template_body.trim(),
        enabled: draft.enabled,
        location_id: draft.location_id || null,
      };
      if (editingId) {
        await vowosApi(`/api/organization/communications/automations/rules/${editingId}`, { method: 'PATCH', body: jsonBody(payload) });
        toast({ title: 'Automation rule updated' });
      } else {
        await vowosApi('/api/organization/communications/automations/rules', { method: 'POST', body: jsonBody(payload) });
        toast({ title: 'Automation rule created' });
      }
      setEditorOpen(false);
      await load();
    } catch (error) {
      toast({ title: 'Could not save automation rule', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: AutomationRule, enabled: boolean) => {
    setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled } : item));
    try {
      await vowosApi(`/api/organization/communications/automations/rules/${rule.id}`, {
        method: 'PATCH',
        body: jsonBody({ enabled }),
      });
      toast({ title: enabled ? `${rule.name} enabled` : `${rule.name} paused` });
    } catch (error) {
      setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled: rule.enabled } : item));
      toast({ title: 'Could not update rule', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    }
  };

  const archiveRule = async (rule: AutomationRule) => {
    if (!window.confirm(`Archive “${rule.name}”? Delivery history will be preserved.`)) return;
    try {
      await vowosApi(`/api/organization/communications/automations/rules/${rule.id}`, { method: 'DELETE' });
      toast({ title: 'Automation rule archived' });
      await load();
    } catch (error) {
      toast({ title: 'Could not archive rule', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const result = await vowosApi<{ due: number; queued: number; duplicates: number; errors: string[] }>('/api/organization/communications/automations/run', { method: 'POST', body: '{}' });
      toast({
        title: `Automation sweep complete`,
        description: `${result.queued} queued · ${result.duplicates} already queued · ${result.errors.length} errors`,
      });
      await load();
    } catch (error) {
      toast({ title: 'Automation sweep failed', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-brand-primary" />
            <h2 className="text-xl font-serif font-semibold text-stone-900">Automated Reminders</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-stone-500">Create appointment reminders and post-visit follow-ups. Every send is tenant-scoped, consent checked at delivery time, persisted to the customer thread, and tracked below.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void runNow()} disabled={running} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">
            {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run now
          </button>
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-stone-800">
            <Plus className="h-4 w-4" /> New rule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Active rules', value: stats.active, icon: BellRing },
          { label: 'Sent', value: stats.sent, icon: CheckCircle2 },
          { label: 'Queued', value: stats.queued, icon: Clock3 },
          { label: 'Failed', value: stats.failed, icon: XCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</span><Icon className="h-4 w-4 text-stone-400" /></div>
            <div className="mt-2 text-2xl font-semibold text-stone-900">{value}</div>
          </div>
        ))}
      </div>

      {editorOpen && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div><h3 className="font-semibold text-stone-900">{editingId ? 'Edit automation' : 'New automation'}</h3><p className="text-xs text-stone-500">Variables are rendered from the live appointment when the message is sent.</p></div>
            <button onClick={() => setEditorOpen(false)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2"><label className={labelCls}>Rule name</label><input className={inputCls} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></div>
            <div><label className={labelCls}>Action</label><select className={inputCls} value={draft.rule_type} onChange={(e) => setDraft((d) => ({ ...d, rule_type: e.target.value as RuleDraft['rule_type'] }))}><option value="APPOINTMENT_REMINDER">Reminder before appointment</option><option value="APPOINTMENT_FOLLOW_UP">Follow-up after appointment</option></select></div>
            <div><label className={labelCls}>Channel</label><select className={inputCls} value={draft.channel} onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value as RuleDraft['channel'] }))}><option value="SMS">SMS</option><option value="EMAIL">Email</option></select></div>
            <div><label className={labelCls}>Timing</label><div className="flex gap-2"><input className={inputCls} type="number" min="0" step="1" value={draft.offset_value} onChange={(e) => setDraft((d) => ({ ...d, offset_value: Number(e.target.value) }))} /><select className={`${inputCls} max-w-[130px]`} value={draft.offset_unit} onChange={(e) => setDraft((d) => ({ ...d, offset_unit: e.target.value as RuleDraft['offset_unit'] }))}><option value="MINUTES">Minutes</option><option value="HOURS">Hours</option><option value="DAYS">Days</option></select></div></div>
            <div><label className={labelCls}>Location</label><select className={inputCls} value={draft.location_id} onChange={(e) => setDraft((d) => ({ ...d, location_id: e.target.value }))}><option value="">All locations</option>{locations.filter((location) => location.is_active !== false).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
            <div className="flex items-end pb-2"><label className="flex items-center gap-3 text-sm font-medium text-stone-700"><Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))} /> Enabled immediately</label></div>
            {draft.channel === 'EMAIL' && <div className="md:col-span-2 lg:col-span-4"><label className={labelCls}>Email subject</label><input className={inputCls} value={draft.template_subject} onChange={(e) => setDraft((d) => ({ ...d, template_subject: e.target.value }))} /></div>}
            <div className="md:col-span-2 lg:col-span-4"><label className={labelCls}>Message template</label><textarea className={inputCls} rows={4} value={draft.template_body} onChange={(e) => setDraft((d) => ({ ...d, template_body: e.target.value }))} /><p className="mt-2 text-xs text-stone-400">Available: {'{{customer_name}}'}, {'{{appointment_date}}'}, {'{{appointment_time}}'}, {'{{appointment_type}}'}, {'{{stylist_name}}'}, {'{{location_name}}'}, {'{{business_name}}'}</p></div>
          </div>
          <div className="mt-5 flex justify-end gap-2"><button onClick={() => setEditorOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600">Cancel</button><button onClick={() => void saveRule()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save rule'}</button></div>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4"><div><h3 className="font-semibold text-stone-900">Rules</h3><p className="text-xs text-stone-500">Active rules are evaluated by the worker every minute.</p></div><button onClick={() => void load()} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
        <div className="divide-y divide-stone-100">
          {!loading && rules.length === 0 && <div className="p-8 text-center"><BellRing className="mx-auto h-8 w-8 text-stone-300" /><p className="mt-3 font-medium text-stone-700">No automation rules yet</p><p className="mt-1 text-sm text-stone-400">Create a reminder or follow-up rule to begin.</p></div>}
          {rules.map((rule) => (
            <div key={rule.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-stone-900">{rule.name}</span><span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">{rule.channel === 'SMS' ? <MessageSquare className="h-3 w-3" /> : <Mail className="h-3 w-3" />}{rule.channel}</span>{!rule.enabled && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">PAUSED</span>}</div><p className="mt-1 text-sm text-stone-500">{formatOffset(rule)} · {rule.rule_type === 'APPOINTMENT_REMINDER' ? 'Appointment reminder' : 'Post-visit follow-up'}{rule.location_id ? ` · ${locations.find((location) => location.id === rule.location_id)?.name || 'Location-specific'}` : ' · All locations'}</p><p className="mt-2 line-clamp-2 text-xs text-stone-400">{rule.template_body}</p></div>
              <div className="flex items-center gap-2"><Switch checked={rule.enabled} onCheckedChange={(enabled) => void toggleRule(rule, enabled)} /><button onClick={() => openEdit(rule)} className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-50" title="Edit"><Pencil className="h-4 w-4" /></button><button onClick={() => void archiveRule(rule)} className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-red-50 hover:text-red-600" title="Archive"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-4"><h3 className="font-semibold text-stone-900">Delivery history</h3><p className="text-xs text-stone-500">Provider sends, skipped messages, and failures from the durable queue.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-100 text-sm">
            <thead className="bg-stone-50/70"><tr>{['Customer', 'Rule', 'Appointment', 'Channel', 'Scheduled', 'Status'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-stone-100">
              {!loading && deliveries.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-400">No automation deliveries yet.</td></tr>}
              {deliveries.map((delivery) => <tr key={delivery.id} className="hover:bg-stone-50/60"><td className="px-4 py-3 font-medium text-stone-800">{delivery.customer?.name || 'Unknown customer'}{delivery.error_message && <p className="mt-1 max-w-[260px] truncate text-[11px] text-red-500" title={delivery.error_message}>{delivery.error_message}</p>}</td><td className="px-4 py-3 text-stone-600">{delivery.rule?.name || 'Archived rule'}</td><td className="px-4 py-3 text-stone-500">{delivery.appointment ? `${delivery.appointment.type || 'Appointment'} · ${formatWhen(delivery.appointment.start_at)}` : '—'}</td><td className="px-4 py-3 text-stone-500">{delivery.channel}</td><td className="px-4 py-3 text-stone-500">{formatWhen(delivery.scheduled_for)}</td><td className="px-4 py-3">{statusBadge(delivery.status)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
