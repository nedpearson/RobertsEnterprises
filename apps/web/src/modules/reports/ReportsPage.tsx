import { useState, useEffect } from 'react';
import { useToast, EmptyState, PageHeader, StatusBadge } from '../../design-system';
import { API_BASE } from '../../shared/AppContext';
import { exportToExcel, exportToPDF, exportToWord } from '../../utils/exporters';

export function ReportsPage() {
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

  const TABS: [string, string][] = [
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
}
