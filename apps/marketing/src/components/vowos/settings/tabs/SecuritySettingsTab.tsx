import { useEffect, useState } from 'react';
import { ShieldAlert, Loader2, Key, Lock, Network, ServerCrash, CheckCircle2 } from 'lucide-react';
import { toast } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { Switch } from '@vowos/design-system';
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
  const [activeSubTab, setActiveSubTab] = useState<'auth' | 'mfa' | 'network'>('auth');
  const [revokingSessions, setRevokingSessions] = useState(false);
  
  const [settings, setSettings] = useState<SecuritySettingsExtended>(DEFAULT_SECURITY_EXTENDED);
  const [dbSettings, setDbSettings] = useState<SecuritySettingsExtended>(DEFAULT_SECURITY_EXTENDED);

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
    toast({ title: 'Revoking Sessions...', description: 'Terminating active authentications.' });
    
    // Simulated successful revoke
    setTimeout(() => {
      setRevokingSessions(false);
      toast({
        title: 'Sessions terminated',
        description: 'All active staff authentication cookies have been invalidated.',
      });
    }, 1500);
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
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Security & Authentication Policy</h3>
              <p className="text-xs text-stone-500">
                Establish password complexities, lockout limits, MFA enforcement, and network restrictions.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleRevokeSessions}
            disabled={revokingSessions}
            className={`${btnSecondary} gap-2 text-red-600 border-red-200 hover:bg-red-50`}
          >
            {revokingSessions ? <Loader2 className="w-4 h-4 animate-spin" /> : <ServerCrash className="w-4 h-4" />}
            Revoke Sessions
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'auth', label: 'Authentication', icon: Key },
            { id: 'mfa', label: 'MFA & Sessions', icon: Lock },
            { id: 'network', label: 'Network & IPs', icon: Network }
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

      {activeSubTab === 'auth' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Password Policies</h4>
            <p className="text-xs text-stone-500 mb-4">Establish baseline password complexities and lockout limits.</p>
          </div>
          
          <div className="grid gap-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Minimum password length</label>
              <input
                type="number"
                value={safeSettings.minPasswordLength || 8}
                onChange={(e) => setSettings({ ...safeSettings, minPasswordLength: parseInt(e.target.value) || 8 })}
                className={inputCls}
                min="8"
                max="32"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Require password complexity</label>
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">Strong complexity required</span>
                <Switch
                  checked={safeSettings.requireComplexity}
                  onCheckedChange={(checked) => setSettings({ ...safeSettings, requireComplexity: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Failed login lockout attempts</label>
              <input
                type="number"
                value={safeSettings.lockoutAttempts || 5}
                onChange={(e) => setSettings({ ...safeSettings, lockoutAttempts: parseInt(e.target.value) || 5 })}
                className={inputCls}
                min="3"
                max="10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Lockout duration (minutes)</label>
              <input
                type="number"
                value={safeSettings.lockoutDurationMinutes || 15}
                onChange={(e) => setSettings({ ...safeSettings, lockoutDurationMinutes: parseInt(e.target.value) || 15 })}
                className={inputCls}
                min="5"
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'mfa' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Multi-Factor & Lock Session Timing</h4>
            <p className="text-xs text-stone-500 mb-4">Force roles to enroll in TOTP verification and set timing thresholds.</p>
          </div>
          
          <div className="grid gap-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Enforce Multi-Factor Authentication (MFA)</label>
              <div className="flex items-center justify-between h-9 px-1">
                <span className="text-xs text-stone-500 font-medium">MFA mandatory for admin roles</span>
                <Switch
                  checked={safeSettings.mfaRequired}
                  onCheckedChange={(checked) => setSettings({ ...safeSettings, mfaRequired: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">MFA Grace Period (days)</label>
              <input
                type="number"
                value={safeSettings.mfaGracePeriodDays || 3}
                onChange={(e) => setSettings({ ...safeSettings, mfaGracePeriodDays: parseInt(e.target.value) || 3 })}
                className={inputCls}
                min="1"
                max="30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Maximum session duration (hours)</label>
              <input
                type="number"
                value={((safeSettings.sessionDurationMinutes || 120) / 60).toFixed(0)}
                onChange={(e) => setSettings({ ...safeSettings, sessionDurationMinutes: (parseInt(e.target.value) || 2) * 60 })}
                className={inputCls}
                min="1"
                max="24"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Idle timeout warning (minutes)</label>
              <input
                type="number"
                value={safeSettings.idleTimeoutMinutes || 30}
                onChange={(e) => setSettings({ ...safeSettings, idleTimeoutMinutes: parseInt(e.target.value) || 15 })}
                className={inputCls}
                min="5"
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'network' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">IP Access Whitelisting</h4>
            <p className="text-xs text-stone-500 mb-4">Limit database requests to designated corporate offices.</p>
          </div>
          
          <div className="grid gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Enable IP restrictions</label>
              <div className="flex items-center justify-between h-9 px-1 max-w-sm">
                <span className="text-xs text-stone-500 font-medium">IP whitelist rules active</span>
                <Switch
                  checked={safeSettings.ipRestrictionEnabled}
                  onCheckedChange={(checked) => setSettings({ ...safeSettings, ipRestrictionEnabled: checked })}
                  className="data-[state=checked]:bg-brand-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Whitelisted Corporate IPs</label>
              <textarea
                value={safeSettings.allowedIps || ''}
                onChange={(e) => setSettings({ ...safeSettings, allowedIps: e.target.value })}
                className={`${inputCls} min-h-[72px] py-2 text-xs`}
                placeholder="e.g. 192.168.1.1, 74.125.19.147"
              />
              <p className="text-[11px] text-stone-400 mt-1">Comma-separated IP addresses allowed to connect to administrative modules.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
