import { requestClient } from './client';
import type { User, Timesheet, Paystub, PaginatedResponse } from './types';

export async function getStaff(page?: number, limit?: number): Promise<PaginatedResponse<User>> {
  return requestClient<PaginatedResponse<User>>('/payroll/staff', {
    params: { page, limit },
  });
}

export async function clockIn(userId: number): Promise<Timesheet> {
  return requestClient<Timesheet>('/payroll/clock-in', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function clockOut(userId: number): Promise<Timesheet> {
  return requestClient<Timesheet>('/payroll/clock-out', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function getTimesheets(params?: { user_id?: number; page?: number; limit?: number }): Promise<PaginatedResponse<Timesheet>> {
  return requestClient<PaginatedResponse<Timesheet>>('/payroll/timesheets', { params });
}

export async function approveTimesheet(id: number): Promise<Timesheet> {
  return requestClient<Timesheet>(`/payroll/timesheets/${id}/approve`, {
    method: 'POST',
  });
}

export async function runPayroll(periodStart: string, periodEnd: string): Promise<{ paystubs_created: number; total_paid: number; paystubs: Paystub[] }> {
  return requestClient<{ paystubs_created: number; total_paid: number; paystubs: Paystub[] }>('/payroll/run', {
    method: 'POST',
    body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
  });
}

export async function getPaystubs(page?: number, limit?: number): Promise<PaginatedResponse<Paystub>> {
  return requestClient<PaginatedResponse<Paystub>>('/payroll/paystubs', {
    params: { page, limit },
  });
}
