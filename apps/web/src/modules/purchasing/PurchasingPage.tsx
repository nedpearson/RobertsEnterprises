import React, { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { DataTable } from '../../design-system/DataTable';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/ToastContext';

export default function PurchasingPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);

  const [form, setForm] = useState({
    customer_id: '',
    vendor_name: '',
    style_number: '',
    size_category: 'Standard',
    size: '',
    split_bust: '',
    split_waist: '',
    split_hips: '',
    hollow_to_hem: '',
    custom_notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [opsData, customersData] = await Promise.all([
        api.get<any>('/api/operations').catch(() => ({ purchases: [] })),
        api.get<any>('/api/customers').catch(() => ({ customers: [] })),
      ]);
      setPurchases(opsData.purchases || []);
      setCustomers(customersData.customers || customersData || []);
    } catch (err) {
      console.error('Failed to load purchasing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/operations/purchases', form);
      setIsPOModalOpen(false);
      setForm({
        customer_id: '', vendor_name: '', style_number: '', size_category: 'Standard',
        size: '', split_bust: '', split_waist: '', split_hips: '', hollow_to_hem: '', custom_notes: ''
      });
      fetchData();
      addToast('Purchase Order successfully queued for Vendor!', 'success');
    } catch (err: any) {
      addToast('Failed to transmit PO: ' + err.message, 'error');
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
          title="Purchasing Portal"
          subtitle="Designer supply chain, vendor reorders, and receiving operations"
        />
        <Button onClick={() => setIsPOModalOpen(true)}>+ Generate Vendor PO</Button>
      </div>

      <Card>
        <DataTable
          data={purchases}
          keyExtractor={(p: any) => String(p.id)}
          columns={[
            {
              key: 'po_number',
              header: 'PO Number',
              render: (p: any) => `PO-${p.id}`,
            },
            {
              key: 'vendor_name',
              header: 'Vendor / Designer',
            },
            {
              key: 'style_details',
              header: 'Style Details',
              render: (p: any) => `${p.style_number} (Sz ${p.size || 'Custom'})`,
            },
            {
              key: 'expected_ship_date',
              header: 'Expected Ship Date',
              render: (p: any) => p.expected_ship_date ? new Date(p.expected_ship_date).toLocaleDateString() : '--',
            },
            {
              key: 'status',
              header: 'Status',
              render: (p: any) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    p.status === 'Late'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {p.status}
                </span>
              ),
            },
          ]}
        />
      </Card>

      {/* Generate Vendor PO Modal */}
      <Modal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        title="Create Vendor Purchase Order"
      >
        <form onSubmit={handlePOSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Select Customer</label>
            <select
              required
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            >
              <option value="">Select Customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Vendor Name</label>
              <input
                required
                placeholder="Vera Wang"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={form.vendor_name}
                onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Style Number</label>
              <input
                required
                placeholder="VW-102"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                value={form.style_number}
                onChange={(e) => setForm({ ...form, style_number: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Sizing Configuration</h4>
            
            <div className="flex flex-col gap-1">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none bg-white"
                value={form.size_category}
                onChange={(e) => setForm({ ...form, size_category: e.target.value })}
              >
                <option value="Standard">Standard Size</option>
                <option value="Split Size">Split Size (Custom proportions)</option>
                <option value="Custom Length">Custom Length (Hollow-to-Hem)</option>
              </select>
            </div>

            {form.size_category === 'Standard' && (
              <input
                required
                placeholder="Standard Size (e.g. 10)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none bg-white"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
            )}

            {form.size_category === 'Split Size' && (
              <div className="grid grid-cols-3 gap-3">
                <input
                  required
                  placeholder="Bust"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none bg-white"
                  value={form.split_bust}
                  onChange={(e) => setForm({ ...form, split_bust: e.target.value })}
                />
                <input
                  required
                  placeholder="Waist"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none bg-white"
                  value={form.split_waist}
                  onChange={(e) => setForm({ ...form, split_waist: e.target.value })}
                />
                <input
                  required
                  placeholder="Hips"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none bg-white"
                  value={form.split_hips}
                  onChange={(e) => setForm({ ...form, split_hips: e.target.value })}
                />
              </div>
            )}

            {form.size_category === 'Custom Length' && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Base Size"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none bg-white"
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                />
                <input
                  required
                  placeholder="Hollow-to-Hem"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none bg-white"
                  value={form.hollow_to_hem}
                  onChange={(e) => setForm({ ...form, hollow_to_hem: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Vendor Notes</label>
            <textarea
              placeholder="Rush fees, custom requests..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 h-20"
              value={form.custom_notes}
              onChange={(e) => setForm({ ...form, custom_notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsPOModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Transmit PO
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
