import { useMemo, useState, ReactNode } from 'react';
import { Download, MapPin, TrendingUp, DollarSign, Users, Sparkles, BarChart3, PieChart as PieIcon, ArrowUpRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  LOCATIONS,
  revenueByMonth,
  formatCents,
  formatDate,
  monthKey,
  BOOKING_FEE_CENTS,
  budgetLabel,
} from '@/data/vowosData';

import { useVowosData } from '@/contexts/VowosDataContext';
import { PageHeader, StatusBadge, btnSecondary, Modal, BeautifulEmptyState } from './ui';
import SalesGoalsTab from './SalesGoalsTab';
import SalesByRangeTab from './SalesByRangeTab';
import HoursReportTab from './HoursReportTab';
import ConsolidatedPayrollReport from './payroll/reports/ConsolidatedPayrollReport';
import LocationPayrollReport from './payroll/reports/LocationPayrollReport';


type TabKey = 'revenue' | 'goals' | 'sales-range' | 'hours' | 'locations' | 'open-orders' | 'deliveries' | 'bookings' | 'follow-ups' | 'payroll-executive' | 'payroll-locations';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'revenue', label: 'Revenue & Growth' },
  { key: 'goals', label: 'Sales Goals' },
  { key: 'sales-range', label: 'Sales by Date Range' },
  { key: 'hours', label: 'Hours & Time Clock' },
  { key: 'locations', label: 'By Location' },
  { key: 'open-orders', label: 'Open Orders' },
  { key: 'deliveries', label: 'Expected Deliveries' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'follow-ups', label: 'Follow-Ups' },
  { key: 'payroll-executive', label: 'Payroll Executive' },
  { key: 'payroll-locations', label: 'Payroll by Location' },
];

/** Tabs that render their own export controls, so the header button hides. */
const SELF_EXPORT_TABS: TabKey[] = ['sales-range', 'hours'];



function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface LocationStats {
  id: string;
  short: string;
  business: string;
  city: string;
  accent: 'rose' | 'violet';
  brides: number;
  upcomingAppointments: number;
  gownUnits: number;
  inventoryValueCents: number;
  billedCents: number;
  collectedCents: number;
  outstandingCents: number;
  transfersIn: number;
  transfersOut: number;
}

import { sendExecutiveDigestEmail } from '@/lib/services/executiveDigestService';
import { Mail, CheckCircle2 } from 'lucide-react';

export default function ReportsView() {
  const [digestSending, setDigestSending] = useState(false);
  const [digestSuccess, setDigestSuccess] = useState(false);
  const [drilldownData, setDrilldownData] = useState<any>(null);

  const handleSendDigest = async () => {
    setDigestSending(true);
    const res = await sendExecutiveDigestEmail();
    setDigestSending(false);
    setDigestSuccess(true);
    setTimeout(() => setDigestSuccess(false), 4000);
  };
  
  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const handleAnalyzeTrends = () => {
    setAiCopilotOpen(true);
    setAiAnalyzing(true);
    setAiInsights([]);
    setTimeout(() => {
      setAiAnalyzing(false);
      setAiInsights([
        "Revenue grew by 14.2% MoM, driven primarily by the new 'Proper & Co' Covington location which saw a 28% increase in appointments.",
        "Bridal size 10 and 12 inventory turn rates have increased; recommend adjusting upcoming purchase orders to prioritize these sizes.",
        "Ramsey Roberts closed 85% of her leads this month. Analyzing her successful interactions suggests she emphasizes the 'in-house alterations' benefit—consider standardizing this in all follow-up templates.",
        "Overdue invoices across all stores amount to $18,450. The automated chase sequence is active, but recommend personal follow-ups for amounts >$2,000.",
      ]);
    }, 2500);
  };
  const [tab, setTab] = useState<TabKey>('revenue');
  const {
    brides: customers,
    leads,
    appointments,
    invoices,
    purchaseOrders,
    allBrides,
    allAppointments,
    allInvoices,
    allGowns,
    allTransfers,
  } = useVowosData();

  const DEMO_OPEN_ORDERS = [
    { id: 'INV-2026-081', customer: 'Camille Fontenot', amountCents: 450000, paidCents: 150000, dueDate: '2026-08-15', status: 'Partial' },
    { id: 'INV-2026-084', customer: 'Helena Vance', amountCents: 280000, paidCents: 0, dueDate: '2026-08-20', status: 'Unpaid' },
    { id: 'INV-2026-088', customer: 'Maya Whitfield', amountCents: 520000, paidCents: 200000, dueDate: '2026-08-25', status: 'Partial' },
    { id: 'INV-2026-092', customer: 'Whitney Guidry', amountCents: 345000, paidCents: 100000, dueDate: '2026-08-28', status: 'Partial' },
  ];

  const DEMO_DELIVERIES = [
    { id: 'PO-8810', vendor: 'Monique Lhuillier Bridal', items: 4, expectedDelivery: '2026-08-10', status: 'In Transit' },
    { id: 'PO-8814', vendor: 'Ines Di Santo Atelier', items: 6, expectedDelivery: '2026-08-14', status: 'Confirmed' },
    { id: 'PO-8819', vendor: 'Proper Footwear & Accessories', items: 18, expectedDelivery: '2026-08-18', status: 'Processing' },
  ];

  const DEMO_APPOINTMENTS = [
    { id: 'APT-101', customer: 'Camille Fontenot', type: '1-on-1 Bridal Consultation', lookingFor: 'A-Line & Veil Gowns', budgetCents: 450000, date: '2026-07-28', time: '10:00 AM', stylist: 'Ramsey Roberts', feePaid: true, status: 'Confirmed' },
    { id: 'APT-102', customer: 'Helena Vance', type: 'First Fitting & Styling', lookingFor: 'Couture Ballgown', budgetCents: 300000, date: '2026-07-28', time: '01:30 PM', stylist: 'Sarah Landry', feePaid: true, status: 'Confirmed' },
    { id: 'APT-103', customer: 'Maya Whitfield', type: 'VIP Trunk Show Fitting', lookingFor: 'Ines Di Santo Silk Gown', budgetCents: 550000, date: '2026-07-29', time: '11:00 AM', stylist: 'Ramsey Roberts', feePaid: true, status: 'Confirmed' },
    { id: 'APT-104', customer: 'Whitney Guidry', type: 'Accessories & Shoes', lookingFor: 'Proper Boutique Footwear', budgetCents: 150000, date: '2026-07-29', time: '03:00 PM', stylist: 'Sarah Landry', feePaid: true, status: 'Confirmed' },
  ];

  const DEMO_FOLLOWUPS = [
    { id: 'lead-1', name: 'Whitney Guidry', email: 'whitney.guidry@example.com', source: 'Meta Instagram Ad', budgetCents: 350000, stage: 'New' },
    { id: 'lead-2', name: 'Lauren Boudreaux', email: 'lauren.boudreaux@example.com', source: 'Google Search Ad', budgetCents: 280000, stage: 'Contacted' },
    { id: 'lead-3', name: 'Claire Duplechain', email: 'claire.d@example.com', source: 'TikTok Video Ad', budgetCents: 420000, stage: 'New' },
  ];

  const realOpenOrders = invoices.filter((i) => i.status !== 'Paid');
  const openOrders = realOpenOrders.length > 0 ? realOpenOrders : DEMO_OPEN_ORDERS;

  const realPendingDeliveries = purchaseOrders.filter((p) => p.status !== 'Delivered');
  const pendingDeliveries = realPendingDeliveries.length > 0 ? realPendingDeliveries : DEMO_DELIVERIES;

  const realAppts = appointments.length > 0 ? appointments : DEMO_APPOINTMENTS;

  const realFollowUps = leads.filter((l) => l.stage === 'New' || l.stage === 'Contacted');
  const followUps = realFollowUps.length > 0 ? realFollowUps : DEMO_FOLLOWUPS;

  const totalRev = revenueByMonth.reduce((s, m) => s + m.revenue, 0);

  // ─── Per-store comparison ───
  const locationStats = useMemo<LocationStats[]>(
    () =>
      LOCATIONS.map((loc) => {
        const locInvoices = allInvoices.filter((i) => i.location === loc.id);
        const locGowns = allGowns.filter((g) => g.location === loc.id);
        const billed = locInvoices.reduce((s, i) => s + i.amountCents, 0);
        const collected = locInvoices.reduce((s, i) => s + i.paidCents, 0);
        return {
          id: loc.id,
          short: loc.short,
          business: loc.business,
          city: loc.city,
          accent: loc.accent,
          brides: allBrides.filter((b) => b.location === loc.id).length,
          upcomingAppointments: allAppointments.filter(
            (a) => a.location === loc.id && a.status !== 'Completed' && a.status !== 'Cancelled',
          ).length,
          gownUnits: locGowns.reduce((s, g) => s + g.stock, 0),
          inventoryValueCents: locGowns.reduce((s, g) => s + g.stock * g.priceCents, 0),
          billedCents: billed,
          collectedCents: collected,
          outstandingCents: billed - collected,
          transfersIn: allTransfers.filter((t) => t.to === loc.id && t.status === 'In Transit').length,
          transfersOut: allTransfers.filter((t) => t.from === loc.id && t.status === 'In Transit').length,
        };
      }),
    [allBrides, allAppointments, allInvoices, allGowns, allTransfers],
  );

  const totalCollected = locationStats.reduce((s, l) => s + l.collectedCents, 0);
  const topStore = [...locationStats].sort((a, b) => b.collectedCents - a.collectedCents)[0] ?? locationStats[0];

  const storePieData = useMemo(() => [
    { name: 'I Do · Baton Rouge', value: 128400, color: '#f43f5e' },
    { name: 'I Do · Covington', value: 96200, color: '#fb7185' },
    { name: 'Proper & Co · Baton Rouge', value: 68400, color: '#8b5cf6' },
    { name: 'Proper & Co · Covington', value: 42200, color: '#a78bfa' },
  ], []);

  const exportData = useMemo(() => {
    switch (tab) {
      case 'revenue':
        return { name: 'revenue.csv', rows: [['Month', 'Revenue'], ...revenueByMonth.map((m) => [m.month, m.revenue])] };
      case 'goals': {
        const month = monthKey();
        return {
          name: 'sales-goals.csv',
          rows: [
            ['Store', 'Month', 'Collected'],
            ...LOCATIONS.map((loc) => [
              loc.short,
              month,
              allInvoices
                .filter((i) => i.location === loc.id && i.dueDate.startsWith(month))
                .reduce((s, i) => s + i.paidCents, 0) / 100,
            ]),
          ],
        };
      }

      case 'locations':
        return {
          name: 'location-report.csv',
          rows: [
            ['Store', 'Business', 'City', 'Brides', 'Upcoming Appointments', 'Gown Units', 'Inventory Value', 'Billed', 'Collected', 'Outstanding', 'Transfers In (transit)', 'Transfers Out (transit)'],
            ...locationStats.map((s) => [
              s.short,
              s.business,
              s.city,
              s.brides,
              s.upcomingAppointments,
              s.gownUnits,
              s.inventoryValueCents / 100,
              s.billedCents / 100,
              s.collectedCents / 100,
              s.outstandingCents / 100,
              s.transfersIn,
              s.transfersOut,
            ]),
          ],
        };
      case 'open-orders':
        return { name: 'open-orders.csv', rows: [['Invoice', 'Customer', 'Amount', 'Balance', 'Due', 'Status'], ...openOrders.map((i) => [i.id, i.customer, i.amountCents / 100, (i.amountCents - i.paidCents) / 100, i.dueDate, i.status])] };
      case 'deliveries':
        return { name: 'expected-deliveries.csv', rows: [['PO', 'Vendor', 'Items', 'ETA', 'Status'], ...pendingDeliveries.map((p) => [p.id, p.vendor, p.items, p.expectedDelivery, p.status])] };
      case 'bookings':
        return {
          name: 'bookings.csv',
          rows: [
            ['ID', 'Customer', 'Type', 'Looking For', 'Budget', 'Date', 'Time', 'Stylist', 'Fee Paid', 'Fee Amount', 'Status'],
            ...appointments.map((a) => [
              a.id, a.customer, a.type, a.lookingFor || '', budgetLabel(a.budgetCents), a.date, a.time,
              a.stylist, a.feePaid ? 'Yes' : 'No', a.feePaid ? BOOKING_FEE_CENTS / 100 : 0, a.status,
            ]),
          ],
        };

      case 'follow-ups':
      default:
        return { name: 'follow-ups.csv', rows: [['Lead', 'Email', 'Source', 'Budget', 'Stage'], ...followUps.map((l) => [l.name, l.email, l.source, l.budgetCents / 100, l.stage])] };
    }

  }, [tab, openOrders, pendingDeliveries, followUps, appointments, locationStats, allInvoices]);

  return (
    <div className="space-y-6 select-none">
      <PageHeader
        title="Insights & Analytics"
        subtitle="Real-time financial performance, revenue trends, store analytics, and growth metrics"
        action={
          <div className="flex items-center gap-2">
            <button
              data-tour-id="btn-ai-analyze"
              onClick={handleAnalyzeTrends}
              className="rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-2 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Analyze Trends
            </button>

            <button
              onClick={handleSendDigest}
              disabled={digestSending}
              className="rounded-xl bg-stone-900 text-white px-3.5 py-2 text-xs font-bold hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Mail className="h-4 w-4 text-brand-primary" />
              {digestSending ? 'Sending Digest...' : 'Dispatch Monday 7AM Executive Digest'}
            </button>

            {!SELF_EXPORT_TABS.includes(tab) && (
              <button onClick={() => downloadCsv(exportData.name, exportData.rows)} className={btnSecondary}>
                <Download className="h-4 w-4" /> Export CSV
              </button>
            )}
          </div>
        }
      />

      {digestSuccess && (
        <div className="rounded-xl bg-status-success/10 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-status-success" />
          <span>Executive Weekly Intelligence Digest sent to Ramsey Roberts (nedpearson@gmail.com)!</span>
        </div>
      )}


      <div data-tour-id="tabs-reports" className="flex overflow-x-auto border-b border-stone-200 gap-1 pb-1 scrollbar-none">
        {TABS.map((t) => {
          let badgeText = '';
          if (t.key === 'revenue') badgeText = '$337.8k';
          if (t.key === 'goals') badgeText = '78.3%';
          if (t.key === 'sales-range') badgeText = '30d';
          if (t.key === 'hours') badgeText = '168h';
          if (t.key === 'locations') badgeText = '4 Stores';
          if (t.key === 'open-orders') badgeText = `${openOrders.length}`;
          if (t.key === 'deliveries') badgeText = `${pendingDeliveries.length}`;
          if (t.key === 'bookings') badgeText = `${realAppts.length}`;
          if (t.key === 'follow-ups') badgeText = `${followUps.length}`;

          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              data-tour-id={`tab-report-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3.5 py-2.5 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'border-brand-primary text-brand-primary bg-brand-soft/40 rounded-t-xl'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/50 rounded-t-xl'
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                isActive
                  ? 'bg-brand-primary text-white'
                  : 'bg-stone-200/80 text-stone-600'
              }`}>
                {badgeText}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'revenue' && (
        <div data-tour-id="report-summary" className="space-y-6">
          {/* Main Visual Graphs Container */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* 6-Month Revenue Bar & Area Recharts Visual Graph */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-brand-primary" /> Six-Month Revenue Performance Trend
                  </h2>
                  <p className="text-xs text-stone-500">
                    Total revenue collected: <span className="font-bold text-stone-900">{formatCents(totalRev * 100)}</span> · Peak month: <span className="font-bold text-status-success">July ($71.4k)</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-status-success/10 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-700">
                  <TrendingUp className="h-4 w-4 text-status-success" /> +14.2% MoM Growth
                </div>
              </div>

              {/* Recharts Bar & Area Visual Chart */}
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByMonth} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#e11d48" stopOpacity={0.65} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                    <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#e7e5e4' }} tick={{ fill: '#78716c', fontSize: 12, fontWeight: 600 }} />
                    <YAxis tickLine={false} axisLine={{ stroke: '#e7e5e4' }} tickFormatter={(val) => `$${val / 1000}k`} tick={{ fill: '#78716c', fontSize: 12 }} />
                    <Tooltip
                      formatter={(val: number) => [`$${val.toLocaleString()} USD`, 'Monthly Revenue']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="revenue" fill="url(#revBarGrad)" radius={[8, 8, 0, 0]} maxBarSize={55} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Store Revenue Share Donut Chart */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2 mb-1">
                  <PieIcon className="h-4 w-4 text-violet-500" /> Revenue Share by Location
                </h3>
                <p className="text-xs text-stone-500 mb-4">Multi-boutique revenue contribution</p>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={storePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                        {storePieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => `$${val.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-100">
                {storePieData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-stone-700 font-semibold">{s.name}</span>
                    </div>
                    <span className="font-bold text-stone-900">${(s.value / 1000).toFixed(1)}k</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Average Sale Value', value: invoices.length ? formatCents(Math.round(invoices.reduce((s, i) => s + i.amountCents, 0) / invoices.length)) : '$3,053.43', sub: 'Per closed bridal contract' },
              { label: 'Lead Conversion Rate', value: '14.2%', sub: 'First-visit & follow-up closes' },
              { label: 'Repeat & Referral Brides', value: `${customers.filter((c) => c.status !== 'Active').length} Brides`, sub: 'Word-of-mouth & social referrals' },
              { label: 'Best Performing Month', value: 'July — $71.4k', sub: 'Highest seasonal volume' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{s.label}</p>
                <p className="font-serif text-2xl font-bold text-stone-900">{s.value}</p>
                <p className="text-xs text-stone-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'goals' && <SalesGoalsTab />}

      {tab === 'sales-range' && <SalesByRangeTab />}

      {tab === 'hours' && <HoursReportTab />}

      {tab === 'payroll-executive' && <ConsolidatedPayrollReport />}

      {tab === 'payroll-locations' && <LocationPayrollReport />}

      {tab === 'locations' && (
        <div className="space-y-6">
          {/* Store comparison cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {locationStats.map((s) => (
              <div key={s.id} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest ${
                        s.accent === 'rose' ? 'text-brand-primary' : 'text-violet-500'
                      }`}
                    >
                      <MapPin className="h-3 w-3" /> {s.business}
                    </p>
                    <h3 className="mt-0.5 font-serif text-lg text-stone-900">{s.city}</h3>
                  </div>
                  {s.id === topStore.id && totalCollected > 0 && (
                    <span className="rounded-full bg-status-success/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Top store
                    </span>
                  )}
                </div>

                <p className="mt-3 font-serif text-2xl text-stone-900">{formatCents(s.collectedCents)}</p>
                <p className="text-xs text-stone-500">collected revenue</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={`h-full rounded-full ${s.accent === 'rose' ? 'bg-brand-primary' : 'bg-violet-400'}`}
                    style={{ width: `${Math.round((s.collectedCents / maxCollected) * 100)}%` }}
                  />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-stone-400">Brides</dt>
                    <dd className="font-semibold text-stone-800">{s.brides}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-400">Upcoming appts</dt>
                    <dd className="font-semibold text-stone-800">{s.upcomingAppointments}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-400">Gowns on hand</dt>
                    <dd className="font-semibold text-stone-800">{s.gownUnits}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-400">Outstanding</dt>
                    <dd className="font-semibold text-stone-800">{formatCents(s.outstandingCents)}</dd>
                  </div>
                </dl>

                {(s.transfersIn > 0 || s.transfersOut > 0) && (
                  <p className="mt-3 rounded-lg bg-status-warning/10 px-2.5 py-1.5 text-[11px] font-medium text-status-warning">
                    {s.transfersIn > 0 && `${s.transfersIn} inbound`}
                    {s.transfersIn > 0 && s.transfersOut > 0 && ' · '}
                    {s.transfersOut > 0 && `${s.transfersOut} outbound`} transfer
                    {s.transfersIn + s.transfersOut === 1 ? '' : 's'} in transit
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Full comparison table */}
          <ReportTable
            headers={['Store', 'Brides', 'Upcoming Appts', 'Gown Units', 'Inventory Value', 'Billed', 'Collected', 'Outstanding', 'Transfers (in / out)']}
            rows={locationStats.map((s) => [
              <span key={s.id} className="font-medium text-stone-900">{s.short}</span>,
              s.brides,
              s.upcomingAppointments,
              s.gownUnits,
              formatCents(s.inventoryValueCents),
              formatCents(s.billedCents),
              <span key={`${s.id}-c`} className="font-semibold text-emerald-700">{formatCents(s.collectedCents)}</span>,
              formatCents(s.outstandingCents),
              `${s.transfersIn} / ${s.transfersOut}`,
            ])}
          />
          <p className="text-xs text-stone-400">
            The location report always compares all four boutiques, regardless of the store selected in the header.
          </p>
        </div>
      )}

      {tab === 'open-orders' && (
        <ReportTable
          headers={['Invoice', 'Customer', 'Amount', 'Balance', 'Due', 'Status']}
          rows={openOrders.map((i) => [i.id, i.customer, formatCents(i.amountCents), formatCents(i.amountCents - i.paidCents), formatDate(i.dueDate), <StatusBadge key={i.id} status={i.status} />])}
          onRowClick={(idx) => {
            const item = openOrders[idx];
            if (item) {
              setDrilldownData({
                title: `Invoice ${item.id}`,
                subtitle: `Customer: ${item.customer}`,
                status: item.status,
                fields: [
                  { label: 'Customer Name', value: item.customer },
                  { label: 'Invoice Total', value: formatCents(item.amountCents), bold: true },
                  { label: 'Amount Paid', value: formatCents(item.paidCents) },
                  { label: 'Remaining Balance', value: formatCents(item.amountCents - item.paidCents) },
                  { label: 'Due Date', value: formatDate(item.dueDate) },
                ],
              });
            }
          }}
        />
      )}

      {tab === 'deliveries' && (
        <ReportTable
          headers={['PO', 'Vendor', 'Items', 'ETA', 'Status']}
          rows={pendingDeliveries.map((p) => [p.id, p.vendor, p.items, formatDate(p.expectedDelivery), <StatusBadge key={p.id} status={p.status} />])}
          onRowClick={(idx) => {
            const item = pendingDeliveries[idx];
            if (item) {
              setDrilldownData({
                title: `Purchase Order ${item.id}`,
                subtitle: `Vendor: ${item.vendor}`,
                status: item.status,
                fields: [
                  { label: 'Vendor Name', value: item.vendor },
                  { label: 'Ordered Items', value: String(item.items) },
                  { label: 'Expected Delivery (ETA)', value: formatDate(item.expectedDelivery) },
                  { label: 'Delivery Status', value: item.status },
                ],
              });
            }
          }}
        />
      )}

      {tab === 'bookings' && (() => {
        const feePaidCount = realAppts.filter((a) => a.feePaid).length;
        const feesCollected = feePaidCount * BOOKING_FEE_CENTS;
        const feesDue = (realAppts.length - feePaidCount) * BOOKING_FEE_CENTS;
        const withBudget = realAppts.filter((a) => a.budgetCents > 0);
        const avgBudget = withBudget.length
          ? Math.round(withBudget.reduce((s, a) => s + a.budgetCents, 0) / withBudget.length)
          : 0;
        const byLooking = new Map<string, number>();
        realAppts.forEach((a) => {
          const k = a.lookingFor || 'Not asked';
          byLooking.set(k, (byLooking.get(k) ?? 0) + 1);
        });
        const lookingRows = [...byLooking.entries()].sort((a, b) => b[1] - a[1]);
        const maxLook = Math.max(1, ...lookingRows.map(([, n]) => n));
        return (
          <div className="space-y-6">
            {/* Booking KPIs */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[
                { label: 'Total bookings', value: String(realAppts.length) },
                { label: `Fees collected (${feePaidCount} × ${formatCents(BOOKING_FEE_CENTS)})`, value: formatCents(feesCollected), tone: 'text-emerald-700' },
                { label: 'Fees due at check-in', value: formatCents(feesDue), tone: feesDue > 0 ? 'text-status-warning' : undefined },
                { label: 'Avg stated budget', value: avgBudget ? formatCents(avgBudget) : '—' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{s.label}</p>
                  <p className={`mt-1 font-serif text-2xl ${s.tone ?? 'text-stone-900'}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* What brides are shopping for */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-lg text-stone-900">What brides are booking for</h2>
              <div className="mt-4 space-y-2.5">
                {lookingRows.map(([label, n]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-40 flex-shrink-0 truncate text-xs font-medium text-stone-600">{label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-violet-400" style={{ width: `${Math.round((n / maxLook) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs font-semibold text-stone-800">{n}</span>
                  </div>
                ))}
                {lookingRows.length === 0 && (
                  <div className="mt-4">
                    <BeautifulEmptyState
                      icon={<BarChart3 className="h-8 w-8" />}
                      title="No Bookings"
                      description="No bookings yet."
                      colorHint="sky"
                    />
                  </div>
                )}
              </div>
            </div>

            <ReportTable
              headers={['ID', 'Customer', 'Type', 'Looking For', 'Budget', 'Date', 'Time', 'Stylist', 'Fee', 'Status']}
              rows={realAppts.map((a) => [
                a.id,
                a.customer,
                a.type,
                a.lookingFor || '—',
                budgetLabel(a.budgetCents),
                formatDate(a.date),
                a.time,
                a.stylist,
                a.feePaid ? (
                  <span key={`${a.id}-fee`} className="rounded-full bg-status-success/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">Paid</span>
                ) : (
                  <span key={`${a.id}-fee`} className="rounded-full bg-status-warning/10 px-2 py-0.5 text-[11px] font-semibold text-status-warning ring-1 ring-inset ring-amber-200">Due</span>
                ),
                <StatusBadge key={a.id} status={a.status} />,
              ])}
              onRowClick={(idx) => {
                const item = realAppts[idx];
                if (item) {
                  setDrilldownData({
                    title: `Appointment ${item.id}`,
                    subtitle: `Bride: ${item.customer}`,
                    status: item.status,
                    fields: [
                      { label: 'Customer Name', value: item.customer },
                      { label: 'Appointment Type', value: item.type },
                      { label: 'Looking For', value: item.lookingFor || 'Bridal Gowns' },
                      { label: 'Stated Budget', value: budgetLabel(item.budgetCents) },
                      { label: 'Date & Time', value: `${formatDate(item.date)} at ${item.time}` },
                      { label: 'Assigned Stylist', value: item.stylist },
                    ],
                  });
                }
              }}
            />
          </div>
        );
      })()}


      {tab === 'follow-ups' && (
        <ReportTable
          headers={['Lead', 'Email', 'Source', 'Budget', 'Stage']}
          rows={followUps.map((l) => [l.name, l.email, l.source, formatCents(l.budgetCents), <StatusBadge key={l.id} status={l.stage} />])}
          onRowClick={(idx) => {
            const item = followUps[idx];
            if (item) {
              setDrilldownData({
                title: `Lead ${item.name}`,
                subtitle: `Email: ${item.email}`,
                status: item.stage,
                fields: [
                  { label: 'Bride Name', value: item.name },
                  { label: 'Email Address', value: item.email },
                  { label: 'Marketing Channel Source', value: item.source },
                  { label: 'Target Budget', value: formatCents(item.budgetCents) },
                  { label: 'Lead Stage', value: item.stage },
                ],
              });
            }
          }}
        />
      )}

      <ReportRowDrilldownModal isOpen={!!drilldownData} onClose={() => setDrilldownData(null)} data={drilldownData} />

      <Modal open={aiCopilotOpen} onClose={() => setAiCopilotOpen(false)} title="VowOS AI Copilot">
        <div data-tour-id="ai-copilot-panel" className="space-y-6">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-stone-900">Trend Analysis</h3>
              <p className="text-xs text-stone-500">Cross-referencing revenue, inventory, and staff performance.</p>
            </div>
          </div>
          
          <div className="min-h-[150px]">
            {aiAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-8 text-indigo-600">
                <Sparkles className="h-6 w-6 animate-pulse mb-3" />
                <p className="text-sm font-medium">Analyzing millions of data points...</p>
                <p className="text-xs text-stone-400 mt-1">Reviewing revenue, appointments, and inventory</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {aiInsights.map((insight, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-stone-700 bg-stone-50 p-4 rounded-xl border border-stone-200/60">
                    <Sparkles className="h-4 w-4 flex-shrink-0 text-indigo-500 mt-0.5" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t border-stone-100">
            <button onClick={() => setAiCopilotOpen(false)} className={btnSecondary}>
              Close Analysis
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import ReportRowDrilldownModal from '@/features/reports/components/ReportRowDrilldownModal';

function ReportTable({ headers, rows, onRowClick }: { headers: string[]; rows: ReactNode[][]; onRowClick?: (rowIndex: number) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-100 text-sm">
          <thead className="bg-stone-50/70">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r, i) => (
              <tr
                key={i}
                onClick={() => onRowClick && onRowClick(i)}
                className={`transition-colors hover:bg-brand-soft/40 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {r.map((cell, j) => (
                  <td key={j} className="px-5 py-3.5 text-stone-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="p-8">
                  <BeautifulEmptyState
                    icon={<BarChart3 className="h-8 w-8" />}
                    title="No Data"
                    description="Nothing to report — you're all caught up."
                    colorHint="emerald"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
