/**
 * Client for the guarded booking API.
 *
 * Every call here goes through the worker. That is the point of the file: the
 * assign path previously called the `assign_appointment_request` RPC straight
 * from the browser over PostgREST, which meant requireBusinessContext,
 * rejectTenantSpoofing and requirePermission('appointments.manage') — all
 * present on the worker route nobody used — were bypassed on the path that
 * actually ran. The tenant is now established server-side from a verified
 * membership, and the browser stops being trusted with it.
 */
import { supabase } from '../supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const bookingApiRequest = async <T>(businessId: string, path: string, init?: RequestInit): Promise<T> => {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (sessionError || !token) throw new Error('Sign in again to manage bookings.');

  const apiBaseUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const response = await fetch(`${apiBaseUrl}/api/scheduling/booking${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Business-Id': businessId,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // The worker returns explainable conflicts verbatim — "that suite is at
    // capacity at this time" is more useful than "request failed".
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'The booking service is unavailable.');
  }
  return payload as T;
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ReadinessStep {
  key: 'suites' | 'services' | 'eligibility' | 'shifts';
  label: string;
  done: boolean;
  count: number;
  blocking: boolean;
  detail: string;
}

export interface BookingReadiness {
  ready: boolean;
  steps: ReadinessStep[];
  context: { locations: number; staff: number };
}

export interface BookingRoom {
  id: string;
  name: string;
  room_type: string | null;
  capacity: number;
  active: boolean;
  location_id: string | null;
}

export interface BookingService {
  id: string;
  name: string;
  duration_minutes: number;
  setup_buffer_minutes: number | null;
  cleanup_buffer_minutes: number | null;
  required_role: string | null;
  required_room_type: string | null;
  active: boolean;
}

export interface TeamMember {
  employeeId: string;
  name: string;
  role: string | null;
}

export interface EligibilityRow {
  employeeId: string;
  serviceId: string;
  skillLevel: number;
  active: boolean;
}

export interface BookableSlot {
  startAt: string;
  endAt: string;
  employeeId: string;
  employeeName: string;
  roomId: string;
  roomName: string;
  score: number;
  reasons: string[];
}

export interface SlotResponse {
  slots: BookableSlot[];
  service?: { id: string; name: string; durationMinutes: number };
  timeZone?: string;
  /** Why there are no slots. Never let an empty list stand on its own. */
  blockedBy: 'NO_SERVICE' | 'NO_ELIGIBLE_STAFF' | 'NO_ROOMS' | 'NO_PUBLISHED_SHIFTS' | 'FULLY_BOOKED' | null;
  message: string | null;
}

export type PartyRole =
  | 'BRIDE' | 'PARTNER' | 'MOTHER' | 'FATHER' | 'MAID_OF_HONOUR'
  | 'BRIDESMAID' | 'FAMILY' | 'FRIEND' | 'PAYER' | 'GUEST' | 'OTHER';

export interface PartyMember {
  id?: string;
  full_name?: string;
  fullName?: string;
  role: PartyRole;
  is_primary?: boolean;
  isPrimary?: boolean;
  email: string | null;
  phone: string | null;
  notes: string | null;
  attending?: boolean;
  arrived_at?: string | null;
}

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

export const useBookingReadiness = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['booking', 'readiness', businessId],
    queryFn: () => bookingApiRequest<BookingReadiness>(businessId!, '/readiness'),
    enabled: !!businessId,
  });

export const useBookingRooms = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['booking', 'rooms', businessId],
    queryFn: async () => (await bookingApiRequest<{ rooms: BookingRoom[] }>(businessId!, '/rooms')).rooms,
    enabled: !!businessId,
  });

export const useBookingServices = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['booking', 'services', businessId],
    queryFn: async () => (await bookingApiRequest<{ services: BookingService[] }>(businessId!, '/services')).services,
    enabled: !!businessId,
  });

export const useBookingEligibility = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['booking', 'eligibility', businessId],
    queryFn: () =>
      bookingApiRequest<{ team: TeamMember[]; eligibility: EligibilityRow[] }>(businessId!, '/eligibility'),
    enabled: !!businessId,
  });

/** Invalidates everything the readiness checklist counts. */
const invalidateBooking = (queryClient: ReturnType<typeof useQueryClient>, businessId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['booking'] });
  if (businessId) queryClient.invalidateQueries({ queryKey: ['booking', 'readiness', businessId] });
};

export const useCreateRoom = (businessId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; locationId?: string | null; roomType?: string | null; capacity?: number }) =>
      bookingApiRequest<{ room: BookingRoom }>(businessId!, '/rooms', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateBooking(queryClient, businessId),
  });
};

export const useUpdateRoom = (businessId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<{ name: string; roomType: string | null; capacity: number; active: boolean }>) =>
      bookingApiRequest<{ room: BookingRoom }>(businessId!, `/rooms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => invalidateBooking(queryClient, businessId),
  });
};

export const useCreateService = (businessId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      durationMinutes: number;
      setupBufferMinutes?: number;
      cleanupBufferMinutes?: number;
      requiredRoomType?: string | null;
    }) =>
      bookingApiRequest<{ service: BookingService }>(businessId!, '/services', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateBooking(queryClient, businessId),
  });
};

export const useUpdateService = (businessId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<{
      name: string; durationMinutes: number; setupBufferMinutes: number;
      cleanupBufferMinutes: number; requiredRoomType: string | null; active: boolean;
    }>) =>
      bookingApiRequest<{ service: BookingService }>(businessId!, `/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => invalidateBooking(queryClient, businessId),
  });
};

export const useSetEligibility = (businessId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { employeeId: string; serviceId: string; active: boolean; skillLevel?: number }) =>
      bookingApiRequest<EligibilityRow>(businessId!, '/eligibility', {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateBooking(queryClient, businessId),
  });
};

/**
 * Real bookable times for a request.
 *
 * `enabled` is gated on a serviceId because the duration is what turns a shift
 * into slots; without one the server answers NO_SERVICE and there is nothing to
 * show but the explanation.
 */
export const useBookableSlots = (
  businessId: string | undefined,
  input: { requestId?: string; serviceId?: string; locationId?: string | null; from?: string; to?: string } | null,
) =>
  useQuery({
    queryKey: ['booking', 'slots', businessId, input],
    queryFn: () =>
      bookingApiRequest<SlotResponse>(businessId!, '/slots', {
        method: 'POST',
        body: JSON.stringify(input ?? {}),
      }),
    enabled: !!businessId && !!input && (!!input.requestId || !!input.serviceId),
    staleTime: 30_000,
  });

export const useRequestParty = (businessId: string | undefined, requestId: string | undefined) =>
  useQuery({
    queryKey: ['booking', 'party', businessId, requestId],
    queryFn: async () =>
      (await bookingApiRequest<{ party: PartyMember[] }>(businessId!, `/requests/${requestId}/party`)).party,
    enabled: !!businessId && !!requestId,
  });

export const useSaveRequestParty = (businessId: string | undefined, requestId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (party: Array<Omit<PartyMember, 'id' | 'full_name' | 'is_primary'> & { fullName: string; isPrimary: boolean }>) =>
      bookingApiRequest<{ party: PartyMember[] }>(businessId!, `/requests/${requestId}/party`, {
        method: 'PUT',
        body: JSON.stringify({ party }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['booking', 'party', businessId, requestId] }),
  });
};

export const useAssignAppointment = (businessId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      employeeId: string;
      roomId: string | null;
      startAt: string;
      endAt: string;
      locationId?: string | null;
    }) =>
      bookingApiRequest<{ appointment: any }>(businessId!, '/assign', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      // The request has left the queue, so both the list and its counters move.
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      queryClient.invalidateQueries({ queryKey: ['booking'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};
