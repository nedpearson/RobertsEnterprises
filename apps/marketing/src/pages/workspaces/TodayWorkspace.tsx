import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { useBusiness, useAppointments, useActiveBusinessContext } from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { CheckCircle2, Calendar } from 'lucide-react';
import { StatusBadge } from '@/components/vowos/ui';
import { StaffRoster, PendingRequestsList, FollowUpsAndReports } from '@/components/vowos/TodayGameplan';
import NeedsAttention from '@/components/vowos/NeedsAttention';

import { HeroSection, KpiRow } from '@/components/vowos/today';
import { FloorTimeline } from '@/components/vowos/today/FloorTimeline';
import { DayAlerts } from '@/components/vowos/today/DayAlerts';

export default function TodayWorkspace() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'Owner';
  const { navigateToView } = useApplicationRoute();
  
  const { data: business } = useBusiness();
  const { activeLocation } = useVowosData();
  const businessId = business?.id;
  const { locationId } = useActiveBusinessContext();
  const { data: appointments = [] } = useAppointments(businessId, locationId);

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
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 mb-5 sm:mb-6">
        <HeroSection businessId={businessId} locationId={locationId} />
      </div>

      {/* ── DAY ALERTS: staffing gaps, stale queue, unanswered messages ── */}
      <DayAlerts businessId={businessId} locationId={locationId} isOwner={isOwner} />

      {/* ── 4 KPI TILES ── */}
      <div className="mb-6 sm:mb-8">
        <KpiRow businessId={businessId} locationId={locationId} />
      </div>

      {/* ── TODAY'S FLOOR: one lane per location, live now-line ── */}
      <div className="mb-6">
        <FloorTimeline businessId={businessId} locationId={locationId} />
      </div>

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

        {/* Right 1/3: Needs you + who's on the floor + reports */}
        <div className="space-y-6">
          <NeedsAttention />
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 font-serif">On the floor today</h2>
            <StaffRoster businessId={businessId} locationId={locationId} />
          </section>
          <FollowUpsAndReports businessId={businessId} locationId={locationId} />
        </div>
      </div>
    </div>
  );
}
