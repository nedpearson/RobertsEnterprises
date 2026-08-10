import React, { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardHeader, CardTitle, CardContent } from '@vowos/design-system';
import { getActiveDataPlane } from '@/lib/supabase';

const INITIAL_SEED_APPOINTMENTS: any[] = getActiveDataPlane() === 'demo' ? [] : [];

export default function ConfirmedAppointments() {
  const calendarRef = useRef<FullCalendar>(null);

  const handleViewChange = (view: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth') => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(view);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Confirmed Appointments</h1>
        <div className="flex gap-2 bg-muted p-1 rounded-md">
          <button onClick={() => handleViewChange('timeGridDay')} className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-white hover:shadow-sm transition-all focus:bg-white focus:shadow-sm">Day</button>
          <button onClick={() => handleViewChange('timeGridWeek')} className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-white hover:shadow-sm transition-all focus:bg-white focus:shadow-sm">Week</button>
          <button onClick={() => handleViewChange('dayGridMonth')} className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-white hover:shadow-sm transition-all focus:bg-white focus:shadow-sm">Month</button>
        </div>
      </div>
      
      <Card className="flex-grow flex flex-col min-h-0">
        <CardHeader className="py-4">
          <CardTitle>Master Schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            View all confirmed appointments.
          </p>
        </CardHeader>
        <CardContent className="flex-grow p-4 relative">
          <div className="absolute inset-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '' // Custom view buttons are outside
              }}
              allDaySlot={false}
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              events={INITIAL_SEED_APPOINTMENTS}
              height="100%"
              eventClick={(info) => {
                alert(`Appointment Details:\n\n${info.event.title}\nTime: ${info.event.start?.toLocaleTimeString()} - ${info.event.end?.toLocaleTimeString()}`);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
