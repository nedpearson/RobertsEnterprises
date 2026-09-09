import React, { useMemo } from 'react';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { useAppointments, useAppointmentRequestCount } from '@/lib/services/schedulingService';
import { useMissedCommunications } from '@/lib/hooks/useMissedCommunications';

interface StateOfDayBarProps {
  businessId?: string;
  locationId: string | 'all';
}

/**
 * One-sentence state-of-day summary composed from live data.
 * Each noun is a navigable link. Renders nothing if all counts are zero.
 */
export function StateOfDayBar({ businessId, locationId }: StateOfDayBarProps) {
  const { navigateToView } = useApplicationRoute();
  const { data: appointments = [] } = useAppointments(businessId, locationId);
  const { data: requestCount = 0 } = useAppointmentRequestCount(businessId, locationId, 'active');
  const { data: missedCount = 0 } = useMissedCommunications();

  const todayStr = new Date().toISOString().split('T')[0];

  const todayAppts = useMemo(() =>
    appointments.filter(a => {
      const dateStr = a.start_at ? a.start_at.slice(0, 10) : a.date;
      return dateStr === todayStr;
    }),
    [appointments, todayStr]
  );

  const fittings = useMemo(() =>
    todayAppts.filter(a => {
      const type = ((a as any).service?.name || a.type || '').toLowerCase();
      return type.includes('fitting') || type.includes('alteration');
    }).length,
    [todayAppts]
  );

  const parts: React.ReactNode[] = [];

  if (todayAppts.length > 0) {
    parts.push(
      <button
        key="appts"
        onClick={() => navigateToView('appointments', { tab: 'calendar' })}
        className="font-semibold text-white hover:text-vowos-champagne transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
        aria-label={`${todayAppts.length} appointments today — open calendar`}
      >
        {todayAppts.length} appointment{todayAppts.length !== 1 ? 's' : ''}
      </button>
    );
  }

  if (fittings > 0) {
    parts.push(
      <button
        key="fittings"
        onClick={() => navigateToView('sales', { tab: 'alterations' })}
        className="font-semibold text-white hover:text-vowos-champagne transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
        aria-label={`${fittings} fittings today — open alterations`}
      >
        {fittings} fitting{fittings !== 1 ? 's' : ''}
      </button>
    );
  }

  if (requestCount > 0) {
    parts.push(
      <button
        key="requests"
        onClick={() => navigateToView('appointments', { tab: 'booking-requests' })}
        className="font-semibold text-white hover:text-vowos-champagne transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
        aria-label={`${requestCount} booking requests awaiting response`}
      >
        {requestCount} new request{requestCount !== 1 ? 's' : ''}
      </button>
    );
  }

  if (missedCount > 0) {
    parts.push(
      <button
        key="inbox"
        onClick={() => navigateToView('customers', { tab: 'inbox' })}
        className="font-semibold text-vowos-rose hover:text-red-300 transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
        aria-label={`${missedCount} unanswered messages — open inbox`}
      >
        {missedCount} unanswered
      </button>
    );
  }

  if (parts.length === 0) return null;

  return (
    <p className="text-sm text-white/80 flex flex-wrap items-center gap-x-1 gap-y-0.5" role="status" aria-live="polite">
      {parts.reduce<React.ReactNode[]>((acc, part, i) => {
        if (i > 0) acc.push(<span key={`sep-${i}`} className="text-white/40 select-none"> · </span>);
        acc.push(part);
        return acc;
      }, [])}
      {'.'}
    </p>
  );
}
