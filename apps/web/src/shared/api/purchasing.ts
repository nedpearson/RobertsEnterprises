import { requestClient } from './client';
import type { PurchaseOrder, Appointment } from './types';

export interface OperationsResponse {
  purchases: PurchaseOrder[];
  pickups: any[];
  appointments: Appointment[];
}

export async function getOperations(): Promise<OperationsResponse> {
  return requestClient<OperationsResponse>('/operations');
}

export async function createPurchase(purchase: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  return requestClient<PurchaseOrder>('/operations/purchases', {
    method: 'POST',
    body: JSON.stringify(purchase),
  });
}
