import { useEffect, useState } from 'react';
import { Building, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls } from '@/components/vowos/ui';
import {
  OrganizationSettings,
  DEFAULT_ORG_SETTINGS,
  resolveEffectiveSetting,
  saveScopedSetting,
} from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { StickySaveBar } from '../components/StickySaveBar';

interface OrgSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function OrgSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: OrgSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<OrganizationSettings>(DEFAULT_ORG_SETTINGS);
  const [dbSettings, setDbSettings] = useState<OrganizationSettings>(DEFAULT_ORG_SETTINGS);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<OrganizationSettings>('organization', 'business_config', { dataPlane }, DEFAULT_ORG_SETTINGS);
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
      await saveScopedSetting('organization', 'business_config', settings, { dataPlane }, reason);
    } catch (err: any) {
      setSaving(false);
      toast({
        title: 'Could not save organization settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }

    setSaving(false);
      toast({
        title: 'Settings saved',
        description: 'Organization settings have been updated successfully.',
      });
      setDbSettings(settings);
      return true;
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading organization profile…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Organization Profile"
        description="Configure your primary business identity and settings inherited by all boutique locations."
        icon={<Building className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="Business name" id="org-name">
            <input
              id="org-name"
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className={inputCls}
            />
          </SettingsField>

          <SettingsField label="Legal entity name" id="org-legal">
            <input
              id="org-legal"
              type="text"
              value={settings.legalName}
              onChange={(e) => setSettings({ ...settings, legalName: e.target.value })}
              className={inputCls}
            />
          </SettingsField>

          <SettingsField label="Website URL" id="org-website">
            <input
              id="org-website"
              type="url"
              value={settings.website}
              onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              className={inputCls}
            />
          </SettingsField>

          <SettingsField label="Support email" id="org-email">
            <input
              id="org-email"
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className={inputCls}
            />
          </SettingsField>

          <SettingsField label="Primary Timezone" id="org-timezone">
            <select
              id="org-timezone"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className={inputCls}
            >
              <option value="America/Chicago">Central Time (US &amp; Canada)</option>
              <option value="America/New_York">Eastern Time (US &amp; Canada)</option>
              <option value="America/Denver">Mountain Time (US &amp; Canada)</option>
              <option value="America/Los_Angeles">Pacific Time (US &amp; Canada)</option>
            </select>
          </SettingsField>

          <SettingsField label="Fiscal calendar start" id="org-fiscal">
            <select
              id="org-fiscal"
              value={settings.fiscalCalendarStart}
              onChange={(e) => setSettings({ ...settings, fiscalCalendarStart: e.target.value })}
              className={inputCls}
            >
              <option value="January">January</option>
              <option value="April">April</option>
              <option value="July">July</option>
              <option value="October">October</option>
            </select>
          </SettingsField>
        </div>
      </SettingsCard>
    </div>
  );
}
