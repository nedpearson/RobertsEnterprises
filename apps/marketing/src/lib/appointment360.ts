import { supabase } from '@/lib/supabase';

// Define the core types corresponding to the new schema
export interface AppointmentRequest {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string | null;
  status: string;
  priority: string;
  notes: string;
  submitted_at: string;
  customer?: { name: string; email: string; phone: string };
}

export interface EmployeeSchedule {
  id: string;
  employee_id: string;
  shift_date: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string;
}

export interface Appointment {
  id: string;
  request_id: string | null;
  employee_id: string | null;
  room_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
  customer?: { name: string };
  employee?: { name: string };
  room?: { name: string };
}

import { getActiveDataPlane } from '@/lib/supabase';

// Helper to generate dynamic dates relative to the requested range
function generateSyntheticData(startDate: string, endDate: string) {
  const d = new Date(startDate);
  // Force it to a Monday for consistency in dummy data relative to the start
  const monday = new Date(d);
  monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7));
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const d1 = formatDate(monday); // Monday
  const d2 = formatDate(new Date(monday.getTime() + 86400000)); // Tuesday
  const d3 = formatDate(new Date(monday.getTime() + 86400000 * 2)); // Wednesday

  const reqs: AppointmentRequest[] = [
    { id: 'req-1', business_id: 'b1', customer_id: 'c1', service_id: null, status: 'Pending', priority: 'High', notes: 'AI Note: Client shows high intent. Wants a fitting soon.', submitted_at: new Date().toISOString(), customer: { name: 'Sarah Jenkins', email: 'sarah@example.com', phone: '555-0101' } },
    { id: 'req-2', business_id: 'b1', customer_id: 'c2', service_id: null, status: 'Action Required', priority: 'Urgent', notes: 'AI Note: Returning customer from 2024. VIP treatment recommended.', submitted_at: new Date().toISOString(), customer: { name: 'Emily Thorne', email: 'emily@example.com', phone: '555-0102' } },
  ];

  const appts: Appointment[] = [
    { id: 'appt-1', request_id: null, employee_id: 'emp1', room_id: 'r1', start_at: `${d1}T10:00:00`, end_at: `${d1}T11:30:00`, status: 'Confirmed', customer: { name: 'Jessica Alba' }, employee: { name: 'Ramsey Roberts' }, room: { name: 'Bridal Suite A' } },
    { id: 'appt-2', request_id: null, employee_id: 'emp2', room_id: 'r2', start_at: `${d1}T13:00:00`, end_at: `${d1}T14:30:00`, status: 'Pending', customer: { name: 'Amanda Seyfried' }, employee: { name: 'Stylist Mia' }, room: { name: 'Bridal Suite B' } },
    { id: 'appt-3', request_id: null, employee_id: 'emp1', room_id: 'r1', start_at: `${d2}T09:00:00`, end_at: `${d2}T10:30:00`, status: 'Confirmed', customer: { name: 'Chloe Grace' }, employee: { name: 'Ramsey Roberts' }, room: { name: 'Bridal Suite A' } },
    { id: 'appt-4', request_id: null, employee_id: 'emp2', room_id: 'r2', start_at: `${d3}T14:00:00`, end_at: `${d3}T16:00:00`, status: 'Confirmed', customer: { name: 'Zendaya Coleman' }, employee: { name: 'Stylist Mia' }, room: { name: 'VIP Suite' } },
  ];

  const scheds: EmployeeSchedule[] = [
    { id: 'sched-1', employee_id: 'Ramsey Roberts', shift_date: d1, start_at: '09:00', end_at: '17:00', status: 'Scheduled', notes: '' },
    { id: 'sched-2', employee_id: 'Stylist Mia', shift_date: d1, start_at: '10:00', end_at: '18:00', status: 'Scheduled', notes: '' },
    { id: 'sched-3', employee_id: 'Ramsey Roberts', shift_date: d2, start_at: '09:00', end_at: '15:00', status: 'Scheduled', notes: '' },
    { id: 'sched-4', employee_id: 'Stylist Mia', shift_date: d3, start_at: '12:00', end_at: '20:00', status: 'Scheduled', notes: '' },
  ];

  return { reqs, appts, scheds };
}

export async function fetchAppointmentRequests() {
  const { data, error } = await supabase
    .from('appointment_requests')
    .select('*, customer:customers(name, email, phone)')
    .order('submitted_at', { ascending: false });
  if (error || (data && data.length === 0 && getActiveDataPlane() === 'demo')) {
    if (getActiveDataPlane() === 'demo') return generateSyntheticData(new Date().toISOString(), new Date().toISOString()).reqs;
    console.error('Error fetching appointment requests:', error);
    return [];
  }
  return data as AppointmentRequest[];
}

export async function fetchAppointmentsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, customer:customers(name), room:rooms(name), employee:auth.users(name)')
    .gte('start_at', startDate)
    .lte('end_at', endDate);
  if (error || (data && data.length === 0 && getActiveDataPlane() === 'demo')) {
    if (getActiveDataPlane() === 'demo') return generateSyntheticData(startDate, endDate).appts;
    if (error) console.error('Error fetching appointments:', error);
    return [];
  }
  return data as Appointment[];
}

export async function fetchEmployeeSchedules(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*')
    .gte('shift_date', startDate)
    .lte('shift_date', endDate);
  if (error || (data && data.length === 0 && getActiveDataPlane() === 'demo')) {
    if (getActiveDataPlane() === 'demo') return generateSyntheticData(startDate, endDate).scheds;
    if (error) console.error('Error fetching schedules:', error);
    return [];
  }
  return data as EmployeeSchedule[];
}

export async function createAppointment(payload: Partial<Appointment>) {
  const { data, error } = await supabase.from('appointments').insert([payload]).select();
  if (error) throw error;
  return data[0];
}

export async function updateAppointment(id: string, updates: Partial<Appointment>) {
  const { data, error } = await supabase.from('appointments').update(updates).eq('id', id).select();
  if (error) throw error;
  return data[0];
}

