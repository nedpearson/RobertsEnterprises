import { useState, useMemo } from 'react';
import { Download, ChevronRight, DollarSign, TrendingUp, Users } from 'lucide-react';
import { btnPrimary } from '@/components/vowos/ui';
import { useVowosData } from '@/contexts/VowosDataContext';
import { teamMembers } from '@/data/vowosData';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Staff360Modal from '@/components/vowos/Staff360Modal';
import { OrganizationRole } from '@/lib/auth/roles';

interface StaffCommission {
  id: string;
  name: string;
  role: string;
  orgRole: OrganizationRole;
  salesTotal: number;
  rate: number;
  commission: number;
  status: 'Pending' | 'Paid';
  created_at: string;
}

export default function CommissionsView() {
  const { allInvoices, allBrides } = useVowosData();
  const [period, setPeriod] = useState<'This Month' | 'Last Month' | 'Year to Date'>('This Month');
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; name: string; role: OrganizationRole; created_at: string } | null>(null);

  // Filter invoices by selected period
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return allInvoices.filter((inv) => {
      const rawDate = (inv as any).date || inv.dueDate || (inv as any).created_at;
      if (!rawDate) return true;
      const invDate = new Date(rawDate);
      if (isNaN(invDate.getTime())) return true;

      if (period === 'This Month') {
        return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth;
      } else if (period === 'Last Month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return invDate.getFullYear() === lastMonthYear && invDate.getMonth() === lastMonth;
      } else {
        // Year to Date
        return invDate.getFullYear() === currentYear;
      }
    });
  }, [allInvoices, period]);

  // Compute live commission breakdown per team member
  const staffCommissions: StaffCommission[] = useMemo(() => {
    const stylistNames = Array.from(
      new Set([
        ...teamMembers,
        ...allBrides.map((b) => b.stylist).filter(Boolean),
      ])
    );

    return stylistNames.map((staffName, idx) => {
      const staffNameLower = staffName.toLowerCase().trim();

      // Find brides associated with this stylist
      const assignedBrides = allBrides.filter(
        (b) => b.stylist && b.stylist.toLowerCase().trim() === staffNameLower
      );
      const assignedNames = new Set(assignedBrides.map((b) => b.name.toLowerCase().trim()));

      // Invoices matching assigned brides or direct customer match
      const matchingInvoices = filteredInvoices.filter(
        (inv) => assignedNames.has(inv.customer.toLowerCase().trim())
      );

      const invoiceSales = matchingInvoices.reduce((sum, inv) => sum + (inv.paidCents || inv.amountCents), 0);
      const brideSpendSales = period === 'Year to Date' 
        ? assignedBrides.reduce((sum, b) => sum + (b.spendCents || 0), 0)
        : 0;

      const salesTotal = Math.max(invoiceSales, brideSpendSales);

      // Base commission rate based on title/role
      const isSenior = idx === 0 || staffNameLower.includes('dana') || staffNameLower.includes('sarah');
      const roleTitle = isSenior ? 'Senior Stylist' : 'Bridal Consultant';
      const rate = isSenior ? 0.05 : 0.04;

      const commission = Math.round(salesTotal * rate);
      const status: 'Pending' | 'Paid' = period === 'Last Month' ? 'Paid' : 'Pending';

      const orgRole: OrganizationRole = isSenior ? OrganizationRole.MANAGER : OrganizationRole.EMPLOYEE;

      return {
        id: `staff-${idx + 1}`,
        name: staffName,
        role: roleTitle,
        orgRole,
        salesTotal,
        rate,
        commission,
        status,
        created_at: '2025-01-15T00:00:00.000Z',
      };
    });
  }, [allBrides, filteredInvoices, period]);

  const totalRevenue = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.paidCents || inv.amountCents), 0);
  }, [filteredInvoices]);

  const totalCommissions = useMemo(() => {
    return staffCommissions.reduce((sum, sc) => sum + sc.commission, 0);
  }, [staffCommissions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
  };

  const handleExportPayrollRun = async () => {
    try {
      const headers = ['Staff Member', 'Role', 'Sales Total ($)', 'Base Rate (%)', 'Commission Earned ($)', 'Status', 'Period', 'Exported At'];
      const rows = staffCommissions.map((sc) => [
        `"${sc.name}"`,
        `"${sc.role}"`,
        (sc.salesTotal / 100).toFixed(2),
        (sc.rate * 100).toFixed(1),
        (sc.commission / 100).toFixed(2),
        `"${sc.status}"`,
        `"${period}"`,
        `"${new Date().toISOString()}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll-run-${period.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Audit log entry in Supabase
      try {
        await supabase.from('audit_logs').insert({
          action: 'export_payroll_run',
          category: 'payroll',
          details: { period, staffCount: staffCommissions.length, totalCommissions },
          created_at: new Date().toISOString(),
        });
      } catch {
        // non-blocking
      }

      toast.success(`Payroll run for ${period} exported successfully`);
    } catch (err: any) {
      toast.error('Failed to export payroll run: ' + err.message);
    }
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
            onChange={(e) => setPeriod(e.target.value as any)}
            className="text-sm border-stone-200 rounded-lg text-stone-700 bg-white shadow-sm"
          >
            <option>This Month</option>
            <option>Last Month</option>
            <option>Year to Date</option>
          </select>
          <button onClick={handleExportPayrollRun} className={btnPrimary}>
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
            <p className="text-2xl font-bold text-stone-900">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-500">Staff Earning</p>
            <p className="text-2xl font-bold text-stone-900">{staffCommissions.filter(s => s.salesTotal > 0).length || staffCommissions.length} Stylists</p>
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
                <tr 
                  key={sc.id} 
                  onClick={() => setSelectedStaff({ id: sc.id, name: sc.name, role: sc.orgRole, created_at: sc.created_at })}
                  className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                >
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStaff({ id: sc.id, name: sc.name, role: sc.orgRole, created_at: sc.created_at });
                      }}
                      className="p-2 text-stone-400 hover:text-brand-primary hover:bg-brand-soft rounded-lg transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStaff && (
        <Staff360Modal staff={selectedStaff} onClose={() => setSelectedStaff(null)} />
      )}
    </div>
  );
}
