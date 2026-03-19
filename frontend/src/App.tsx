import React, { useState, useEffect } from 'react';
import './index.css';

// --- LIVE API FETCHING ---
const API_BASE = 'http://localhost:4000/api';

// --- MOCK DATA (Retained for visual UI rendering of missing backend modules) ---
const INVOICES = [
  { id: 'INV-1090', customer: 'Sarah Jenkins', weddingDate: '2026-08-14', amount: 3500, balance: 1200, status: 'Overdue', daysOverdue: 14, phone: '555-0192' },
  { id: 'INV-1092', customer: 'Emma Thompson', weddingDate: '2026-06-22', amount: 2800, balance: 2800, status: 'Overdue', daysOverdue: 5, phone: '555-0881' },
];

const PURCHASES = [
  { id: 'PO-4421', vendor: 'Vera Wang', style: 'VW-Luna', size: '8', customer: 'Chloe Davis', expectedShip: '2026-03-10', status: 'Late', delay: '9 days' },
  { id: 'PO-4435', vendor: 'Pronovias', style: 'PR-Aria', size: '12', customer: 'Mia Wilson', expectedShip: '2026-03-15', status: 'Late', delay: '4 days' },
];

const PICKUPS = [
  { id: 'RFP-882', customer: 'Lily Chen', item: 'Maggie Sottero (Altered)', balance: 0, qaVerified: true, readySince: '2 days ago' },
  { id: 'RFP-889', customer: 'Zoe Adams', item: 'Custom Veil', balance: 0, qaVerified: true, readySince: 'Today' }
];

const APPOINTMENTS = [
  { time: '10:00 AM', customer: 'Rachel Green', type: 'First View', consultant: 'Jessica M.', room: 'Suite A' },
  { time: '1:30 PM', customer: 'Monica Geller', type: 'Fitting 1', consultant: 'Sarah B.', room: 'Alterations' },
  { time: '3:00 PM', customer: 'Phoebe Buffay', type: 'Accessory Styling', consultant: 'Jessica M.', room: 'Suite B' },
];

// --- MAIN APP ---
function App() {
  const [activeDrilldown, setActiveDrilldown] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const fetchData = () => {
    fetch(`${API_BASE}/customers`).then(r=>r.json()).then(setCustomers).catch(console.error);
    fetch(`${API_BASE}/leads`).then(r=>r.json()).then(setLeads).catch(console.error);
  };

  useEffect(() => {
    // Auto-seed the SQLite database MVP then fetch customers
    fetch(`${API_BASE}/seed`, { method: 'POST' })
      .then(fetchData)
      .catch(console.error);
  }, []);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm)
      });
      if (!res.ok) throw new Error(await res.text());
      setIsLeadModalOpen(false);
      setLeadForm({ first_name: '', last_name: '', email: '', phone: '' });
      fetchData(); // Refresh API counters
      alert('Lead securely captured and saved to Database.');
    } catch (err: any) {
      alert('Error: ' + JSON.parse(err.message).error || err.message);
    }
  };

  // Drilldown Map Router
  const getDrilldownData = () => {
    switch(activeDrilldown) {
      case 'unpaid': return { title: 'Overdue Unpaid Balances', data: INVOICES, type: 'invoice' };
      case 'overdue_po': return { title: 'Late Vendor Shipments', data: PURCHASES, type: 'po' };
      case 'pickups': return { title: 'Ready for Pickup', data: PICKUPS, type: 'pickup' };
      case 'appts': return { title: 'Manifest: Appointments Today', data: APPOINTMENTS, type: 'appt' };
      default: return null;
    }
  };

  const drillContext = getDrilldownData();

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="brand">
          Vow<span>OS</span>
        </div>
        <div className="nav-links">
          <a className="nav-link active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
            Command Center
          </a>
          <a className="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Calendar
          </a>
          <a className="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Customers
          </a>
          <a className="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
            Inventory
          </a>
          <a className="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Financials
          </a>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="topbar">
          <div className="page-title">Operational Command Center</div>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={() => setIsLeadModalOpen(true)}>+ Add Lead</button>
            <span style={{color: 'var(--text-muted)', fontSize: 14, marginLeft: 16}}>BridalLive Boutique (Owner)</span>
            <div style={{width: 32, height: 32, borderRadius: 16, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>MB</div>
          </div>
        </header>

        <div className="dashboard-scroll">
          <div className="section-title">Critical Resolution / Action Required</div>
          <div className="kpi-grid">
            
            {/* KPI 1 */}
            <div className="kpi-card" onClick={() => setActiveDrilldown('unpaid')}>
              <div className="kpi-header">
                <span className="kpi-title">Overdue Unpaid Balances</span>
                <span className="kpi-badge badge-danger">High Risk</span>
              </div>
              <div className="kpi-value">${INVOICES.reduce((a,b)=>a+b.balance,0).toLocaleString()}</div>
              <div className="kpi-title" style={{marginTop: 8}}>Across {INVOICES.length} invoices</div>
            </div>

            {/* KPI 2 */}
            <div className="kpi-card" onClick={() => setActiveDrilldown('overdue_po')}>
              <div className="kpi-header">
                <span className="kpi-title">Late Vendor Shipments</span>
                <span className="kpi-badge badge-warning">Watch</span>
              </div>
              <div className="kpi-value">{PURCHASES.length}</div>
              <div className="kpi-title" style={{marginTop: 8}}>Purchase Orders past expected ETA</div>
            </div>

            {/* KPI 3 */}
            <div className="kpi-card" onClick={() => setActiveDrilldown('pickups')}>
              <div className="kpi-header">
                <span className="kpi-title">Pickup Backlog (Ready Vault)</span>
                <span className="kpi-badge badge-success">Good</span>
              </div>
              <div className="kpi-value">{PICKUPS.length}</div>
              <div className="kpi-title" style={{marginTop: 8}}>0 balance, QA passed. Awaiting pickup.</div>
            </div>

            {/* KPI 4 */}
            <div className="kpi-card" onClick={() => setActiveDrilldown('appts')}>
              <div className="kpi-header">
                <span className="kpi-title">Appointments Today</span>
              </div>
              <div className="kpi-value">{APPOINTMENTS.length}</div>
              <div className="kpi-title" style={{marginTop: 8}}>100% capacity utilized</div>
            </div>

            {/* LIVE API KPI */}
            <div className="kpi-card" onClick={() => alert('Live DB View Coming Soon!')}>
              <div className="kpi-header">
                <span className="kpi-title">Active Database Entities</span>
                <span className="kpi-badge badge-success">Live API</span>
              </div>
              <div className="kpi-value">{customers.length + leads.length}</div>
              <div className="kpi-title" style={{marginTop: 8}}>{customers.length} Customers | {leads.length} Leads</div>
            </div>

          </div>
        </div>

        {/* ========================================================= */}
        {/* LEVEL 1: SLIDE OUT DRILLDOWN DRAWER */}
        <div className={`drawer-overlay ${activeDrilldown ? 'open' : ''}`} onClick={() => setActiveDrilldown(null)} />
        
        <div className={`drawer ${activeDrilldown ? 'open' : ''}`}>
          <div className="drawer-header">
            <div>
              <div className="drawer-title">{drillContext?.title}</div>
              <div className="drawer-subtitle">Level 1 Filtered Results (Reconciled)</div>
            </div>
            <button className="close-btn" onClick={() => setActiveDrilldown(null)}>×</button>
          </div>
          
          <div className="drawer-content">
            <table>
              <thead>
                <tr>
                  {drillContext?.type === 'invoice' && <><th style={{width:'15%'}}>ID</th><th>Customer</th><th>Wedding</th><th style={{textAlign:'right'}}>Balance</th></>}
                  {drillContext?.type === 'po' && <><th style={{width:'15%'}}>PO</th><th>Vendor</th><th>Customer</th><th>Expected</th></>}
                  {drillContext?.type === 'pickup' && <><th style={{width:'20%'}}>Status</th><th>Customer</th><th>Item</th></>}
                  {drillContext?.type === 'appt' && <><th style={{width:'20%'}}>Time</th><th>Customer</th><th>Type</th><th>Stylist</th></>}
                </tr>
              </thead>
              <tbody>
                {drillContext?.type === 'invoice' && INVOICES.map(i => (
                  <tr key={i.id}>
                    <td><b>{i.id}</b></td>
                    <td>
                      <div>{i.customer}</div>
                      <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{i.status} ({i.daysOverdue}d)</div>
                    </td>
                    <td>{i.weddingDate}</td>
                    <td style={{textAlign:'right', color: 'var(--danger)', fontWeight: 600}}>${i.balance}</td>
                  </tr>
                ))}
                
                {drillContext?.type === 'po' && PURCHASES.map(p => (
                  <tr key={p.id}>
                    <td><b>{p.id}</b></td>
                    <td>
                      <div>{p.vendor}</div>
                      <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{p.style} (Sz: {p.size})</div>
                    </td>
                    <td>{p.customer}</td>
                    <td><span className="status-pill red">Late ({p.delay})</span></td>
                  </tr>
                ))}

                {drillContext?.type === 'pickup' && PICKUPS.map(p => (
                  <tr key={p.id}>
                    <td><span className="status-pill green">Ready</span></td>
                    <td>
                      <div><b>{p.customer}</b></div>
                      <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Since {p.readySince}</div>
                    </td>
                    <td>{p.item}</td>
                  </tr>
                ))}

                {drillContext?.type === 'appt' && APPOINTMENTS.map((a, i) => (
                  <tr key={i}>
                    <td><b>{a.time}</b></td>
                    <td>{a.customer}</td>
                    <td>{a.type}</td>
                    <td>{a.consultant} ({a.room})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* LEVEL 2/3: ACTION BAR */}
          {(drillContext?.type === 'invoice' || drillContext?.type === 'po') && (
            <div className="drawer-footer-action">
              <button className="btn btn-outline" onClick={() => alert('Opening export dialog...')}>Export Result Set</button>
              {drillContext?.type === 'invoice' && <button className="btn btn-primary" onClick={() => alert('Sending batch 1-Click Pay SMS links via Twilio...')}>Send Batch SMS Reminders</button>}
              {drillContext?.type === 'po' && <button className="btn btn-primary" onClick={() => alert('Drafting emails to Designers asking for ETA...')}>Request Updates via Email</button>}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* LEAD CAPTURE MODAL */}
        {isLeadModalOpen && (
          <div className="drawer-overlay open" onClick={() => setIsLeadModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="drawer-header">
                <div>
                  <div className="drawer-title">Capture New Lead</div>
                  <div className="drawer-subtitle">Ingest a prospect directly into the database</div>
                </div>
                <button className="close-btn" onClick={() => setIsLeadModalOpen(false)}>×</button>
              </div>
              <form onSubmit={handleLeadSubmit} style={{padding: 24, display: 'flex', flexDirection: 'column', gap: 16}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <label style={{fontSize: 14, fontWeight: 500}}>First Name</label>
                  <input style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} autoFocus required value={leadForm.first_name} onChange={e => setLeadForm({...leadForm, first_name: e.target.value})} />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <label style={{fontSize: 14, fontWeight: 500}}>Last Name</label>
                  <input style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} required value={leadForm.last_name} onChange={e => setLeadForm({...leadForm, last_name: e.target.value})} />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <label style={{fontSize: 14, fontWeight: 500}}>Email Address</label>
                  <input style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} type="email" required value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <label style={{fontSize: 14, fontWeight: 500}}>Phone Number</label>
                  <input style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} />
                </div>
                <div className="drawer-footer-action" style={{marginTop: 16}}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsLeadModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save to CRM</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
