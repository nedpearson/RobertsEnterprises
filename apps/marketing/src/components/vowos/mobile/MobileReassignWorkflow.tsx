import { useState } from 'react';
import { X, Search, CheckCircle2, ChevronRight, AlertTriangle, User } from 'lucide-react';
import { Badge } from '@vowos/design-system';

interface MobileReassignWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileReassignWorkflow({ isOpen, onClose }: MobileReassignWorkflowProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#faf8f5] flex flex-col animate-in slide-in-from-bottom-full duration-300">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-stone-200 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">
          {step === 1 ? 'Select Appointment' : 'Assign Staff'}
        </h2>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-stone-100 text-stone-500 -mr-2"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-24">
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-status-warning/10 border border-status-warning/20 rounded-2xl p-4">
              <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4" /> 2 Appointments Need Reassignment
              </h3>
              <p className="text-sm text-status-warning">Sarah Jenkins called out sick today.</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Affected Appointments</h3>
              
              <div 
                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => setStep(2)}
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge className="bg-violet-100 text-violet-700 border-none shadow-none text-[10px]">9:00 AM • Bridal Appt</Badge>
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </div>
                <p className="font-bold text-stone-900">Emily Chen</p>
                <p className="text-xs text-brand-primary font-semibold flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" /> Needs new stylist
                </p>
              </div>

              <div 
                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => setStep(2)}
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge className="bg-amber-100 text-status-warning border-none shadow-none text-[10px]">11:30 AM • Accessory Appt</Badge>
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </div>
                <p className="font-bold text-stone-900">Sophia Martinez</p>
                <p className="text-xs text-brand-primary font-semibold flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" /> Needs new stylist
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
              <div className="flex justify-between items-start mb-1">
                <p className="font-bold text-stone-900 text-lg">Emily Chen</p>
                <span className="text-xs font-bold text-stone-500">9:00 AM</span>
              </div>
              <p className="text-sm text-stone-500">Bridal Appt • 90 mins</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input 
                type="text" 
                placeholder="Search staff..." 
                className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              />
            </div>

            <div className="space-y-6 mt-4">
              {/* Group: Best Match */}
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">AI Recommendation (Best Match)</h3>
                
                <div 
                  className={`bg-white p-4 rounded-2xl border ${selectedStaff === 'staff-1' ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-stone-200 shadow-sm'} cursor-pointer transition-all`}
                  onClick={() => setSelectedStaff('staff-1')}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600">
                        AR
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">Amanda Riley</p>
                        <p className="text-xs text-stone-500">Master Stylist</p>
                      </div>
                    </div>
                    {selectedStaff === 'staff-1' ? (
                      <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-stone-300" />
                    )}
                  </div>
                  
                  <div className="space-y-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <p className="text-xs"><span className="font-bold text-stone-700">Action:</span> Assign to Amanda</p>
                    <p className="text-xs"><span className="font-bold text-stone-700">Reason:</span> Highest conversion rate for similar VIP brides.</p>
                    <p className="text-xs"><span className="font-bold text-stone-700">Impact:</span> Balances floor load, extends Amanda's shift by 15 mins.</p>
                    <p className="text-xs"><span className="font-bold text-stone-700">Confidence:</span> High (94%)</p>
                    <p className="text-xs"><span className="font-bold text-stone-700">Approval:</span> Pre-approved</p>
                  </div>
                </div>
              </div>

              {/* Group: Same Location */}
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Same Location Alternative</h3>
                
                <div 
                  className={`bg-white p-4 rounded-2xl border ${selectedStaff === 'staff-2' ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-stone-200 shadow-sm'} cursor-pointer transition-all`}
                  onClick={() => setSelectedStaff('staff-2')}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-600">
                        JD
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">Jessica Davis</p>
                        <p className="text-xs text-stone-500">Bridal Stylist</p>
                      </div>
                    </div>
                    {selectedStaff === 'staff-2' ? (
                      <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-stone-300" />
                    )}
                  </div>
                  
                  <div className="space-y-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <p className="text-xs"><span className="font-bold text-stone-700">Action:</span> Assign to Jessica</p>
                    <p className="text-xs"><span className="font-bold text-stone-700">Reason:</span> Already clocked in and has open availability.</p>
                    <p className="text-xs"><span className="font-bold text-stone-700">Impact:</span> No overtime required, but lower VIP experience match.</p>
                    <p className="text-xs"><span className="font-bold text-stone-700">Confidence:</span> Medium (78%)</p>
                    <p className="text-xs"><span className="font-bold text-stone-700">Approval:</span> Pre-approved</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {step === 2 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
          <button 
            className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl shadow-sm disabled:opacity-50 transition-opacity"
            disabled={!selectedStaff}
            onClick={() => {
              // Finish reassignment logic
              onClose();
            }}
          >
            Confirm Reassignment
          </button>
        </div>
      )}
    </div>
  );
}
