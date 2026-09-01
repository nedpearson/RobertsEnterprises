import React, { useState } from 'react';
import { DollarSign, Users, CalendarDays, Shirt, ArrowRight, ExternalLink, PackageSearch, UserCheck, Calendar, Clock, CheckCircle2, ChevronRight, BarChart2, Sparkles } from 'lucide-react';
import { formatCents, formatDate, HERO_IMAGE, Appointment, PurchaseOrder, Gown, Customer, Invoice } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { StatCard, StatusBadge, Modal, btnPrimary, btnSecondary } from './ui';
import { ViewKey } from './Sidebar';
import { getTenantDisplayName, useAuth } from '@/contexts/AuthContext';
import BridalIdentity from './BridalIdentity';
import NeedsAttention from './NeedsAttention';
import { SpeedToLeadWidget } from './growth/SpeedToLeadWidget';
import { useModuleResolution } from '@/lib/modules/resolver';

export default function DashboardView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const { session, profile, tenant } = useAuth();
  const { resolveFeatureAvailability } = useModuleResolution();
  const { brides: customers, leads, invoices, appointments, purchaseOrders, gowns } = useVowosData();

  // Drilldown Modal States
  const [drillModal, setDrillModal] = useState<'revenue' | 'outstanding' | 'brides' | 'gowns' | 'month' | 'appointment' | 'po' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<{ month: string; year: number; monthKey: string; revenueCents: number; invoices: Invoice[] } | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  const totalRevenue = invoices.reduce((s, i) => s + i.paidCents, 0);
  const outstandingInvoices = invoices.filter((i) => i.amountCents - i.paidCents > 0);
  const outstanding = outstandingInvoices.reduce((s, i) => s + (i.amountCents - i.paidCents), 0);
  const upcoming = appointments.filter((a) => a.status !== 'Completed').slice(0, 5);
  const activeCustomers = customers.filter((customer) => customer.status === 'Active');
  const inStockGowns = gowns.filter((gown) => gown.stock > 0);

  // Dynamic Reporting Reconciliation: compute actual revenue from invoices instead of fake analytics
  const dynamicRevenueByMonth = React.useMemo(() => {
    const months = new Map<string, { month: string; year: number; monthKey: string; revenueCents: number; invoices: Invoice[] }>();
    const now = new Date();
    // Initialize last 6 months to 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.set(monthKey, {
        month: d.toLocaleString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        monthKey,
        revenueCents: 0,
        invoices: [],
      });
    }
    
    invoices.forEach(inv => {
      if (inv.paidCents > 0 && ((inv as any).date || (inv as any).dueDate)) {
        // Fallback for missing date in mock structure (invoices have dueDate, perhaps date is not guaranteed, but they are mapped)
        const d = new Date(inv.dueDate || Date.now()); 
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const month = months.get(monthKey);
        if (month) {
          month.revenueCents += inv.paidCents;
          month.invoices.push(inv);
        }
      }
    });

    return Array.from(months.values());
  }, [invoices]);

  const maxRev = Math.max(1, ...dynamicRevenueByMonth.map((m) => m.revenueCents));
  const watchList = purchaseOrders.filter((p) => p.status !== 'Delivered');

  const firstName = profile?.name?.split(' ')[0];
  const organizationName = getTenantDisplayName(tenant);
  const greeting = session && firstName ? `Good evening, ${firstName}` : `Welcome to ${organizationName}`;
  const openLeads = leads.filter((lead) => !['closed', 'lost', 'converted'].includes(lead.stage.toLowerCase())).length;

  const handleOpenMonth = (m: { month: string; year: number; monthKey: string; revenueCents: number; invoices: Invoice[] }) => {
    setSelectedMonth(m);
    setDrillModal('month');
  };

  const handleOpenAppt = (a: Appointment) => {
    setSelectedAppt(a);
    setDrillModal('appointment');
  };

  const handleOpenPo = (p: PurchaseOrder) => {
    setSelectedPo(p);
    setDrillModal('po');
  };

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div data-tour-id="hero-banner" className="relative overflow-hidden rounded-3xl shadow-lg">
        <img src={HERO_IMAGE} alt={`${organizationName} workspace`} className="h-52 w-full object-cover sm:h-60" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1c1a1f]/90 via-[#1c1a1f]/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-rose-300">
            {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
          </p>
          <h1 className="mt-2 max-w-lg font-serif text-3xl leading-tight text-white sm:text-4xl">
            {greeting}
          </h1>

          <p className="mt-2 max-w-md text-sm text-stone-300">
            {upcoming.length} appointments this week · {watchList.length} orders in transit
          </p>
          <button
            onClick={() => onNavigate('appointments')}
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            View schedule <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Speed-to-Lead Alert Widget */}
      {resolveFeatureAvailability('growth.leads').effective && (
        <SpeedToLeadWidget onNavigate={onNavigate} />
      )}

      {/* KPI cards with explicit drilldown click triggers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          dataTourId="stat-revenue"
          label="Revenue Collected"
          value={formatCents(totalRevenue)}
          sub="Fiscal YTD · Tap for itemized drilldown"
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
          onClick={() => setDrillModal('revenue')}
        />
        <StatCard
          dataTourId="stat-outstanding"
          label="Outstanding Balance"
          value={formatCents(outstanding)}
          sub={`${outstandingInvoices.length} open invoices · Tap for ledger`}
          icon={<DollarSign className="h-5 w-5" />}
          accent="amber"
          onClick={() => setDrillModal('outstanding')}
        />
        <StatCard
          dataTourId="stat-brides"
          label="Active Brides"
          value={String(activeCustomers.length)}
          sub={`${activeCustomers.length} shopping now · Tap for CRM roster`}
          icon={<Users className="h-5 w-5" />}
          accent="rose"
          onClick={() => setDrillModal('brides')}
        />
        <StatCard
          dataTourId="stat-gowns"
          label="Gowns In Stock"
          value={String(gowns.reduce((s, g) => s + g.stock, 0))}
          sub={`${gowns.filter((g) => g.status === 'Low Stock').length} low-stock styles · Tap for inventory`}
          icon={<Shirt className="h-5 w-5" />}
          accent="violet"
          onClick={() => setDrillModal('gowns')}
        />
      </div>

      {/* Daily Lead Quick Access Panel */}
      <div className="rounded-2xl border border-stone-200/80 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/70 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-brand-primary p-2 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900">Daily Lead Execution &amp; SLA Shortcuts</h2>
              <p className="text-xs text-stone-500">Fast access to active lead queues in Growth &amp; Marketing</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('growth')}
            className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-border-subtle shadow-2xs"
          >
            Open Lead Pipeline <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {[
            { label: 'Open Leads', count: openLeads, bg: 'bg-white', text: 'text-stone-900', border: 'border-stone-200', tag: 'Live' },
            { label: 'New Leads', count: leads.filter((lead) => lead.stage.toLowerCase() === 'new').length, bg: 'bg-brand-soft', text: 'text-brand-secondary', border: 'border-border-subtle', tag: 'New' },
            { label: 'Qualified Leads', count: leads.filter((lead) => lead.stage.toLowerCase() === 'qualified').length, bg: 'bg-status-warning/10', text: 'text-amber-800', border: 'border-status-warning/20', tag: 'Qualified' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate('growth')}
              className={`flex flex-col justify-between p-3 rounded-xl border ${item.bg} ${item.border} hover:shadow-xs transition-all text-left group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">{item.tag}</span>
                <span className={`text-sm font-extrabold ${item.text}`}>{item.count}</span>
              </div>
              <p className="text-xs font-bold text-stone-800 group-hover:text-brand-primary transition-colors mt-2">{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Revenue chart with Month-level Drilldowns */}
        <div data-tour-id="chart-revenue" className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm xl:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg text-stone-900">Monthly Revenue</h2>
              <p className="text-xs text-stone-500">Tap any month bar to drill down into transactions</p>
            </div>
            <button onClick={() => onNavigate('reports')} className="text-sm font-medium text-brand-primary hover:text-brand-primary">
              Full report
            </button>
          </div>
          <div className="flex h-48 items-end gap-3 sm:gap-5">
            {dynamicRevenueByMonth.map((m) => (
              <div
                key={m.month}
                onClick={() => handleOpenMonth(m)}
                className="group flex flex-1 cursor-pointer flex-col items-center gap-2"
                title={`View ${m.month} ${m.year} revenue (${formatCents(m.revenueCents)})`}
              >
                <span className="text-xs font-semibold text-brand-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {formatCents(m.revenueCents)}
                </span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-rose-500 to-rose-300 transition-all group-hover:from-rose-600 group-hover:to-rose-400 group-hover:scale-105"
                  style={{ height: `${Math.max(2, (m.revenueCents / maxRev) * 100)}%` }}
                />
                <span className="text-xs font-semibold text-stone-600 group-hover:text-brand-primary">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="xl:col-span-2 h-full min-h-[400px]">
          <NeedsAttention />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Upcoming appointments with Drilldown on item click */}
        <div data-tour-id="list-upcoming-appts" className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg text-stone-900">Upcoming Appointments</h2>
            <CalendarDays className="h-5 w-5 text-stone-400" />
          </div>
          <ul className="divide-y divide-stone-100">
            {upcoming.map((a) => {
              const matchedBride = customers.find((c) => c.name.toLowerCase() === a.customer.toLowerCase());
              return (
                <li
                  key={a.id}
                  onClick={() => handleOpenAppt(a)}
                  className="flex items-center gap-3 py-3 cursor-pointer rounded-xl px-2 transition-colors hover:bg-brand-soft/50"
                  title="Click to drill down into appointment details"
                >
                  <BridalIdentity
                    customer={matchedBride || { name: a.customer }}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-800 hover:text-brand-primary">{a.customer}</p>
                    <p className="text-xs text-stone-500">
                      {a.type} · {formatDate(a.date)} at {a.time}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              );
            })}
          </ul>
          <button
            onClick={() => onNavigate('appointments')}
            className="mt-2 w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            View all appointments
          </button>
        </div>
      {/* Delivery watch with PO Drilldown */}
      <div data-tour-id="grid-delivery-watch" className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm xl:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg text-stone-900">Delivery Watch</h2>
            <p className="text-xs text-stone-500">Tap any PO to drill down into status &amp; assigned customer</p>
          </div>
          <button onClick={() => onNavigate('inventory')} className="text-sm font-medium text-brand-primary hover:text-brand-primary">
            All purchase orders
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {watchList.slice(0, 4).map((po) => (
            <div
              key={po.id}
              onClick={() => handleOpenPo(po)}
              className="rounded-xl border border-stone-100 bg-stone-50/60 p-4 cursor-pointer transition-all hover:bg-white hover:border-rose-300 hover:shadow-sm"
              title="Click to drill down into PO details"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-stone-500">{po.id}</p>
                <StatusBadge status={po.status} />
              </div>
              <p className="mt-2 truncate text-sm font-medium text-stone-800">{po.items}</p>
              <p className="mt-1 text-xs text-stone-500">
                {po.vendor} · ETA {formatDate(po.expectedDelivery)}
              </p>
            </div>
          ))}
        </div>
      </div>
      </div>
      {/* --- DRILLDOWN MODAL 1: REVENUE COLLECTED --- */}
      <Modal open={drillModal === 'revenue'} onClose={() => setDrillModal(null)} title="Revenue Collected Drilldown (Fiscal YTD)">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-status-success/10 p-4 border border-emerald-200">
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Revenue Received</p>
              <p className="font-serif text-2xl font-bold text-emerald-900">{formatCents(totalRevenue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-status-success" />
          </div>

          <p className="text-xs font-semibold text-stone-700">Itemized Paid Invoices ({invoices.filter(i => i.paidCents > 0).length}):</p>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {invoices.every((invoice) => invoice.paidCents <= 0) && <p className="rounded-xl border border-dashed border-stone-200 p-5 text-center text-sm text-stone-500">No collected invoice payments for the selected locations.</p>}
            {invoices.filter(i => i.paidCents > 0).map((inv) => (
              <div
                key={inv.id}
                onClick={() => {
                  sessionStorage.setItem('vowos_target_invoice_id', inv.id);
                  setDrillModal(null);
                  onNavigate('sales');
                }}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-xs cursor-pointer hover:border-emerald-300 hover:bg-status-success/10/40 transition-all group"
              >
                <div>
                  <p className="font-bold text-stone-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                    {inv.id} · {(inv as any).brideName || (inv as any).customer} <ChevronRight className="h-3.5 w-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                  <p className="text-stone-500">Paid: {formatDate((inv as any).date || (inv as any).dueDate)} · Status: {inv.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700">{formatCents(inv.paidCents)}</p>
                  <span className="text-[10px] text-stone-400">Collected</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-100">
            <button onClick={() => { setDrillModal(null); onNavigate('sales'); }} className={btnPrimary}>
              Go to Invoices &amp; Ledger POS <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* --- DRILLDOWN MODAL 2: OUTSTANDING BALANCE --- */}
      <Modal open={drillModal === 'outstanding'} onClose={() => setDrillModal(null)} title="Outstanding Balances Ledger Drilldown">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-status-warning/10 p-4 border border-status-warning/20">
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Total Uncollected Balance</p>
              <p className="font-serif text-2xl font-bold text-amber-900">{formatCents(outstanding)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-status-warning" />
          </div>

          <p className="text-xs font-semibold text-stone-700">Open &amp; Partial Invoices Requiring Payment ({outstandingInvoices.length}):</p>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {outstandingInvoices.length === 0 && <p className="rounded-xl border border-dashed border-stone-200 p-5 text-center text-sm text-stone-500">No outstanding balances for the selected locations.</p>}
            {outstandingInvoices.map((inv) => {
              const rem = inv.amountCents - inv.paidCents;
              return (
                <div
                  key={inv.id}
                  onClick={() => {
                    sessionStorage.setItem('vowos_target_invoice_id', inv.id);
                    setDrillModal(null);
                    onNavigate('sales');
                  }}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-xs cursor-pointer hover:border-rose-300 hover:bg-brand-soft/40 transition-all group"
                >
                  <div>
                    <p className="font-bold text-stone-900 group-hover:text-brand-primary transition-colors flex items-center gap-1.5">
                      {inv.id} · {(inv as any).brideName || (inv as any).customer} <ChevronRight className="h-3.5 w-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                    <p className="text-stone-500">Total: {formatCents(inv.amountCents)} · Paid: {formatCents(inv.paidCents)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-primary">{formatCents(rem)}</p>
                    <span className="text-[10px] text-stone-400">Balance Due</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-100">
            <button onClick={() => { setDrillModal(null); onNavigate('sales'); }} className={btnPrimary}>
              Open POS Payment Station <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* --- DRILLDOWN MODAL 3: ACTIVE BRIDES --- */}
      <Modal open={drillModal === 'brides'} onClose={() => setDrillModal(null)} title="Active Brides Roster Drilldown">
        <div className="space-y-4">
          <p className="text-xs text-stone-500">Currently active customers in the wedding pipeline ({activeCustomers.length} total) — Click any customer to open their 360 profile:</p>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {activeCustomers.length === 0 && <p className="rounded-xl border border-dashed border-stone-200 p-5 text-center text-sm text-stone-500">No active customers for the selected locations.</p>}
            {activeCustomers.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  sessionStorage.setItem('vowos_target_bride_id', c.id);
                  setDrillModal(null);
                  onNavigate('customers');
                }}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-xs cursor-pointer hover:border-brand-primary hover:bg-brand-soft/50 transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <BridalIdentity customer={c} size="sm" />
                  <div>
                    <p className="font-bold text-stone-900 group-hover:text-brand-primary transition-colors flex items-center gap-1.5">
                      {c.name} <ChevronRight className="h-3.5 w-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                    <p className="text-stone-500">Wedding: {formatDate(c.weddingDate)} · Stylist: {c.stylist}</p>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-100">
            <button onClick={() => { setDrillModal(null); onNavigate('customers'); }} className={btnPrimary}>
              Open Bridal CRM &amp; Fit Profiles <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* --- DRILLDOWN MODAL 4: GOWNS IN STOCK --- */}
      <Modal open={drillModal === 'gowns'} onClose={() => setDrillModal(null)} title="Sample Gowns Inventory Drilldown">
        <div className="space-y-4">
          <p className="text-xs text-stone-500">Floor samples and available stock ({inStockGowns.length} styles) — Click any gown to open its inventory record:</p>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {inStockGowns.length === 0 && <p className="rounded-xl border border-dashed border-stone-200 p-5 text-center text-sm text-stone-500">No in-stock gowns for the selected locations.</p>}
            {inStockGowns.map((g) => (
              <div
                key={g.id}
                onClick={() => {
                  sessionStorage.setItem('vowos_target_gown_id', g.id);
                  setDrillModal(null);
                  onNavigate('inventory');
                }}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-xs cursor-pointer hover:border-brand-primary hover:bg-brand-soft/50 transition-all group"
              >
                <div>
                  <p className="font-bold text-stone-900 group-hover:text-brand-primary transition-colors flex items-center gap-1.5">
                    {g.name} <ChevronRight className="h-3.5 w-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                  <p className="text-stone-500">{g.designer} · Sample Sz {(g as any).sampleSize || (g as any).size || '10'} · Color: {g.color}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-stone-900">{formatCents((g as any).retailCents || (g as any).priceCents || 0)}</p>
                  <span className={`inline-block text-[10px] font-bold ${g.stock < 2 ? 'text-status-warning' : 'text-status-success'}`}>
                    Stock: {g.stock}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-100">
            <button onClick={() => { setDrillModal(null); onNavigate('inventory'); }} className={btnPrimary}>
              Open Inventory Management <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* --- DRILLDOWN MODAL 5: MONTHLY REVENUE --- */}
      {selectedMonth && (
        <Modal open={drillModal === 'month'} onClose={() => setDrillModal(null)} title={`${selectedMonth.month} ${selectedMonth.year} Revenue Details`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-brand-soft p-4 border border-border-subtle">
              <div>
                <p className="text-xs font-semibold text-brand-secondary uppercase tracking-wider">{selectedMonth.month} Total Revenue</p>
                <p className="font-serif text-2xl font-bold text-brand-secondary">{formatCents(selectedMonth.revenueCents)}</p>
              </div>
              <BarChart2 className="h-8 w-8 text-brand-primary" />
            </div>

            <div className="rounded-xl border border-stone-200 p-3 bg-stone-50 text-xs space-y-1">
              <p className="font-semibold text-stone-800">Recorded monthly performance:</p>
              <p className="text-stone-600">Paid invoices: {selectedMonth.invoices.length}</p>
              <p className="text-stone-600">Average collected per invoice: {formatCents(selectedMonth.invoices.length ? Math.round(selectedMonth.revenueCents / selectedMonth.invoices.length) : 0)}</p>
              <p className="text-stone-600">Reporting period: {selectedMonth.monthKey}</p>
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button onClick={() => { setDrillModal(null); onNavigate('reports'); }} className={btnPrimary}>
                Open Comprehensive Reports <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- DRILLDOWN MODAL 6: APPOINTMENT DETAILS --- */}
      {selectedAppt && (
        <Modal open={drillModal === 'appointment'} onClose={() => setDrillModal(null)} title={`Appointment Drilldown: ${selectedAppt.customer}`}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-stone-50 p-4 border border-stone-200">
              <div>
                <p className="font-bold text-stone-900 text-sm">{selectedAppt.customer}</p>
                <p className="text-stone-500">{selectedAppt.type} · Room: {(selectedAppt as any).room || 'Fitting Suite A'}</p>
              </div>
              <StatusBadge status={selectedAppt.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-stone-200 p-3">
                <span className="text-stone-400 font-semibold uppercase text-[10px]">Date &amp; Time</span>
                <p className="font-bold text-stone-800 mt-1">{formatDate(selectedAppt.date)} at {selectedAppt.time}</p>
              </div>
              <div className="rounded-xl border border-stone-200 p-3">
                <span className="text-stone-400 font-semibold uppercase text-[10px]">Assigned Stylist</span>
                <p className="font-bold text-stone-800 mt-1">{selectedAppt.stylist}</p>
              </div>
            </div>

            {((selectedAppt as any).notes || (selectedAppt as any).note) && (
              <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                <span className="text-stone-400 font-semibold uppercase text-[10px]">Stylist Notes</span>
                <p className="text-stone-700 mt-1">{(selectedAppt as any).notes || (selectedAppt as any).note}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button onClick={() => { setDrillModal(null); onNavigate('appointments'); }} className={btnPrimary}>
                View Full Calendar Roster <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- DRILLDOWN MODAL 7: PURCHASE ORDER DETAILS --- */}
      {selectedPo && (
        <Modal open={drillModal === 'po'} onClose={() => setDrillModal(null)} title={`Purchase Order Drilldown: ${selectedPo.id}`}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-stone-50 p-4 border border-stone-200">
              <div>
                <p className="font-bold text-stone-900 text-sm">{selectedPo.id} · {selectedPo.vendor}</p>
                <p className="text-stone-500">{selectedPo.items}</p>
              </div>
              <StatusBadge status={selectedPo.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-stone-200 p-3">
                <span className="text-stone-400 font-semibold uppercase text-[10px]">Wholesale Cost</span>
                <p className="font-bold text-stone-800 mt-1">{formatCents(selectedPo.amountCents)}</p>
              </div>
              <div className="rounded-xl border border-stone-200 p-3">
                <span className="text-stone-400 font-semibold uppercase text-[10px]">Expected Arrival ETA</span>
                <p className="font-bold text-stone-800 mt-1">{formatDate(selectedPo.expectedDelivery)}</p>
              </div>
            </div>

            {selectedPo.assignedCustomer && (
              <div className="rounded-xl border border-border-subtle p-3 bg-brand-soft/50">
                <span className="text-brand-primary font-semibold uppercase text-[10px]">Linked Customer Bride</span>
                <p className="font-bold text-brand-secondary mt-1">{selectedPo.assignedCustomer}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button onClick={() => { setDrillModal(null); onNavigate('inventory'); }} className={btnPrimary}>
                Open Designer Portals Vault <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
