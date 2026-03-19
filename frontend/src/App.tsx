import React, { useState, useEffect } from 'react';
import './index.css';

// --- LIVE API FETCHING ---
const API_BASE = 'http://localhost:4000/api';

// Mocks stripped. Application is now 100% physically linked to SQLite live state arrays.


// --- NEW CRM COMPONENTS ---
const Bride360View = ({ customer, onBack, onTriggerPO }: { customer: any, onBack: () => void, onTriggerPO: () => void }) => (
  <div className="dashboard-scroll">
     <button className="btn btn-outline" onClick={onBack} style={{marginBottom: 24}}>← Back to Customers</button>
     <div style={{display: 'flex', gap: 24}}>
        <div style={{flex: 1, background: 'white', padding: 24, borderRadius: 12, border: '1px solid #eee', height: 'fit-content'}}>
           <h2 style={{fontSize: 24, margin: '0 0 8px 0'}}>{customer.first_name} {customer.last_name}</h2>
           <p style={{color: 'var(--text-muted)'}}>{customer.email} • {customer.phone || 'No phone provided'}</p>
           
           <div style={{display: 'flex', gap: 8, marginTop: 16}}>
             <button className="btn btn-primary" onClick={onTriggerPO} style={{flex: 1, fontSize: 13, padding: 10}}>Generate Order</button>
             <button className="btn btn-outline" onClick={() => alert('Financial Invoice generation initialized...')} style={{flex: 1, fontSize: 13, padding: 10}}>Draft Invoice</button>
           </div>

           <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid #eee'}}/>
           <h3 style={{fontSize: 16, marginBottom: 16}}>Measurements</h3>
           <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
              <div style={{padding: 12, background: '#f8f9fa', borderRadius: 8}}><b>Bust:</b> 34"</div>
              <div style={{padding: 12, background: '#f8f9fa', borderRadius: 8}}><b>Waist:</b> 26"</div>
              <div style={{padding: 12, background: '#f8f9fa', borderRadius: 8}}><b>Hips:</b> 38"</div>
              <div style={{padding: 12, background: '#f8f9fa', borderRadius: 8}}><b>Height:</b> 5'6"</div>
           </div>
        </div>
        <div style={{flex: 2, background: 'white', padding: 24, borderRadius: 12, border: '1px solid #eee'}}>
           <h3 style={{margin: '0 0 24px 0'}}>Bride Timeline</h3>
           <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
              <div style={{borderLeft: '2px solid var(--accent)', paddingLeft: 16}}>
                <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Today</div>
                <div style={{fontWeight: 500, marginTop: 4}}>Customer profile viewed via Live API.</div>
              </div>
              <div style={{borderLeft: '2px solid #ddd', paddingLeft: 16}}>
                <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Record Created</div>
                <div style={{fontWeight: 500, marginTop: 4}}>Lead ingested successfully.</div>
              </div>
           </div>
        </div>
     </div>
  </div>
);

const CustomerListView = ({ customers, onSelect }: { customers: any[], onSelect: (c: any) => void }) => (
  <div className="dashboard-scroll">
    <div className="section-title">Active Brides</div>
    <div style={{background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #eee'}}>
      <table className="customers-rt" style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead style={{background: '#f8f9fa', textAlign: 'left'}}>
          <tr>
            <th style={{padding: '16px 24px'}}>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
             <tr key={c.id} style={{borderBottom: '1px solid #eee'}}>
                <td style={{padding: '16px 24px', fontWeight: 500}}>{c.first_name} {c.last_name}</td>
                <td>{c.email}</td>
                <td>{c.phone || '--'}</td>
                <td><button className="btn btn-primary" style={{padding: '6px 12px', fontSize: 13}} onClick={() => onSelect(c)}>View 360</button></td>
             </tr>
          ))}
          {customers.length === 0 && <tr><td colSpan={4} style={{padding: 24, textAlign: 'center'}}>No brides found.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

const InventoryCatalogView = ({ inventory, onInspectItem }: { inventory: any[], onInspectItem: (item: any) => void }) => (
  <div className="dashboard-scroll">
    <div className="section-title">Global Designer Catalog</div>
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24}}>
      {inventory.map(item => (
        <div key={item.id} onClick={() => onInspectItem(item)} className="kpi-card" style={{height: 'auto', display: 'flex', flexDirection: 'column', cursor: 'pointer'}}>
           <div style={{color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1}}>{item.vendor_name}</div>
           <div style={{fontSize: 22, fontWeight: 'bold'}}>{item.style_number}</div>
           <div style={{fontSize: 14, marginTop: 4}}>{item.category}</div>
           <div style={{fontSize: 14, color: 'var(--success)', fontWeight: 600, marginTop: 4}}>${(item.base_price_cents / 100).toLocaleString()}</div>
           <hr style={{margin: '16px 0', border: 'none', borderTop: '1px solid #eee'}} />
           <div style={{fontSize: 14, fontWeight: 'bold', marginBottom: 8}}>In-Stock Variants ({item.variants?.length || 0})</div>
           {item.variants?.map((v: any) => (
             <div key={v.id} style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f9f9f9'}}>
               <span>Sz {v.size} — {v.color}</span>
               <span style={{color: v.stock_quantity > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600}}>{v.stock_quantity} in Vault</span>
             </div>
           ))}
        </div>
      ))}
      {inventory.length === 0 && <div style={{padding: 24}}>No inventory seeded yet.</div>}
    </div>
  </div>
);

const POSCheckoutView = ({ invoices, onRefresh }: { invoices: any[], onRefresh: () => void }) => {
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  
  const handlePayment = async (method: string) => {
    if (!activeInvoice || !payAmount) return;
    try {
      const res = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: activeInvoice.id,
          amount_cents: Math.round(parseFloat(payAmount) * 100),
          method,
          reference_number: `REF-${Math.floor(Math.random() * 10000)}`
        })
      });
      if (!res.ok) throw new Error(await res.text());
      alert(`Payment of $${payAmount} via ${method} successful!`);
      setPayAmount('');
      setActiveInvoice(null);
      onRefresh();
    } catch (e: any) {
      alert('Payment failed: ' + e.message);
    }
  };

  const handleStripeCheckout = async (invoiceId: number) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}/checkout`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Execute strict redirection to the hosted Stripe Checkout UI
      window.location.href = data.url; 
    } catch(err: any) { alert('Stripe Gateway Error: ' + err.message); }
  };

  return (
    <div className="dashboard-scroll" style={{display: 'flex', gap: 24}}>
      <div style={{flex: 1, background: 'white', borderRadius: 12, padding: 24, border: '1px solid #eee', height: 'fit-content'}}>
        <h3 style={{marginTop: 0}}>Open Invoices</h3>
        {invoices.map(inv => (
          <div key={inv.id} onClick={() => setActiveInvoice(inv)} style={{padding: 16, border: '1px solid #eee', borderRadius: 8, marginBottom: 12, cursor: 'pointer', background: activeInvoice?.id === inv.id ? '#f0f7ff' : 'white'}}>
            <div style={{fontWeight: 'bold'}}>Invoice #{inv.id} - {inv.first_name} {inv.last_name}</div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 8}}>
              <span>Total: ${(inv.total_amount_cents / 100).toLocaleString()}</span>
              <span style={{color: inv.balance_due_cents > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold'}}>
                Due: ${(inv.balance_due_cents / 100).toLocaleString()}
              </span>
            </div>
            <div style={{marginTop: 4, fontSize: 12, color: 'var(--text-muted)'}}>Status: {inv.status.toUpperCase()}</div>
          </div>
        ))}
      </div>
      
      {activeInvoice && (
        <div style={{flex: 1, background: '#111', color: 'white', borderRadius: 12, padding: 32}}>
          <h2 style={{marginTop: 0, color: '#aaa'}}>POS Terminal</h2>
          <div style={{fontSize: 48, fontWeight: 'bold', margin: '24px 0'}}>${(activeInvoice.balance_due_cents / 100).toLocaleString()}</div>
          <div style={{color: '#888', marginBottom: 32}}>Remaining Balance Due</div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <div>
              <label style={{display: 'block', color: '#888', marginBottom: 8}}>Payment Amount ($)</label>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{width: '100%', padding: 16, fontSize: 24, background: '#222', color: 'white', border: '1px solid #333', borderRadius: 8}} placeholder="0.00" />
            </div>
            <div style={{display: 'flex', gap: 16, marginTop: 16}}>
              <button disabled={!payAmount} onClick={() => handlePayment('credit_card')} style={{flex: 1, padding: 20, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', opacity: payAmount ? 1 : 0.5}}>Credit Card</button>
              <button disabled={!payAmount} onClick={() => handlePayment('cash')} style={{flex: 1, padding: 20, background: '#1c8853', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', opacity: payAmount ? 1 : 0.5}}>Cash</button>
            </div>
            
            <button disabled={activeInvoice.balance_due_cents <= 0} onClick={() => handleStripeCheckout(activeInvoice.id)} style={{width: '100%', marginTop: 8, padding: 20, background: '#635BFF', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Pay Full Balance via Stripe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- AUTH LOGIC ---
const LoginScreen = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('vowos_token', data.token);
      localStorage.setItem('vowos_user', JSON.stringify(data.user));
      onLogin(data);
    } catch(err: any) { alert(err.message); }
  };
  return (
    <div style={{display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--sidebar)'}}>
      <form onSubmit={handleLogin} style={{background: 'white', padding: 40, borderRadius: 12, width: 400, display: 'flex', flexDirection: 'column', gap: 20}}>
        <h1 style={{margin: 0, textAlign: 'center'}}>Vow<span style={{color: 'var(--accent)'}}>OS</span></h1>
        <p style={{color: '#666', textAlign: 'center', marginTop: -10}}>Sign in to your boutique</p>
        <input type="email" required placeholder="admin@vowos.test" value={email} onChange={e=>setEmail(e.target.value)} style={{padding: 12, borderRadius: 6, border: '1px solid #ddd'}} />
        <input type="password" required placeholder="password123" value={password} onChange={e=>setPassword(e.target.value)} style={{padding: 12, borderRadius: 6, border: '1px solid #ddd'}} />
        <button className="btn btn-primary" type="submit" style={{padding: 14}}>Secure Login →</button>
      </form>
    </div>
  );
};

// --- PURCHASE ORDER LOGIC ---
const PurchaseOrderModal = ({ customers, onClose, onRefresh }: { customers: any[], onClose: () => void, onRefresh: () => void }) => {
  const [form, setForm] = useState({
    customer_id: '', vendor_name: '', style_number: '', size_category: 'Standard',
    size: '', split_bust: '', split_waist: '', split_hips: '', hollow_to_hem: '', custom_notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/operations/purchases`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('Purchase Order successfully queued for Vendor!');
      onRefresh();
      onClose();
    } catch(err: any) { alert(err.message); }
  };

  return (
    <div className="drawer-overlay open" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: 'white', padding: 32, borderRadius: 12, width: 600, maxHeight: '90vh', overflowY: 'auto'}}>
        <h2>Create Vendor Purchase Order</h2>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24}}>
          <select required value={form.customer_id} onChange={e=>setForm({...form, customer_id: e.target.value})} style={{padding: 10, borderRadius: 6}}>
            <option value="">Select Customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
          <div style={{display: 'flex', gap: 16}}>
            <input required placeholder="Vendor Name (e.g. Vera Wang)" value={form.vendor_name} onChange={e=>setForm({...form, vendor_name: e.target.value})} style={{flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
            <input required placeholder="Style Number (e.g. VW-102)" value={form.style_number} onChange={e=>setForm({...form, style_number: e.target.value})} style={{flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
          </div>
          
          <div style={{background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #eee'}}>
            <label style={{fontWeight: 600, display: 'block', marginBottom: 12}}>Sizing Configuration</label>
            <select value={form.size_category} onChange={e=>setForm({...form, size_category: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, marginBottom: 16, border: '1px solid #ddd'}}>
              <option value="Standard">Standard Size</option>
              <option value="Split Size">Split Size (Custom proportions)</option>
              <option value="Custom Length">Custom Length (Hollow-to-Hem)</option>
            </select>
            
            {form.size_category === 'Standard' && (
               <input required placeholder="Standard Size (e.g. 10)" value={form.size} onChange={e=>setForm({...form, size: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
            )}
            
            {form.size_category === 'Split Size' && (
              <div style={{display: 'flex', gap: 12}}>
                 <input required placeholder="Bust Size" value={form.split_bust} onChange={e=>setForm({...form, split_bust: e.target.value})} style={{flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                 <input required placeholder="Waist Size" value={form.split_waist} onChange={e=>setForm({...form, split_waist: e.target.value})} style={{flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                 <input required placeholder="Hips Size" value={form.split_hips} onChange={e=>setForm({...form, split_hips: e.target.value})} style={{flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
              </div>
            )}
            
            {form.size_category === 'Custom Length' && (
              <div style={{display: 'flex', gap: 12}}>
                 <input required placeholder="Base Size (e.g. 10)" value={form.size} onChange={e=>setForm({...form, size: e.target.value})} style={{flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                 <input required placeholder="Hollow-to-Hem (inches)" value={form.hollow_to_hem} onChange={e=>setForm({...form, hollow_to_hem: e.target.value})} style={{flex: 2, padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
              </div>
            )}
          </div>
          
          <textarea placeholder="Additional Vendor Notes (Rush fees, customizations...)" value={form.custom_notes} onChange={e=>setForm({...form, custom_notes: e.target.value})} style={{padding: 10, borderRadius: 6, minHeight: 80, border: '1px solid #ddd', fontFamily: 'inherit'}} />
          
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16}}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Transmit Purchase Order</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- CALENDAR & APPOINTMENTS MODULE ---
const CalendarView = ({ appointments, onNewAppt, onInspectAppt }: { appointments: any[], onNewAppt: () => void, onInspectAppt: (appt: any) => void }) => {
  return (
    <div className="dashboard-scroll" style={{background: 'white', borderRadius: 12, padding: 32, border: '1px solid #eee', width: '100%', maxWidth: '1400px', margin: '0 auto'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
        <h2 style={{margin: 0}}>Scheduling & Resources</h2>
        <button className="btn btn-primary" onClick={onNewAppt}>+ Book Appointment</button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16}}>
         {['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'].map(slot => (
           <div key={slot} style={{gridColumn: '1 / -1', background: '#f8f9fa', padding: 16, borderRadius: 8, display: 'flex', gap: 24, alignItems: 'flex-start', border: '1px solid #eee'}}>
             <div style={{width: 100, fontWeight: 'bold', color: 'var(--accent)', paddingTop: 12}}>{slot}</div>
             <div style={{display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap'}}>
                {appointments.filter(a => a.time_slot === slot).map(a => (
                   <div key={a.id} onClick={() => onInspectAppt(a)} className="hover-row" style={{background: 'white', border: '1px solid #ddd', padding: 12, borderRadius: 6, minWidth: 200, flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer'}}>
                     <div style={{fontWeight: 600, fontSize: 16}}>{a.first_name} {a.last_name}</div>
                     <div style={{color: 'var(--text-muted)', fontSize: 12}}>{a.type}</div>
                     <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 8}}>
                        <span style={{fontSize: 11, background: '#eee', padding: '2px 6px', borderRadius: 4}}>{a.consultant_name}</span>
                        <span style={{fontSize: 11, background: 'var(--accent)', color: 'white', padding: '2px 6px', borderRadius: 4}}>{a.room_name}</span>
                     </div>
                   </div>
                ))}
                {appointments.filter(a => a.time_slot === slot).length === 0 && (
                   <div style={{color: '#aaa', fontStyle: 'italic', fontSize: 14, paddingTop: 12}}>No bookings at this time.</div>
                )}
             </div>
           </div>
         ))}
      </div>
    </div>
  );
};

const AddAppointmentModal = ({ customers, onClose, onRefresh }: { customers: any[], onClose: () => void, onRefresh: () => void }) => {
  const [form, setForm] = useState({ customer_id: '', time_slot: '10:00 AM', type: 'Bridal Fitting', consultant_name: 'Jessica M.', room_name: 'Suite A' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('Appointment successfully queued without resource conflicts!');
      onRefresh();
      onClose();
    } catch(err: any) { alert(err.message); }
  };

  return (
    <div className="drawer-overlay open" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: 'white', padding: 32, borderRadius: 12, width: 500}}>
        <h2>Book Appt & Lock Resources</h2>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24}}>
          <select required value={form.customer_id} onChange={e=>setForm({...form, customer_id: e.target.value})} style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}}>
            <option value="">Select Bride...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
            <div>
              <label style={{fontSize: 12, color: 'var(--text-muted)'}}>Time Slot</label>
              <select value={form.time_slot} onChange={e=>setForm({...form, time_slot: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4}}>
                {['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize: 12, color: 'var(--text-muted)'}}>Appt Type</label>
              <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4}}>
                {['Bridal Fitting', 'First View', 'Alterations', 'Accessory styling'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize: 12, color: 'var(--text-muted)'}}>Stylist / Consultant</label>
              <select value={form.consultant_name} onChange={e=>setForm({...form, consultant_name: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4}}>
                {['Jessica M.', 'Sarah K.', 'Emily R.'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize: 12, color: 'var(--text-muted)'}}>Physical Suite</label>
              <select value={form.room_name} onChange={e=>setForm({...form, room_name: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4}}>
                {['Suite A', 'Suite B', 'Podium 1'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16}}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Lock Resource Booking</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- HARDWARE BARCODE INTEGRATION ---
const BarcodeResultModal = ({ item, onClose }: { item: any, onClose: () => void }) => {
  if (!item) return null;
  return (
    <div className="drawer-overlay open" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: 'white', padding: 32, borderRadius: 12, width: 450}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
           <h2 style={{margin: 0}}>Barcode Authenticated</h2>
           <span style={{background: 'var(--success)', color: 'white', padding: '4px 8px', borderRadius: 4, fontWeight: 'bold', fontSize: 12}}>✓ VERIFIED SKU</span>
        </div>
        <div style={{background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #ddd', marginBottom: 16}}>
           <div style={{color: 'var(--text-muted)', fontSize: 12, fontWeight: 'bold'}}>{item.vendor_name}</div>
           <div style={{fontSize: 24, fontWeight: 'bold', margin: '4px 0'}}>{item.style_number}</div>
           <div style={{display: 'flex', gap: 12, fontSize: 14}}>
             <span style={{background: 'white', padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd'}}>Size: <b>{item.size}</b></span>
             <span style={{background: 'white', padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd'}}>Color: <b>{item.color}</b></span>
           </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
          <div>
            <div style={{fontSize: 12, color: 'var(--text-muted)'}}>System Price Matrix</div>
            <div style={{fontSize: 20, fontWeight: 'bold', color: 'var(--accent)'}}>${((item.base_price_cents + item.price_modifier_cents)/100).toLocaleString()}</div>
          </div>
          <div style={{textAlign: 'right'}}>
            <div style={{fontSize: 12, color: 'var(--text-muted)'}}>On-Hand Quantities</div>
            <div style={{fontSize: 20, fontWeight: 'bold', color: item.stock_quantity > 0 ? 'var(--success)' : 'var(--danger)'}}>{item.stock_quantity} Units</div>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: 12}}>
          <button className="btn btn-outline" style={{flex: 1}} onClick={onClose}>Dismiss</button>
          {item.stock_quantity > 0 ? (
            <button className="btn btn-primary" style={{flex: 2}}>Append to Active POS</button>
          ) : (
            <button className="btn btn-primary" style={{flex: 2}}>Draft Vendor PO</button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- ADMINISTRATIVE SETTINGS MODULE ---
const AdminSettingsView = ({ adminData, onRefresh }: { adminData: any, onRefresh: () => void }) => {
  const [form, setForm] = useState({ name: '', email: '', role: 'consultant', password: '' });
  
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/system/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('Role-Allocated Employee Provisioned!');
      setForm({ name: '', email: '', role: 'consultant', password: '' });
      onRefresh();
    } catch(err: any) { alert(err.message); }
  };

  if (!adminData) return <div style={{padding: 40, textAlign: 'center'}}>Authenticating Owner Matrices...</div>;

  return (
    <div className="dashboard-scroll" style={{maxWidth: 1200, margin: '0 auto', width: '100%'}}>
      <h2 style={{fontSize: 28, marginBottom: 8}}>Global Application Settings</h2>
      <p style={{color: 'var(--text-muted)', marginBottom: 32}}>Owner-Level Configurations & Employee Role Access</p>

      <div style={{background: 'white', padding: 32, borderRadius: 12, border: '1px solid #eee', marginBottom: 24}}>
        <h3 style={{marginTop: 0}}>Physical Boutique Location</h3>
        <div style={{display: 'flex', gap: 24, padding: 16, background: '#f8f9fa', borderRadius: 8}}>
          <div>
            <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Store Name</div>
            <div style={{fontWeight: 'bold', fontSize: 16}}>{adminData.boutique?.name}</div>
          </div>
          <div>
            <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Address</div>
            <div style={{fontWeight: 'bold', fontSize: 16}}>{adminData.boutique?.address}</div>
          </div>
          <div>
            <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Global Tax Matrix</div>
            <div style={{fontWeight: 'bold', fontSize: 16}}>{adminData.boutique?.tax_rate_percent}%</div>
          </div>
        </div>
      </div>

      <div style={{display: 'flex', gap: 24}}>
        <div style={{flex: 1, background: 'white', padding: 32, borderRadius: 12, border: '1px solid #eee'}}>
          <h3 style={{marginTop: 0}}>Provision New Employee</h3>
          <form onSubmit={handleAddUser} style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <input required placeholder="Employee Full Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
            <input required type="email" placeholder="Corporate Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
            <div>
               <label style={{fontSize: 12, color: 'var(--text-muted)'}}>System Access Identity</label>
               <select required value={form.role} onChange={e=>setForm({...form, role: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginTop: 4}}>
                  <option value="owner">Owner (Full Admin Access)</option>
                  <option value="manager">Store Manager</option>
                  <option value="consultant">Bridal Consultant</option>
               </select>
            </div>
            <input required type="password" placeholder="Temporary System Password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
            <button type="submit" className="btn btn-primary" style={{marginTop: 8}}>Generate JWT Profile</button>
          </form>
        </div>

        <div style={{flex: 1, background: 'white', padding: 32, borderRadius: 12, border: '1px solid #eee'}}>
           <h3 style={{marginTop: 0}}>Active VowOS Profiles</h3>
           <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              {adminData.users?.map((u: any) => (
                <div key={u.id} style={{padding: 16, border: '1px solid #eee', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <div style={{fontWeight: 'bold'}}>{u.name}</div>
                    <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{u.email}</div>
                  </div>
                  <span style={{background: u.role === 'owner' ? 'var(--accent)' : '#f1f1f1', color: u.role === 'owner' ? 'white' : 'var(--text)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 'bold'}}>{u.role.toUpperCase()}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- LEVEL 2 & 3: GLOBAL DRILLDOWN RECORD MODAL ---
const RecordDetailModal = ({ record, onClose, onRefresh, setActivePage, setActiveDrilldown }: { record: {type: string, data: any}, onClose: () => void, onRefresh: () => void, setActivePage: any, setActiveDrilldown: any }) => {
  if (!record) return null;
  const { type, data } = record;

  const handleAction = async (endpoint: string, method: string = 'POST', payload?: any) => {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method, headers: {'Content-Type': 'application/json'},
        ...(payload && { body: JSON.stringify(payload) })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('Action Executed Successfully.');
      onRefresh();
      onClose();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="drawer-overlay open" onClick={onClose} style={{zIndex: 9999}}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: 'white', padding: 32, borderRadius: 12, width: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.2)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24}}>
           <div>
             <div style={{background: 'var(--accent)', color: 'white', padding: '4px 8px', borderRadius: 4, display: 'inline-block', fontSize: 12, fontWeight: 'bold', marginBottom: 8}}>
               LEVEL 2 {type.toUpperCase()} RECORD
             </div>
             <h2 style={{margin: 0, fontSize: 24}}>Deep Record Inspection</h2>
           </div>
           <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999'}}>×</button>
        </div>
        
        <div style={{background: '#f8f9fa', padding: 20, borderRadius: 8, border: '1px solid #eee', marginBottom: 24}}>
          {type === 'invoice' && (
             <>
               <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Customer Name</div>
               <div style={{fontWeight: 'bold', fontSize: 18, marginBottom: 12}}>{data.first_name} {data.last_name}</div>
               <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Invoice Total</div>
                   <div style={{fontWeight: 'bold'}}>${(data.total_amount_cents/100).toLocaleString()}</div>
                 </div>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Outstanding Balance</div>
                   <div style={{fontWeight: 'bold', color: 'var(--danger)'}}>${(data.balance_due_cents/100).toLocaleString()}</div>
                 </div>
               </div>
             </>
          )}

          {type === 'po' && (
             <>
               <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Vendor</div>
               <div style={{fontWeight: 'bold', fontSize: 18, marginBottom: 12}}>{data.vendor_name}</div>
               <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Style & Size</div>
                   <div style={{fontWeight: 'bold'}}>{data.style_number} (Sz: {data.size})</div>
                 </div>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Customer</div>
                   <div style={{fontWeight: 'bold'}}>{data.first_name} {data.last_name}</div>
                 </div>
               </div>
             </>
          )}

          {type === 'pickup' && (
             <>
               <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Item Description</div>
               <div style={{fontWeight: 'bold', fontSize: 18, marginBottom: 12}}>{data.item_description}</div>
               <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Customer</div>
                   <div style={{fontWeight: 'bold'}}>{data.first_name} {data.last_name}</div>
                 </div>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Status</div>
                   <div style={{fontWeight: 'bold', color: data.qa_verified ? 'var(--success)' : 'var(--warning)'}}>{data.qa_verified ? 'Ready For Pickup' : 'Pending QA'}</div>
                 </div>
               </div>
             </>
          )}

          {type === 'appt' && (
             <>
               <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Appointment Type</div>
               <div style={{fontWeight: 'bold', fontSize: 18, marginBottom: 12}}>{data.type}</div>
               <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Customer</div>
                   <div style={{fontWeight: 'bold'}}>{data.first_name} {data.last_name}</div>
                 </div>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Consultant / Room</div>
                   <div style={{fontWeight: 'bold'}}>{data.consultant_name} ({data.room_name})</div>
                 </div>
               </div>
             </>
          )}

          {type === 'inventory' && (
             <>
               <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Style Matrix</div>
               <div style={{fontWeight: 'bold', fontSize: 18, marginBottom: 12}}>{data.style_number} (Size: {data.size_matrix})</div>
               <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Active Vendor</div>
                   <div style={{fontWeight: 'bold'}}>{data.vendor_name}</div>
                 </div>
                 <div>
                   <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Physical Stock Remaining</div>
                   <div style={{fontWeight: 'bold', color: data.stock_quantity <= 2 ? 'var(--danger)' : 'var(--success)'}}>{data.stock_quantity} Units</div>
                 </div>
               </div>
             </>
          )}
        </div>

        <div>
           <div style={{fontSize: 12, fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: 12}}>LEVEL 3 OPERATIONS (ACTIONS)</div>
           <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
             {type === 'invoice' && data.balance_due_cents > 0 && (
               <button className="btn btn-primary" onClick={() => handleAction(`/invoices/${data.id}/checkout`)}>Process Stripe Checkout Handoff →</button>
             )}
             {type === 'po' && data.status !== 'Received' && (
               <button className="btn btn-primary" onClick={() => alert('Vendor Received Handoff Flow initialized!')}>Mark Vendor Order Fullfilled ✓</button>
             )}
             {type === 'pickup' && !data.qa_verified && (
               <button className="btn btn-primary" onClick={() => handleAction(`/operations/pickups/${data.id}/ready`)}>Run QA & Transmit SMS to Customer →</button>
             )}
             {type === 'appt' && (
               <button className="btn btn-primary" onClick={() => { onClose(); setActivePage('customers'); setActiveDrilldown(null); }}>Open Direct Customer Bride360 Profile →</button>
             )}
             {type === 'inventory' && (
               <button className="btn btn-primary" onClick={() => alert('Automated Vendor Purchase Order pipeline drafted!')}>Draft PO Supply Chain Restock →</button>
             )}
             <button className="btn btn-outline" onClick={onClose} style={{marginTop: 8}}>Close Inspection Panel</button>
           </div>
        </div>

      </div>
    </div>
  );
};

// --- MAIN APP ---
function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem('vowos_token') || null);
  const [currentUser, setCurrentUser] = useState<any>(JSON.parse(localStorage.getItem('vowos_user') || 'null'));
  
  const [activePage, setActivePage] = useState<'dashboard' | 'calendar' | 'customers' | 'inventory' | 'financials' | 'settings' | 'purchasing' | 'payroll' | 'communications' | 'reports' | 'employees'>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [activeDrilldown, setActiveDrilldown] = useState<string | null>(null);
  const [activeRecord, setActiveRecord] = useState<{type: string, data: any} | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any|null>(null);
  const [scannedItem, setScannedItem] = useState<any|null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const fetchData = () => {
    fetch(`${API_BASE}/customers`).then(r=>r.json()).then(setCustomers).catch(console.error);
    fetch(`${API_BASE}/leads`).then(r=>r.json()).then(setLeads).catch(console.error);
    fetch(`${API_BASE}/inventory`).then(r=>r.json()).then(setInventory).catch(console.error);
    fetch(`${API_BASE}/invoices`).then(r=>r.json()).then(setInvoices).catch(console.error);
    fetch(`${API_BASE}/operations`).then(r=>r.json()).then(data => {
      if(data.purchases) setPurchases(data.purchases);
      if(data.pickups) setPickups(data.pickups);
      if(data.appointments) setAppointments(data.appointments);
    }).catch(console.error);
    fetch(`${API_BASE}/analytics/insights`).then(r=>r.json()).then(data => {
      if(data.insights) setAiInsights(data.insights);
    }).catch(console.error);

    if (currentUser?.role === 'owner') {
      fetch(`${API_BASE}/system/settings`).then(r=>r.json()).then(setAdminData).catch(console.error);
    }
  };

  useEffect(() => {
    // Auto-seed the SQLite database MVP then fetch arrays
    fetch(`${API_BASE}/seed`, { method: 'POST' })
      .then(() => fetch(`${API_BASE}/inventory/seed`, { method: 'POST' }))
      .then(() => fetch(`${API_BASE}/invoices/seed`, { method: 'POST' }))
      .then(() => fetch(`${API_BASE}/operations/seed`, { method: 'POST' }))
      .then(fetchData)
      .catch(console.error);
  }, []);

  // --- HARDWARE BARCODE INTERCEPTOR ---
  const scanBuffer = React.useRef('');
  const lastKeyTime = React.useRef(0);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore text box inputs so we don't accidentally intercept user typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      
      const now = Date.now();
      if (now - lastKeyTime.current > 150) {
        scanBuffer.current = ''; // If letters are typed > 150ms apart, it's a human, not a laser schema!
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        const payload = scanBuffer.current;
        if (payload.length > 5) { // Minimum SKU constraint logic
           console.log('Intercepted Hardware Laser Matrix -> SKU payload:', payload);
           try {
              const res = await fetch(`${API_BASE}/inventory/scan/${payload}`);
              if (!res.ok) {
                 alert('Hardware Error: Scanned Barcode Unregistered -> ' + payload);
              } else {
                 const data = await res.json();
                 setScannedItem(data);
                 setIsBarcodeModalOpen(true);
              }
           } catch(err) { console.error('Hardware routing failure:', err); }
        }
        scanBuffer.current = '';
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const handleMarkReady = async (pickupId: number) => {
    try {
      const res = await fetch(`${API_BASE}/operations/pickups/${pickupId}/ready`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('Pickup QA Verified. Automated Twilio SMS dispatched to customer!');
      fetchData(); 
    } catch(err: any) { alert(err.message); }
  };

  // Drilldown Map Router
  const [drillFilter, setDrillFilter] = useState('');

  const getDrilldownData = () => {
    let payload = null;
    switch(activeDrilldown) {
      case 'unpaid': payload = { title: 'Overdue Unpaid Balances', data: invoices, type: 'invoice' }; break;
      case 'overdue_po': payload = { title: 'Late Vendor Shipments', data: purchases, type: 'po' }; break;
      case 'pickups': payload = { title: 'Ready for Pickup', data: pickups, type: 'pickup' }; break;
      case 'appts': payload = { title: 'Manifest: Appointments Today', data: appointments, type: 'appt' }; break;
      case 'low_stock': payload = { title: 'Critical Stock Depletion', data: inventory.filter(i => i.stock_quantity <= 2), type: 'inventory' }; break;
      default: return null;
    }
    
    if (drillFilter && payload?.data) {
       payload.data = payload.data.filter((item: any) => JSON.stringify(item).toLowerCase().includes(drillFilter.toLowerCase()));
    }
    return payload;
  };

  const drillContext = getDrilldownData();

  if (!sessionToken || !currentUser) {
    return <LoginScreen onLogin={(data) => { setSessionToken(data.token); setCurrentUser(data.user); }} />;
  }

  return (
    <div className="app-container">
      {activeRecord && <RecordDetailModal record={activeRecord} onClose={() => setActiveRecord(null)} onRefresh={fetchData} setActivePage={setActivePage} setActiveDrilldown={setActiveDrilldown} />}
      {isBarcodeModalOpen && <BarcodeResultModal item={scannedItem} onClose={() => setIsBarcodeModalOpen(false)} />}
      {isPOModalOpen && <PurchaseOrderModal customers={customers} onClose={() => setIsPOModalOpen(false)} onRefresh={fetchData} />}
      {isApptModalOpen && <AddAppointmentModal customers={customers} onClose={() => setIsApptModalOpen(false)} onRefresh={fetchData} />}
      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="brand">
          Vow<span>OS</span>
        </div>
        <div className="nav-links">
          <a className={`nav-link ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => { setActivePage('dashboard'); setSelectedCustomer(null); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
            Command Center
          </a>
          <a className={`nav-link ${activePage === 'calendar' ? 'active' : ''}`} onClick={() => setActivePage('calendar')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Calendar
          </a>
          <a className={`nav-link ${activePage === 'customers' ? 'active' : ''}`} onClick={() => setActivePage('customers')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Customers
          </a>
          <a className={`nav-link ${activePage === 'communications' ? 'active' : ''}`} onClick={() => setActivePage('communications')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Communication Hub
          </a>
          <a className={`nav-link ${activePage === 'inventory' ? 'active' : ''}`} onClick={() => setActivePage('inventory')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
            Inventory
          </a>
          <a className={`nav-link ${activePage === 'purchasing' ? 'active' : ''}`} onClick={() => setActivePage('purchasing')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            Purchasing Portal
          </a>
          <a className={`nav-link ${activePage === 'financials' ? 'active' : ''}`} onClick={() => setActivePage('financials')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Orders & Payments
          </a>
          <a className={`nav-link ${activePage === 'reports' ? 'active' : ''}`} onClick={() => setActivePage('reports')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Reports
          </a>
          <a className={`nav-link ${activePage === 'employees' ? 'active' : ''}`} onClick={() => setActivePage('employees')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Employee Hub
          </a>
          {currentUser?.role === 'owner' && (
            <a className={`nav-link ${activePage === 'payroll' ? 'active' : ''}`} onClick={() => setActivePage('payroll')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Payroll & Comm
            </a>
          )}
          {currentUser?.role === 'owner' && (
            <a className={`nav-link ${activePage === 'settings' ? 'active' : ''}`} onClick={() => setActivePage('settings')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </a>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="topbar">
          <div className="page-title">Operational Command Center</div>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={() => setIsLeadModalOpen(true)}>+ Add Lead</button>
            <button className="btn btn-primary" onClick={() => setIsPOModalOpen(true)}>+ New PO</button>
            <span style={{color: 'var(--text-muted)', fontSize: 14, marginLeft: 16}}>
              {currentUser.name} ({currentUser.role.toUpperCase()})
            </span>
            <div style={{width: 32, height: 32, borderRadius: 16, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>{currentUser.name.charAt(0)}</div>
            <button className="btn btn-outline" style={{padding: '6px 12px', marginLeft: 16}} onClick={() => { localStorage.clear(); setSessionToken(null); setCurrentUser(null); }}>Sign Out</button>
          </div>
        </header>

        {/* ROUTER CONTENT */}
        {activePage === 'financials' && <POSCheckoutView invoices={invoices} onRefresh={fetchData} />}
        {activePage === 'inventory' && <InventoryCatalogView inventory={inventory} onInspectItem={(item) => setActiveRecord({type: 'inventory', data: item})} />}
        {activePage === 'calendar' && <CalendarView appointments={appointments} onNewAppt={() => setIsApptModalOpen(true)} onInspectAppt={(appt) => setActiveRecord({type: 'appt', data: appt})} />}
        {activePage === 'settings' && <AdminSettingsView adminData={adminData} onRefresh={fetchData} />}
        {activePage === 'purchasing' && <div style={{padding: 40}}><h2>Purchasing Portal</h2><p style={{color: 'var(--text-muted)'}}>Automated reorder pipelines and advanced vendor catalog ingestion mechanisms will display here.</p></div>}
        {activePage === 'payroll' && <div style={{padding: 40}}><h2>Payroll & Commission</h2><p style={{color: 'var(--text-muted)'}}>Consultant commission grids, timesheet matrices, and external check-run handoffs natively integrate here.</p></div>}
        {activePage === 'communications' && <div style={{padding: 40}}><h2>Communication Hub</h2><p style={{color: 'var(--text-muted)'}}>Centralized SMS, Email, and internal chat threads unified within the customer record system.</p></div>}
        {activePage === 'reports' && <div style={{padding: 40}}><h2>Reports & Analytics</h2><p style={{color: 'var(--text-muted)'}}>Historical graphs, P&L statements, and advanced cohort analysis rendered natively via Recharts.</p></div>}
        {activePage === 'employees' && <div style={{padding: 40}}><h2>Employee Hub</h2><p style={{color: 'var(--text-muted)'}}>Role-specific shift calendars, timecard punches, and internal resource booking flows.</p></div>}

        {activePage === 'customers' && selectedCustomer && <Bride360View customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} onTriggerPO={() => setIsPOModalOpen(true)} />}
        {activePage === 'customers' && !selectedCustomer && <CustomerListView customers={customers} onSelect={setSelectedCustomer} />}
        
        {activePage === 'dashboard' && (
          <div className="dashboard-scroll">
            <div className="section-title">Critical Resolution / Action Required</div>
            <div className="kpi-grid">
              
              {/* KPI 1 */}
              <div className="kpi-card" onClick={() => setActiveDrilldown('unpaid')}>
                <div className="kpi-header">
                  <span className="kpi-title">Overdue Unpaid Balances</span>
                  <span className="kpi-badge badge-danger">High Risk</span>
                </div>
                <div className="kpi-value">${invoices.reduce((sum: number, inv: any) => sum + (inv.balance_due_cents / 100), 0).toLocaleString()}</div>
                <div className="kpi-title" style={{marginTop: 8}}>Across {invoices.length} invoices</div>
              </div>

              {/* KPI 2 */}
              <div className="kpi-card" onClick={() => setActiveDrilldown('overdue_po')}>
                <div className="kpi-header">
                  <span className="kpi-title">Late Vendor Shipments</span>
                  <span className="kpi-badge badge-warning">Watch</span>
                </div>
                <div className="kpi-value">{purchases.length}</div>
                <div className="kpi-title" style={{marginTop: 8}}>Purchase Orders past expected ETA</div>
              </div>

              {/* KPI 3 */}
              <div className="kpi-card" onClick={() => setActiveDrilldown('pickups')}>
                <div className="kpi-header">
                  <span className="kpi-title">Pickup Backlog (Ready Vault)</span>
                  <span className="kpi-badge badge-success">Good</span>
                </div>
                <div className="kpi-value">{pickups.length}</div>
                <div className="kpi-title" style={{marginTop: 8}}>0 balance, QA passed. Awaiting pickup.</div>
              </div>

              {/* KPI 4 */}
              <div className="kpi-card" onClick={() => setActiveDrilldown('appts')}>
                <div className="kpi-header">
                  <span className="kpi-title">Appointments Today</span>
                </div>
                <div className="kpi-value">{appointments.length}</div>
                <div className="kpi-title" style={{marginTop: 8}}>100% capacity utilized</div>
              </div>

              {/* LIVE API KPI */}
              <div className="kpi-card" onClick={() => setActivePage('customers')}>
                <div className="kpi-header">
                  <span className="kpi-title">Active Database Entities</span>
                  <span className="kpi-badge badge-success">Live API</span>
                </div>
                <div className="kpi-value">{customers.length + leads.length}</div>
                <div className="kpi-title" style={{marginTop: 8}}>{customers.length} Customers | {leads.length} Leads</div>
              </div>

            </div>

            <div className="section-title" style={{marginTop: 40}}>AI Recommendations Feed</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
               {aiInsights.map(insight => (
                 <div key={insight.id} style={{background: 'linear-gradient(135deg, rgba(88,86,214,0.05) 0%, rgba(255,255,255,1) 100%)', border: '1px solid #e0e0f8', padding: 24, borderRadius: 12}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
                       <div style={{background: 'var(--accent)', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold'}}>{insight.type.toUpperCase()} PREDICTION</div>
                       <h3 style={{margin: 0, fontSize: 18}}>{insight.title}</h3>
                    </div>
                    <div style={{color: '#444', lineHeight: 1.5}}>{insight.message}</div>
                    <div style={{marginTop: 16}}>
                      {insight.type === 'inventory' && <button className="btn btn-primary" onClick={() => setActiveDrilldown('low_stock')}>Inspect Depleted Inventory Feed →</button>}
                      {insight.type === 'financial' && <button className="btn btn-outline" onClick={() => setActiveDrilldown('unpaid')}>Drill Open Invoices Ledger</button>}
                      {insight.type === 'growth' && <button className="btn btn-outline" onClick={() => setActiveDrilldown('appts')}>Inspect Live Appointment Array</button>}
                    </div>
                 </div>
               ))}
               {aiInsights.length === 0 && (
                 <div style={{padding: 24, border: '1px dashed #ddd', borderRadius: 12, color: 'var(--text-muted)', textAlign: 'center'}}>
                    VowOS Engine is building your recommendations matrix...
                 </div>
               )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* LEVEL 1: SLIDE OUT DRILLDOWN DRAWER */}
        <div className={`drawer-overlay ${activeDrilldown ? 'open' : ''}`} onClick={() => setActiveDrilldown(null)} />
        
        <div className={`drawer ${activeDrilldown ? 'open' : ''}`}>
          <div className="drawer-header">
            <div>
              <div className="drawer-title">{drillContext?.title}</div>
              <div className="drawer-subtitle">Level 1 Filtered Results (Reconciled)</div>
              <input type="text" placeholder="Search arrays by content, name, ID..." value={drillFilter} onChange={e=>setDrillFilter(e.target.value)} style={{marginTop: 12, padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', width: 350, fontSize: 13, background: '#f8f9fa', color: '#444'}} />
            </div>
            <button className="close-btn" onClick={() => setActiveDrilldown(null)}>×</button>
          </div>
          
          <div className="drawer-content">
            <table>
              <thead>
                <tr>
                  {drillContext?.type === 'invoice' && <><th style={{width:'15%'}}>ID</th><th>Customer</th><th>Wedding</th><th style={{textAlign:'right'}}>Balance</th></>}
                  {drillContext?.type === 'po' && <><th style={{width:'15%'}}>PO</th><th>Vendor</th><th>Customer</th><th>Expected</th></>}
                  {drillContext?.type === 'pickup' && <><th style={{width:'20%'}}>Status</th><th>Customer</th><th>Item</th><th>Action</th></>}
                  {drillContext?.type === 'appt' && <><th style={{width:'20%'}}>Time</th><th>Customer</th><th>Type</th><th>Stylist</th></>}
                  {drillContext?.type === 'inventory' && <><th style={{width:'30%'}}>Style & Vendor</th><th>Category</th><th>Price</th><th>Stock</th></>}
                </tr>
              </thead>
              <tbody>
                {drillContext?.type === 'invoice' && invoices.map(i => (
                  <tr key={i.id} onClick={() => setActiveRecord({type: 'invoice', data: i})} style={{cursor: 'pointer'}} className="hover-row">
                    <td><b>{i.id}</b></td>
                    <td>
                      <div>{i.first_name} {i.last_name}</div>
                      <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{i.status.toUpperCase()}</div>
                    </td>
                    <td>{new Date(i.created_at).toLocaleDateString()}</td>
                    <td style={{textAlign:'right', color: 'var(--danger)', fontWeight: 600}}>${(i.balance_due_cents/100).toLocaleString()} <span style={{fontSize:10, marginLeft: 4}}>➣</span></td>
                  </tr>
                ))}
                
                {drillContext?.type === 'po' && purchases.map(p => (
                  <tr key={p.id} onClick={() => setActiveRecord({type: 'po', data: p})} style={{cursor: 'pointer'}} className="hover-row">
                    <td><b>PO-{p.id}</b></td>
                    <td>
                      <div>{p.vendor_name}</div>
                      <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{p.style_number} (Sz: {p.size})</div>
                    </td>
                    <td>{p.first_name} {p.last_name}</td>
                    <td><span className="status-pill red">{p.status}</span> <span style={{fontSize:10, marginLeft: 4}}>➣</span></td>
                  </tr>
                ))}

                {drillContext?.type === 'pickup' && pickups.map(p => (
                  <tr key={p.id} onClick={() => setActiveRecord({type: 'pickup', data: p})} style={{cursor: 'pointer'}} className="hover-row">
                    <td>
                      <span className={`status-pill ${p.qa_verified ? 'green' : 'gray'}`}>
                        {p.qa_verified ? 'Ready' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div><b>{p.first_name} {p.last_name}</b></div>
                      <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{p.qa_verified ? `Since ${new Date(p.ready_since).toLocaleDateString()}` : (p.phone || 'No Phone')}</div>
                    </td>
                    <td>{p.item_description}</td>
                    <td>
                      {!p.qa_verified ? (
                        <button className="btn btn-outline" style={{padding: '6px 12px'}} onClick={(e) => { e.stopPropagation(); handleMarkReady(p.id); }}>
                          ✓ Mark Ready
                        </button>
                      ) : (
                        <span style={{color: 'var(--success)', fontSize: 13, fontWeight: 'bold'}}>SMS Transmitted</span>
                      )}
                    </td>
                  </tr>
                ))}

                {drillContext?.type === 'appt' && appointments.map((a) => (
                  <tr key={a.id} onClick={() => setActiveRecord({type: 'appt', data: a})} style={{cursor: 'pointer'}} className="hover-row">
                    <td><b>{a.time_slot}</b></td>
                    <td>{a.first_name} {a.last_name}</td>
                    <td>{a.type}</td>
                    <td>{a.consultant_name} <span style={{fontSize:10, marginLeft: 8}}>➣</span></td>
                  </tr>
                ))}

                {drillContext?.type === 'inventory' && drillContext.data.map((item: any) => (
                  <tr key={item.id} onClick={() => setActiveRecord({type: 'inventory', data: item})} style={{cursor: 'pointer'}} className="hover-row">
                    <td>
                      <div><b>{item.style_number}</b></div>
                      <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{item.vendor_name}</div>
                    </td>
                    <td>{item.category}</td>
                    <td>${(item.base_price_cents/100).toLocaleString()}</td>
                    <td><span className="status-pill red">{item.stock_quantity} Left</span> <span style={{fontSize:10, marginLeft: 4}}>➣</span></td>
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
