import { requestClient } from './client';
import type { Boutique, PaginatedResponse } from './types';

export async function getBoutiques(params?: { brand?: string; city?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Boutique>> {
  return requestClient<PaginatedResponse<Boutique>>('/boutiques', { params });
}

export async function getBoutique(id: number): Promise<Boutique> {
  return requestClient<Boutique>(`/boutiques/${id}`);
}

export async function createBoutique(boutique: Partial<Boutique>): Promise<Boutique> {
  return requestClient<Boutique>('/boutiques', {
    method: 'POST',
    body: JSON.stringify(boutique),
  });
}
