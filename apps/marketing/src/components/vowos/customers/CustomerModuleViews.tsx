import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCopy,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Ruler,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
} from 'lucide-react';
import { toast } from '@vowos/design-system';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { jsonBody, vowosApi } from '@/lib/api/vowosApi';

interface CustomerSummary {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  wedding_date?: string | null;
  stylist?: string | null;
  status?: string | null;
}

interface StyleProfile {
  id: string;
  customer_id: string;
  preferred_silhouettes: string[];
  favorite_designers: string[];
  aesthetics: string[];
  preferred_necklines: string[];
  preferred_colors: string[];
  disliked_styles: string[];
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  inspiration_links: string[];
  notes: string | null;
  updated_at: string;
  customer?: CustomerSummary | null;
}

interface MeasurementRecord {
  id: string;
  bride_id: string;
  customer?: string | null;
  taken_on: string;
  bust?: string | null;
  waist?: string | null;
  hips?: string | null;
  hollow_to_hem?: string | null;
  height?: string | null;
  heel_height?: string | null;
  street_size?: string | null;
  gown_size?: string | null;
  notes?: string | null;
  taken_by?: string | null;
  customer_record?: CustomerSummary | null;
}

interface PortalCustomer extends CustomerSummary {
  portal_token: string | null;
  portal_enabled: boolean;
  portal_token_rotated_at?: string | null;
}

const panel = 'rounded-2xl border border-stone-200 bg-white shadow-sm';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500';

function csvToArray(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function arrayToCsv(value: string[] | null | undefined): string {
  return (value ?? []).join(', ');
}

function dollarsToCents(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

function centsToDollars(value: number | null | undefined): string {
  return value == null ? '' : (value / 100).toFixed(2);
}

function customerOptionLabel(customer: CustomerSummary): string {
  return customer.email ? `${customer.name} · ${customer.email}` : customer.name;
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <div className={`${panel} flex min-h-48 items-center justify-center gap-3 text-sm text-stone-500`}>
      <Loader2 className="h-5 w-5 animate-spin" /> {message}
    </div>
  );
}

export function StyleProfilesView() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [profiles, setProfiles] = useState<StyleProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    preferred_silhouettes: '',
    favorite_designers: '',
    aesthetics: '',
    preferred_necklines: '',
    preferred_colors: '',
    disliked_styles: '',
    budget_min: '',
    budget_max: '',
    inspiration_links: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await vowosApi<{ profiles: StyleProfile[]; customers: CustomerSummary[] }>('/api/organization/customers/style-profiles');
      setProfiles(response.profiles ?? []);
      setCustomers(response.customers ?? []);
      setSelectedId((current) => current || response.customers?.[0]?.id || '');
    } catch (cause) {
      toast({ title: 'Could not load style profiles', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selectedCustomer = customers.find((customer) => customer.id === selectedId) ?? null;
  const selectedProfile = profiles.find((profile) => profile.customer_id === selectedId) ?? null;

  useEffect(() => {
    setForm({
      preferred_silhouettes: arrayToCsv(selectedProfile?.preferred_silhouettes),
      favorite_designers: arrayToCsv(selectedProfile?.favorite_designers),
      aesthetics: arrayToCsv(selectedProfile?.aesthetics),
      preferred_necklines: arrayToCsv(selectedProfile?.preferred_necklines),
      preferred_colors: arrayToCsv(selectedProfile?.preferred_colors),
      disliked_styles: arrayToCsv(selectedProfile?.disliked_styles),
      budget_min: centsToDollars(selectedProfile?.budget_min_cents),
      budget_max: centsToDollars(selectedProfile?.budget_max_cents),
      inspiration_links: arrayToCsv(selectedProfile?.inspiration_links),
      notes: selectedProfile?.notes ?? '',
    });
  }, [selectedProfile?.id, selectedId]);

  const filteredProfiles = useMemo(() => profiles.filter((profile) => {
    const customerName = profile.customer?.name ?? customers.find((customer) => customer.id === profile.customer_id)?.name ?? '';
    const haystack = [customerName, ...profile.preferred_silhouettes, ...profile.favorite_designers, ...profile.aesthetics].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [profiles, customers, query]);

  const save = async () => {
    if (!selectedId) return;
    const min = dollarsToCents(form.budget_min);
    const max = dollarsToCents(form.budget_max);
    if (form.budget_min.trim() && min === null) return toast({ title: 'Enter a valid minimum budget', variant: 'destructive' });
    if (form.budget_max.trim() && max === null) return toast({ title: 'Enter a valid maximum budget', variant: 'destructive' });
    if (min !== null && max !== null && min > max) return toast({ title: 'Minimum budget cannot exceed maximum budget', variant: 'destructive' });

    setSaving(true);
    try {
      const response = await vowosApi<{ profile: StyleProfile }>(`/api/organization/customers/style-profiles/${selectedId}`, {
        method: 'PUT',
        body: jsonBody({
          preferred_silhouettes: csvToArray(form.preferred_silhouettes),
          favorite_designers: csvToArray(form.favorite_designers),
          aesthetics: csvToArray(form.aesthetics),
          preferred_necklines: csvToArray(form.preferred_necklines),
          preferred_colors: csvToArray(form.preferred_colors),
          disliked_styles: csvToArray(form.disliked_styles),
          budget_min_cents: min,
          budget_max_cents: max,
          inspiration_links: csvToArray(form.inspiration_links),
          notes: form.notes,
        }),
      });
      setProfiles((current) => {
        const exists = current.some((profile) => profile.customer_id === selectedId);
        return exists
          ? current.map((profile) => profile.customer_id === selectedId ? response.profile : profile)
          : [response.profile, ...current];
      });
      toast({ title: 'Style profile saved', description: `${selectedCustomer?.name ?? 'Customer'} preferences are now available to authorized staff.` });
    } catch (cause) {
      toast({ title: 'Could not save style profile', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPanel message="Loading style profiles…" />;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className={`${panel} p-5`}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900"><Sparkles className="h-5 w-5 text-brand-primary" /> Style Profiles</h2>
            <p className="mt-1 text-sm text-stone-500">Real bride preferences used by consultants during appointments and recommendations.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>

        <label className={label}>Bride</label>
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mb-5 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm">
          <option value="">Select a bride</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customerOptionLabel(customer)}</option>)}
        </select>

        {selectedCustomer ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Preferred silhouettes', 'preferred_silhouettes', 'A-Line, Ballgown, Fit & Flare'],
              ['Favorite designers', 'favorite_designers', 'Monique Lhuillier, Ines Di Santo'],
              ['Aesthetic', 'aesthetics', 'Romantic, Clean, Editorial'],
              ['Necklines', 'preferred_necklines', 'Sweetheart, Square'],
              ['Preferred colors', 'preferred_colors', 'Ivory, Champagne'],
              ['Avoid / disliked styles', 'disliked_styles', 'Heavy beading, High neck'],
            ].map(([title, key, placeholder]) => (
              <div key={key}>
                <label className={label}>{title}</label>
                <Input value={form[key as keyof typeof form]} placeholder={placeholder} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
              </div>
            ))}
            <div>
              <label className={label}>Budget minimum</label>
              <Input inputMode="decimal" value={form.budget_min} placeholder="2500.00" onChange={(event) => setForm((current) => ({ ...current, budget_min: event.target.value }))} />
            </div>
            <div>
              <label className={label}>Budget maximum</label>
              <Input inputMode="decimal" value={form.budget_max} placeholder="6000.00" onChange={(event) => setForm((current) => ({ ...current, budget_max: event.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Inspiration links</label>
              <Input value={form.inspiration_links} placeholder="Pinterest or image URLs, separated by commas" onChange={(event) => setForm((current) => ({ ...current, inspiration_links: event.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Consultant notes</label>
              <textarea value={form.notes} rows={4} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-stone-300 p-3 text-sm" placeholder="Fit observations, must-haves, family feedback, decision drivers…" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save Style Profile'}</Button>
            </div>
          </div>
        ) : <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">Add or select a customer to create a style profile.</p>}
      </section>

      <aside className={`${panel} p-4`}>
        <div className="relative mb-3"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search profiles" className="pl-9" /></div>
        <div className="space-y-2 max-h-[680px] overflow-y-auto">
          {filteredProfiles.map((profile) => {
            const customer = profile.customer ?? customers.find((row) => row.id === profile.customer_id);
            return (
              <button key={profile.id} type="button" onClick={() => setSelectedId(profile.customer_id)} className={`w-full rounded-xl border p-3 text-left ${selectedId === profile.customer_id ? 'border-brand-primary bg-rose-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                <p className="font-semibold text-stone-900">{customer?.name ?? 'Customer'}</p>
                <p className="mt-1 line-clamp-2 text-xs text-stone-500">{[...profile.preferred_silhouettes, ...profile.favorite_designers].join(' · ') || 'Profile saved'}</p>
              </button>
            );
          })}
          {!filteredProfiles.length && <p className="p-4 text-center text-sm text-stone-400">No saved style profiles match this search.</p>}
        </div>
      </aside>
    </div>
  );
}

const measurementFields = [
  ['Bust', 'bust'], ['Waist', 'waist'], ['Hips', 'hips'], ['Hollow to hem', 'hollow_to_hem'],
  ['Height', 'height'], ['Heel height', 'heel_height'], ['Street size', 'street_size'], ['Gown size', 'gown_size'],
] as const;

export function MeasurementsView() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    taken_on: new Date().toISOString().slice(0, 10), bust: '', waist: '', hips: '', hollow_to_hem: '', height: '', heel_height: '', street_size: '', gown_size: '', notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await vowosApi<{ measurements: MeasurementRecord[]; customers: CustomerSummary[] }>('/api/organization/customers/measurements');
      setRecords(response.measurements ?? []);
      setCustomers(response.customers ?? []);
      setSelectedId((current) => current || response.customers?.[0]?.id || '');
    } catch (cause) {
      toast({ title: 'Could not load measurements', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const selectedRecords = records.filter((record) => record.bride_id === selectedId);
  const selectedCustomer = customers.find((customer) => customer.id === selectedId);

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const response = await vowosApi<{ measurement: MeasurementRecord }>('/api/organization/customers/measurements', {
        method: 'POST',
        body: jsonBody({ customer_id: selectedId, ...form }),
      });
      setRecords((current) => [response.measurement, ...current]);
      setForm({ taken_on: new Date().toISOString().slice(0, 10), bust: '', waist: '', hips: '', hollow_to_hem: '', height: '', heel_height: '', street_size: '', gown_size: '', notes: '' });
      toast({ title: 'Measurements recorded', description: `A new fitting set was saved for ${selectedCustomer?.name ?? 'the customer'}.` });
    } catch (cause) {
      toast({ title: 'Could not save measurements', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const remove = async (record: MeasurementRecord) => {
    if (!window.confirm(`Delete measurements from ${record.taken_on}? This cannot be undone.`)) return;
    try {
      await vowosApi<void>(`/api/organization/customers/measurements/${record.id}`, { method: 'DELETE' });
      setRecords((current) => current.filter((item) => item.id !== record.id));
      toast({ title: 'Measurement set deleted' });
    } catch (cause) {
      toast({ title: 'Could not delete measurement set', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    }
  };

  if (loading) return <LoadingPanel message="Loading measurements…" />;

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className={`${panel} p-5`}>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Ruler className="h-5 w-5 text-brand-primary" />New Measurement Set</h2>
        <p className="mb-5 mt-1 text-sm text-stone-500">Capture each fitting as a dated snapshot so changes can be compared over time.</p>
        <label className={label}>Bride</label>
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mb-4 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm">
          <option value="">Select a bride</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customerOptionLabel(customer)}</option>)}
        </select>
        <label className={label}>Taken on</label><Input type="date" value={form.taken_on} onChange={(event) => setForm((current) => ({ ...current, taken_on: event.target.value }))} className="mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {measurementFields.map(([title, key]) => <div key={key}><label className={label}>{title}</label><Input value={form[key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></div>)}
        </div>
        <label className={`${label} mt-4`}>Notes</label>
        <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className="w-full rounded-lg border border-stone-300 p-3 text-sm" placeholder="Fit notes, posture, alteration observations…" />
        <Button className="mt-4 w-full" onClick={() => void save()} disabled={!selectedId || saving}><Plus className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Record Measurements'}</Button>
      </section>

      <section className={`${panel} p-5`}>
        <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Measurement History</h2><p className="text-sm text-stone-500">{selectedCustomer?.name ?? 'Select a bride'} · {selectedRecords.length} set{selectedRecords.length === 1 ? '' : 's'}</p></div><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
        <div className="space-y-3">
          {selectedRecords.map((record) => (
            <article key={record.id} className="rounded-xl border border-stone-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3"><div><p className="font-semibold text-stone-900">{record.taken_on}</p><p className="text-xs text-stone-400">Taken by {record.taken_by || 'staff'}</p></div><Button variant="ghost" size="sm" onClick={() => void remove(record)} className="text-red-600">Delete</Button></div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">{measurementFields.map(([title, key]) => <div key={key}><p className="text-[11px] uppercase tracking-wide text-stone-400">{title}</p><p className="text-sm font-medium text-stone-800">{record[key] || '—'}</p></div>)}</div>
              {record.notes && <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">{record.notes}</p>}
            </article>
          ))}
          {!selectedRecords.length && <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No measurements recorded for this bride yet.</div>}
        </div>
      </section>
    </div>
  );
}

export function CustomerPortalView() {
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await vowosApi<{ customers: PortalCustomer[] }>('/api/organization/customers/portal');
      setCustomers(response.customers ?? []);
    } catch (cause) {
      toast({ title: 'Could not load customer portals', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = customers.filter((customer) => [customer.name, customer.email, customer.phone].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));
  const portalUrl = (customer: PortalCustomer) => customer.portal_token
    ? `${window.location.origin}/portal/${customer.id}?t=${encodeURIComponent(customer.portal_token)}`
    : '';

  const toggle = async (customer: PortalCustomer, enabled: boolean) => {
    setBusyId(customer.id);
    try {
      const response = await vowosApi<{ customer: PortalCustomer }>(`/api/organization/customers/portal/${customer.id}`, { method: 'PATCH', body: jsonBody({ enabled }) });
      setCustomers((current) => current.map((item) => item.id === customer.id ? response.customer : item));
      toast({ title: enabled ? 'Portal enabled' : 'Portal disabled', description: enabled ? `${customer.name}'s private link is active.` : `${customer.name}'s existing link will no longer open the portal.` });
    } catch (cause) {
      toast({ title: 'Could not update portal', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally { setBusyId(null); }
  };

  const rotate = async (customer: PortalCustomer) => {
    if (!window.confirm(`Generate a new portal link for ${customer.name}? The old link will stop working immediately.`)) return;
    setBusyId(customer.id);
    try {
      const response = await vowosApi<{ customer: PortalCustomer }>(`/api/organization/customers/portal/${customer.id}/rotate-token`, { method: 'POST' });
      setCustomers((current) => current.map((item) => item.id === customer.id ? response.customer : item));
      toast({ title: 'Portal link rotated', description: 'The old token is invalid and a new private link is ready to share.' });
    } catch (cause) {
      toast({ title: 'Could not rotate portal link', description: cause instanceof Error ? cause.message : 'Unknown API error', variant: 'destructive' });
    } finally { setBusyId(null); }
  };

  const copy = async (customer: PortalCustomer) => {
    const url = portalUrl(customer);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Portal link copied', description: `Private link copied for ${customer.name}.` });
  };

  if (loading) return <LoadingPanel message="Loading customer portals…" />;

  return (
    <section className={`${panel} p-5`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-brand-primary" />Customer Portal</h2><p className="mt-1 text-sm text-stone-500">Enable, revoke, rotate, copy and open each customer's token-protected portal.</p></div>
        <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      <div className="relative mb-4 max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" className="pl-9" /></div>
      <div className="space-y-3">
        {filtered.map((customer) => {
          const url = portalUrl(customer);
          const busy = busyId === customer.id;
          return (
            <article key={customer.id} className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0"><p className="font-semibold text-stone-900">{customer.name}</p><p className="truncate text-sm text-stone-500">{customer.email || customer.phone || 'No contact information'}</p><div className="mt-2 flex items-center gap-2 text-xs"><span className={`rounded-full px-2 py-1 font-semibold ${customer.portal_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{customer.portal_enabled ? 'ACTIVE' : 'DISABLED'}</span>{customer.portal_token_rotated_at && <span className="text-stone-400">Token rotated {new Date(customer.portal_token_rotated_at).toLocaleDateString()}</span>}</div></div>
                <div className="flex flex-wrap items-center gap-2">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin text-brand-primary" /> : <Switch checked={customer.portal_enabled} onCheckedChange={(enabled) => void toggle(customer, enabled)} aria-label={`${customer.portal_enabled ? 'Disable' : 'Enable'} ${customer.name} portal`} />}
                  <Button variant="outline" size="sm" onClick={() => void rotate(customer)} disabled={busy}><KeyRound className="mr-2 h-4 w-4" />Rotate Link</Button>
                  <Button variant="outline" size="sm" onClick={() => void copy(customer)} disabled={!url || !customer.portal_enabled}><ClipboardCopy className="mr-2 h-4 w-4" />Copy</Button>
                  <Button size="sm" onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')} disabled={!url || !customer.portal_enabled}><ExternalLink className="mr-2 h-4 w-4" />Open</Button>
                </div>
              </div>
            </article>
          );
        })}
        {!filtered.length && <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500"><ToggleLeft className="mx-auto mb-2 h-6 w-6 text-stone-400" />No customers match this search.</div>}
      </div>
    </section>
  );
}
