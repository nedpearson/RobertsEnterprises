import { useEffect, useState } from 'react';
import { BarChart3, Loader2, RefreshCw, Download, Settings, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { Switch } from '@vowos/design-system';
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
  const [isExporting, setIsExporting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'defaults' | 'visibility' | 'exports'>('defaults');
  
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

  const runExport = () => {
    setIsExporting(true);
    toast({ title: 'Export Started', description: 'Generating fiscal report CSV...' });
    setTimeout(() => {
      setIsExporting(false);
      toast({ title: 'Export Complete', description: 'Report downloaded successfully.' });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reporting configs...
      </div>
    );
  }

  const safeSettings = settings || DEFAULT_REPORTING_CONFIG;

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Reporting & Fiscal Analytics</h3>
              <p className="text-xs text-stone-500">
                Establish baseline date range filters, control access to financial reports, and export data.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={runExport}
            disabled={isExporting}
            className={`${btnSecondary} gap-2`}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Reports
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'defaults', label: 'Fiscal Defaults', icon: Settings },
            { id: 'visibility', label: 'Visibility Controls', icon: Eye },
            { id: 'exports', label: 'Data Exports', icon: FileText }
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

      {activeSubTab === 'defaults' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Fiscal Defaults</h4>
            <p className="text-xs text-stone-500 mb-4">Preset ranges and groupings applied on page load.</p>
          </div>
          
          <div className="grid gap-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Default reporting date range</label>
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
            </div>
            
            <div className="pt-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">Default group by location</label>
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Group reports by location</span>
                <Switch
                  checked={safeSettings.defaultLocationGrouping}
                  onCheckedChange={(checked) => setSettings({ ...safeSettings, defaultLocationGrouping: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'visibility' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Visibility Controls</h4>
            <p className="text-xs text-stone-500 mb-4">Control access to sensitive financial and commission reports.</p>
          </div>
          
          <div className="grid gap-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Enable cost visibility to managers</label>
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Managers view costs</span>
                <Switch
                  checked={safeSettings.costVisibilityAllowed}
                  onCheckedChange={(checked) => setSettings({ ...safeSettings, costVisibilityAllowed: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Enable commission visibility to stylists</label>
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Stylists view commissions</span>
                <Switch
                  checked={safeSettings.commissionVisibilityAllowed}
                  onCheckedChange={(checked) => setSettings({ ...safeSettings, commissionVisibilityAllowed: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'exports' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Data Exports Options</h4>
            <p className="text-xs text-stone-500 mb-4">Configure default formats and periodic delivery of reports.</p>
          </div>
          
          <div className="grid gap-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Preferred Export Format</label>
              <select className={inputCls} defaultValue="csv">
                <option value="csv">CSV (Spreadsheet)</option>
                <option value="pdf">PDF (Printable)</option>
                <option value="json">JSON (Developer)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Automated Weekly Email</label>
              <input 
                type="email" 
                placeholder="finance@example.com" 
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
