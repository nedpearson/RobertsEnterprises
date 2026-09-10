import { supabase } from '@/lib/supabase';

// ─── Interfaces ───

export interface Department {
  id: string;
  businessId?: string;
  name: string;
  managerName?: string;
  locations?: string[]; 
  costCenter?: string;
  active: boolean;
}

export interface JobTitle {
  id: string;
  businessId?: string;
  name: string;
  active: boolean;
}

export interface CompensationProfile {
  id?: string;
  businessId?: string;
  employeeId: string;
  employeeName: string;
  type: 'hourly' | 'salary' | 'hourly_plus_commission' | 'salary_plus_commission';
  payFrequency?: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  hourlyRate: number; 
  salaryAmount: number; 
  commissionRate: number; 
  drawAmount: number; 
  effectiveDate: string; 
  reason?: string;
}

export interface LeavePolicy {
  id: string;
  businessId?: string;
  name: string; 
  accrualRate: number; 
  maxBalance: number; 
  carryoverLimit: number; 
}

export interface LeaveRequest {
  id: string;
  businessId?: string;
  employeeId: string;
  employeeName: string;
  policyId: string;
  policyName: string;
  startDate: string; 
  endDate: string; 
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
  businessId?: string;
  employeeId: string;
  employeeName: string;
  code: string; 
  type: 'pre_tax' | 'after_tax';
  amountCents: number;
  fixed: boolean; 
  percentValue?: number; 
  goalAmount?: number; 
  remainingBalance?: number;
}

export interface Reimbursement {
  id: string;
  businessId?: string;
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
  businessId?: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  type: 'one_time' | 'store_performance' | 'commission_bonus' | 'holiday' | 'referral';
  amountCents: number;
  reason: string;
  payrollPeriodId?: string; 
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
  clockIn: string; 
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
  requestedBy: string; 
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
  name: string; 
  startDate: string; 
  endDate: string; 
  payDate: string; 
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



// Helper to convert snake_case object to camelCase
function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(v => toCamel(v));
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Helper to convert camelCase object to snake_case
function toSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(v => toSnake(v));
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}


async function getFromSupabase<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error(`Error fetching from ${table}:`, error);
    return [];
  }
  return toCamel(data) as T[];
}

async function saveToSupabase<T>(table: string, list: T[]): Promise<string | null> {
  if (!list.length) return null;
  const { error } = await supabase.from(table).upsert(toSnake(list));
  if (error) {
    console.error(`Error saving to ${table}:`, error);
    return error.message;
  }
  return null;
}

export async function getDepartments(): Promise<Department[]> {
  return getFromSupabase<Department>('workforce_departments');
}
export async function saveDepartments(list: Department[]): Promise<string | null> {
  return saveToSupabase('workforce_departments', list);
}

export async function getJobTitles(): Promise<JobTitle[]> {
  return getFromSupabase<JobTitle>('workforce_job_titles');
}
export async function saveJobTitles(list: JobTitle[]): Promise<string | null> {
  return saveToSupabase('workforce_job_titles', list);
}

export async function getCompensationProfiles(): Promise<CompensationProfile[]> {
  return getFromSupabase<CompensationProfile>('compensation_profiles');
}
export async function saveCompensationProfiles(list: CompensationProfile[]): Promise<string | null> {
  return saveToSupabase('compensation_profiles', list);
}

export async function getLeavePolicies(): Promise<LeavePolicy[]> {
  return getFromSupabase<LeavePolicy>('leave_policies');
}
export async function saveLeavePolicies(list: LeavePolicy[]): Promise<string | null> {
  return saveToSupabase('leave_policies', list);
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  return getFromSupabase<LeaveRequest>('leave_requests');
}
export async function saveLeaveRequests(list: LeaveRequest[]): Promise<string | null> {
  return saveToSupabase('leave_requests', list);
}

export async function getLeaveBalances(): Promise<LeaveBalance[]> {
  return getFromSupabase<LeaveBalance>('leave_balances');
}
export async function saveLeaveBalances(list: LeaveBalance[]): Promise<string | null> {
  return saveToSupabase('leave_balances', list);
}

export async function getDeductions(): Promise<Deduction[]> {
  return getFromSupabase<Deduction>('employee_deductions');
}
export async function saveDeductions(list: Deduction[]): Promise<string | null> {
  return saveToSupabase('employee_deductions', list);
}

export async function getReimbursements(): Promise<Reimbursement[]> {
  return getFromSupabase<Reimbursement>('employee_reimbursements');
}
export async function saveReimbursements(list: Reimbursement[]): Promise<string | null> {
  return saveToSupabase('employee_reimbursements', list);
}

export async function getBonuses(): Promise<Bonus[]> {
  return getFromSupabase<Bonus>('employee_bonuses');
}
export async function saveBonuses(list: Bonus[]): Promise<string | null> {
  return saveToSupabase('employee_bonuses', list);
}

export async function getAuditLogs(): Promise<AuditLogRecord[]> {
  return getFromSupabase<AuditLogRecord>('workforce_audit_logs');
}
export async function writeAuditLog(actorName: string, action: string, details: string): Promise<void> {
  try {
    const newLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor_name: actorName,
      action,
      details
    };
    await supabase.from('workforce_audit_logs').insert([newLog]);
  } catch (err) {
    console.error('Error writing audit log:', err);
  }
}

export async function getTimeEntries(): Promise<TimeEntry[]> {
  return getFromSupabase<TimeEntry>('time_entries');
}
export async function saveTimeEntries(list: TimeEntry[]): Promise<string | null> {
  return saveToSupabase('time_entries', list);
}

export async function getTimeEntrySegments(): Promise<TimeEntrySegment[]> {
  return getFromSupabase<TimeEntrySegment>('time_entry_segments');
}
export async function saveTimeEntrySegments(list: TimeEntrySegment[]): Promise<string | null> {
  return saveToSupabase('time_entry_segments', list);
}

export async function getTimeEntryCorrections(): Promise<TimeEntryCorrection[]> {
  return getFromSupabase<TimeEntryCorrection>('time_entry_corrections');
}
export async function saveTimeEntryCorrections(list: TimeEntryCorrection[]): Promise<string | null> {
  return saveToSupabase('time_entry_corrections', list);
}

export async function getOfficialPayrollPeriods(): Promise<OfficialPayrollPeriod[]> {
  return getFromSupabase<OfficialPayrollPeriod>('official_payroll_periods');
}
export async function saveOfficialPayrollPeriods(list: OfficialPayrollPeriod[]): Promise<string | null> {
  return saveToSupabase('official_payroll_periods', list);
}

