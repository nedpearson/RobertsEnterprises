import React from 'react';
import { useEmployeeSchedules } from '@/lib/services/schedulingService';
import { Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function StaffRoster({ businessId, locationId }: { businessId?: string, locationId: string | 'all' }) {
  const { data: schedules = [], isLoading } = useEmployeeSchedules(businessId, locationId);
  const todayStr = new Date().toISOString().split('T')[0];

  const todaysRoster = schedules.filter(s => s.date === todayStr);

  if (isLoading) {
    return <div className="text-sm text-stone-500 animate-pulse">Loading staff roster...</div>;
  }

  if (todaysRoster.length === 0) {
    return <div className="text-sm text-stone-500">No staff scheduled for today.</div>;
  }

  return (
    <div className="flex flex-wrap gap-4">
      {todaysRoster.map(shift => {
        const staff = shift.employee || {};
        const initials = (staff.name || 'Un').substring(0, 2).toUpperCase();
        
        return (
          <div key={shift.id} className="flex items-center gap-3 bg-white border rounded-xl p-3 shadow-sm min-w-[200px]">
            <Avatar className="h-10 w-10">
              {staff.avatar_url && <AvatarImage src={staff.avatar_url} alt={staff.name} />}
              <AvatarFallback className="bg-brand-soft text-brand-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-stone-900 text-sm">{staff.name || 'Unknown Staff'}</p>
              <div className="flex items-center text-xs text-stone-500 mt-0.5">
                <Clock className="h-3 w-3 mr-1" />
                {shift.start_time} - {shift.end_time}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
