import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../shared/AppContext';
import { EmptyState, PageHeader } from '../../design-system';

function DrilldownDrawer({
  type, invoices, purchases, pickups, appointments, inventory,
  filter, onFilter, onSelectRecord, onClose,
}: any) {
  const open = !!type;
  const titles: Record<string, string> = {
    unpaid: 'Overdue Unpaid Balances',
    overdue_po: 'Late Vendor Shipments',
    pickups: 'Pickup Backlog',
    appts: 'Appointments',
    low_stock: 'Low Stock Items',
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <div>
            <div className="drawer-title">{titles[type] ?? 'Details'}</div>
            <div className="drawer-subtitle">Filtered results</div>
            <input
              type="text" placeholder="Search by name, ID…"
              value={filter} onChange={e => onFilter(e.target.value)}
              style={{ marginTop: 12, padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border)', width: 350, fontSize: 13, background: 'var(--bg)' }}
            />
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="drawer-content">
          <table>
            <thead>
              <tr>
                {type === 'unpaid'    && <><th>ID</th><th>Customer</th><th>Date</th><th style={{textAlign:'right'}}>Balance</th></>}
                {type === 'overdue_po' && <><th>PO</th><th>Vendor</th><th>Customer</th><th>Status</th></>}
                {type === 'pickups'   && <><th>Status</th><th>Customer</th><th>Item</th><th>Action</th></>}
                {type === 'appts'     && <><th>Time</th><th>Customer</th><th>Type</th><th>Stylist</th></>}
                {type === 'low_stock' && <><th>Style</th><th>Category</th><th>Price</th><th>Stock</th></>}
              </tr>
            </thead>
            <tbody>
              {type === 'unpaid' && invoices
                .filter((i: any) => !filter || JSON.stringify(i).toLowerCase().includes(filter.toLowerCase()))
                .map((i: any) => (
                <tr key={i.id} className="hover-row" style={{ cursor: 'pointer' }} onClick={() => onSelectRecord({ type: 'invoice', data: i })}>
                  <td><b>INV-{String(i.id).padStart(4,'0')}</b></td>
                  <td>{i.first_name} {i.last_name}</td>
                  <td>{new Date(i.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign:'right', color:'var(--danger)', fontWeight:600 }}>${(i.balance_due_cents/100).toLocaleString()}</td>
                </tr>
              ))}
              {type === 'overdue_po' && purchases
                .filter((p: any) => !filter || JSON.stringify(p).toLowerCase().includes(filter.toLowerCase()))
                .map((p: any) => (
                <tr key={p.id} className="hover-row" style={{ cursor:'pointer' }} onClick={() => onSelectRecord({ type:'po', data:p })}>
                  <td><b>PO-{p.id}</b></td>
                  <td><div>{p.vendor_name}</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>{p.style_number}</div></td>
                  <td>{p.first_name} {p.last_name}</td>
                  <td><span className="status-pill red">{p.status}</span></td>
                </tr>
              ))}
              {type === 'pickups' && pickups
                .filter((p: any) => !filter || JSON.stringify(p).toLowerCase().includes(filter.toLowerCase()))
                .map((p: any) => (
                <tr key={p.id} className="hover-row" style={{ cursor:'pointer' }} onClick={() => onSelectRecord({ type:'pickup', data:p })}>
                  <td><span className={`status-pill ${p.qa_verified ? 'green':'yellow'}`}>{p.qa_verified ? 'Ready':'Pending'}</span></td>
                  <td><b>{p.first_name} {p.last_name}</b></td>
                  <td>{p.item_description}</td>
                  <td>{p.qa_verified ? <span style={{ color:'var(--success)', fontWeight:600, fontSize:13 }}>SMS Sent</span> : '—'}</td>
                </tr>
              ))}
              {type === 'appts' && appointments
                .filter((a: any) => !filter || JSON.stringify(a).toLowerCase().includes(filter.toLowerCase()))
                .map((a: any) => (
                <tr key={a.id} className="hover-row" style={{ cursor:'pointer' }} onClick={() => onSelectRecord({ type:'appt', data:a })}>
                  <td><b>{a.time_slot}</b></td>
                  <td>{a.first_name} {a.last_name}</td>
                  <td>{a.type}</td>
                  <td>{a.consultant_name}</td>
                </tr>
              ))}
              {type === 'low_stock' && inventory
                .filter((i: any) => !filter || JSON.stringify(i).toLowerCase().includes(filter.toLowerCase()))
                .map((i: any) => (
                <tr key={i.id} className="hover-row" style={{ cursor:'pointer' }} onClick={() => onSelectRecord({ type:'inventory', data:i })}>
                  <td><div><b>{i.style_number}</b></div><div style={{ fontSize:12, color:'var(--text-muted)' }}>{i.vendor_name}</div></td>
                  <td>{i.category}</td>
                  <td>${(i.base_price_cents/100).toLocaleString()}</td>
                  <td><span className="status-pill red">{i.stock_quantity} left</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { invoices, purchases, pickups, appointments, inventory, customers, leads, opsSummary, aiInsights } = useApp();
  const [drilldown, setDrilldown] = useState<string | null>(null);
  const [drillFilter, setDrillFilter] = useState('');
  const [, setActiveRecord] = useState<any>(null);

  const totalAR = (Array.isArray(invoices) ? invoices : []).reduce((s: number, i: any) => s + (i.balance_due_cents / 100), 0);

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Command Center" description="Operational overview for Roberts Enterprises" />

      <div className="dashboard-scroll">
        <div className="section-title">Critical / Action Required</div>
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => setDrilldown('unpaid')}>
            <div className="kpi-header"><span className="kpi-title">Overdue Unpaid Balances</span><span className="kpi-badge badge-danger">High Risk</span></div>
            <div className="kpi-value">${totalAR.toLocaleString()}</div>
            <div className="kpi-title" style={{ marginTop: 8 }}>Across {invoices.length} invoices</div>
          </div>
          <div className="kpi-card" onClick={() => setDrilldown('overdue_po')}>
            <div className="kpi-header"><span className="kpi-title">Late Vendor Shipments</span><span className="kpi-badge badge-warning">Watch</span></div>
            <div className="kpi-value">{purchases.length}</div>
            <div className="kpi-title" style={{ marginTop: 8 }}>Purchase orders past expected ETA</div>
          </div>
          <div className="kpi-card" onClick={() => setDrilldown('pickups')}>
            <div className="kpi-header"><span className="kpi-title">Pickup Backlog</span><span className="kpi-badge badge-success">Ready</span></div>
            <div className="kpi-value">{pickups.length}</div>
            <div className="kpi-title" style={{ marginTop: 8 }}>QA passed, awaiting pickup</div>
          </div>
          <div className="kpi-card" onClick={() => setDrilldown('appts')}>
            <div className="kpi-header"><span className="kpi-title">Appointments Today</span></div>
            <div className="kpi-value">{appointments.length}</div>
            <div className="kpi-title" style={{ marginTop: 8 }}>Scheduled this session</div>
          </div>
          <div className="kpi-card" onClick={() => navigate('/customers')}>
            <div className="kpi-header"><span className="kpi-title">Active Database Entities</span><span className="kpi-badge badge-success">Live</span></div>
            <div className="kpi-value">{customers.length + leads.length}</div>
            <div className="kpi-title" style={{ marginTop: 8 }}>{customers.length} Customers · {leads.length} Leads</div>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 40 }}>Operations</div>
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => navigate('/locations')}>
            <div className="kpi-header"><span className="kpi-title">Open Alterations</span><span className="kpi-badge badge-warning">Board</span></div>
            <div className="kpi-value">{opsSummary?.alterations_open ?? '—'}</div>
            <div className="kpi-title" style={{ marginTop: 8 }}>Awaiting fitting → pickup</div>
          </div>
          <div className="kpi-card" onClick={() => navigate('/locations')}>
            <div className="kpi-header"><span className="kpi-title">Transfers In Transit</span></div>
            <div className="kpi-value">{opsSummary?.transfers_in_transit ?? '—'}</div>
            <div className="kpi-title" style={{ marginTop: 8 }}>Awaiting receipt</div>
          </div>
          <div className="kpi-card" onClick={() => navigate('/payroll')}>
            <div className="kpi-header"><span className="kpi-title">Unpaid Payroll Hours</span></div>
            <div className="kpi-value">{opsSummary?.payroll_unpaid_hours ?? '—'}</div>
            <div className="kpi-title" style={{ marginTop: 8 }}>Approved, ready to run</div>
          </div>
          <div className="kpi-card" onClick={() => navigate('/chat')}>
            <div className="kpi-header"><span className="kpi-title">Team Messages</span></div>
            <div className="kpi-value">{opsSummary?.chat_messages ?? '—'}</div>
            <div className="kpi-title" style={{ marginTop: 8 }}>Across all channels</div>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 40 }}>AI Recommendations</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {aiInsights.length === 0 && (
            <EmptyState icon="✨" title="Building recommendations…" description="VowOS is analyzing your data." />
          )}
          {aiInsights.map((insight: any) => (
            <div key={insight.id} style={{ background: 'linear-gradient(135deg, rgba(88,86,214,0.04) 0%, #fff 100%)', border: '1px solid #e0e0f8', padding: 24, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ background: 'var(--accent)', color: 'white', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{insight.type.toUpperCase()}</div>
                <h3 style={{ margin: 0, fontSize: 17 }}>{insight.title}</h3>
              </div>
              <p style={{ color: '#444', lineHeight: 1.5, margin: 0 }}>{insight.message}</p>
              <div style={{ marginTop: 16 }}>
                {insight.type === 'inventory'  && <button className="btn btn-primary" onClick={() => setDrilldown('low_stock')}>Inspect Low Stock →</button>}
                {insight.type === 'financial'  && <button className="btn btn-outline" onClick={() => setDrilldown('unpaid')}>View Open Invoices</button>}
                {insight.type === 'growth'     && <button className="btn btn-outline" onClick={() => setDrilldown('appts')}>View Appointments</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DrilldownDrawer
        type={drilldown}
        invoices={invoices} purchases={purchases} pickups={pickups}
        appointments={appointments} inventory={inventory}
        filter={drillFilter} onFilter={setDrillFilter}
        onSelectRecord={setActiveRecord}
        onClose={() => { setDrilldown(null); setDrillFilter(''); }}
      />
    </div>
  );
}
