import React, { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Appointment, AppointmentRequest, EmployeeSchedule } from '@/lib/appointment360';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Users, Maximize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CalendarCenterGridProps {
  appointments: Appointment[];
  schedules: EmployeeSchedule[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDateSelect: (selectInfo: any) => void;
  onEventDrop: (dropInfo: any) => void;
}

export default function CalendarCenterGrid({
  appointments,
  schedules,
  onAppointmentClick,
  onDateSelect,
  onEventDrop,
}: CalendarCenterGridProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [viewName, setViewName] = useState('timeGridWeek');

  const handleViewChange = (view: string) => {
    setViewName(view);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
    }
  };

  const events = appointments.map((appt) => ({
    id: appt.id,
    title: appt.customer?.name || 'Appointment',
    start: appt.start_at,
    end: appt.end_at,
    extendedProps: appt,
    backgroundColor: appt.status === 'Confirmed' ? '#059669' : '#f59e0b',
    borderColor: 'transparent',
  }));

  // Add employee schedules as background events
  const backgroundEvents = schedules.map((schedule) => ({
    id: `sched-${schedule.id}`,
    title: `Shift: ${schedule.employee_id}`,
    start: `${schedule.shift_date}T${schedule.start_at}`,
    end: `${schedule.shift_date}T${schedule.end_at}`,
    display: 'background',
    backgroundColor: '#ecfdf5', // light green for working
  }));

  return (
    <div className="flex-1 flex flex-col bg-white h-full relative">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => calendarRef.current?.getApi().prev()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
          <Button variant="outline" size="sm" onClick={() => calendarRef.current?.getApi().today()}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => calendarRef.current?.getApi().next()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Button>
          <div className="h-6 w-px bg-stone-200 mx-2" />
          <Button 
            variant={viewName === 'timeGridDay' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleViewChange('timeGridDay')}
          >
            Day
          </Button>
          <Button 
            variant={viewName === 'timeGridWeek' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleViewChange('timeGridWeek')}
          >
            Week
          </Button>
          <Button 
            variant={viewName === 'dayGridMonth' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleViewChange('dayGridMonth')}
          >
            Month
          </Button>
          <div className="h-6 w-px bg-stone-200 mx-2" />
          <Button variant="outline" size="sm">
            <Users className="w-4 h-4 mr-2" /> Staffing Grid
          </Button>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-stone-500">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2" /> Confirmed
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" /> Pending
          </div>
          <Button variant="ghost" size="icon">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full fc-custom-theme">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            events={[...events, ...backgroundEvents]}
            editable={true}
            droppable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            slotMinTime="07:00:00"
            slotMaxTime="21:00:00"
            allDaySlot={false}
            eventClick={(arg) => {
              if (arg.event.display !== 'background') {
                onAppointmentClick(arg.event.extendedProps as Appointment);
              }
            }}
            select={onDateSelect}
            eventDrop={onEventDrop}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
}
