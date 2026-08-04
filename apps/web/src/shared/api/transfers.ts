import { requestClient } from './client';
import type { Transfer, PaginatedResponse } from './types';

export async function getTransfers(page?: number, limit?: number): Promise<PaginatedResponse<Transfer>> {
  return requestClient<PaginatedResponse<Transfer>>('/transfers', {
    params: { page, limit },
  });
}

export async function createTransfer(transfer: Partial<Transfer>): Promise<Transfer> {
  return requestClient<Transfer>('/transfers', {
    method: 'POST',
    body: JSON.stringify(transfer),
  });
}

export async function receiveTransfer(id: number): Promise<Transfer> {
  return requestClient<Transfer>(`/transfers/${id}/receive`, {
    method: 'POST',
  });
}
