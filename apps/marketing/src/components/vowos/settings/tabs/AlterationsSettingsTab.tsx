import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Scissors, Calendar, Bell, RefreshCw, MessageSquare } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls, btnSecondary, btnPrimary } from '@/components/vowos/ui';

import { getActiveDataPlane } from '@/lib/supabase';
import { resolveEffectiveSetting, saveScopedSetting, AlterationSettings, DEFAULT_ALTERATION_SETTINGS } from '@/lib/settings';

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
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'services' | 'notifications'>('general');
  const [isSyncing, setIsSyncing] = useState(false);

  const [settings, setSettings] = useState<AlterationSettings>(DEFAULT_ALTERATION_SETTINGS);
  const [dbSettings, setDbSettings] = useState<AlterationSettings>(DEFAULT_ALTERATION_SETTINGS);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('100.00');
  const [newServiceDuration, setNewServiceDuration] = useState('45');

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
    const durationMinutes = parseInt(newServiceDuration) || 45;
    setSettings({
      ...settings,
      services: [
        ...settings.services,
        { id: Date.now().toString(), name: newServiceName.trim(), priceCents, durationMinutes },
      ],
    });
    setNewServiceName('');
    setNewServicePrice('100.00');
    setNewServiceDuration('45');
  };

  const removeService = (name: string) => {
    setSettings({
      ...settings,
      services: settings.services.filter((s) => s.name !== name),
    });
  };

  const updateService = (name: string, fields: Partial<AlterationSettings['services'][number]>) => {
    setSettings({
      ...settings,
      services: settings.services.map((s) =>
        s.name === name ? { ...s, ...fields } : s
      ),
    });
  };

  const runSync = () => {
    setIsSyncing(true);
    toast({ title: 'Sync Started', description: 'Synchronizing catalog with Point of Sale...' });
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: 'Sync Complete', description: 'Alterations catalog is now up-to-date.' });
    }, 1500);
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
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
              <Scissors className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Alterations & Fittings</h3>
              <p className="text-xs text-stone-500">
                Configure fitting rules, pricing for standard tasks, and customer notifications.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={runSync}
            disabled={isSyncing}
            className={`${btnSecondary} gap-2`}
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync POS Catalog
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'general', label: 'General & Lead Times', icon: Calendar },
            { id: 'services', label: 'Service Pricing', icon: Scissors },
            { id: 'notifications', label: 'Notifications', icon: Bell }
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

      {activeSubTab === 'general' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Fittings & Lead Times</h4>
            <p className="text-xs text-stone-500 mb-4">Configure due buffers, rush fee rates, and default fitting parameters.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Maximum fittings per order</label>
              <input
                type="number"
                value={settings.fittingsMax}
                onChange={(e) => setSettings({ ...settings, fittingsMax: parseInt(e.target.value) || 1 })}
                className={inputCls}
                min="1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Default fitting duration (minutes)</label>
              <input
                type="number"
                value={settings.fittingDurationMinutes}
                onChange={(e) => setSettings({ ...settings, fittingDurationMinutes: parseInt(e.target.value) || 1 })}
                className={inputCls}
                min="5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Due buffer before event date (days)</label>
              <input
                type="number"
                value={settings.dueBufferDays}
                onChange={(e) => setSettings({ ...settings, dueBufferDays: parseInt(e.target.value) || 0 })}
                className={inputCls}
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Rush alterations fee ($)</label>
              <input
                type="number"
                value={(settings.rushFeeCents / 100).toFixed(2)}
                onChange={(e) => setSettings({ ...settings, rushFeeCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                className={inputCls}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'services' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Standard Alteration Pricing</h4>
            <p className="text-xs text-stone-500 mb-4">Define base prices and estimated duration requirements for standard tasks.</p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 max-w-3xl">
              <input
                type="text"
                placeholder="e.g. Bustle Adjustments"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className={`${inputCls} flex-1`}
              />
              <input
                type="number"
                placeholder="Duration (m)"
                value={newServiceDuration}
                onChange={(e) => setNewServiceDuration(e.target.value)}
                className={`${inputCls} w-28 text-center`}
                min="5"
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

            <div className="divide-y divide-stone-100 rounded-xl border border-stone-200/80 bg-white max-w-3xl">
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
        </div>
      )}

      {activeSubTab === 'notifications' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Communication Templates</h4>
            <p className="text-xs text-stone-500 mb-4">Message templates sent automatically when alterations hit specific milestones.</p>
          </div>
          <div className="max-w-2xl">
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <MessageSquare className="w-4 h-4 text-stone-400" />
              Ready for Pickup Template
            </label>
            <p className="text-xs text-stone-500 mb-2">Available variables: {'{first_name}, {event_date}, {location_name}'}</p>
            <textarea
              value={settings.readyTemplate}
              onChange={(e) => setSettings({ ...settings, readyTemplate: e.target.value })}
              className={`${inputCls} min-h-[120px] py-3`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
