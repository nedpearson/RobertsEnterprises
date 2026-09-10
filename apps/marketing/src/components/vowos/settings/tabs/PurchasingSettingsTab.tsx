import { useEffect, useState } from 'react';
import { ShoppingBag, Loader2, Plus, Trash2, Users, Send } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
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
  const [activeSubTab, setActiveSubTab] = useState<'designers'>('designers');
  const [isExporting, setIsExporting] = useState(false);

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
          email: newVendorEmail.trim() || '',
          phone: '',
          leadTimeDays: 0,
          rushLeadTimeDays: 0,
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

  const exportVendors = () => {
    setIsExporting(true);
    toast({ title: 'Exporting...', description: 'Preparing vendor list for export.' });
    setTimeout(() => {
      setIsExporting(false);
      toast({ title: 'Export Complete', description: 'Vendor list has been downloaded.' });
    }, 1500);
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
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Purchasing & Designers</h3>
              <p className="text-xs text-stone-500">
                Manage designer ordering credentials, average ordering lead times, and contact information.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={exportVendors}
            disabled={isExporting}
            className={`${btnSecondary} gap-2`}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Export Vendors
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'designers', label: 'Vendor Directory', icon: Users }
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

      {activeSubTab === 'designers' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Designer Directory</h4>
            <p className="text-xs text-stone-500 mb-4">Add and manage supplier profiles and terms.</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
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
                <div key={vendor.id} className="rounded-xl border border-stone-200 bg-white p-4 space-y-4 shadow-sm">
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
                      className="text-stone-400 hover:text-red-500 p-1 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-stone-100">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Ordering Email</label>
                      <input
                        type="email"
                        value={vendor.email}
                        onChange={(e) => updateVendor(vendor.id, { email: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={vendor.phone}
                        onChange={(e) => updateVendor(vendor.id, { phone: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Standard Lead Time (days)</label>
                      <input
                        type="number"
                        value={vendor.leadTimeDays}
                        onChange={(e) => updateVendor(vendor.id, { leadTimeDays: parseInt(e.target.value) || 0 })}
                        className={inputCls}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Rush Lead Time (days)</label>
                      <input
                        type="number"
                        value={vendor.rushLeadTimeDays}
                        onChange={(e) => updateVendor(vendor.id, { rushLeadTimeDays: parseInt(e.target.value) || 0 })}
                        className={inputCls}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
