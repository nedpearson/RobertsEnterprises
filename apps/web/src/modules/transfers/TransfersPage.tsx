import React, { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card } from '../../design-system/Card';
import { Spinner } from '../../design-system/Spinner';
import { Button } from '../../design-system/Button';
import { PageHeader } from '../../design-system/PageHeader';
import { DataTable } from '../../design-system/DataTable';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/ToastContext';

export default function TransfersPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);

  const [form, setForm] = useState({
    to_boutique_id: '',
    inventory_variant_id: '',
    qty: 1,
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transData, boutiquesData, invData] = await Promise.all([
        api.get<any>('/api/transfers'),
        api.get<any>('/api/boutiques').catch(() => ({ boutiques: [] })),
        api.get<any>('/api/inventory').catch(() => ({ items: [] })),
      ]);
      setTransfers(transData.data || transData || []);
      setBoutiques(boutiquesData.boutiques || boutiquesData || []);
      setInventory(invData.items || invData || []);
    } catch (err) {
      console.error('Failed to load transfers data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/transfers', {
        ...form,
        to_boutique_id: parseInt(form.to_boutique_id, 10),
        inventory_variant_id: parseInt(form.inventory_variant_id, 10),
        qty: parseInt(String(form.qty), 10)
      });
      setIsNewTransferOpen(false);
      setForm({ to_boutique_id: '', inventory_variant_id: '', qty: 1, notes: '' });
      fetchData();
      addToast('Transfer initiated successfully.', 'success');
    } catch (err: any) {
      addToast('Failed to initiate transfer: ' + err.message, 'error');
    }
  };

  const handleReceive = async (transferId: number) => {
    try {
      await api.post(`/api/transfers/${transferId}/receive`);
      fetchData();
      addToast('Transfer marked as Received.', 'success');
    } catch (err: any) {
      addToast('Failed to receive transfer: ' + err.message, 'error');
    }
  };

  // Build a flat list of variants from inventory catalog
  const variants = inventory.reduce((acc: any[], item: any) => {
    if (item.variants) {
      item.variants.forEach((v: any) => {
        acc.push({
          id: v.id,
          label: `${item.vendor_name} ${item.style_number} — Size ${v.size} (${v.color}) [Stock: ${v.stock_quantity}]`
        });
      });
    }
    return acc;
  }, []);

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
          title="Inter-Location Transfers"
          subtitle="Initiate and receive stock transfers across boutiques"
        />
        <Button onClick={() => setIsNewTransferOpen(true)}>+ Initiate Transfer</Button>
      </div>

      <Card>
        <DataTable
          data={transfers}
          keyExtractor={(t: any) => String(t.id)}
          columns={[
            {
              key: 'id',
              header: 'Transfer ID',
              render: (t: any) => `#${t.id}`,
            },
            {
              key: 'source',
              header: 'Source',
              render: (t: any) => t.src_name || `Boutique #${t.from_boutique_id}`,
            },
            {
              key: 'destination',
              header: 'Destination',
              render: (t: any) => t.dst_name || `Boutique #${t.to_boutique_id}`,
            },
            {
              key: 'item_quantity',
              header: 'Item / Quantity',
              render: (t: any) => `${t.style_number || 'Item'} (Qty: ${t.qty})`,
            },
            {
              key: 'status',
              header: 'Status',
              render: (t: any) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    t.status === 'In_Transit'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {t.status}
                </span>
              ),
            },
            {
              key: 'action',
              header: 'Action',
              render: (t: any) => (
                t.status === 'In_Transit' ? (
                  <Button size="sm" variant="outline" onClick={() => handleReceive(t.id)}>
                    Mark Received
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400">Received {t.received_at ? new Date(t.received_at).toLocaleDateString() : ''}</span>
                )
              ),
            },
          ]}
        />
      </Card>

      {/* Initiate Transfer Modal */}
      <Modal
        isOpen={isNewTransferOpen}
        onClose={() => setIsNewTransferOpen(false)}
        title="Initiate Inter-Location Transfer"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Destination Boutique</label>
            <select
              required
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              value={form.to_boutique_id}
              onChange={(e) => setForm({ ...form, to_boutique_id: e.target.value })}
            >
              <option value="">Select Destination...</option>
              {boutiques.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.city || 'Boutique Location'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Select Item & Size Variant</label>
            <select
              required
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              value={form.inventory_variant_id}
              onChange={(e) => setForm({ ...form, inventory_variant_id: e.target.value })}
            >
              <option value="">Select Variant...</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              required
              min={1}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value, 10) || 1 })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes / Reason</label>
            <textarea
              placeholder="e.g. Requested for Covington fitting tomorrow"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none h-20"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsNewTransferOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Send Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
