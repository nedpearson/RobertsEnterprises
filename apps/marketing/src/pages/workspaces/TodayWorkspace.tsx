import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { useBusiness, useAppointments, useActiveBusinessContext } from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { CheckCircle2, Calendar, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/vowos/ui';
import { useMissedCommunications } from '@/lib/hooks/useMissedCommunications';
import { StaffRoster, PendingRequestsList, FollowUpsAndReports } from '@/components/vowos/TodayGameplan';
import NeedsAttention from '@/components/vowos/NeedsAttention';

// Hero + KPI components (created by the today/ stream)
// These may not yet exist if the build stream is still running — they are lazy-imported
// so a missing file fails at runtime rather than compile time, enabling incremental deployment.
let HeroSection: React.ComponentType<{ businessId?: string; locationId: string | 'all' }> | null = null;
let KpiRow: React.ComponentType<{ businessId?: string; locationId: string | 'all' }> | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const todayMod = require('@/components/vowos/today');
  HeroSection = todayMod.HeroSection ?? null;
  KpiRow = todayMod.KpiRow ?? null;
} catch {
  // Hero components not yet deployed — fall back to legacy header
}

export default function TodayWorkspace() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'Owner';
  const { navigateToView } = useApplicationRoute();
  
  const { data: business } = useBusiness();
  const { activeLocation } = useVowosData();
  const businessId = business?.id;
  const { locationId } = useActiveBusinessContext();
  const { data: appointments = [] } = useAppointments(businessId, locationId);
  const { data: missedCount = 0 } = useMissedCommunications();

  const todayStr = new Date().toISOString().split('T')[0];
  
  const todaysAppointments = appointments
    .filter((a) => {
      if (!a.start_at && !a.date) return false;
      const dateStr = a.start_at ? a.start_at.slice(0, 10) : a.date;
      return dateStr === todayStr;
    })
    .sort((a, b) => {
      const timeA = new Date(a.start_at || `${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(b.start_at || `${b.date}T${b.time || '00:00'}`).getTime();
      return timeA - timeB;
    });

  return (
    <div className="pb-20">
      {/* ── CINEMATIC HERO (full-bleed, -mx to break out of page padding) ── */}
      {HeroSection ? (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 mb-8">
          <HeroSection businessId={businessId} locationId={locationId} />
        </div>
      ) : (
        /* Legacy fallback header while hero components deploy */
        <div className="flex flex-col space-y-1 mb-6">
          <h1 className="text-3xl font-serif font-bold text-stone-900">Today's Gameplan</h1>
          <p className="text-stone-500">
            {isOwner ? "Here's everything you need to orchestrate today." : "Here's your schedule for today."}
          </p>
        </div>
      )}

      {/* ── MISSED MESSAGES ALERT (only when no hero to surface urgency) ── */}
      {missedCount > 0 && (
        <button
          onClick={() => navigateToView('customers', { tab: 'inbox' })}
          className="w-full mb-6 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          aria-label={`${missedCount} unanswered messages — click to open inbox`}
        >
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-bold text-red-900">
              {missedCount} unanswered inbound message{missedCount === 1 ? '' : 's'} — brides waiting over 2 hours
            </h3>
            <p className="text-red-700 text-sm mt-1">
              Click to view your Inbox and reply.
            </p>
          </div>
        </button>
      )}

      {/* ── 4 KPI TILES ── */}
      {KpiRow && (
        <div className="mb-8">
          <KpiRow businessId={businessId} locationId={locationId} />
        </div>
      )}

      {/* ── STAFF ROSTER ── */}
      <section className="space-y-3 mb-6">
        <h2 className="text-lg font-bold text-stone-900 font-serif">Who is Working Today</h2>
        <StaffRoster businessId={businessId} locationId={locationId} />
      </section>

      {/* ── MAIN CONTENT: 2/3 queue + 1/3 attention ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Queue + Appointments */}
        <div className="lg:col-span-2 space-y-6">
          <PendingRequestsList businessId={businessId} locationId={locationId} />

          {/* Today's Appointments */}
          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-stone-900">Today's Appointments</h2>
            {todaysAppointments.length > 0 ? (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <ul className="divide-y divide-stone-100">
                  {todaysAppointments.map((a) => {
                    const customerName = typeof a.customer === 'object' && a.customer
                      ? (a.customer as any).name
                      : typeof a.customer === 'string'
                      ? a.customer
                      : 'Unknown Bride';
                    const serviceName = (a as any).service?.name || a.type || 'Appointment';
                    const stylistName = typeof a.employee === 'object' && a.employee
                      ? (a.employee as any).name
                      : typeof a.stylist === 'string' ? a.stylist : 'Unassigned';
                    const roomName = (a as any).room?.name || (a as any).room || 'Any Room';
                    const status = a.status || 'Confirmed';
                    const timeStr = a.start_at
                      ? new Date(a.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : a.time || '—';

                    return (
                      <li key={a.id} className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
                        <div className="flex items-start gap-4">
                          <div className="text-right min-w-[100px]">
                            <p className="font-bold text-stone-900 tabular-nums">{timeStr}</p>
                          </div>
                          <div className="w-px h-10 bg-stone-200 mx-2 shrink-0" aria-hidden="true" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-brand-primary text-lg">{customerName}</p>
                              <StatusBadge status={status} />
                            </div>
                            <p className="text-sm text-stone-600">
                              {serviceName} &bull; Stylist: <span className="font-medium text-stone-900">{stylistName}</span> &bull; {roomName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {status === 'Confirmed' && (
                            <button
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                              onClick={() => navigateToView('appointments', { tab: 'calendar' })}
                              aria-label={`Check in ${customerName}`}
                            >
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Check In
                            </button>
                          )}
                          <button
                            onClick={() => navigateToView('appointments', { tab: 'calendar' })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                            aria-label={`View 360 for ${customerName}`}
                          >
                            View 360
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-12 flex flex-col items-center gap-3 text-center">
                <Calendar className="h-10 w-10 text-stone-200" aria-hidden="true" />
                <h3 className="font-serif text-lg font-semibold text-stone-700">No appointments scheduled for today</h3>
                <p className="text-stone-400 text-sm max-w-xs">Your schedule is clear. Use this time to catch up on requests or organise your floor.</p>
                <button
                  onClick={() => navigateToView('appointments', { tab: 'calendar' })}
                  className="mt-2 text-sm text-brand-primary hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  Open the calendar →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3: Follow-ups + NeedsAttention */}
        <div className="space-y-6">
          <FollowUpsAndReports businessId={businessId} locationId={locationId} />
          <NeedsAttention />
        </div>
      </div>
    </div>
  );
}
