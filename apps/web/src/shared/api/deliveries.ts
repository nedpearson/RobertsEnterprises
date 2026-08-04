import { requestClient } from './client';

export async function markPickupReady(pickupId: number): Promise<{ message: string }> {
  return requestClient<{ message: string }>(`/operations/pickups/${pickupId}/ready`, {
    method: 'POST',
  });
}
