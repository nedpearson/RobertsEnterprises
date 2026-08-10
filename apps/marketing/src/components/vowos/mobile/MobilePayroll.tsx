import { useState, useEffect } from 'react';
import { ViewKey } from '@/lib/navigation/navigationRegistry';
import { useAuth } from '@/contexts/AuthContext';
import { useVowosData } from '@/contexts/VowosDataContext';
import { 
  getTimeEntries, 
  getTimeEntrySegments, 
  TimeEntry, 
  TimeEntrySegment, 
  getOfficialPayrollPeriods, 
  OfficialPayrollPeriod 
} from '@/lib/services/workforceStore';
import { AlertTriangle, Clock, Calendar, CheckCircle, CreditCard, ChevronRight, BarChart3, Users, DollarSign, Wallet } from 'lucide-react';
import { StatCard } from '../ui';

interface MobilePayrollProps {
  onNavigate: (view: ViewKey) => void;
}

export default function MobilePayroll({ onNavigate }: MobilePayrollProps) {
  const { profile } = useAuth();
  const { activeLocation } = useVowosData();
  
  const [punches, setPunches] = useState<TimeEntry[]>([]);
  const [segments, setSegments] = useState<TimeEntrySegment[]>([]);
  const [periods, setPeriods] = useState<OfficialPayrollPeriod[]>([]);
  
  useEffect(() => {
    Promise.all([
      getTimeEntries(),
      getTimeEntrySegments(),
      getOfficialPayrollPeriods()
    ]).then(([p, s, pp]) => {
      setPunches(p);
      setSegments(s);
      setPeriods(pp);
    });
  }, []);

  if (!profile) return null;

  // 1. Manager View: Focus on Operations, Timecards, Exceptions
  if (profile.role === 'Manager') {
    // Managers only see their active location's punches
    const locationPunches = punches.filter(p => p.originalLocationId === activeLocation || activeLocation === 'all');
    
    // Simple exception logic for mobile
    const missingPunches = locationPunches.filter(p => !p.clockOut && p.status === 'in_progress' && (new Date().getTime() - new Date(p.clockIn).getTime() > 16 * 3600000));
    const pendingApproval = locationPunches.filter(p => p.clockOut && !p.approved && p.status !== 'voided');

    return (
      <div className="space-y-4 pb-20">
        <div className="bg-white p-4 border-b border-stone-200">
          <h2 className="text-xl font-serif text-stone-900">Shift & Timecard Operations</h2>
          <p className="text-xs text-stone-500">Manage punches and resolve exceptions for your team.</p>
        </div>

        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-status-warning/10 border border-status-warning/20 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm">
                <AlertTriangle className="h-6 w-6 text-status-warning mb-1" />
                <span className="text-2xl font-bold text-stone-900">{missingPunches.length}</span>
                <span className="text-[10px] font-semibold uppercase text-stone-500">Missing Punches</span>
             </div>
             <div className="bg-status-info/10 border border-blue-200 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm">
                <CheckCircle className="h-6 w-6 text-status-info mb-1" />
                <span className="text-2xl font-bold text-stone-900">{pendingApproval.length}</span>
                <span className="text-[10px] font-semibold uppercase text-stone-500">To Approve</span>
             </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="font-semibold text-sm text-stone-800">Action Required</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {missingPunches.slice(0, 3).map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{p.employeeName}</div>
                    <div className="text-xs text-brand-primary flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Missing Clock Out</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              ))}
              {pendingApproval.slice(0, 3).map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{p.employeeName}</div>
                    <div className="text-xs text-status-info flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Pending Approval</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              ))}
              {missingPunches.length === 0 && pendingApproval.length === 0 && (
                <div className="p-6 text-center text-stone-500 text-sm">
                  All timecards are up to date!
                </div>
              )}
            </div>
          </div>
          
          <button onClick={() => onNavigate('payroll')} className="w-full py-3 bg-white border border-stone-200 rounded-xl shadow-sm text-sm font-semibold text-stone-700 flex justify-center items-center gap-2">
             <Calendar className="w-4 h-4" /> Open Full Command Center
          </button>
        </div>
      </div>
    );
  }

  // 2. Owner View: Focus on High-Level Financials, Variances, and Processing
  const sortedPeriods = [...periods].sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());
  const lastPeriod = sortedPeriods[0];
  const pendingPunches = punches.filter(p => !p.approved && p.clockOut);

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 p-5 text-white shadow-md">
        <h2 className="text-xl font-serif">Payroll Command</h2>
        <p className="text-xs text-stone-300 mb-4">Executive summary across all locations</p>
        
        <div className="bg-white/10 rounded-xl p-4 border border-white/20 backdrop-blur-sm">
          <div className="text-xs text-stone-300 uppercase tracking-wider font-semibold mb-1">Last Payroll Run</div>
          {lastPeriod ? (
             <>
               <div className="text-2xl font-bold">${((lastPeriod.totalGrossCents || 0) / 100).toLocaleString()}</div>
               <div className="flex justify-between items-center mt-2">
                 <div className="text-xs text-stone-400">{lastPeriod.name}</div>
                 <div className="text-xs font-semibold bg-status-success/20 text-emerald-300 px-2 py-0.5 rounded-full">{lastPeriod.status}</div>
               </div>
             </>
          ) : (
            <div className="text-sm">No historical runs.</div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-2">
        
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1 mb-1"><Users className="w-3 h-3"/> Exceptions</div>
              <div className="text-xl font-bold text-stone-900">{pendingPunches.length}</div>
           </div>
           <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1 mb-1"><BarChart3 className="w-3 h-3"/> Labor %</div>
              <div className="text-xl font-bold text-stone-900">22.4%</div>
           </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-stone-800">Current Period Readiness</h3>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full">DRAFT</span>
          </div>
          <div className="p-4 space-y-3">
             <div className="flex justify-between text-sm">
               <span className="text-stone-500">Unapproved Timecards</span>
               <span className="font-semibold text-brand-primary">{pendingPunches.length}</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="text-stone-500">Estimated Gross</span>
               <span className="font-semibold text-stone-900">Calculating...</span>
             </div>
             
             <button onClick={() => onNavigate('payroll')} className="w-full mt-2 py-2.5 bg-brand-primary hover:bg-brand-primary-hover rounded-lg text-white text-sm font-semibold shadow-sm flex justify-center items-center gap-2 transition-colors">
               <Wallet className="w-4 h-4" /> Go to Payroll Wizard
             </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
          <h3 className="font-semibold text-sm text-stone-800 mb-3">Location Performance</h3>
          <div className="space-y-3">
             <div className="flex justify-between text-sm border-b border-stone-100 pb-2">
               <span className="font-medium text-stone-700">BR Boutique</span>
               <span className="text-stone-500">19% Labor</span>
             </div>
             <div className="flex justify-between text-sm border-b border-stone-100 pb-2">
               <span className="font-medium text-stone-700">NOLA Boutique</span>
               <span className="text-stone-500">24% Labor</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="font-medium text-stone-700">Proper & Co.</span>
               <span className="text-stone-500">14% Labor</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
