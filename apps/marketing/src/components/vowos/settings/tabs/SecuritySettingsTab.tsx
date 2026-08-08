import { useEffect, useState } from 'react';
import { ShieldAlert, Loader2, RefreshCw, CheckCircle2, ShieldCheck, ServerCrash } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { inputCls } from '@/components/vowos/ui';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsField } from '../components/SettingsField';
import { Switch } from '@/components/ui/switch';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_SECURITY_SETTINGS, SecuritySettings } from '@/lib/settings';
import { getActiveDataPlane, supabase } from '@/lib/supabase';

interface SecuritySettingsExtended extends SecuritySettings {
  allowedIps: string;
  ipRestrictionEnabled: boolean;
  mfaGracePeriodDays: number;
}

const DEFAULT_SECURITY_EXTENDED: SecuritySettingsExtended = {
  ...DEFAULT_SECURITY_SETTINGS,
  allowedIps: '192.168.1.1, 74.125.19.147',
  ipRestrictionEnabled: false,
  mfaGracePeriodDays: 3,
};

interface SecuritySettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function SecuritySettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: SecuritySettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SecuritySettingsExtended>(DEFAULT_SECURITY_EXTENDED);
  const [dbSettings, setDbSettings] = useState<SecuritySettingsExtended>(DEFAULT_SECURITY_EXTENDED);
  const [revokingSessions, setRevokingSessions] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<SecuritySettingsExtended>(
      'security',
      'security_policy',
      { dataPlane },
      DEFAULT_SECURITY_EXTENDED
    );
    const fallback = { ...DEFAULT_SECURITY_EXTENDED, ...result.value };
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
      await saveScopedSetting('security', 'security_policy', settings, { dataPlane }, reason);

      toast({
        title: 'Security policy updated',
        description: 'Authentication parameters have been saved successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save security settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  const handleRevokeSessions = async () => {
    setRevokingSessions(true);
    try {
      const { error } = await supabase.rpc('revoke_all_sessions');
      if (error) throw error;
      toast({
        title: 'Sessions terminated',
        description: 'All active staff authentication cookies have been invalidated except yours.',
      });
    } catch (err: any) {
      toast({
        title: 'Revoke sessions failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setRevokingSessions(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading credentials policy…
      </div>
    );
  }

  const safeSettings = settings || DEFAULT_SECURITY_EXTENDED;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          title="Authentication & Session Policies"
          description="Establish baseline password complexities, lockout limits, and idle timeouts."
          icon={<ShieldAlert className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <SettingsField
              label="Minimum password length"
              description="Shortest password allowed for staff registration."
            >
              <input
                type="number"
                value={safeSettings.minPasswordLength || 8}
                onChange={(e) => setSettings({ ...safeSettings, minPasswordLength: parseInt(e.target.value) || 8 })}
                className={inputCls}
                min="8"
                max="32"
              />
            </SettingsField>

            <SettingsField
              label="Require password complexity"
              description="Forces passwords to contain upper/lowercase, numbers, and symbols."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Strong complexity required</span>
                <Switch
                  checked={safeSettings.requireComplexity}
                  onCheckedChange={(checked) => setSettings({ ...safeSettings, requireComplexity: checked })}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            </SettingsField>

            <SettingsField
              label="Failed login lockout attempts"
              description="Number of attempts before the account gets temporarily locked."
            >
              <input
                type="number"
                value={safeSettings.lockoutAttempts || 5}
                onChange={(e) => setSettings({ ...safeSettings, lockoutAttempts: parseInt(e.target.value) || 5 })}
                className={inputCls}
                min="3"
                max="10"
              />
            </SettingsField>

            <SettingsField
              label="Lockout duration (minutes)"
              description="Time locked accounts must wait before re-trying."
            >
              <input
                type="number"
                value={safeSettings.lockoutDurationMinutes || 15}
                onChange={(e) => setSettings({ ...safeSettings, lockoutDurationMinutes: parseInt(e.target.value) || 15 })}
                className={inputCls}
                min="5"
              />
            </SettingsField>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Multi-Factor & Lock Session Timing"
          description="Force owners and managers to enroll in TOTP verification and set timing thresholds."
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <SettingsField
              label="Enforce Multi-Factor Authentication (MFA)"
              description="Force owners and managers to enroll in TOTP verification."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">MFA mandatory for admin roles</span>
                <Switch
                  checked={safeSettings.mfaRequired}
                  onCheckedChange={(checked) => setSettings({ ...safeSettings, mfaRequired: checked })}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            </SettingsField>

            <SettingsField
              label="MFA Grace Period (days)"
              description="Days allowed for staff enrollment before account lockout."
            >
              <input
                type="number"
                value={safeSettings.mfaGracePeriodDays || 3}
                onChange={(e) => setSettings({ ...safeSettings, mfaGracePeriodDays: parseInt(e.target.value) || 3 })}
                className={inputCls}
                min="1"
                max="30"
              />
            </SettingsField>

            <SettingsField
              label="Maximum session duration (hours)"
              description="How long a logged-in user can remain active before being forced to log in again."
            >
              <input
                type="number"
                value={((safeSettings.sessionDurationMinutes || 120) / 60).toFixed(0)}
                onChange={(e) => setSettings({ ...safeSettings, sessionDurationMinutes: (parseInt(e.target.value) || 2) * 60 })}
                className={inputCls}
                min="1"
                max="24"
              />
            </SettingsField>

            <SettingsField
              label="Idle timeout warning (minutes)"
              description="Lock browser screen after inactivity."
            >
              <input
                type="number"
                value={safeSettings.idleTimeoutMinutes || 30}
                onChange={(e) => setSettings({ ...safeSettings, idleTimeoutMinutes: parseInt(e.target.value) || 15 })}
                className={inputCls}
                min="5"
              />
            </SettingsField>
          </div>
        </SettingsCard>
      </div>

      <SettingsCard
        title="IP Access Whitelisting & Active Sessions"
        description="Limit database requests to designated corporate offices or trigger remote cookie expirations."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <SettingsField
              label="Enable IP restrictions"
              description="Enforce validation checks matching browser requests against allowed static IPs."
            >
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">IP whitelist rules active</span>
                <Switch
                  checked={safeSettings.ipRestrictionEnabled}
                  onCheckedChange={(checked) => setSettings({ ...safeSettings, ipRestrictionEnabled: checked })}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            </SettingsField>

            <SettingsField
              label="Whitelisted Corporate IPs"
              description="Comma-separated IP addresses allowed to connect to administrative modules."
            >
              <textarea
                value={safeSettings.allowedIps || ''}
                onChange={(e) => setSettings({ ...safeSettings, allowedIps: e.target.value })}
                className={`${inputCls} min-h-[72px] py-2 text-xs`}
                placeholder="e.g. 192.168.1.1, 74.125.19.147"
              />
            </SettingsField>
          </div>

          <div className="p-4 border border-stone-200 bg-stone-50/50 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-stone-800 block uppercase tracking-wider">Device Session Lifecycle</span>
              <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                In case of lost hardware or corporate audit cycles, you can force logouts for every active session. This will require all personnel to re-authenticate.
              </p>
            </div>
            <button
              onClick={handleRevokeSessions}
              disabled={revokingSessions}
              className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <ServerCrash className="h-4 w-4" /> Revoke all active sessions
            </button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
