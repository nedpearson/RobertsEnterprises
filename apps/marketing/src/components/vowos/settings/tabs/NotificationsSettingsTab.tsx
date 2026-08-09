import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@/components/ui/switch';
import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface NotificationPref {
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

interface NotificationSettings {
  appointments: NotificationPref;
  sales: NotificationPref;
  inventory: NotificationPref;
  transfers: NotificationPref;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  appointments: { inApp: true, email: true, sms: true },
  sales: { inApp: true, email: true, sms: false },
  inventory: { inApp: true, email: false, sms: false },
  transfers: { inApp: true, email: true, sms: true },
};

interface NotificationsSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function NotificationsSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: NotificationsSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [dbSettings, setDbSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<NotificationSettings>(
      'alerts',
      'notification_settings',
      { dataPlane },
      DEFAULT_NOTIFICATION_SETTINGS
    );
    const data = result.value;
    const fallback = {
      appointments: { ...DEFAULT_NOTIFICATION_SETTINGS.appointments, ...data?.appointments },
      sales: { ...DEFAULT_NOTIFICATION_SETTINGS.sales, ...data?.sales },
      inventory: { ...DEFAULT_NOTIFICATION_SETTINGS.inventory, ...data?.inventory },
      transfers: { ...DEFAULT_NOTIFICATION_SETTINGS.transfers, ...data?.transfers },
    };
    setSettings(fallback);
    setDbSettings(fallback);
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
      await saveScopedSetting('alerts', 'notification_settings', settings, { dataPlane }, reason);

      toast({
        title: 'Notification preferences saved',
        description: 'Default preferences updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save notification preferences',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  const updatePreference = (category: keyof NotificationSettings, channel: keyof NotificationPref, checked: boolean) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [channel]: checked,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading notification defaults…
      </div>
    );
  }

  const categories: { key: keyof NotificationSettings; label: string; desc: string }[] = [
    { key: 'appointments', label: 'Appointments & Bookings', desc: 'Booking creations, confirmations, reschedules, or client cancellations.' },
    { key: 'sales', label: 'Invoices & Payments', desc: 'Surcharges applied, Stripe connections, invoice posts, or refunds.' },
    { key: 'inventory', label: 'Inventory & Stock Alerts', desc: 'Low-stock warnings, reorder points reached, or SKU exceptions.' },
    { key: 'transfers', label: 'Boutique Transfers', desc: 'Transfer arrivals, shipping carriers selected, or missing packages.' },
  ];

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Default System Notifications"
        description="Toggle preferences for staff roles, departments, or custom location targets."
        icon={<Bell className="h-5 w-5" />}
      >
        <div className="space-y-6">
          {categories.map(({ key, label, desc }) => (
            <div key={key} className="flex flex-col md:flex-row justify-between pb-6 border-b border-stone-100 last:pb-0 last:border-0 gap-4">
              <div className="max-w-md">
                <h5 className="text-sm font-semibold text-stone-800">{label}</h5>
                <p className="text-xs text-stone-400 mt-1">{desc}</p>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-medium">In-app</span>
                  <Switch
                    checked={settings[key]?.inApp}
                    onCheckedChange={(checked) => updatePreference(key, 'inApp', checked)}
                    className="data-[state=checked]:bg-rose-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-medium">Email</span>
                  <Switch
                    checked={settings[key]?.email}
                    onCheckedChange={(checked) => updatePreference(key, 'email', checked)}
                    className="data-[state=checked]:bg-rose-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-medium">SMS</span>
                  <Switch
                    checked={settings[key]?.sms}
                    onCheckedChange={(checked) => updatePreference(key, 'sms', checked)}
                    className="data-[state=checked]:bg-rose-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}
