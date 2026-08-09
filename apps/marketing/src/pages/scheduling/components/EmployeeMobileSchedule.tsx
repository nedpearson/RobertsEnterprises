import React from 'react';
import { format, isSameDay } from 'date-fns';

interface EmployeeMobileScheduleProps {
  schedules: any[];
  currentDate: Date;
  employeeId: string;
}

export const EmployeeMobileSchedule: React.FC<EmployeeMobileScheduleProps> = ({ schedules, currentDate, employeeId }) => {
  const myShifts = schedules.filter(s => s.employee_id === employeeId).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  if (myShifts.length === 0) {
    return (
      <div className="p-8 text-center text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
        <p className="font-medium text-stone-700">No shifts scheduled</p>
        <p className="text-sm mt-1">You don't have any shifts scheduled for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {myShifts.map(shift => {
        const isToday = isSameDay(new Date(shift.start_at), new Date());
        
        return (
          <div 
            key={shift.id} 
            className={`p-4 rounded-xl border ${isToday ? 'border-violet-300 bg-violet-50/50' : 'border-stone-200 bg-white'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-stone-900">
                  {format(new Date(shift.start_at), 'EEEE, MMMM d')}
                </div>
                <div className="text-sm text-stone-500 font-medium">
                  {format(new Date(shift.start_at), 'h:mm a')} - {format(new Date(shift.end_at), 'h:mm a')}
                </div>
              </div>
              <div className="px-2 py-1 bg-stone-100 text-stone-700 rounded text-xs font-semibold uppercase tracking-wider">
                {shift.shift_type || 'Regular'}
              </div>
            </div>
            
            <div className="flex gap-4 mt-3 pt-3 border-t border-stone-100 text-xs">
              <div className="flex flex-col">
                <span className="text-stone-400 font-medium">Department</span>
                <span className="text-stone-700">{shift.department || 'Sales'}</span>
              </div>
              {(shift.unpaid_break_minutes > 0 || shift.paid_break_minutes > 0) && (
                <div className="flex flex-col">
                  <span className="text-stone-400 font-medium">Breaks</span>
                  <span className="text-stone-700">
                    {shift.unpaid_break_minutes > 0 ? `${shift.unpaid_break_minutes}m unpaid ` : ''}
                    {shift.paid_break_minutes > 0 ? `${shift.paid_break_minutes}m paid` : ''}
                  </span>
                </div>
              )}
            </div>
            {shift.notes && (
              <div className="mt-2 text-xs text-stone-500 italic bg-stone-50 p-2 rounded">
                "{shift.notes}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
