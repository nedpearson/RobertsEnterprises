import { requestClient } from './client';
import type { Customer, Lead, PaginatedResponse } from './types';

export async function getCustomers(page?: number, limit?: number): Promise<PaginatedResponse<Customer>> {
  return requestClient<PaginatedResponse<Customer>>('/customers', {
    params: { page, limit },
  });
}

export async function createCustomer(customer: Partial<Customer>): Promise<Customer> {
  return requestClient<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
}

export async function getLeads(page?: number, limit?: number): Promise<PaginatedResponse<Lead>> {
  return requestClient<PaginatedResponse<Lead>>('/leads', {
    params: { page, limit },
  });
}

export async function createLead(lead: Partial<Lead>): Promise<{ id: number; message: string }> {
  return requestClient<{ id: number; message: string }>('/leads', {
    method: 'POST',
    body: JSON.stringify(lead),
  });
}
