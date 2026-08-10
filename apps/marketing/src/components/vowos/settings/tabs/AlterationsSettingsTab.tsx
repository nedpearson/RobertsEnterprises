import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Scissors } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls, btnPrimary } from '@/components/vowos/ui';
import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';

interface AlterationService {
  name: string;
  priceCents: number;
  durationMinutes: number;
}

interface AlterationSettings {
  services: AlterationService[];
  maxFittings: number;
  fittingDurationMinutes: number;
  dueBufferDays: number;
  rushFeeCents: number;
  readyTemplate: string;
}

const DEFAULT_ALTERATION_SETTINGS: AlterationSettings = {
  services: [
    { name: 'Hemming', priceCents: 15000, durationMinutes: 60 },
    { name: 'Bustle', priceCents: 12000, durationMinutes: 45 },
    { name: 'Side seams intake', priceCents: 18000, durationMinutes: 90 },
    { name: 'Shoulder adjustments', priceCents: 9000, durationMinutes: 30 },
  ],
  maxFittings: 3,
  fittingDurationMinutes: 45,
  dueBufferDays: 14, // 2 weeks before event
  rushFeeCents: 7500, // $75
  readyTemplate: 'Hi {bride_name}, your gown alterations are complete and ready for pickup! Book a pickup appointment here: {pickup_link}',
};

interface AlterationsSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function AlterationsSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: AlterationsSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AlterationSettings>(DEFAULT_ALTERATION_SETTINGS);
  const [dbSettings, setDbSettings] = useState<AlterationSettings>(DEFAULT_ALTERATION_SETTINGS);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('100.00');

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<AlterationSettings>(
      'alteration_settings',
      'alteration_settings',
      { dataPlane },
      DEFAULT_ALTERATION_SETTINGS
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
    setSaving(true);
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('alteration_settings', 'alteration_settings', settings, { dataPlane }, reason);
      
      setSaving(false);
      toast({
        title: 'Alterations & Pickup settings saved',
        description: 'Fitting parameters and pricing have been updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      setSaving(false);
      toast({
        title: 'Could not save alterations settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  const addService = () => {
    if (!newServiceName.trim()) return;
    const exists = settings.services.some((s) => s.name.toLowerCase() === newServiceName.trim().toLowerCase());
    if (exists) {
      toast({ title: 'Service already exists', variant: 'destructive' });
      return;
    }
    const priceCents = Math.round(parseFloat(newServicePrice) * 100) || 0;
    setSettings({
      ...settings,
      services: [
        ...settings.services,
        { name: newServiceName.trim(), priceCents, durationMinutes: 45 },
      ],
    });
    setNewServiceName('');
    setNewServicePrice('100.00');
  };

  const removeService = (name: string) => {
    setSettings({
      ...settings,
      services: settings.services.filter((s) => s.name !== name),
    });
  };

  const updateService = (name: string, fields: Partial<AlterationService>) => {
    setSettings({
      ...settings,
      services: settings.services.map((s) =>
        s.name === name ? { ...s, ...fields } : s
      ),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading alterations parameters…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Fittings & Lead Times"
        description="Configure due buffers, rush fee rates, and default fitting parameters."
        icon={<Scissors className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField
            label="Maximum fittings per order"
            description="The default number of fitting sessions recommended for gowns."
          >
            <input
              type="number"
              value={settings.maxFittings}
              onChange={(e) => setSettings({ ...settings, maxFittings: parseInt(e.target.value) || 1 })}
              className={inputCls}
              min="1"
            />
          </SettingsField>

          <SettingsField
            label="Default fitting duration (minutes)"
            description="Slot duration allocated in the schedule for fitting sessions."
          >
            <input
              type="number"
              value={settings.fittingDurationMinutes}
              onChange={(e) => setSettings({ ...settings, fittingDurationMinutes: parseInt(e.target.value) || 1 })}
              className={inputCls}
              min="5"
            />
          </SettingsField>

          <SettingsField
            label="Due buffer before event date (days)"
            description="Gown must be finished this many days prior to the bride's wedding."
          >
            <input
              type="number"
              value={settings.dueBufferDays}
              onChange={(e) => setSettings({ ...settings, dueBufferDays: parseInt(e.target.value) || 0 })}
              className={inputCls}
              min="0"
            />
          </SettingsField>

          <SettingsField
            label="Rush alterations fee ($)"
            description="Additional fee applied for orders requiring expedited fittings."
          >
            <input
              type="number"
              value={(settings.rushFeeCents / 100).toFixed(2)}
              onChange={(e) => setSettings({ ...settings, rushFeeCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
              className={inputCls}
              min="0"
              step="0.01"
            />
          </SettingsField>

          <SettingsField
            label="Notification Template (Ready for Pickup)"
            description="Message template sent automatically when alterations are completed."
            className="sm:col-span-2"
          >
            <textarea
              value={settings.readyTemplate}
              onChange={(e) => setSettings({ ...settings, readyTemplate: e.target.value })}
              className={`${inputCls} min-h-[80px] py-2`}
            />
          </SettingsField>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Standard Alteration Pricing"
        description="Define base prices and estimated duration requirements for standard tasks."
        icon={<Scissors className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. Bustle Adjustments"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <input
              type="number"
              placeholder="Price ($)"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              className={`${inputCls} w-28 text-right`}
              step="0.01"
            />
            <button
              onClick={addService}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Task
            </button>
          </div>

          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200/80 bg-white">
            {settings.services.map((service) => (
              <div key={service.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                <div className="flex-1">
                  <span className="text-sm font-semibold text-stone-800">{service.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-stone-400">Duration</span>
                    <input
                      type="number"
                      value={service.durationMinutes}
                      onChange={(e) => updateService(service.name, { durationMinutes: parseInt(e.target.value) || 0 })}
                      className={`${inputCls} w-20 text-center py-1 text-xs`}
                      min="5"
                    />
                    <span className="text-xs text-stone-400">m</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-xs text-stone-400">Price</span>
                    <input
                      type="number"
                      value={(service.priceCents / 100).toFixed(2)}
                      onChange={(e) => updateService(service.name, { priceCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      className={`${inputCls} w-24 text-right py-1 text-xs`}
                      min="0"
                      step="0.01"
                    />
                    <span className="text-xs text-stone-400">$</span>
                  </div>

                  <button
                    onClick={() => removeService(service.name)}
                    className="text-stone-400 hover:text-red-500 p-1 pl-2 border-l border-stone-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
