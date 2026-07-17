import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { exportToExcel, exportToPDF, exportToWord } from './utils/exporters';
import { CalendarModule } from './CalendarModule';
import { SettingsModule } from './SettingsModule';
import { LocationsModule } from './LocationsModule';
import { PayrollModule } from './PayrollModule';
import { TeamChatModule } from './TeamChatModule';
import { VoiceModule } from './VoiceModule';
import { AppShell } from './app/AppShell';
import { AppProvider, API_BASE } from './shared/AppContext';
import type { CurrentUser } from './shared/AppContext';
import { useToast, EmptyState, PageHeader, StatusBadge } from './design-system';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { CustomersPage } from './modules/customers/CustomersPage';

// ─── Error boundary ───────────────────────────────────────────────────────────

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-danger)' }}>Something went wrong</h2>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: 13 }}>
            {this.state.error.message}
          </p>
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Employee Hub ─────────────────────────────────────────────────────────────

const EmployeeHubView = ({ users, currentUser }: { users: any[]; currentUser: any }) => {
  const { toast } = useToast();

  const handleClockIn = async () => {
    try {
      const token = localStorage.getItem('vowos_token') || '';
      const res = await fetch(`${API_BASE}/payroll/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: currentUser?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('Shift started — timecard punched.', 'success');
      } else {
        toast(data.error || 'Clock-in failed.', 'error');
      }
    } catch (e: any) {
      toast('Network error: ' + e.message, 'error');
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Employee Hub"
        description="Shift management and timecard validation"
        actions={
          <button className="btn btn-primary" onClick={handleClockIn} style={{ fontSize: 15, padding: '10px 24px' }}>
            ◎ Clock In
          </button>
        }
      />
      <div className="dashboard-scroll" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>Weekly Schedule</h3>
            {currentUser?.role === 'owner' && users?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map((u: any) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <b>{u.name}</b>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.role.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📅" title="No schedule data" description="Employee schedules will appear here when configured." />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3 style={{ marginTop: 0 }}>Quick Stats</h3>
              <EmptyState icon="📊" title="Live metrics" description="Clock in to start tracking your shift metrics." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Communication Hub ────────────────────────────────────────────────────────

const CommunicationHubView = ({ leads }: { leads: any[] }) => {
  const { toast } = useToast();
  const [msg, setMsg] = useState('');

  const handleSendSMS = async () => {
    if (!msg) return;
    try {
      const res = await fetch(`${API_BASE}/communications/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+15550000000', message: msg }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.mock ? 'SMS queued (mock mode).' : `SMS sent. SID: ${data.sid}`, 'success');
        setMsg('');
      } else {
        toast('SMS failed: ' + data.error, 'error');
      }
    } catch (e: any) {
      toast('Network error: ' + e.message, 'error');
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Communication Hub"
        description="Unified Twilio SMS, automated sequences, and follow-ups"
        actions={
          <button className="btn btn-primary" onClick={() => toast('Broadcast composer coming in Stage 3.', 'info')}>
            + Compose Broadcast
          </button>
        }
      />
      <div className="dashboard-scroll" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: 16, background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
              Active SMS Threads
            </div>
            {leads.length === 0 && <EmptyState icon="💬" title="No threads yet" />}
            {leads.slice(0, 8).map((l: any) => (
              <div key={l.id} style={{ padding: 14, borderBottom: '1px solid var(--border)', cursor: 'pointer' }} className="hover-row">
                <div style={{ fontWeight: 600, fontSize: 13 }}>{l.first_name} {l.last_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Tap to view conversation…
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15 }}>Compose Message</h3>
            <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', minHeight: 240, marginBottom: 16 }}>
              <div style={{ alignSelf: 'flex-start', background: 'white', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', maxWidth: '80%', fontSize: 14 }}>
                VowOS confirms your appointment for tomorrow at 10 AM. Reply C to confirm.
              </div>
              <div style={{ alignSelf: 'flex-end', background: 'var(--accent)', color: 'white', padding: '10px 14px', borderRadius: '14px 14px 4px 14px', maxWidth: '80%', fontSize: 14 }}>
                C. Thank you!
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text" placeholder="Type a message…" value={msg}
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendSMS()}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 24, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
              />
              <button className="btn btn-primary" onClick={handleSendSMS} style={{ borderRadius: 24, padding: '0 20px' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Reports ──────────────────────────────────────────────────────────────────

const ReportsAnalyticsView = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('financials');
  const [data, setData] = useState<any>({ financials: null, sales: null, inventory: null });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [extData, setExtData] = useState<any>({
    openOrders: null, expectedDeliveries: null, bookings: null,
    cancellations: null, didNotBuy: null, transfers: null, followUps: null,
  });
  const [extLoading, setExtLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('vowos_token') || localStorage.getItem('token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let active = true;
    const h = getAuthHeaders() as any;
    const safeFetch = (url: string) =>
      fetch(url, { headers: h }).then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText} (${url})`);
        return r.json();
      });
    Promise.all([
      safeFetch(`${API_BASE}/reports/financials`),
      safeFetch(`${API_BASE}/reports/sales`),
      safeFetch(`${API_BASE}/reports/inventory`),
    ]).then(([finRes, salRes, invRes]) => {
      if (active) { setData({ financials: finRes, sales: salRes, inventory: invRes }); setLoading(false); }
    }).catch(e => {
      if (active) { setFetchError(e.message); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const EXT_TABS = ['open-orders', 'expected-deliveries', 'bookings', 'cancellations', 'did-not-buy', 'transfers', 'follow-ups'];
    if (!EXT_TABS.includes(activeTab)) return;
    let active = true;
    setExtLoading(true);
    const h = getAuthHeaders() as any;
    const endpoints: Record<string, string> = {
      'open-orders': `${API_BASE}/reports/open-orders`,
      'expected-deliveries': `${API_BASE}/reports/expected-deliveries`,
      'bookings': `${API_BASE}/reports/bookings`,
      'cancellations': `${API_BASE}/reports/cancellations`,
      'did-not-buy': `${API_BASE}/reports/did-not-buy`,
      'transfers': `${API_BASE}/reports/transfers`,
      'follow-ups': `${API_BASE}/follow-ups`,
    };
    const keyMap: Record<string, string> = {
      'open-orders': 'openOrders', 'expected-deliveries': 'expectedDeliveries',
      'bookings': 'bookings', 'cancellations': 'cancellations',
      'did-not-buy': 'didNotBuy', 'transfers': 'transfers', 'follow-ups': 'followUps',
    };
    fetch(endpoints[activeTab], { headers: h })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => { if (active) { setExtData((prev: any) => ({ ...prev, [keyMap[activeTab]]: Array.isArray(d) ? d : [] })); setExtLoading(false); } })
      .catch(e => { if (active) { setExtData((prev: any) => ({ ...prev, [keyMap[activeTab]]: { _error: e.message } })); setExtLoading(false); } });
    return () => { active = false; };
  }, [activeTab]);

  const handleExport = (type: string) => {
    let exportData: any[] = [], cols: any[] = [], filename = '', title = '';
    const fin = data.financials;
    const salRaw = data.sales;
    const sal = Array.isArray(salRaw) ? { appointments: salRaw, leads: [] } : (salRaw || { appointments: [], leads: [] });
    const inv = data.inventory;

    if (activeTab === 'financials' && fin?.invoices) {
      filename = 'Financial_Ledger'; title = 'VowOS Financial Ledger';
      cols = [{ header: 'Invoice #', dataKey: 'id' }, { header: 'Customer', dataKey: 'customerName' }, { header: 'Total ($)', dataKey: 'totalVal' }, { header: 'Due ($)', dataKey: 'dueVal' }, { header: 'Status', dataKey: 'status' }];
      exportData = fin.invoices.map((i: any) => ({ id: i.id, customerName: `${i.first_name || ''} ${i.last_name || ''}`, totalVal: ((i.total_amount_cents || 0) / 100).toFixed(2), dueVal: ((i.balance_due_cents || 0) / 100).toFixed(2), status: String(i.status || 'open').toUpperCase() }));
    } else if (activeTab === 'sales' && sal?.appointments) {
      filename = 'Sales_Performance'; title = 'Consultant Performance';
      cols = [{ header: 'ID', dataKey: 'id' }, { header: 'Consultant', dataKey: 'consultant' }, { header: 'Customer', dataKey: 'customer' }, { header: 'Type', dataKey: 'type' }, { header: 'Time', dataKey: 'time' }];
      exportData = sal.appointments.map((a: any) => ({ id: a.id, consultant: a.consultant_name, customer: `${a.first_name || ''} ${a.last_name || ''}`, type: a.type, time: a.time_slot }));
    } else if (activeTab === 'inventory' && inv?.items) {
      filename = 'Inventory_Valuation'; title = 'Inventory Valuation';
      cols = [{ header: 'Style', dataKey: 'style' }, { header: 'Designer', dataKey: 'vendor' }, { header: 'Category', dataKey: 'category' }, { header: 'Price ($)', dataKey: 'price' }];
      exportData = inv.items.map((i: any) => ({ style: i.style_number, vendor: i.vendor_name, category: i.category, price: ((i.base_price_cents || 0) / 100).toFixed(2) }));
    } else {
      const extTabMap: Record<string, { key: string; label: string }> = {
        'open-orders': { key: 'openOrders', label: 'Open_Orders' },
        'expected-deliveries': { key: 'expectedDeliveries', label: 'Expected_Deliveries' },
        'bookings': { key: 'bookings', label: 'Bookings' },
        'cancellations': { key: 'cancellations', label: 'Cancellations' },
        'did-not-buy': { key: 'didNotBuy', label: 'Did_Not_Buy' },
        'transfers': { key: 'transfers', label: 'Transfers' },
        'follow-ups': { key: 'followUps', label: 'Follow_Ups' },
      };
      const mapped = extTabMap[activeTab];
      if (mapped) {
        const rows: any[] = Array.isArray(extData[mapped.key]) ? extData[mapped.key] : [];
        if (rows.length === 0) { toast('No data to export.', 'warning'); return; }
        filename = mapped.label; title = mapped.label.replace(/_/g, ' ');
        exportData = rows;
        cols = Object.keys(rows[0]).map(k => ({ header: k.replace(/_/g, ' '), dataKey: k }));
      }
    }

    if (!exportData.length) { toast('No data to export for this tab.', 'warning'); return; }
    if (type === 'excel') exportToExcel(exportData, filename);
    if (type === 'pdf') exportToPDF(exportData, cols, filename, title);
    if (type === 'word') exportToWord(exportData, cols, filename, title);
  };

  if (loading) return <div style={{ padding: 40 }}><EmptyState title="Loading reports…" /></div>;
  if (fetchError) return (
    <div style={{ padding: 40 }}>
      <div style={{ color: 'var(--color-danger)', background: 'var(--color-danger-soft)', padding: 20, borderRadius: 8, border: '1px solid var(--color-danger)' }}>
        <strong>Failed to load reports:</strong> {fetchError}
        <br /><small>Check that your session is active and the API is reachable.</small>
      </div>
    </div>
  );

  const fin = data.financials || { invoices: [], payments: [] };
  const salRaw = data.sales;
  const sal = Array.isArray(salRaw) ? { appointments: salRaw, leads: [] } : (salRaw || { appointments: [], leads: [] });
  const inv = data.inventory;
  const totalRev = fin.invoices.reduce((s: number, i: any) => s + (i.total_amount_cents || 0), 0) / 100;
  const totalAR  = fin.invoices.reduce((s: number, i: any) => s + (i.balance_due_cents  || 0), 0) / 100;

  const TABS = [
    ['financials','Financials'],['sales','Sales'],['inventory','Inventory'],
    ['open-orders','Open Orders'],['expected-deliveries','Expected Deliveries'],
    ['bookings','Bookings'],['cancellations','Cancellations'],
    ['did-not-buy','Did Not Buy'],['transfers','Transfers'],['follow-ups','Follow-Ups'],
  ];

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Reports"
        description="Exportable drill-down ledgers and financial performance matrices"
        actions={
          <>
            <button className="btn btn-outline" style={{ background: '#1d6f42', color: 'white', borderColor: '#1d6f42' }} onClick={() => handleExport('excel')}>Excel</button>
            <button className="btn btn-outline" style={{ background: '#d93025', color: 'white', borderColor: '#d93025' }} onClick={() => handleExport('pdf')}>PDF</button>
            <button className="btn btn-outline" style={{ background: '#2b579a', color: 'white', borderColor: '#2b579a' }} onClick={() => handleExport('word')}>Word</button>
          </>
        }
      />
      <div className="dashboard-scroll" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          {TABS.map(([key, label]) => (
            <button key={key} className="btn" style={{ fontWeight: 600, border: 'none', background: activeTab === key ? 'var(--accent)' : 'transparent', color: activeTab === key ? 'white' : 'var(--text-muted)', borderRadius: 20, padding: '7px 14px' }} onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </div>

        {activeTab === 'financials' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
              <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">Total Processed Revenue</span></div><div className="kpi-value">${totalRev.toLocaleString()}</div></div>
              <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">Total Outstanding A/R</span></div><div className="kpi-value">${totalAR.toLocaleString()}</div></div>
              <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">Processed Payments</span></div><div className="kpi-value">{fin.payments?.length ?? 0}</div></div>
            </div>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th>Invoice ID</th><th>Customer</th><th>Status</th><th>Total</th><th>Balance Due</th></tr></thead>
                <tbody>
                  {fin.invoices.map((i: any) => (
                    <tr key={i.id} className="hover-row">
                      <td style={{ fontWeight: 600 }}>INV-{String(i.id).padStart(4,'0')}</td>
                      <td>{i.first_name} {i.last_name}</td>
                      <td><StatusBadge status={i.status} size="sm" /></td>
                      <td>${((i.total_amount_cents||0)/100).toLocaleString()}</td>
                      <td style={{ color: 'var(--color-danger)', fontWeight: 600 }}>${((i.balance_due_cents||0)/100).toLocaleString()}</td>
                    </tr>
                  ))}
                  {fin.invoices.length === 0 && <tr><td colSpan={5}><EmptyState title="No invoices" /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              <div className="kpi-card" style={{ flex: 1 }}><div className="kpi-header"><span className="kpi-title">Top-of-Funnel Leads</span></div><div className="kpi-value">{sal.leads?.length ?? 0}</div></div>
              <div className="kpi-card" style={{ flex: 1 }}><div className="kpi-header"><span className="kpi-title">Consultant Bookings</span></div><div className="kpi-value">{sal.appointments?.length ?? 0}</div></div>
            </div>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th>Time Slot</th><th>Stylist</th><th>Customer</th><th>Service</th></tr></thead>
                <tbody>
                  {sal.appointments?.map((a: any) => (
                    <tr key={a.id} className="hover-row">
                      <td style={{ fontWeight: 600 }}>{a.time_slot}</td>
                      <td><span style={{ background: 'var(--bg)', padding: '3px 8px', borderRadius: 4, fontSize: 12 }}>{a.consultant_name}</span></td>
                      <td style={{ fontWeight: 600 }}>{a.first_name} {a.last_name}</td>
                      <td>{a.type}</td>
                    </tr>
                  ))}
                  {(!sal.appointments || sal.appointments.length === 0) && <tr><td colSpan={4}><EmptyState title="No appointments" /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && inv?.items && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th>Style</th><th>Designer</th><th>Category</th><th>Price</th></tr></thead>
              <tbody>
                {inv.items.map((i: any) => (
                  <tr key={i.id} className="hover-row">
                    <td style={{ fontWeight: 600 }}>{i.style_number}</td>
                    <td>{i.vendor_name}</td>
                    <td>{i.category}</td>
                    <td>${((i.base_price_cents||0)/100).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Extended report tabs */}
        {['open-orders','expected-deliveries','bookings','cancellations','did-not-buy','transfers','follow-ups'].includes(activeTab) && (
          extLoading ? <div style={{ padding: 32 }}><EmptyState title="Loading…" /></div> :
          (() => {
            const keyMap: Record<string,string> = { 'open-orders':'openOrders','expected-deliveries':'expectedDeliveries','bookings':'bookings','cancellations':'cancellations','did-not-buy':'didNotBuy','transfers':'transfers','follow-ups':'followUps' };
            const rows: any[] = Array.isArray(extData[keyMap[activeTab]]) ? extData[keyMap[activeTab]] : [];
            if (rows.length === 0) return <EmptyState title="No data for this report" description="Try adjusting your date range or filters." />;
            const cols = Object.keys(rows[0]);
            return (
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{cols.map(c => <th key={c}>{c.replace(/_/g,' ')}</th>)}</tr></thead>
                  <tbody>{rows.map((r,i) => <tr key={i} className="hover-row">{cols.map(c => <td key={c}>{r[c] == null ? '—' : String(r[c])}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

// ─── Purchasing Portal ────────────────────────────────────────────────────────

const PurchasingPortalView = ({ purchases, onTriggerPO }: { purchases: any[]; onTriggerPO: () => void }) => (
  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <PageHeader
      title="Purchasing Portal"
      description="Vendor purchase orders and order tracking"
      actions={<button className="btn btn-primary" onClick={onTriggerPO}>+ New Purchase Order</button>}
    />
    <div className="dashboard-scroll">
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th>PO Number</th><th>Vendor / Designer</th><th>Style Details</th><th>Expected Ship</th><th>Status</th></tr>
          </thead>
          <tbody>
            {purchases.map((p: any) => (
              <tr key={p.id} className="hover-row">
                <td style={{ fontWeight: 600 }}>PO-{p.id}</td>
                <td style={{ fontWeight: 600 }}>{p.vendor_name}</td>
                <td>{p.style_number} (Sz {p.size})</td>
                <td>{p.expected_ship_date || '—'}</td>
                <td><StatusBadge status={p.status} size="sm" /></td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={5}><EmptyState icon="📦" title="No active vendor orders" /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// ─── Inventory Catalog ────────────────────────────────────────────────────────

const InventoryCatalogView = ({ inventory, onInspectItem }: { inventory: any[]; onInspectItem: (item: any) => void }) => (
  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <PageHeader title="Designer Catalog" description="Global inventory and style catalog" />
    <div className="dashboard-scroll">
      {inventory.length === 0 && <EmptyState icon="👗" title="No inventory seeded yet" />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {inventory.map((item: any) => (
          <div key={item.id} onClick={() => onInspectItem(item)} className="kpi-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{item.vendor_name}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{item.style_number}</div>
            <div style={{ fontSize: 14, marginTop: 2 }}>{item.category}</div>
            <div style={{ fontSize: 16, color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>${(item.base_price_cents / 100).toLocaleString()}</div>
            <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
            {item.variants?.map((v: any) => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <span>Sz {v.size} — {v.color}</span>
                <span style={{ color: v.stock_quantity > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{v.stock_quantity} in Vault</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── POS Checkout ─────────────────────────────────────────────────────────────

const POSCheckoutView = ({ invoices, onRefresh }: { invoices: any[]; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const handlePayment = async (method: string) => {
    if (!activeInvoice || !payAmount) return;
    try {
      const res = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: activeInvoice.id, amount_cents: Math.round(parseFloat(payAmount) * 100), method, reference_number: `REF-${Date.now()}` }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast(`Payment of $${payAmount} via ${method} recorded.`, 'success');
      setPayAmount('');
      setActiveInvoice(null);
      onRefresh();
    } catch (e: any) {
      toast('Payment failed: ' + e.message, 'error');
    }
  };

  const handleStripeCheckout = async (invoiceId: number) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}/checkout`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e: any) {
      toast('Stripe error: ' + e.message, 'error');
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Orders & Payments" description="Invoice management and POS checkout" />
      <div className="dashboard-scroll" style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: 24, border: '1px solid var(--border)', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15 }}>Open Invoices</h3>
          {invoices.length === 0 && <EmptyState icon="🧾" title="No open invoices" />}
          {invoices.map((inv: any) => (
            <div key={inv.id} onClick={() => setActiveInvoice(inv)} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10, cursor: 'pointer', background: activeInvoice?.id === inv.id ? 'var(--color-surface-selected)' : 'white', transition: 'background 0.15s' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Invoice #{inv.id} — {inv.first_name} {inv.last_name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
                <span>Total: ${(inv.total_amount_cents/100).toLocaleString()}</span>
                <span style={{ color: inv.balance_due_cents > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>Due: ${(inv.balance_due_cents/100).toLocaleString()}</span>
              </div>
              <div style={{ marginTop: 4 }}><StatusBadge status={inv.status} size="sm" /></div>
            </div>
          ))}
        </div>
        {activeInvoice && (
          <div style={{ flex: 1, background: '#111', color: 'white', borderRadius: 12, padding: 32 }}>
            <h2 style={{ marginTop: 0, color: '#9CA3AF', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>POS Terminal</h2>
            <div style={{ fontSize: 48, fontWeight: 700, margin: '20px 0 6px' }}>${(activeInvoice.balance_due_cents/100).toLocaleString()}</div>
            <div style={{ color: '#6B7280', marginBottom: 28, fontSize: 14 }}>Remaining balance due</div>
            <label style={{ display: 'block', color: '#9CA3AF', marginBottom: 8, fontSize: 13 }}>Payment Amount ($)</label>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ width: '100%', padding: 16, fontSize: 22, background: '#222', color: 'white', border: '1px solid #333', borderRadius: 8, marginBottom: 20 }} placeholder="0.00" />
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <button disabled={!payAmount} onClick={() => handlePayment('credit_card')} style={{ flex: 1, padding: 18, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: payAmount ? 1 : 0.4 }}>Credit Card</button>
              <button disabled={!payAmount} onClick={() => handlePayment('cash')} style={{ flex: 1, padding: 18, background: '#1c8853', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: payAmount ? 1 : 0.4 }}>Cash</button>
            </div>
            <button disabled={activeInvoice.balance_due_cents <= 0} onClick={() => handleStripeCheckout(activeInvoice.id)} style={{ width: '100%', padding: 18, background: '#635BFF', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              Pay Full Balance via Stripe
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Login screen ─────────────────────────────────────────────────────────────

const LoginScreen = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('vowos_token', data.token);
      localStorage.setItem('vowos_user', JSON.stringify(data.user));
      onLogin(data);
    } catch (e: any) {
      toast(e.message || 'Login failed.', 'error');
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const res = await fetch(`${API_BASE}/demo-login`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('vowos_token', data.token);
      localStorage.setItem('vowos_user', JSON.stringify(data.user));
      onLogin(data);
    } catch (e: any) {
      toast('Demo login failed: ' + e.message, 'error');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--sidebar)' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: 40, borderRadius: 12, width: 400, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600 }}>
            Vow<span style={{ color: 'var(--accent)' }}>OS</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, marginBottom: 0, fontSize: 14 }}>Sign in to your boutique</p>
        </div>
        <input type="email" required placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: 12, borderRadius: 6, border: '1px solid var(--border)', fontSize: 14 }} />
        <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: 12, borderRadius: 6, border: '1px solid var(--border)', fontSize: 14 }} />
        <button className="btn btn-primary" type="submit" style={{ padding: 14, fontSize: 15 }}>Sign In →</button>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 16 }}>or</div>
        <button type="button" onClick={handleDemoLogin} disabled={isDemoLoading} className="btn btn-outline" style={{ padding: 14 }}>
          {isDemoLoading ? 'Loading demo data…' : '✨ Enter Demo Mode'}
        </button>
      </form>
    </div>
  );
};

// ─── Purchase Order Modal ─────────────────────────────────────────────────────

const PurchaseOrderModal = ({ customers, onClose, onRefresh }: { customers: any[]; onClose: () => void; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ customer_id: '', vendor_name: '', style_number: '', size_category: 'Standard', size: '', split_bust: '', split_waist: '', split_hips: '', hollow_to_hem: '', custom_notes: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/operations/purchases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Purchase order submitted to vendor.', 'success');
      onRefresh(); onClose();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="drawer-overlay open" onClick={onClose} style={{ zIndex: 9000 }}>
      <div className="modal-content" onClick={ev => ev.stopPropagation()} style={{ background: 'white', padding: 32, borderRadius: 12, width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Create Vendor Purchase Order</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          <select required value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}>
            <option value="">Select Customer…</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 12 }}>
            <input required placeholder="Vendor name" value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid var(--border)' }} />
            <input required placeholder="Style number" value={form.style_number} onChange={e => setForm({ ...form, style_number: e.target.value })} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid var(--border)' }} />
          </div>
          <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 10 }}>Sizing</label>
            <select value={form.size_category} onChange={e => setForm({ ...form, size_category: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 12 }}>
              <option value="Standard">Standard Size</option>
              <option value="Split Size">Split Size</option>
              <option value="Custom Length">Custom Length (Hollow-to-Hem)</option>
            </select>
            {form.size_category === 'Standard' && <input required placeholder="e.g. 10" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)' }} />}
            {form.size_category === 'Split Size' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <input required placeholder="Bust" value={form.split_bust} onChange={e => setForm({ ...form, split_bust: e.target.value })} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid var(--border)' }} />
                <input required placeholder="Waist" value={form.split_waist} onChange={e => setForm({ ...form, split_waist: e.target.value })} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid var(--border)' }} />
                <input required placeholder="Hips" value={form.split_hips} onChange={e => setForm({ ...form, split_hips: e.target.value })} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid var(--border)' }} />
              </div>
            )}
            {form.size_category === 'Custom Length' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <input required placeholder="Base size" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid var(--border)' }} />
                <input required placeholder="Hollow-to-hem (in)" value={form.hollow_to_hem} onChange={e => setForm({ ...form, hollow_to_hem: e.target.value })} style={{ flex: 2, padding: 10, borderRadius: 6, border: '1px solid var(--border)' }} />
              </div>
            )}
          </div>
          <textarea placeholder="Vendor notes (rush fees, customizations…)" value={form.custom_notes} onChange={e => setForm({ ...form, custom_notes: e.target.value })} style={{ padding: 10, borderRadius: 6, minHeight: 72, border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: 14 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Transmit Purchase Order</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Add Appointment Modal ────────────────────────────────────────────────────

const AddAppointmentModal = ({ customers, onClose, onRefresh }: { customers: any[]; onClose: () => void; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ customer_id: '', time_slot: '10:00 AM', type: 'Bridal Fitting', consultant_name: 'Jessica M.', room_name: 'Suite A' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Appointment booked successfully.', 'success');
      onRefresh(); onClose();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="drawer-overlay open" onClick={onClose} style={{ zIndex: 9000 }}>
      <div className="modal-content" onClick={ev => ev.stopPropagation()} style={{ background: 'white', padding: 32, borderRadius: 12, width: 500 }}>
        <h2 style={{ marginTop: 0 }}>Book Appointment</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
          <select required value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}>
            <option value="">Select Customer…</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Time Slot', field: 'time_slot', opts: ['10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'] },
              { label: 'Appointment Type', field: 'type', opts: ['Bridal Fitting','First View','Alterations','Accessory Styling'] },
              { label: 'Consultant', field: 'consultant_name', opts: ['Jessica M.','Sarah K.','Emily R.'] },
              { label: 'Suite', field: 'room_name', opts: ['Suite A','Suite B','Podium 1'] },
            ].map(({ label, field, opts }) => (
              <div key={field}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                <select value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Book Appointment</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Record Detail Modal ──────────────────────────────────────────────────────

const RecordDetailModal = ({ record, onClose, onRefresh }: { record: { type: string; data: any }; onClose: () => void; onRefresh: () => void }) => {
  const { toast } = useToast();
  const { type, data } = record;

  const handleAction = async (endpoint: string, method = 'POST', payload?: any) => {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { method, headers: { 'Content-Type': 'application/json' }, ...(payload && { body: JSON.stringify(payload) }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Action completed.', 'success');
      onRefresh(); onClose();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="drawer-overlay open" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={ev => ev.stopPropagation()} style={{ background: 'white', padding: 32, borderRadius: 12, width: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ background: 'var(--accent)', color: 'white', padding: '3px 8px', borderRadius: 4, display: 'inline-block', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
              {type.toUpperCase()} RECORD
            </div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Record Detail</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>×</button>
        </div>

        <div style={{ background: 'var(--bg)', padding: 20, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 20 }}>
          {type === 'invoice' && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Customer</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{data.first_name} {data.last_name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total</div><div style={{ fontWeight: 600 }}>${(data.total_amount_cents/100).toLocaleString()}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Balance Due</div><div style={{ fontWeight: 700, color: 'var(--color-danger)' }}>${(data.balance_due_cents/100).toLocaleString()}</div></div>
              </div>
            </>
          )}
          {type === 'po' && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vendor</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{data.vendor_name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Style & Size</div><div style={{ fontWeight: 600 }}>{data.style_number} (Sz: {data.size})</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Customer</div><div style={{ fontWeight: 600 }}>{data.first_name} {data.last_name}</div></div>
              </div>
            </>
          )}
          {type === 'pickup' && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Item</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{data.item_description}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Customer</div><div style={{ fontWeight: 600 }}>{data.first_name} {data.last_name}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status</div><StatusBadge status={data.qa_verified ? 'ready' : 'pending'} /></div>
              </div>
            </>
          )}
          {type === 'appt' && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Appointment Type</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{data.type}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Customer</div><div style={{ fontWeight: 600 }}>{data.first_name} {data.last_name}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Consultant / Suite</div><div style={{ fontWeight: 600 }}>{data.consultant_name} ({data.room_name})</div></div>
              </div>
            </>
          )}
          {type === 'inventory' && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Style</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{data.style_number}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Designer</div><div style={{ fontWeight: 600 }}>{data.vendor_name}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stock</div><div style={{ fontWeight: 700, color: data.stock_quantity <= 2 ? 'var(--color-danger)' : 'var(--color-success)' }}>{data.stock_quantity} units</div></div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {type === 'invoice' && data.balance_due_cents > 0 && (
            <button className="btn btn-primary" onClick={() => handleAction(`/invoices/${data.id}/checkout`)}>Process Stripe Checkout →</button>
          )}
          {type === 'po' && data.status !== 'Received' && (
            <button className="btn btn-primary" onClick={() => { toast('Vendor fulfillment flow coming in Stage 4.', 'info'); onClose(); }}>Mark Vendor Order Fulfilled ✓</button>
          )}
          {type === 'pickup' && !data.qa_verified && (
            <button className="btn btn-primary" onClick={() => handleAction(`/operations/pickups/${data.id}/ready`)}>Run QA & Send SMS →</button>
          )}
          {type === 'inventory' && (
            <button className="btn btn-primary" onClick={() => { toast('PO draft flow coming in Stage 4.', 'info'); onClose(); }}>Draft Vendor PO →</button>
          )}
          <button className="btn btn-outline" onClick={onClose} style={{ marginTop: 4 }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Lead Modal ───────────────────────────────────────────────────────────────

const LeadModal = ({ onClose, onRefresh }: { onClose: () => void; onRefresh: () => void }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('vowos_token') || '';
      const res = await fetch(`${API_BASE}/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Lead saved to CRM.', 'success');
      onRefresh(); onClose();
    } catch (e: any) {
      toast('Error: ' + e.message, 'error');
    }
  };

  return (
    <div className="drawer-overlay open" onClick={onClose} style={{ zIndex: 9000 }}>
      <div className="modal-content" onClick={ev => ev.stopPropagation()} style={{ background: 'white', padding: 32, borderRadius: 12, width: 440 }}>
        <div className="drawer-header" style={{ padding: 0, marginBottom: 24, border: 'none' }}>
          <div>
            <div className="drawer-title">Capture New Lead</div>
            <div className="drawer-subtitle">Add a prospect to the CRM</div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'First Name', field: 'first_name', type: 'text', required: true },
            { label: 'Last Name',  field: 'last_name',  type: 'text', required: true },
            { label: 'Email',      field: 'email',      type: 'email', required: true },
            { label: 'Phone',      field: 'phone',      type: 'tel',  required: false },
          ].map(({ label, field, type, required }) => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
              <input type={type} required={required} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border)', fontSize: 14 }} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save to CRM</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const { toast } = useToast();

  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem('vowos_token'));
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(JSON.parse(localStorage.getItem('vowos_user') || 'null'));

  const [activeBrand, setActiveBrand] = useState<'ido' | 'proper'>((localStorage.getItem('re_brand') as 'ido' | 'proper') || 'ido');
  const [activeLocation, setActiveLocation] = useState(localStorage.getItem('re_location') || 'Baton Rouge');

  const [customers, setCustomers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any>({});
  const [opsSummary, setOpsSummary] = useState<any>({});
  const [aiInsights, setAiInsights] = useState<any[]>([]);

  const [customerPage, setCustomerPage] = useState(1);
  const [customerPages, setCustomerPages] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePages, setInvoicePages] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPages, setInventoryPages] = useState(1);

  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<{ type: string; data: any } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-brand', activeBrand);
    localStorage.setItem('re_brand', activeBrand);
    localStorage.setItem('re_location', activeLocation);
  }, [activeBrand, activeLocation]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('vowos_token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = async (opts: any = {}) => {
    if (!sessionToken) return;
    const h = getAuthHeaders() as any;
    const cp = opts.customers ?? customerPage;
    const ip = opts.invoices  ?? invoicePage;
    const vp = opts.inventory ?? inventoryPage;

    try {
      const [custRes, apptRes, invRes, poRes, pkRes, catRes, adminRes, opsRes, insightsRes] = await Promise.all([
        fetch(`${API_BASE}/customers?page=${cp}&limit=25`, { headers: h }),
        fetch(`${API_BASE}/appointments`, { headers: h }),
        fetch(`${API_BASE}/invoices?page=${ip}&limit=25`, { headers: h }),
        fetch(`${API_BASE}/operations/purchases`, { headers: h }),
        fetch(`${API_BASE}/operations/pickups`, { headers: h }),
        fetch(`${API_BASE}/inventory?page=${vp}&limit=24`, { headers: h }),
        fetch(`${API_BASE}/system/settings`, { headers: h }),
        fetch(`${API_BASE}/system/ops-summary`, { headers: h }),
        fetch(`${API_BASE}/ai/insights`, { headers: h }),
      ]);

      if (custRes.ok) { const d = await custRes.json(); setCustomers(Array.isArray(d) ? d : (d.customers || [])); if (d.pages) setCustomerPages(d.pages); }
      if (apptRes.ok) { const d = await apptRes.json(); setAppointments(Array.isArray(d) ? d : []); }
      if (invRes.ok)  { const d = await invRes.json();  setInvoices(Array.isArray(d) ? d : (d.invoices || [])); if (d.pages) setInvoicePages(d.pages); }
      if (poRes.ok)   { const d = await poRes.json();   setPurchases(Array.isArray(d) ? d : []); }
      if (pkRes.ok)   { const d = await pkRes.json();   setPickups(Array.isArray(d) ? d : []); }
      if (catRes.ok)  { const d = await catRes.json();  setInventory(Array.isArray(d) ? d : (d.items || [])); if (d.pages) setInventoryPages(d.pages); }
      if (adminRes.ok) setAdminData(await adminRes.json());
      if (opsRes.ok)   setOpsSummary(await opsRes.json());
      if (insightsRes.ok) { const d = await insightsRes.json(); setAiInsights(Array.isArray(d) ? d : []); }

      // Fetch leads separately (leads endpoint)
      const leadsRes = await fetch(`${API_BASE}/leads`, { headers: h });
      if (leadsRes.ok) { const d = await leadsRes.json(); setLeads(Array.isArray(d) ? d : []); }
    } catch (e) {
      // Data loading errors are non-fatal; individual modules handle empty state
    }
  };

  const handleMarkReady = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/operations/pickups/${id}/ready`, { method: 'POST', headers: getAuthHeaders() as any });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('QA verified — SMS sent to customer.', 'success');
      fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { if (sessionToken) fetchData(); }, [sessionToken]);

  const signOut = () => {
    localStorage.clear();
    setSessionToken(null);
    setCurrentUser(null);
  };

  if (!sessionToken || !currentUser) {
    return <LoginScreen onLogin={(data: any) => { setSessionToken(data.token); setCurrentUser(data.user); }} />;
  }

  const ctxValue = {
    API_BASE, currentUser, activeBrand, activeLocation, setActiveBrand, setActiveLocation,
    customers, leads, appointments, invoices, purchases, pickups, inventory, adminData, opsSummary, aiInsights,
    customerPage, customerPages, invoicePage, invoicePages, inventoryPage, inventoryPages,
    setCustomerPage, setInvoicePage, setInventoryPage,
    fetchData, onOpenPOModal: () => setIsPOModalOpen(true), onOpenApptModal: () => setIsApptModalOpen(true),
    handleMarkReady,
  };

  return (
    <AppProvider value={ctxValue}>
      {activeRecord && <RecordDetailModal record={activeRecord} onClose={() => setActiveRecord(null)} onRefresh={fetchData} />}
      {isPOModalOpen && <PurchaseOrderModal customers={customers} onClose={() => setIsPOModalOpen(false)} onRefresh={fetchData} />}
      {isApptModalOpen && <AddAppointmentModal customers={customers} onClose={() => setIsApptModalOpen(false)} onRefresh={fetchData} />}
      {isLeadModalOpen && <LeadModal onClose={() => setIsLeadModalOpen(false)} onRefresh={fetchData} />}

      <Routes>
        <Route element={
          <AppShell
            currentUser={currentUser}
            activeBrand={activeBrand}
            activeLocation={activeLocation}
            onBrandChange={b => setActiveBrand(b)}
            onLocationChange={l => setActiveLocation(l)}
            onSignOut={signOut}
            onQuickAction={action => {
              if (action === 'lead') setIsLeadModalOpen(true);
              if (action === 'po')   setIsPOModalOpen(true);
              if (action === 'appt') setIsApptModalOpen(true);
            }}
          />
        }>
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage onTriggerPO={() => setIsPOModalOpen(true)} />} />
          <Route path="calendar" element={<CalendarModule appointments={appointments} onNewAppt={() => setIsApptModalOpen(true)} onInspectAppt={a => setActiveRecord({ type: 'appt', data: a })} />} />
          <Route path="locations" element={<LocationsModule API_BASE={API_BASE} />} />
          <Route path="communications" element={<CommunicationHubView leads={leads} />} />
          <Route path="chat" element={<TeamChatModule API_BASE={API_BASE} />} />
          <Route path="voice" element={<VoiceModule API_BASE={API_BASE} />} />
          <Route path="inventory" element={<InventoryCatalogView inventory={inventory} onInspectItem={item => setActiveRecord({ type: 'inventory', data: item })} />} />
          <Route path="purchasing" element={<PurchasingPortalView purchases={purchases} onTriggerPO={() => setIsPOModalOpen(true)} />} />
          <Route path="financials" element={<POSCheckoutView invoices={invoices} onRefresh={fetchData} />} />
          <Route path="reports" element={<ReportsAnalyticsView />} />
          <Route path="employees" element={<EmployeeHubView users={adminData?.users ?? []} currentUser={currentUser} />} />
          <Route path="payroll" element={<PayrollModule API_BASE={API_BASE} />} />
          <Route path="settings" element={<SettingsModule adminData={adminData} onRefresh={fetchData} API_BASE={API_BASE} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default App;
