import { useEffect, useState } from 'react';
import { Receipt, Loader2, FileText, Scale, RefreshCw } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@vowos/design-system';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_SALES_SETTINGS, SalesSettings } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface SalesSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function SalesSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: SalesSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'terms'>('documents');
  const [settings, setSettings] = useState<SalesSettings>(DEFAULT_SALES_SETTINGS);
  const [dbSettings, setDbSettings] = useState<SalesSettings>(DEFAULT_SALES_SETTINGS);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<SalesSettings>(
      'sales_settings',
      'sales_settings',
      { dataPlane },
      DEFAULT_SALES_SETTINGS
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
      await saveScopedSetting('sales_settings', 'sales_settings', settings, { dataPlane }, reason);
      
      toast({
        title: 'Sales & Invoicing settings saved',
        description: 'Document options have been updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save sales settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast({ title: 'Syncing sales rules', description: 'Checking latest configuration...' });
    setTimeout(() => {
      loadSettings().then(() => {
        setIsRefreshing(false);
        toast({ title: 'Sync Complete', description: 'Sales and invoicing defaults updated.' });
      });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading sales defaults…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Sales & Invoicing</h3>
              <p className="text-xs text-stone-500">
                Configure invoice numbering, quotes, thresholds, and standard terms.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`${btnSecondary} gap-2`}
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Sales Defaults
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'documents', label: 'Document Rules', icon: FileText },
            { id: 'terms', label: 'Standard Terms', icon: Scale }
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

      {activeSubTab === 'documents' && (
        <SettingsCard
          title="Document Numbering & Lifespan"
          description="Configure dynamic invoice prefixes, quote lifespans, and signature rules."
          icon={<FileText className="h-5 w-5" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsField
              label="Quote number prefix"
              description="Starting string for quote identifiers (e.g. QT-)."
            >
              <input
                type="text"
                value={settings.quoteNumberPrefix}
                onChange={(e) => setSettings({ ...settings, quoteNumberPrefix: e.target.value })}
                className={inputCls}
              />
            </SettingsField>

            <SettingsField
              label="Invoice number prefix"
              description="Starting string for invoice identifiers (e.g. INV-)."
            >
              <input
                type="text"
                value={settings.invoiceNumberPrefix}
                onChange={(e) => setSettings({ ...settings, invoiceNumberPrefix: e.target.value })}
                className={inputCls}
              />
            </SettingsField>

            <SettingsField
              label="Quote Expiration (days)"
              description="Days a bridal gown quote remains valid before expiration."
            >
              <input
                type="number"
                value={settings.quoteExpirationDays}
                onChange={(e) => setSettings({ ...settings, quoteExpirationDays: parseInt(e.target.value) || 1 })}
                className={inputCls}
                min="1"
              />
            </SettingsField>

            <SettingsField
              label="Manager discount approval threshold ($)"
              description="Discounts above this value require manager authentication override."
            >
              <input
                type="number"
                value={(settings.managerApprovalThresholdCents / 100).toFixed(2)}
                onChange={(e) => setSettings({ ...settings, managerApprovalThresholdCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                className={inputCls}
                min="0"
                step="0.01"
              />
            </SettingsField>

            <SettingsField
              label="Lock invoice on post"
              description="Disable changes to posted invoices to maintain audit compliance."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Enforce immutable posted invoices</span>
                <Switch
                  checked={settings.invoiceLockOnPost}
                  onCheckedChange={(checked) => setSettings({ ...settings, invoiceLockOnPost: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
            </SettingsField>

            <SettingsField
              label="Require customer signature"
              description="Forbid checkout without digital signoff on terms of sale."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Customer signoff required</span>
                <Switch
                  checked={settings.signatureRequired}
                  onCheckedChange={(checked) => setSettings({ ...settings, signatureRequired: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
            </SettingsField>
          </div>
        </SettingsCard>
      )}

      {activeSubTab === 'terms' && (
        <SettingsCard
          title="Standard Terms & Customer Disclosures"
          description="Define default text added to invoices, receipts, and client printouts."
          icon={<Scale className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <SettingsField
              label="Default payment terms"
              description="Standard final sale, deposit refunds, and exchange guidelines."
            >
              <textarea
                value={settings.defaultTerms}
                onChange={(e) => setSettings({ ...settings, defaultTerms: e.target.value })}
                className={`${inputCls} min-h-[80px] py-2`}
              />
            </SettingsField>

            <SettingsField
              label="Default receipt notes"
              description="Friendly closing statements or reminders about alterations."
            >
              <textarea
                value={settings.defaultNotes}
                onChange={(e) => setSettings({ ...settings, defaultNotes: e.target.value })}
                className={`${inputCls} min-h-[80px] py-2`}
              />
            </SettingsField>
          </div>
        </SettingsCard>
      )}
    </div>
  );
}
