import { jsonBody, vowosApi } from '@/lib/api/vowosApi';

export interface PayrollStaff {
  id: string;
  name: string;
  role: string;
}

export interface PayrollLocation {
  id: string;
  name: string;
  is_active: boolean;
}

export interface PayrollProviderState {
  connected: boolean;
  ready: boolean;
  provider: string | null;
  connectionId: string | null;
  status: string;
  healthStatus: string;
  authState: string;
  circuitBreakerState: string;
  lastHealthCheckAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastErrorMessage: string | null;
}

export interface PayrollConfiguration {
  business_id: string;
  workweek_start: number;
  overtime_threshold_minutes: number;
  overtime_multiplier: number;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CompensationProfile {
  id: string;
  business_id: string;
  employee_id: string;
  compensation_type: 'HOURLY' | 'SALARY' | 'HOURLY_PLUS_COMMISSION' | 'SALARY_PLUS_COMMISSION';
  pay_frequency: 'WEEKLY' | 'BIWEEKLY' | 'SEMIMONTHLY' | 'MONTHLY';
  hourly_rate_cents: number;
  annual_salary_cents: number;
  commission_rate_bps: number;
  draw_amount_cents: number;
  effective_from: string;
  effective_to: string | null;
  reason: string | null;
  is_active: boolean;
}

export interface PayrollAdjustment {
  id: string;
  business_id: string;
  employee_id: string;
  payroll_period_id: string | null;
  adjustment_type: 'BONUS' | 'COMMISSION' | 'REIMBURSEMENT' | 'DEDUCTION';
  tax_treatment: 'TAXABLE' | 'NON_TAXABLE' | 'PRE_TAX' | 'AFTER_TAX';
  amount_cents: number;
  occurred_on: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'LOCKED' | 'APPLIED';
  approved_at: string | null;
}

export interface PayrollPeriod {
  id: string;
  business_id: string;
  name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: 'DRAFT' | 'REVIEWING' | 'APPROVED' | 'POSTED' | 'PROVIDER_SUBMITTED' | 'RECONCILED' | 'FAILED' | 'VOIDED';
  calculated_at: string;
  approved_at: string | null;
  posted_at: string | null;
  provider_state_snapshot: Record<string, unknown>;
  total_gross_cents: number;
  total_reimbursements_cents: number;
  total_known_deductions_cents: number;
  total_tax_cents: number | null;
  total_net_cents: number | null;
  employee_count: number;
}

export interface PayrollTimecard {
  id: string;
  user_id: string | null;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  location_id: string | null;
  department: string | null;
  payroll_period_id: string | null;
  payroll_approved_at: string | null;
  worked_minutes: number;
}

export interface PayrollPeriodLine {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  employee_name: string;
  compensation_type: string;
  hourly_rate_cents: number;
  annual_salary_cents: number;
  regular_minutes: number;
  overtime_minutes: number;
  regular_pay_cents: number;
  overtime_pay_cents: number;
  bonus_cents: number;
  commission_cents: number;
  reimbursement_cents: number;
  pre_tax_deduction_cents: number;
  after_tax_deduction_cents: number;
  gross_pay_cents: number;
  taxable_gross_cents: number;
  tax_cents: number | null;
  net_pay_cents: number | null;
  tax_status: 'PROVIDER_NOT_CONNECTED' | 'PENDING_PROVIDER' | 'FINAL' | 'ERROR';
  source_time_entry_ids: string[];
  source_adjustment_ids: string[];
  calculation_snapshot: Record<string, unknown>;
}

export interface PayrollDashboardPayload {
  staff: PayrollStaff[];
  locations: PayrollLocation[];
  compensationProfiles: CompensationProfile[];
  adjustments: PayrollAdjustment[];
  periods: PayrollPeriod[];
  recentTimecards: PayrollTimecard[];
  configuration: PayrollConfiguration;
  provider: PayrollProviderState;
}

export interface PayrollPeriodDetailPayload {
  period: PayrollPeriod;
  lines: PayrollPeriodLine[];
  submissions: Array<Record<string, unknown>>;
}

const BASE = '/api/organization/team/payroll';

export const payrollApi = {
  dashboard: () => vowosApi<PayrollDashboardPayload>(BASE),
  updateConfiguration: (input: Pick<PayrollConfiguration, 'workweek_start' | 'overtime_threshold_minutes' | 'overtime_multiplier'>) =>
    vowosApi<{ configuration: PayrollConfiguration }>(`${BASE}/configuration`, { method: 'PUT', body: jsonBody(input) }),
  saveCompensation: (input: {
    employee_id: string;
    compensation_type: CompensationProfile['compensation_type'];
    pay_frequency: CompensationProfile['pay_frequency'];
    hourly_rate_cents: number;
    annual_salary_cents: number;
    commission_rate_bps: number;
    draw_amount_cents: number;
    effective_from: string;
    reason?: string;
  }) => vowosApi<{ compensationProfile: CompensationProfile }>(`${BASE}/compensation`, { method: 'POST', body: jsonBody(input) }),
  createAdjustment: (input: {
    employee_id: string;
    adjustment_type: PayrollAdjustment['adjustment_type'];
    tax_treatment: PayrollAdjustment['tax_treatment'];
    amount_cents: number;
    occurred_on: string;
    description: string;
  }) => vowosApi<{ adjustment: PayrollAdjustment }>(`${BASE}/adjustments`, { method: 'POST', body: jsonBody(input) }),
  decideAdjustment: (id: string, decision: 'APPROVED' | 'REJECTED') =>
    vowosApi<{ adjustment: PayrollAdjustment }>(`${BASE}/adjustments/${id}/decision`, { method: 'POST', body: jsonBody({ decision }) }),
  createPeriod: (input: { name?: string; start_date: string; end_date: string; pay_date: string }) =>
    vowosApi<{ period: PayrollPeriod; lines: PayrollPeriodLine[]; provider: PayrollProviderState }>(`${BASE}/periods`, { method: 'POST', body: jsonBody(input) }),
  period: (id: string) => vowosApi<PayrollPeriodDetailPayload>(`${BASE}/periods/${id}`),
  approvePeriod: (id: string) => vowosApi<{ period: PayrollPeriod }>(`${BASE}/periods/${id}/approve`, { method: 'POST' }),
  postPeriod: (id: string) => vowosApi<{ period: PayrollPeriod }>(`${BASE}/periods/${id}/post`, { method: 'POST' }),
  voidPeriod: (id: string, reason: string) => vowosApi<{ period: PayrollPeriod }>(`${BASE}/periods/${id}/void`, { method: 'POST', body: jsonBody({ reason }) }),
};
