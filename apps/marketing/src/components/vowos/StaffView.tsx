import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Check, Minus, UserCog, Users2, UserPlus, Trash2, Search, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from '@vowos/design-system';
import { useAuth } from '@/contexts/AuthContext';
;
import { OrganizationRole, STAFF_ROLES, ROLE_DESCRIPTIONS, ROLE_BADGE_CLASSES, normalizeOrganizationRole } from '@/lib/auth/roles';;
import { PageHeader, StatCard, Modal, inputCls, btnPrimary, btnSecondary, BeautifulEmptyState } from './ui';
import { NAV_ITEMS, VIEW_ACCESS, ViewKey } from './Sidebar';
import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';
import { Switch } from '@vowos/design-system';
import { ROLE_PERMISSIONS } from '@/lib/services/authService';
import Staff360Modal from './Staff360Modal';

const GRANULAR_ACTIONS_LIST = [
  {
    group: 'Settings & Administration',
    actions: [
      { key: 'settings.view', label: 'View general boutique settings' },
      { key: 'settings.manage', label: 'Modify general boutique settings' },
      { key: 'settings.security.manage', label: 'Edit system security policies' },
      { key: 'settings.payroll.manage', label: 'Configure corporate payroll guidelines' },
    ],
  },
  {
    group: 'Staff & Roles',
    actions: [
      { key: 'staff.view', label: 'View employee roster and directories' },
      { key: 'staff.invite', label: 'Send new employee registration links' },
      { key: 'staff.edit', label: 'Edit staff profiles and roles' },
      { key: 'staff.edit_compensation', label: 'Modify employee hourly wage rates & salaries' },
    ],
  },
  {
    group: 'Time Clock & Timecards',
    actions: [
      { key: 'timeclock.use', label: 'Use interactive employee time clock puncher' },
      { key: 'timeclock.override_location', label: 'Allow clocking in outside geofence boundary' },
      { key: 'timecards.view_team', label: 'Review timesheets for floor staff' },
      { key: 'timecards.approve', label: 'Approve submitted employee timecards' },
      { key: 'timecards.lock', label: 'Lock shifts and finalize timecard periods' },
    ],
  },
  {
    group: 'Payroll Engine & Calculations',
    actions: [
      { key: 'payroll.view_summary', label: 'View payroll dashboard costs & summaries' },
      { key: 'payroll.create_run', label: 'Execute a payroll period run wizard' },
      { key: 'payroll.calculate', label: 'Execute gross-to-net tax computations' },
      { key: 'payroll.approve', label: 'Approve payroll drafts (Separation of duties)' },
      { key: 'payroll.post', label: 'Post payroll journals to ledger accounts' },
    ],
  },
];

interface StaffRow {
  id: string;
  name: string;
  role: OrganizationRole;
  created_at: string;
}

import { useDemo } from '@/lib/demo/demoContext';

export default function StaffView() {
  const { profile: authProfile, refreshProfile } = useAuth();
  const { isDemoMode, activePersona } = useDemo();
  const profile = isDemoMode ? { id: 'demo-owner', role: activePersona.role, name: activePersona.name } as any : authProfile;

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  
  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<OrganizationRole>('Stylist');
  const [addingStaff, setAddingStaff] = useState(false);

  // User-specific customizable permission state
  const [userPermissions, setUserPermissions] = useState<Record<string, ViewKey[]>>({});
  const [matrixMode, setMatrixMode] = useState<'per-user' | 'role-defaults'>('per-user');

  // Custom user-specific Action Privileges
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedStaffForActions, setSelectedStaffForActions] = useState<StaffRow | null>(null);
  const [selectedStaff360, setSelectedStaff360] = useState<StaffRow | null>(null);
  const [customActionPermissions, setCustomActionPermissions] = useState<Record<string, string[]>>({});

  const isOwner = profile?.role === 'Owner';

  const loadStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('id, name, role, created_at')
      .order('created_at', { ascending: true });
    if (!error && data) {
      setStaff(data.map((r) => ({ ...r, role: normalizeOrganizationRole(r.role) })));
    }
    
    // Load custom user-specific permission matrix
    const dataPlane = getActiveDataPlane();
    const permResult = await resolveEffectiveSetting<Record<string, ViewKey[]>>(
      'custom_user_permissions',
      'custom_user_permissions',
      { dataPlane },
      {}
    );
    const actionsResult = await resolveEffectiveSetting<Record<string, string[]>>(
      'custom_action_permissions',
      'custom_action_permissions',
      { dataPlane },
      {}
    );
    const permissionsMap = permResult.value;
    const actionsMap = actionsResult.value;
    setUserPermissions(permissionsMap);
    localStorage.setItem('vowos_user_permissions', JSON.stringify(permissionsMap));
    setCustomActionPermissions(actionsMap);
    localStorage.setItem('vowos_action_permissions', JSON.stringify(actionsMap));
    setLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const toggleUserPermission = async (staffId: string, staffName: string, staffRole: OrganizationRole, viewKey: ViewKey) => {
    if (!isOwner) {
      toast({ title: 'Authorization Blocked', description: 'Only Owners can modify custom user permissions.', variant: 'destructive' });
      return;
    }

    let currentList = Array.isArray(userPermissions[staffId]) ? userPermissions[staffId] : null;
    if (!currentList) {
      currentList = NAV_ITEMS.filter((item) => VIEW_ACCESS[item.key]?.includes(staffRole) ?? false).map((item) => item.key);
    }

    const hasAccess = currentList.includes(viewKey);
    const updatedList = hasAccess
      ? currentList.filter((k) => k !== viewKey)
      : [...currentList, viewKey];

    const newMap = { ...userPermissions, [staffId]: updatedList };
    setUserPermissions(newMap);
    localStorage.setItem('vowos_user_permissions', JSON.stringify(newMap));
    const dataPlane = getActiveDataPlane();
    await saveScopedSetting('custom_user_permissions', 'custom_user_permissions', newMap, { dataPlane }, 'Staff permissions updated');

    const sectionLabel = NAV_ITEMS.find((n) => n.key === viewKey)?.label ?? viewKey;
    toast({
      title: hasAccess ? 'Access Revoked' : 'Access Granted',
      description: `${hasAccess ? 'Disabled' : 'Enabled'} access to ${sectionLabel} for ${staffName}.`,
    });
  };

  const resetUserPermissions = async (staffId: string, staffName: string) => {
    if (!isOwner) return;
    const newMap = { ...userPermissions };
    delete newMap[staffId];
    setUserPermissions(newMap);
    localStorage.setItem('vowos_user_permissions', JSON.stringify(newMap));
    const dataPlane = getActiveDataPlane();
    await saveScopedSetting('custom_user_permissions', 'custom_user_permissions', newMap, { dataPlane }, 'Staff permissions reset');
    toast({
      title: 'Permissions Reset',
      description: `Reset section access for ${staffName} to default role baseline.`,
    });
  };

  const changeRole = async (id: string, role: OrganizationRole) => {
    const prev = staff.find((s) => s.id === id);
    if (!prev || prev.role === role) return;

    // 1. Self-change / self-promotion prevention
    if (profile?.id === id) {
      toast({ title: 'Self-Promotion Blocked', description: 'You cannot modify or promote your own account role.', variant: 'destructive' });
      return;
    }

    // 2. Manager authority restriction: Managers cannot assign Manager or Owner roles
    if (profile?.role === 'Manager' && (role === 'Owner' || role === 'Manager')) {
      toast({ title: 'Elevation Blocked', description: 'Managers can only assign nonprivileged staff roles.', variant: 'destructive' });
      return;
    }

    setSavingId(id);
    setStaff((list) => list.map((s) => (s.id === id ? { ...s, role } : s)));
    const { error } = await supabase.from('staff_profiles').update({ role }).eq('id', id);
    setSavingId(null);
    if (error) {
      setStaff((list) => list.map((s) => (s.id === id ? prev : s)));
      toast({ title: 'Could not change role', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Role updated', description: `${prev.name} is now ${role}.` });
    if (profile && id === profile.id) await refreshProfile();
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      toast({ title: 'Missing parameters', description: 'Please fill in name, email and password.', variant: 'destructive' });
      return;
    }

    // 3. Manager authority restriction on new account creation
    if (profile?.role !== 'Owner' && (addRole === 'Owner' || addRole === 'Manager')) {
      toast({ title: 'Elevation Blocked', description: 'Only existing active Owners can create Manager or Owner accounts.', variant: 'destructive' });
      return;
    }

    setAddingStaff(true);

    try {
      // 1. Create a non-persist session client using same endpoints to prevent logging the current owner out.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const inviteClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      // 2. Perform the guest registration
      const { data, error } = await inviteClient.auth.signUp({
        email: addEmail.trim(),
        password: addPassword.trim(),
        options: {
          data: {
            name: addName.trim(),
            role: addRole,
          },
        },
      });

      if (error) {
        toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
        setAddingStaff(false);
        return;
      }

      if (data?.user) {
        // 3. Upsert their profile using our main owner credentials
        const { error: profileErr } = await supabase.from('staff_profiles').upsert({
          id: data.user.id,
          name: addName.trim(),
          role: addRole,
        });

        if (profileErr) {
          toast({ title: 'Profile creation failed', description: profileErr.message, variant: 'destructive' });
        } else {
          toast({ title: 'Staff registered successfully', description: `${addName.trim()} created as ${addRole}.` });
          loadStaff();
          // Reset form
          setAddName('');
          setAddEmail('');
          setAddPassword('');
          setAddRole('Stylist');
          setShowAddModal(false);
        }
      }
    } catch (err: any) {
      toast({ title: 'Unexpected error occurred', description: err.message || '', variant: 'destructive' });
    } finally {
      setAddingStaff(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (profile?.id === id) {
      toast({ title: 'Operation blocked', description: 'You cannot delete your own administrative account.', variant: 'destructive' });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${name}? This will revoke their access to VowOS.`)) return;

    const { error } = await supabase.from('staff_profiles').delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not delete staff member', description: error.message, variant: 'destructive' });
      return;
    }

    setStaff((list) => list.filter((s) => s.id !== id));
    toast({ title: 'Staff deleted', description: `${name} has been removed from VowOS.` });
  };

  const counts = useMemo(() => {
    const c: Record<OrganizationRole, number> = { Owner: 0, Manager: 0, Stylist: 0, 'Front Desk': 0 };
    staff.forEach((s) => (c[s.role] += 1));
    return c;
  }, [staff]);

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.role.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Staff & Roles"
        subtitle="Manage team accounts and what each role can open across VowOS"
        action={
          isOwner && (
            <button data-tour-id="btn-add-staff" onClick={() => setShowAddModal(true)} className={btnPrimary}>
              <UserPlus className="h-4 w-4" /> Add Staff Member
            </button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Team Members" value={String(staff.length)} sub="Staff accounts on file" icon={<Users2 className="h-5 w-5" />} accent="rose" />
        <StatCard label="Owners" value={String(counts.Owner)} sub="Full access + role management" icon={<ShieldCheck className="h-5 w-5" />} accent="amber" />
        <StatCard label="Managers" value={String(counts.Manager)} sub="Run stores end-to-end" icon={<UserCog className="h-5 w-5" />} accent="violet" />
        <StatCard label="Floor Staff" value={String(counts.Stylist + counts['Front Desk'])} sub="Stylists + front desk" icon={<Users2 className="h-5 w-5" />} accent="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Team directory */}
        <div className="xl:col-span-3 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg text-stone-900">Team Directory</h3>
                <p className="text-xs text-stone-500">
                  {isOwner ? "As Owner you can reassign anyone's role." : 'Only Owners can change roles.'}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial md:w-64">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search staff directory..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={`${inputCls} pl-9 h-8 py-1 text-xs`}
                  />
                </div>
                {isOwner && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className={`${btnPrimary} h-8 py-1 text-xs font-semibold shrink-0`}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add Staff
                  </button>
                )}
              </div>
            </div>
            {loading ? (
              <p className="px-5 py-10 text-center text-sm text-stone-400">Loading team…</p>
            ) : filteredStaff.length === 0 ? (
              <BeautifulEmptyState
                icon={<Users2 className="h-8 w-8" />}
                title="No Staff Found"
                description="No matching staff accounts found."
                colorHint="sky"
              />
            ) : (
              <ul className="divide-y divide-stone-100">
                {filteredStaff.map((s) => {
                  const initials = s.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <li 
                      key={s.id} 
                      className="flex flex-wrap items-center gap-4 border-b border-stone-100 p-4 last:border-0 hover:bg-stone-50/70 transition-colors cursor-pointer group"
                      onClick={(e) => {
                         // prevent firing if clicking a select or button inside the row
                         const target = e.target as HTMLElement;
                         if (target.closest('button') || target.closest('select')) return;
                         setSelectedStaff360(s);
                      }}
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-stone-500 to-stone-700 text-sm font-semibold text-white group-hover:from-rose-500 group-hover:to-rose-600 transition-colors">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-900 group-hover:text-brand-primary transition-colors">
                          {s.name}
                          {profile?.id === s.id && <span className="ml-2 text-xs text-stone-400">(you)</span>}
                        </p>
                        <p className="text-xs text-stone-500">Joined {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${ROLE_BADGE_CLASSES[s.role]}`}>
                        {s.role}
                      </span>
                      {isOwner && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedStaffForActions(s);
                              setShowActionsModal(true);
                            }}
                            className="text-stone-500 hover:text-brand-primary p-1.5 border border-stone-200 bg-stone-50/50 hover:bg-brand-soft rounded-lg transition-colors flex items-center gap-1 text-xs"
                            title="Configure Granular Action Privileges"
                          >
                            <UserCog className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline font-medium">Actions</span>
                          </button>
                          <select
                            value={s.role}
                            disabled={savingId === s.id}
                            onChange={(e) => changeRole(s.id, e.target.value as OrganizationRole)}
                            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-700 focus:border-brand-primary focus:outline-none disabled:opacity-50"
                          >
                            {STAFF_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          {profile?.id !== s.id && (
                            <button
                              onClick={() => handleDeleteStaff(s.id, s.name)}
                              className="text-stone-400 hover:text-red-600 p-1.5 border border-stone-200 bg-stone-50/50 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Role descriptions */}
          <div className="grid gap-3 sm:grid-cols-2">
            {STAFF_ROLES.map((r) => (
              <div key={r} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${ROLE_BADGE_CLASSES[r]}`}>
                  {r}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">{ROLE_DESCRIPTIONS[r]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Permission matrix */}
        <div className="xl:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 px-5 py-4 gap-3">
              <div>
                <h3 className="font-serif text-lg text-stone-900">Permission Matrix</h3>
                <p className="text-xs text-stone-500">
                  {matrixMode === 'per-user'
                    ? 'Customize section permissions for each staff member individually.'
                    : 'Default access baseline for standard roles.'}
                </p>
              </div>

              {/* Mode Toggle Switcher */}
              <div className="inline-flex rounded-xl bg-stone-100 p-1 text-xs font-medium self-start sm:self-auto">
                <button
                  onClick={() => setMatrixMode('per-user')}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${
                    matrixMode === 'per-user'
                      ? 'bg-white font-semibold text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Per Staff Member
                </button>
                <button
                  onClick={() => setMatrixMode('role-defaults')}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${
                    matrixMode === 'role-defaults'
                      ? 'bg-white font-semibold text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Role Defaults
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/70 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                    <th className="px-4 py-3 min-w-[140px]">Section</th>
                    {matrixMode === 'per-user' ? (
                      staff.map((s) => {
                        const hasCustom = !!userPermissions[s.id];
                        return (
                          <th key={s.id} className="px-3 py-3 text-center min-w-[150px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-semibold text-stone-800 normal-case text-xs truncate max-w-[130px]" title={s.name}>
                                {s.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${ROLE_BADGE_CLASSES[s.role]}`}>
                                  {s.role}
                                </span>
                                {hasCustom && (
                                  <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[9px] font-bold text-brand-primary">
                                    Custom
                                  </span>
                                )}
                              </div>
                              {hasCustom && isOwner && (
                                <button
                                  onClick={() => resetUserPermissions(s.id, s.name)}
                                  className="mt-1 text-[10px] text-stone-400 underline hover:text-stone-600 normal-case"
                                  title="Reset to role default"
                                >
                                  Reset Default
                                </button>
                              )}
                            </div>
                          </th>
                        );
                      })
                    ) : (
                      STAFF_ROLES.map((r) => (
                        <th key={r} className="px-2 py-3 text-center">{r === 'Front Desk' ? 'Desk' : r}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {NAV_ITEMS.map(({ key, label }) => (
                    <tr key={key} className="hover:bg-stone-50/60">
                      <td className="whitespace-nowrap px-4 py-2.5 text-stone-700 font-medium">{label}</td>
                      {matrixMode === 'per-user' ? (
                        staff.map((s) => {
                          const isAllowed = Array.isArray(userPermissions[s.id])
                            ? userPermissions[s.id].includes(key)
                            : (VIEW_ACCESS[key]?.includes(s.role) ?? false);
                          const isDisabled = !isOwner || s.role === 'Owner';

                          return (
                            <td key={s.id} className="px-3 py-2.5 text-center">
                              <div className="flex justify-center">
                                <Switch
                                  checked={isAllowed}
                                  disabled={isDisabled}
                                  onCheckedChange={() => toggleUserPermission(s.id, s.name, s.role, key)}
                                  className="data-[state=checked]:bg-status-success scale-90"
                                />
                              </div>
                            </td>
                          );
                        })
                      ) : (
                        STAFF_ROLES.map((r) => (
                          <td key={r} className="px-2 py-2.5 text-center">
                            {VIEW_ACCESS[key]?.includes(r) ? (
                              <Check className="mx-auto h-4 w-4 text-status-success" />
                            ) : (
                              <Minus className="mx-auto h-4 w-4 text-stone-300" />
                            )}
                          </td>
                        ))
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Register Team Member">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Full Name</label>
            <input
              type="text"
              required
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. Eleanor Vance"
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Email Address</label>
            <input
              type="email"
              required
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="e.g. eleanor@robertsenterprises.com"
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Password</label>
            <input
              type="password"
              required
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
              placeholder="e.g. minimum 8 characters"
              className={inputCls}
              minLength={8}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">System Access Role</label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as OrganizationRole)}
              className={inputCls}
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className={btnSecondary}
              disabled={addingStaff}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={btnPrimary}
              disabled={addingStaff}
            >
              {addingStaff ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Registering…
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Granular Action Privileges Modal */}
      {selectedStaffForActions && (
        <Modal
          open={showActionsModal}
          onClose={() => setShowActionsModal(false)}
          title={`Configure Action Privileges: ${selectedStaffForActions.name}`}
        >
          <div className="space-y-5">
            <p className="text-xs text-stone-500">
              Customize specific system actions for <span className="font-semibold text-stone-800">{selectedStaffForActions.name}</span>. 
              These granular privileges override standard role defaults.
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {GRANULAR_ACTIONS_LIST.map((group) => (
                <div key={group.group} className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{group.group}</h4>
                  <div className="space-y-2">
                    {group.actions.map((act) => {
                      const staffActions = customActionPermissions[selectedStaffForActions.id] ?? (
                        ROLE_PERMISSIONS[selectedStaffForActions.role] || []
                      );
                      const isGranted = staffActions.includes(act.key);

                      return (
                        <div key={act.key} className="flex items-center justify-between py-1 border-b border-stone-100/50 last:border-0 pb-1.5 last:pb-0">
                          <div>
                            <p className="text-xs font-semibold text-stone-800">{act.key}</p>
                            <p className="text-[11px] text-stone-400">{act.label}</p>
                          </div>
                          <Switch
                            checked={isGranted}
                            disabled={selectedStaffForActions.role === 'Owner'}
                            onCheckedChange={async () => {
                              const newStaffActions = isGranted
                                ? staffActions.filter(k => k !== act.key)
                                : [...staffActions, act.key];
                              const newMap = { ...customActionPermissions, [selectedStaffForActions.id]: newStaffActions };
                              setCustomActionPermissions(newMap);
                              localStorage.setItem('vowos_action_permissions', JSON.stringify(newMap));
                              const dataPlane = getActiveDataPlane();
                              await saveScopedSetting('custom_action_permissions', 'custom_action_permissions', newMap, { dataPlane }, 'Action permission added');
                              toast({ title: 'Privilege Updated', description: `${isGranted ? 'Revoked' : 'Granted'} ${act.key}.` });
                            }}
                            className="data-[state=checked]:bg-status-success scale-90"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-stone-100">
              <button
                onClick={async () => {
                  const newMap = { ...customActionPermissions };
                  delete newMap[selectedStaffForActions.id];
                  setCustomActionPermissions(newMap);
                  localStorage.setItem('vowos_action_permissions', JSON.stringify(newMap));
                  const dataPlane = getActiveDataPlane();
                  await saveScopedSetting('custom_action_permissions', 'custom_action_permissions', newMap, { dataPlane }, 'Action permission removed');
                  toast({ title: 'Privileges Reset', description: `Reset action privileges for ${selectedStaffForActions.name} to role defaults.` });
                }}
                className="text-xs text-stone-400 underline hover:text-stone-600"
              >
                Reset to Role Defaults
              </button>

              <button onClick={() => setShowActionsModal(false)} className={btnPrimary}>
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedStaff360 && (
        <Staff360Modal staff={selectedStaff360} onClose={() => setSelectedStaff360(null)} />
      )}
    </div>
  );
}
