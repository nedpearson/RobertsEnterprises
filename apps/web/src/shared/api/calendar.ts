import { requestClient } from './client';
import type { Appointment } from './types';

export async function createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
  return requestClient<Appointment>('/appointments', {
    method: 'POST',
    body: JSON.stringify(appointment),
  });
}
