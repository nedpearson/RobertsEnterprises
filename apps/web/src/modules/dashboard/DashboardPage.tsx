import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card, CardHeader, CardBody } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { PageHeader } from '../../design-system/PageHeader';
import { StatusBadge } from '../../design-system/StatusBadge';

interface Insight {
  id: number;
  insight_text: string;
  type: string;
}

interface OpsSummary {
  alterations_open: number;
  transfers_in_transit: number;
  payroll_unpaid_hours: number;
  chat_messages: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [opsSummary, setOpsSummary] = useState<OpsSummary | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesData, opsData, insightsData, summaryData] = await Promise.all([
        api.get<any>('/api/invoices').catch(() => ({ invoices: [] })),
        api.get<any>('/api/operations').catch(() => ({ purchases: [], pickups: [], appointments: [] })),
        api.get<any>('/api/analytics/insights').catch(() => ({ insights: [] })),
        api.get<any>('/api/ops/summary').catch(() => null),
      ]);

      setInvoices(invoicesData?.invoices || []);
      setPurchases(opsData?.purchases || []);
      setPickups(opsData?.pickups || []);
      setAppointments(opsData?.appointments || []);
      setInsights(insightsData?.insights || []);
      setOpsSummary(summaryData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const unpaidTotal = invoices.reduce((sum: number, inv: any) => sum + (inv.balance_due_cents || 0) / 100, 0);

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Command Center"
        subtitle="Operational overview and critical tasks"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="elevated" className="hover:border-rose-500/30 transition-all cursor-pointer">
          <CardBody className="p-5">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500">Overdue Balances</span>
              <StatusBadge status="error" label="High Risk" />
            </div>
            <div className="text-3xl font-bold mt-2 text-gray-900">${unpaidTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-gray-400 mt-1">Across {invoices.length} active invoices</div>
          </CardBody>
        </Card>

        <Card variant="elevated" className="hover:border-rose-500/30 transition-all cursor-pointer">
          <CardBody className="p-5">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500">Late Vendor Shipments</span>
              <StatusBadge status="pending" label="Watch" />
            </div>
            <div className="text-3xl font-bold mt-2 text-gray-900">{purchases.filter(p => p.status === 'Late').length}</div>
            <div className="text-xs text-gray-400 mt-1">POs past expected ETA</div>
          </CardBody>
        </Card>

        <Card variant="elevated" className="hover:border-rose-500/30 transition-all cursor-pointer">
          <CardBody className="p-5">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500">Pickup Backlog</span>
              <StatusBadge status="success" label="Good" />
            </div>
            <div className="text-3xl font-bold mt-2 text-gray-900">{pickups.filter(p => p.qa_verified).length}</div>
            <div className="text-xs text-gray-400 mt-1">QA passed & ready in Vault</div>
          </CardBody>
        </Card>

        <Card variant="elevated" className="hover:border-rose-500/30 transition-all cursor-pointer">
          <CardBody className="p-5">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500">Fitting Appointments</span>
              <StatusBadge status="active" label="Today" />
            </div>
            <div className="text-3xl font-bold mt-2 text-gray-900">{appointments.length}</div>
            <div className="text-xs text-gray-400 mt-1">Fitting slots booked today</div>
          </CardBody>
        </Card>
      </div>

      {/* Operational Stats & AI Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ops Summary */}
        <Card className="col-span-1">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Operations Summary</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Alterations Queue</span>
              <span className="font-semibold text-gray-900">{opsSummary?.alterations_open || 0} Open</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Transfers In-Transit</span>
              <span className="font-semibold text-gray-900">{opsSummary?.transfers_in_transit || 0} Active</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Staff Payroll Approvals</span>
              <span className="font-semibold text-gray-900">{opsSummary?.payroll_unpaid_hours || 0} Hours</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Team Chat Notifications</span>
              <span className="font-semibold text-gray-900">{opsSummary?.chat_messages || 0} Unread</span>
            </div>
          </CardBody>
        </Card>

        {/* AI Insight Engine */}
        <Card className="col-span-2">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">AI Agent Insight Engine</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            {insights.length === 0 ? (
              <p className="text-sm text-gray-500">No active AI suggestions or anomalies identified.</p>
            ) : (
              insights.map(insight => (
                <div key={insight.id} className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl flex gap-3 items-start">
                  <span className="text-xl">✨</span>
                  <div>
                    <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">{insight.type}</div>
                    <p className="text-sm text-gray-700 mt-1">{insight.insight_text}</p>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
