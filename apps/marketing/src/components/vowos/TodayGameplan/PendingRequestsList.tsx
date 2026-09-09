import React from 'react';
import { useAppointmentRequests } from '@/lib/services/schedulingService';
import { isArchivedAppointmentRequestStatus } from '@/lib/services/bookingRequestBulk';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';
import { Button } from '@/components/ui/button';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/vowos/ui';
import { formatDate } from '@/data/vowosData';

export function PendingRequestsList({ businessId, locationId }: { businessId?: string, locationId: string | 'all' }) {
  const { data: requests = [], isLoading } = useAppointmentRequests(businessId, locationId);
  const { navigateToView } = useApplicationRoute();

  // Filter out archived/sold, only keep pending (new, submitted, review, etc)
  const pendingRequests = requests
    .filter(req => !isArchivedAppointmentRequestStatus(req.status))
    .sort((a, b) => new Date(b.created_at || b.submitted_at || 0).getTime() - new Date(a.created_at || a.submitted_at || 0).getTime());

  if (isLoading) {
    return <div className="text-sm text-stone-500 animate-pulse">Loading queue...</div>;
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-6 text-center shadow-sm">
        <CalendarClock className="h-8 w-8 text-stone-300 mx-auto mb-2" />
        <p className="text-stone-500 font-medium">Queue is empty!</p>
        <p className="text-stone-400 text-sm mt-1">All booking requests have been processed.</p>
      </div>
    );
  }

  // Show top 3 or 4 requests
  const displayRequests = pendingRequests.slice(0, 4);

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-stone-50 px-4 py-3 border-b flex justify-between items-center">
        <h3 className="font-bold text-stone-900 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-brand-primary" />
          The Queue
          <span className="bg-brand-primary text-white text-xs px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
        </h3>
        <Button variant="ghost" size="sm" className="text-brand-primary h-8 text-xs" onClick={() => navigateToView('appointments', { tab: 'booking-requests' })}>
          View All <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
      <ul className="divide-y divide-stone-100">
        {displayRequests.map(req => {
          const customerName = req.customer?.name || req.customer_name || 'Unknown Bride';
          const submittedDate = req.created_at || req.submitted_at ? new Date(req.created_at || req.submitted_at).toLocaleDateString() : '';
          const preferredDate = req.preferences?.date ? formatDate(req.preferences.date) : 'No date specified';
          
          return (
            <li key={req.id} className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-stone-900">{customerName}</p>
                  <StatusBadge status={req.status || 'new'} />
                </div>
                <p className="text-xs text-stone-500">
                  Submitted: {submittedDate} &bull; Prefers: <span className="font-medium text-stone-700">{preferredDate}</span>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigateToView('appointments', { tab: 'booking-requests', appointmentId: req.id })}>
                Process
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

