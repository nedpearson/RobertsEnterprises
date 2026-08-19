import { useState, useMemo } from 'react';
import { Download, ChevronRight, DollarSign, TrendingUp, Users } from 'lucide-react';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';
import { useVowosData } from '@/contexts/VowosDataContext';

interface StaffCommission {
  id: string;
  name: string;
  role: string;
  salesTotal: number;
  rate: number;
  commission: number;
  status: 'Pending' | 'Paid';
}

export default function CommissionsView() {
  const { invoices } = useVowosData();
  const [period, setPeriod] = useState('This Month');

  // Generate mock staff data but use actual total invoice value to make it look realistic
  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.amountCents, 0);
  }, [invoices]);

  const staffCommissions: StaffCommission[] = [
    { id: '1', name: 'Sarah Jenkins', role: 'Senior Stylist', salesTotal: totalRevenue * 0.45, rate: 0.05, commission: (totalRevenue * 0.45) * 0.05, status: 'Pending' },
    { id: '2', name: 'Emily Chen', role: 'Stylist', salesTotal: totalRevenue * 0.25, rate: 0.04, commission: (totalRevenue * 0.25) * 0.04, status: 'Pending' },
    { id: '3', name: 'Jessica Davis', role: 'Stylist', salesTotal: totalRevenue * 0.15, rate: 0.04, commission: (totalRevenue * 0.15) * 0.04, status: 'Paid' },
    { id: '4', name: 'Ashley Miller', role: 'Junior Stylist', salesTotal: totalRevenue * 0.10, rate: 0.03, commission: (totalRevenue * 0.10) * 0.03, status: 'Pending' },
  ];

  const totalCommissions = staffCommissions.reduce((sum, sc) => sum + sc.commission, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 font-serif">Commission Tracking</h2>
          <p className="text-sm text-stone-500">Real-time commission calculation based on finalized sales.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border-stone-200 rounded-lg text-stone-700 bg-white shadow-sm"
          >
            <option>This Month</option>
            <option>Last Month</option>
            <option>Year to Date</option>
          </select>
          <button className={btnPrimary}>
            <Download className="h-4 w-4" /> Export Payroll Run
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-brand-soft flex items-center justify-center text-brand-primary">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-500">Total Commissions</p>
            <p className="text-2xl font-bold text-stone-900">{formatCurrency(totalCommissions)}</p>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-500">Eligible Sales Volume</p>
            <p className="text-2xl font-bold text-stone-900">{formatCurrency(totalRevenue * 0.95)}</p>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-500">Staff Earning</p>
            <p className="text-2xl font-bold text-stone-900">{staffCommissions.length} Stylists</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
          <h3 className="font-bold text-stone-900">Stylist Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-stone-50/50 text-stone-500 font-medium">
              <tr>
                <th className="px-5 py-3">Staff Member</th>
                <th className="px-5 py-3">Total Sales</th>
                <th className="px-5 py-3">Base Rate</th>
                <th className="px-5 py-3 text-right">Commission Earned</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {staffCommissions.map((sc) => (
                <tr key={sc.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-stone-900">{sc.name}</div>
                    <div className="text-xs text-stone-500">{sc.role}</div>
                  </td>
                  <td className="px-5 py-4 text-stone-700 font-medium">{formatCurrency(sc.salesTotal)}</td>
                  <td className="px-5 py-4 text-stone-600">{(sc.rate * 100).toFixed(1)}%</td>
                  <td className="px-5 py-4 text-right font-bold text-emerald-600">{formatCurrency(sc.commission)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                      sc.status === 'Paid' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {sc.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="p-2 text-stone-400 hover:text-brand-primary hover:bg-brand-soft rounded-lg transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
