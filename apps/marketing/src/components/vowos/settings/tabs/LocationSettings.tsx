import { useEffect, useState } from 'react';
import { MapPin, Loader2, Calendar, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { Switch } from '@/components/ui/switch';
import {
  LocationSettings,
  DEFAULT_LOCATION_SETTINGS,
  resolveEffectiveSetting,
  saveScopedSetting,
} from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';
import { LocationId, LOCATIONS } from '@/data/vowosData';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';

interface LocationSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function LocationSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: LocationSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Record<LocationId, LocationSettings>>(DEFAULT_LOCATION_SETTINGS);
  const [dbLocations, setDbLocations] = useState<Record<LocationId, LocationSettings>>(DEFAULT_LOCATION_SETTINGS);
  const [selectedLocId, setSelectedLocId] = useState<LocationId>('ido-br');

  // Holiday forms
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<Record<LocationId, LocationSettings>>(
      'location',
      'locations',
      { dataPlane },
      DEFAULT_LOCATION_SETTINGS
    );
    // Ensure all location structures exist
    const merged = { ...DEFAULT_LOCATION_SETTINGS, ...result.value };
    setLocations(merged);
    setDbLocations(JSON.parse(JSON.stringify(merged)));
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty = JSON.stringify(locations) !== JSON.stringify(dbLocations);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('location', 'locations', locations, { dataPlane }, 'Updated location configuration');
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
    setDbLocations(JSON.parse(JSON.stringify(locations)));
    return true;
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [locations]);

  const updateLoc = (updater: (loc: LocationSettings) => LocationSettings) => {
    setLocations((prev) => ({
      ...prev,
      [selectedLocId]: updater(prev[selectedLocId]),
    }));
  };

  const addHoliday = () => {
    if (!newHolidayName || !newHolidayDate) {
      toast({ title: 'Invalid Holiday', description: 'Provide a name and select a date.', variant: 'destructive' });
      return;
    }
    updateLoc((loc) => ({
      ...loc,
      holidayRules: [
        ...loc.holidayRules,
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading boutique locations…
      </div>
    );
  }

  const currentLoc = locations[selectedLocId];

  return (
    <div className="space-y-6">
      {/* Location selector tab header */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {LOCATIONS.map((loc) => {
          const active = selectedLocId === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => setSelectedLocId(loc.id)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                active
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {loc.short}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Details & Address */}
        <div className="lg:col-span-2 space-y-6">
          <SettingsCard
            title="Location Details"
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
                  value={currentLoc.phone}
                  onChange={(e) => updateLoc((l) => ({ ...l, phone: e.target.value }))}
                  className={inputCls}
                />
              </SettingsField>

              <div className="sm:col-span-2">
                <SettingsField label="Address">
                  <input
                    type="text"
                    value={currentLoc.address}
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
            icon={<Calendar className="h-5 w-5" />}
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
                          className="data-[state=checked]:bg-emerald-500"
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

              {currentLoc.holidayRules.length === 0 ? (
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
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
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
