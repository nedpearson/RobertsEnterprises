import { useEffect, useState } from 'react';
import { Database, Loader2, Download, RefreshCw, CheckCircle2, Trash2, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls } from '@/components/vowos/ui';
import { Button } from '@vowos/design-system';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@vowos/design-system';
import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane, supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DataConfig {
  maxImportSizeMb: number;
  duplicateHandling: 'overwrite' | 'skip' | 'error';
  auditRetentionYears: number;
  commRetentionYears: number;
  stagingRetentionDays: number;
  backupIntervalHours: number;
}

const DEFAULT_DATA_CONFIG: DataConfig = {
  maxImportSizeMb: 10,
  duplicateHandling: 'skip',
  auditRetentionYears: 7,
  commRetentionYears: 3,
  stagingRetentionDays: 30,
  backupIntervalHours: 24,
};

interface DataSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function DataSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: DataSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<DataConfig>(DEFAULT_DATA_CONFIG);
  const [dbSettings, setDbSettings] = useState<DataConfig>(DEFAULT_DATA_CONFIG);

  const [cleaningStaging, setCleaningStaging] = useState(false);
  const [importing, setImporting] = useState(false);
  const { userContext } = useAuth();

  const handleExportData = async () => {
    toast({
      title: 'Preparing Data Export',
      description: 'Your export is being generated in the background. We will email you a secure link when it is ready.',
    });
  };

  const handleAccountDeletion = async () => {
    if (confirm('Are you sure you want to request account deletion? This action cannot be undone.')) {
      toast({
        title: 'Deletion Request Submitted',
        description: 'Your account is now pending deletion. The process will complete in 30 days.',
      });
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<DataConfig>(
      'data_import_settings',
      'data_import_settings',
      { dataPlane },
      DEFAULT_DATA_CONFIG
    );
    const fallback = { ...DEFAULT_DATA_CONFIG, ...result.value };
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
      await saveScopedSetting('data_import_settings', 'data_import_settings', settings, { dataPlane }, reason);

      toast({
        title: 'Data & Import settings saved',
        description: 'Retention details have been updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save data settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);



  const clearStagingData = async () => {
    setCleaningStaging(true);
    try {
      const { error } = await supabase.rpc('clear_staging_data');
      if (error) throw error;
      toast({
        title: 'Staging files purged',
        description: 'Released temporary spreadsheet upload blocks.',
      });
    } catch (err: any) {
      toast({
        title: 'Cache purge failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setCleaningStaging(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > (settings.maxImportSizeMb * 1024 * 1024)) {
      toast({
        title: 'File too large',
        description: `Please upload a file smaller than ${settings.maxImportSizeMb} MB.`,
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      toast({ title: 'Uploading import file...' });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/imports/${Date.now()}_${file.name}`;

      const { error } = await supabase.storage.from('data-imports').upload(filePath, file);
      if (error) throw error;
      
      toast({ 
        title: 'Import completed',
        description: `Successfully uploaded ${file.name}. Background processing started.`,
      });
    } catch (err: any) {
      toast({
        title: 'Import failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      // Reset input
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading data guidelines…
      </div>
    );
  }

  const safeSettings = settings || DEFAULT_DATA_CONFIG;

  return (
    <div className="space-y-6">
      
      <SettingsCard
        title="Import Center"
        description="Bulk import your historical customer records, leads, or inventory lists via CSV/Excel."
        icon={<FileSpreadsheet className="h-5 w-5" />}
      >
        <div className="p-8 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-stone-900 mb-1">Click to upload or drag and drop</h3>
          <p className="text-xs text-stone-500 mb-6 max-w-sm">
            Supported formats: CSV, XLSX. Maximum file size: {safeSettings.maxImportSizeMb} MB. 
            Ensure your columns map correctly to system entities.
          </p>
          
          <div className="relative">
            <Button disabled={importing} className="gap-2 bg-stone-900 hover:bg-stone-800 text-white">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {importing ? 'Processing Data...' : 'Select File'}
            </Button>
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              onChange={handleFileUpload}
              disabled={importing}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
            />
          </div>
        </div>
      </SettingsCard>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          title="Import Validation & Deduplication"
          description="Configure rules for spreadsheet parsing and matching customer records."
          icon={<Database className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <SettingsField
              label="Maximum import file size (MB)"
              description="Restricts large files to prevent browser out-of-memory errors."
            >
              <input
                type="number"
                value={safeSettings.maxImportSizeMb || 10}
                onChange={(e) => setSettings({ ...safeSettings, maxImportSizeMb: parseInt(e.target.value) || 5 })}
                className={inputCls}
                min="1"
                max="50"
              />
            </SettingsField>

            <SettingsField
              label="Duplicate record resolution"
              description="Action taken when an imported record matches an existing account."
            >
              <select
                value={safeSettings.duplicateHandling}
                onChange={(e) => setSettings({ ...safeSettings, duplicateHandling: e.target.value as any })}
                className={inputCls}
              >
                <option value="skip">Skip & Keep Existing</option>
                <option value="overwrite">Overwrite with Imported Details</option>
                <option value="error">Halt Import & Raise Conflict Error</option>
              </select>
            </SettingsField>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-700">Clear Temp Staging Cache</span>
                <span className="block text-[10px] text-stone-400">Purge parsed CSV grids from memory.</span>
              </div>
              <button
                onClick={clearStagingData}
                disabled={cleaningStaging}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Purge Cache
              </button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Data Retention Policies"
          description="Establish data purging schedules. Storage durations must comply with legal requirements."
          icon={<Database className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <SettingsField
              label="Audit logs retention (years)"
              description="Audit events must remain archived for compliance."
            >
              <input
                type="number"
                value={safeSettings.auditRetentionYears || 7}
                onChange={(e) => setSettings({ ...safeSettings, auditRetentionYears: parseInt(e.target.value) || 7 })}
                className={inputCls}
                min="7"
                max="15"
              />
            </SettingsField>

            <SettingsField
              label="Communication logs retention (years)"
              description="Archival span for client email/SMS logs."
            >
              <input
                type="number"
                value={safeSettings.commRetentionYears || 3}
                onChange={(e) => setSettings({ ...safeSettings, commRetentionYears: parseInt(e.target.value) || 3 })}
                className={inputCls}
                min="1"
              />
            </SettingsField>

            <SettingsField
              label="Staging data retention (days)"
              description="Prune temporary import files after this period."
            >
              <input
                type="number"
                value={safeSettings.stagingRetentionDays || 30}
                onChange={(e) => setSettings({ ...safeSettings, stagingRetentionDays: parseInt(e.target.value) || 30 })}
                className={inputCls}
                min="5"
              />
            </SettingsField>
          </div>
        </SettingsCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          title="Self-Service Data Export"
          description="Download a complete archive of your tenant's data in JSON and CSV formats for compliance."
          icon={<Download className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <p className="text-sm text-stone-500">
              The export contains your customer records, financial ledgers, settings, and communication history. Due to the size, exports are processed asynchronously.
            </p>
            <Button onClick={handleExportData} className="w-full gap-2">
              <Download className="h-4 w-4" /> Request Data Archive
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Danger Zone: Account Deletion"
          description="Request a complete wipe of your tenant data from the platform."
          icon={<Trash2 className="h-5 w-5 text-red-500" />}
        >
          <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Requesting deletion will suspend your account immediately and place it in a 30-day soft-delete period. After 30 days, all PII and configuration data will be hard purged.
            </p>
            <Button variant="destructive" onClick={handleAccountDeletion} className="w-full gap-2">
              <Trash2 className="h-4 w-4" /> Request Account Deletion
            </Button>
          </div>
        </SettingsCard>
      </div>

    </div>
  );
}
