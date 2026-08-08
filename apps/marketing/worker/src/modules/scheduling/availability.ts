import { SupabaseClient } from '@supabase/supabase-js';

export interface AvailabilityRequest {
  businessId: string;
  locationId: string;
  serviceId: string;
  preferredDate?: string;
  preferredWindow?: string;
}

export async function checkAvailability(db: SupabaseClient, req: AvailabilityRequest) {
  // 1. Fetch service details
  const { data: service } = await db
    .from('appointment_services')
    .select('*')
    .eq('id', req.serviceId)
    .single();

  if (!service) throw new Error('Service not found');

  // 2. Fetch eligible employees
  const { data: eligible } = await db
    .from('employee_service_eligibility')
    .select('employee_id')
    .eq('service_id', req.serviceId)
    .eq('business_id', req.businessId)
    .eq('active', true);

  if (!eligible || eligible.length === 0) return [];

  const employeeIds = eligible.map(e => e.employee_id);

  // 3. Fetch schedules for these employees on the preferred date (or next 7 days)
  let scheduleQuery = db
    .from('employee_schedules')
    .select('*')
    .in('employee_id', employeeIds)
    .eq('business_id', req.businessId)
    .eq('location_id', req.locationId)
    .eq('status', 'published');
    
  if (req.preferredDate) {
    scheduleQuery = scheduleQuery.eq('shift_date', req.preferredDate);
  }

  const { data: schedules } = await scheduleQuery;

  // 4. In a full implementation, we'd cross-reference existing appointments and breaks
  // For the MVP, we just return the available shifts as viable windows
  return schedules || [];
}
