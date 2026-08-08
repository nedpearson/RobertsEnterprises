import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

// ─── Interfaces ───

export interface Department {
  id: string;
  name: string;
  managerName?: string;
  locations?: string[]; // assigned location IDs
  costCenter?: string;
  active: boolean;
}

export interface JobTitle {
  id: string;
  name: string;
  active: boolean;
}

export interface CompensationProfile {
  employeeId: string;
  employeeName: string;
  type: 'hourly' | 'salary' | 'hourly_plus_commission' | 'salary_plus_commission';
  payFrequency?: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  hourlyRate: number; // in cents
  salaryAmount: number; // in cents
  commissionRate: number; // in percentage, e.g. 10 for 10%
  drawAmount: number; // in cents, draw against commission
  effectiveDate: string; // YYYY-MM-DD
  reason?: string;
}

export interface LeavePolicy {
  id: string;
  name: string; // Vacation, Sick, PTO
  accrualRate: number; // hours earned per worked hour (or per period)
  maxBalance: number; // in hours
  carryoverLimit: number; // in hours
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  policyId: string;
  policyName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  hours: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  approvedBy?: string;
}

export interface LeaveBalance {
  employeeId: string;
  policyId: string;
  balanceHours: number;
}

export interface Deduction {
  id: string;
  employeeId: string;
  employeeName: string;
  code: string; // pre_tax_health, garnishment, child_support, child_support_401k
  type: 'pre_tax' | 'after_tax';
  amountCents: number;
  fixed: boolean; // if false, it is a percentage
  percentValue?: number; // e.g. 5 for 5%
  goalAmount?: number; // limits total deductions
  remainingBalance?: number;
}

export interface Reimbursement {
  id: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  date: string;
  category: 'mileage' | 'travel' | 'meals' | 'supplies' | 'other';
  amountCents: number;
  purpose: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
}

export interface Bonus {
  id: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  type: 'one_time' | 'store_performance' | 'commission_bonus' | 'holiday' | 'referral';
  amountCents: number;
  reason: string;
  payrollPeriodId?: string; // locked to a specific payroll run
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedBy: string;
  approvedBy?: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  details: string;
  ipAddress?: string;
}
export interface TimeEntry {
  id: string;
  businessId: string;
  employeeId: string;
  employeeName: string;
  clockIn: string; // YYYY-MM-DDTHH:mm:ssZ
  clockOut?: string; 
  originalLocationId: string;
  status: 'active' | 'completed' | 'voided' | 'corrected';
  source: 'web' | 'mobile' | 'manager' | 'api';
  approved: boolean;
  approvedBy?: string;
  notes?: string;
}

export interface TimeEntrySegment {
  id: string;
  timeEntryId: string;
  businessId: string;
  employeeId: string;
  locationId: string;
  departmentId: string;
  startAt: string;
  endAt?: string;
  paidMinutes: number;
  unpaidMinutes: number;
}

export interface TimeEntryCorrection {
  id: string;
  timeEntryId: string;
  requestedBy: string; // employee or manager
  requestedAt: string;
  type: 'missed_in' | 'missed_out' | 'wrong_time' | 'wrong_location' | 'other';
  proposedClockIn?: string;
  proposedClockOut?: string;
  proposedLocationId?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface OfficialPayrollPeriod {
  id: string;
  businessId: string;
  name: string; // e.g. "July 16 - July 31, 2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  payDate: string; // YYYY-MM-DD
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'custom';
  status: 'draft' | 'reviewing' | 'approved' | 'posted' | 'provider_submitted' | 'reconciled' | 'failed' | 'voided';
  eligiblePayGroups?: string[];
  totalGrossCents?: number;
  totalNetCents?: number;
  totalEmployerCostCents?: number;
  employeeCount?: number;
  createdBy?: string;
  approvedBy?: string;
  postedAt?: string;
  providerStatus?: 'simulated' | 'connected' | 'healthy' | 'syncing' | 'failed';
}

// ─── Persistence Functions ───

async function getWorkforceSetting<T>(key: string, defaultValue: T): Promise<T> {
  const dataPlane = getActiveDataPlane();
  const res = await resolveEffectiveSetting<T>(key, key, { dataPlane }, defaultValue);
  return res.value;
}

async function saveWorkforceSetting<T>(key: string, value: T): Promise<string | null> {
  try {
    const dataPlane = getActiveDataPlane();
    await saveScopedSetting(key, key, value, { dataPlane }, `Updated ${key}`);
    return null;
  } catch (err: any) {
    return err.message || 'Error saving setting';
  }
}

export async function getDepartments(): Promise<Department[]> {
  return getWorkforceSetting<Department[]>('workforce_departments', []);
}

export async function saveDepartments(list: Department[]): Promise<string | null> {
  return saveWorkforceSetting<Department[]>('workforce_departments', list);
}

export async function getJobTitles(): Promise<JobTitle[]> {
  return getWorkforceSetting<JobTitle[]>('workforce_job_titles', []);
}

export async function saveJobTitles(list: JobTitle[]): Promise<string | null> {
  return saveWorkforceSetting<JobTitle[]>('workforce_job_titles', list);
}

export async function getCompensationProfiles(): Promise<CompensationProfile[]> {
  return getWorkforceSetting<CompensationProfile[]>('employee_compensation', []);
}

export async function saveCompensationProfiles(list: CompensationProfile[]): Promise<string | null> {
  return saveWorkforceSetting<CompensationProfile[]>('employee_compensation', list);
}

export async function getLeavePolicies(): Promise<LeavePolicy[]> {
  return getWorkforceSetting<LeavePolicy[]>('leave_policies', []);
}

export async function saveLeavePolicies(list: LeavePolicy[]): Promise<string | null> {
  return saveWorkforceSetting<LeavePolicy[]>('leave_policies', list);
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  return getWorkforceSetting<LeaveRequest[]>('leave_requests', []);
}

export async function saveLeaveRequests(list: LeaveRequest[]): Promise<string | null> {
  return saveWorkforceSetting<LeaveRequest[]>('leave_requests', list);
}

export async function getLeaveBalances(): Promise<LeaveBalance[]> {
  return getWorkforceSetting<LeaveBalance[]>('leave_balances', []);
}

export async function saveLeaveBalances(list: LeaveBalance[]): Promise<string | null> {
  return saveWorkforceSetting<LeaveBalance[]>('leave_balances', list);
}

export async function getDeductions(): Promise<Deduction[]> {
  return getWorkforceSetting<Deduction[]>('employee_deductions', []);
}

export async function saveDeductions(list: Deduction[]): Promise<string | null> {
  return saveWorkforceSetting<Deduction[]>('employee_deductions', list);
}

export async function getReimbursements(): Promise<Reimbursement[]> {
  return getWorkforceSetting<Reimbursement[]>('employee_reimbursements', []);
}

export async function saveReimbursements(list: Reimbursement[]): Promise<string | null> {
  return saveWorkforceSetting<Reimbursement[]>('employee_reimbursements', list);
}

export async function getBonuses(): Promise<Bonus[]> {
  return getWorkforceSetting<Bonus[]>('employee_bonuses', []);
}

export async function saveBonuses(list: Bonus[]): Promise<string | null> {
  return saveWorkforceSetting<Bonus[]>('employee_bonuses', list);
}

export async function getAuditLogs(): Promise<AuditLogRecord[]> {
  return getWorkforceSetting<AuditLogRecord[]>('workforce_audit_logs', []);
}

export async function writeAuditLog(actorName: string, action: string, details: string): Promise<void> {
  try {
    const list = await getAuditLogs();
    const newLog: AuditLogRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actorName,
      action,
      details
    };
    await saveWorkforceSetting<AuditLogRecord[]>('workforce_audit_logs', [newLog, ...list].slice(0, 1000));
  } catch (err) {
    console.error('Error writing audit log:', err);
  }
}

export async function getTimeEntries(): Promise<TimeEntry[]> {
  return getWorkforceSetting<TimeEntry[]>('workforce_time_entries', []);
}

export async function saveTimeEntries(list: TimeEntry[]): Promise<string | null> {
  return saveWorkforceSetting<TimeEntry[]>('workforce_time_entries', list);
}

export async function getTimeEntrySegments(): Promise<TimeEntrySegment[]> {
  return getWorkforceSetting<TimeEntrySegment[]>('workforce_time_segments', []);
}

export async function saveTimeEntrySegments(list: TimeEntrySegment[]): Promise<string | null> {
  return saveWorkforceSetting<TimeEntrySegment[]>('workforce_time_segments', list);
}

export async function getTimeEntryCorrections(): Promise<TimeEntryCorrection[]> {
  return getWorkforceSetting<TimeEntryCorrection[]>('workforce_time_corrections', []);
}

export async function saveTimeEntryCorrections(list: TimeEntryCorrection[]): Promise<string | null> {
  return saveWorkforceSetting<TimeEntryCorrection[]>('workforce_time_corrections', list);
}

export async function getOfficialPayrollPeriods(): Promise<OfficialPayrollPeriod[]> {
  return getWorkforceSetting<OfficialPayrollPeriod[]>('workforce_payroll_periods', []);
}

export async function saveOfficialPayrollPeriods(list: OfficialPayrollPeriod[]): Promise<string | null> {
  return saveWorkforceSetting<OfficialPayrollPeriod[]>('workforce_payroll_periods', list);
}
