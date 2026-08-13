import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, AlertTriangle, Users, TrendingUp, ChevronRight, CheckCircle2, MessageSquare, Clock, MapPin } from 'lucide-react';
import { ViewKey } from '@/lib/navigation/navigationRegistry';

import MobileAppointment360 from './MobileAppointment360';
import MobileReassignWorkflow from './MobileReassignWorkflow';

interface MobileManagerTodayProps {
  onNavigate: (view: ViewKey) => void;
}

export default function MobileManagerToday({ onNavigate }: MobileManagerTodayProps) {
  const { profile } = useAuth();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] animate-in fade-in duration-300 pb-6">
      
      {/* 1. Immediate Alerts */}
      <div className="px-4 pt-4 space-y-3">
        <div className="bg-brand-soft border border-border-subtle rounded-xl p-3 shadow-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-brand-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-brand-secondary">Callout: Sarah Jenkins</h3>
            <p className="text-xs text-brand-primary-hover mt-0.5">Sarah is sick. 3 appointments need reassignment.</p>
            <button 
              data-tour-id="mobile-reassign-btn"
              onClick={() => setReassignOpen(true)}
              className="mt-2 text-xs font-semibold bg-white border border-border-subtle text-brand-primary px-3 py-1.5 rounded-lg shadow-sm w-full transition-colors active:bg-brand-soft"
            >
              Reassign Appointments
            </button>
          </div>
        </div>
        
        <div className="bg-status-warning/10 border border-status-warning/20 rounded-xl p-3 shadow-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-status-warning mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900">Unassigned VIP</h3>
            <p className="text-xs text-status-warning mt-0.5">Jessica Alba (2:00 PM) needs a Master Fitter.</p>
            <button 
              onClick={() => onNavigate('schedule')}
              className="mt-2 text-xs font-semibold bg-white border border-status-warning/20 text-status-warning px-3 py-1.5 rounded-lg shadow-sm w-full transition-colors active:bg-status-warning/10 flex items-center justify-center gap-1.5"
            >
              Assign Staff Now <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Today Summary (Horizontal Scroll) */}
      <div className="mt-6 pl-4">
        <h2 className="text-sm font-bold text-stone-900 mb-3">Today's Summary</h2>
        <div className="flex overflow-x-auto gap-3 pb-4 pr-4 snap-x hide-scrollbar">
          <div className="snap-start shrink-0 w-32 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Sales</span>
            <TrendingUp className="h-5 w-5 text-status-success mb-2" />
            <span className="text-lg font-bold text-stone-900">$4,250</span>
            <span className="text-[10px] text-status-success mt-1">70% to goal</span>
          </div>
          <div className="snap-start shrink-0 w-32 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Staffed</span>
            <Users className="h-5 w-5 text-indigo-500 mb-2" />
            <span className="text-lg font-bold text-stone-900">6 / 8</span>
            <span className="text-[10px] text-indigo-600 mt-1">On Floor</span>
          </div>
          <div className="snap-start shrink-0 w-32 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col items-center text-center">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Appts</span>
            <CalendarDays className="h-5 w-5 text-stone-700 mb-2" />
            <span className="text-lg font-bold text-stone-900">12</span>
            <span className="text-[10px] text-status-warning mt-1">3 Unassigned</span>
          </div>
        </div>
      </div>

      {/* 3. Next Appointments */}
      <div className="mt-2 px-4 space-y-3">
        <h2 className="text-sm font-bold text-stone-900 mb-1">Timeline</h2>
        
        {/* Appt Card 1 */}
        <div 
          data-tour-id="mobile-schedule-card-0"
          onClick={() => setSelectedAppointmentId('appt-1')}
          className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-bold text-stone-900">Emily Chen</p>
              <p className="text-xs text-stone-500 mt-0.5">Bridal Consultation</p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Arrived</span>
          </div>
          
          <div className="grid grid-cols-2 gap-y-2 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <Clock className="h-3.5 w-3.5 text-stone-400" /> 9:00 AM
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <MapPin className="h-3.5 w-3.5 text-stone-400" /> Suite A
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <Users className="h-3.5 w-3.5 text-stone-400" /> Sarah J.
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-600 truncate">
              <MessageSquare className="h-3.5 w-3.5 text-stone-400" /> Sent 2h ago
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="flex-1 bg-stone-900 text-white text-xs font-bold py-2 rounded-lg">Start Appt</button>
            <button className="flex-1 bg-stone-100 text-stone-700 text-xs font-bold py-2 rounded-lg border border-stone-200">View 360</button>
          </div>
        </div>

        {/* Appt Card 2 */}
        <div 
          onClick={() => setSelectedAppointmentId('appt-2')}
          className="bg-white border border-status-warning/20 ring-1 ring-status-warning/20 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-bold text-stone-900">Jessica Alba (VIP)</p>
              <p className="text-xs text-stone-500 mt-0.5">VIP Fitting</p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-status-warning">Unassigned</span>
          </div>
          
          <div className="grid grid-cols-2 gap-y-2 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <Clock className="h-3.5 w-3.5 text-stone-400" /> 10:00 AM
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <MapPin className="h-3.5 w-3.5 text-stone-400" /> VIP Suite
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <Users className="h-3.5 w-3.5 text-status-warning" /> Needs Staff
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="flex-1 bg-status-warning text-white text-xs font-bold py-2 rounded-lg">Assign Staff</button>
          </div>
        </div>
      </div>

      <MobileAppointment360 
        isOpen={!!selectedAppointmentId} 
        onClose={() => setSelectedAppointmentId(null)}
      />

      <MobileReassignWorkflow 
        isOpen={reassignOpen}
        onClose={() => setReassignOpen(false)}
      />
    </div>
  );
}
