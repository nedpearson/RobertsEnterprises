import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { CalendarModule } from './CalendarModule';
import { SettingsModule } from './SettingsModule';
import { LocationsModule } from './LocationsModule';
import { PayrollModule } from './PayrollModule';
import { TeamChatModule } from './TeamChatModule';
import { VoiceModule } from './VoiceModule';
import { AppShell } from './app/AppShell';
import { AppProvider, API_BASE } from './shared/AppContext';
import type { CurrentUser } from './shared/AppContext';
import { useToast, StatusBadge, PageSpinner } from './design-system';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { CustomersPage } from './modules/customers/CustomersPage';
import { EmployeesPage } from './modules/employees/EmployeesPage';
import { CommunicationsPage } from './modules/communications/CommunicationsPage';
import { PurchasingPage } from './modules/purchasing/PurchasingPage';
import { InventoryPage } from './modules/inventory/InventoryPage';
import { FinancialsPage } from './modules/financials/FinancialsPage';

// Heavy export dependencies (jsPDF, docx, exceljs) — lazy-load so initial bundle stays lean
const ReportsPage = lazy(() => import('./modules/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));

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
          <Route path="communications" element={<CommunicationsPage leads={leads} />} />
          <Route path="chat" element={<TeamChatModule API_BASE={API_BASE} />} />
          <Route path="voice" element={<VoiceModule API_BASE={API_BASE} />} />
          <Route path="inventory" element={<InventoryPage inventory={inventory} onInspectItem={item => setActiveRecord({ type: 'inventory', data: item })} />} />
          <Route path="purchasing" element={<PurchasingPage purchases={purchases} onTriggerPO={() => setIsPOModalOpen(true)} />} />
          <Route path="financials" element={<FinancialsPage invoices={invoices} onRefresh={fetchData} />} />
          <Route path="reports" element={<Suspense fallback={<PageSpinner />}><ReportsPage /></Suspense>} />
          <Route path="employees" element={<EmployeesPage users={adminData?.users ?? []} currentUser={currentUser} />} />
          <Route path="payroll" element={<PayrollModule API_BASE={API_BASE} />} />
          <Route path="settings" element={<SettingsModule adminData={adminData} onRefresh={fetchData} API_BASE={API_BASE} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default App;
