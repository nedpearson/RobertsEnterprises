import { useEffect, useState } from 'react';
import { ShoppingBag, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_PURCHASING_SETTINGS, PurchasingSettings } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface PurchasingSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function PurchasingSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: PurchasingSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PurchasingSettings>(DEFAULT_PURCHASING_SETTINGS);
  const [dbSettings, setDbSettings] = useState<PurchasingSettings>(DEFAULT_PURCHASING_SETTINGS);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<PurchasingSettings>(
      'purchasing_settings',
      'purchasing_settings',
      { dataPlane },
      DEFAULT_PURCHASING_SETTINGS
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
      await saveScopedSetting('purchasing_settings', 'purchasing_settings', settings, { dataPlane }, reason);

      toast({
        title: 'Purchasing settings saved',
        description: 'Vendor profiles have been updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save purchasing settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  const addVendor = () => {
    if (!newVendorName.trim()) return;
    const exists = settings.vendors.some((v) => v.name.toLowerCase() === newVendorName.trim().toLowerCase());
    if (exists) {
      toast({ title: 'Vendor already exists', variant: 'destructive' });
      return;
    }
    setSettings({
      ...settings,
      vendors: [
        ...settings.vendors,
        {
          id: Date.now().toString(),
          name: newVendorName.trim(),
          email: newVendorEmail.trim() || 'orders@vendor.com',
          phone: '(555) 555-5555',
          leadTimeDays: 120,
          rushLeadTimeDays: 60,
        },
      ],
    });
    setNewVendorName('');
    setNewVendorEmail('');
  };

  const removeVendor = (id: string) => {
    setSettings({
      ...settings,
      vendors: settings.vendors.filter((v) => v.id !== id),
    });
  };

  const updateVendor = (id: string, fields: Partial<PurchasingSettings['vendors'][number]>) => {
    setSettings({
      ...settings,
      vendors: settings.vendors.map((v) =>
        v.id === id ? { ...v, ...fields } as typeof v : v
      ),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading vendors profiles…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Vendor & Designer Management"
        description="Manage designer ordering credentials, average ordering lead times, and contact information."
        icon={<ShoppingBag className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. Ines Di Santo"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <input
              type="email"
              placeholder="orders@designer.com"
              value={newVendorEmail}
              onChange={(e) => setNewVendorEmail(e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <button
              onClick={addVendor}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Designer
            </button>
          </div>

          <div className="space-y-3">
            {settings.vendors.map((vendor) => (
              <div key={vendor.id} className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <input
                      type="text"
                      value={vendor.name}
                      onChange={(e) => updateVendor(vendor.id, { name: e.target.value })}
                      className="text-sm font-semibold text-stone-800 border-b border-transparent hover:border-stone-300 focus:border-stone-900 bg-transparent px-1 -mx-1 outline-none"
                    />
                  </div>

                  <button
                    onClick={() => removeVendor(vendor.id)}
                    className="text-stone-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-stone-100">
                  <SettingsField label="Ordering Email">
                    <input
                      type="email"
                      value={vendor.email}
                      onChange={(e) => updateVendor(vendor.id, { email: e.target.value })}
                      className={inputCls}
                    />
                  </SettingsField>

                  <SettingsField label="Contact Phone">
                    <input
                      type="text"
                      value={vendor.phone}
                      onChange={(e) => updateVendor(vendor.id, { phone: e.target.value })}
                      className={inputCls}
                    />
                  </SettingsField>

                  <SettingsField label="Standard Lead Time (days)">
                    <input
                      type="number"
                      value={vendor.leadTimeDays}
                      onChange={(e) => updateVendor(vendor.id, { leadTimeDays: parseInt(e.target.value) || 0 })}
                      className={inputCls}
                      min="0"
                    />
                  </SettingsField>

                  <SettingsField label="Rush Lead Time (days)">
                    <input
                      type="number"
                      value={vendor.rushLeadTimeDays}
                      onChange={(e) => updateVendor(vendor.id, { rushLeadTimeDays: parseInt(e.target.value) || 0 })}
                      className={inputCls}
                      min="0"
                    />
                  </SettingsField>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
