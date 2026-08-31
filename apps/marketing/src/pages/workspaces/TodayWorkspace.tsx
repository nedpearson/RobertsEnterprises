import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardView from '@/components/vowos/DashboardView';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { useAppointmentRequests } from '@/lib/services/schedulingService';
import { useBusiness } from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { CalendarClock, ChevronRight } from 'lucide-react';

export default function TodayWorkspace() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'Owner';
  // Demoapp/tenant-prefix-aware navigation from the canonical registry. This was
  // previously a raw useNavigate plus a NO-OP onNavigate stub handed to
  // DashboardView, which left every dashboard drill-down CTA dead on the live app.
  const { navigateToView } = useApplicationRoute();
  
  const { data: business } = useBusiness();
  const { activeLocation } = useVowosData();
  const businessId = business?.id;
  
  const { data: requests = [] } = useAppointmentRequests(businessId, activeLocation);
  
  // Filter for new/submitted requests
  const pendingRequests = requests.filter((r: any) => r.status === 'new' || r.status === 'submitted' || r.status === 'review');

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Today</h1>
        <p className="text-stone-500">
          {isOwner ? "Here's what needs your attention today." : "Here's your schedule for today."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Booking Requests Quick Card */}
        <div 
          onClick={() => navigateToView('appointments', { tab: 'booking-requests' })}
          className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md hover:border-brand-primary/50 transition-all cursor-pointer group flex items-start justify-between"
        >
          <div className="flex gap-4 items-start">
            <div className="bg-brand-soft p-3 rounded-lg text-brand-primary">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg group-hover:text-brand-primary transition-colors">Booking Requests</h3>
              <p className="text-stone-500 text-sm mt-1">
                {pendingRequests.length === 0 
                  ? 'All caught up' 
                  : `${pendingRequests.length} pending request${pendingRequests.length === 1 ? '' : 's'} waiting for review`}
              </p>
            </div>
          </div>
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-stone-50 group-hover:bg-brand-soft transition-colors">
            <ChevronRight className="h-5 w-5 text-stone-400 group-hover:text-brand-primary" />
          </div>
        </div>
      </div>

      <DashboardView onNavigate={navigateToView} />
    </div>
  );
}
