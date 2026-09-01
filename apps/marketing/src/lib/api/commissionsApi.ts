import { jsonBody, vowosApi } from '@/lib/api/vowosApi';

export interface CommissionStaff {
  id: string;
  name: string;
  role: string;
}

export interface CommissionLocation {
  id: string;
  name: string;
  is_active: boolean;
}

export interface CommissionPlan {
  id: string;
  business_id: string;
  name: string;
  basis: 'COLLECTED_NET_REFUNDS';
  rate_bps: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionAssignment {
  id: string;
  business_id: string;
  employee_id: string;
  plan_id: string;
  location_id: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CommissionEarning {
  id: string;
  business_id: string;
  employee_id: string;
  plan_id: string;
  invoice_id: string | null;
  payment_id: string | null;
  refund_id: string | null;
  batch_id: string | null;
  event_type: 'EARN' | 'REFUND_REVERSAL';
  basis_cents: number;
  rate_bps: number;
  commission_cents: number;
  event_date: string;
  settlement_status: 'OPEN' | 'BATCHED' | 'EXPORTED' | 'PAID';
  source_key: string;
  created_at: string;
}

export interface CommissionBatch {
  id: string;
  business_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'APPROVED' | 'EXPORTED' | 'PAID' | 'VOIDED';
  total_basis_cents: number;
  total_commission_cents: number;
  employee_count: number;
  approved_at: string | null;
  exported_at: string | null;
  created_at: string;
}

export interface UnattributedPayment {
  id: string;
  invoice_id: string | null;
  location_id: string | null;
  customer_id: string | null;
  amount_cents: number;
  payment_method: string;
  status: string;
  processed_at: string | null;
  created_at: string;
  invoice: {
    id: string;
    customer_id: string | null;
    customer: string | null;
    description: string | null;
    amount_cents: number;
    paid_cents: number;
    status: string;
    sales_staff_id: string | null;
  } | null;
}

export interface CommissionsDashboardPayload {
  staff: CommissionStaff[];
  locations: CommissionLocation[];
  plans: CommissionPlan[];
  assignments: CommissionAssignment[];
  earnings: CommissionEarning[];
  batches: CommissionBatch[];
  unattributedPayments: UnattributedPayment[];
}

export interface CommissionBatchDetail {
  batch: CommissionBatch;
  earnings: CommissionEarning[];
  payrollAdjustments: Array<{
    id: string;
    employee_id: string;
    amount_cents: number;
    status: string;
    payroll_period_id: string | null;
    occurred_on: string;
  }>;
}

const BASE = '/api/organization/team/commissions';

export const commissionsApi = {
  dashboard: () => vowosApi<CommissionsDashboardPayload>(BASE),
  createPlan: (input: { name: string; rate_bps: number; notes?: string }) =>
    vowosApi<{ plan: CommissionPlan }>(`${BASE}/plans`, { method: 'POST', body: jsonBody(input) }),
  updatePlan: (id: string, input: { name?: string; notes?: string; is_active?: boolean }) =>
    vowosApi<{ plan: CommissionPlan }>(`${BASE}/plans/${id}`, { method: 'PUT', body: jsonBody(input) }),
  assignPlan: (input: { employee_id: string; plan_id: string; location_id?: string | null; effective_from: string }) =>
    vowosApi<{ assignment: CommissionAssignment; reconciledPayments: number }>(`${BASE}/assignments`, { method: 'POST', body: jsonBody(input) }),
  attributePayment: (paymentId: string, employeeId: string, persistInvoiceAttribution = true) =>
    vowosApi<{ payment: Record<string, unknown>; earning: CommissionEarning | null }>(`${BASE}/payments/${paymentId}/attribute`, {
      method: 'POST',
      body: jsonBody({ employee_id: employeeId, persist_invoice_attribution: persistInvoiceAttribution }),
    }),
  reconcile: () => vowosApi<{ reconciled: number }>(`${BASE}/reconcile`, { method: 'POST' }),
  createBatch: (input: { name?: string; start_date: string; end_date: string }) =>
    vowosApi<{ batch: CommissionBatch; earnings: CommissionEarning[] }>(`${BASE}/batches`, { method: 'POST', body: jsonBody(input) }),
  batch: (id: string) => vowosApi<CommissionBatchDetail>(`${BASE}/batches/${id}`),
  approveBatch: (id: string) => vowosApi<{ batch: CommissionBatch }>(`${BASE}/batches/${id}/approve`, { method: 'POST' }),
  exportBatchToPayroll: (id: string) => vowosApi<{ batch: CommissionBatch }>(`${BASE}/batches/${id}/export-payroll`, { method: 'POST' }),
  voidBatch: (id: string, reason: string) => vowosApi<{ batch: CommissionBatch }>(`${BASE}/batches/${id}/void`, { method: 'POST', body: jsonBody({ reason }) }),
};
