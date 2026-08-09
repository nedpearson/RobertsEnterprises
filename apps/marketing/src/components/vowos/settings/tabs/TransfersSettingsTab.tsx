import { useEffect, useState } from 'react';
import { ArrowLeftRight, Loader2, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@/components/ui/switch';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_TRANSFER_SETTINGS, TransferSettings } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface TransferPermissions {
  locationId: string;
  name: string;
  canSend: boolean;
  canReceive: boolean;
}

const DEFAULT_TRANSFER_PERMS: TransferPermissions[] = [
  { locationId: 'ido-br', name: 'I Do Bridal Couture (Baton Rouge)', canSend: true, canReceive: true },
  { locationId: 'ido-cov', name: 'I Do Bridal Couture (Covington)', canSend: true, canReceive: true },
  { locationId: 'pc-br', name: 'Proper & Company (Baton Rouge)', canSend: true, canReceive: false },
  { locationId: 'pc-cov', name: 'Proper & Company (Covington)', canSend: false, canReceive: true },
];

interface TransfersSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function TransfersSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: TransfersSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<TransferSettings>(DEFAULT_TRANSFER_SETTINGS);
  const [dbSettings, setDbSettings] = useState<TransferSettings>(DEFAULT_TRANSFER_SETTINGS);
  const [permissions, setPermissions] = useState<TransferPermissions[]>(DEFAULT_TRANSFER_PERMS);
  const [dbPermissions, setDbPermissions] = useState<TransferPermissions[]>(DEFAULT_TRANSFER_PERMS);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const settingsResult = await resolveEffectiveSetting<TransferSettings>(
      'transfer_settings',
      'transfer_settings',
      { dataPlane },
      DEFAULT_TRANSFER_SETTINGS
    );
    const permsResult = await resolveEffectiveSetting<TransferPermissions[]>(
      'transfer_permissions',
      'transfer_permissions',
      { dataPlane },
      DEFAULT_TRANSFER_PERMS
    );
    setSettings(settingsResult.value);
    setDbSettings(settingsResult.value);
    setPermissions(permsResult.value);
    setDbPermissions(permsResult.value);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(dbSettings) ||
    JSON.stringify(permissions) !== JSON.stringify(dbPermissions);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('transfer_settings', 'transfer_settings', settings, { dataPlane }, reason);
      await saveScopedSetting('transfer_permissions', 'transfer_permissions', permissions, { dataPlane }, reason);
      
      toast({
        title: 'Transfer settings saved',
        description: 'Inter-location transfer policies updated successfully.',
      });
      setDbSettings(settings);
      setDbPermissions(permissions);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save transfer settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings, permissions]);

  const handlePermChange = (locationId: string, type: 'canSend' | 'canReceive', value: boolean) => {
    setPermissions(
      permissions.map((p) => (p.locationId === locationId ? { ...p, [type]: value } : p))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading transfer protocols…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          title="Transfer Routing Controls"
          description="Establish authorization rules, safety margins, and receipt check protocols."
          icon={<ArrowLeftRight className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <SettingsField
              label="Enable store transfers"
              description="Allow boutique logistics team to request inter-location sample transfers."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Transfers active</span>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            </SettingsField>

            <SettingsField
              label="Manager approval required"
              description="Transfers require explicit manager authorization before packing."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Enforce approval gates</span>
                <Switch
                  checked={settings.approvalRequired}
                  onCheckedChange={(checked) => setSettings({ ...settings, approvalRequired: checked })}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            </SettingsField>

            <SettingsField
              label="Manager approval threshold ($)"
              description="Transactions with value exceeding this rate require owner override."
            >
              <input
                type="number"
                value={(settings.approvalThresholdCents / 100).toFixed(2)}
                onChange={(e) => setSettings({ ...settings, approvalThresholdCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                className={inputCls}
                min="0"
                step="0.01"
              />
            </SettingsField>

            <SettingsField
              label="Minimum source safety stock (units)"
              description="Block shipping items if source stock drops below this count."
            >
              <input
                type="number"
                value={settings.minSourceStock}
                onChange={(e) => setSettings({ ...settings, minSourceStock: parseInt(e.target.value) || 0 })}
                className={inputCls}
                min="0"
              />
            </SettingsField>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Fulfillment Logistics & Limits"
          description="Establish expected transit time boundaries and strict intake check rules."
          icon={<ArrowLeftRight className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <SettingsField
              label="Default expected transit duration (days)"
              description="Flags transfer requests as overdue after this window."
            >
              <input
                type="number"
                value={settings.transitDaysDefault}
                onChange={(e) => setSettings({ ...settings, transitDaysDefault: parseInt(e.target.value) || 1 })}
                className={inputCls}
                min="1"
              />
            </SettingsField>

            <SettingsField
              label="Enforce package tracking numbers"
              description="Require package tracking information before flagging item as shipped."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Tracking number mandatory</span>
                <Switch
                  checked={settings.trackingRequired}
                  onCheckedChange={(checked) => setSettings({ ...settings, trackingRequired: checked })}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            </SettingsField>

            <SettingsField
              label="Enforce barcode scan on intake"
              description="Require clerk to verify barcode tag scan to mark item as received."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Strict scanning checks active</span>
                <Switch
                  checked={settings.scanRequired}
                  onCheckedChange={(checked) => setSettings({ ...settings, scanRequired: checked })}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            </SettingsField>
          </div>
        </SettingsCard>
      </div>

      <SettingsCard
        title="Location Dispatch Permissions"
        description="Filter which store locations are permitted to ship out or receive transfer shipments."
        icon={<ArrowLeftRight className="h-5 w-5" />}
      >
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                <th className="p-3">Location Boutique</th>
                <th className="p-3 text-center">Allow Outbound Shipping (Send)</th>
                <th className="p-3 text-center">Allow Inbound Intake (Receive)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {permissions.map((p) => (
                <tr key={p.locationId} className="hover:bg-stone-50/50">
                  <td className="p-3 font-semibold text-stone-800">{p.name}</td>
                  <td className="p-3 text-center">
                    <Switch
                      checked={p.canSend}
                      onCheckedChange={(checked) => handlePermChange(p.locationId, 'canSend', checked)}
                      className="scale-90 data-[state=checked]:bg-rose-500 inline-block"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <Switch
                      checked={p.canReceive}
                      onCheckedChange={(checked) => handlePermChange(p.locationId, 'canReceive', checked)}
                      className="scale-90 data-[state=checked]:bg-rose-500 inline-block"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </div>
  );
}
