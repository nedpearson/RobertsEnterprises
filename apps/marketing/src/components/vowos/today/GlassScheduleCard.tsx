import React, { useState, useEffect } from 'react';
import { useAppointments } from '@/lib/services/schedulingService';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { Calendar, ChevronRight } from 'lucide-react';

interface GlassScheduleCardProps {
  businessId?: string;
  locationId: string | 'all';
}

function formatApptTime(startAt?: string, time?: string, date?: string): string {
  if (startAt) {
    return new Date(startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (time) return time;
  return '—';
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function getNowLinePercent(): number {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(8, 0, 0, 0); // 8 AM
  const endOfDay = new Date(now);
  endOfDay.setHours(20, 0, 0, 0); // 8 PM
  const total = endOfDay.getTime() - startOfDay.getTime();
  const elapsed = now.getTime() - startOfDay.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function GlassScheduleCard({ businessId, locationId }: GlassScheduleCardProps) {
  const { data: appointments = [], isLoading } = useAppointments(businessId, locationId);
  const { navigateToView } = useApplicationRoute();
  const [nowPct, setNowPct] = useState(getNowLinePercent);

  // Update the "now" line every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setNowPct(getNowLinePercent()), 30_000);
    return () => clearInterval(id);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppts = appointments
    .filter(a => {
      if (!a.start_at && !a.date) return false;
      const dateStr = a.start_at ? a.start_at.slice(0, 10) : a.date;
      return dateStr === todayStr;
    })
    .sort((a, b) => {
      const ta = new Date(a.start_at || `${a.date}T${a.time || '00:00'}`).getTime();
      const tb = new Date(b.start_at || `${b.date}T${b.time || '00:00'}`).getTime();
      return ta - tb;
    })
    .slice(0, 4);

  const handleCardClick = () => {
    navigateToView('appointments', { tab: 'calendar' });
  };

  const containerStyle: React.CSSProperties = {
    background: 'var(--vowos-glass-bg)',
    border: '1px solid var(--vowos-glass-border)',
    backdropFilter: 'blur(var(--vowos-glass-blur))',
    WebkitBackdropFilter: 'blur(var(--vowos-glass-blur))',
    borderRadius: '20px',
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle} role="region" aria-label="Today's schedule">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-white/70" aria-hidden="true" />
          <span className="text-base font-semibold text-white">Today's Schedule</span>
        </div>
        <button
          onClick={handleCardClick}
          className="text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
          aria-label="Open full calendar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Appointments list */}
      <div className="relative">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 items-center animate-pulse">
                <div className="w-12 h-3 bg-white/20 rounded" />
                <div className="flex-1 h-3 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : todayAppts.length === 0 ? (
          <button
            onClick={handleCardClick}
            className="w-full p-6 flex flex-col items-center gap-2 text-center hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-b-[20px]"
          >
            <Calendar className="h-6 w-6 text-white/40" aria-hidden="true" />
            <p className="text-base font-medium text-white/90">Nothing on the books today</p>
            <p className="text-sm text-white/60">Open the calendar →</p>
          </button>
        ) : (
          <div className="relative">
            {/* Now line */}
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: `${nowPct}%` }}
              aria-hidden="true"
            >
              <div className="flex items-center gap-1 px-3">
                <div className="w-1.5 h-1.5 rounded-full bg-vowos-champagne" />
                <div className="flex-1 h-px bg-vowos-champagne/60" />
              </div>
            </div>

            <ul className="divide-y divide-white/8">
              {todayAppts.map(appt => {
                const customerName =
                  typeof appt.customer === 'object' && appt.customer
                    ? (appt.customer as any).name
                    : typeof appt.customer === 'string'
                    ? appt.customer
                    : 'Unknown';
                const stylistName =
                  typeof appt.employee === 'object' && appt.employee
                    ? (appt.employee as any).name
                    : typeof appt.stylist === 'string'
                    ? appt.stylist
                    : '';
                const apptType = (appt as any).service?.name || appt.type || 'Appointment';
                const locationName = (appt as any).room?.name || '';

                return (
                  <li key={appt.id}>
                    <button
                      onClick={() => navigateToView('appointments', { tab: 'calendar' })}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/8 transition-colors text-left focus-visible:outline-none focus-visible:bg-white/10"
                      aria-label={`${customerName} at ${formatApptTime(appt.start_at, appt.time, appt.date)}`}
                    >
                      {/* Time */}
                      <span className="text-xs font-mono text-white/60 w-14 shrink-0 tabular-nums">
                        {formatApptTime(appt.start_at, appt.time, appt.date)}
                      </span>

                      {/* Name + type */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{customerName}</p>
                        <p className="text-[11px] text-white/60 truncate">{apptType}</p>
                      </div>

                      {/* Stylist avatar */}
                      {stylistName && (
                        <div
                          className="w-6 h-6 rounded-full bg-vowos-champagne/20 flex items-center justify-center shrink-0"
                          title={stylistName}
                          aria-label={`Stylist: ${stylistName}`}
                        >
                          <span className="text-[9px] font-bold text-vowos-champagne">
                            {getInitials(stylistName)}
                          </span>
                        </div>
                      )}

                      {/* Location chip */}
                      {locationName && (
                        <span className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
                          {locationName}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
