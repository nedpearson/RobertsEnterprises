import { requestClient } from './client';
import type { Payment } from './types';

export async function createPayment(payment: Partial<Payment>): Promise<Payment> {
  return requestClient<Payment>('/payments', {
    method: 'POST',
    body: JSON.stringify(payment),
  });
}
