import { useEffect, useState } from 'react';
import { Shirt, Loader2 } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@vowos/design-system';
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory policies…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Stock Rules & Safety Measures"
        description="Configure stock tracking triggers, barcode symbology, and low-stock warning limits."
        icon={<Shirt className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField
            label="Inventory tracking enabled"
            description="Actively monitor gown and accessory stock levels."
          >
            <div className="flex items-center justify-between h-9 px-1">
              <span className="text-xs text-stone-500 font-medium">Track stock levels</span>
              <Switch
                checked={settings.trackingEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, trackingEnabled: checked })}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
          </SettingsField>

          <SettingsField
            label="Prevent negative stock levels"
            description="Forbid salesperson from posting orders for out-of-stock items."
          >
            <div className="flex items-center justify-between h-9 px-1">
              <span className="text-xs text-stone-500 font-medium">Block negative quantities</span>
              <Switch
                checked={settings.preventNegative}
                onCheckedChange={(checked) => setSettings({ ...settings, preventNegative: checked })}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
          </SettingsField>

          <SettingsField
            label="Low-stock threshold (units)"
            description="Flag items in dashboard when inventory falls below this count."
          >
            <input
              type="number"
              value={settings.lowStockThreshold}
              onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 0 })}
              className={inputCls}
              min="0"
            />
          </SettingsField>

          <SettingsField
            label="Default reorder point (units)"
            description="Generate purchase order candidates when stock reaches this level."
          >
            <input
              type="number"
              value={settings.reorderThreshold}
              onChange={(e) => setSettings({ ...settings, reorderThreshold: parseInt(e.target.value) || 0 })}
              className={inputCls}
              min="0"
            />
          </SettingsField>

          <SettingsField
            label="Barcode format"
            description="Symbology pattern used for internal tags (e.g. CODE128, EAN13)."
          >
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
          </SettingsField>

          <SettingsField
            label="SKU generation pattern"
            description="Formula used to auto-generate SKUs from designer/color/size attributes."
          >
            <input
              type="text"
              value={settings.skuGenerationPattern}
              onChange={(e) => setSettings({ ...settings, skuGenerationPattern: e.target.value })}
              className={inputCls}
            />
          </SettingsField>
        </div>
      </SettingsCard>
    </div>
  );
}
