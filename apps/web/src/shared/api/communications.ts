import { requestClient } from './client';
import type { PaginatedResponse } from './types';

export interface SmsPayload {
  phone: string;
  message: string;
}

export async function sendSms(payload: SmsPayload): Promise<{ sid?: string; success: boolean; mock?: boolean }> {
  return requestClient<{ sid?: string; success: boolean; mock?: boolean }>('/communications/sms', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface FollowUp {
  id: number;
  customer_id: number;
  booking_id?: number;
  appointment_id?: number;
  message_template: string;
  scheduled_at: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  customer_name?: string;
  phone?: string;
  email?: string;
}

export async function getFollowUps(page?: number, limit?: number): Promise<PaginatedResponse<FollowUp>> {
  return requestClient<PaginatedResponse<FollowUp>>('/follow-ups', {
    params: { page, limit },
  });
}

export async function createFollowUp(followUp: Partial<FollowUp>): Promise<FollowUp> {
  return requestClient<FollowUp>('/follow-ups', {
    method: 'POST',
    body: JSON.stringify(followUp),
  });
}

export async function sendFollowUp(id: number): Promise<{ ok: boolean }> {
  return requestClient<{ ok: boolean }>(`/follow-ups/${id}/send`, {
    method: 'POST',
  });
}
