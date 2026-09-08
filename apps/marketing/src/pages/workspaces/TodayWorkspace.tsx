import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useBusiness, useAppointments, useActiveBusinessContext } from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { CheckCircle2, Calendar, AlertTriangle } from 'lucide-react';
import { StatusBadge, BeautifulEmptyState } from '@/components/vowos/ui';
import { useMissedCommunications } from '@/lib/hooks/useMissedCommunications';
import { StaffRoster, PendingRequestsList, FollowUpsAndReports } from '@/components/vowos/TodayGameplan';

export default function TodayWorkspace() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'Owner';
  const navigate = useNavigate();
  
  const { data: business } = useBusiness();
  const { activeLocation } = useVowosData();
  const businessId = business?.id;
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
    <div className="space-y-6 pb-20">
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-serif font-bold text-stone-900">Today's Gameplan</h1>
        <p className="text-stone-500">
          {isOwner ? "Here's everything you need to orchestrate today." : "Here's your schedule for today."}
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

      {/* Staff Roster Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-stone-900 font-serif">Who is Working Today</h2>
        <StaffRoster businessId={businessId} locationId={locationId} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Queue Section */}
          <PendingRequestsList businessId={businessId} locationId={locationId} />

          {/* Schedule Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-stone-900">Today's Appointments</h2>
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
        </div>

        {/* Right Column: Follow ups & Reports */}
        <div className="space-y-6">
          <FollowUpsAndReports businessId={businessId} locationId={locationId} />
        </div>
      </div>
    </div>
  );
}
