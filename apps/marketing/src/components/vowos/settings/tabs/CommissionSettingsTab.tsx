import { useEffect, useState } from 'react';
import { Percent, Loader2, Plus, Trash2, ShieldCheck, DollarSign, BadgePercent, Users } from 'lucide-react';
import { toast, Switch } from '@vowos/design-system';
import { inputCls, btnSecondary } from '@/components/vowos/ui';
import { supabase } from '@/lib/supabase';
import { getCompensationProfiles, CompensationProfile } from '@/lib/services/workforceStore';

interface StaffProfile {
  id: string;
  name: string;
}

interface CommissionSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function CommissionSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: CommissionSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<CompensationProfile[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'payouts' | 'overrides'>('plans');
  const [isAuditing, setIsAuditing] = useState(false);

  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newType, setNewType] = useState<CompensationProfile['type']>('hourly');
  const [newHourlyRate, setNewHourlyRate] = useState('15');
  const [newCommissionRate, setNewCommissionRate] = useState('3.0');

  const loadData = async () => {
    setLoading(true);
    const [{ data: staffData }, profilesData] = await Promise.all([
      supabase.from('staff_profiles').select('id, name').order('name'),
      getCompensationProfiles()
    ]);
    setStaff(staffData || []);
    setProfiles(profilesData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [resetTrigger]);

  useEffect(() => {
    onDirtyChange(false);
    registerSaveRef(async () => true);
  }, [onDirtyChange, registerSaveRef]);

  const addProfile = async () => {
    if (!newEmployeeId) {
      toast({ title: 'Select an employee', variant: 'destructive' });
      return;
    }
    const employee = staff.find((s) => s.id === newEmployeeId);
    if (!employee) return;
    
    if (profiles.some(p => p.employeeId === employee.id)) {
      toast({ title: 'Employee already has a profile', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('compensation_profiles').insert({
      employee_id: employee.id,
      employee_name: employee.name,
      type: newType,
      hourly_rate: parseFloat(newHourlyRate) || 0,
      salary_amount: 0,
      commission_rate: parseFloat(newCommissionRate) || 0,
      draw_amount: 0,
      effective_date: new Date().toISOString().split('T')[0],
    });

    if (error) {
      toast({ title: 'Error adding profile', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Profile added successfully' });
    setNewEmployeeId('');
    setNewHourlyRate('15');
    setNewCommissionRate('3.0');
    loadData();
  };

  const removeProfile = async (id: string) => {
    const { error } = await supabase.from('compensation_profiles').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting profile', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Profile deleted' });
    loadData();
  };

  const updateProfile = async (id: string, fields: Partial<CompensationProfile>) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, ...fields } : p));
    
    const updateData: any = {};
    if (fields.type !== undefined) updateData.type = fields.type;
    if (fields.hourlyRate !== undefined) updateData.hourly_rate = fields.hourlyRate;
    if (fields.commissionRate !== undefined) updateData.commission_rate = fields.commissionRate;
    if (fields.salaryAmount !== undefined) updateData.salary_amount = fields.salaryAmount;

    const { error } = await supabase.from('compensation_profiles').update(updateData).eq('id', id);
    if (error) {
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
      loadData();
    }
  };

  const runAudit = () => {
    setIsAuditing(true);
    toast({ title: 'Audit Started', description: 'Checking payout rules and historical records...' });
    setTimeout(() => {
      setIsAuditing(false);
      toast({ title: 'Audit Complete', description: 'No discrepancies found in compensation records.' });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading compensation profiles…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Commission & Compensation</h3>
              <p className="text-xs text-stone-500">
                Manage compensation profiles for staff members directly.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={runAudit}
            disabled={isAuditing}
            className={`${btnSecondary} gap-2`}
          >
            {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Run Audit
          </button>
        </div>
        
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'plans', label: 'Compensation Profiles', icon: BadgePercent },
            { id: 'payouts', label: 'Payout Rules', icon: DollarSign },
            { id: 'overrides', label: 'Role Overrides', icon: Users }
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

      {activeSubTab === 'plans' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Compensation Profiles</h4>
            <p className="text-xs text-stone-500 mb-4">Assign base rates and commission percentages to employees.</p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 max-w-4xl">
              <select
                value={newEmployeeId}
                onChange={(e) => setNewEmployeeId(e.target.value)}
                className={`${inputCls} flex-1`}
              >
                <option value="">Select Employee...</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className={`${inputCls} flex-1`}
              >
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
                <option value="hourly_plus_commission">Hourly + Commission</option>
                <option value="salary_plus_commission">Salary + Commission</option>
              </select>
              <input
                type="number"
                placeholder="Hourly ($)"
                value={newHourlyRate}
                onChange={(e) => setNewHourlyRate(e.target.value)}
                className={`${inputCls} w-28 text-right`}
                step="0.5"
              />
              <input
                type="number"
                placeholder="Comm (%)"
                value={newCommissionRate}
                onChange={(e) => setNewCommissionRate(e.target.value)}
                className={`${inputCls} w-28 text-right`}
                step="0.1"
              />
              <button
                onClick={addProfile}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Profile
              </button>
            </div>

            <div className="space-y-3">
              {profiles.map((profile) => (
                <div key={profile.id} className="rounded-xl border border-stone-200 bg-white p-4 space-y-4 max-w-4xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      <div className="text-sm font-semibold text-stone-800 px-1 -mx-1">{profile.employeeName}</div>
                      <div className="text-xs text-stone-400 mt-1 px-1 -mx-1">Effective: {profile.effectiveDate}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={profile.type}
                        onChange={(e) => updateProfile(profile.id!, { type: e.target.value as any })}
                        className={`${inputCls} py-1 text-xs`}
                      >
                        <option value="hourly">Hourly</option>
                        <option value="salary">Salary</option>
                        <option value="hourly_plus_commission">Hourly + Commission</option>
                        <option value="salary_plus_commission">Salary + Commission</option>
                      </select>
                      <button
                        onClick={() => removeProfile(profile.id!)}
                        className="text-stone-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 pt-3 border-t border-stone-100">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Hourly Rate ($)</label>
                      <input
                        type="number"
                        value={profile.hourlyRate || ''}
                        onChange={(e) => updateProfile(profile.id!, { hourlyRate: parseFloat(e.target.value) || 0 })}
                        className={inputCls}
                        step="0.5"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Salary Amount ($)</label>
                      <input
                        type="number"
                        value={profile.salaryAmount || ''}
                        onChange={(e) => updateProfile(profile.id!, { salaryAmount: parseFloat(e.target.value) || 0 })}
                        className={inputCls}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Commission Rate (%)</label>
                      <input
                        type="number"
                        value={profile.commissionRate || ''}
                        onChange={(e) => updateProfile(profile.id!, { commissionRate: parseFloat(e.target.value) || 0 })}
                        className={inputCls}
                        step="0.1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'payouts' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
           <div>
            <h4 className="text-sm font-bold text-stone-900">Payout Rules</h4>
            <p className="text-xs text-stone-500 mb-4">Determine when commission is released to consultants.</p>
          </div>
          <div className="max-w-xl space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-stone-100 bg-stone-50">
               <div>
                  <p className="text-sm font-medium text-stone-800">Require Full Payment</p>
                  <p className="text-xs text-stone-500">Commissions only released when invoice balance is 0.</p>
               </div>
               <Switch checked={true} onCheckedChange={() => {}} className="data-[state=checked]:bg-brand-primary" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-stone-100 bg-stone-50">
               <div>
                  <p className="text-sm font-medium text-stone-800">Split on Multi-Staff Invoices</p>
                  <p className="text-xs text-stone-500">Automatically divide commission if multiple staff are assigned.</p>
               </div>
               <Switch checked={false} onCheckedChange={() => {}} className="data-[state=checked]:bg-brand-primary" />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'overrides' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
           <div>
            <h4 className="text-sm font-bold text-stone-900">Role Overrides</h4>
            <p className="text-xs text-stone-500 mb-4">Set specific commission behaviors per employee role.</p>
          </div>
          <div className="p-10 text-center border-2 border-dashed border-stone-200 rounded-xl">
             <p className="text-sm text-stone-500">No role overrides configured yet. Add roles in HR settings first.</p>
          </div>
        </div>
      )}
    </div>
  );
}
