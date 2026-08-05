import React, { useState } from 'react';

const TAB_OPTIONS = [
  { id: 'boutique', label: 'Boutique Profile' },
  { id: 'rules', label: 'Business Rules' },
  { id: 'team', label: 'Team Management' },
  { id: 'alerts', label: 'Automations & Alerts' },
  { id: 'integrations', label: 'Integrations' }
];

export const SettingsModule = ({ adminData, onRefresh, API_BASE }: { adminData: any, onRefresh: () => void, API_BASE: string }) => {
  const [activeTab, setActiveTab] = useState('boutique');
  const [rules, setRules] = useState(adminData?.business_rules || {
    taxRate: 8.25,
    depositPercent: 50,
    returnDays: 14,
    apptDurationFitting: 90,
    apptDurationAlt: 60,
    lowStockThreshold: 3,
    smsAlerts: true,
    emailReceipts: true
  });
  
  const [form, setForm] = useState({ name: '', email: '', role: 'consultant', password: '' });

  const handleSaveRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/system/settings/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('Global Business Rules have been updated and synced to the database!');
      onRefresh();
    } catch (err: any) { alert(err.message); }
  };

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
    <div className="dashboard-scroll" style={{maxWidth: 1400, margin: '0 auto', width: '100%', height: '80vh', display: 'flex', flexDirection: 'column'}}>
      <div style={{marginBottom: 24}}>
         <h2 style={{fontSize: 28, margin: 0}}>Global Business Settings</h2>
         <p style={{color: 'var(--text-muted)', margin: '4px 0 0 0'}}>Configure master rules, provision access, and link integrations.</p>
      </div>

      <div style={{display: 'flex', gap: 32, flex: 1, minHeight: 0}}>
        {/* SIDE BAR NAVIGATION */}
        <div style={{width: 250, background: 'white', borderRadius: 12, border: '1px solid #eee', padding: 16, height: 'fit-content'}}>
           {TAB_OPTIONS.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px', marginBottom: 8, 
                  borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 'bold',
                  background: activeTab === tab.id ? '#f0f7ff' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)'
                }}>
                {tab.label}
              </button>
           ))}
        </div>

        {/* CONTENT AREA */}
        <div style={{flex: 1, background: 'white', borderRadius: 12, border: '1px solid #eee', padding: 32, overflowY: 'auto'}}>
           
           {activeTab === 'boutique' && (
              <div className="fade-in">
                 <h3 style={{marginTop: 0, marginBottom: 24, fontSize: 20}}>Boutique Identity & Localization</h3>
                 <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
                    <div>
                      <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>Registered Store Name</label>
                      <input disabled value={adminData.boutique?.name || 'VowOS Flagship Studio'} style={{width: '100%', padding: 12, borderRadius: 6, border: '1px solid #ddd', background: '#f8f9fa'}} />
                    </div>
                    <div>
                      <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>Support Email</label>
                      <input disabled value="hello@vowos.test" style={{width: '100%', padding: 12, borderRadius: 6, border: '1px solid #ddd', background: '#f8f9fa'}} />
                    </div>
                    <div style={{gridColumn: '1 / -1'}}>
                      <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>Physical Primary Address</label>
                      <input disabled value={adminData.boutique?.address || '123 Bridal Ave, NY'} style={{width: '100%', padding: 12, borderRadius: 6, border: '1px solid #ddd', background: '#f8f9fa'}} />
                    </div>
                 </div>
                 <hr style={{margin: '32px 0', border: 'none', borderTop: '1px solid #eee'}} />
                 <h3 style={{marginTop: 0, marginBottom: 24, fontSize: 20}}>Localization</h3>
                 <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
                    <div>
                      <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>Base Currency</label>
                      <select disabled style={{width: '100%', padding: 12, borderRadius: 6, border: '1px solid #ddd', background: '#f8f9fa'}}><option>USD - US Dollar ($)</option></select>
                    </div>
                    <div>
                      <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>System Timezone</label>
                      <select disabled style={{width: '100%', padding: 12, borderRadius: 6, border: '1px solid #ddd', background: '#f8f9fa'}}><option>America/New_York (EST)</option></select>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'rules' && (
              <div className="fade-in">
                 <h3 style={{marginTop: 0, marginBottom: 24, fontSize: 20}}>Global Business Parameters</h3>
                 
                 <div style={{background: '#f8f9fa', padding: 24, borderRadius: 8, border: '1px solid #eee', marginBottom: 24}}>
                   <h4 style={{margin: '0 0 16px 0'}}>Financial Engine Engine Rules</h4>
                   <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
                      <div>
                        <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>Global Tax Rate (%)</label>
                        <input type="number" step="0.01" value={rules.taxRate} onChange={e=>setRules({...rules, taxRate: parseFloat(e.target.value)})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                      </div>
                      <div>
                        <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>Standard Deposit Req. (%)</label>
                        <input type="number" step="1" value={rules.depositPercent} onChange={e=>setRules({...rules, depositPercent: parseInt(e.target.value)})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                      </div>
                      <div>
                        <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>Return Window (Days)</label>
                        <input type="number" step="1" value={rules.returnDays} onChange={e=>setRules({...rules, returnDays: parseInt(e.target.value)})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                      </div>
                   </div>
                 </div>

                 <div style={{background: '#f8f9fa', padding: 24, borderRadius: 8, border: '1px solid #eee'}}>
                   <h4 style={{margin: '0 0 16px 0'}}>Scheduling Allowances</h4>
                   <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                      <div>
                        <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>Bridal Fitting Duration (Mins)</label>
                        <input type="number" step="15" value={rules.apptDurationFitting} onChange={e=>setRules({...rules, apptDurationFitting: parseInt(e.target.value)})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                      </div>
                      <div>
                        <label style={{display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4}}>Alteration Duration (Mins)</label>
                        <input type="number" step="15" value={rules.apptDurationAlt} onChange={e=>setRules({...rules, apptDurationAlt: parseInt(e.target.value)})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                      </div>
                   </div>
                 </div>

                 <button className="btn btn-primary" onClick={handleSaveRules} style={{marginTop: 24, padding: '12px 24px', fontSize: 16}}>
                    💾 Save & Sync Business Rules
                 </button>
              </div>
           )}

           {activeTab === 'team' && (
              <div className="fade-in" style={{display: 'flex', gap: 32}}>
                <div style={{flex: 1}}>
                  <h3 style={{marginTop: 0, marginBottom: 24, fontSize: 20}}>Active VowOS Profiles</h3>
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

                <div style={{flex: 1, background: '#f8f9fa', padding: 24, borderRadius: 8, border: '1px solid #eee', height: 'fit-content'}}>
                  <h3 style={{marginTop: 0, marginBottom: 16}}>Provision Access</h3>
                  <form onSubmit={handleAddUser} style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                    <input required placeholder="Employee Full Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                    <input required type="email" placeholder="Corporate Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                    <div>
                      <select required value={form.role} onChange={e=>setForm({...form, role: e.target.value})} style={{width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd'}}>
                          <option value="owner">Owner (Full Admin Access)</option>
                          <option value="manager">Store Manager</option>
                          <option value="consultant">Bridal Consultant</option>
                      </select>
                    </div>
                    <input required type="password" placeholder="Temporary System Password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} style={{padding: 10, borderRadius: 6, border: '1px solid #ddd'}} />
                    <button type="submit" className="btn btn-primary" style={{marginTop: 8}}>Generate JWT Auth</button>
                  </form>
                </div>
              </div>
           )}

           {activeTab === 'alerts' && (
              <div className="fade-in">
                 <h3 style={{marginTop: 0, marginBottom: 24, fontSize: 20}}>Automations & Notifications</h3>
                 
                 <div style={{background: '#f8f9fa', padding: 24, borderRadius: 8, border: '1px solid #eee', marginBottom: 24}}>
                   <h4 style={{margin: '0 0 16px 0'}}>Inventory Safeguards</h4>
                   <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                     <label style={{fontSize: 14, fontWeight: 'bold'}}>Low Stock Matrix Threshold trigger (Units):</label>
                     <input type="number" value={rules.lowStockThreshold} onChange={e=>setRules({...rules, lowStockThreshold: parseInt(e.target.value)})} style={{width: 80, padding: 8, borderRadius: 6, border: '1px solid #ddd'}} />
                   </div>
                   <p style={{fontSize: 12, color: 'var(--text-muted)', marginTop: 8}}>Any live SKU that dips below this physical quantity count will trigger a critical Level 2 Dashboard alert.</p>
                 </div>

                 <div style={{background: '#f8f9fa', padding: 24, borderRadius: 8, border: '1px solid #eee'}}>
                   <h4 style={{margin: '0 0 16px 0'}}>Customer Communications</h4>
                   <label style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, cursor: 'pointer'}}>
                     <input type="checkbox" checked={rules.smsAlerts} onChange={e=>setRules({...rules, smsAlerts: e.target.checked})} style={{width: 20, height: 20}} />
                     <div>
                       <div style={{fontWeight: 'bold'}}>Twilio SMS Appt Reminders</div>
                       <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Dispatch automated texts 24 hours prior to scheduled fittings.</div>
                     </div>
                   </label>
                   <label style={{display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'}}>
                     <input type="checkbox" checked={rules.emailReceipts} onChange={e=>setRules({...rules, emailReceipts: e.target.checked})} style={{width: 20, height: 20}} />
                     <div>
                       <div style={{fontWeight: 'bold'}}>SendGrid Financial Receipts</div>
                       <div style={{fontSize: 12, color: 'var(--text-muted)'}}>Instantly transmit beautifully coded HTML invoices to customers upon POS checkout completion.</div>
                     </div>
                   </label>
                 </div>

                 <button className="btn btn-primary" onClick={handleSaveRules} style={{marginTop: 24, padding: '12px 24px', fontSize: 16}}>
                    💾 Save Automation Rules
                 </button>
              </div>
           )}

           {activeTab === 'integrations' && (
              <div className="fade-in">
                 <h3 style={{marginTop: 0, marginBottom: 24, fontSize: 20}}>External API Integrations</h3>
                 
                 <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
                    <div style={{border: '1px solid #ddd', borderLeft: '4px solid #635bff', padding: 24, borderRadius: 8}}>
                       <h4 style={{margin: '0 0 8px 0'}}>Stripe Payment Gateway</h4>
                       <p style={{fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px 0'}}>Powers your POS card terminals and Invoice payment pages.</p>
                       <div style={{background: '#e6f2ff', color: '#0056b3', padding: '8px 12px', borderRadius: 4, display: 'inline-block', fontSize: 13, fontWeight: 'bold'}}>STATUS: CONNECTED (LIVE MODE)</div>
                    </div>

                    <div style={{border: '1px solid #ddd', borderLeft: '4px solid #2ca01c', padding: 24, borderRadius: 8}}>
                       <h4 style={{margin: '0 0 8px 0'}}>QuickBooks Online</h4>
                       <p style={{fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px 0'}}>Bi-directional sync of GL accounts and Revenue streams.</p>
                       <button className="btn btn-outline">Connect via Intuit Auth →</button>
                    </div>

                    <div style={{border: '1px solid #ddd', borderLeft: '4px solid #e25933', padding: 24, borderRadius: 8}}>
                       <h4 style={{margin: '0 0 8px 0'}}>Gusto Payroll Systems</h4>
                       <p style={{fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px 0'}}>Transmits consultant commissions directly into external paycheck runs.</p>
                       <button className="btn btn-outline">Connect Gusto Workspace →</button>
                    </div>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
};
