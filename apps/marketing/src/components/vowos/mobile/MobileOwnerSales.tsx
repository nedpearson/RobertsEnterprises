import { useState } from 'react';
import { ChevronLeft, Filter, BarChart3, TrendingUp, Calendar as CalendarIcon, Store, Tag, User } from 'lucide-react';
import { Badge } from '@vowos/design-system';
import { ViewKey } from '@/lib/navigation/navigationRegistry';

interface MobileOwnerSalesProps {
  onNavigate: (view: ViewKey) => void;
}

export default function MobileOwnerSales({ onNavigate }: MobileOwnerSalesProps) {
  const [activeTab, setActiveTab] = useState<'location' | 'brand' | 'staff'>('location');
  const [timeframe, setTimeframe] = useState<'today' | 'wtd' | 'mtd'>('mtd');

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] animate-in fade-in duration-300 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button 
            className="p-2 rounded-full hover:bg-stone-100 text-stone-500 -ml-2"
            onClick={() => onNavigate('today')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-stone-900">Sales Report</h2>
          <button className="p-2 rounded-full hover:bg-stone-100 text-stone-500 -mr-2">
            <Filter className="h-5 w-5" />
          </button>
        </div>

        {/* Timeframe Toggles */}
        <div className="flex bg-stone-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => setTimeframe('today')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              timeframe === 'today' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeframe('wtd')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              timeframe === 'wtd' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            WTD
          </button>
          <button
            onClick={() => setTimeframe('mtd')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              timeframe === 'mtd' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}
          >
            MTD
          </button>
        </div>

        {/* View Toggles */}
        <div className="flex border-b border-stone-200 -mx-4 px-4 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('location')}
            className={`whitespace-nowrap pb-3 pt-1 text-sm font-semibold transition-colors relative mr-6 ${
              activeTab === 'location' ? 'text-stone-900' : 'text-stone-400'
            }`}
          >
            <Store className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
            By Location
            {activeTab === 'location' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('brand')}
            className={`whitespace-nowrap pb-3 pt-1 text-sm font-semibold transition-colors relative mr-6 ${
              activeTab === 'brand' ? 'text-stone-900' : 'text-stone-400'
            }`}
          >
            <Tag className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
            By Brand
            {activeTab === 'brand' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`whitespace-nowrap pb-3 pt-1 text-sm font-semibold transition-colors relative ${
              activeTab === 'staff' ? 'text-stone-900' : 'text-stone-400'
            }`}
          >
            <User className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
            By Staff
            {activeTab === 'staff' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        
        {/* Summary Card */}
        <div className="bg-stone-900 text-white rounded-2xl p-5 mb-6 shadow-sm">
          <p className="text-stone-400 text-xs font-semibold mb-1 uppercase tracking-wider">Total Sales ({timeframe.toUpperCase()})</p>
          <div className="flex items-end gap-3 mb-4">
            <h2 className="text-3xl font-black tracking-tight">{timeframe === 'mtd' ? '$142,500' : timeframe === 'wtd' ? '$34,200' : '$12,450'}</h2>
            <Badge className="bg-status-success/20 text-emerald-400 border-none mb-1">+14%</Badge>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5 text-stone-300">
              <BarChart3 className="h-3.5 w-3.5" /> 42 Transactions
            </div>
            <div className="flex items-center gap-1.5 text-stone-300">
              <TrendingUp className="h-3.5 w-3.5" /> AOV $3,392
            </div>
          </div>
        </div>

        {activeTab === 'location' && (
          <div className="space-y-2 mt-4">
            <div className="flex px-3 pb-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              <div className="w-8">#</div>
              <div className="flex-1">Location</div>
              <div className="w-24 text-right">Revenue</div>
              <div className="w-16 text-right">Trend</div>
            </div>
            
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between">
              <div className="w-8 font-bold text-stone-400">1</div>
              <div className="flex-1 font-bold text-stone-900 truncate pr-2">Downtown Flagship</div>
              <div className="w-24 text-right font-bold text-stone-900">$84,200</div>
              <div className="w-16 text-right text-xs font-semibold text-status-success">+8.4%</div>
            </div>
            
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between">
              <div className="w-8 font-bold text-stone-400">2</div>
              <div className="flex-1 font-bold text-stone-900 truncate pr-2">Westside Boutique</div>
              <div className="w-24 text-right font-bold text-stone-900">$58,300</div>
              <div className="w-16 text-right text-xs font-semibold text-brand-primary">-2.1%</div>
            </div>
          </div>
        )}

        {activeTab === 'brand' && (
          <div className="space-y-2 mt-4">
            <div className="flex px-3 pb-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              <div className="w-8">#</div>
              <div className="flex-1">Designer</div>
              <div className="w-24 text-right">Revenue</div>
              <div className="w-16 text-right">Trend</div>
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
              <div className="w-8 font-bold text-stone-400 pl-2">1</div>
              <div className="flex-1 font-bold text-stone-900 truncate pr-2">Vera Wang</div>
              <div className="w-24 text-right font-bold text-stone-900">$64,000</div>
              <div className="w-16 text-right text-xs font-semibold text-status-success">+12%</div>
            </div>
            
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-status-success" />
              <div className="w-8 font-bold text-stone-400 pl-2">2</div>
              <div className="flex-1 font-bold text-stone-900 truncate pr-2">Monique Lhuillier</div>
              <div className="w-24 text-right font-bold text-stone-900">$48,200</div>
              <div className="w-16 text-right text-xs font-semibold text-status-success">+5%</div>
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-status-warning" />
              <div className="w-8 font-bold text-stone-400 pl-2">3</div>
              <div className="flex-1 font-bold text-stone-900 truncate pr-2">Pronovias</div>
              <div className="w-24 text-right font-bold text-stone-900">$30,300</div>
              <div className="w-16 text-right text-xs font-semibold text-brand-primary">-1%</div>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-2 mt-4">
            <div className="flex px-3 pb-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              <div className="w-8">#</div>
              <div className="flex-1">Stylist</div>
              <div className="w-24 text-right">Revenue</div>
              <div className="w-16 text-right">Trend</div>
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between">
              <div className="w-8 font-bold text-stone-400">1</div>
              <div className="flex-1 flex items-center gap-2 truncate pr-2">
                <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">SJ</div>
                <span className="font-bold text-stone-900 truncate">Sarah Jenkins</span>
              </div>
              <div className="w-24 text-right font-bold text-stone-900">$62,100</div>
              <div className="w-16 text-right text-xs font-semibold text-status-success">+15%</div>
            </div>
            
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between">
              <div className="w-8 font-bold text-stone-400">2</div>
              <div className="flex-1 flex items-center gap-2 truncate pr-2">
                <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-600 shrink-0">MF</div>
                <span className="font-bold text-stone-900 truncate">Megan Fox</span>
              </div>
              <div className="w-24 text-right font-bold text-stone-900">$45,300</div>
              <div className="w-16 text-right text-xs font-semibold text-status-success">+2%</div>
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between">
              <div className="w-8 font-bold text-stone-400">3</div>
              <div className="flex-1 flex items-center gap-2 truncate pr-2">
                <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-600 shrink-0">JD</div>
                <span className="font-bold text-stone-900 truncate">Jessica Davis</span>
              </div>
              <div className="w-24 text-right font-bold text-stone-900">$35,100</div>
              <div className="w-16 text-right text-xs font-semibold text-brand-primary">-5%</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
