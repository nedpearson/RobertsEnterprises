// React 17+ core
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

/**
 * Normalizes '10:00 AM' into a discrete Date object for today.
 */
const parseTimeSlotToDate = (timeSlotStr: string): Date => {
  const today = new Date();
  today.setSeconds(0);
  today.setMilliseconds(0);
  
  if (!timeSlotStr) return today;

  const [time, modifier] = timeSlotStr.split(' ');
  if (!time || !modifier) return today;

  let [hours, minutes] = time.split(':').map(Number);
  
  if (hours === 12) {
    hours = modifier === 'PM' ? 12 : 0;
  } else if (modifier === 'PM') {
    hours = hours + 12;
  }

  today.setHours(hours, minutes || 0);
  return today;
};

export const CalendarModule = ({ 
  appointments, 
  onNewAppt, 
  onInspectAppt 
}: { 
  appointments: any[], 
  onNewAppt: () => void, 
  onInspectAppt: (appt: any) => void 
}) => {
  
  // Transform unstructured backend appointments into react-big-calendar Events
  const events = appointments.map(a => {
    const startDate = parseTimeSlotToDate(a.time_slot || '10:00 AM');
    // Assume each appointment is exactly 1 hour for rendering bounds
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    return {
      id: a.id,
      title: `${a.first_name} ${a.last_name} - ${a.type}`,
      start: startDate,
      end: endDate,
      resource: a,
      consultant: a.consultant_name,
      room: a.room_name
    };
  });

  return (
    <div className="dashboard-scroll" style={{ background: 'white', borderRadius: 12, padding: 32, border: '1px solid #eee', width: '100%', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
           <h2 style={{ margin: 0, fontSize: 28 }}>Master Scheduling Calendar</h2>
           <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Interactive timeline for bridal appts, fittings, and operational events.</p>
        </div>
        <button className="btn btn-primary" onClick={onNewAppt} style={{ padding: '12px 24px', fontWeight: 'bold' }}>+ Book Appointment</button>
      </div>

      <div style={{ flex: 1, border: '1px solid #eaeaea', borderRadius: 8, overflow: 'hidden', padding: 16 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView="week"
          views={['month', 'week', 'day', 'agenda']}
          onSelectEvent={(event) => onInspectAppt(event.resource)}
          step={30}
          timeslots={2}
          min={new Date(new Date().setHours(8, 0, 0, 0))} // Start day at 8 AM
          max={new Date(new Date().setHours(19, 0, 0, 0))} // End day at 7 PM
          components={{
            event: ({ event }) => (
              <div style={{ fontSize: 11, lineHeight: '14px', padding: 2 }}>
                <b style={{display: 'block', marginBottom: 2}}>{event.title}</b>
                <span style={{color: 'rgba(255,255,255,0.9)'}}>
                   {event.consultant} ({event.room})
                </span>
              </div>
            )
          }}
          eventPropGetter={() => ({
            style: {
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 4,
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }
          })}
        />
      </div>
    </div>
  );
};
