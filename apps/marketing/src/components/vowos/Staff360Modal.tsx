import { Modal } from './ui';
import { User, Calendar, DollarSign, Target, Clock, TrendingUp } from 'lucide-react';
import { StaffRole, ROLE_BADGE_CLASSES } from '@/contexts/AuthContext';
import { formatCents } from '@/data/vowosData';
import { useEffect, useState } from 'react';
import { resolveEffectiveSetting, DEFAULT_COMMISSION_SETTINGS, CommissionSettings } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

interface StaffRow {
  id: string;
  name: string;
  role: StaffRole;
  created_at: string;
}

interface Staff360ModalProps {
  staff: StaffRow;
  onClose: () => void;
}

export default function Staff360Modal({ staff, onClose }: Staff360ModalProps) {
  // Simulated analytics data for demonstration
  const shifts = [
    { date: 'Today', hours: 8, location: 'Baton Rouge' },
    { date: 'Yesterday', hours: 7.5, location: 'Baton Rouge' },
    { date: 'Jul 24', hours: 8, location: 'Covington' },
  ];

  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings | null>(null);

  useEffect(() => {
    const dataPlane = getActiveDataPlane();
    resolveEffectiveSetting<CommissionSettings>(
      'commission_settings',
      'commission_settings',
      { dataPlane },
      { plans: [] }
    ).then(res => setCommissionSettings(res.value)).catch(console.error);
  }, []);

  const ytdSales = 450000 * 20; // Simulated $90k sales
  const activePlan = commissionSettings?.plans.find(p => p.active) || null;
  const rate = activePlan?.designerRates['All'] ?? activePlan?.ratePct ?? 10;
  let ytdCommissions = Math.round(ytdSales * (rate / 100));
  if (activePlan && activePlan.bonusThresholdCents > 0 && ytdSales >= activePlan.bonusThresholdCents) {
    ytdCommissions += activePlan.bonusAmountCents;
  }

  const ytdTips = 320050; // $3,200.50
  const conversionRate = 68; // 68%

  return (
    <Modal open={true} onClose={onClose} title="Staff 360 Drilldown" maxWidth="max-w-4xl">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Profile & Performance */}
        <div className="flex-1 space-y-6">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center border-2 border-stone-200">
              <User className="h-8 w-8 text-stone-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-stone-900">{staff.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGE_CLASSES[staff.role]}`}>
                  {staff.role}
                </span>
                <span className="text-xs text-stone-500">Joined {new Date(staff.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-5 shadow-sm">
            <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-4 text-sm">
              <Target className="h-4 w-4 text-violet-500" /> Performance Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white border border-stone-200 p-4">
                 <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Conversion Rate</p>
                 <div className="flex items-baseline gap-2">
                   <p className="text-2xl font-black text-violet-700">{conversionRate}%</p>
                   <span className="text-[10px] font-bold text-status-success flex items-center"><TrendingUp className="h-3 w-3 mr-0.5" /> +2%</span>
                 </div>
                 <p className="text-[10px] text-stone-400 mt-1">Appointments to Sales</p>
              </div>
              <div className="rounded-xl bg-white border border-stone-200 p-4">
                 <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg Ticket Size</p>
                 <p className="text-xl font-bold text-stone-900">{formatCents(450000)}</p>
                 <p className="text-[10px] text-stone-400 mt-1">YTD Average</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payroll & Attendance */}
        <div className="w-full md:w-[360px] space-y-6">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-4 text-sm">
              <DollarSign className="h-4 w-4 text-status-success" /> YTD Earnings
            </h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <p className="text-sm font-medium text-stone-600">Commissions {activePlan && <span className="text-xs text-stone-400">({activePlan.name})</span>}</p>
                 <p className="font-bold text-status-success">{formatCents(ytdCommissions)}</p>
               </div>
               <div className="flex items-center justify-between">
                 <p className="text-sm font-medium text-stone-600">Tips Collected</p>
                 <p className="font-bold text-stone-900">{formatCents(ytdTips)}</p>
               </div>
               <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                 <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Total Variable</p>
                 <p className="font-black text-stone-900">{formatCents(ytdCommissions + ytdTips)}</p>
               </div>
            </div>
          </div>
          
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-4 text-sm">
              <Calendar className="h-4 w-4 text-sky-500" /> Recent Shifts
            </h3>
            <div className="space-y-2">
              {shifts.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-stone-50 p-2.5 border border-stone-100">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    <div>
                      <p className="text-xs font-bold text-stone-900">{s.date}</p>
                      <p className="text-[10px] text-stone-500">{s.location}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-stone-700">{s.hours} hrs</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}
