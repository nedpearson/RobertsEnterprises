import { SupabaseClient } from '@supabase/supabase-js';

export interface AssignAppointmentRequest {
  businessId: string;
  requestId: string;
  employeeId: string;
  locationId: string;
  roomId?: string;
  startAt: string;
  endAt: string;
}

export class ConcurrencyEngine {
  /**
   * Strictly enforces the 17-step transaction to prevent double-booking.
   */
  static async safeAssignAppointment(db: SupabaseClient, req: AssignAppointmentRequest) {
    // Rely on Postgres Transaction & Advisory Locks via RPC to guarantee concurrency safety
    const { data: appointment, error } = await db.rpc('assign_appointment_idempotent', {
      p_business_id: req.businessId,
      p_request_id: req.requestId,
      p_employee_id: req.employeeId,
      p_location_id: req.locationId,
      p_room_id: req.roomId || null,
      p_start_at: req.startAt,
      p_end_at: req.endAt
    });

    if (error) {
      throw new Error(`Failed to assign appointment: ${error.message}`);
    }

    return appointment;
  }
}
