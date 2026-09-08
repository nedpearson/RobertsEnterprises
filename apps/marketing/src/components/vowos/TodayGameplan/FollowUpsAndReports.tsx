import React from 'react';
import { useAppointmentRequests, useAppointments } from '@/lib/services/schedulingService';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/vowos/ui';

export function FollowUpsAndReports({ businessId, locationId }: { businessId?: string, locationId: string | 'all' }) {
  const { data: requests = [] } = useAppointmentRequests(businessId, locationId);
  const { data: appointments = [] } = useAppointments(businessId, locationId);
  const navigate = useNavigate();

  // Find unsold brides from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const followUps = requests.filter(req => {
    if (req.status !== 'unsold_archived') return false;
    const date = new Date(req.updated_at || req.created_at);
    return date > sevenDaysAgo;
  }).slice(0, 3); // top 3

  // Find unconfirmed appointments for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const unconfirmedTomorrow = appointments.filter(a => {
    const isTomorrow = a.start_at?.startsWith(tomorrowStr) || a.date === tomorrowStr;
    const isUnconfirmed = a.status === 'New' || a.status === 'Pending' || a.status === 'Draft';
    return isTomorrow && isUnconfirmed;
  }).slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <h3 className="font-bold text-red-900">Actionable Follow-ups</h3>
        </div>
        
        {(followUps.length > 0 || unconfirmedTomorrow.length > 0) ? (
          <ul className="divide-y divide-stone-100">
            {unconfirmedTomorrow.map(apt => (
              <li key={apt.id} className="p-4 hover:bg-stone-50 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-stone-900 text-sm mb-0.5">{apt.customer?.name || apt.customer || 'Unknown'}</p>
                  <p className="text-xs text-amber-600 font-medium">Tomorrow's Appointment • Unconfirmed</p>
                </div>
                <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(`/appointments`)}>
                  <MessageSquare className="mr-1.5 h-3 w-3" /> Confirm
                </Button>
              </li>
            ))}
            {followUps.map(req => (
              <li key={req.id} className="p-4 hover:bg-stone-50 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-stone-900 text-sm mb-0.5">{req.customer?.name || req.customer_name}</p>
                  <p className="text-xs text-stone-500">Unsold Request &bull; {new Date(req.updated_at || req.created_at).toLocaleDateString()}</p>
                </div>
                <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(`/appointments?tab=booking-requests&appointmentId=${req.id}`)}>
                  <MessageSquare className="mr-1.5 h-3 w-3" /> Text
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-stone-500 text-sm">
            No pending follow-ups right now. Great job!
          </div>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-stone-50 px-4 py-3 border-b">
          <h3 className="font-bold text-stone-900">Daily Reports</h3>
        </div>
        <div className="p-2 grid grid-cols-1 gap-1">
          <Button variant="ghost" className="justify-start text-stone-700 font-medium" onClick={() => navigate('/sales')}>
            <TrendingUp className="mr-2 h-4 w-4 text-emerald-600" /> Today's Closing Report
          </Button>
          <Button variant="ghost" className="justify-start text-stone-700 font-medium" onClick={() => navigate('/reports')}>
            <Users className="mr-2 h-4 w-4 text-blue-600" /> Stylist Conversion Rate
          </Button>
          <Button variant="ghost" className="justify-start text-stone-700 font-medium" onClick={() => navigate('/appointments')}>
            <FileText className="mr-2 h-4 w-4 text-purple-600" /> Print Daily Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
