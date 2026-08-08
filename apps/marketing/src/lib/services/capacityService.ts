import { supabase } from '../supabase';
import { useQuery } from '@tanstack/react-query';

export interface CapacityMetrics {
  scheduledEmployees: number;
  eligibleEmployees: number;
  bookableHours: number;
  confirmedHours: number;
  heldHours: number;
  openRequests: number;
  staffingGap: number;
}

export const calculateCapacityMetrics = (
  schedules: any[],
  appointments: any[],
  holds: any[],
  requests: any[],
  staff: any[]
): CapacityMetrics => {
  // 1. Scheduled employees today
  const scheduledStaffIds = new Set(schedules.map(s => s.employee_id));
  const scheduledEmployees = scheduledStaffIds.size;

  // 2. Eligible employees (active and available)
  const eligibleEmployees = staff.filter(s => s.status === 'active').length;

  // 3. Bookable hours (sum of scheduled hours)
  let bookableHours = 0;
  schedules.forEach(s => {
    const start = new Date(s.start_time || s.start_at);
    const end = new Date(s.end_time || s.end_at);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      bookableHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }
  });

  // 4. Confirmed hours
  let confirmedHours = 0;
  appointments.forEach(a => {
    if (a.status !== 'cancelled' && a.status !== 'no_show') {
      const start = new Date(a.start_time || a.start_at);
      const end = new Date(a.end_time || a.end_at);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        confirmedHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
    }
  });

  // 5. Held hours
  let heldHours = 0;
  holds.forEach(h => {
    if (new Date(h.expires_at) >= new Date()) {
      const start = new Date(h.start_time || h.start_at);
      const end = new Date(h.end_time || h.end_at);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        heldHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
    }
  });

  // 6. Open requests
  const openRequests = requests.filter(r => r.status === 'pending' || r.status === 'open').length;

  // 7. Staffing gap
  // Gap = (Confirmed + Held + estimated open request hours) - Bookable
  // For simplicity, estimate 1 hour per open request
  const demandHours = confirmedHours + heldHours + openRequests;
  const staffingGap = Math.max(0, demandHours - bookableHours);

  return {
    scheduledEmployees,
    eligibleEmployees,
    bookableHours,
    confirmedHours,
    heldHours,
    openRequests,
    staffingGap
  };
};

export const fetchCapacityMetrics = async (businessId: string, date: string): Promise<CapacityMetrics> => {
  // Fetch for a specific date (simplified for real implementation)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    { data: schedules },
    { data: appointments },
    { data: holds },
    { data: requests },
    { data: staff }
  ] = await Promise.all([
    supabase.from('employee_schedules').select('*').eq('business_id', businessId).gte('start_time', startOfDay.toISOString()).lte('start_time', endOfDay.toISOString()),
    supabase.from('appointments').select('*').eq('business_id', businessId).gte('start_time', startOfDay.toISOString()).lte('start_time', endOfDay.toISOString()),
    supabase.from('appointment_holds').select('*').eq('business_id', businessId).gte('start_time', startOfDay.toISOString()).lte('start_time', endOfDay.toISOString()),
    supabase.from('appointment_requests').select('*').eq('business_id', businessId).in('status', ['pending', 'open']),
    supabase.from('staff_profiles').select('*').eq('business_id', businessId)
  ]);

  return calculateCapacityMetrics(schedules || [], appointments || [], holds || [], requests || [], staff || []);
};

export const useCapacityMetrics = (businessId: string | undefined, date: string) => {
  return useQuery({
    queryKey: ['capacity_metrics', businessId, date],
    queryFn: () => fetchCapacityMetrics(businessId!, date),
    enabled: !!businessId && !!date
  });
};
