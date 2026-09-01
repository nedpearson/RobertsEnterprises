import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  Building2,
  CheckCircle2,
  Coffee,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { toast } from '@vowos/design-system';
import { jsonBody, vowosApi } from '@/lib/api/vowosApi';

interface LocationRow {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number | null;
}

interface StaffRow { id: string; name: string; role: string }
interface TimeEntry {
  id: string;
  business_id: string;
  location_id: string | null;
  user_id: string | null;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  department: string | null;
  source: 'PERSONAL' | 'MANAGER_KIOSK';
  clock_in_geofence_status: string | null;
  clock_in_distance_meters: number | null;
}
interface BreakRow {
  id: string;
  time_entry_id: string;
  break_type: 'REST' | 'MEAL';
  paid: boolean;
  started_at: string;
  ended_at: string | null;
}
interface TransferRow {
  id: string;
  time_entry_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  from_department: string | null;
  to_department: string;
  transferred_at: string;
}
interface TimeclockResponse {
  locations: LocationRow[];
  staff: StaffRow[];
  openEntries: TimeEntry[];
  openBreaks: BreakRow[];
  recentTransfers: TransferRow[];
  currentUserId: string;
  currentRole: string;
}
interface BrowserPosition { latitude: number; longitude: number; accuracy: number }

const DEPARTMENTS = [
  'Bridal Styling',
  'Alterations & Fitting',
  'Front Desk & Concierge',
  'Inventory & Logistics',
  'Floor Management',
];
const inputCls = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500';

function elapsed(start: string, now: number) {
  const ms = Math.max(0, now - new Date(start).getTime());
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
function when(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}
function geoBadge(status: string | null | undefined) {
  const normalized = status || 'UNAVAILABLE';
  const cls = normalized === 'VERIFIED'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : normalized === 'OUTSIDE'
      ? 'border-red-200 bg-red-50 text-red-700'
      : normalized === 'UNCONFIGURED'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-stone-200 bg-stone-100 text-stone-600';
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${cls}`}>{normalized.replaceAll('_', ' ')}</span>;
}

async function browserPosition(): Promise<BrowserPosition | null> {
  if (!('geolocation' in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 },
    );
  });
}

export default function TimeClockView() {
  const [data, setData] = useState<TimeclockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [locationId, setLocationId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [mode, setMode] = useState<'personal' | 'kiosk'>('personal');
  const [transferOpen, setTransferOpen] = useState(false);
  const [configureGeo, setConfigureGeo] = useState<LocationRow | null>(null);
  const [radius, setRadius] = useState('150');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await vowosApi<TimeclockResponse>('/api/organization/team/timeclock');
      setData(response);
      if (!locationId && response.locations[0]) setLocationId(response.locations[0].id);
    } catch (error) {
      toast({ title: 'Could not load time clock', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const myOpen = useMemo(() => data?.openEntries.find((entry) => entry.user_id === data.currentUserId) || null, [data]);
  const myBreak = useMemo(() => myOpen ? data?.openBreaks.find((row) => row.time_entry_id === myOpen.id) || null : null, [data, myOpen]);
  const canManage = data?.currentRole === 'OWNER' || data?.currentRole === 'STORE_MANAGER';
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  const punch = async (kind: 'in' | 'out', entry?: TimeEntry, staffUserId?: string) => {
    if (!online) {
      toast({ title: 'Connection required', description: 'VowOS does not claim an offline punch until it can durably sync it to the server.', variant: 'destructive' });
      return;
    }
    const selectedLocation = kind === 'in' ? locationId : entry?.location_id || '';
    if (!selectedLocation) return;
    setWorking(true);
    try {
      const position = await browserPosition();
      const body = jsonBody({
        location_id: selectedLocation,
        department,
        staff_user_id: staffUserId,
        position,
      });
      const path = staffUserId
        ? kind === 'in'
          ? '/api/organization/team/timeclock/kiosk/clock-in'
          : `/api/organization/team/timeclock/kiosk/clock-out/${entry?.id}`
        : kind === 'in'
          ? '/api/organization/team/timeclock/clock-in'
          : `/api/organization/team/timeclock/clock-out/${entry?.id}`;
      const response = await vowosApi<{ entry: TimeEntry; geofence: { status: string; distanceMeters: number | null } }>(path, { method: 'POST', body });
      const location = data?.locations.find((row) => row.id === response.entry.location_id);
      toast({
        title: kind === 'in' ? `Clocked in${staffUserId ? ` · ${response.entry.staff_name}` : ''}` : `Clocked out · ${response.entry.staff_name}`,
        description: `${location?.name || 'Location'} · ${response.geofence.status.replaceAll('_', ' ')}${response.geofence.distanceMeters !== null ? ` · ${Math.round(response.geofence.distanceMeters)}m from store` : ''}`,
      });
      await load();
    } catch (error) {
      toast({ title: kind === 'in' ? 'Clock-in failed' : 'Clock-out failed', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  const startBreak = async (type: 'REST' | 'MEAL', paid: boolean) => {
    if (!myOpen) return;
    setWorking(true);
    try {
      await vowosApi('/api/organization/team/timeclock/breaks/start', { method: 'POST', body: jsonBody({ entry_id: myOpen.id, break_type: type, paid }) });
      toast({ title: `${type === 'REST' ? 'Rest' : 'Meal'} break started` });
      await load();
    } catch (error) {
      toast({ title: 'Could not start break', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally { setWorking(false); }
  };

  const endBreak = async () => {
    if (!myBreak) return;
    setWorking(true);
    try {
      await vowosApi(`/api/organization/team/timeclock/breaks/${myBreak.id}/end`, { method: 'POST', body: '{}' });
      toast({ title: 'Break ended' });
      await load();
    } catch (error) {
      toast({ title: 'Could not end break', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally { setWorking(false); }
  };

  const transfer = async (toLocationId: string, toDepartment: string) => {
    if (!myOpen) return;
    setWorking(true);
    try {
      await vowosApi('/api/organization/team/timeclock/transfer', { method: 'POST', body: jsonBody({ entry_id: myOpen.id, to_location_id: toLocationId, to_department: toDepartment }) });
      toast({ title: 'Shift transferred', description: `${data?.locations.find((row) => row.id === toLocationId)?.name || 'Location'} · ${toDepartment}` });
      setTransferOpen(false);
      await load();
    } catch (error) {
      toast({ title: 'Could not transfer shift', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally { setWorking(false); }
  };

  const saveGeofence = async () => {
    if (!configureGeo) return;
    setWorking(true);
    try {
      const position = await browserPosition();
      if (!position) throw new Error('Current browser location could not be read. Grant location permission and try again while physically at the store.');
      await vowosApi(`/api/organization/team/timeclock/locations/${configureGeo.id}/geofence`, {
        method: 'PATCH',
        body: jsonBody({ latitude: position.latitude, longitude: position.longitude, geofence_radius_meters: Number(radius) }),
      });
      toast({ title: `${configureGeo.name} geofence configured`, description: `${radius}m radius centered on this device's current position.` });
      setConfigureGeo(null);
      await load();
    } catch (error) {
      toast({ title: 'Could not configure geofence', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally { setWorking(false); }
  };

  if (loading && !data) return <div className="p-8 text-sm text-stone-500">Loading live time-clock state…</div>;
  if (!data) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Time-clock data is unavailable.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><AlarmClock className="h-5 w-5 text-brand-primary" /><h2 className="text-xl font-serif font-semibold text-stone-900">Time Clock</h2></div>
          <p className="mt-1 max-w-3xl text-sm text-stone-500">Live employee punches, breaks, location transfers, and server-verified geofence status. No simulated GPS or browser-only punch queue.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${online ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? 'Server connection available' : 'Offline — punching disabled'}</span>
          <button onClick={() => void load()} className="rounded-xl border border-stone-200 bg-white p-2.5 text-stone-500 hover:bg-stone-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
        <button onClick={() => setMode('personal')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === 'personal' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>My Shift</button>
        {canManage && <button onClick={() => setMode('kiosk')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === 'kiosk' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>Manager Kiosk</button>}
      </div>

      {mode === 'personal' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Current shift</p><h3 className="mt-1 text-lg font-semibold text-stone-900">{myOpen ? myOpen.staff_name : 'Clocked out'}</h3>{myOpen && <p className="text-sm text-stone-500">{data.locations.find((row) => row.id === myOpen.location_id)?.name || 'Location'} · {myOpen.department || 'Department'}</p>}</div>
              <div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Elapsed</p><p className="mt-1 font-mono text-2xl font-bold text-stone-900">{myOpen ? elapsed(myOpen.clock_in, now) : '00:00:00'}</p></div>
            </div>

            {myOpen ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-emerald-900">{myBreak ? `On ${myBreak.paid ? 'paid' : 'unpaid'} ${myBreak.break_type.toLowerCase()} break` : 'On shift'}</p><p className="mt-1 text-xs text-emerald-700">Clocked in {when(myOpen.clock_in)} · source {myOpen.source.replaceAll('_', ' ').toLowerCase()}</p></div>{geoBadge(myOpen.clock_in_geofence_status)}</div></div>
                <div className="flex flex-wrap gap-2">
                  {myBreak ? <button disabled={working} onClick={() => void endBreak()} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Coffee className="h-4 w-4" /> End break</button> : <><button disabled={working} onClick={() => void startBreak('REST', true)} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700"><Coffee className="h-4 w-4" /> Paid rest</button><button disabled={working} onClick={() => void startBreak('MEAL', false)} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700"><Coffee className="h-4 w-4" /> Meal break</button></>}
                  <button disabled={working} onClick={() => setTransferOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700"><Repeat2 className="h-4 w-4" /> Transfer</button>
                  <button disabled={working || !online} onClick={() => void punch('out', myOpen)} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><LogOut className="h-4 w-4" /> Clock out</button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelCls}>Work location</label><select className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>{data.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div><div><label className={labelCls}>Department / activity</label><select className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)}>{DEPARTMENTS.map((value) => <option key={value}>{value}</option>)}</select></div></div>
                <button disabled={working || !online || !locationId} onClick={() => void punch('in')} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><LogIn className="h-4 w-4" /> Clock in with live location verification</button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-stone-400" /><h3 className="font-semibold text-stone-900">Store geofences</h3></div>
            <p className="mt-1 text-xs text-stone-500">Verification is calculated on the server against these configured store coordinates. Accuracy is included in the allowed radius.</p>
            <div className="mt-4 space-y-3">{data.locations.map((location) => <div key={location.id} className="rounded-xl border border-stone-100 bg-stone-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-stone-800">{location.name}</p><p className="mt-0.5 text-xs text-stone-400">{location.address || 'No address on file'}</p><p className="mt-1 text-xs text-stone-500">{location.latitude !== null && location.longitude !== null ? `${location.geofence_radius_meters || 150}m geofence configured` : 'Geofence not configured'}</p></div>{canManage && <button onClick={() => { setConfigureGeo(location); setRadius(String(location.geofence_radius_meters || 150)); }} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"><LocateFixed className="mr-1 inline h-3.5 w-3.5" /> Set</button>}</div></div>)}</div>
          </section>
        </div>
      ) : (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Users className="h-4 w-4 text-stone-400" /><h3 className="font-semibold text-stone-900">Manager Kiosk</h3></div><p className="mt-1 text-xs text-stone-500">Actions are authorized by the signed-in Owner/Store Manager and audited to that manager. VowOS does not use a fake client-side PIN.</p></div><ShieldCheck className="h-5 w-5 text-emerald-600" /></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className={labelCls}>Kiosk location</label><select className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>{data.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div><div><label className={labelCls}>Department</label><select className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)}>{DEPARTMENTS.map((value) => <option key={value}>{value}</option>)}</select></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.staff.map((staff) => {
            const open = data.openEntries.find((entry) => entry.user_id === staff.id) || null;
            const activeBreak = open ? data.openBreaks.find((row) => row.time_entry_id === open.id) : null;
            return <div key={staff.id} className={`rounded-xl border p-4 ${open ? 'border-emerald-200 bg-emerald-50/50' : 'border-stone-200 bg-white'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-stone-900">{staff.name}</p><p className="text-xs text-stone-400">{staff.role}</p>{open && <p className="mt-2 font-mono text-sm font-bold text-emerald-700">{elapsed(open.clock_in, now)}</p>}{activeBreak && <p className="mt-1 text-[11px] font-semibold text-amber-700">ON {activeBreak.break_type} BREAK</p>}</div>{open ? geoBadge(open.clock_in_geofence_status) : null}</div><div className="mt-4">{open ? <button disabled={working || !online} onClick={() => void punch('out', open, staff.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><LogOut className="h-3.5 w-3.5" /> Clock out</button> : <button disabled={working || !online || !locationId} onClick={() => void punch('in', undefined, staff.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><LogIn className="h-3.5 w-3.5" /> Clock in</button>}</div></div>;
          })}</div>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-4"><h3 className="font-semibold text-stone-900">Live floor roster</h3><p className="text-xs text-stone-500">{data.openEntries.length} open shift{data.openEntries.length === 1 ? '' : 's'} across the organization.</p></div>
        <div className="divide-y divide-stone-100">{data.openEntries.length === 0 ? <div className="p-8 text-center text-sm text-stone-400">No employees are clocked in.</div> : data.openEntries.map((entry) => <div key={entry.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-stone-900">{entry.staff_name}</p><p className="text-xs text-stone-500">{data.locations.find((row) => row.id === entry.location_id)?.name || 'Location'} · {entry.department || 'Department'} · in {when(entry.clock_in)}</p></div><div className="flex items-center gap-3"><span className="font-mono text-sm font-bold text-stone-700">{elapsed(entry.clock_in, now)}</span>{geoBadge(entry.clock_in_geofence_status)}</div></div>)}</div>
      </section>

      {!online && <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><WifiOff className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>Offline punching is not being faked.</strong> This screen remains readable from its last loaded state, but a punch requires a durable server write. A true IndexedDB/idempotent sync queue can be added separately if offline workforce punching becomes a product requirement.</div></div>}

      {myOpen?.clock_in_geofence_status === 'OUTSIDE' && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />Your active punch was recorded outside the configured store geofence. The server stored that exception for audit review.</div>}

      {transferOpen && myOpen && <TransferModal locations={data.locations} initialLocation={myOpen.location_id || locationId} initialDepartment={myOpen.department || department} onClose={() => setTransferOpen(false)} onSubmit={transfer} working={working} />}
      {configureGeo && <GeofenceModal location={configureGeo} radius={radius} setRadius={setRadius} working={working} onClose={() => setConfigureGeo(null)} onSave={saveGeofence} />}
    </div>
  );
}

function TransferModal({ locations, initialLocation, initialDepartment, working, onClose, onSubmit }: { locations: LocationRow[]; initialLocation: string; initialDepartment: string; working: boolean; onClose: () => void; onSubmit: (location: string, department: string) => Promise<void> }) {
  const [location, setLocation] = useState(initialLocation);
  const [department, setDepartment] = useState(initialDepartment);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-stone-900">Transfer active shift</h3><p className="text-xs text-stone-500">The transfer becomes a structured payroll/audit event.</p></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-4"><div><label className={labelCls}>Destination</label><select className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)}>{locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div><div><label className={labelCls}>Department</label><select className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)}>{DEPARTMENTS.map((value) => <option key={value}>{value}</option>)}</select></div></div><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={working} onClick={() => void onSubmit(location, department)} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Repeat2 className="h-4 w-4" /> Transfer</button></div></div></div>;
}

function GeofenceModal({ location, radius, setRadius, working, onClose, onSave }: { location: LocationRow; radius: string; setRadius: (value: string) => void; working: boolean; onClose: () => void; onSave: () => Promise<void> }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-stone-900">Configure {location.name} geofence</h3><p className="mt-1 text-xs text-stone-500">Stand at the store and use this device’s real GPS position as the geofence center.</p></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X className="h-4 w-4" /></button></div><div className="mt-5"><label className={labelCls}>Radius in meters</label><input type="number" min="25" max="5000" step="25" className={inputCls} value={radius} onChange={(e) => setRadius(e.target.value)} /></div><div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs text-stone-500"><Building2 className="mr-1 inline h-3.5 w-3.5" />{location.address || 'No address on file'}<br /><MapPin className="mr-1 inline h-3.5 w-3.5" />{location.latitude !== null && location.longitude !== null ? `Current center: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'No geofence center configured yet.'}</div><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={working} onClick={() => void onSave()} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><LocateFixed className="h-4 w-4" /> Use current GPS</button></div></div></div>;
}
