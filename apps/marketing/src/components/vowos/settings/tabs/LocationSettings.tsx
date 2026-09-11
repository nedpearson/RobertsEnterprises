import { useEffect, useState } from 'react';
import { MapPin, Loader2, Calendar, Plus, Trash2, RefreshCw, Clock, CalendarOff } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { Switch } from '@vowos/design-system';
import {
  resolveEffectiveSetting,
  saveScopedSetting,
} from '@/lib/settings';
import { getActiveDataPlane, supabase } from '@/lib/supabase';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';

interface LocationSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface DBLocation {
  id: string;
  name: string;
  phone: string;
  address: string;
  short_name?: string;
}

export interface MergedLocation {
  id: string;
  name: string;
  phone: string;
  address: string;
  hours: Record<string, { open: string; close: string; closed: boolean }>;
  holidayRules: Array<{ name: string; date: string; closed: boolean }>;
}

export function LocationSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: LocationSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [dbLocationsList, setDbLocationsList] = useState<DBLocation[]>([]);
  const [locations, setLocations] = useState<Record<string, MergedLocation>>({});
  const [originalLocations, setOriginalLocations] = useState<Record<string, MergedLocation>>({});
  
  const [activeSubTab, setActiveSubTab] = useState<string>('');

  // Holiday forms
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    
    // 1. Fetch the true locations from `supabase.from('locations').select('*').order('name')`
    const { data: dbLocsResponse, error: dbError } = await supabase
      .from('locations')
      .select('*')
      .order('name');
      
    if (dbError) {
      toast({ title: 'Error loading locations', description: dbError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    
    const dbLocs: DBLocation[] = dbLocsResponse || [];
    setDbLocationsList(dbLocs);

    // 2. Fetch scoped setting JSON blob containing hours & holidayRules
    const result = await resolveEffectiveSetting<Record<string, Partial<MergedLocation>>>(
      'location',
      'locations',
      { dataPlane },
      {}
    );
    
    const settingsBlob = result.value || {};
    
    // 3. Merge them keyed by true location.id
    const merged: Record<string, MergedLocation> = {};
    for (const dbLoc of dbLocs) {
      const locSetting = settingsBlob[dbLoc.id] || {};
      merged[dbLoc.id] = {
        id: dbLoc.id,
        name: dbLoc.name || '',
        phone: dbLoc.phone || '',
        address: dbLoc.address || '',
        hours: locSetting.hours || DAYS_OF_WEEK.reduce((acc, day) => {
          acc[day] = { open: '10:00 AM', close: '05:00 PM', closed: day === 'Sunday' || day === 'Monday' };
          return acc;
        }, {} as Record<string, any>),
        holidayRules: locSetting.holidayRules || [],
      };
    }

    setLocations(merged);
    setOriginalLocations(JSON.parse(JSON.stringify(merged)));
    
    if (dbLocs.length > 0 && (!activeSubTab || !merged[activeSubTab])) {
      setActiveSubTab(dbLocs[0].id);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty = JSON.stringify(locations) !== JSON.stringify(originalLocations);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const dataPlane = getActiveDataPlane();
      
      // We must execute BOTH a supabase.from('locations').update(...) for the base fields, 
      // and saveScopedSetting for the hours/holidays JSON.
      
      for (const locId of Object.keys(locations)) {
        const loc = locations[locId];
        const { error } = await supabase
          .from('locations')
          .update({
            name: loc.name,
            phone: loc.phone,
            address: loc.address,
          })
          .eq('id', locId);
          
        if (error) {
          throw new Error(`Failed to update location ${loc.name}: ${error.message}`);
        }
      }
      
      const settingsPayload: Record<string, { hours: any, holidayRules: any }> = {};
      for (const locId of Object.keys(locations)) {
        const loc = locations[locId];
        settingsPayload[locId] = {
          hours: loc.hours,
          holidayRules: loc.holidayRules,
        };
      }
      
      await saveScopedSetting('location', 'locations', settingsPayload, { dataPlane }, 'Updated location configuration');
    } catch (err: any) {
      setSaving(false);
      toast({
        title: 'Could not save location settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }

    setSaving(false);
    toast({
      title: 'Settings saved',
      description: 'Location configurations and hours updated.',
    });
    setOriginalLocations(JSON.parse(JSON.stringify(locations)));
    
    setDbLocationsList(prev => prev.map(dbLoc => {
      const loc = locations[dbLoc.id];
      if (loc) {
        return { ...dbLoc, name: loc.name, phone: loc.phone, address: loc.address };
      }
      return dbLoc;
    }));
    
    return true;
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [locations]);

  const updateLoc = (updater: (loc: MergedLocation) => MergedLocation) => {
    setLocations((prev) => {
      if (!prev[activeSubTab]) return prev;
      return {
        ...prev,
        [activeSubTab]: updater(prev[activeSubTab]),
      };
    });
  };

  const addHoliday = () => {
    if (!newHolidayName || !newHolidayDate) {
      toast({ title: 'Invalid Holiday', description: 'Provide a name and select a date.', variant: 'destructive' });
      return;
    }
    updateLoc((loc) => ({
      ...loc,
      holidayRules: [
        ...(loc.holidayRules || []),
        { name: newHolidayName, date: newHolidayDate, closed: true },
      ],
    }));
    setNewHolidayName('');
    setNewHolidayDate('');
  };

  const removeHoliday = (index: number) => {
    updateLoc((loc) => ({
      ...loc,
      holidayRules: loc.holidayRules.filter((_, i) => i !== index),
    }));
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast({ title: 'Syncing Locations', description: 'Fetching latest schedules...' });
    setTimeout(() => {
      loadSettings().then(() => {
        setIsRefreshing(false);
        toast({ title: 'Sync Complete', description: 'Location schedules are up to date.' });
      });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading boutique locations…
      </div>
    );
  }

  const currentLoc = locations[activeSubTab];

  if (!currentLoc) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        No locations found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-2.5 text-orange-700">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Boutique Locations</h3>
              <p className="text-xs text-stone-500">
                Manage location details, standard hours, and holiday schedules for each physical store.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || saving}
            className={`${btnSecondary} gap-2`}
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Locations
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6 overflow-x-auto">
          {dbLocationsList.map(loc => (
            <button
              key={loc.id}
              onClick={() => setActiveSubTab(loc.id)}
              className={`whitespace-nowrap flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === loc.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <MapPin className="w-4 h-4" />
              {loc.short_name || loc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Details & Address */}
        <div className="lg:col-span-2 space-y-6">
          <SettingsCard
            title={`${currentLoc.name} Details`}
            description="Contact information and physical store parameters."
            icon={<MapPin className="h-5 w-5" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="Boutique Display name">
                <input
                  type="text"
                  value={currentLoc.name}
                  onChange={(e) => updateLoc((l) => ({ ...l, name: e.target.value }))}
                  className={inputCls}
                />
              </SettingsField>

              <SettingsField label="Store Phone number">
                <input
                  type="text"
                  value={currentLoc.phone || ''}
                  onChange={(e) => updateLoc((l) => ({ ...l, phone: e.target.value }))}
                  className={inputCls}
                />
              </SettingsField>

              <div className="sm:col-span-2">
                <SettingsField label="Address">
                  <input
                    type="text"
                    value={currentLoc.address || ''}
                    onChange={(e) => updateLoc((l) => ({ ...l, address: e.target.value }))}
                    className={inputCls}
                  />
                </SettingsField>
              </div>
            </div>
          </SettingsCard>

          {/* Business Hours */}
          <SettingsCard
            title="Standard Business Hours"
            description="Configure standard opening and closing times. Appointments can only be booked during open hours."
            icon={<Clock className="h-5 w-5" />}
          >
            <div className="divide-y divide-stone-100">
              {DAYS_OF_WEEK.map((day) => {
                const dayConfig = currentLoc.hours[day] || { open: '10:00 AM', close: '05:00 PM', closed: true };
                return (
                  <div key={day} className="flex items-center justify-between py-3">
                    <span className="w-28 text-sm font-medium text-stone-700">{day}</span>
                    
                    <div className="flex flex-1 items-center justify-end gap-3">
                      {!dayConfig.closed ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                          <input
                            type="text"
                            value={dayConfig.open}
                            onChange={(e) =>
                              updateLoc((l) => {
                                const newHours = { ...l.hours };
                                newHours[day] = { ...dayConfig, open: e.target.value };
                                return { ...l, hours: newHours };
                              })
                            }
                            className="w-24 text-center rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs focus:outline-none"
                            placeholder="e.g. 10:00 AM"
                          />
                          <span className="text-stone-400">to</span>
                          <input
                            type="text"
                            value={dayConfig.close}
                            onChange={(e) =>
                              updateLoc((l) => {
                                const newHours = { ...l.hours };
                                newHours[day] = { ...dayConfig, close: e.target.value };
                                return { ...l, hours: newHours };
                              })
                            }
                            className="w-24 text-center rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs focus:outline-none"
                            placeholder="e.g. 05:00 PM"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400 font-semibold uppercase italic mr-12">Closed</span>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">Active</span>
                        <Switch
                          checked={!dayConfig.closed}
                          onCheckedChange={(checked) =>
                            updateLoc((l) => {
                              const newHours = { ...l.hours };
                              newHours[day] = { ...dayConfig, closed: !checked };
                              return { ...l, hours: newHours };
                            })
                          }
                          className="data-[state=checked]:bg-status-success"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingsCard>
        </div>

        {/* Holidays & Overrides */}
        <div className="space-y-6">
          <SettingsCard
            title="Closed Dates & Holidays"
            description="Add holiday dates where the store is temporarily closed."
            icon={<CalendarOff className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <div className="grid gap-2">
                <input
                  type="text"
                  placeholder="Holiday label (e.g. Thanksgiving)"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                  <button
                    onClick={addHoliday}
                    className="flex h-9 items-center justify-center rounded-lg bg-stone-900 px-3 text-white transition-colors hover:bg-stone-800"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!currentLoc.holidayRules || currentLoc.holidayRules.length === 0 ? (
                <p className="text-center text-xs text-stone-400 py-6">No holiday closures set.</p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {currentLoc.holidayRules.map((rule, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 p-2.5"
                    >
                      <div>
                        <p className="text-xs font-semibold text-stone-800">{rule.name}</p>
                        <p className="text-[10px] text-stone-500">{rule.date}</p>
                      </div>
                      <button
                        onClick={() => removeHoliday(idx)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-brand-soft hover:text-brand-primary transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
