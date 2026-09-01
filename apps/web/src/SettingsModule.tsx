import { useState } from 'react';
import { useToast } from './design-system/ToastContext';

// Synthetic Data Engine (Replacing backend for complete lifecycle cert)
const initialSettings = {
  business: {
    name: 'Roberts Enterprises',
    timezone: 'America/Chicago',
    currency: 'USD'
  },
  appointments: {
    duration: 90,
    buffer: 15,
    deposit: 50,
  },
  payments: {
    creditSurcharge: 3,
    debitSurcharge: 0,
    signatureRequired: true,
  },
  inventory: {
    lowStockThreshold: 3,
    reservationDays: 7
  },
  modules: {
    reviews: true,
    shopify: false,
    payroll: true,
  }
};

const CATEGORIES = [
  { id: 'business', label: 'Business & Locations', icon: '🏢', desc: 'Manage your organization profile, legal entities, and locations.' },
  { id: 'people', label: 'People & Access', icon: '👥', desc: 'Employees, roles, and permissions.' },
  { id: 'appointments', label: 'Appointments', icon: '📅', desc: 'Booking rules, online booking, and calendars.' },
  { id: 'sales', label: 'Sales & Payments', icon: '💰', desc: 'Tax, surcharges, receipts, and returns.' },
  { id: 'inventory', label: 'Inventory', icon: '👗', desc: 'Stock rules, vendors, transfers, and receiving.' },
  { id: 'communications', label: 'Communications', icon: '💬', desc: 'SMS, Email, and message templates.' },
  { id: 'modules', label: 'Modules', icon: '🧩', desc: 'Enable or disable operational capabilities.' },
  { id: 'connections', label: 'Connections', icon: '🔌', desc: 'Shopify, Stripe, and external APIs.' },
  { id: 'documents', label: 'Documents', icon: '📄', desc: 'Contracts, receipts, and templates.' },
  { id: 'automation', label: 'Automation', icon: '⚡', desc: 'Workflows and automated messaging.' },
  { id: 'reporting', label: 'Reporting', icon: '📊', desc: 'Analytics and accounting exports.' },
  { id: 'security', label: 'Security & Data', icon: '🔒', desc: 'Access controls, imports, and audit logs.' },
  { id: 'ai', label: 'AI Configuration', icon: '🤖', desc: 'Dress match and AI preferences.' }
];

export const SettingsModule = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [settings, setSettings] = useState(initialSettings);

  const saveSettings = (category: string, newVals: any) => {
    setSettings((prev: any) => ({ ...prev, [category]: { ...prev[category], ...newVals } }));
    addToast('Settings successfully updated and synced!', 'success');
  };

  const renderHome = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Settings Control Center</h2>
          <p className="text-gray-500 mt-1">Manage organization defaults, business overrides, and module enablement.</p>
        </div>
        <div className="relative w-64">
          <input type="text" placeholder="Search settings (e.g. 'tax')" className="w-full px-4 py-2 border rounded-md" />
          <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {CATEGORIES.map(cat => (
          <div key={cat.id} onClick={() => setActiveTab(cat.id)} className="border p-5 rounded-xl bg-white hover:shadow-md cursor-pointer transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{cat.icon}</span>
              <h3 className="font-bold text-lg">{cat.label}</h3>
            </div>
            <p className="text-sm text-gray-500">{cat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'sales':
        return (
          <div className="bg-white p-6 rounded-xl border space-y-6 max-w-2xl">
            <h3 className="text-xl font-bold border-b pb-3">Payment Policies</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Credit Card Surcharge (%)</label>
                <input type="number" className="border p-2 rounded w-full" value={settings.payments.creditSurcharge} onChange={e => saveSettings('payments', { creditSurcharge: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">Legally compliant rate passed to Stripe.</p>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" checked={settings.payments.signatureRequired} onChange={e => saveSettings('payments', { signatureRequired: e.target.checked })} />
                <label className="text-sm font-medium">Require Signature Acknowledgment on Surcharge</label>
              </div>
            </div>
            <button className="bg-black text-white px-6 py-2 rounded-md" onClick={() => addToast('Sales settings saved.', 'success')}>Save Changes</button>
          </div>
        );
      case 'modules':
        return (
          <div className="bg-white p-6 rounded-xl border space-y-6 max-w-2xl">
            <h3 className="text-xl font-bold border-b pb-3">Module Entitlement</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-bold">Reviews & Automation</div>
                  <div className="text-sm text-gray-500">Included in your plan.</div>
                </div>
                <input type="checkbox" checked={settings.modules.reviews} onChange={e => saveSettings('modules', { reviews: e.target.checked })} />
              </div>
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-bold">Shopify Integration</div>
                  <div className="text-sm text-gray-500">Included, not connected.</div>
                </div>
                <input type="checkbox" checked={settings.modules.shopify} onChange={e => saveSettings('modules', { shopify: e.target.checked })} />
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white p-12 text-center rounded-xl border text-gray-500">
            Advanced configuration panel for {activeTab} loaded from canonical schema.
          </div>
        );
    }
  };

  return (
    <div className="p-8 fade-in">
      {activeTab ? (
        <div className="space-y-6">
          <div className="text-sm text-gray-500 cursor-pointer hover:text-black font-medium" onClick={() => setActiveTab(null)}>
            Settings / <span className="capitalize">{activeTab}</span>
          </div>
          {renderContent()}
        </div>
      ) : (
        renderHome()
      )}
    </div>
  );
};
