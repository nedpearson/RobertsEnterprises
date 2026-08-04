import { requestClient } from './client';
import type { InventoryItem, PaginatedResponse } from './types';

export async function getInventory(page?: number, limit?: number): Promise<PaginatedResponse<InventoryItem>> {
  return requestClient<PaginatedResponse<InventoryItem>>('/inventory', {
    params: { page, limit },
  });
}

export async function scanSku(sku: string): Promise<InventoryItem> {
  return requestClient<InventoryItem>(`/inventory/scan/${sku}`);
}

export async function getBoutiqueInventory(boutiqueId: number, page?: number, limit?: number): Promise<PaginatedResponse<InventoryItem>> {
  return requestClient<PaginatedResponse<InventoryItem>>(`/boutiques/${boutiqueId}/inventory`, {
    params: { page, limit },
  });
}
