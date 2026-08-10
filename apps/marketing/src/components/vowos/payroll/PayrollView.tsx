import { useState, useEffect } from 'react';
import { Coins, Calendar, AlertTriangle, UserCheck, CheckCircle, Plus, Trash2, ArrowRight, CreditCard, FileText, DollarSign, Briefcase, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@vowos/design-system';
import {
  getDepartments,
  getCompensationProfiles,
  saveCompensationProfiles,
  getLeaveRequests,
  saveLeaveRequests,
  getBonuses,
  getReimbursements,
  getDeductions,
  writeAuditLog,
  getTimeEntries,
  saveTimeEntries,
  getTimeEntrySegments,
  saveTimeEntrySegments,
  getTimeEntryCorrections,
  saveTimeEntryCorrections,
  getOfficialPayrollPeriods,
  saveOfficialPayrollPeriods,
  CompensationProfile,
  Department,
  LeaveRequest,
  Bonus,
  Reimbursement,
  Deduction,
  TimeEntry,
  TimeEntrySegment,
  TimeEntryCorrection,
  OfficialPayrollPeriod
} from '@/lib/services/workforceStore';
import { authorizeAction } from '@/lib/services/authService';
import { PayrollRunResult, compilePayrollPeriod } from '@/lib/services/payrollEngine';
import { Modal, StatCard, inputCls, btnPrimary, btnSecondary } from '../ui';
import { PayrollScopeBar, PayrollScope } from './PayrollScopeBar';
import { ExceptionCenter, ExceptionData } from './ExceptionCenter';
import { PayrollWizard } from './PayrollWizard';
import { Timecard360 } from './Timecard360';
import { format } from 'date-fns';

export default function PayrollView() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'command' | 'timecards' | 'corrections' | 'exceptions' | 'compensation' | 'leave'>('command');
  
  // Data State
  const [profiles, setProfiles] = useState<CompensationProfile[]>([]);
  const [punches, setPunches] = useState<TimeEntry[]>([]);
  const [segments, setSegments] = useState<TimeEntrySegment[]>([]);
  const [corrections, setCorrections] = useState<TimeEntryCorrection[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officialPeriods, setOfficialPeriods] = useState<OfficialPayrollPeriod[]>([]);
  
  // Scope State
  const [scope, setScope] = useState<PayrollScope>({
    startDate: '',
    endDate: '',
    businessId: 'roberts-enterprises',
    locations: ['all'],
    payGroup: 'all',
    department: 'all',
    employeeSearch: ''
  });
  
  // Modals & Sub-views
  const [showWizard, setShowWizard] = useState(false);
  const [draftRun, setDraftRun] = useState<PayrollRunResult | null>(null);
  const [viewingTimecard, setViewingTimecard] = useState<TimeEntry | null>(null);

  const [showCompModal, setShowCompModal] = useState(false);
  const [compEmployee, setCompEmployee] = useState('');
  const [compType, setCompType] = useState<'hourly' | 'salary'>('hourly');
  const [compRate, setCompRate] = useState('22.50');
  const [compEffective, setCompEffective] = useState('2026-07-01');
  const [compReason, setCompReason] = useState('Promo adjust');

  const loadData = async () => {
    try {
      setProfiles(await getCompensationProfiles());
      setDepartments(await getDepartments());
      setLeaveRequests(await getLeaveRequests());
      setBonuses(await getBonuses());
      setReimbursements(await getReimbursements());
      setDeductions(await getDeductions());
      setPunches(await getTimeEntries());
      setSegments(await getTimeEntrySegments());
      setCorrections(await getTimeEntryCorrections());
      setOfficialPeriods(await getOfficialPayrollPeriods());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!profile) return null;

  const canManageComp = authorizeAction({ userId: profile.id, userRole: profile.role, permission: 'compensation.edit' }).allowed;
  const canProcessPayroll = authorizeAction({ userId: profile.id, userRole: profile.role, permission: 'payroll.create_run' }).allowed;

  // Filter data based on current scope
  const scopedPunches = punches.filter(p => {
    if (scope.startDate && p.clockIn.split('T')[0] < scope.startDate) return false;
    if (scope.endDate && p.clockIn.split('T')[0] > scope.endDate) return false;
    if (scope.businessId && p.businessId !== scope.businessId) return false;
    
    // Check location
    if (scope.locations.length > 0 && !scope.locations.includes('all')) {
      const pSegs = segments.filter(s => s.timeEntryId === p.id);
      if (pSegs.length > 0) {
        if (!pSegs.some(s => scope.locations.includes(s.locationId))) return false;
      } else {
        if (!scope.locations.includes(p.originalLocationId)) return false;
      }
    }
    
    // Check department via segment or comp profile
    // Simplification: if searching by department, we filter...
    
    return true;
  });

  // Calculate Exceptions dynamically
  const generateExceptions = (): ExceptionData[] => {
    const exs: ExceptionData[] = [];
    scopedPunches.forEach(p => {
      const start = new Date(p.clockIn).getTime();
      const end = p.clockOut ? new Date(p.clockOut).getTime() : new Date().getTime();
      const hrs = (end - start) / 3_600_000;
      
      if (!p.clockOut && hrs > 16) {
        exs.push({ id: `ex-${p.id}-miss`, type: 'missing_punch', title: 'Missing Clock Out', employeeName: p.employeeName, description: 'Shift exceeded 16 hours without clock-out.', timeEntryId: p.id });
      } else if (hrs > 12) {
        exs.push({ id: `ex-${p.id}-ot`, type: 'overtime_risk', title: 'Double Time Warning', employeeName: p.employeeName, description: `Logged ${hrs.toFixed(1)}h continuous work shift.`, timeEntryId: p.id });
      }
      
      if (!p.approved && p.clockOut) {
        exs.push({ id: `ex-${p.id}-unapp`, type: 'unapproved', title: 'Unapproved Timecard', employeeName: p.employeeName, description: 'Timecard pending managerial review.', timeEntryId: p.id });
      }
    });
    return exs;
  };
  const exceptions = generateExceptions();

  // Handle Wizard Start
  const handleStartWizard = async () => {
    if (!scope.startDate || !scope.endDate) {
      toast({ title: 'Invalid Scope', description: 'Please select a concrete date range to begin payroll run.', variant: 'destructive' });
      return;
    }
    
    const draftPeriod: OfficialPayrollPeriod = {
      id: crypto.randomUUID(),
      businessId: scope.businessId,
      name: `${scope.startDate} to ${scope.endDate}`,
      startDate: scope.startDate,
      endDate: scope.endDate,
      payDate: new Date().toISOString().split('T')[0],
      payFrequency: 'custom',
      status: 'draft',
      eligiblePayGroups: scope.payGroup !== 'all' ? [scope.payGroup] : undefined
    };

    const commissionsMap: Record<string, number> = {};
    
    try {
      const result = await compilePayrollPeriod(
        draftPeriod,
        profiles,
        punches,
        segments,
        deductions,
        reimbursements,
        bonuses,
        commissionsMap,
        departments
      );

      setDraftRun(result);
      setShowWizard(true);
    } catch (err: any) {
      toast({ title: 'Payroll Error', description: err.message, variant: 'destructive' });
    }
  };

  const handlePostPayroll = async () => {
    if (draftRun) {
      const newPeriod: OfficialPayrollPeriod = {
        id: draftRun.runId,
        businessId: scope.businessId,
        name: draftRun.periodName,
        startDate: scope.startDate,
        endDate: scope.endDate,
        payDate: new Date().toISOString().split('T')[0],
        payFrequency: 'custom',
        status: 'posted',
        totalGrossCents: draftRun.totalGross,
        totalNetCents: draftRun.totalNet,
        totalEmployerCostCents: draftRun.totalEmployerCost,
        employeeCount: draftRun.statements.length,
        createdBy: profile.id,
        postedAt: new Date().toISOString()
      };
      await saveOfficialPayrollPeriods([...officialPeriods, newPeriod]);
      
      // Update punches to approved
      const updatedPunches = punches.map(p => {
        if (scopedPunches.some(sp => sp.id === p.id)) {
          return { ...p, approved: true, status: 'completed' as const };
        }
        return p;
      });
      await saveTimeEntries(updatedPunches);
      
      setOfficialPeriods([...officialPeriods, newPeriod]);
      setPunches(updatedPunches);
    }
  };

  const handleUpdateComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageComp) return;
    const rateCents = Math.round(parseFloat(compRate) * 100);
    const newProfile: CompensationProfile = {
      employeeId: compEmployee.toLowerCase().replace(' ', '_'),
      employeeName: compEmployee,
      type: compType,
      payFrequency: 'semimonthly',
      hourlyRate: compType === 'hourly' ? rateCents : 0,
      salaryAmount: compType === 'salary' ? rateCents * 24 : 0, 
      commissionRate: 5,
      drawAmount: 0,
      effectiveDate: compEffective,
      reason: compReason
    };

    const updated = [newProfile, ...profiles.filter(p => p.employeeName !== compEmployee)];
    await saveCompensationProfiles(updated);
    toast({ title: 'Compensation updated', description: `Saved compensation profile for ${compEmployee}.` });
    await writeAuditLog(profile.name, 'Compensation Change', `Updated compensation profile for ${compEmployee}.`);
    loadData();
    setShowCompModal(false);
  };

  return (
    <div className="space-y-0 h-full flex flex-col bg-gray-50/30">
      
      {/* Global Filter Bar */}
      <PayrollScopeBar onScopeChange={setScope} departments={departments} />
      
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-stone-200 gap-1 mb-6">
          {[
            { key: 'command', label: 'Command Center', icon: Briefcase },
            { key: 'timecards', label: 'Timecards Log', icon: Calendar },
            { key: 'corrections', label: 'Corrections Queue', icon: UserCheck },
            { key: 'exceptions', label: 'Exception Center', icon: AlertTriangle },
            { key: 'compensation', label: 'Compensation & Rates', icon: DollarSign },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${activeTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.key === 'exceptions' && exceptions.length > 0 && (
                <span className="ml-1 bg-status-warning text-white rounded-full px-1.5 py-0.5 text-[10px]">{exceptions.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* COMMAND CENTER TAB */}
        {activeTab === 'command' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Scope Timecards" value={String(scopedPunches.length)} sub="In selected date range" icon={<Calendar className="h-5 w-5" />} accent="violet" />
              <StatCard label="Direct Deposit Auth" value={draftRun ? `$${(draftRun.totalNet/100).toLocaleString()}` : "Pending Run"} sub={draftRun ? "Calculated" : "Requires Payroll Run"} icon={<CreditCard className="h-5 w-5" />} accent="emerald" />
              <StatCard label="Open Exceptions" value={String(exceptions.length)} sub="Drill down to fix punches" icon={<AlertTriangle className="h-5 w-5 animate-bounce" />} accent="amber" />
              <StatCard label="Provider Status" value="Healthy" sub="Gusto API Connected" icon={<CheckCircle className="h-5 w-5" />} accent="rose" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl text-stone-900">Payroll Execution</h3>
                </div>
                <p className="text-sm text-stone-500 leading-relaxed">
                  You are viewing the scope for <span className="font-semibold text-stone-700">{scope.startDate || 'Beginning of time'} to {scope.endDate || 'Now'}</span>.
                  Ensure all exceptions are cleared before executing a payroll run.
                </p>
                <div className="pt-2">
                  <button onClick={handleStartWizard} className={`${btnPrimary} py-3 px-6 text-sm font-semibold shadow-md`}>
                    Run Payroll for this Scope <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
                <h3 className="font-serif text-lg text-stone-900">Recent Postings</h3>
                {officialPeriods.length > 0 ? (
                  <ul className="space-y-3">
                    {officialPeriods.slice(-3).reverse().map(op => (
                      <li key={op.id} className="border-b pb-2 last:border-0">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm">{op.name}</span>
                          <span className="text-xs font-semibold text-status-success uppercase tracking-wider">{op.status}</span>
                        </div>
                        <div className="flex justify-between text-xs text-text-muted mt-1">
                          <span>${(op.totalGrossCents! / 100).toLocaleString()} Gross</span>
                          <span>{new Date(op.postedAt!).toLocaleDateString()}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-text-muted">No official payroll runs have been posted yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TIMECARDS TAB */}
        {activeTab === 'timecards' && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-lg text-stone-900">Timecards Log</h3>
            <div className="overflow-x-auto border border-stone-100 rounded-lg">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 uppercase">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {scopedPunches.map(p => (
                    <tr key={p.id} className="hover:bg-stone-50 cursor-pointer" onClick={() => setViewingTimecard(p)}>
                      <td className="px-4 py-3">{new Date(p.clockIn).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{p.employeeName}</td>
                      <td className="px-4 py-3">{p.originalLocationId}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${p.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {p.approved ? 'Approved' : p.clockOut ? 'Pending Review' : 'Clocked In'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-status-info flex items-center gap-1 hover:underline">
                          <Eye className="w-3 h-3" /> View 360
                        </button>
                      </td>
                    </tr>
                  ))}
                  {scopedPunches.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No timecards in this scope.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EXCEPTIONS TAB */}
        {activeTab === 'exceptions' && (
          <div className="max-w-4xl">
            <ExceptionCenter 
              exceptions={exceptions} 
              onResolve={(ex) => {
                const p = punches.find(p => p.id === ex.timeEntryId);
                if (p) setViewingTimecard(p);
              }} 
            />
          </div>
        )}
        
        {/* CORRECTIONS QUEUE TAB */}
        {activeTab === 'corrections' && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-lg text-stone-900">Corrections Queue</h3>
            {corrections.filter(c => c.status === 'pending').length > 0 ? (
              <div className="space-y-2">
                {corrections.filter(c => c.status === 'pending').map(c => (
                  <div key={c.id} className="p-4 border rounded shadow-sm bg-yellow-50 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-sm">{c.type.replace('_', ' ').toUpperCase()}</div>
                      <div className="text-text-secondary text-sm mt-1">{c.reason}</div>
                    </div>
                    <button className={btnPrimary} onClick={() => {
                       const p = punches.find(p => p.id === c.timeEntryId);
                       if (p) setViewingTimecard(p);
                    }}>Review</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-500 text-sm">
                Queue clean. No pending punch corrections.
              </div>
            )}
          </div>
        )}

        {/* COMPENSATION TAB */}
        {activeTab === 'compensation' && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-lg text-stone-900">Compensation Profiles</h3>
              {canManageComp && (
                <button onClick={() => setShowCompModal(true)} className={btnPrimary}>
                  <Plus className="h-4 w-4" /> Edit Profile Rate
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-stone-100 rounded-lg">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-500 uppercase">
                  <tr>
                    <th className="px-4 py-2">Staff Name</th>
                    <th className="px-4 py-2">Hourly Rate</th>
                    <th className="px-4 py-2">Annualized Salary</th>
                    <th className="px-4 py-2">Frequency</th>
                    <th className="px-4 py-2">Effective Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {profiles.map(p => (
                    <tr key={p.employeeId}>
                      <td className="px-4 py-2.5 font-medium">{p.employeeName}</td>
                      <td className="px-4 py-2.5">{p.hourlyRate > 0 ? `$${(p.hourlyRate / 100).toFixed(2)}/hr` : '—'}</td>
                      <td className="px-4 py-2.5">{p.salaryAmount > 0 ? `$${(p.salaryAmount / 100).toLocaleString()}/yr` : '—'}</td>
                      <td className="px-4 py-2.5">{p.payFrequency || '—'}</td>
                      <td className="px-4 py-2.5">{p.effectiveDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* OVERLAYS */}
      {showWizard && (
        <PayrollWizard
          draftRun={draftRun}
          exceptions={exceptions}
          onClose={() => setShowWizard(false)}
          onPost={() => {
            handlePostPayroll();
            setShowWizard(false);
            setActiveTab('command');
          }}
          onResolveExceptions={() => {
            setShowWizard(false);
            setActiveTab('exceptions');
          }}
        />
      )}

      {viewingTimecard && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Timecard360
            entry={viewingTimecard}
            segments={segments.filter(s => s.timeEntryId === viewingTimecard.id)}
            corrections={corrections.filter(c => c.timeEntryId === viewingTimecard.id)}
            onClose={() => setViewingTimecard(null)}
            onSubmitCorrection={async (partial) => {
              const req: TimeEntryCorrection = {
                id: crypto.randomUUID(),
                timeEntryId: viewingTimecard.id,
                requestedBy: profile.id,
                requestedAt: new Date().toISOString(),
                type: partial.type!,
                reason: partial.reason!,
                status: 'pending'
              };
              await saveTimeEntryCorrections([...corrections, req]);
              setCorrections([...corrections, req]);
              toast({ title: 'Correction Submitted' });
            }}
            onApproveCorrection={async (cid) => {
              const updated = corrections.map(c => c.id === cid ? { ...c, status: 'approved' as const, resolvedBy: profile.id, resolvedAt: new Date().toISOString() } : c);
              await saveTimeEntryCorrections(updated);
              
              // Approve the timecard automatically when a correction is approved
              const updatedPunches = punches.map(p => p.id === viewingTimecard.id ? { ...p, approved: true } : p);
              await saveTimeEntries(updatedPunches);
              
              setCorrections(updated);
              setPunches(updatedPunches);
              setViewingTimecard(updatedPunches.find(p => p.id === viewingTimecard.id) || null);
            }}
            onVoid={async (id) => {
              const updatedPunches = punches.map(p => p.id === id ? { ...p, status: 'voided' as const } : p);
              await saveTimeEntries(updatedPunches);
              setPunches(updatedPunches);
              setViewingTimecard(null);
              toast({ title: 'Timecard Voided' });
            }}
          />
        </div>
      )}

      {/* Compensation Edit Modal */}
      <Modal open={showCompModal} onClose={() => setShowCompModal(false)} title="Modify Employee Compensation">
        <form onSubmit={handleUpdateComp} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Select Employee</label>
            <select value={compEmployee} onChange={e => setCompEmployee(e.target.value)} className={inputCls} required>
              <option value="">Choose team member…</option>
              {profiles.map(p => <option key={p.employeeId} value={p.employeeName}>{p.employeeName}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Pay Tier Classification</label>
            <select value={compType} onChange={e => setCompType(e.target.value as any)} className={inputCls}>
              <option value="hourly">Hourly Rate</option>
              <option value="salary">Salary Rate</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Amount (Hourly Rate or Annual Salary in USD)</label>
            <input type="number" step="0.01" required value={compRate} onChange={e => setCompRate(e.target.value)} className={inputCls} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 block">Effective Date</label>
            <input type="date" required value={compEffective} onChange={e => setCompEffective(e.target.value)} className={inputCls} />
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-stone-100">
            <button type="button" onClick={() => setShowCompModal(false)} className={btnSecondary}>Cancel</button>
            <button type="submit" className={btnPrimary}>Save Compensation Profile</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
