import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { DataTable } from '../../design-system/DataTable';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/ToastContext';
import Customer360View from './Customer360View';

export default function CustomersPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/api/customers');
      setCustomers(res.customers || res || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/leads', leadForm);
      setIsLeadModalOpen(false);
      setLeadForm({ first_name: '', last_name: '', email: '', phone: '' });
      fetchCustomers();
      addToast('Lead captured successfully.', 'success');
    } catch (err: any) {
      addToast('Error saving lead: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Active Brides"
          subtitle="Manage bride profiles, measurements, and timelines"
        />
        <Button onClick={() => setIsLeadModalOpen(true)}>+ Capture Lead</Button>
      </div>

      {selectedCustomer ? (
        <Customer360View customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />
      ) : (
        <Card>
          <DataTable
            data={customers}
            keyExtractor={(c: any) => String(c.id)}
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (c: any) => `${c.first_name} ${c.last_name}`,
              },
              {
                key: 'email',
                header: 'Email',
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (c: any) => c.phone || '--',
              },
              {
                key: 'action',
                header: 'Action',
                render: (c: any) => (
                  <Button size="sm" onClick={() => setSelectedCustomer(c)}>
                    View 360
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* Lead Capture Modal */}
      <Modal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        title="Capture New Lead"
      >
        <form onSubmit={handleLeadSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">First Name</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              required
              value={leadForm.first_name}
              onChange={(e) => setLeadForm({ ...leadForm, first_name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Last Name</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              required
              value={leadForm.last_name}
              onChange={(e) => setLeadForm({ ...leadForm, last_name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              required
              value={leadForm.email}
              onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Phone Number</label>
            <input
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              value={leadForm.phone}
              onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsLeadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
