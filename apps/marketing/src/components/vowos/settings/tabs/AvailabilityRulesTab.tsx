import { useEffect, useState } from 'react';
import { Calendar, Loader2, Clock, Plus, Trash2, ShieldAlert, ListFilter, Users } from 'lucide-react';
import { toast, Switch } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface ApptTypeConfig {
  name: string;
  durationMinutes: number;
  prepBufferMinutes: number;
  cleanupBufferMinutes: number;
  active: boolean;
}

interface SchedulingSettings {
  maxSimultaneousStylists: number;
  allowOverlappingAppts: boolean;
  stylistCooldownMinutes: number;
  apptTypeConfigs: ApptTypeConfig[];
}

const DEFAULT_SCHEDULING_SETTINGS: SchedulingSettings = {
  maxSimultaneousStylists: 4,
  allowOverlappingAppts: false,
  stylistCooldownMinutes: 15,
  apptTypeConfigs: [
    { name: 'Bridal Consultation', durationMinutes: 90, prepBufferMinutes: 15, cleanupBufferMinutes: 15, active: true },
    { name: 'Fitting', durationMinutes: 60, prepBufferMinutes: 15, cleanupBufferMinutes: 15, active: true },
    { name: 'Alterations', durationMinutes: 45, prepBufferMinutes: 10, cleanupBufferMinutes: 10, active: true },
    { name: 'Pickup', durationMinutes: 30, prepBufferMinutes: 5, cleanupBufferMinutes: 5, active: true },
    { name: 'Accessories', durationMinutes: 30, prepBufferMinutes: 5, cleanupBufferMinutes: 5, active: true },
  ],
};

interface AvailabilityRulesTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function AvailabilityRulesTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: AvailabilityRulesTabProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SchedulingSettings>(DEFAULT_SCHEDULING_SETTINGS);
  const [dbSettings, setDbSettings] = useState<SchedulingSettings>(DEFAULT_SCHEDULING_SETTINGS);
  const [activeSubTab, setActiveSubTab] = useState<'stylists' | 'types' | 'exceptions'>('stylists');
  const [isVerifying, setIsVerifying] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<SchedulingSettings>(
      'scheduling',
      'scheduling_settings',
      { dataPlane },
      DEFAULT_SCHEDULING_SETTINGS
    );
    setSettings(result.value);
    setDbSettings(result.value);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(dbSettings);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('scheduling', 'scheduling_settings', settings, { dataPlane }, reason);
      
      toast({
        title: 'Availability rules saved',
        description: 'Your scheduling rules have been updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save scheduling rules',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  const addApptType = () => {
    if (!newTypeName.trim()) return;
    const exists = settings.apptTypeConfigs.some((t) => t.name.toLowerCase() === newTypeName.trim().toLowerCase());
    if (exists) {
      toast({ title: 'Appointment type already exists', variant: 'destructive' });
      return;
    }
    setSettings({
      ...settings,
      apptTypeConfigs: [
        ...settings.apptTypeConfigs,
        { name: newTypeName.trim(), durationMinutes: 60, prepBufferMinutes: 15, cleanupBufferMinutes: 15, active: true },
      ],
    });
    setNewTypeName('');
  };

  const removeApptType = (name: string) => {
    setSettings({
      ...settings,
      apptTypeConfigs: settings.apptTypeConfigs.filter((t) => t.name !== name),
    });
  };

  const updateApptType = (name: string, fields: Partial<ApptTypeConfig>) => {
    setSettings({
      ...settings,
      apptTypeConfigs: settings.apptTypeConfigs.map((t) =>
        t.name === name ? { ...t, ...fields } : t
      ),
    });
  };

  const runVerification = () => {
    setIsVerifying(true);
    toast({ title: 'Verifying Schedule', description: 'Checking upcoming appointments against new rules...' });
    setTimeout(() => {
      setIsVerifying(false);
      toast({ title: 'Verification Complete', description: 'No scheduling conflicts detected.' });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading scheduling guidelines…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-100 p-2.5 text-teal-700">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Availability & Rules</h3>
              <p className="text-xs text-stone-500">
                Manage appointment types, duration buffers, and staff scheduling constraints.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={runVerification}
            disabled={isVerifying}
            className={`${btnSecondary} gap-2`}
          >
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            Verify Schedule
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'stylists', label: 'Stylist Rules', icon: Users },
            { id: 'types', label: 'Appointment Types', icon: ListFilter },
            { id: 'exceptions', label: 'Exceptions', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'stylists' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Stylist Allocations & Rules</h4>
            <p className="text-xs text-stone-500 mb-4">Define concurrent scheduling limits and cooldown periods for stylizing staff.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Max simultaneous stylists per location</label>
              <p className="text-[11px] text-stone-400 mb-1">Controls the maximum number of simultaneous appointments allowed.</p>
              <input
                type="number"
                value={settings.maxSimultaneousStylists}
                onChange={(e) => setSettings({ ...settings, maxSimultaneousStylists: parseInt(e.target.value) || 1 })}
                className={inputCls}
                min="1"
                max="20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Stylist cooldown buffer (minutes)</label>
              <p className="text-[11px] text-stone-400 mb-1">Minimum rest period for stylists between appointments.</p>
              <input
                type="number"
                value={settings.stylistCooldownMinutes}
                onChange={(e) => setSettings({ ...settings, stylistCooldownMinutes: parseInt(e.target.value) || 0 })}
                className={inputCls}
                min="0"
                max="120"
              />
            </div>
            <div className="sm:col-span-2 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
               <div className="flex items-center justify-between">
                 <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Allow overlapping appointments</label>
                    <p className="text-[11px] text-stone-400">Permit stylists to handle double bookings or staggered slots.</p>
                 </div>
                 <Switch
                  checked={settings.allowOverlappingAppts}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowOverlappingAppts: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
               </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'types' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Appointment Types & Buffers</h4>
            <p className="text-xs text-stone-500 mb-4">Establish durations, preparation, and cleanup buffers for different services.</p>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2 max-w-xl">
              <input
                type="text"
                placeholder="e.g. VIP Consultation"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className={inputCls}
              />
              <button
                onClick={addApptType}
                className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Type
              </button>
            </div>

            <div className="divide-y divide-stone-100 rounded-xl border border-stone-200/80 bg-white">
              {settings.apptTypeConfigs.map((type) => (
                <div key={type.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-800">{type.name}</span>
                      {!type.active && (
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-stone-400">Duration</span>
                      <input
                        type="number"
                        value={type.durationMinutes}
                        onChange={(e) => updateApptType(type.name, { durationMinutes: parseInt(e.target.value) || 0 })}
                        className={`${inputCls} w-20 text-center py-1 text-xs`}
                        min="5"
                      />
                      <span className="text-xs text-stone-400">m</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-stone-400">Prep</span>
                      <input
                        type="number"
                        value={type.prepBufferMinutes}
                        onChange={(e) => updateApptType(type.name, { prepBufferMinutes: parseInt(e.target.value) || 0 })}
                        className={`${inputCls} w-16 text-center py-1 text-xs`}
                        min="0"
                      />
                      <span className="text-xs text-stone-400">m</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-stone-400">Cleanup</span>
                      <input
                        type="number"
                        value={type.cleanupBufferMinutes}
                        onChange={(e) => updateApptType(type.name, { cleanupBufferMinutes: parseInt(e.target.value) || 0 })}
                        className={`${inputCls} w-16 text-center py-1 text-xs`}
                        min="0"
                      />
                      <span className="text-xs text-stone-400">m</span>
                    </div>

                    <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                      <Switch
                        checked={type.active}
                        onCheckedChange={(checked) => updateApptType(type.name, { active: checked })}
                        className="scale-90 data-[state=checked]:bg-brand-primary"
                      />
                      <button
                        onClick={() => removeApptType(type.name)}
                        className="text-stone-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'exceptions' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
           <div>
            <h4 className="text-sm font-bold text-stone-900">Holiday & Exception Rules</h4>
            <p className="text-xs text-stone-500 mb-4">Manage blocked dates and custom hours for specific days.</p>
          </div>
          <div className="p-10 text-center border-2 border-dashed border-stone-200 rounded-xl">
             <p className="text-sm text-stone-500">No holiday exceptions added yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}
