

export const MarketingCampaignsView = () => (
  <div className="dashboard-scroll" style={{maxWidth: 1200, margin: '0 auto', width: '100%', padding: '24px 32px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32}}>
      <div>
        <h2 style={{fontSize: 28, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-dark)'}}>Marketing Campaigns</h2>
        <p style={{color: '#666', margin: '4px 0 0'}}>Manage and track your SMS and Email blast performance.</p>
      </div>
      <button style={{background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer'}}>
        + New Campaign
      </button>
    </div>
    <div style={{background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
      <div style={{display: 'flex', gap: 24, marginBottom: 24}}>
        <div style={{flex: 1, padding: 20, background: '#f8f9fa', borderRadius: 8}}>
          <div style={{fontSize: 14, color: '#666'}}>Total Sent (30d)</div>
          <div style={{fontSize: 24, fontWeight: 'bold', marginTop: 8}}>12,450</div>
        </div>
        <div style={{flex: 1, padding: 20, background: '#f8f9fa', borderRadius: 8}}>
          <div style={{fontSize: 14, color: '#666'}}>Avg Open Rate</div>
          <div style={{fontSize: 24, fontWeight: 'bold', marginTop: 8}}>42.8%</div>
        </div>
        <div style={{flex: 1, padding: 20, background: '#f8f9fa', borderRadius: 8}}>
          <div style={{fontSize: 14, color: '#666'}}>Conversions</div>
          <div style={{fontSize: 24, fontWeight: 'bold', marginTop: 8}}>384</div>
        </div>
      </div>
      <p style={{color: '#888', textAlign: 'center', margin: '40px 0'}}>No active campaigns this week.</p>
    </div>
  </div>
);

export const MarketingEmailBuilderView = () => (
  <div className="dashboard-scroll" style={{maxWidth: 1200, margin: '0 auto', width: '100%', padding: '24px 32px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32}}>
      <div>
        <h2 style={{fontSize: 28, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-dark)'}}>Email Builder</h2>
        <p style={{color: '#666', margin: '4px 0 0'}}>Design beautiful, responsive HTML emails with our drag-and-drop editor.</p>
      </div>
    </div>
    <div style={{display: 'flex', gap: 24, height: 600}}>
      <div style={{flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ddd'}}>
        <div style={{textAlign: 'center', color: '#999'}}>
          <div style={{fontSize: 48, marginBottom: 16}}>✉️</div>
          Drag blocks here to build your email
        </div>
      </div>
      <div style={{width: 300, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 20}}>
        <h3 style={{marginTop: 0}}>Components</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20}}>
          <div style={{padding: '12px 16px', background: '#f0f0f0', borderRadius: 6, cursor: 'grab'}}>Header Image</div>
          <div style={{padding: '12px 16px', background: '#f0f0f0', borderRadius: 6, cursor: 'grab'}}>Text Block</div>
          <div style={{padding: '12px 16px', background: '#f0f0f0', borderRadius: 6, cursor: 'grab'}}>Button CTA</div>
          <div style={{padding: '12px 16px', background: '#f0f0f0', borderRadius: 6, cursor: 'grab'}}>Product Grid</div>
        </div>
      </div>
    </div>
  </div>
);

export const MarketingAutomationsView = () => (
  <div className="dashboard-scroll" style={{maxWidth: 1200, margin: '0 auto', width: '100%', padding: '24px 32px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32}}>
      <div>
        <h2 style={{fontSize: 28, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-dark)'}}>Automations</h2>
        <p style={{color: '#666', margin: '4px 0 0'}}>Set up trigger-based messaging workflows.</p>
      </div>
      <button style={{background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer'}}>
        + Create Workflow
      </button>
    </div>
    <div style={{background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
      <div style={{padding: 16, border: '1px solid #eee', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <strong style={{display: 'block', fontSize: 16}}>Appointment Reminder</strong>
          <span style={{color: '#666', fontSize: 13}}>Sends SMS 24h before appointment</span>
        </div>
        <div style={{background: '#e6f4ea', color: '#137333', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 'bold'}}>ACTIVE</div>
      </div>
      <div style={{padding: 16, border: '1px solid #eee', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <strong style={{display: 'block', fontSize: 16}}>Gown Arrival Notification</strong>
          <span style={{color: '#666', fontSize: 13}}>Sends Email when inventory status changes to Received</span>
        </div>
        <div style={{background: '#e6f4ea', color: '#137333', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 'bold'}}>ACTIVE</div>
      </div>
    </div>
  </div>
);

export const FinanceExpensesView = () => (
  <div className="dashboard-scroll" style={{maxWidth: 1200, margin: '0 auto', width: '100%', padding: '24px 32px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32}}>
      <div>
        <h2 style={{fontSize: 28, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-dark)'}}>Expenses & Payouts</h2>
        <p style={{color: '#666', margin: '4px 0 0'}}>Track vendor payments, rent, and operational costs.</p>
      </div>
      <button style={{background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer'}}>
        + Log Expense
      </button>
    </div>
    <div style={{background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
      <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
        <thead>
          <tr style={{borderBottom: '2px solid #eee'}}>
            <th style={{padding: '12px 8px', color: '#888'}}>Date</th>
            <th style={{padding: '12px 8px', color: '#888'}}>Category</th>
            <th style={{padding: '12px 8px', color: '#888'}}>Description</th>
            <th style={{padding: '12px 8px', color: '#888'}}>Amount</th>
            <th style={{padding: '12px 8px', color: '#888'}}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{borderBottom: '1px solid #eee'}}>
            <td style={{padding: '16px 8px'}}>Jul 12, 2026</td>
            <td style={{padding: '16px 8px'}}>Inventory</td>
            <td style={{padding: '16px 8px'}}>Vendor Purchase Order #1004</td>
            <td style={{padding: '16px 8px', fontWeight: 'bold'}}>$4,200.00</td>
            <td style={{padding: '16px 8px'}}><span style={{background: '#e6f4ea', color: '#137333', padding: '4px 8px', borderRadius: 4, fontSize: 12}}>PAID</span></td>
          </tr>
          <tr style={{borderBottom: '1px solid #eee'}}>
            <td style={{padding: '16px 8px'}}>Jul 01, 2026</td>
            <td style={{padding: '16px 8px'}}>Operations</td>
            <td style={{padding: '16px 8px'}}>Monthly Rent</td>
            <td style={{padding: '16px 8px', fontWeight: 'bold'}}>$3,500.00</td>
            <td style={{padding: '16px 8px'}}><span style={{background: '#e6f4ea', color: '#137333', padding: '4px 8px', borderRadius: 4, fontSize: 12}}>PAID</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

export const FinanceTaxSettingsView = () => (
  <div className="dashboard-scroll" style={{maxWidth: 1200, margin: '0 auto', width: '100%', padding: '24px 32px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32}}>
      <div>
        <h2 style={{fontSize: 28, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-dark)'}}>Tax Settings</h2>
        <p style={{color: '#666', margin: '4px 0 0'}}>Configure nexus, automated rates, and tax overrides.</p>
      </div>
      <button style={{background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer'}}>
        Save Settings
      </button>
    </div>
    <div style={{background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', maxWidth: 600}}>
      <div style={{marginBottom: 24}}>
        <label style={{display: 'block', fontWeight: 600, marginBottom: 8}}>Default Sales Tax Rate (%)</label>
        <input type="text" defaultValue="8.25" style={{width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16}} />
      </div>
      <div style={{marginBottom: 24}}>
        <label style={{display: 'block', fontWeight: 600, marginBottom: 8}}>Tax Calculation Engine</label>
        <select style={{width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 16}}>
          <option>VowOS Native Tax Engine</option>
          <option>Avalara Integration (Active)</option>
          <option>Stripe Tax</option>
        </select>
      </div>
      <div style={{marginBottom: 24}}>
        <label style={{display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'}}>
          <input type="checkbox" defaultChecked style={{width: 18, height: 18}} />
          <span style={{fontWeight: 600}}>Automatically charge tax on Shipping & Delivery</span>
        </label>
      </div>
    </div>
  </div>
);
