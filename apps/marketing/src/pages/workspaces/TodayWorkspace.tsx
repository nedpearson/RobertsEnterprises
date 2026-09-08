import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardView from '@/components/vowos/DashboardView';
import { useNavigate } from 'react-router-dom';
import { usePendingRequestCount, useBusiness, useAppointments, useActiveBusinessContext } from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { CalendarClock, ChevronRight, CheckCircle2, Calendar, AlertTriangle } from 'lucide-react';
import { StatusBadge, BeautifulEmptyState } from '@/components/vowos/ui';
import { useMissedCommunications } from '@/lib/hooks/useMissedCommunications';

export default function TodayWorkspace() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'Owner';
  const navigate = useNavigate();
  
  const { data: business } = useBusiness();
  const { activeLocation } = useVowosData();
  const businessId = business?.id;
  
  const {
    data: pendingCount = 0,
    isLoading: requestsLoading,
    isError: requestsFailed,
  } = usePendingRequestCount(businessId, activeLocation);

  const { locationId } = useActiveBusinessContext();
  const { data: appointments = [] } = useAppointments(businessId, locationId);
  const { data: missedCount = 0 } = useMissedCommunications();

  const todayStr = new Date().toISOString().split('T')[0];
  
  const todaysAppointments = appointments
    .filter((a) => {
      if (!a.start_at) return false;
      return a.start_at.startsWith(todayStr) || (a.date === todayStr);
    })
    .sort((a, b) => {
      const timeA = new Date(a.start_at || `${a.date}T${a.time}`).getTime();
      const timeB = new Date(b.start_at || `${b.date}T${b.time}`).getTime();
      return timeA - timeB;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Today</h1>
        <p className="text-stone-500">
          {isOwner ? "Here's what needs your attention today." : "Here's your schedule for today."}
        </p>
      </div>

      {missedCount > 0 && (
        <div 
          onClick={() => navigate('/customers?tab=inbox')}
          className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-900">
              ⚠️ {missedCount} unanswered inbound message{missedCount === 1 ? '' : 's'} — brides waiting over 2 hours
            </h3>
            <p className="text-red-700 text-sm mt-1">
              Click to view your Inbox and reply to waiting brides.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Booking Requests Quick Card */}
        <div 
          onClick={() => navigate('/appointments?tab=booking-requests')}
          className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md hover:border-brand-primary/50 transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="flex gap-4 items-start">
            <div className="bg-brand-soft p-3 rounded-lg text-brand-primary">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg group-hover:text-brand-primary transition-colors">Booking Requests</h3>
              <p className="text-stone-500 text-sm mt-1">
                {requestsLoading
                  ? 'Checking for requests…'
                  : requestsFailed
                    ? 'Could not load booking requests'
                    : pendingCount === 0
                      ? 'No requests received by VowOS'
                      : `${pendingCount.toLocaleString()} pending request${pendingCount === 1 ? '' : 's'} waiting for review`}
              </p>
            </div>
          </div>
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-stone-50 group-hover:bg-brand-soft transition-colors">
            <ChevronRight className="h-5 w-5 text-stone-400 group-hover:text-brand-primary" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-stone-900">Today's Schedule</h2>
        {todaysAppointments.length > 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-stone-100">
              {todaysAppointments.map((a) => {
                const customerName = a.customer?.name || a.customer || 'Unknown Bride';
                const serviceName = a.service?.name || a.type || 'Appointment';
                const stylistName = a.employee?.name || a.stylist || 'Unassigned';
                const roomName = a.room?.name || a.room || 'Any Room';
                const status = a.status || 'Confirmed';

                return (
                  <li key={a.id} className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="text-right min-w-[100px]">
                        <p className="font-bold text-stone-900">{a.time || new Date(a.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="w-px h-10 bg-stone-200 mx-2"></div>
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
                    <div className="flex items-center gap-2">
                      {status === 'Confirmed' && (
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
                          <CheckCircle2 className="h-4 w-4" /> Check In
                        </button>
                      )}
                      <button 
                        onClick={() => navigate('/appointments')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg shadow-sm transition-colors"
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
          <BeautifulEmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="No appointments scheduled for today"
            description="Your schedule is clear. Use this time to catch up on requests or organize your floor."
            colorHint="stone"
          />
        )}
      </div>

      <DashboardView onNavigate={(v) => navigate(`/${v}`)} />
    </div>
  );
}
