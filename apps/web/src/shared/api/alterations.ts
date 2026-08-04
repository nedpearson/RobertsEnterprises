import { requestClient } from './client';
import type { Alteration } from './types';

export interface KanbanResponse {
  data: Alteration[];
  meta: any;
  statuses: string[];
  kanban: Record<string, Alteration[]>;
}

export async function getAlterations(page?: number, limit?: number): Promise<KanbanResponse> {
  return requestClient<KanbanResponse>('/alterations', {
    params: { page, limit },
  });
}

export async function createAlteration(alteration: Partial<Alteration>): Promise<Alteration> {
  return requestClient<Alteration>('/alterations', {
    method: 'POST',
    body: JSON.stringify(alteration),
  });
}

export async function updateAlterationStatus(id: number, status: string): Promise<Alteration & { notified: boolean }> {
  return requestClient<Alteration & { notified: boolean }>(`/alterations/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}
