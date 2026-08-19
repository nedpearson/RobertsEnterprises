import { useState } from 'react';
import { PackageX, RotateCcw, Search, Filter, Plus, ChevronRight } from 'lucide-react';
import { btnPrimary } from '@/components/vowos/ui';

interface ReturnOrder {
  id: string;
  vendor: string;
  items: number;
  value: number;
  status: 'Draft' | 'Pending Approval' | 'Shipped' | 'Refunded';
  date: string;
}

const MOCK_RETURNS: ReturnOrder[] = [
  { id: 'RTV-8042', vendor: 'Maggie Sottero', items: 3, value: 245000, status: 'Shipped', date: '2026-08-14' },
  { id: 'RTV-8043', vendor: 'Justin Alexander', items: 1, value: 85000, status: 'Draft', date: '2026-08-18' },
  { id: 'RTV-8044', vendor: 'Essense of Australia', items: 5, value: 412000, status: 'Pending Approval', date: '2026-08-19' },
];

export default function ReturnsView() {
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
  };

  const getStatusColor = (status: ReturnOrder['status']) => {
    switch (status) {
      case 'Draft': return 'bg-stone-100 text-stone-600';
      case 'Pending Approval': return 'bg-amber-100 text-amber-700';
      case 'Shipped': return 'bg-blue-100 text-blue-700';
      case 'Refunded': return 'bg-emerald-100 text-emerald-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 font-serif">Return to Vendor (RTV)</h2>
          <p className="text-sm text-stone-500">Manage defect returns, stock balancing, and sample returns.</p>
        </div>
        <button className={btnPrimary}>
          <Plus className="h-4 w-4" /> Create RTV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search RTVs by vendor or ID..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-brand-primary focus:border-brand-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
          <Filter className="h-4 w-4" /> Filter
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-stone-50/50 text-stone-500 font-medium">
              <tr>
                <th className="px-5 py-3">RTV ID</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Total Value</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date Initiated</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {MOCK_RETURNS.map((rtv) => (
                <tr key={rtv.id} className="hover:bg-stone-50/50 transition-colors cursor-pointer">
                  <td className="px-5 py-4 font-bold text-stone-900 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-stone-400" /> {rtv.id}
                  </td>
                  <td className="px-5 py-4 font-medium text-stone-700">{rtv.vendor}</td>
                  <td className="px-5 py-4 text-stone-600">{rtv.items} Gowns</td>
                  <td className="px-5 py-4 text-stone-900 font-medium">{formatCurrency(rtv.value)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(rtv.status)}`}>
                      {rtv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-stone-500">{rtv.date}</td>
                  <td className="px-5 py-4 text-right">
                    <ChevronRight className="h-4 w-4 text-stone-300 inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {MOCK_RETURNS.length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center text-stone-500">
            <PackageX className="h-8 w-8 text-stone-300 mb-3" />
            <p>No returns found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
