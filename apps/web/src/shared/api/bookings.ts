import { requestClient } from './client';
import type { Booking, PaginatedResponse } from './types';

export async function getBookings(params?: { boutique_id?: number; status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Booking>> {
  return requestClient<PaginatedResponse<Booking>>('/bookings', { params });
}

export async function createBooking(booking: Partial<Booking>): Promise<Booking> {
  return requestClient<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(booking),
  });
}

export async function updateBookingStatus(id: number, status: string): Promise<Booking> {
  return requestClient<Booking>(`/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export interface BookingFee {
  id: number;
  booking_id: number;
  amount_cents: number;
  status: string;
  stripe_session_id: string;
  qr_code_data_url?: string;
}

export async function createBookingFee(bookingId: number, amountCents: number): Promise<BookingFee> {
  return requestClient<BookingFee>(`/bookings/${bookingId}/fee`, {
    method: 'POST',
    body: JSON.stringify({ amount_cents: amountCents }),
  });
}

export interface SlotAvailability {
  time: string;
  available: boolean;
}

export async function getAvailability(date: string, boutiqueId?: number): Promise<{ slots: SlotAvailability[] }> {
  return requestClient<{ slots: SlotAvailability[] }>('/bookings/availability', {
    params: { date, boutique_id: boutiqueId },
  });
}

export interface SlotRank {
  time: string;
  score: number;
  recommended: boolean;
}

export async function getSlotRank(date: string, boutiqueId?: number): Promise<SlotRank[]> {
  return requestClient<SlotRank[]>('/bookings/slot-rank', {
    params: { date, boutique_id: boutiqueId },
  });
}
