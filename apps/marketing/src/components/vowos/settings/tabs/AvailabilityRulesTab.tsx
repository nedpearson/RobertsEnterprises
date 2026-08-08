import { useEffect, useState } from 'react';
import { Calendar, Loader2, Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@/components/ui/switch';
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading scheduling guidelines…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Stylist Allocations & Rules"
        description="Define concurrent scheduling limits and cooldown periods for stylizing staff."
        icon={<Clock className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField
            label="Max simultaneous stylists per location"
            description="Controls the maximum number of simultaneous appointments allowed."
          >
            <input
              type="number"
              value={settings.maxSimultaneousStylists}
              onChange={(e) => setSettings({ ...settings, maxSimultaneousStylists: parseInt(e.target.value) || 1 })}
              className={inputCls}
              min="1"
              max="20"
            />
          </SettingsField>

          <SettingsField
            label="Stylist cooldown buffer (minutes)"
            description="Minimum rest period for stylists between appointments."
          >
            <input
              type="number"
              value={settings.stylistCooldownMinutes}
              onChange={(e) => setSettings({ ...settings, stylistCooldownMinutes: parseInt(e.target.value) || 0 })}
              className={inputCls}
              min="0"
              max="120"
            />
          </SettingsField>

          <SettingsField
            label="Allow overlapping appointments"
            description="Permit stylists to handle double bookings or staggered slots."
            className="sm:col-span-2"
          >
            <div className="flex items-center justify-between h-9 px-1">
              <span className="text-xs text-stone-500 font-medium">Double-booking permitted</span>
              <Switch
                checked={settings.allowOverlappingAppts}
                onCheckedChange={(checked) => setSettings({ ...settings, allowOverlappingAppts: checked })}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>
          </SettingsField>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Appointment Types & Buffers"
        description="Establish durations, preparation, and cleanup buffers for different services."
        icon={<Calendar className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
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
                      className="scale-90 data-[state=checked]:bg-rose-500"
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
      </SettingsCard>
    </div>
  );
}
