import { requestClient } from './client';
import type { Invoice, PaginatedResponse } from './types';

export async function getInvoices(page?: number, limit?: number): Promise<PaginatedResponse<Invoice>> {
  return requestClient<PaginatedResponse<Invoice>>('/invoices', {
    params: { page, limit },
  });
}

export async function checkoutInvoice(id: number): Promise<{ url?: string; stripe_session_id?: string }> {
  return requestClient<{ url?: string; stripe_session_id?: string }>(`/invoices/${id}/checkout`, {
    method: 'POST',
  });
}
