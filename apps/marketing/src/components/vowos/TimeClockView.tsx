import { useCallback, useEffect, useState } from 'react';
import { AlarmClock, LogIn, LogOut, Coffee, Repeat, MapPin, Loader2, ShieldAlert, Users, Building2, Clock, KeyRound, CheckCircle2, AlertTriangle, Sparkles, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OrganizationRole, STAFF_ROLES } from '@/lib/auth/roles';;
import { supabase } from '@/lib/supabase';
import { toast } from '@vowos/design-system';
import { getDepartments, writeAuditLog, Department } from '@/lib/services/workforceStore';
import { PageHeader, StatusBadge, Modal, inputCls, btnPrimary, btnSecondary, BeautifulEmptyState } from './ui';
import { LocationBadge } from './LocationSelect';
import { LOCATIONS, locationById, formatCents, formatDate } from '@/data/vowosData';

export interface TimeEntryMetadata {
  department: string;
  locationId: string;
  breaks: { type: 'rest' | 'meal'; start: string; end: string | null; paid: boolean }[];
  transfers: { department: string; locationId: string; timestamp: string }[];
  telemetry?: {
    lat?: number;
    lng?: number;
    accuracy?: number;
    /** Legacy flag from older punches; new punches record coordinates only. */
    geofenceVerified?: boolean;
    kioskMode?: boolean;
  };
  offline?: boolean;
}

export interface RawTimeEntry {
  id: string;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  note: string | null;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  pin?: string;
}

import { useDemo } from '@/lib/demo/demoContext';

export default function TimeClockView() {
  const { profile: authProfile, session } = useAuth();
  const { isDemoMode, activePersona } = useDemo();
  const profile = isDemoMode ? { id: 'demo-owner', role: activePersona.role, name: activePersona.name } as any : authProfile;

  const [loading, setLoading] = useState(false);
  const [openEntries, setOpenEntries] = useState<RawTimeEntry[]>([]);
  const [myOpen, setMyOpen] = useState<RawTimeEntry | null>(null);
  
  // Terminal Mode: 'personal' vs 'kiosk'
  const [terminalMode, setTerminalMode] = useState<'personal' | 'kiosk'>('personal');

  // Selected Location Filter & Punch Location
  const [activeLocationFilter, setActiveLocationFilter] = useState<string>('covington');
  const [chosenDept, setChosenDept] = useState('Bridal Styling');
  const [chosenLoc, setChosenLoc] = useState<string>('covington');

  // Simulation parameters

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetDept, setTargetDept] = useState('Bridal Styling');
  const [targetLoc, setTargetLoc] = useState('covington');

  // Kiosk PIN Modal
  const [kioskStaff, setKioskStaff] = useState<StaffMember | null>(null);
  const [kioskPin, setKioskPin] = useState('');
  const [showKioskPinModal, setShowKioskPinModal] = useState(false);

  // Roster of staff members
  // Populated from staff_profiles in loadData(); no seeded names.
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Live Timer ticker for active punches
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: openData } = await supabase
        .from('time_entries')
        .select('*')
        .is('clock_out', null);

      if (openData) {
        setOpenEntries(openData);
        if (profile) {
          const myOpenPunch = openData.find((e) => e.staff_name === profile.name) ?? null;
          setMyOpen(myOpenPunch);
        }
      }

      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('id, name, role');
      if (staffData && staffData.length > 0) {
        setStaffList(staffData.map(s => ({ ...s, role: s.role as OrganizationRole })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Parse metadata from time entry notes
  const getEntryMeta = (entry: RawTimeEntry | null): TimeEntryMetadata => {
    if (!entry?.note) return { department: 'Bridal Styling', locationId: 'covington', breaks: [], transfers: [] };
    try {
      if (entry.note.startsWith('{')) {
        return JSON.parse(entry.note);
      }
    } catch {
      // Not JSON
    }
    return { department: 'Bridal Styling', locationId: 'covington', breaks: [], transfers: [] };
  };

  const myMeta = getEntryMeta(myOpen);
  const myActiveBreak = myMeta.breaks?.find((b) => b.end === null) ?? null;

  const handleClockInForStaff = async (staffName: string, locId: string, deptName: string) => {
    setLoading(true);
    const timestamp = new Date().toISOString();
    
    // Real device position when the browser grants it; otherwise no coordinates
    // are recorded at all. (Previously every punch carried a fixed lat/lng in
    // Austin, TX and a hand-toggled "geofence verified" flag.)
    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition((pos) => resolve(pos), () => resolve(null), { timeout: 4000, maximumAge: 60000 });
    });
    const telemetry = position
      ? { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, kioskMode: terminalMode === 'kiosk' }
      : { kioskMode: terminalMode === 'kiosk' };

    const initialMeta: TimeEntryMetadata = {
      department: deptName,
      locationId: locId,
      breaks: [],
      transfers: [],
      telemetry
    };

    const noteStr = JSON.stringify(initialMeta);


    const { error } = await supabase.from('time_entries').insert({
      staff_name: staffName,
      clock_in: timestamp,
      note: noteStr
    });

    if (error) {
      toast({ title: 'Clock-in failed', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: `Clocked In · ${staffName}`,
        description: `Logged in at ${locationById(locId).short} (${deptName})`,
      });
      await writeAuditLog(staffName, 'Time Clock', `Clocked in at ${locId} (${deptName}).`);
      await loadData();
    }
    setLoading(false);
  };

  const handleClockOutForStaff = async (entry: RawTimeEntry) => {
    setLoading(true);
    const timestamp = new Date().toISOString();
    const meta = getEntryMeta(entry);

    // Close any active break
    if (meta.breaks) {
      meta.breaks = meta.breaks.map((b) => b.end === null ? { ...b, end: timestamp } : b);
    }


    const { error } = await supabase
      .from('time_entries')
      .update({
        clock_out: timestamp,
        note: JSON.stringify(meta)
      })
      .eq('id', entry.id);

    if (error) {
      toast({ title: 'Clock-out failed', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: `Clocked Out · ${entry.staff_name}`,
        description: `Shift completed at ${locationById(meta.locationId).short}`,
      });
      await writeAuditLog(entry.staff_name, 'Time Clock', `Clocked out from ${meta.locationId}.`);
      await loadData();
    }
    setLoading(false);
  };

  const handleStartBreak = async (type: 'rest' | 'meal', paid: boolean) => {
    if (!myOpen) return;
    setLoading(true);
    const timestamp = new Date().toISOString();

    const updatedMeta = { ...myMeta };
    if (!updatedMeta.breaks) updatedMeta.breaks = [];
    updatedMeta.breaks.push({
      type,
      start: timestamp,
      end: null,
      paid
    });

    const { error } = await supabase
      .from('time_entries')
      .update({ note: JSON.stringify(updatedMeta) })
      .eq('id', myOpen.id);

    if (error) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Break Started', description: `Started ${paid ? 'paid' : 'unpaid'} ${type} break!` });
      await loadData();
    }
    setLoading(false);
  };

  const handleEndBreak = async () => {
    if (!myOpen || !myActiveBreak) return;
    setLoading(true);
    const timestamp = new Date().toISOString();

    const updatedMeta = { ...myMeta };
    updatedMeta.breaks = updatedMeta.breaks.map((b) =>
      b.end === null ? { ...b, end: timestamp } : b
    );

    const { error } = await supabase
      .from('time_entries')
      .update({ note: JSON.stringify(updatedMeta) })
      .eq('id', myOpen.id);

    if (error) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Break Ended', description: 'Welcome back to work!' });
      await loadData();
    }
    setLoading(false);
  };

  const handleTransferShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myOpen) return;
    setLoading(true);
    const timestamp = new Date().toISOString();

    const updatedMeta = { ...myMeta };
    if (!updatedMeta.transfers) updatedMeta.transfers = [];
    updatedMeta.transfers.push({
      department: targetDept,
      locationId: targetLoc,
      timestamp
    });
    updatedMeta.department = targetDept;
    updatedMeta.locationId = targetLoc;

    const { error } = await supabase
      .from('time_entries')
      .update({ note: JSON.stringify(updatedMeta) })
      .eq('id', myOpen.id);

    setShowTransferModal(false);
    if (error) {
      toast({ title: 'Transfer failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Shift Transferred', description: `Transferred to ${locationById(targetLoc).short} (${targetDept}).` });
      await writeAuditLog(profile?.name || 'Staff', 'Time Clock', `Transferred shift to ${targetLoc}.`);
      await loadData();
    }
    setLoading(false);
  };

  // Calculate elapsed time formatted HH:MM:SS
  const formatElapsed = (startStr: string) => {
    const elapsedMs = Math.max(0, now.getTime() - new Date(startStr).getTime());
    const seconds = Math.floor((elapsedMs / 1000) % 60);
    const minutes = Math.floor((elapsedMs / (1000 * 60)) % 60);
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filter roster by selected location
  const locationOpenEntries = openEntries.filter(e => {
    if (activeLocationFilter === 'all') return true;
    const m = getEntryMeta(e);
    return m.locationId === activeLocationFilter;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Time Clock & Location Kiosk"
        subtitle="Per-location employee punch terminal, live store shift roster, and break tracking"
        action={
          <div className="flex items-center gap-2">


          </div>
        }
      />

      {/* Terminal Mode Switcher & Location Scope Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTerminalMode('personal')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              terminalMode === 'personal'
                ? 'bg-[#a98a4b] text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            My Punch Terminal
          </button>
          <button
            onClick={() => setTerminalMode('kiosk')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              terminalMode === 'kiosk'
                ? 'bg-[#a98a4b] text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Boutique Floor Kiosk Mode (Multi-Staff)
          </button>
        </div>

        {/* Location Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-stone-400 mr-1 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> Store Location:
          </span>
          <button
            onClick={() => setActiveLocationFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeLocationFilter === 'all'
                ? 'bg-stone-900 text-white font-semibold'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Locations
          </button>
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                setActiveLocationFilter(loc.id);
                setChosenLoc(loc.id);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeLocationFilter === loc.id
                  ? 'bg-brand-primary text-white font-semibold shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {loc.short}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Terminal Section (Left Side - 7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {terminalMode === 'personal' ? (
            /* Personal Employee Punch Terminal Card */
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 font-serif text-lg font-bold text-white shadow-md">
                    {profile?.name ? profile.name[0].toUpperCase() : 'S'}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900">{profile?.name}</h3>
                    <p className="text-xs text-stone-500">{profile?.role} · Personal Punch Station</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Shift Timer</span>
                  <span className="font-mono text-2xl font-bold text-stone-900">
                    {myOpen ? formatElapsed(myOpen.clock_in) : '00:00:00'}
                  </span>
                </div>
              </div>

              {/* Active Punch Status Banner */}
              {myOpen ? (
                <div className={`rounded-xl border p-4 transition-all ${
                  myActiveBreak
                    ? 'border-status-warning/20 bg-status-warning/10/80 text-amber-900'
                    : 'border-emerald-200 bg-status-success/10/80 text-emerald-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${myActiveBreak ? 'bg-status-warning text-white' : 'bg-emerald-600 text-white'}`}>
                        {myActiveBreak ? <Coffee className="h-5 w-5" /> : <AlarmClock className="h-5 w-5 animate-pulse" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">
                          {myActiveBreak ? `ON ${myActiveBreak.paid ? 'PAID' : 'UNPAID'} ${myActiveBreak.type.toUpperCase()} BREAK` : 'ON SHIFT (CLOCKED IN)'}
                        </p>
                        <p className="text-xs mt-0.5 opacity-80">
                          {locationById(myMeta.locationId).short} · {myMeta.department} · Clocked in at {formatDate(myOpen.clock_in)}
                        </p>
                      </div>
                    </div>
                    <LocationBadge id={myMeta.locationId as any} />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-stone-600">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-300 text-stone-700">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-700">CLOCKED OUT</p>
                      <p className="text-xs text-stone-500 mt-0.5">Select your work location and role below to start your shift.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Shift Configuration Options (Location & Role Selection) */}
              {!myOpen && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-stone-50/70 p-4 rounded-xl border border-stone-100">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700 block">Boutique Shift Location</label>
                    <select
                      value={chosenLoc}
                      onChange={(e) => setChosenLoc(e.target.value)}
                      className={inputCls}
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.short} ({loc.address})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700 block">Work Activity / Role</label>
                    <select
                      value={chosenDept}
                      onChange={(e) => setChosenDept(e.target.value)}
                      className={inputCls}
                    >
                      <option value="Bridal Styling">Bridal Styling</option>
                      <option value="Alterations & Fitting">Alterations &amp; Fitting</option>
                      <option value="Front Desk & Concierge">Front Desk &amp; Concierge</option>
                      <option value="Inventory & Logistics">Inventory &amp; Logistics</option>
                      <option value="Floor Management">Floor Management</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {!myOpen ? (
                  <button
                    data-tour-id="btn-clock-in"
                    onClick={() => handleClockInForStaff(profile?.name || 'Staff', chosenLoc, chosenDept)}
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <LogIn className="h-5 w-5" /> Clock In at {locationById(chosenLoc).short}
                  </button>
                ) : (
                  <>
                    {myActiveBreak ? (
                      <button
                        onClick={handleEndBreak}
                        disabled={loading}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                      >
                        <Coffee className="h-4 w-4" /> End Break &amp; Return
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartBreak('rest', true)}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                        >
                          <Coffee className="h-4 w-4 text-status-warning" /> Paid Rest Break (15m)
                        </button>
                        <button
                          onClick={() => handleStartBreak('meal', false)}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                        >
                          <Coffee className="h-4 w-4 text-stone-500" /> Meal Break (30m)
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setShowTransferModal(true)}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      <Repeat className="h-4 w-4 text-sky-600" /> Transfer Shift
                    </button>

                    <button
                      onClick={() => myOpen && handleClockOutForStaff(myOpen)}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary-hover px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" /> Clock Out
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Boutique Floor Kiosk Mode (Multi-Staff Shared Station) */
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-primary-hover">
                    Floor Kiosk Station
                  </span>
                  <h3 className="text-base font-semibold text-stone-900 mt-1">
                    {locationById(chosenLoc).short} Boutique Punch Terminal
                  </h3>
                  <p className="text-xs text-stone-500">Tap your staff name to clock in, take a break, or clock out.</p>
                </div>
                <LocationBadge id={chosenLoc as any} />
              </div>

              {/* Staff Grid for Kiosk Punching */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {staffList.map((s) => {
                  const openPunch = openEntries.find((e) => e.staff_name === s.name);
                  const meta = getEntryMeta(openPunch ?? null);
                  const activeBreak = meta.breaks?.find((b) => b.end === null);

                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                        openPunch
                          ? activeBreak
                            ? 'border-status-warning/20 bg-status-warning/10/50'
                            : 'border-emerald-200 bg-status-success/10/50'
                          : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-white text-xs ${
                          openPunch ? 'bg-emerald-600' : 'bg-stone-500'
                        }`}>
                          {s.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-stone-900">{s.name}</p>
                          <p className="text-[11px] text-stone-500">{s.role}</p>
                          {openPunch && (
                            <span className="text-[10px] font-mono text-emerald-700 font-bold block mt-0.5">
                              {activeBreak ? 'On Break' : 'Clocked In'} · {formatElapsed(openPunch.clock_in)}
                            </span>
                          )}
                        </div>
                      </div>

                      {openPunch ? (
                        <button
                          onClick={() => handleClockOutForStaff(openPunch)}
                          className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover shadow-xs"
                        >
                          Clock Out
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setKioskStaff(s);
                            setShowKioskPinModal(true);
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                        >
                          Clock In
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live Location Roster (Right Side - 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#a98a4b]" />
                  Active Store Roster
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Currently on shift at {activeLocationFilter === 'all' ? 'All Boutiques' : locationById(activeLocationFilter).short}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                {locationOpenEntries.length} On Duty
              </span>
            </div>

            {locationOpenEntries.length === 0 ? (
              <BeautifulEmptyState
                icon={<Clock className="h-8 w-8" />}
                title="No Active Shifts"
                description="No employees currently clocked in at this location."
                colorHint="emerald"
              />
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {locationOpenEntries.map((e) => {
                  const m = getEntryMeta(e);
                  const activeBreak = m.breaks?.find((b) => b.end === null);

                  return (
                    <div key={e.id} className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-700 text-white font-bold text-xs">
                          {e.staff_name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900">{e.staff_name}</span>
                            {typeof m.telemetry?.lat === 'number' && (
                              <span className="inline-flex items-center text-[10px] text-status-success font-semibold gap-0.5" title={`${m.telemetry.lat.toFixed(4)}, ${m.telemetry.lng?.toFixed(4)}`}>
                                <CheckCircle2 className="h-3 w-3" /> GPS
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500">{m.department} · {locationById(m.locationId).short}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          activeBreak ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {activeBreak ? 'On Break' : 'Working'}
                        </span>
                        <span className="block font-mono text-xs font-semibold text-stone-700 mt-1">
                          {formatElapsed(e.clock_in)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Shift Location Modal */}
      <Modal open={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Shift Location / Activity">
        <form onSubmit={handleTransferShift} className="space-y-4">
          <p className="text-xs text-stone-500">
            Switch your active boutique store location or work assignment mid-shift without clocking out completely.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block">Target Boutique Location</label>
            <select value={targetLoc} onChange={(e) => setTargetLoc(e.target.value)} className={inputCls}>
              {LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.short} ({loc.address})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block">Target Work Activity</label>
            <select value={targetDept} onChange={(e) => setTargetDept(e.target.value)} className={inputCls}>
              <option value="Bridal Styling">Bridal Styling</option>
              <option value="Alterations & Fitting">Alterations &amp; Fitting</option>
              <option value="Front Desk & Concierge">Front Desk &amp; Concierge</option>
              <option value="Inventory & Logistics">Inventory &amp; Logistics</option>
              <option value="Floor Management">Floor Management</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
            <button type="button" onClick={() => setShowTransferModal(false)} className={btnSecondary}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={loading}>Confirm Transfer</button>
          </div>
        </form>
      </Modal>

      {/* Kiosk PIN Clock-In Modal */}
      {kioskStaff && (
        <Modal open={showKioskPinModal} onClose={() => setShowKioskPinModal(false)} title={`Clock In: ${kioskStaff.name}`}>
          <div className="space-y-4">
            <p className="text-xs text-stone-500">
              Confirm shift clock-in for <span className="font-bold text-stone-800">{kioskStaff.name}</span> at {locationById(chosenLoc).short}.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 block">Work Activity / Role</label>
              <select value={chosenDept} onChange={(e) => setChosenDept(e.target.value)} className={inputCls}>
                <option value="Bridal Styling">Bridal Styling</option>
                <option value="Alterations & Fitting">Alterations &amp; Fitting</option>
                <option value="Front Desk & Concierge">Front Desk &amp; Concierge</option>
                <option value="Inventory & Logistics">Inventory &amp; Logistics</option>
                <option value="Floor Management">Floor Management</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
              <button type="button" onClick={() => setShowKioskPinModal(false)} className={btnSecondary}>Cancel</button>
              <button
                onClick={async () => {
                  setShowKioskPinModal(false);
                  await handleClockInForStaff(kioskStaff.name, chosenLoc, chosenDept);
                }}
                className={btnPrimary}
                disabled={loading}
              >
                Confirm Clock-In
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
