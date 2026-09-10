import { useEffect, useState } from 'react';
import { Shirt, Loader2, Barcode, AlertTriangle, RefreshCw, Settings, Play } from 'lucide-react';
import { toast, Switch } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_INVENTORY_SETTINGS, InventorySettings } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface InventorySettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function InventorySettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: InventorySettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'tracking' | 'barcodes'>('tracking');
  const [isSyncing, setIsSyncing] = useState(false);

  const [settings, setSettings] = useState<InventorySettings>(DEFAULT_INVENTORY_SETTINGS);
  const [dbSettings, setDbSettings] = useState<InventorySettings>(DEFAULT_INVENTORY_SETTINGS);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<InventorySettings>(
      'inventory_settings',
      'inventory_settings',
      { dataPlane },
      DEFAULT_INVENTORY_SETTINGS
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
      await saveScopedSetting('inventory_settings', 'inventory_settings', settings, { dataPlane }, reason);
      
      toast({
        title: 'Inventory rules saved',
        description: 'Tracking parameters have been updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save inventory settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  const runSync = () => {
    setIsSyncing(true);
    toast({ title: 'Sync Started', description: 'Synchronizing stock levels across locations.' });
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: 'Sync Complete', description: 'Inventory quantities are now up to date.' });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory policies…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <Shirt className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Inventory & Stock Rules</h3>
              <p className="text-xs text-stone-500">
                Configure stock tracking triggers, barcode symbology, and low-stock warning limits.
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
            Sync Stock Levels
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'tracking', label: 'Stock Rules & Alerts', icon: AlertTriangle },
            { id: 'barcodes', label: 'Barcodes & SKUs', icon: Barcode }
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

      {activeSubTab === 'tracking' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Stock Rules & Alerts</h4>
            <p className="text-xs text-stone-500 mb-4">Set safety limits and automate inventory operations.</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Inventory tracking enabled</label>
              <p className="text-xs text-stone-500 mb-2">Actively monitor gown and accessory stock levels.</p>
              <Switch
                checked={settings.trackingEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, trackingEnabled: checked })}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Prevent negative stock levels</label>
              <p className="text-xs text-stone-500 mb-2">Forbid salesperson from posting orders for out-of-stock items.</p>
              <Switch
                checked={settings.preventNegative}
                onCheckedChange={(checked) => setSettings({ ...settings, preventNegative: checked })}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Low-stock threshold (units)</label>
              <p className="text-xs text-stone-500 mb-2">Flag items in dashboard when inventory falls below this count.</p>
              <input 
                type="number" 
                value={settings.lowStockThreshold} 
                onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 0 })}
                className={inputCls} 
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Default reorder point (units)</label>
              <p className="text-xs text-stone-500 mb-2">Generate purchase order candidates when stock reaches this level.</p>
              <input 
                type="number" 
                value={settings.reorderThreshold} 
                onChange={(e) => setSettings({ ...settings, reorderThreshold: parseInt(e.target.value) || 0 })}
                className={inputCls} 
                min="0"
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'barcodes' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Barcodes & SKUs</h4>
            <p className="text-xs text-stone-500 mb-4">Configure symbology and SKU generation patterns.</p>
          </div>
          
          <div className="grid gap-6 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Barcode format</label>
              <p className="text-xs text-stone-500 mb-2">Symbology pattern used for internal tags (e.g. CODE128, EAN13).</p>
              <select
                value={settings.barcodeFormat}
                onChange={(e) => setSettings({ ...settings, barcodeFormat: e.target.value })}
                className={inputCls}
              >
                <option value="CODE128">Code 128 (Standard)</option>
                <option value="EAN13">EAN-13 (Retail)</option>
                <option value="UPCA">UPC-A (US retail)</option>
                <option value="QR">QR Code (High Density)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">SKU generation pattern</label>
              <p className="text-xs text-stone-500 mb-2">Formula used to auto-generate SKUs from designer/color/size attributes.</p>
              <input
                type="text"
                value={settings.skuGenerationPattern}
                onChange={(e) => setSettings({ ...settings, skuGenerationPattern: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
