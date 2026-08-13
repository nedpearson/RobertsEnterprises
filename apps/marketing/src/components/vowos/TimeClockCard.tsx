import { useCallback, useEffect, useState } from 'react';
import { AlarmClock, LogIn, LogOut, Coffee, Repeat, MapPin, WifiOff, Wifi, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@vowos/design-system';
import { getDepartments, writeAuditLog, Department } from '@/lib/services/workforceStore';
import { Modal, inputCls, btnPrimary, btnSecondary } from './ui';

interface TimeEntryMetadata {
  department: string;
  locationId: string;
  breaks: { type: 'rest' | 'meal'; start: string; end: string | null; paid: boolean }[];
  transfers: { department: string; locationId: string; timestamp: string }[];
  telemetry?: {
    lat: number;
    lng: number;
    accuracy: number;
    geofenceVerified: boolean;
    kioskMode?: boolean;
  };
  offline?: boolean;
}

interface RawTimeEntry {
  id: string;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  note: string | null;
}

export default function TimeClockCard() {
  const { profile, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [openEntries, setOpenEntries] = useState<RawTimeEntry[]>([]);
  const [myOpen, setMyOpen] = useState<RawTimeEntry | null>(null);
  
  // Simulation parameters
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<{ action: string; timestamp: string; payload: any }[]>([]);
  
  // Location and Department scopes
  const [departments, setDepartments] = useState<Department[]>([]);
  const [chosenDept, setChosenDept] = useState('Sales');
  const [chosenLoc, setChosenLoc] = useState('north');
  
  // Geofencing simulator
  const [gpsVerified, setGpsVerified] = useState(true);
  
  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetDept, setTargetDept] = useState('Sales');
  const [targetLoc, setTargetLoc] = useState('north');
  const [transferNote, setTransferNote] = useState('');

  const loadData = useCallback(async () => {
    if (!profile) return;
    try {
      const { data: openData } = await supabase
        .from('time_entries')
        .select('*')
        .is('clock_out', null);

      if (openData) {
        setOpenEntries(openData);
        const myOpenPunch = openData.find((e) => e.staff_name === profile.name) ?? null;
        setMyOpen(myOpenPunch);
      }

      const depts = await getDepartments();
      setDepartments(depts.filter((d) => d.active));
    } catch (err) {
      console.error(err);
    }
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!session || !profile) return null;

  // Parsed metadata from notes
  let meta: TimeEntryMetadata = { department: 'Sales', locationId: 'north', breaks: [], transfers: [] };
  if (myOpen?.note) {
    try {
      if (myOpen.note.startsWith('{')) {
        meta = JSON.parse(myOpen.note);
      }
    } catch {
      // Not JSON
    }
  }

  const activeBreak = meta.breaks?.find((b) => b.end === null) ?? null;

  const getPunchNoteString = (m: TimeEntryMetadata) => {
    return JSON.stringify(m);
  };

  const handleClockIn = async () => {
    setLoading(true);
    const timestamp = new Date().toISOString();
    
    // GPS Verification telemetry
    const telemetry = {
      lat: 30.2672 ,
      lng: -97.7431 ,
      accuracy: 10,
      geofenceVerified: gpsVerified
    };

    const initialMeta: TimeEntryMetadata = {
      department: chosenDept,
      locationId: chosenLoc,
      breaks: [],
      transfers: [],
      telemetry
    };

    if (isOffline) {
      // Queue locally
      const queueItem = {
        action: 'clock_in',
        timestamp,
        payload: { staff_name: profile.name, note: getPunchNoteString(initialMeta) }
      };
      setOfflineQueue((q) => [...q, queueItem]);
      toast({ title: 'Offline Mode: Punch Queued', description: 'Your clock-in has been stored locally.' });
      
      // Stage local optimistic open entry
      setMyOpen({
        id: 'temp-' + Date.now(),
        staff_name: profile.name,
        clock_in: timestamp,
        clock_out: null,
        note: getPunchNoteString(initialMeta)
      });
      setLoading(false);
      return;
    }

    if (!gpsVerified) {
      toast({
        title: 'Geofence Validation Failure',
        description: 'Unable to verify device location within store bounds. Punch routed to managers Exception Center.',
        variant: 'destructive'
      });
      await writeAuditLog(profile.name, 'Geofence Warning', `Clock-in geofence override at ${chosenLoc}.`);
    }

    const { error } = await supabase.from('time_entries').insert({
      staff_name: profile.name,
      clock_in: timestamp,
      note: getPunchNoteString(initialMeta)
    });

    if (error) {
      toast({ title: 'Clock-in failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Clocked In', description: `Have a great shift in ${chosenDept}!` });
      await writeAuditLog(profile.name, 'Time Clock', `Clocked in at ${chosenLoc} (${chosenDept}).`);
      await loadData();
    }
    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!myOpen) return;
    setLoading(true);
    const timestamp = new Date().toISOString();

    if (isOffline) {
      const queueItem = {
        action: 'clock_out',
        timestamp,
        payload: { id: myOpen.id }
      };
      setOfflineQueue((q) => [...q, queueItem]);
      toast({ title: 'Offline Mode: Punch Queued', description: 'Your clock-out has been stored locally.' });
      setMyOpen(null);
      setLoading(false);
      return;
    }

    // Close any active break
    if (activeBreak) {
      meta.breaks = meta.breaks.map((b) => b.end === null ? { ...b, end: timestamp } : b);
    }

    const { error } = await supabase
      .from('time_entries')
      .update({
        clock_out: timestamp,
        note: getPunchNoteString(meta)
      })
      .eq('id', myOpen.id);

    if (error) {
      toast({ title: 'Clock-out failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Clocked Out', description: 'Thank you for your shift. Have a wonderful rest of your day!' });
      await writeAuditLog(profile.name, 'Time Clock', `Clocked out.`);
      await loadData();
    }
    setLoading(false);
  };

  const handleStartBreak = async (type: 'rest' | 'meal', paid: boolean) => {
    if (!myOpen) return;
    setLoading(true);
    const timestamp = new Date().toISOString();

    const updatedMeta = { ...meta };
    updatedMeta.breaks.push({
      type,
      start: timestamp,
      end: null,
      paid
    });

    if (isOffline) {
      const queueItem = {
        action: 'start_break',
        timestamp,
        payload: { id: myOpen.id, meta: updatedMeta }
      };
      setOfflineQueue((q) => [...q, queueItem]);
      setMyOpen({ ...myOpen, note: getPunchNoteString(updatedMeta) });
      toast({ title: 'Offline Mode: Break Queued', description: `Started break (${type}) offline.` });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('time_entries')
      .update({ note: getPunchNoteString(updatedMeta) })
      .eq('id', myOpen.id);

    if (error) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Break Started', description: `Take a comfortable ${paid ? 'paid' : 'unpaid'} break!` });
      await loadData();
    }
    setLoading(false);
  };

  const handleEndBreak = async () => {
    if (!myOpen || !activeBreak) return;
    setLoading(true);
    const timestamp = new Date().toISOString();

    const updatedMeta = { ...meta };
    updatedMeta.breaks = updatedMeta.breaks.map((b) =>
      b.end === null ? { ...b, end: timestamp } : b
    );

    if (isOffline) {
      const queueItem = {
        action: 'end_break',
        timestamp,
        payload: { id: myOpen.id, meta: updatedMeta }
      };
      setOfflineQueue((q) => [...q, queueItem]);
      setMyOpen({ ...myOpen, note: getPunchNoteString(updatedMeta) });
      toast({ title: 'Offline Mode: Break Ended', description: 'Break ended offline.' });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('time_entries')
      .update({ note: getPunchNoteString(updatedMeta) })
      .eq('id', myOpen.id);

    if (error) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Break Ended', description: 'Welcome back to work!' });
      await loadData();
    }
    setLoading(false);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myOpen) return;
    setLoading(true);
    const timestamp = new Date().toISOString();

    const updatedMeta = { ...meta };
    updatedMeta.transfers.push({
      department: targetDept,
      locationId: targetLoc,
      timestamp
    });
    // Set active assignment
    updatedMeta.department = targetDept;
    updatedMeta.locationId = targetLoc;

    if (isOffline) {
      const queueItem = {
        action: 'transfer',
        timestamp,
        payload: { id: myOpen.id, meta: updatedMeta }
      };
      setOfflineQueue((q) => [...q, queueItem]);
      setMyOpen({ ...myOpen, note: getPunchNoteString(updatedMeta) });
      toast({ title: 'Offline Mode: Transfer Queued', description: `Transferred to ${targetDept} offline.` });
      setShowTransferModal(false);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('time_entries')
      .update({ note: getPunchNoteString(updatedMeta) })
      .eq('id', myOpen.id);

    setShowTransferModal(false);
    if (error) {
      toast({ title: 'Transfer failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Shift Transferred', description: `Now logged in ${targetDept} at ${targetLoc}.` });
      await writeAuditLog(profile.name, 'Time Clock', `Transferred to ${targetLoc} (${targetDept}).`);
      await loadData();
    }
    setLoading(false);
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    setLoading(true);
    let success = true;

    for (const item of offlineQueue) {
      try {
        if (item.action === 'clock_in') {
          const { error } = await supabase.from('time_entries').insert(item.payload);
          if (error) success = false;
        } else if (item.action === 'clock_out') {
          const { error } = await supabase
            .from('time_entries')
            .update({ clock_out: item.timestamp })
            .eq('id', item.payload.id);
          if (error) success = false;
        } else if (['start_break', 'end_break', 'transfer'].includes(item.action)) {
          const { error } = await supabase
            .from('time_entries')
            .update({ note: getPunchNoteString(item.payload.meta) })
            .eq('id', item.payload.id);
          if (error) success = false;
        }
      } catch (err) {
        success = false;
        console.error(err);
      }
    }

    if (success) {
      toast({ title: 'Sync Successful', description: `${offlineQueue.length} queue punches written authoritatively.` });
      setOfflineQueue([]);
    } else {
      toast({ title: 'Sync completed with warnings', description: 'Some queued transactions failed. Retrying shortly.', variant: 'destructive' });
    }
    await loadData();
    setLoading(false);
  };

  return (
    <div className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${myOpen ? (activeBreak ? 'bg-amber-100 text-status-warning' : 'bg-emerald-100 text-status-success') : 'bg-stone-100 text-stone-500'}`}>
            <AlarmClock className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900">Workforce Time Clock</h4>
            <p className="text-xs text-stone-500">
              {myOpen
                ? activeBreak
                  ? `On break (${activeBreak.type === 'meal' ? 'Meal' : 'Rest'}) since ${new Date(activeBreak.start).toLocaleTimeString()}`
                  : `Working ${meta.department} at ${meta.locationId} since ${new Date(myOpen.clock_in).toLocaleTimeString()}`
                : 'Welcome! You are currently offline or out of shift.'}
            </p>
          </div>
        </div>

        {/* Offline control options */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsOffline(!isOffline);
              if (isOffline) syncOfflineQueue();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border font-medium ${isOffline ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'}`}
          >
            {isOffline ? <WifiOff className="h-3.5 w-3.5 text-red-500 animate-bounce" /> : <Wifi className="h-3.5 w-3.5 text-stone-400" />}
            {isOffline ? 'Simulating Offline' : 'Go Offline'}
          </button>

          {offlineQueue.length > 0 && (
            <button
              onClick={syncOfflineQueue}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 font-semibold shadow-sm"
            >
              Sync Queue ({offlineQueue.length})
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6">
        {/* Core Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {!myOpen ? (
            <>
              <div className="flex items-center gap-2">
                <select
                  value={chosenDept}
                  onChange={(e) => setChosenDept(e.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 focus:border-brand-primary focus:outline-none"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <select
                  value={chosenLoc}
                  onChange={(e) => setChosenLoc(e.target.value)}
                  className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 focus:border-brand-primary focus:outline-none"
                >
                  <option value="north">North Store</option>
                  <option value="south">South Store</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mr-2">
                <input
                  type="checkbox"
                  id="gpsCheck"
                  checked={gpsVerified}
                  onChange={(e) => setGpsVerified(e.target.checked)}
                  className="rounded text-brand-primary focus:ring-focus-ring h-3.5 w-3.5"
                />
                <label htmlFor="gpsCheck" className="text-xs text-stone-500 select-none flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-stone-400" /> GPS Geofence
                </label>
              </div>

              <button
                onClick={handleClockIn}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                Clock In
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-stone-850 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-stone-700 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                Clock Out
              </button>

              {!activeBreak ? (
                <>
                  <button
                    onClick={() => handleStartBreak('rest', true)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-750 hover:bg-stone-50 transition-colors disabled:opacity-60"
                  >
                    <Coffee className="h-3.5 w-3.5 text-stone-400" /> Rest Break
                  </button>
                  <button
                    onClick={() => handleStartBreak('meal', false)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-750 hover:bg-stone-50 transition-colors disabled:opacity-60"
                  >
                    <Coffee className="h-3.5 w-3.5 text-stone-400" /> Meal Break
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEndBreak}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-status-warning px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-60"
                >
                  <Coffee className="h-3.5 w-3.5" /> End Break
                </button>
              )}

              <button
                onClick={() => {
                  setTargetDept(meta.department);
                  setTargetLoc(meta.locationId);
                  setShowTransferModal(true);
                }}
                disabled={loading || !!activeBreak}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-250 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-60"
              >
                <Repeat className="h-3.5 w-3.5 text-stone-400" /> Transfer Shift
              </button>
            </>
          )}
        </div>

        {/* Live Directory Strip (Managers can see who is logged in VowOS now) */}
        {profile.role === 'Owner' || profile.role === 'Manager' ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-stone-400 uppercase tracking-wider text-[10px]">On Duty ({openEntries.length}):</span>
            {openEntries.length === 0 && <span className="text-stone-450 italic">Nobody on shifts</span>}
            {openEntries.map((e) => {
              let punchMeta: TimeEntryMetadata = { department: 'Sales', locationId: 'north', breaks: [], transfers: [] };
              try {
                if (e.note?.startsWith('{')) punchMeta = JSON.parse(e.note);
              } catch {
                // ignore
              }
              const isGpsError = punchMeta.telemetry?.geofenceVerified === false;
              return (
                <span
                  key={e.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border ${isGpsError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-status-success/10 text-emerald-700 border-emerald-250'}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isGpsError ? 'bg-red-500' : 'bg-status-success animate-pulse'}`} />
                  {e.staff_name} ({punchMeta.department})
                  {isGpsError && <ShieldAlert className="h-3.5 w-3.5 text-red-500" title="Geofence verification failed" />}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Transfer shift modal */}
      <Modal open={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Active Shift">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Target Department</label>
            <select
              value={targetDept}
              onChange={(e) => setTargetDept(e.target.value)}
              className={inputCls}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Target Location / Store</label>
            <select
              value={targetLoc}
              onChange={(e) => setTargetLoc(e.target.value)}
              className={inputCls}
            >
              <option value="north">North Store</option>
              <option value="south">South Store</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Activity / Assignment Notes</label>
            <textarea
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="e.g. Alterations fitting cover..."
              className={inputCls}
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
            <button type="button" onClick={() => setShowTransferModal(false)} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={loading}>
              Complete Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
