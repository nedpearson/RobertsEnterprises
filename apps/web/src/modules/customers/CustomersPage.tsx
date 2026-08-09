import { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card, CardBody } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { DataTable } from '../../design-system/DataTable';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/ToastContext';

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
        <div className="space-y-6">
          <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
            ← Back to Customer List
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card variant="elevated" className="col-span-1">
              <CardBody className="p-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedCustomer.email}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedCustomer.phone || 'No phone provided'}
                </p>

                <div className="flex gap-3 mt-6">
                  <Button variant="primary" className="flex-1" onClick={() => addToast('Generate order workflow starting...', 'info')}>
                    Generate Order
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => addToast('Financial Invoice generation initialized...', 'info')}>
                    Draft Invoice
                  </Button>
                </div>

                <hr className="my-6 border-gray-100" />
                
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Measurements</h3>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500 block">Bust</span>
                    <span className="text-sm font-semibold text-gray-900">34"</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500 block">Waist</span>
                    <span className="text-sm font-semibold text-gray-900">26"</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500 block">Hips</span>
                    <span className="text-sm font-semibold text-gray-900">38"</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500 block">Height</span>
                    <span className="text-sm font-semibold text-gray-900">5'6"</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card variant="elevated" className="col-span-2">
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Bride Timeline</h3>
                <div className="space-y-6">
                  <div className="relative pl-6 border-l-2 border-rose-500">
                    <div className="absolute -left-[6px] top-1.5 w-[10px] h-[10px] rounded-full bg-rose-500" />
                    <span className="text-xs text-gray-400 block">Today</span>
                    <p className="text-sm font-medium text-gray-800 mt-1">Customer profile viewed via Live API.</p>
                  </div>
                  <div className="relative pl-6 border-l-2 border-gray-200">
                    <div className="absolute -left-[6px] top-1.5 w-[10px] h-[10px] rounded-full bg-gray-300" />
                    <span className="text-xs text-gray-400 block">Record Created</span>
                    <p className="text-sm font-medium text-gray-800 mt-1">Lead ingested successfully.</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
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
