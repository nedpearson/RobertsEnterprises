import { useMemo } from 'react';
import { DollarSign, TrendingUp, Users, Calendar, Target, ChevronRight, BarChart3, AlertCircle, MapPin, Shirt, Crown } from 'lucide-react';
import { Badge } from '@vowos/design-system';
import { ViewKey } from '@/lib/navigation/navigationRegistry';
import { useVowosData } from '@/contexts/VowosDataContext';
import { LOCATIONS, locationById } from '@/data/vowosData';

interface MobileOwnerOverviewProps {
  onNavigate: (view: ViewKey) => void;
}

export default function MobileOwnerOverview({ onNavigate }: MobileOwnerOverviewProps) {
  const { activeLocation, appointments, brides, invoices } = useVowosData();

  const currentLocation = useMemo(() => locationById(activeLocation), [activeLocation]);

  // Dynamic revenue calculation from invoices
  const todayRevenue = useMemo(() => {
    if (!invoices || invoices.length === 0) return '$12,450';
    const sumCents = invoices.reduce((acc, inv) => acc + ((inv as any).paidAmountCents || inv.amountCents || 0), 0);
    return (sumCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }, [invoices]);

  const apptCount = useMemo(() => appointments?.length || 24, [appointments]);
  
  // Real VIP Brides from context
  const vipBrides = useMemo(() => {
    if (!brides || brides.length === 0) {
      return [
        { name: 'Jessica Alba', detail: 'Fitting in 2 hours', status: 'fitting' },
        { name: 'Sophia Martinez', detail: 'Paid $5,400 balance', status: 'paid' }
      ];
    }
    return brides.slice(0, 2).map((b, idx) => ({
      name: b.name,
      detail: idx === 0 ? `Appointment: ${b.weddingDate ? 'Wedding ' + b.weddingDate : 'Bridal Styling'}` : `Stage: ${(b as any).stage || 'Attended'}`,
      status: idx === 0 ? 'fitting' : 'paid'
    }));
  }, [brides]);

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] animate-in fade-in duration-300 pb-20">
      
      {/* 5 Primary Metrics */}
      <div className="px-4 pt-4 space-y-3">
        {/* Hero Metric */}
        <div data-tour-id="mobile-kpi-revenue" className="bg-stone-900 text-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-400 text-xs font-bold uppercase tracking-wider">Today's Revenue ({currentLocation?.short || 'All Stores'})</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-black tracking-tight">{todayRevenue}</h2>
            <Badge className="bg-status-success/20 text-emerald-400 border-none mb-1">+14% to goal</Badge>
          </div>
        </div>

        {/* 4 Secondary Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col justify-between">
            <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-2">Gross Margin</span>
            <div>
              <p className="text-xl font-bold text-stone-900">68.2%</p>
              <p className="text-[10px] text-status-success font-semibold mt-0.5">+1.2% this week</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col justify-between">
            <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-2">Appointments</span>
            <div>
              <p className="text-xl font-bold text-stone-900">{apptCount}</p>
              <p className="text-[10px] text-stone-400 font-semibold mt-0.5">Across boutiques</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col justify-between">
            <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-2">Conversion</span>
            <div>
              <p className="text-xl font-bold text-stone-900">42%</p>
              <p className="text-[10px] text-brand-primary font-semibold mt-0.5">On Target</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex flex-col justify-between">
            <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-2">Labor vs Sales</span>
            <div>
              <p className="text-xl font-bold text-stone-900">14.5%</p>
              <p className="text-[10px] text-status-success font-semibold mt-0.5">Healthy</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        
        {/* Locations Requiring Attention */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-stone-400" /> Boutique Network</h3>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
            <div className="flex justify-between items-start mb-2">
              <p className="font-bold text-stone-900">{currentLocation?.business || 'I Do Bridal Couture'} — {currentLocation?.city || 'Baton Rouge'}</p>
              <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px]">Active Store</Badge>
            </div>
            <p className="text-xs text-stone-500">{currentLocation?.address || '4343 Perkins Rd, Baton Rouge, LA'}</p>
            <button 
              onClick={() => onNavigate('settings')}
              className="mt-3 w-full bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold py-2 rounded-lg transition-colors border border-stone-200"
            >
              Manage Store Settings
            </button>
          </div>
        </section>

        {/* Designer / Vendor Performance */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5"><Shirt className="h-4 w-4 text-stone-400" /> Top Designers (MTD)</h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="p-3 border-b border-stone-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-stone-900 text-sm">Monique Lhuillier</p>
                <p className="text-[10px] text-stone-500">12 units sold</p>
              </div>
              <p className="font-bold text-stone-900 text-sm">$48,500</p>
            </div>
            <div className="p-3 border-b border-stone-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-stone-900 text-sm">Galia Lahav</p>
                <p className="text-[10px] text-stone-500">8 units sold</p>
              </div>
              <p className="font-bold text-stone-900 text-sm">$32,000</p>
            </div>
            <div className="p-3 flex justify-between items-center bg-stone-50">
              <button 
                onClick={() => onNavigate('inventory')}
                className="text-xs font-bold text-stone-600 flex items-center gap-1"
              >
                View full designer report <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>

        {/* High-value Customer Activity */}
        <section data-tour-id="mobile-quick-actions">
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5"><Crown className="h-4 w-4 text-amber-500" /> VIP Activity</h3>
          </div>
          <div className="space-y-2">
            {vipBrides.map((vip, idx) => (
              <div 
                key={idx}
                onClick={() => onNavigate('crm')}
                className="bg-white rounded-2xl p-3 shadow-sm border border-stone-100 flex justify-between items-center cursor-pointer hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${vip.status === 'fitting' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {vip.status === 'fitting' ? <Crown className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{vip.name}</p>
                    <p className="text-[10px] text-stone-500">{vip.detail}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
