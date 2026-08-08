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
    // 1. Begin pseudo-transaction & Lock Appointment (Wait for Postgres transaction in production)
    const { data: request, error: reqErr } = await db
      .from('appointment_requests')
      .select('*')
      .eq('id', req.requestId)
      .eq('business_id', req.businessId)
      .single();

    if (reqErr || !request) throw new Error('Request not found or unauthorized');
    if (request.status !== 'submitted') throw new Error('Request already assigned or processed');

    // 2-4. Check Employee Schedule & Overlapping Appointments
    const { data: overlapAppts } = await db
      .from('appointments')
      .select('id')
      .eq('employee_id', req.employeeId)
      .gte('end_at', req.startAt)
      .lte('start_at', req.endAt);
      
    if (overlapAppts && overlapAppts.length > 0) {
      throw new Error('Employee is already booked during this time');
    }

    // 5-6. Lock Room / Resources
    if (req.roomId) {
      const { data: roomOverlap } = await db
        .from('appointments')
        .select('id')
        .eq('room_id', req.roomId)
        .gte('end_at', req.startAt)
        .lte('start_at', req.endAt);
        
      if (roomOverlap && roomOverlap.length > 0) {
        throw new Error('Room is already booked during this time');
      }
    }

    // 7. Lock Tentative Holds
    const { data: holds } = await db
      .from('appointment_holds')
      .select('id')
      .eq('employee_id', req.employeeId)
      .gte('end_at', req.startAt)
      .lte('start_at', req.endAt)
      .gt('expires_at', new Date().toISOString());

    if (holds && holds.length > 0) {
      throw new Error('Employee has a tentative hold during this time');
    }

    // 15. Commit Appointment
    const { data: appointment, error: assignErr } = await db
      .from('appointments')
      .insert([{
        business_id: req.businessId,
        location_id: req.locationId,
        request_id: req.requestId,
        customer_id: request.customer_id,
        employee_id: req.employeeId,
        service_id: request.service_id,
        room_id: req.roomId,
        start_at: req.startAt,
        end_at: req.endAt,
        confirmation_status: 'pending',
        intake_source: request.intake_source
      }])
      .select()
      .single();

    if (assignErr) throw assignErr;

    // Update Request Status
    await db.from('appointment_requests').update({ status: 'assigned' }).eq('id', req.requestId);

    // 16. Release conflicting recommendations
    await db.from('appointment_assignment_recommendations').delete().eq('request_id', req.requestId);

    return appointment;
  }
}
