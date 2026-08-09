import { useState } from 'react';
import { CalendarDays, Users, LayoutList, ChevronLeft, ChevronRight, UserMinus } from 'lucide-react';
import { ViewKey } from '@/lib/navigation/navigationRegistry';

import MobileAppointment360 from './MobileAppointment360';
import MobileReassignWorkflow from './MobileReassignWorkflow';

interface MobileManagerScheduleProps {
  onNavigate: (view: ViewKey) => void;
}

export default function MobileManagerSchedule({ onNavigate }: MobileManagerScheduleProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'staff' | 'coverage'>('agenda');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] animate-in fade-in duration-300 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button className="p-2 rounded-full hover:bg-stone-100 text-stone-500">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-stone-900">Today</h2>
            <p className="text-xs text-stone-500">Thursday, August 6</p>
          </div>
          <button className="p-2 rounded-full hover:bg-stone-100 text-stone-500">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* View Toggles */}
        <div className="flex bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'agenda' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" /> Agenda
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'staff' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Staff
          </button>
          <button
            onClick={() => setActiveTab('coverage')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'coverage' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Coverage
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">9:00 AM</h3>
            <div 
              className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => setSelectedAppointmentId('appt-1')}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 mb-2">Bridal Appt</span>
                  <p className="font-bold text-stone-900 text-sm">Emily Chen</p>
                  <p className="text-xs text-stone-500 mt-1">Room 1 • 9:00 AM - 10:30 AM</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600 mb-1">
                    SJ
                  </div>
                  <span className="text-[10px] text-stone-500">Sarah</span>
                </div>
              </div>
            </div>

            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2 mt-6">10:00 AM</h3>
            <div 
              className="bg-white p-4 rounded-2xl shadow-sm border border-amber-200 ring-1 ring-amber-500/20 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => setSelectedAppointmentId('appt-2')}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 mb-2">Fitting (VIP)</span>
                  <p className="font-bold text-stone-900 text-sm">Jessica Alba</p>
                  <p className="text-xs text-stone-500 mt-1">Room 3 • 10:00 AM - 11:00 AM</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-8 h-8 rounded-full border border-dashed border-rose-300 bg-rose-50 flex items-center justify-center text-rose-500 mb-1">
                    <UserMinus className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-rose-500">Unassigned</span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="mt-4 w-full bg-stone-900 text-white text-xs font-semibold py-2 rounded-lg"
              >
                Assign Staff
              </button>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-600 shrink-0">
                  SJ
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-stone-900 text-sm">Sarah Jenkins</p>
                      <p className="text-xs text-stone-500 font-medium">Master Stylist</p>
                    </div>
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Clocked In</span>
                  </div>
                  <div className="mt-2 text-xs text-stone-600 grid grid-cols-1 gap-1">
                    <p><span className="text-stone-400">Shift:</span> 8:00 AM - 4:00 PM</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-stone-50 rounded-xl p-2.5 text-center border border-stone-100">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Appts</p>
                  <p className="font-bold text-stone-900 text-lg">4</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-2.5 text-center border border-stone-100">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Capacity</p>
                  <p className="font-bold text-rose-600 text-lg">100%</p>
                </div>
              </div>
            </div>

            <div className="bg-rose-50 p-4 rounded-2xl shadow-sm border border-rose-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-700 shrink-0">
                  MF
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-rose-900 text-sm">Megan Fox</p>
                      <p className="text-xs text-rose-700 font-medium">Bridal Stylist</p>
                    </div>
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-800">Callout (Sick)</span>
                  </div>
                  <div className="mt-2 text-xs text-rose-700 grid grid-cols-1 gap-1">
                    <p><span className="text-rose-400">Shift:</span> 9:00 AM - 5:00 PM</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/50 rounded-xl p-2.5 text-center border border-rose-100">
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">Appts</p>
                  <p className="font-bold text-rose-900 text-lg">2</p>
                </div>
                <div className="bg-white/50 rounded-xl p-2.5 text-center border border-rose-100">
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">Capacity</p>
                  <p className="font-bold text-rose-600 text-lg">0%</p>
                </div>
              </div>
              <button 
                onClick={() => setReassignOpen(true)}
                className="w-full bg-white text-rose-600 border border-rose-200 text-xs font-bold py-2 rounded-xl transition-colors active:bg-rose-50"
              >
                Reassign 2 Appointments
              </button>
            </div>
          </div>
        )}

        {activeTab === 'coverage' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <h3 className="text-sm font-bold text-stone-900 mb-4">Floor Coverage</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-500">Bridal Stylists</span>
                    <span className="font-bold text-stone-900">3 / 4</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-3/4 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-500">Master Fitters</span>
                    <span className="font-bold text-rose-600">0 / 2</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-[10%] rounded-full"></div>
                  </div>
                  <p className="text-[10px] text-rose-500 mt-1">Warning: No Master Fitters currently clocked in.</p>
                </div>
              </div>
            </div>
          </div>
        )}
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
