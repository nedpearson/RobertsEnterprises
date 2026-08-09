import React from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Plus } from 'lucide-react';

interface WorkforceMatrixProps {
  staff: any[];
  schedules: any[];
  timeOffRequests?: any[]; // optional for now
  currentDate: Date;
  onShiftClick: (shift: any) => void;
  onEmptySlotClick: (employeeId: string, date: Date) => void;
}

export const WorkforceMatrix: React.FC<WorkforceMatrixProps> = ({
  staff,
  schedules,
  timeOffRequests = [],
  currentDate,
  onShiftClick,
  onEmptySlotClick
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Helper to find shifts for a specific employee on a specific day
  const getShifts = (employeeId: string, date: Date) => {
    return schedules.filter(s => s.employee_id === employeeId && isSameDay(new Date(s.shift_date || s.start_at), date));
  };

  const getTimeOff = (employeeId: string, date: Date) => {
    return timeOffRequests.filter(req => 
      req.employee_id === employeeId && 
      req.status === 'approved' &&
      isSameDay(new Date(req.start_date), date)
    );
  };

  return (
    <div className="w-full overflow-x-auto border border-stone-200 rounded-md">
      <table className="w-full text-sm text-left border-collapse min-w-[800px]">
        <thead className="bg-stone-50 border-b border-stone-200">
          <tr>
            <th className="px-4 py-3 font-semibold text-stone-900 border-r border-stone-200 w-48 sticky left-0 bg-stone-50 z-10">
              Employee
            </th>
            {days.map(day => (
              <th key={day.toISOString()} className="px-4 py-3 font-semibold text-stone-900 border-r border-stone-200 min-w-[120px] text-center">
                {format(day, 'EEE')} <span className="text-stone-500 font-normal">{format(day, 'MMM d')}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.map((employee, idx) => (
            <tr key={employee.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}>
              <td className="px-4 py-3 border-r border-b border-stone-200 font-medium text-stone-900 sticky left-0 bg-white z-10">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center mr-2 font-bold text-xs shrink-0">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </div>
                  <div className="truncate">
                    {employee.first_name} {employee.last_name}
                  </div>
                </div>
              </td>
              {days.map(day => {
                const dayShifts = getShifts(employee.id, day);
                const dayTimeOff = getTimeOff(employee.id, day);
                
                return (
                  <td 
                    key={day.toISOString()} 
                    className="border-r border-b border-stone-200 relative group h-16 min-h-[4rem] p-1 align-top hover:bg-stone-100 transition-colors"
                  >
                    {/* Time Off Rendering */}
                    {dayTimeOff.length > 0 && (
                      <div className="absolute inset-0 bg-orange-50 opacity-50 pointer-events-none" />
                    )}

                    <div className="flex flex-col gap-1 w-full h-full min-h-[3.5rem] relative z-10">
                      {dayShifts.map(shift => (
                        <div 
                          key={shift.id}
                          onClick={(e) => { e.stopPropagation(); onShiftClick(shift); }}
                          className={`
                            px-2 py-1 text-xs rounded border cursor-pointer truncate shadow-sm transition-shadow hover:shadow-md
                            ${shift.status === 'published' ? 'bg-violet-100 border-violet-200 text-violet-800' : 'bg-stone-100 border-stone-200 text-stone-700 border-dashed'}
                          `}
                          title={`${format(new Date(shift.start_at), 'h:mm a')} - ${format(new Date(shift.end_at), 'h:mm a')}`}
                        >
                          <div className="font-semibold">{format(new Date(shift.start_at), 'h:mm a')}</div>
                          <div className="opacity-80">{format(new Date(shift.end_at), 'h:mm a')}</div>
                          {shift.shift_type && shift.shift_type !== 'Regular' && (
                            <div className="text-[10px] uppercase tracking-wider mt-0.5 font-bold opacity-70">{shift.shift_type}</div>
                          )}
                        </div>
                      ))}
                      
                      {dayTimeOff.map((to, i) => (
                        <div key={i} className="px-2 py-1 text-xs rounded border border-orange-200 bg-orange-100 text-orange-800 truncate">
                          {to.type}
                        </div>
                      ))}

                      {dayShifts.length === 0 && dayTimeOff.length === 0 && (
                        <div 
                          onClick={() => onEmptySlotClick(employee.id, day)}
                          className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-stone-400 hover:text-violet-600"
                        >
                          <Plus className="w-5 h-5" />
                        </div>
                      )}
                      
                      {/* Allow adding second shift even if one exists */}
                      {dayShifts.length > 0 && (
                         <div 
                          onClick={(e) => { e.stopPropagation(); onEmptySlotClick(employee.id, day); }}
                          className="w-full py-0.5 mt-1 border border-dashed border-stone-300 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-stone-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50"
                        >
                          <Plus className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                No staff members found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
