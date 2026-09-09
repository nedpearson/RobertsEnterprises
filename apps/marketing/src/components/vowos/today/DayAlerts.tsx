import React, { useMemo } from 'react';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import {
  useAppointments,
  useAppointmentRequests,
  useEmployeeSchedules,
} from '@/lib/services/schedulingService';
import { isArchivedAppointmentRequestStatus } from '@/lib/services/bookingRequestBulk';
import { useMissedCommunications } from '@/lib/hooks/useMissedCommunications';
import { AlertTriangle, Clock, MessageSquareWarning } from 'lucide-react';

type Severity = 'critical' | 'warning';

interface Alert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  ctaLabel: string;
  onAct: () => void;
  icon: React.ReactNode;
}

interface DayAlertsProps {
  businessId?: string;
  locationId: string | 'all';
  isOwner?: boolean;
}

const STALE_DAYS = 7;

/**
 * The two or three things that will actually cost money today, stated as
 * sentences with one real action each. Renders nothing when the day is clean.
 */
export function DayAlerts({ businessId, locationId, isOwner }: DayAlertsProps) {
  const { navigateToView } = useApplicationRoute();
  const { data: appointments = [] } = useAppointments(businessId, locationId);
  const { data: schedules = [] } = useEmployeeSchedules(businessId, locationId);
  const { data: requests = [] } = useAppointmentRequests(businessId, locationId);
  const { data: missedCount = 0 } = useMissedCommunications();

  const todayStr = new Date().toISOString().split('T')[0];

  const todaysAppointments = useMemo(
    () =>
      appointments.filter((a: any) => {
        const dateStr = a.start_at ? a.start_at.slice(0, 10) : a.date;
        return dateStr === todayStr;
      }),
    [appointments, todayStr]
  );

  const staffOnToday = useMemo(
    () => schedules.filter((s: any) => s.date === todayStr).length,
    [schedules, todayStr]
  );

  const { staleCount, oldestDays } = useMemo(() => {
    const cutoff = Date.now() - STALE_DAYS * 86_400_000;
    let count = 0;
    let oldest = 0;
    for (const req of requests as any[]) {
      if (isArchivedAppointmentRequestStatus(req.status)) continue;
      const raw = req.created_at || req.submitted_at;
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (Number.isNaN(ts) || ts >= cutoff) continue;
      count += 1;
      const days = Math.floor((Date.now() - ts) / 86_400_000);
      if (days > oldest) oldest = days;
    }
    return { staleCount: count, oldestDays: oldest };
  }, [requests]);

  const firstApptLabel = useMemo(() => {
    if (todaysAppointments.length === 0) return null;
    const sorted = [...todaysAppointments].sort((a: any, b: any) => {
      const ta = new Date(a.start_at || `${a.date}T${a.time || '00:00'}`).getTime();
      const tb = new Date(b.start_at || `${b.date}T${b.time || '00:00'}`).getTime();
      return ta - tb;
    });
    const first: any = sorted[0];
    return first.start_at
      ? new Date(first.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : first.time || null;
  }, [todaysAppointments]);

  const alerts: Alert[] = [];

  if (staffOnToday === 0 && todaysAppointments.length > 0) {
    alerts.push({
      id: 'no-staff',
      severity: 'critical',
      title: 'No staff scheduled today',
      detail: `${todaysAppointments.length} appointment${
        todaysAppointments.length === 1 ? ' is' : 's are'
      } booked with nobody assigned to run ${todaysAppointments.length === 1 ? 'it' : 'them'}${
        firstApptLabel ? `. First is at ${firstApptLabel}` : ''
      }.`,
      ctaLabel: "Build today's schedule",
      onAct: () => navigateToView('team', { tab: 'scheduling' }),
      icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
    });
  }

  if (missedCount > 0) {
    alerts.push({
      id: 'missed-comms',
      severity: 'critical',
      title: `${missedCount} unanswered message${missedCount === 1 ? '' : 's'}`,
      detail: 'Brides have been waiting more than two hours for a reply.',
      ctaLabel: 'Open inbox',
      onAct: () => navigateToView('customers', { tab: 'inbox' }),
      icon: <MessageSquareWarning className="h-5 w-5" aria-hidden="true" />,
    });
  }

  if (staleCount > 0) {
    alerts.push({
      id: 'stale-queue',
      severity: 'warning',
      title: `${staleCount.toLocaleString()} booking request${
        staleCount === 1 ? ' is' : 's are'
      } more than a week old`,
      detail: `Oldest is ${oldestDays} days. Every one is a bride who filled out your form and never heard back.`,
      ctaLabel: 'Triage the queue',
      onAct: () => navigateToView('appointments', { tab: 'booking-requests' }),
      icon: <Clock className="h-5 w-5" aria-hidden="true" />,
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 mb-5 sm:mb-6" role="region" aria-label="Today's alerts">
      {alerts.map((alert) => {
        const critical = alert.severity === 'critical';
        return (
          <div
            key={alert.id}
            className="flex items-stretch gap-0 overflow-hidden rounded-xl border bg-white shadow-sm border-stone-200"
          >
            {/* Severity stripe — encodes urgency without spending the accent hue */}
            <div
              className={`w-1 shrink-0 ${critical ? 'bg-vowos-rose' : 'bg-vowos-clay'}`}
              aria-hidden="true"
            />
            <div className="flex flex-1 flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
              <div className="flex flex-1 items-start gap-3">
                <span
                  className={`mt-0.5 shrink-0 ${critical ? 'text-vowos-rose' : 'text-vowos-clay'}`}
                >
                  {alert.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-snug text-stone-900 sm:text-[15px]">
                    {alert.title}
                  </h3>
                  <p className="mt-0.5 text-[13px] leading-snug text-stone-600">{alert.detail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={alert.onAct}
                className={`w-full shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:w-auto sm:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                  critical
                    ? 'bg-stone-900 text-white hover:bg-stone-800 focus-visible:ring-stone-400'
                    : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 focus-visible:ring-stone-300'
                }`}
              >
                {alert.id === 'no-staff' && !isOwner ? 'View schedule' : alert.ctaLabel}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
