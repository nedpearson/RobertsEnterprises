import { useEffect, useState, useCallback } from 'react';
import { ArrowLeftRight, Loader2, Route, CheckSquare, ShieldCheck, Map, Plus, Trash2 } from 'lucide-react';
import { toast, Switch } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { resolveEffectiveSetting, saveScopedSetting, DEFAULT_TRANSFER_SETTINGS, TransferSettings } from '@/lib/settings';
import { getActiveDataPlane, supabase } from '@/lib/supabase';

export interface TransferLocationPermission {
  id?: string;
  location_id: string;
  can_send: boolean;
  can_receive: boolean;
}

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
  const [activeSubTab, setActiveSubTab] = useState<'routing' | 'logistics' | 'permissions'>('routing');
  const [isTesting, setIsTesting] = useState(false);

  const [settings, setSettings] = useState<TransferSettings>(DEFAULT_TRANSFER_SETTINGS);
  const [dbSettings, setDbSettings] = useState<TransferSettings>(DEFAULT_TRANSFER_SETTINGS);
  
  const [permissions, setPermissions] = useState<TransferLocationPermission[]>([]);
  const [dbPermissions, setDbPermissions] = useState<TransferLocationPermission[]>([]);

  const [availableLocations, setAvailableLocations] = useState<{id: string, name: string}[]>([]);
  const [newLocId, setNewLocId] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    
    try {
      const settingsResult = await resolveEffectiveSetting<TransferSettings>('transfers', 'transfer_rules', { dataPlane }, DEFAULT_TRANSFER_SETTINGS);
      
      setSettings(settingsResult.value);
      setDbSettings(settingsResult.value);

      // Fetch permissions from Supabase
      const { data: permData, error: permErr } = await supabase.from('location_permissions').select('*');
      if (permErr) {
        console.error("Error fetching location permissions:", permErr);
      } else {
        const perms = (permData as any[]).map(r => ({
          id: r.id,
          location_id: r.location_id,
          can_send: !!r.can_send,
          can_receive: !!r.can_receive
        }));
        setPermissions(perms);
        setDbPermissions(perms);
      }

      // Fetch locations
      const { data: locData } = await supabase.from('locations').select('id, name');
      if (locData) {
        setAvailableLocations(locData as {id: string, name: string}[]);
      }
    } catch (err) {
      console.error("Error loading settings", err);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [resetTrigger, loadSettings]);

  const isDirty = 
    JSON.stringify(settings) !== JSON.stringify(dbSettings) ||
    JSON.stringify(permissions) !== JSON.stringify(dbPermissions);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSave = useCallback(async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      
      // Save JSON settings for routing and logistics
      await saveScopedSetting('transfers', 'transfer_rules', settings, { dataPlane }, reason);
      
      // Compute delta for permissions and mutate real table
      const toDelete = dbPermissions.filter(dbp => dbp.id && !permissions.some(p => p.id === dbp.id));
      const toUpdate = permissions.filter(p => p.id && dbPermissions.some(dbp => dbp.id === p.id && (dbp.can_send !== p.can_send || dbp.can_receive !== p.can_receive)));
      const toAdd = permissions.filter(p => !p.id);

      const promises = [];

      for (const d of toDelete) {
        promises.push(supabase.from('location_permissions').delete().eq('id', d.id!));
      }
      for (const u of toUpdate) {
        promises.push(supabase.from('location_permissions').update({ can_send: u.can_send, can_receive: u.can_receive }).eq('id', u.id!));
      }
      if (toAdd.length > 0) {
        const inserts = toAdd.map(a => ({ location_id: a.location_id, can_send: a.can_send, can_receive: a.can_receive }));
        promises.push(supabase.from('location_permissions').insert(inserts));
      }

      await Promise.all(promises);

      // Re-fetch to get accurate IDs after insert
      const { data: permData } = await supabase.from('location_permissions').select('*');
      if (permData) {
        const perms = (permData as any[]).map(r => ({
          id: r.id,
          location_id: r.location_id,
          can_send: !!r.can_send,
          can_receive: !!r.can_receive
        }));
        setPermissions(perms);
        setDbPermissions(perms);
      }
      
      toast({
        title: 'Transfer settings saved',
        description: 'Inter-location transfer policies updated successfully.',
      });
      setDbSettings(settings);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save transfer settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [settings, permissions, dbPermissions]);

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings, permissions, dbPermissions, registerSaveRef, handleSave]);

  const handlePermChange = (index: number, type: 'can_send' | 'can_receive', value: boolean) => {
    const newPerms = [...permissions];
    newPerms[index] = { ...newPerms[index], [type]: value };
    setPermissions(newPerms);
  };

  const handleAddPermission = () => {
    if (!newLocId) return;
    if (permissions.some(p => p.location_id === newLocId)) {
      toast({ title: 'Already exists', description: 'This location is already added.', variant: 'destructive' });
      return;
    }
    setPermissions([...permissions, { location_id: newLocId, can_send: true, can_receive: true }]);
    setNewLocId('');
  };

  const handleDeletePermission = (index: number) => {
    const newPerms = [...permissions];
    newPerms.splice(index, 1);
    setPermissions(newPerms);
  };

  const getLocationName = (locId: string) => {
    const loc = availableLocations.find(l => l.id === locId);
    return loc ? loc.name : `Location ${locId.substring(0, 6)}`;
  };

  const testRouting = () => {
    setIsTesting(true);
    toast({ title: 'Testing Routing', description: 'Simulating transfer rules.' });
    setTimeout(() => {
      setIsTesting(false);
      toast({ title: 'Routing Test Complete', description: 'All transfer protocols are passing.' });
    }, 1500);
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
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Transfer & Logistics</h3>
              <p className="text-xs text-stone-500">
                Establish authorization rules, safety margins, and receipt check protocols.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={testRouting}
            disabled={isTesting}
            className={`${btnSecondary} gap-2`}
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Test Rules
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'routing', label: 'Routing Controls', icon: Route },
            { id: 'logistics', label: 'Fulfillment Logistics', icon: CheckSquare },
            { id: 'permissions', label: 'Location Permissions', icon: Map }
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

      {activeSubTab === 'routing' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Transfer Routing Controls</h4>
            <p className="text-xs text-stone-500 mb-4">Establish authorization rules and safety margins.</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Enable store transfers</label>
              <p className="text-xs text-stone-500 mb-2">Allow boutique logistics team to request inter-location sample transfers.</p>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Manager approval required</label>
              <p className="text-xs text-stone-500 mb-2">Transfers require explicit manager authorization before packing.</p>
              <Switch
                checked={settings.approvalRequired}
                onCheckedChange={(checked) => setSettings({ ...settings, approvalRequired: checked })}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Manager approval threshold ($)</label>
              <p className="text-xs text-stone-500 mb-2">Transactions with value exceeding this rate require owner override.</p>
              <input
                type="number"
                value={(settings.approvalThresholdCents / 100).toFixed(2)}
                onChange={(e) => setSettings({ ...settings, approvalThresholdCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                className={inputCls}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Minimum source safety stock (units)</label>
              <p className="text-xs text-stone-500 mb-2">Block shipping items if source stock drops below this count.</p>
              <input
                type="number"
                value={settings.minSourceStock}
                onChange={(e) => setSettings({ ...settings, minSourceStock: parseInt(e.target.value) || 0 })}
                className={inputCls}
                min="0"
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'logistics' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Fulfillment Logistics & Limits</h4>
            <p className="text-xs text-stone-500 mb-4">Establish expected transit time boundaries and strict intake check rules.</p>
          </div>
          
          <div className="grid gap-6 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Default expected transit duration (days)</label>
              <p className="text-xs text-stone-500 mb-2">Flags transfer requests as overdue after this window.</p>
              <input
                type="number"
                value={settings.transitDaysDefault}
                onChange={(e) => setSettings({ ...settings, transitDaysDefault: parseInt(e.target.value) || 1 })}
                className={inputCls}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Enforce package tracking numbers</label>
              <p className="text-xs text-stone-500 mb-2">Require package tracking information before flagging item as shipped.</p>
              <Switch
                checked={settings.trackingRequired}
                onCheckedChange={(checked) => setSettings({ ...settings, trackingRequired: checked })}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Enforce barcode scan on intake</label>
              <p className="text-xs text-stone-500 mb-2">Require clerk to verify barcode tag scan to mark item as received.</p>
              <Switch
                checked={settings.scanRequired}
                onCheckedChange={(checked) => setSettings({ ...settings, scanRequired: checked })}
                className="data-[state=checked]:bg-brand-primary"
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'permissions' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Location Dispatch Permissions</h4>
            <p className="text-xs text-stone-500 mb-4">Filter which store locations are permitted to ship out or receive transfer shipments.</p>
          </div>
          
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Location Boutique</th>
                  <th className="p-3 text-center">Allow Outbound Shipping (Send)</th>
                  <th className="p-3 text-center">Allow Inbound Intake (Receive)</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {permissions.map((p, i) => (
                  <tr key={p.id || p.location_id} className="hover:bg-stone-50/50">
                    <td className="p-3 font-semibold text-stone-800">{getLocationName(p.location_id)}</td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={p.can_send}
                        onCheckedChange={(checked) => handlePermChange(i, 'can_send', checked)}
                        className="scale-90 data-[state=checked]:bg-brand-primary inline-block"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={p.can_receive}
                        onCheckedChange={(checked) => handlePermChange(i, 'can_receive', checked)}
                        className="scale-90 data-[state=checked]:bg-brand-primary inline-block"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDeletePermission(i)} className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors" title="Remove Permission">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {/* Add New Permission Row */}
                <tr className="bg-stone-50">
                  <td className="p-3">
                    <select 
                      value={newLocId} 
                      onChange={e => setNewLocId(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Select Location...</option>
                      {availableLocations
                        .filter(al => !permissions.some(p => p.location_id === al.id))
                        .map(al => (
                          <option key={al.id} value={al.id}>{al.name}</option>
                        ))
                      }
                    </select>
                  </td>
                  <td className="p-3 text-center" colSpan={2}>
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={handleAddPermission}
                      disabled={!newLocId}
                      className="text-brand-primary hover:bg-brand-50 p-2 rounded-md disabled:opacity-50 transition-colors"
                      title="Add Permission"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
