import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CalendarLeftPanel from './CalendarLeftPanel';
import CalendarCenterGrid from './CalendarCenterGrid';
import Appointment360Panel from './Appointment360Panel';
import BookAppointmentModal from './BookAppointmentModal';
import { 
  AppointmentRequest, 
  Appointment, 
  EmployeeSchedule,
  fetchAppointmentRequests,
  fetchAppointmentsByDateRange,
  fetchEmployeeSchedules,
  updateAppointment
} from '@/lib/appointment360';
import { format, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';

export default function Calendar360View() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date())
  });

  const loadData = async () => {
    try {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      const [reqs, appts, scheds] = await Promise.all([
        fetchAppointmentRequests(),
        fetchAppointmentsByDateRange(startStr, endStr),
        fetchEmployeeSchedules(startStr, endStr)
      ]);

      setRequests(reqs);
      setAppointments(appts);
      setSchedules(scheds);
    } catch (err) {
      console.error("Failed to load Calendar 360 data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDefaults, setBookingDefaults] = useState<{ date?: string; time?: string; stylist?: string; request?: AppointmentRequest } | null>(null);

  const handleSelectRequest = (req: AppointmentRequest) => {
    // Open booking modal pre-filled with the request details
    setBookingDefaults({
      date: format(new Date(req.preferred_date || new Date()), 'yyyy-MM-dd'),
      time: req.preferred_time || '',
      request: req
    });
    setIsBookingModalOpen(true);
  };

  const handleAppointmentClick = (appt: Appointment) => {
    setSelectedAppointment(appt);
  };

  const handleDateSelect = (selectInfo: any) => {
    // Open a "new appointment" modal or select time
    setBookingDefaults({
      date: format(new Date(selectInfo.startStr), 'yyyy-MM-dd'),
      time: format(new Date(selectInfo.startStr), 'hh:mm a')
    });
    setIsBookingModalOpen(true);
  };

  const handleEventDrop = async (dropInfo: any) => {
    const { event } = dropInfo;
    const newStart = event.startStr; // This is a full ISO string
    const newDate = format(new Date(newStart), 'yyyy-MM-dd');
    const newTime = format(new Date(newStart), 'HH:mm'); // Needs conversion to whatever format you use
    const appointmentId = event.id;
    
    // Update locally for instant feedback
    setAppointments(prev => prev.map(a => 
      a.id === appointmentId ? { ...a, start_at: newStart, date: newDate, time: newTime } : a
    ));
    
    // Persist to backend
    try {
      await updateAppointment(appointmentId, { start_at: newStart });
    } catch (err) {
      console.error('Failed to update appointment drop:', err);
      // Revert state in a real app
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] overflow-hidden bg-white border rounded-xl shadow-sm relative">
      {/* Left Panel: Smart Queue */}
      <CalendarLeftPanel 
        requests={requests} 
        onSelectRequest={handleSelectRequest} 
      />

      {/* Center Grid: FullCalendar workspace */}
      <CalendarCenterGrid 
        appointments={appointments}
        schedules={schedules}
        onAppointmentClick={handleAppointmentClick}
        onDateSelect={handleDateSelect}
        onEventDrop={handleEventDrop}
      />

      {/* Right Panel: Appointment 360 Drawer */}
      {selectedAppointment && (
        <Appointment360Panel 
          appointment={selectedAppointment} 
          onClose={() => setSelectedAppointment(null)}
          onUpdate={async (id, updates) => {
            // Update locally for instant feedback
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
            setSelectedAppointment(prev => prev?.id === id ? { ...prev, ...updates } as Appointment : prev);
            try {
              await updateAppointment(id, updates);
            } catch (err) {
              console.error('Failed to update appointment:', err);
              // In a real app, we'd revert the local state on failure
            }
          }}
        />
      )}

      {/* Booking Modal */}
      <BookAppointmentModal 
        open={isBookingModalOpen} 
        onClose={() => {
          setIsBookingModalOpen(false);
          setBookingDefaults(null);
        }} 
        defaults={bookingDefaults}
      />
    </div>
  );
}
