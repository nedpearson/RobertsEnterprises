import { useEffect, useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@/components/ui/switch';
import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface ReportingConfig {
  defaultDateRange: string;
  defaultLocationGrouping: boolean;
  costVisibilityAllowed: boolean;
  commissionVisibilityAllowed: boolean;
}

const DEFAULT_REPORTING_CONFIG: ReportingConfig = {
  defaultDateRange: 'this_month',
  defaultLocationGrouping: true,
  costVisibilityAllowed: true,
  commissionVisibilityAllowed: true,
};

interface ReportingSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function ReportingSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: ReportingSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ReportingConfig>(DEFAULT_REPORTING_CONFIG);
  const [dbSettings, setDbSettings] = useState<ReportingConfig>(DEFAULT_REPORTING_CONFIG);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<ReportingConfig>(
      'reporting_settings',
      'reporting_settings',
      { dataPlane },
      DEFAULT_REPORTING_CONFIG
    );
    const fallback = { ...DEFAULT_REPORTING_CONFIG, ...result.value };
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
      await saveScopedSetting('reporting_settings', 'reporting_settings', settings, { dataPlane }, reason);
      
      toast({
        title: 'Reporting settings saved',
        description: 'Fiscal defaults have been updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save reporting settings',
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
        <Loader2 className="h-4 w-4 animate-spin" /> Loading fiscal calendars…
      </div>
    );
  }

  const safeSettings = settings || DEFAULT_REPORTING_CONFIG;

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Fiscal Dashboards & Defaults"
        description="Establish baseline date range filters and control access to financial reports."
        icon={<BarChart3 className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField
            label="Default reporting date range"
            description="Preset range applied on page load."
          >
            <select
              value={safeSettings.defaultDateRange}
              onChange={(e) => setSettings({ ...safeSettings, defaultDateRange: e.target.value })}
              className={inputCls}
            >
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_quarter">This Quarter</option>
              <option value="year_to_date">Year to Date (YTD)</option>
            </select>
          </SettingsField>

          <SettingsField
            label="Enable cost visibility to managers"
            description="Permit store managers to view garment item unit costs."
          >
            <div className="flex items-center justify-between h-9 px-1">
              <span className="text-xs text-stone-500 font-medium">Managers view costs</span>
              <Switch
                checked={safeSettings.costVisibilityAllowed}
                onCheckedChange={(checked) => setSettings({ ...safeSettings, costVisibilityAllowed: checked })}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>
          </SettingsField>

          <SettingsField
            label="Enable commission visibility to stylists"
            description="Permit salon stylists to monitor commission goal progress."
          >
            <div className="flex items-center justify-between h-9 px-1">
              <span className="text-xs text-stone-500 font-medium">Stylists view commissions</span>
              <Switch
                checked={safeSettings.commissionVisibilityAllowed}
                onCheckedChange={(checked) => setSettings({ ...safeSettings, commissionVisibilityAllowed: checked })}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>
          </SettingsField>

          <SettingsField
            label="Default group by location"
            description="Aggregate sales charts by boutique location name initially."
          >
            <div className="flex items-center justify-between h-9 px-1">
              <span className="text-xs text-stone-500 font-medium">Group reports by location</span>
              <Switch
                checked={safeSettings.defaultLocationGrouping}
                onCheckedChange={(checked) => setSettings({ ...safeSettings, defaultLocationGrouping: checked })}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>
          </SettingsField>
        </div>
      </SettingsCard>
    </div>
  );
}
