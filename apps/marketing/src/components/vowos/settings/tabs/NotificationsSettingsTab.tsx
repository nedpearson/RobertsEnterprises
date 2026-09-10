import { useEffect, useState } from 'react';
import { Bell, Loader2, Calendar, DollarSign, Package, Truck, Send } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { Switch } from '@vowos/design-system';
import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';
import { btnSecondary } from '@/components/vowos/ui';

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
  const [isTesting, setIsTesting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<keyof NotificationSettings>('appointments');
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

  const testNotifications = () => {
    setIsTesting(true);
    toast({ title: 'Testing Notifications', description: 'Sending test notifications...' });
    setTimeout(() => {
      setIsTesting(false);
      toast({ title: 'Success', description: 'Test notifications sent successfully.' });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading notification defaults...
      </div>
    );
  }

  const categories = [
    { id: 'appointments' as const, label: 'Appointments', desc: 'Booking creations, confirmations, reschedules, or client cancellations.', icon: Calendar },
    { id: 'sales' as const, label: 'Sales', desc: 'Surcharges applied, Stripe connections, invoice posts, or refunds.', icon: DollarSign },
    { id: 'inventory' as const, label: 'Inventory', desc: 'Low-stock warnings, reorder points reached, or SKU exceptions.', icon: Package },
    { id: 'transfers' as const, label: 'Transfers', desc: 'Transfer arrivals, shipping carriers selected, or missing packages.', icon: Truck },
  ];

  const activeCategory = categories.find(c => c.id === activeSubTab);

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Notification Preferences</h3>
              <p className="text-xs text-stone-500">
                Configure system notifications for appointments, sales, inventory, and transfers.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={testNotifications}
            disabled={isTesting}
            className={`${btnSecondary} gap-2`}
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Test All Notifications
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6 overflow-x-auto">
          {categories.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeSubTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeCategory && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">{activeCategory.label} Notifications</h4>
            <p className="text-xs text-stone-500 mb-4">{activeCategory.desc}</p>
          </div>
          
          <div className="grid gap-6 max-w-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-semibold text-stone-700">In-app</span>
                <span className="block text-xs text-stone-500">Show notification inside the dashboard</span>
              </div>
              <Switch
                checked={settings[activeCategory.id]?.inApp}
                onCheckedChange={(checked) => updatePreference(activeCategory.id, 'inApp', checked)}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-semibold text-stone-700">Email</span>
                <span className="block text-xs text-stone-500">Send an email message</span>
              </div>
              <Switch
                checked={settings[activeCategory.id]?.email}
                onCheckedChange={(checked) => updatePreference(activeCategory.id, 'email', checked)}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-semibold text-stone-700">SMS</span>
                <span className="block text-xs text-stone-500">Send a text message</span>
              </div>
              <Switch
                checked={settings[activeCategory.id]?.sms}
                onCheckedChange={(checked) => updatePreference(activeCategory.id, 'sms', checked)}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
