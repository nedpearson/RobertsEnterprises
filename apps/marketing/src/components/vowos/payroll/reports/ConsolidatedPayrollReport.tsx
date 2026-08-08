import { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getOfficialPayrollPeriods, OfficialPayrollPeriod } from '@/lib/services/workforceStore';

export default function ConsolidatedPayrollReport() {
  const [periods, setPeriods] = useState<OfficialPayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOfficialPayrollPeriods().then(p => {
      // Sort chronologically by start date
      setPeriods(p.sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-stone-500">Loading payroll data...</div>;
  }

  // Aggregate data per month for the chart
  const monthlyData: Record<string, { month: string, gross: number, employerTax: number, net: number }> = {};
  
  periods.forEach(p => {
    if (p.status !== 'posted' && p.status !== 'reconciled' && p.status !== 'provider_submitted') return;
    const month = p.startDate.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { month, gross: 0, employerTax: 0, net: 0 };
    }
    
    // We assume totalEmployerCostCents is Gross + EmployerTaxes
    const gross = (p.totalGrossCents || 0) / 100;
    const net = (p.totalNetCents || 0) / 100;
    const totalCost = (p.totalEmployerCostCents || 0) / 100;
    const employerTax = totalCost > gross ? totalCost - gross : 0;
    
    monthlyData[month].gross += gross;
    monthlyData[month].employerTax += employerTax;
    monthlyData[month].net += net;
  });

  const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  const totalGrossYear = chartData.reduce((s, d) => s + d.gross, 0);
  const totalCostYear = chartData.reduce((s, d) => s + (d.gross + d.employerTax), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Employer Liability (YTD)</p>
          <p className="font-serif text-2xl font-bold text-stone-900">${totalCostYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Gross Wages (YTD)</p>
          <p className="font-serif text-2xl font-bold text-stone-900">${totalGrossYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Average Payroll Runs / Mo</p>
          <p className="font-serif text-2xl font-bold text-stone-900">{chartData.length > 0 ? (periods.length / chartData.length).toFixed(1) : 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-stone-900 mb-4">Payroll Liabilities Trend</h3>
        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#e7e5e4' }} tick={{ fill: '#78716c', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={{ stroke: '#e7e5e4' }} tickFormatter={(val) => `$${val / 1000}k`} tick={{ fill: '#78716c', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <Legend />
                <Area type="monotone" dataKey="gross" stroke="#f43f5e" fillOpacity={1} fill="url(#colorGross)" name="Gross Wages" />
                <Area type="monotone" dataKey="net" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorNet)" name="Net Pay" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex flex-col items-center justify-center text-stone-400 text-sm">
            No posted payroll data available.
          </div>
        )}
      </div>
    </div>
  );
}
